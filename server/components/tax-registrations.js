// routes/taxRegistrationReceipt.js
/* eslint-disable camelcase */
const express  = require('express');
const PDFDoc   = require('pdfkit');
const path     = require('path');
const fs       = require('fs');
const https    = require('https');

/**
 * Create router for /api/tax-registrations/:id/receipt.pdf
 * @param {{ db: Function, verifyQueryToken: Function }} deps
 * @returns {express.Router}
 */
module.exports = function createTaxRegistrationReceiptRouter (deps) {
  const { db, verifyQueryToken } = deps;
  const router = express.Router();

  /* ---------- CONSTANTS ---------- */
  const PAGE_SIZE   = 'A5';
  const PAGE_LAYOUT = 'landscape';
  const MARGIN      = 25;

  /* ---------- HELPERS ---------- */

  /** Load tamil font if present, return {REG, BOLD} font names */
  function getFonts (doc) {
    const tamilPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
    if (fs.existsSync(tamilPath)) {
      doc.registerFont('Tamil', tamilPath);
      return { REG: 'Tamil', BOLD: 'Tamil' };
    }
    return { REG: 'Helvetica', BOLD: 'Helvetica-Bold' };
  }

  /** Fetch remote logo image and return as Buffer (or null) */
  async function fetchLogo (url) {
    if (!/^https?:\/\//i.test(url)) return null;
    return new Promise((resolve) => {
      https
        .get(url, (stream) => {
          const chunks = [];
          stream.on('data', (d) => chunks.push(d));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', () => resolve(null));
    });
  }

  /** Draw a label/value pair; returns new Y coordinate */
  function drawField (doc, label, value, x, y, width, fonts) {
    doc.font(fonts.REG).fontSize(9).fillColor('#374151')
      .text(label, x, y, { width, continued: false });
    doc.font(fonts.BOLD).fontSize(11).fillColor('#111827')
      .text(value || '-', x, doc.y + 1, { width });
    return doc.y + 8; // small gap below each field
  }

  /* ---------- ROUTE ---------- */

  router.get('/api/tax-registrations/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      /* --- DB look-ups --- */
      const { id } = req.params;
      const record = await db('user_tax_registrations')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();

      if (!record) {
        return res.status(404).json({ error: 'Tax registration not found' });
      }

      const pdfSettings =
        (await db('pdf_settings').where({ temple_id: req.user.templeId }).first()) || {};

      /* --- PDF SET-UP --- */
      const doc   = new PDFDoc({ size: PAGE_SIZE, layout: PAGE_LAYOUT, margin: MARGIN });
      const fonts = getFonts(doc);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=tax_receipt_${id}.pdf`);
      doc.pipe(res);

      /* ---------- BORDER ---------- */
      doc
        .save()
        .lineWidth(1)
        .strokeColor('#000')
        .rect(MARGIN, MARGIN, doc.page.width - 2 * MARGIN, doc.page.height - 2 * MARGIN)
        .stroke()
        .restore();

      /* ---------- HEADER ---------- */
      const headerY  = MARGIN + 10;
      const leftX    = MARGIN + 5;
      const titleW   = 320;
      const titleX   = doc.page.width / 2 - titleW / 2;
      const rightX   = doc.page.width - MARGIN - 150;

      // logo
      if (pdfSettings.logo_url) {
        const buf = await fetchLogo(pdfSettings.logo_url);
        if (buf) doc.image(buf, leftX, headerY, { width: 50 });
      }

      // titles
      doc.font(fonts.BOLD).fontSize(13).fillColor('#111827')
        .text(pdfSettings.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்', titleX, headerY, { width: titleW, align: 'center' });
      doc.font(fonts.REG).fontSize(9).fillColor('#374151')
        .text(pdfSettings.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம்', titleX, doc.y + 3, { width: titleW, align: 'center' });
      doc.font(fonts.BOLD).fontSize(11).fillColor('#111827')
        .text(pdfSettings.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை', titleX, doc.y + 3, { width: titleW, align: 'center' });

      // receipt no & date
      doc.font(fonts.REG).fontSize(10).fillColor('#111827')
        .text(`ரசீது எண்: ${record.reference_number || record.id}`, leftX, headerY + 55, { width: 120, align: 'center' });
      doc.text(`தேதி: ${record.date || ''}`, rightX, headerY, { width: 150, align: 'right' });

      // horizontal divider
      doc.moveTo(MARGIN, doc.y + 8).lineTo(doc.page.width - MARGIN, doc.y + 8).stroke();

      /* ---------- BODY ---------- */
      let y = doc.y + 15;
      const colLeftX  = MARGIN + 15;
      const colRightX = doc.page.width / 2 + 40;

      y = drawField(doc, 'பெயர் / Name', record.name, colLeftX, y, 260, fonts);
      y = drawField(doc, 'தந்தை பெயர் / Father', record.father_name, colLeftX, y, 260, fonts);
      y = drawField(doc, 'முகவரி / Address',
        [record.address, record.village].filter(Boolean).join(', '), colLeftX, y, 360, fonts);
      drawField(doc, 'செல் / Mobile', record.mobile_number, colLeftX, y, 260, fonts);

      let ry = y - 80; // align right-col top with left-col Name
      ry = drawField(doc, 'வருடம் / Year', record.year, colRightX, ry, 200, fonts);
      ry = drawField(doc, 'குறிப்பு எண் / Ref No', record.reference_number || record.id, colRightX, ry, 200, fonts);

      // Amount box
      const amtBoxY = ry + 5;
      doc
        .save()
        .rect(colRightX, amtBoxY, 200, 40)
        .lineWidth(0.5)
        .stroke()
        .restore();

      doc.font(fonts.REG).fontSize(10).fillColor('#374151')
        .text('செலுத்திய தொகை / Amount Paid', colRightX + 8, amtBoxY + 6);
      doc.font(fonts.BOLD).fontSize(15).fillColor('#111827')
        .text(`₹ ${Number(record.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          colRightX + 8, doc.y + 3);

      /* ---------- FOOTER ---------- */
      const footerBaseY = doc.page.height - MARGIN - 25;
      doc.moveTo(doc.page.width - MARGIN - 180, footerBaseY - 5)
        .lineTo(doc.page.width - MARGIN, footerBaseY - 5)
        .stroke();

      doc.font(fonts.REG).fontSize(10).fillColor('#111827')
        .text('வசூலிப்பாளர் / Collector', doc.page.width - MARGIN - 180, footerBaseY, { width: 180, align: 'right' });

      /* ---------- FINALIZE ---------- */
      doc.end();
    } catch (error) {
      console.error('Failed to generate receipt PDF:', error);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
