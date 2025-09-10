const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createTaxRegistrationReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/tax-registrations/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('user_tax_registrations')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!row) return res.status(404).json({ error: 'Tax registration not found' });

      // Prepare PDF - A5 Landscape, tight margins for better space use
      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 18 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=tax_receipt_${id}.pdf`);
      doc.pipe(res);

      // Load Tamil-capable font if available
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

      // Tiny helpers
      const hr = (y, color = '#E5E7EB') => {
        const l = doc.page.margins.left;
        const r = doc.page.width - doc.page.margins.right;
        doc.save().lineWidth(0.5).strokeColor(color).moveTo(l, y).lineTo(r, y).stroke().restore();
      };
      const field = (label, value, x, y, opts = {}) => {
        const { w = 180 } = opts;
        doc.font(F_REG).fontSize(9).fillColor('#6B7280').text(label, x, y, { width: w });
        doc.font(F_BOLD).fontSize(11).fillColor('#111827').text(value || '-', x, doc.y + 1, { width: w });
      };

      // Load header settings
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      const templeTitleTa = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const templeTitleta2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const templeMainTitleta = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const subHeaderTa = settings?.tax_subheader || settings?.subheader || 'வரி ரசீது';

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

      // Header text to right of image
      const headerPad = 10;
      const headerY = doc.page.margins.top + 2;
      const titleX = doc.page.margins.left + (imgW || 0) + headerPad;
      const titleW = doc.page.width - doc.page.margins.right - titleX - 160;

      // Header: Logo | Titles | Meta (Receipt No + Date)
      doc.font(F_BOLD).fontSize(12).fillColor('#111827').text(templeMainTitleta, titleX, headerY, { width: titleW, align: 'left' });
      doc.font(F_REG).fontSize(9).fillColor('#374151').text(templeTitleta2, titleX, doc.y + 2, { width: titleW, align: 'left' });
      doc.font(F_BOLD).fontSize(12).fillColor('#111827').text(templeTitleTa, titleX, doc.y + 3, { width: titleW, align: 'left' });

      const metaX = doc.page.width - doc.page.margins.right - 150;
      const metaY = headerY;
      doc.font(F_REG).fontSize(9).fillColor('#6B7280').text('வரி ரசீது', metaX, metaY, { width: 150, align: 'right' });
      doc.moveDown(0.2);
      doc.font(F_REG).fontSize(9).fillColor('#6B7280').text('ரசீது எண்', metaX, doc.y, { width: 150, align: 'right' });
      doc.font(F_BOLD).fontSize(11).fillColor('#111827').text(row.reference_number || String(row.id), metaX, doc.y, { width: 150, align: 'right' });
      doc.font(F_REG).fontSize(9).fillColor('#6B7280').text('தேதி', metaX, doc.y, { width: 150, align: 'right' });
      doc.font(F_BOLD).fontSize(11).fillColor('#111827').text(row.date || '', metaX, doc.y, { width: 150, align: 'right' });

      const startY = Math.max(doc.y + 6, headerY + 40);
      hr(startY);

      // Content fields (two columns) and Amount highlight
      const lX = doc.page.margins.left;
      const rX = doc.page.width - doc.page.margins.right - 240; // right column start
      const lineY = startY + 8;

      const donorName = (row.name || '-').toString();
      const fatherName = (row.father_name || '-').toString();
      const address = [row.address, row.village].filter(Boolean).join(', ');
      const year = (row.year || '').toString();
      const amountPaid = Number(row.amount_paid || 0);
      const refNo = (row.reference_number || String(row.id));

      // Left column
      let y = lineY + 4;
      field('பெயர் / Name', donorName, lX, y, { w: 280 }); y = doc.y + 4;
      field('தந்தை பெயர் / Father', fatherName, lX, y, { w: 280 }); y = doc.y + 4;
      field('முகவரி / Address', address, lX, y, { w: 400 }); y = doc.y + 4;
      field('செல் / Mobile', row.mobile_number || '-', lX, y, { w: 200 }); y = doc.y + 6;

      // Right column
      let ry = lineY + 4;
      field('வருடம் / Year', year, rX, ry, { w: 220 }); ry = doc.y + 6;
      field('குறிப்பு எண் / Ref No', refNo, rX, ry, { w: 220 }); ry = doc.y + 12;
      // Emphasized amount
      doc.font(F_REG).fontSize(10).fillColor('#6B7280').text('செலுத்திய தொகை / Amount paid', rX, ry);
      doc.font(F_BOLD).fontSize(18).fillColor('#111827').text(`₹ ${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rX, doc.y + 2);

      // Footer (collector signature line)
      const footerY = doc.page.height - doc.page.margins.bottom - 18;
      const signLabel = 'வசூலிப்பாளர் / Collector';
      const signW = 180;
      const signX = doc.page.width - doc.page.margins.right - signW;
      hr(footerY - 8);
      doc.font(F_REG).fontSize(10).fillColor('#374151').text(signLabel, signX, footerY, { width: signW, align: 'right' });

      doc.end();
    } catch (err) {
      console.error('Error generating tax receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
