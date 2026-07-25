const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbStorePath = path.join(__dirname, 'db_store.json');
const store = JSON.parse(fs.readFileSync(dbStorePath, 'utf8'));

const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync('password123', salt);

store.users.forEach(u => {
  u.password_hash = passwordHash;
});

fs.writeFileSync(dbStorePath, JSON.stringify(store, null, 2), 'utf8');
console.log('All user passwords successfully reset. New hash:', passwordHash);
console.log('Verification check:', bcrypt.compareSync('password123', passwordHash));
