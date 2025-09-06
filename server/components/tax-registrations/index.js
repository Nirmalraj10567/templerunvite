const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure storage for tax photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../public/uploads/tax-photos/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST endpoint for tax registrations
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const formData = req.body;
    const errors = validateFormData(formData);
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
        message: 'Please fix the highlighted fields'
      });
    }
    
    // Process cleaned data
    const cleanedData = {
      ...formData,
      mobileNumber: formData.mobileNumber.replace(/\D/g, ''),
      aadhaarNumber: formData.aadhaarNumber?.replace(/\D/g, '') || null,
      photoPath: req.file ? `/uploads/tax-photos/${req.file.filename}` : null
    };
    
    // Save to database (implementation details would go here)
    const registrationId = await saveTaxRegistration(cleanedData);
    
    res.json({
      success: true,
      id: registrationId,
      message: 'Tax registration submitted successfully'
    });
    
  } catch (error) {
    console.error('Tax registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Form validation logic
function validateFormData(data) {
  const errors = {};
  const requiredFields = [
    'name', 'fatherName', 'address', 'mobileNumber'
  ];
  
  requiredFields.forEach(field => {
    if (!data[field] || !data[field].toString().trim()) {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });
  
  if (data.mobileNumber && data.mobileNumber.replace(/\D/g, '').length !== 10) {
    errors.mobileNumber = 'Mobile number must be 10 digits';
  }
  
  return errors;
}

// Database save function (to be implemented)
async function saveTaxRegistration(data) {
  // Implementation would go here
  return Date.now(); // Return mock ID for now
}

module.exports = router;
