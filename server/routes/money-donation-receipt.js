const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createMoneyDonationReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/money-donations/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('money_donations')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!row) return res.status(404).json({ error: 'Donation not found' });

      // Prepare PDF
      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=donation_receipt_${id}.pdf`);
      doc.pipe(res);

      // Try to load a Tamil-capable font if available
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
      doc.lineWidth(1).rect(doc.page.margins.left - 4, doc.page.margins.top - 4, doc.page.width - (doc.page.margins.left + doc.page.margins.right) + 8, doc.page.height - (doc.page.margins.top + doc.page.margins.bottom) + 8).stroke();

      // Load settings from DB for temple
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      // Header (use settings with fallback)
      const templeTitleTa = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const templeTitleta2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const templeMainTitleta = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';

      const subHeaderTa = settings?.subheader || 'நன்கொடை ரசீது';
      // Try to draw left-side logo and render titles on the opposite (right) side
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
            // Treat as local /public path
            const rel = logoUrl.replace(/^\/*/, ''); // remove leading /
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) {
              imgW = 60;
              doc.image(localPath, doc.page.margins.left, doc.page.margins.top, { width: imgW, fit: [imgW, imgW] });
            }
          }
        }
      } catch {}

      // Header text area to the right of the image
      const headerPad = 12;
      const titleX = doc.page.margins.left + (imgW || 0) + headerPad;
      const titleY = doc.page.margins.top;
      const titleW = doc.page.width - doc.page.margins.right - titleX;
      // Render titles one by one (each on its own line) on the right side
      // Move header content slightly down from the top
      let cursorY = titleY + 26;
      doc.font(F_BOLD).fontSize(10).text(templeMainTitleta, titleX, cursorY, { width: titleW, align: 'center' });
      cursorY = doc.y + 2;
      doc.font(F_BOLD).fontSize(10).text(templeTitleta2, titleX, cursorY, { width: titleW, align: 'center' });
      cursorY = doc.y + 2;
      doc.font(F_REG).fontSize(14).text(templeTitleTa, titleX, cursorY, { width: titleW, align: 'center' });
      cursorY = doc.y + 4;
      // Move on to meta row; sub-header will be drawn centered on that row
      doc.moveDown(0.2);
      // Receipt meta row
      const startY = doc.y + 10;
      const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 3;
      const leftX = doc.page.margins.left;
      const midX = leftX + colW;
      const rightX = midX + colW;
      const label = (k, v, x) => {
        doc.font(F_REG).fontSize(10).text(k, x, startY);
        doc.font(F_BOLD).fontSize(12).text(v || '-', x, startY + 14);
      };
      label('ரசீது எண்', row.register_no || String(row.id), leftX);
      // Draw centered sub-header box between left and right meta
      doc.font(F_REG).fontSize(12);
      const metaShLineH = doc.currentLineHeight();
      const metaShTextW = doc.widthOfString(subHeaderTa);
      const metaShPad = 6;
      const metaShBoxW = metaShTextW + metaShPad * 2;
      const pageLeft = doc.page.margins.left;
      const pageRight = doc.page.margins.right;
      const pageInnerW = doc.page.width - pageLeft - pageRight;
      const metaShBoxX = pageLeft + (pageInnerW - metaShBoxW) / 2;
      const metaShBoxY = startY; // same row as labels
      doc.rect(metaShBoxX, metaShBoxY, metaShBoxW, metaShLineH + metaShPad * 0.5).stroke();
      doc.text(subHeaderTa, metaShBoxX + metaShPad, metaShBoxY + metaShPad * 0.25, { width: metaShTextW, align: 'center' });
      label('தேதி', row.date || '', rightX);
      const boxY = startY + 48;
      const boxH = 70;
      // Amount box (right side) with meta stacked lines
      const amtBoxW = 220;
      const amtBoxX = rightX + colW - amtBoxW - 16;
      const amtBoxY = boxY + boxH + 10;
      const amtBoxH = 60;
      doc.rect(amtBoxX, amtBoxY, amtBoxW, amtBoxH).stroke();
      // Left-side sentence (aligned with amount box top)
      const donorName = (row.name || '-').toString();
      const fatherName = (row.father_name || '-').toString();
      const addrPart = [row.address, row.village].filter(Boolean).join(',');
      const donorSentence = `உயர்திருமதி ${donorName}, S/o க/பெ ${fatherName} ${addrPart ? addrPart + ' ' : ''}அவர்களிடமிருந்து நன்கொடையாக ரூபாய் ${Number(row.amount || 0).toFixed(2)}/- மட்டும் நன்றியுடன் பெற்றுக்கொள்ளப்பட்டது.`;
      const leftTextWidth = Math.max(50, amtBoxX - leftX - 12);
      doc.font(F_REG).fontSize(12).text(donorSentence, leftX, amtBoxY, { width: leftTextWidth, align: 'left' });
      const year = (row.date || '').toString().slice(0, 4);
      doc.font(F_REG).fontSize(12).text(`வருடம்:${year || '-'}`, amtBoxX + 8, amtBoxY + 6);
      doc.font(F_REG).fontSize(12).text(`போன்:`, amtBoxX + 8, amtBoxY + 22);
      doc.font(F_REG).fontSize(12).text(`செல்:${row.phone || '-'}`, amtBoxX + 8, amtBoxY + 38);

      // Footer: amount box on bottom-left, collector label on bottom-right
      const footerY = doc.page.height - doc.page.margins.bottom - 20;
      // Left: amount box with 'ரு' and dynamic amount
      const amountNumBottom = Number(row.amount || 0);
      const amountText = `ரு:${amountNumBottom.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      doc.font(F_BOLD).fontSize(12);
      const amtW = doc.widthOfString(amountText) + 12;
      const amtH = doc.currentLineHeight() + 6;
      const amtX = leftX;
      const amtY = footerY - 4;
      doc.rect(amtX, amtY, amtW, amtH).stroke();
      doc.text(amountText, amtX + 6, amtY + 3);
      // Right: collector label
      const collectorText = 'வசூலிப்பாளர்                                            ';
      doc.font(F_REG).fontSize(10);
      const collectorW = doc.widthOfString(collectorText);
      const collectorX = doc.page.width - doc.page.margins.right - collectorW;
      doc.text(collectorText, collectorX, footerY);
      doc.end();
    } catch (err) {
      console.error('Error generating donation receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
