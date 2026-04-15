const mysql = require('mysql2');
const passwords = ['', 'root', 'mysql', 'admin', 'password', 'rootroot', 'rootrootrootroot', 'toor', 'admin123', 'test'];
let idx = 0;

function tryNext() {
  if (idx >= passwords.length) {
    console.log('All passwords failed');
    process.exit(1);
    return;
  }
  const pwd = passwords[idx++];
  const c = mysql.createConnection({ host: '127.0.0.1', user: 'root', password: pwd, connectTimeout: 3000 });
  c.connect(function(err) {
    if (err) {
      console.log(`FAIL "${pwd}": ${err.code}`);
      c.destroy();
      tryNext();
    } else {
      console.log(`SUCCESS! Password is: "${pwd}"`);
      c.end();
      process.exit(0);
    }
  });
}

tryNext();
