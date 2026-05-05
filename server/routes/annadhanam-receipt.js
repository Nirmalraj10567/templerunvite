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

      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=annadhanam_receipt_${id}.pdf`);
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
        const safeText = String(text || '').replace(/₹/g, 'ரூ');
        if (hasTamilBoldFont) {
          doc.font(F_BOLD).fontSize(size).text(safeText, x, y, options);
        } else {
          doc.font(F_REG).fontSize(size).text(safeText, x, y, options);
          doc.text(safeText, x + 0.35, y, options);
        }
      };
      const drawReg = (text, x, y, size, options = {}) => {
        const safeText = String(text || '').replace(/₹/g, 'ரூ');
        doc.font(F_REG).fontSize(size).text(safeText, x, y, options);
      };

      // Dimensions and main border
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

      // Load PDF settings
      const settings = await db('pdf_settings').where({ temple_id: req.user.templeId }).first().catch(() => null);
      const titleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const titleLine2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம்,கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const titleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      // Use only the Annadhanam-specific sub-header; do not fall back to the generic one
      const subHeader = (settings?.annadhanam_subheader && String(settings.annadhanam_subheader).trim().length > 0)
        ? settings.annadhanam_subheader
        : 'அன்னதானம் ரசீது';
      // Customizable labels
      const L = {
        receipt: settings?.annadhanam_receipt_label || 'ரசீது எண்',
        date: settings?.annadhanam_date_label || 'தேதி',
        year: settings?.annadhanam_year_label || 'வருடம்',
        cell: settings?.annadhanam_cell_label || 'செல்',
        collector: settings?.annadhanam_collector_label || 'வசூலிப்பாளர்',
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
            const rel = logoUrl.replace(/^\/*/, '');
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) {
              logoBuffer = fs.readFileSync(localPath);
            }
          }
        }
      } catch {}

      // Derive donation info (type + details)
      const inferDonation = (row) => {
        const out = { type: 'food', foodText: '', people: Number(row.peoples || 0), productName: null, quantity: null, unit: null, amount: null };
        const dt = row.donation_type || null;
        if (dt === 'product' || dt === 'money' || dt === 'food') out.type = dt;
        // If structured columns exist, prefer them
        if (!out.foodText && row.food) out.foodText = String(row.food);
        if (row.product_name) { out.productName = String(row.product_name); out.type = 'product'; }
        if (row.quantity != null) { out.quantity = Number(row.quantity); }
        if (row.unit) { out.unit = String(row.unit); }
        if (row.amount != null) { out.amount = Number(row.amount); out.type = 'money'; }
        // If still ambiguous, parse from foodText
        if (!dt && out.foodText) {
          const ft = out.foodText.trim();
          if (/^Product:/i.test(ft)) {
            out.type = 'product';
            const nameMatch = ft.match(/^Product:\s*([^|]+)/i);
            if (nameMatch) out.productName = nameMatch[1].trim();
            const qtyMatch = ft.match(/Qty:\s*([0-9.]+)/i);
            if (qtyMatch) out.quantity = Number(qtyMatch[1]);
            const unitMatch = ft.match(/Unit:\s*([^|]+)/i);
            if (unitMatch) out.unit = unitMatch[1].trim();
          } else if (/^Money:/i.test(ft)) {
            out.type = 'money';
            const amtMatch = ft.match(/Money:\s*([0-9.]+)/i);
            if (amtMatch) out.amount = Number(amtMatch[1]);
          } else {
            out.type = 'food';
          }
        }
        return out;
      };
      const donation = inferDonation(row);

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
      const receiptY = headerY + headerHeight + 16;
      const receiptHeight = 45;
      doc.lineWidth(1.5).rect(marginLeft, receiptY, contentWidth, receiptHeight).stroke();
      const receiptNo = String(row.receipt_number || row.id).padStart(3, '0');
      drawReg(`${L.receipt} ${receiptNo}`, marginLeft + 15, receiptY + 16, 12);
      const receiptTitle = subHeader;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(14);
      const titleW = doc.widthOfString(receiptTitle);
      const titleX = marginLeft + (contentWidth - titleW) / 2;
      drawBold(receiptTitle, titleX, receiptY + 16, 14);
      // Date formatting helper: show as d/m/yyyy
      const toDateSafe = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
          const d2 = new Date(`${val}T00:00:00`);
          if (!isNaN(d2.getTime())) return d2;
        }
        return null;
      };
      const formatDMY = (val) => {
        const d = toDateSafe(val) || new Date();
        const dd = d.getDate();
        const mm = d.getMonth() + 1; // 1-based
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };
      const dateText = `${L.date} ${formatDMY(row.from_date)}`;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(12);
      const dateTextWidth = doc.widthOfString(dateText);
      drawReg(dateText, marginLeft + contentWidth - 15 - dateTextWidth, receiptY + 16, 12);

      // Main content area
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
      const yearMatch = String(row.from_date || '').match(/(\d{4})/);
      const yearValue = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      const phoneValue = [row.mobile_number, row.phone, row.mobile, row.mobile_no, row.phone_no, row.contact, row.contact_no, row.whatsapp]
        .find(v => v && String(v).trim().length > 0) || '';
      doc.font(F_BOLD).fontSize(12).text(yearValue, valueX, row1Y, { width: valueWidth, align: 'left' });
      doc.font(F_BOLD).fontSize(12).text(String(phoneValue).trim() || '-', valueX, row2Y, { width: valueWidth, align: 'left' });

      // Left details block (donor and donation details)
      const donorTextWidth = infoBoxX - marginLeft - 30;
      let donorY = contentYStart + 8;
      const donorName = (row.name || '').toString().toUpperCase();
      const peoples = Number(row.peoples || 0);
      const timeStr = (row.time || '-').toString();
      const periodStr = `${row.from_date || ''} - ${row.to_date || ''}`;
      const prefixText = 'உயர்திரு/திருமதி ';
      doc.font(F_BOLD).fontSize(12).text(prefixText, marginLeft + 15, donorY);
      const prefixWidth = doc.widthOfString(prefixText);
      drawBold(`${donorName}`, marginLeft + 15 + prefixWidth, donorY, 12, { width: donorTextWidth - prefixWidth, align: 'left' });
      donorY = doc.y + 6;
      // Donation detail line
      if (donation.type === 'money') {
        const amtText = (donation.amount != null) ? `ரூ ${donation.amount}` : (donation.foodText || '');
        drawBold(`நன்கொடை: ${amtText}`, marginLeft + 15, donorY, 12, { width: donorTextWidth, align: 'left' });
      } else if (donation.type === 'product') {
        const pn = donation.productName || '';
        const q = donation.quantity != null ? ` (Qty: ${donation.quantity}${donation.unit ? ` ${donation.unit}` : ''})` : '';
        drawBold(`பொருள்: ${pn}${q}`, marginLeft + 15, donorY, 12, { width: donorTextWidth, align: 'left' });
      } else {
        const ft = donation.foodText || '';
        const pplText = peoples > 0 ? ` - மக்கள்: ${peoples}` : '';
        drawBold(`அன்னதானம்: ${ft}${pplText}`, marginLeft + 15, donorY, 12, { width: donorTextWidth, align: 'left' });
      }
      donorY = doc.y + 8;
      doc.font(F_REG).fontSize(12).text('அவர்களிடமிருந்து', marginLeft + 15, donorY, { width: donorTextWidth, align: 'left' });

      // Footer box: show key metric prominently based on type
      const rupeeBoxHeight = 50;
      const collectorTextHeight = 15;
      const totalFooterHeight = rupeeBoxHeight + collectorTextHeight + 10;
      const footerStartY = pageHeight - marginBottom - totalFooterHeight;
      const rupeeBoxWidth = 160;
      const rupeeBoxX = marginLeft + 15;
      doc.lineWidth(1.5).rect(rupeeBoxX, footerStartY, rupeeBoxWidth, rupeeBoxHeight).stroke();
      let boxText = '';
      if (donation.type === 'money') {
        boxText = `ரூ ${donation.amount != null ? donation.amount : ''}`;
      } else if (donation.type === 'product') {
        boxText = donation.quantity != null ? `${donation.quantity}${donation.unit ? ` ${donation.unit}` : ''}` : 'PRODUCT';
      } else {
        boxText = peoples > 0 ? `மக்கள் ${peoples}` : 'FOOD';
      }
      let boxFontSize = 20;
      doc.font(F_BOLD).fontSize(boxFontSize);
      let boxTextWidth = doc.widthOfString(boxText);
      const maxBoxWidth = rupeeBoxWidth - 30;
      while (boxTextWidth > maxBoxWidth && boxFontSize > 10) {
        boxFontSize -= 1;
        doc.font(F_BOLD).fontSize(boxFontSize);
        boxTextWidth = doc.widthOfString(boxText);
      }
      const boxTextHeight = doc.currentLineHeight();
      doc.text(boxText, rupeeBoxX + 15, footerStartY + (rupeeBoxHeight - boxTextHeight) / 2);

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
      console.error('Error generating annadhanam receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
