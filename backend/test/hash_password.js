const bcrypt = require('bcrypt');

// Ganti password di sini
const password = 'Seg@wonLim0';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL Command:');
  console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'segawon';`);
});