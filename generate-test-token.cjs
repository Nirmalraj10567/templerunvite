const jwt = require('jsonwebtoken');
const fs = require('fs');

const token = jwt.sign(
  {
    id: 1,
    role: 'admin',
    templeId: 1
  },
  'HHHHHHHHH',
  { expiresIn: '1h' }
);

fs.writeFileSync('test-token.txt', token);
console.log('Test token generated and saved to test-token.txt');
