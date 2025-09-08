const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createAnnadhanamReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/annadhanam/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('annadhanam')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!row) return res.status(404).json({ error: 'Annadhanam not found' });

      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=annadhanam_receipt_${id}.pdf`);
      doc.pipe(res);

      // Tamil-capable font if available
      let tamilFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
      let hasTamilFont = false;
      try {
        if (fs.existsSync(tamilFontPath)) {
          doc.registerFont('Tamil', tamilFontPath);
          hasTamilFont = true;
        }
      } catch {}
      const F_REG = hasTamilFont ? 'Tamil' : 'Helvetica';
      const F_BOLD = hasTamilFont ? 'Tamil' : 'Helvetica-Bold';

      // Border
      doc.lineWidth(1).rect(
        doc.page.margins.left - 4,
        doc.page.margins.top - 4,
        doc.page.width - (doc.page.margins.left + doc.page.margins.right) + 8,
        doc.page.height - (doc.page.margins.top + doc.page.margins.bottom) + 8
      ).stroke();

      // Load PDF settings
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      const titleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const titleLine2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const titleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const subHeader = settings?.annadhanam_subheader || settings?.subheader || 'அன்னதானம் ரசீது';

      // Logo left
      let imgW = 0;
      try {
        const logoUrl = settings?.logo_url;
        if (logoUrl) {
          if (/^https?:\/\//i.test(logoUrl)) {
            const buf = await new Promise((resolve, reject) => {
              https.get(logoUrl, (r) => {
                const chunks = [];
                r.on('data', (d) => chunks.push(d));
                r.on('end', () => resolve(Buffer.concat(chunks)));
              }).on('error', reject);
            });
            if (Buffer.isBuffer(buf)) {
              imgW = 60;
              doc.image(buf, doc.page.margins.left, doc.page.margins.top, { width: imgW, fit: [imgW, imgW] });
            }
          } else {
            const rel = logoUrl.replace(/^\/*/, '');
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) {
              imgW = 60;
              doc.image(localPath, doc.page.margins.left, doc.page.margins.top, { width: imgW, fit: [imgW, imgW] });
            }
          }
        }
      } catch {}

      // Header text
      const headerPad = 12;
      const titleX = doc.page.margins.left + (imgW || 0) + headerPad;
      const titleY = doc.page.margins.top;
      const titleW = doc.page.width - doc.page.margins.right - titleX;

      let cursorY = titleY + 26;
      doc.font(F_BOLD).fontSize(10).text(titleMain, titleX, cursorY, { width: titleW, align: 'center' });
      cursorY = doc.y + 2;
      doc.font(F_BOLD).fontSize(10).text(titleLine2, titleX, cursorY, { width: titleW, align: 'center' });
      cursorY = doc.y + 2;
      doc.font(F_REG).fontSize(14).text(titleSub, titleX, cursorY, { width: titleW, align: 'center' });

      // Meta row with centered subheader box
      const startY = doc.y + 10;
      const pageLeft = doc.page.margins.left;
      const pageRight = doc.page.margins.right;
      const pageInnerW = doc.page.width - pageLeft - pageRight;
      const textW = doc.widthOfString(subHeader);
      const pad = 6;
      const boxW = textW + pad * 2;
      const boxX = pageLeft + (pageInnerW - boxW) / 2;
      const boxY = startY;
      const lineH = doc.currentLineHeight();
      doc.rect(boxX, boxY, boxW, lineH + pad * 0.5).stroke();
      doc.font(F_REG).fontSize(12).text(subHeader, boxX + pad, boxY + pad * 0.25, { width: textW, align: 'center' });

      // Labels left/right
      const colW = pageInnerW / 3;
      const leftX = pageLeft;
      const rightX = pageLeft + colW * 2;
      const label = (k, v, x) => {
        doc.font(F_REG).fontSize(10).text(k, x, startY + 22);
        doc.font(F_BOLD).fontSize(12).text(v || '-', x, startY + 36);
      };
      label('ரசீது எண்', row.receipt_number || String(row.id), leftX);
      label('தேதி', row.from_date || '', rightX);

      // Content
      const metaY = startY + 60;
      const amountBoxW = 220;
      const amountBoxX = pageLeft + pageInnerW - amountBoxW;
      const amountBoxY = metaY + 10;
      const amountBoxH = 60;
      doc.rect(amountBoxX, amountBoxY, amountBoxW, amountBoxH).stroke();

      const donorName = (row.name || '-').toString();
      const phone = (row.mobile_number || '-').toString();
      const peoples = Number(row.peoples || 0);
      const sentence = `அன்னதானம்: ${donorName} அவர்களின் சார்பில் மக்கள் ${peoples} பேருக்கு உணவு வழங்கப்பட்டது.`;
      const leftTextWidth = Math.max(50, amountBoxX - pageLeft - 12);
      doc.font(F_REG).fontSize(12).text(sentence, pageLeft, amountBoxY, { width: leftTextWidth, align: 'left' });

      doc.font(F_REG).fontSize(12).text(`போன்: ${phone}`, amountBoxX + 8, amountBoxY + 6);
      doc.font(F_REG).fontSize(12).text(`நேரம்: ${row.time || '-'}`, amountBoxX + 8, amountBoxY + 22);
      doc.font(F_REG).fontSize(12).text(`காலம்: ${row.from_date || ''} - ${row.to_date || ''}`, amountBoxX + 8, amountBoxY + 38);

      // Footer
      const footerY = doc.page.height - doc.page.margins.bottom - 20;
      const collectorText = 'வசூலிப்பாளர்';
      doc.font(F_REG).fontSize(10);
      const collectorW = doc.widthOfString(collectorText);
      const collectorX = doc.page.width - doc.page.margins.right - collectorW;
      doc.text(collectorText, collectorX, footerY);

      doc.end();
    } catch (err) {
      console.error('Error generating annadhanam receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
