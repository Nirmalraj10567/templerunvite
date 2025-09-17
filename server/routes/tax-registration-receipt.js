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

      // Prepare PDF - A5 Landscape, with buffered pages for accurate measurements
      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=tax_receipt_${id}.pdf`);
      doc.pipe(res);

      // Load Tamil fonts (regular + bold if available); provide sensible fallbacks
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

      // Helpers to render bold-looking Tamil when bold font isn't available
      const drawBold = (text, x, y, size, options = {}) => {
        if (hasTamilBoldFont) {
          doc.font(F_BOLD).fontSize(size).text(text, x, y, options);
        } else {
          doc.font(F_REG).fontSize(size).text(text, x, y, options);
          const dupOpts = { ...options };
          doc.text(text, x + 0.35, y, dupOpts);
        }
      };
      const drawReg = (text, x, y, size, options = {}) => {
        doc.font(F_REG).fontSize(size).text(text, x, y, options);
      };

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
      const templeTitleta2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';
      const templeMainTitleta = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const subHeaderTa = settings?.tax_subheader || settings?.subheader || 'வரி ரசீது';

      // Load logo into buffer (draw later inside header for exact layout)
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
                r.on('end', () => {
                  clearTimeout(timeout);
                  resolve(Buffer.concat(chunks));
                });
                r.on('error', (e) => {
                  clearTimeout(timeout);
                  reject(e);
                });
              }).on('error', (e) => {
                clearTimeout(timeout);
                reject(e);
              });
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

      // Adopt exact layout from money-donation receipt
      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = doc.page.margins.left;
      const marginRight = doc.page.margins.right;
      const marginTop = doc.page.margins.top;
      const marginBottom = doc.page.margins.bottom;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Draw main border
      doc.lineWidth(2)
         .rect(marginLeft - 6, marginTop - 6, 
               contentWidth + 12, pageHeight - marginTop - marginBottom + 12)
         .stroke();

      // Header section with border
      const headerHeight = 100;
      const headerY = marginTop + 4;
      doc.lineWidth(1.5)
         .rect(marginLeft, headerY, contentWidth, headerHeight)
         .stroke();

      // Draw logo inside header (matching money donation layout)
      let logoWidth = 0;
      if (logoBuffer && logoBuffer.length > 0) {
        logoWidth = Math.min(80, headerHeight - 20);
        const logoX = marginLeft + 12;
        const logoY = headerY + (headerHeight - logoWidth) / 2;
        doc.image(logoBuffer, logoX, logoY, {
          width: logoWidth,
          height: logoWidth,
          fit: [logoWidth, logoWidth]
        });
      }

      // Header text content
      const textStartX = marginLeft + logoWidth + 24;
      const textWidth = contentWidth - logoWidth - 36;
      let textY = headerY + 12;

      // Sub title
      doc.font(F_BOLD).fontSize(11)
         .text(templeTitleTa, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 18;

      // Address line
      doc.font(F_REG).fontSize(9)
         .text(templeTitleta2, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 24;

      // Main temple title
      doc.font(F_BOLD).fontSize(15)
         .text(templeMainTitleta, textStartX, textY, { width: textWidth, align: 'center' });

      // Receipt details section (below header)
      const receiptY = headerY + headerHeight + 16;
      const receiptHeight = 45;
      doc.lineWidth(1.5)
         .rect(marginLeft, receiptY, contentWidth, receiptHeight)
         .stroke();

      // Receipt number (left), Title (center), Date (right)
      const receiptNo = String(row.reference_number || row.id).padStart(3, '0');
      const receiptText = `ரசீது எண் ${receiptNo}`;
      drawReg(receiptText, marginLeft + 15, receiptY + 16, 12);

      // Title center
      const receiptTitle = subHeaderTa;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(14);
      const titleWidth = doc.widthOfString(receiptTitle);
      const titleX = marginLeft + (contentWidth - titleWidth) / 2;
      drawBold(receiptTitle, titleX, receiptY + 16, 14);

      // Date right
      const donationDate = row.date || new Date().toLocaleDateString('en-GB');
      const dateText = `தேதி ${donationDate}`;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(12);
      const dateTextWidth = doc.widthOfString(dateText);
      const dateX = marginLeft + contentWidth - 15 - dateTextWidth;
      drawReg(dateText, dateX, receiptY + 16, 12);

      // Main content area start
      const contentYStart = receiptY + receiptHeight + 20;

      // Right side info box (Year, Mobile)
      const infoBoxWidth = 200;
      const infoBoxHeight = 80;
      const infoBoxX = marginLeft + contentWidth - infoBoxWidth - 12;
      const infoBoxY = contentYStart;
      doc.lineWidth(1).rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight).stroke();

      const labelYear = 'வருடம்';
      const labelCell = 'செல்';
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

      const yearMatch = String(row.year || '').match(/(\d{4})/);
      const yearValue = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      const phoneValue = [row.mobile_number, row.phone, row.mobile, row.mobile_no, row.phone_no, row.contact, row.contact_no, row.whatsapp]
        .find(v => v && String(v).trim().length > 0) || '';
      doc.font(F_BOLD).fontSize(12);
      doc.text(yearValue, valueX, row1Y, { width: valueWidth, align: 'left' });
      doc.font(F_BOLD).fontSize(12);
      doc.text(String(phoneValue).trim() || '-', valueX, row2Y, { width: valueWidth, align: 'left' });

      // Donor information left block
      const donorTextWidth = infoBoxX - marginLeft - 30;
      let donorY = contentYStart + 8;
      const donorName = (row.name || '').toString().toUpperCase();
      const fatherName = (row.father_name || '').toString();
      const address = [row.address, row.village].filter(Boolean).join(', ');
      const amountPaid = Number(row.amount_paid || 0).toFixed(2);

      const prefixText = 'உயர்திரு/திருமதி ';
      const remainderText = `${donorName}, S/o க/பெ ${fatherName}`;
      doc.font(F_BOLD).fontSize(12).text(prefixText, marginLeft + 15, donorY);
      const prefixWidth = doc.widthOfString(prefixText);
      drawBold(remainderText, marginLeft + 15 + prefixWidth, donorY, 12, { width: donorTextWidth - prefixWidth, align: 'left' });

      if (address) {
        donorY = doc.y + 6;
        drawBold(address, marginLeft + 15, donorY, 12, { width: donorTextWidth, align: 'left' });
      }

      donorY = doc.y + 8;
      doc.font(F_REG).fontSize(12).text('அவர்களிடமிருந்து', marginLeft + 15, donorY, { width: donorTextWidth, align: 'left' });

      donorY = doc.y + 8;
      const amountPrefixBefore = 'வரி தொகையாக ';
      const amountWord = 'ரூபாய்';
      const amountSuffix = '/-';
      doc.font(F_REG).fontSize(12).text(amountPrefixBefore, marginLeft + 15, donorY);
      const amountPrefixWidth = doc.widthOfString(amountPrefixBefore);
      drawBold(amountWord, marginLeft + 15 + amountPrefixWidth, donorY, 12);
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(12);
      const amountWordWidth = doc.widthOfString(amountWord);
      const restText = ` ${amountPaid}${amountSuffix}`;
      drawReg(restText, marginLeft + 15 + amountPrefixWidth + amountWordWidth, donorY, 12, { width: donorTextWidth - (amountPrefixWidth + amountWordWidth), align: 'left' });

      donorY = doc.y + 8;
      doc.font(F_REG).fontSize(12).text('மட்டும் நன்றியுடன்', marginLeft + 15, donorY, { width: donorTextWidth, align: 'left' });

      // Footer placement: rupee box and collector text
      const rupeeBoxHeight = 50;
      const collectorTextHeight = 15;
      const totalFooterHeight = rupeeBoxHeight + collectorTextHeight + 10;
      const footerStartY = pageHeight - marginBottom - totalFooterHeight;

      const rupeeBoxWidth = 160;
      const rupeeBoxX = marginLeft + 15;
      doc.lineWidth(1.5).rect(rupeeBoxX, footerStartY, rupeeBoxWidth, rupeeBoxHeight).stroke();

      const rupeeSymbol = 'ரூ';
      const currencyText = `${rupeeSymbol} ${Number(amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      const currencyX = rupeeBoxX + 15;
      const currencyY = footerStartY + (rupeeBoxHeight - currencyTextHeight) / 2;
      doc.text(currencyText, currencyX, currencyY);

      const collectorText = 'வசூலிப்பாளர்';
      doc.font(F_REG).fontSize(12);
      const collectorWidth = doc.widthOfString(collectorText);
      const collectorX = marginLeft + contentWidth - collectorWidth - 15;
      const collectorY = footerStartY + rupeeBoxHeight + 5;
      if (collectorY + collectorTextHeight <= pageHeight - marginBottom) {
        doc.text(collectorText, collectorX - 95, collectorY - 30);
      } else {
        doc.text(collectorText, collectorX + 10, footerStartY + rupeeBoxHeight - 10);
      }

      // Optional watermark text centered near footer (relative to rupee box)
      if (settings?.watermark_text) {
        doc.font(F_REG).fontSize(8).fillColor('gray')
          .text(settings.watermark_text, doc.page.margins.left, footerStartY - 20, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: 'center'
          });
      }

      doc.end();
    } catch (err) {
      console.error('Error generating tax receipt PDF:', err);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};
