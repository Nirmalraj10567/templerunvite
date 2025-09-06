import jwt from 'jsonwebtoken';
import fs from 'fs';

const token = jwt.sign(
  {
    id: 1,
    role: 'admin',
    templeId: 1
  },
  'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '1h' }
);

fs.writeFileSync('test-token.txt', token);
console.log('Test token generated and saved to test-token.txt');
