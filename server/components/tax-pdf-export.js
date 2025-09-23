const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const https = require('https');
const QRCode = require('qrcode'); // Optional: for QR code generation

module.exports = function createTaxRegistrationReceiptRouter({ db, verifyQueryToken }) {
  const router = express.Router();

  router.get('/api/tax-registrations/:id/receipt.pdf', verifyQueryToken, async (req, res) => {

    try {
      const { id } = req.params;
      
      // Fetch data
      const record = await db('user_tax_registrations')
        .where({ id: Number(id) })
        .andWhere('temple_id', req.user.templeId)
        .first();
      
      if (!record) {
        return res.status(404).json({ error: 'Tax registration not found' });
      }
      
      const settings = await db('pdf_settings')
        .where({ temple_id: req.user.templeId })
        .first()
        .catch(() => ({})) || {};

      // Create PDF
      const doc = new PDFDocument({ 
        size: 'A5', 
        layout: 'landscape', 
        margin: 0 // We'll handle margins manually for precision
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=tax_receipt_${id}.pdf`);
      doc.pipe(res);

      // Register Tamil font if available
      let fonts = { regular: 'Helvetica', bold: 'Helvetica-Bold', light: 'Helvetica-Light' };
      try {
        const tamilPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
        const tamilBoldPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Bold.ttf');
        if (fs.existsSync(tamilPath)) {
          doc.registerFont('Tamil', tamilPath);
          doc.registerFont('Tamil-Bold', tamilBoldPath || tamilPath);
          fonts = { 
            regular: 'Tamil', 
            bold: 'Tamil-Bold', 
            light: 'Tamil' 
          };
        }
      } catch (e) {
        console.warn('Tamil font not loaded:', e.message);
      }

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;

      // ========== BACKGROUND / WATERMARK (Optional) ==========
      // Uncomment if you want a very light watermark
      /*
      doc.save()
         .fillColor('#f0f0f0')
         .font(fonts.bold)
         .fontSize(80)
         .text('DRAFT', pageWidth / 2, pageHeight / 2, { 
           align: 'center',
           rotate: -45,
           origin: [pageWidth/2, pageHeight/2]
         })
         .restore();
      */

      // ========== OUTER BORDER ==========
      doc.roundedRect(margin, margin, contentWidth, pageHeight - margin*2, 5)
         .lineWidth(1.5)
         .strokeColor('#2c3e50')
         .stroke();

      // ========== HEADER SECTION ==========
      let y = margin + 25;
      
      // Logo (left)
      const logoSize = 45;
      const logoX = margin + 15;
      const logoY = y - 5;

      // Center X and configurable titles from settings
      const centerX = pageWidth / 2;
      const titleMain = settings.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      const titleSub = settings.title_sub || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம்';
      const titleLine2 = settings.title_line2 || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';

      // Main Title
      doc.font(fonts.bold)
         .fontSize(18)
         .fillColor('#2c3e50')
         .text(String(titleMain), centerX, y - 5, { width: contentWidth - 100, align: 'center' });

      y += 22;

      // Sub Title
      if (titleSub) {
        doc.font(fonts.regular)
           .fontSize(9)
           .fillColor('#555')
           .text(String(titleSub), centerX, y, { width: contentWidth - 100, align: 'center' });
        y += 16;
      }

      // Title Line 2
      if (titleLine2) {
        doc.font(fonts.bold)
           .fontSize(12)
           .fillColor('#34495e')
           .text(String(titleLine2), centerX, y, { width: contentWidth - 100, align: 'center' });
      }

      // Receipt No & Date — Positioned precisely
      y += 8;

      doc.font(fonts.regular)
         .fontSize(10)
         .fillColor('#666')
         .text(`ரசீது எண்: ${record.reference_number || `TR-${String(record.id).padStart(6, '0')}`}`, 
               margin + 20, y);

      doc.text(`தேதி: ${new Date(record.date || Date.now()).toLocaleDateString('ta-IN')}`, 
               pageWidth - margin - 20, y, { align: 'right' });

      y += 25;

      // Optional Sub-header (Tax-specific overrides general)
      const subHeader = settings.tax_subheader || settings.subheader || '';
      if (subHeader) {
        y += 10;
        doc.font(fonts.regular)
           .fontSize(10)
           .fillColor('#2c3e50')
           .text(String(subHeader), centerX, y, { width: contentWidth - 100, align: 'center' });
      }

      // ========== DIVIDER ==========
      doc.moveTo(margin + 20, y)
         .lineTo(pageWidth - margin - 20, y)
         .lineWidth(0.5)
         .strokeColor('#bdc3c7')
         .stroke();

      y += 20;

      // ========== BODY CONTENT — GRID LAYOUT ==========
      const leftColX = margin + 25;
      const rightColX = pageWidth / 2 + 30;
      const labelColor = '#555';
      const valueColor = '#000';
      const fieldHeight = 28;

      const drawField = (label, value, x, yPos, valueWidth = 220) => {
        doc.font(fonts.regular)
           .fontSize(9)
           .fillColor(labelColor)
           .text(label, x, yPos);

        doc.font(fonts.bold)
           .fontSize(11)
           .fillColor(valueColor)
           .text(String(value || '').trim() || '—', x, yPos + 14, { 
             width: valueWidth,
             ellipsis: true,
             lineBreak: false
           });

        return yPos + fieldHeight;
      };

      // Left Column
      let leftY = y;
      leftY = drawField('பெயர்', record.name, leftColX, leftY);
      leftY = drawField('தந்தை பெயர்', record.father_name, leftColX, leftY);
      
      const address = [record.address, record.village].filter(Boolean).join(', ');
      leftY = drawField('முகவரி', address, leftColX, leftY, 280);
      drawField('செல்', record.mobile_number, leftColX, leftY);

      // Right Column
      let rightY = y;
      rightY = drawField('வருடம்', record.year, rightColX, rightY);
      rightY = drawField('குறிப்பு எண்', record.reference_number || `TR-${String(record.id).padStart(6, '0')}`, rightColX, rightY);

      // ========== AMOUNT PANEL — HIGHLIGHTED ==========
      const amountY = rightY + 20;
      const amountBoxWidth = 180;
      const amountBoxHeight = 50;

      // Background
      doc.fillColor('#f8f9fa')
         .roundedRect(rightColX - 5, amountY - 5, amountBoxWidth + 10, amountBoxHeight + 10, 4)
         .fill();

      // Border
      doc.strokeColor('#27ae60')
         .lineWidth(1.5)
         .roundedRect(rightColX - 5, amountY - 5, amountBoxWidth + 10, amountBoxHeight + 10, 4)
         .stroke();

      // Label
      doc.fillColor('#2c3e50')
         .font(fonts.regular)
         .fontSize(10)
         .text('செலுத்திய தொகை', rightColX, amountY + 5);

      // Value
      const amount = Number(record.amount_paid || 0);
      const amountText = `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      doc.font(fonts.bold)
         .fontSize(16)
         .fillColor('#27ae60')
         .text(amountText, rightColX, amountY + 22);

      // ========== QR CODE (Professional Touch) ==========
      try {
        const qrData = JSON.stringify({
          id: record.id,
          ref: record.reference_number,
          date: record.date,
          amount: record.amount_paid,
          templeId: req.user.templeId
        });
        const qrBuffer = await QRCode.toBuffer(qrData, { width: 60, margin: 1, color: { dark: '#2c3e50' } });
        
        const qrX = pageWidth - margin - 80;
        const qrY = pageHeight - margin - 100;
        doc.image(qrBuffer, qrX, qrY, { width: 60, height: 60 });
        
        doc.font(fonts.light)
           .fontSize(7)
           .fillColor('#666')
           .text('ஸ்கேன் செய்து சரிபார்க்கவும்', qrX, qrY + 65, { align: 'center' });
      } catch (e) {
        console.warn('QR Code generation failed:', e.message);
      }

      // ========== FOOTER — SIGNATURE & CONTACT ==========
      const footerY = pageHeight - margin - 40;

      // Signature line
      const sigWidth = 160;
      const sigX = pageWidth - margin - sigWidth - 20;
      doc.moveTo(sigX, footerY)
         .lineTo(sigX + sigWidth, footerY)
         .lineWidth(1)
         .strokeColor('#555')
         .stroke();

      doc.font(fonts.regular)
         .fontSize(10)
         .fillColor('#555')
         .text('வசூலிப்பாளர் கையொப்பம்', sigX + (sigWidth/2) - 45, footerY + 8);

      // Contact / Watermark (Bottom)
      const watermark = settings.watermark_text || '';
      if (watermark) {
        doc.fontSize(8)
           .fillColor('#cccccc')
           .text(String(watermark), margin, footerY + 5, { width: pageWidth - margin * 2, align: 'center' });
      }

      // ========== LOGO — Top Left ==========
      if (settings.logo_url) {
        try {
          let logoBuffer = null;
          if (/^https?:\/\//i.test(settings.logo_url)) {
            logoBuffer = await new Promise((resolve) => {
              https.get(settings.logo_url, (response) => {
                if (response.statusCode !== 200) return resolve(null);
                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', () => resolve(null));
              }).on('error', () => resolve(null));
            });
          } else if (settings.logo_url.startsWith('/public/')) {
            const filePath = path.join(__dirname, '..', '..', settings.logo_url.replace(/^\/public\//, 'public/'));
            if (fs.existsSync(filePath)) {
              logoBuffer = fs.readFileSync(filePath);
            }
          }

          if (logoBuffer) {
            doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize, align: 'left' });
          }
        } catch (e) {
          console.warn('Logo loading failed:', e.message);
        }
      }

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('PDF generation failed:', error);
      res.status(500).json({ error: 'Failed to generate receipt PDF' });
    }
  });

  return router;
};