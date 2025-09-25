const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createPoojaReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  // GET /api/pooja/:id/receipt.pdf?token=...
  router.get('/api/pooja/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('pooja')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!row) return res.status(404).json({ error: 'Pooja entry not found' });

      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=pooja_receipt_${id}.pdf`);
      doc.pipe(res);

      // Tamil fonts (regular + bold) with fallback
      let tamilFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
      let tamilBoldFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Bold.ttf');
      let hasTamilFont = false;
      let hasTamilBoldFont = false;
      try {
        if (fs.existsSync(tamilFontPath)) { doc.registerFont('Tamil', tamilFontPath); hasTamilFont = true; }
        if (fs.existsSync(tamilBoldFontPath)) { doc.registerFont('TamilBold', tamilBoldFontPath); hasTamilBoldFont = true; }
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

      // Format date as D/M/YYYY (no leading zeros) – e.g., 5/6/2025
      const fmtDMY = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (isNaN(d)) return '';
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // Dimensions and main border
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = doc.page.margins.left;
      const marginRight = doc.page.margins.right;
      const marginTop = doc.page.margins.top;
      const marginBottom = doc.page.margins.bottom;
      const contentWidth = pageWidth - marginLeft - marginRight;
      doc.lineWidth(2).rect(marginLeft - 6, marginTop - 6, contentWidth + 12, pageHeight - marginTop - marginBottom + 12).stroke();

      // Load PDF settings
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      const titleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const titleLine2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம்';
      const titleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const subHeader = (settings?.pooja_subheader && String(settings.pooja_subheader).trim().length > 0)
        ? settings.pooja_subheader
        : (settings?.subheader || 'பூஜை ரசீது');
      const L = {
        receipt: settings?.pooja_receipt_label || 'ரசீது எண்',
        date: settings?.pooja_date_label || 'தேதி',
        year: settings?.pooja_year_label || 'வருடம்',
        cell: settings?.pooja_cell_label || 'செல்',
        collector: settings?.pooja_collector_label || 'வசூலிப்பாளர்',
      };

      // Load logo into buffer
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
            const rel = logoUrl.replace(/^[\/]+/, '');
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) logoBuffer = fs.readFileSync(localPath);
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

      // Header text content
      const textStartX = marginLeft + logoWidth + 24;
      const textWidth = contentWidth - logoWidth - 36;
      let textY = headerY + 12;
      doc.font(F_BOLD).fontSize(11).text(titleSub, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 18;
      doc.font(F_REG).fontSize(9).text(titleLine2, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 24;
      doc.font(F_BOLD).fontSize(15).text(titleMain, textStartX, textY, { width: textWidth, align: 'center' });

      // Receipt details strip
      const stripY = headerY + headerHeight + 16;
      const stripH = 45;
      doc.lineWidth(1.5).rect(marginLeft, stripY, contentWidth, stripH).stroke();
      const receiptNo = String(row.receipt_number || row.id).padStart(3, '0');
      drawReg(`${L.receipt} ${receiptNo}`, marginLeft + 15, stripY + 16, 12);
      doc.font(F_BOLD).fontSize(14);
      const titleW = doc.widthOfString(subHeader);
      const titleX = marginLeft + (contentWidth - titleW) / 2;
      drawBold(subHeader, titleX, stripY + 16, 14);
      const fromDateStr = fmtDMY(row.from_date) || fmtDMY(new Date());
      const dateText = `${L.date} ${fromDateStr}`;
      doc.font(F_REG).fontSize(12);
      const dateTextWidth = doc.widthOfString(dateText);
      drawReg(dateText, marginLeft + contentWidth - 15 - dateTextWidth, stripY + 16, 12);

      // Main content area
      const contentYStart = stripY + stripH + 20;

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
      const yearMatch = String(row.from_date || '').match(/(\d{4})/);
      const yearValue = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      const phoneValue = [row.mobile_number, row.phone, row.mobile, row.mobile_no, row.phone_no, row.contact, row.contact_no, row.whatsapp]
        .find(v => v && String(v).trim().length > 0) || '';
      doc.font(F_BOLD).fontSize(12).text(yearValue, valueX, row1Y, { width: valueWidth, align: 'left' });
      doc.font(F_BOLD).fontSize(12).text(String(phoneValue).trim() || '-', valueX, row2Y, { width: valueWidth, align: 'left' });

      // Left details block
      const leftWidth = infoBoxX - marginLeft - 30;
      let leftY = contentYStart + 8;
      const donorName = (row.name || '').toString().toUpperCase();
      const timeStr = (row.time || '-').toString();
      const amount = row.amount != null ? Number(row.amount).toFixed(2) : null;

      const prefixText = 'உயர்திரு/திருமதி ';
      doc.font(F_BOLD).fontSize(12).text(prefixText, marginLeft + 15, leftY);
      const prefixWidth = doc.widthOfString(prefixText);
      drawBold(`${donorName}`, marginLeft + 15 + prefixWidth, leftY, 12, { width: leftWidth - prefixWidth, align: 'left' });
      leftY = doc.y + 6;
      drawBold(`நேரம்: ${timeStr}`, marginLeft + 15, leftY, 12, { width: leftWidth, align: 'left' });
      leftY = doc.y + 6;
      drawBold(`தேதி: ${fromDateStr}`, marginLeft + 15, leftY, 12, { width: leftWidth, align: 'left' });

      // Footer box: show amount if any
      const rupeeBoxHeight = 50;
      const collectorTextHeight = 15;
      const totalFooterHeight = rupeeBoxHeight + collectorTextHeight + 10;
      const footerStartY = pageHeight - marginBottom - totalFooterHeight;
      const rupeeBoxWidth = 160;
      const rupeeBoxX = marginLeft + 15;
      doc.lineWidth(1.5).rect(rupeeBoxX, footerStartY, rupeeBoxWidth, rupeeBoxHeight).stroke();
      const valueText = amount != null ? `ரூ ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'ரூ 0.00';
      let boxFontSize = 20;
      doc.font(F_BOLD).fontSize(boxFontSize);
      let boxTextWidth = doc.widthOfString(valueText);
      const maxBoxWidth = rupeeBoxWidth - 30;
      while (boxTextWidth > maxBoxWidth && boxFontSize > 10) {
        boxFontSize -= 1;
        doc.font(F_BOLD).fontSize(boxFontSize);
        boxTextWidth = doc.widthOfString(valueText);
      }
      const boxTextHeight = doc.currentLineHeight();
      doc.text(valueText, rupeeBoxX + 15, footerStartY + (rupeeBoxHeight - boxTextHeight) / 2);

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
      console.error('Error generating pooja receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
