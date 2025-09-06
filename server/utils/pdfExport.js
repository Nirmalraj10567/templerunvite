const PDFDocument = require('pdfkit');

/**
 * Generates a PDF document with all registration records
 * @param {Array} registrations - Array of registration records
 * @param {Object} res - Express response object
 */
function exportRegistrationsToPdf(registrations, res) {
  try {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all_registrations.pdf');
    doc.pipe(res);

    // Title Page
    doc.fontSize(24).font('Helvetica-Bold').text('All Registration Records', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
      .text(`Total Records: ${registrations.length}`, { align: 'center' });
    doc.moveDown(2);

    // Table Headers
    const tableTop = doc.y;
    const itemX = 50;
    const receiptX = 150;
    const nameX = 250;
    const mobileX = 400;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', itemX);
    doc.text('Receipt #', receiptX);
    doc.text('Name', nameX);
    doc.text('Mobile', mobileX);
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(560, doc.y).stroke();

    // Table Rows
    doc.font('Helvetica').fontSize(9);
    for (const reg of registrations) {
      const y = doc.y + 5;
      if (y > 780) { // Check for page break
        doc.addPage();
        doc.y = 40;
      }
      doc.text(reg.id, itemX);
      doc.text(reg.receipt_number || 'N/A', receiptX);
      doc.text(reg.name, nameX, { width: 140, ellipsis: true });
      doc.text(reg.mobile_number || 'N/A', mobileX);
      doc.moveDown(1);
    }

    doc.end();
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generates a PDF document for a single registration
 * @param {Object} registration - The registration record
 * @param {Object} res - Express response object
 */
function exportSingleRegistrationToPdf(registration, res) {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=registration_${registration.id}.pdf`);
    doc.pipe(res);

    // Helper to add a section with a title and line
    const addSection = (title) => {
      doc.moveDown(1.5);
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
      doc.moveDown(0.5);
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
    };

    // Helper to add a key-value pair
    const addRow = (key, value) => {
      doc.fontSize(11).font('Helvetica-Bold').text(key, { continued: true });
      doc.font('Helvetica').text(`: ${value || 'N/A'}`);
      doc.moveDown(0.5);
    };

    // Title
    doc.fontSize(22).font('Helvetica-Bold').text('Registration Details', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Receipt #: ${registration.receipt_number || 'N/A'}`, { align: 'center' });

    // Personal Information
    addSection('Personal Information');
    addRow('Name', registration.name);
    addRow("Father's Name", registration.father_name);
    addRow('Mobile Number', registration.mobile_number);
    addRow('Aadhaar Number', registration.aadhaar_number);
    addRow('Address', registration.address);
    addRow('Postal Code', registration.postal_code);

    // Family & Group
    addSection('Family & Group Information');
    addRow('Clan', registration.clan);
    addRow('Group', registration.group);
    addRow('Male Heirs', registration.male_heirs);
    addRow('Female Heirs', registration.female_heirs);

    // Financials (assuming these fields exist)
    if (registration.amount !== undefined) {
      addSection('Financial Information');
      addRow('Amount', `₹${registration.amount?.toLocaleString() || '0'}`);
      addRow('Amount Paid', `₹${registration.amount_paid?.toLocaleString() || '0'}`);
      addRow('Donation', `₹${registration.donation?.toLocaleString() || '0'}`);
      addRow('Total Amount', `₹${registration.total_amount?.toLocaleString() || '0'}`);
      addRow('Outstanding', `₹${registration.outstanding_amount?.toLocaleString() || '0'}`);
    }

    doc.end();
  } catch (error) {
    console.error('Error in single registration PDF generation:', error);
    throw new Error('Failed to generate single registration PDF');
  }
}

module.exports = {
  exportRegistrationsToPdf,
  exportSingleRegistrationToPdf
};
