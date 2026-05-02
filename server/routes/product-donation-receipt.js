const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');

module.exports = function createProductDonationReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/donations/:id/receipt.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch donation record
      const row = await db('donations')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
        
      if (!row) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      // Fetch temple settings
      const settings = await db('pdf_settings')
        .where({ temple_id: req.user.templeId })
        .first()
        .catch(() => null);

      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'A5', 
        layout: 'landscape', 
        margin: 24,
        bufferPages: true 
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=donation_receipt_${id}.pdf`);
      doc.pipe(res);

      // Load Tamil font
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
      } catch (fontError) {
        console.warn('Tamil font loading failed:', fontError.message);
      }

      const F_REG = hasTamilFont ? 'Tamil' : 'Helvetica';
      const F_BOLD = hasTamilBoldFont ? 'TamilBold' : (hasTamilFont ? 'Tamil' : 'Helvetica-Bold');

      // Helpers to render bold-looking Tamil when bold font isn't available
      const drawBold = (text, x, y, size, options = {}) => {
        if (hasTamilBoldFont) {
          doc.font(F_BOLD).fontSize(size).text(text, x, y, options);
        } else {
          // Faux bold by drawing twice with a tiny x-offset
          doc.font(F_REG).fontSize(size).text(text, x, y, options);
          const dupOpts = { ...options };
          doc.text(text, x + 0.35, y, dupOpts);
        }
      };
      const drawReg = (text, x, y, size, options = {}) => {
        doc.font(F_REG).fontSize(size).text(text, x, y, options);
      };

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

      // Header section
      const headerHeight = 100;
      const headerY = marginTop + 4;
      
      // Header border
      doc.lineWidth(1.5)
         .rect(marginLeft, headerY, contentWidth, headerHeight)
         .stroke();

      // Load and draw logo
      let logoWidth = 0;
      const logoMaxWidth = 80;
      
      try {
        const logoUrl = settings?.logo_url;
        if (logoUrl) {
          let logoBuffer = null;
          
          if (/^https?:\/\//i.test(logoUrl)) {
            // Remote URL
            logoBuffer = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Logo download timeout')), 5000);
              https.get(logoUrl, (response) => {
                clearTimeout(timeout);
                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
              }).on('error', reject);
            });
          } else {
            // Local file
            const localPath = path.join(__dirname, '..', '..', logoUrl.replace(/^\/+/, ''));
            if (fs.existsSync(localPath)) {
              logoBuffer = fs.readFileSync(localPath);
            }
          }

          if (logoBuffer && logoBuffer.length > 0) {
            logoWidth = Math.min(logoMaxWidth, headerHeight - 20);
            const logoX = marginLeft + 12;
            const logoY = headerY + (headerHeight - logoWidth) / 2;
            doc.image(logoBuffer, logoX, logoY, { 
              width: logoWidth, 
              height: logoWidth,
              fit: [logoWidth, logoWidth]
            });
          }
        }
      } catch (logoError) {
        console.warn('Logo loading failed:', logoError.message);
        logoWidth = 0;
      }

      // Header text content
      const textStartX = marginLeft + logoWidth + 24;
      const textWidth = contentWidth - logoWidth - 36;
      
      // Temple titles with default values
      const templeTitleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const templeTitleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const templeTitleLine2 = settings?.title_line2 || 
        'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம் வெளையன் குல பங்காளிகளுக்கு பாத்தியப்பட்ட குலதெய்வம் மாணிக்கம்பாளையம்';

      let textY = headerY + 12;

      // Sub title
      doc.font(F_BOLD).fontSize(11)
         .text(templeTitleSub, textStartX, textY, { 
           width: textWidth, 
           align: 'center' 
         });
      textY += 18;

      // Address line
      doc.font(F_REG).fontSize(9)
         .text(templeTitleLine2, textStartX, textY, { 
           width: textWidth, 
           align: 'center' 
         });
      textY += 24;

      // Main temple title
      doc.font(F_BOLD).fontSize(15)
         .text(templeTitleMain, textStartX, textY, { 
           width: textWidth, 
           align: 'center' 
         });

      // Receipt details section
      const receiptY = headerY + headerHeight + 16;
      const receiptHeight = 45;
      
      doc.lineWidth(1.5)
         .rect(marginLeft, receiptY, contentWidth, receiptHeight)
         .stroke();

      // Receipt number on same line
      const receiptNo = String(row.register_no || row.id).padStart(3, '0');
      const receiptText = `ரசீது எண் ${receiptNo}`;
      drawReg(receiptText, marginLeft + 15, receiptY + 16, 12);
      
      // Receipt title (center)
      const receiptTitle = settings?.subheader || 'நன்கொடை ரசீது';
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(14);
      const titleWidth = doc.widthOfString(receiptTitle);
      const titleX = marginLeft + (contentWidth - titleWidth) / 2;
      drawBold(receiptTitle, titleX, receiptY + 16, 14);

      // Date on same line - format to DD/MM/YY
      const rawDate = row.donation_date || row.entry_date || new Date().toISOString().split('T')[0];
      // Parse date and format as DD/MM/YY
      const dateParts = String(rawDate).slice(0, 10).split('-');
      let donationDate;
      if (dateParts.length === 3) {
        const day = dateParts[2];
        const month = dateParts[1];
        const year = dateParts[0].slice(2); // Last 2 digits of year
        donationDate = `${day}/${month}/${year}`;
      } else {
        donationDate = String(rawDate).slice(0, 10);
      }
      const dateText = `தேதி ${donationDate}`;
      doc.font(hasTamilBoldFont ? F_BOLD : F_REG).fontSize(12);
      const dateTextWidth = doc.widthOfString(dateText);
      const dateX = marginLeft + contentWidth - 15 - dateTextWidth;
      drawReg(dateText, dateX, receiptY + 16, 12);

      // Main content area
      const contentY = receiptY + receiptHeight + 20;
      
      // Right side info box
      const infoBoxWidth = 200;
      const infoBoxHeight = 80;
      const infoBoxX = marginLeft + contentWidth - infoBoxWidth - 12;
      const infoBoxY = contentY;
      
      doc.lineWidth(1)
         .rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight)
         .stroke();

      // Labels and values alignment inside info box
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
      
      // Draw labels
      doc.text(labelYear, labelX, row1Y);
      doc.text(labelCell, labelX, row2Y);

      // Fill values in box: Year (from date) and Cell (phone)
      const yearValue = dateParts[0];

      const phoneValue = row.donor_contact || row.phone || row.mobile || '';

      // Render values bold
      doc.font(F_BOLD).fontSize(12);
      doc.text(yearValue, valueX, row1Y, { width: valueWidth, align: 'left' });

      const phoneDisplay = String(phoneValue).trim();
      doc.text(phoneDisplay || '-', valueX, row2Y, { width: valueWidth, align: 'left' });

      // Donor information (left side)
      const donorTextWidth = infoBoxX - marginLeft - 30;
      let donorY = contentY + 8;

      const donorName = (row.donor_name || '').toString().toUpperCase();
      const address = row.donor_address || row.address || '';
      const productName = row.product_name || '';
      const quantity = row.quantity || 0;
      const unit = row.unit || '';

      // Donor details
      const donorLine1 = `உயர்திரு/திருமதி ${donorName}`;
      const donorLine2 = address;
      const donorLine3 = 'அவர்களிடமிருந்து';

      doc.font(F_BOLD).fontSize(12)
        .text(donorLine1, marginLeft + 15, donorY);
      
      if (address) {
        donorY = doc.y + 6;
        drawBold(donorLine2, marginLeft + 15, donorY, 12, { 
          width: donorTextWidth, 
          align: 'left' 
        });
      }

      donorY = doc.y + 8;
      doc.font(F_REG).fontSize(12)
         .text(donorLine3, marginLeft + 15, donorY, { 
           width: donorTextWidth, 
           align: 'left' 
         });

      donorY = doc.y + 8;
      // Product donation line
      const productText = `பொருள்: ${productName} - அளவு: ${quantity} ${unit}`;
      drawBold(productText, marginLeft + 15, donorY, 12, { 
        width: donorTextWidth, 
        align: 'left' 
      });

      donorY = doc.y + 8;
      doc.font(F_REG).fontSize(12)
         .text('மட்டும் நன்றியுடன்', marginLeft + 15, donorY, { 
           width: donorTextWidth, 
           align: 'left' 
         });

      // Footer positioning
      const rupeeBoxHeight = 50;
      const collectorTextHeight = 15;
      const totalFooterHeight = rupeeBoxHeight + collectorTextHeight + 10;
      
      const footerStartY = pageHeight - marginBottom - totalFooterHeight;
      
      // Product info box instead of rupee box
      const productBoxWidth = 200;
      const productBoxX = marginLeft + 15;
      
      doc.lineWidth(1.5)
         .rect(productBoxX, footerStartY, productBoxWidth, rupeeBoxHeight)
         .stroke();

      // Product details in box
      const productLabel = 'பொருள்';
      const quantityLabel = 'அளவு';
      
      doc.font(F_REG).fontSize(10);
      doc.text(productLabel, productBoxX + 10, footerStartY + 12);
      doc.text(quantityLabel, productBoxX + 10, footerStartY + 32);
      
      doc.font(F_BOLD).fontSize(12);
      doc.text(productName, productBoxX + 50, footerStartY + 12, { width: productBoxWidth - 60 });
      doc.text(`${quantity} ${unit}`, productBoxX + 50, footerStartY + 32);

      // Collector signature
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

      // Add watermark if needed
      if (settings?.watermark_text) {
        doc.font(F_REG).fontSize(8)
           .fillColor('gray')
           .text(settings.watermark_text, marginLeft, footerStartY - 20, {
             width: contentWidth,
             align: 'center'
           });
      }

      doc.end();

    } catch (error) {
      console.error('Error generating product donation receipt PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to generate receipt PDF', 
          details: error.message 
        });
      }
    }
  });

  return router;
};
