// Test script to verify tax registration fixes
import axios from 'axios';

const testTaxRegistration = async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjAsIm1vYmlsZSI6Ijk5OTk5OTk5OTkiLCJ1c2VybmFtZSI6InJhamEiLCJ0ZW1wbGVJZCI6MTIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1OTcxNTU1MCwiZXhwIjoxNzkxMjUxNTUwfQ.Ghi-jO2xkAAtCeUXfqYc7pM63OjbxYT0L8TpNeB2BMk';
    
    const formData = new FormData();
    formData.append('referenceNumber', '2025-0002');
    formData.append('date', '2025-10-06');
    formData.append('name', 'Test User');
    formData.append('alternativeName', '');
    formData.append('wifeName', '');
    formData.append('education', 'pg');
    formData.append('occupation', 'farmer');
    formData.append('fatherName', 'Test Father');
    formData.append('address', 'Test Address');
    formData.append('birthDate', '');
    formData.append('village', '');
    formData.append('mobileNumber', '9999999999');
    formData.append('aadhaarNumber', '123456789012');
    formData.append('panNumber', '');
    formData.append('clan', 'group');
    formData.append('group', 'new group');
    formData.append('postalCode', '637303');
    formData.append('maleHeirs', '0');
    formData.append('femaleHeirs', '0');
    formData.append('year', '2025');
    formData.append('taxAmount', '5000');
    formData.append('amountPaid', '5000');
    formData.append('outstandingAmount', '0');
    formData.append('fromAccount', 'TAX A/C');
    formData.append('transferTo', 'INCOME A/C');
    formData.append('templeId', '12');

    const response = await axios.post('http://localhost:4000/api/tax-registrations', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Tax registration successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Tax registration failed:', error.response?.data || error.message);
    return false;
  }
};

// Run the test
testTaxRegistration().then(success => {
  if (success) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('💥 Tests failed!');
  }
});
