const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createHallBookingReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/hall-bookings/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const r = await db('marriage_hall_bookings')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!r) return res.status(404).json({ error: 'Hall booking not found' });

      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=hall_booking_${id}.pdf`);
      doc.pipe(res);

      // Tamil fonts (regular + bold) with faux bold fallback
      let tamilFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
      let tamilBoldFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Bold.ttf');
      let hasTamilFont = false;
      let hasTamilBoldFont = false;
      try {
        if (fs.existsSync(tamilFontPath)) {
          doc.registerFont('Tamil', tamilFontPath);
          hasTamilFont = true;
        }
        if (fs.existsSync(tamilBoldFontPath)) {
          doc.registerFont('TamilBold', tamilBoldFontPath);
          hasTamilBoldFont = true;
        }
      } catch {}
      const F_REG = hasTamilFont ? 'Tamil' : 'Helvetica';
      const F_BOLD = hasTamilBoldFont ? 'TamilBold' : (hasTamilFont ? 'Tamil' : 'Helvetica-Bold');

      const drawBold = (text, x, y, size, options = {}) => {
        if (hasTamilBoldFont) {
          doc.font(F_BOLD).fontSize(size).text(text, x, y, options);
        } else {
          doc.font(F_REG).fontSize(size).text(text, x, y, options);
          doc.text(text, x + 0.35, y, options);
        }
      };
      const drawReg = (text, x, y, size, options = {}) => {
        doc.font(F_REG).fontSize(size).text(text, x, y, options);
      };

      // Dimensions and border
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = doc.page.margins.left;
      const marginRight = doc.page.margins.right;
      const marginTop = doc.page.margins.top;
      const marginBottom = doc.page.margins.bottom;
      const contentWidth = pageWidth - marginLeft - marginRight;

      doc.lineWidth(2)
         .rect(marginLeft - 6, marginTop - 6, contentWidth + 12, pageHeight - marginTop - marginBottom + 12)
         .stroke();

      // PDF settings
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      const titleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const titleLine2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const titleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      // Use only the Hall-specific sub-header; do not fall back to generic one
      const subHeader = (settings?.hall_subheader && String(settings.hall_subheader).trim().length > 0)
        ? settings.hall_subheader
        : 'மண்டப முன்பதிவு ரசீது';

      // Configurable labels for Hall receipts
      const L = {
        receipt: settings?.hall_receipt_label || 'ரசீது எண்',
        date: settings?.hall_date_label || 'தேதி',
        year: settings?.hall_year_label || 'வருடம்',
        cell: settings?.hall_cell_label || 'செல்',
        collector: settings?.hall_collector_label || 'வசூலிப்பாளர்',
      };

      // Logo into buffer
      let logoBuffer = null;
      try {
        const logoUrl = settings?.logo_url;
        if (logoUrl) {
          if (/^https?:\/\//i.test(logoUrl)) {
            logoBuffer = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Logo download timeout')), 5000);
              https.get(logoUrl, (r) => {
                const chunks = [];
                r.on('data', (d) => chunks.push(d));
                r.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)); });
                r.on('error', (e) => { clearTimeout(timeout); reject(e); });
              }).on('error', (e) => { clearTimeout(timeout); reject(e); });
            });
          } else {
            const rel = logoUrl.replace(/^\/*/, '');
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) {
              logoBuffer = fs.readFileSync(localPath);
            }
          }
        }
      } catch {}

      // Header section
      const headerHeight = 100;
      const headerY = marginTop + 4;
      doc.lineWidth(1.5).rect(marginLeft, headerY, contentWidth, headerHeight).stroke();

      let logoWidth = 0;
      if (logoBuffer && logoBuffer.length > 0) {
        logoWidth = Math.min(80, headerHeight - 20);
        const logoX = marginLeft + 12;
        const logoY = headerY + (headerHeight - logoWidth) / 2;
        doc.image(logoBuffer, logoX, logoY, { width: logoWidth, height: logoWidth, fit: [logoWidth, logoWidth] });
      }

      // Header text centered
      const textStartX = marginLeft + logoWidth + 24;
      const textWidth = contentWidth - logoWidth - 36;
      let textY = headerY + 12;
      doc.font(F_BOLD).fontSize(11).text(titleSub, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 18;
      doc.font(F_REG).fontSize(9).text(titleLine2, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 24;
      doc.font(F_BOLD).fontSize(15).text(titleMain, textStartX, textY, { width: textWidth, align: 'center' });

      // Receipt strip
      const receiptY = headerY + headerHeight + 16;
      const receiptHeight = 45;
      doc.lineWidth(1.5).rect(marginLeft, receiptY, contentWidth, receiptHeight).stroke();
      const receiptNo = String(r.register_no || r.id).padStart(3, '0');
      drawReg(`${L.receipt} ${receiptNo}`, marginLeft + 15, receiptY + 16, 12);
      const receiptTitle = subHeader;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(14);
      const titleW = doc.widthOfString(receiptTitle);
      const titleX = marginLeft + (contentWidth - titleW) / 2;
      drawBold(receiptTitle, titleX, receiptY + 16, 14);
      const dateText = `${L.date} ${r.date || new Date().toLocaleDateString('en-GB')}`;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(12);
      const dateTextWidth = doc.widthOfString(dateText);
      drawReg(dateText, marginLeft + contentWidth - 15 - dateTextWidth, receiptY + 16, 12);

      // Content area
      const contentYStart = receiptY + receiptHeight + 20;

      // Right info box (Year / Cell)
      const infoBoxWidth = 200;
      const infoBoxHeight = 80;
      const infoBoxX = marginLeft + contentWidth - infoBoxWidth - 12;
      const infoBoxY = contentYStart;
      doc.lineWidth(1).rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight).stroke();
      const labelYear = L.year;
      const labelCell = L.cell;
      const labelX = infoBoxX + 15;
      const row1Y = infoBoxY + 14;
      const row2Y = infoBoxY + 44;
      doc.font(F_REG).fontSize(12);
      const labelYearWidth = doc.widthOfString(labelYear);
      const labelCellWidth = doc.widthOfString(labelCell);
      const labelColumnWidth = Math.max(labelYearWidth, labelCellWidth) + 10;
      const valueX = labelX + labelColumnWidth;
      const valueWidth = infoBoxWidth - (valueX - infoBoxX) - 15;
      doc.text(labelYear, labelX, row1Y);
      doc.text(labelCell, labelX, row2Y);
      const yearMatch = String(r.date || '').match(/(\d{4})/);
      const yearValue = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      const phoneValue = [r.mobile, r.phone, r.mobile_no, r.phone_no, r.contact, r.contact_no, r.whatsapp]
        .find(v => v && String(v).trim().length > 0) || '';
      doc.font(F_BOLD).fontSize(12).text(yearValue, valueX, row1Y, { width: valueWidth, align: 'left' });
      doc.font(F_BOLD).fontSize(12).text(String(phoneValue).trim() || '-', valueX, row2Y, { width: valueWidth, align: 'left' });

      // Left details block
      const leftTextWidth = infoBoxX - marginLeft - 30;
      let leftY = contentYStart + 8;
      const person = (r.name || '').toString().toUpperCase();
      const eventName = (r.event || '-').toString();
      const prefixText = 'உயர்திரு/திருமதி ';
      doc.font(F_BOLD).fontSize(12).text(prefixText, marginLeft + 15, leftY);
      const prefixWidth = doc.widthOfString(prefixText);
      drawBold(`${person}`, marginLeft + 15 + prefixWidth, leftY, 12, { width: leftTextWidth - prefixWidth, align: 'left' });
      leftY = doc.y + 6;
      drawBold(`நிகழ்ச்சி: ${eventName}`, marginLeft + 15, leftY, 12, { width: leftTextWidth, align: 'left' });
      leftY = doc.y + 8;
      doc.font(F_REG).fontSize(12).text('அவர்களிடமிருந்து', marginLeft + 15, leftY, { width: leftTextWidth, align: 'left' });

      // Footer rupee box using total amount
      const rupeeBoxHeight = 50;
      const collectorTextHeight = 15;
      const totalFooterHeight = rupeeBoxHeight + collectorTextHeight + 10;
      const footerStartY = pageHeight - marginBottom - totalFooterHeight;
      const rupeeBoxWidth = 160;
      const rupeeBoxX = marginLeft + 15;
      doc.lineWidth(1.5).rect(rupeeBoxX, footerStartY, rupeeBoxWidth, rupeeBoxHeight).stroke();
      const toNum = (v) => { if (!v) return 0; const n = parseFloat(String(v).toString().replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
      const totalAmount = toNum(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const currencyText = `ரூ ${totalAmount}`;
      let currencyFontSize = 20;
      doc.font(F_BOLD).fontSize(currencyFontSize);
      let currencyTextWidth = doc.widthOfString(currencyText);
      const maxCurrencyWidth = rupeeBoxWidth - 30;
      while (currencyTextWidth > maxCurrencyWidth && currencyFontSize > 10) {
        currencyFontSize -= 1;
        doc.font(F_BOLD).fontSize(currencyFontSize);
        currencyTextWidth = doc.widthOfString(currencyText);
      }
      const currencyTextHeight = doc.currentLineHeight();
      doc.text(currencyText, rupeeBoxX + 15, footerStartY + (rupeeBoxHeight - currencyTextHeight) / 2);

      // Collector label and optional watermark
      const collectorText = L.collector;
      doc.font(F_REG).fontSize(12);
      const collectorWidth = doc.widthOfString(collectorText);
      const collectorX = marginLeft + contentWidth - collectorWidth - 15;
      const collectorY = footerStartY + rupeeBoxHeight + 5;
      if (collectorY + collectorTextHeight <= pageHeight - marginBottom) {
        doc.text(collectorText, collectorX - 95, collectorY - 30);
      } else {
        doc.text(collectorText, collectorX + 10, footerStartY + rupeeBoxHeight - 10);
      }

      if (settings?.watermark_text) {
        doc.font(F_REG).fontSize(8).fillColor('gray')
          .text(settings.watermark_text, marginLeft, footerStartY - 20, { width: contentWidth, align: 'center' })
          .fillColor('black');
      }

      doc.end();
    } catch (err) {
      console.error('Error generating hall booking receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
