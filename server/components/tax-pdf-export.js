const PDFDocument = require('pdfkit');

/**
 * Generates a PDF document for a tax registration
 * @param {Object} options - Options for PDF generation
 * @param {Object} options.row - The tax registration data
 * @param {string} options.templeId - The ID of the temple
 * @returns {PDFDocument} - The generated PDF document
 */
const generateTaxRegistrationPDF = ({ row, templeId }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  
  // Header
  doc.fontSize(16).text('Tax Registration / வரி பதிவு', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Temple ID: ${templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
  doc.moveDown(0.5);
  doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
  doc.moveDown(0.5);

  const field = (en, ta, val) => {
    doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
    doc.font('Helvetica-Bold').text(val ?? '-');
    doc.font('Helvetica');
  };

  // Body fields
  field('Name', 'பெயர்', row.name);
  field('Father Name', 'தந்தை', row.father_name);
  field('Mobile', 'கைபேசி', row.mobile_number);
  field('Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
  field('Village', 'கிராமம்', row.village || '-');
  field('Address', 'முகவரி', row.address || '-');
  field('Subdivision', 'உட்பிரிவு', row.subdivision || '-');
  field('Year', 'வருடம்', row.year);
  field('Reference No', 'குறிப்பு எண்', row.reference_number || '-');
  field('Tax Amount', 'வரி தொகை', `₹${Number(row.tax_amount || 0).toFixed(2)}`);
  field('Amount Paid', 'செலுத்தியது', `₹${Number(row.amount_paid || 0).toFixed(2)}`);
  const outstanding = Number(row.outstanding_amount ?? Math.max(0, (row.tax_amount||0) - (row.amount_paid||0)));
  field('Outstanding', 'நிலுவை', `₹${outstanding.toFixed(2)}`);
  field('Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');

  return doc;
};

/**
 * Handles the tax registration PDF export request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} db - Database connection object
 */
const exportTaxRegistrationPDF = async (req, res, db) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    const row = await db('user_tax_registrations')
      .where({ id, temple_id: templeId })
      .first();
    
    if (!row) {
      return res.status(404).json({ error: 'Tax registration not found or access denied.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=tax-registration-${row.id}.pdf`);

    const doc = generateTaxRegistrationPDF({ row, templeId });
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('Error exporting tax registration PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
};

module.exports = {
  exportTaxRegistrationPDF,
  generateTaxRegistrationPDF // Exporting for testing purposes
};
