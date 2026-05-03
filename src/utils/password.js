const bcrypt = require('bcryptjs');

const saltRounds = 10;

function hashPassword(password) {
  return bcrypt.hash(password, saltRounds);
}

function hashPasswordSync(password) {
  return bcrypt.hashSync(password, saltRounds);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  hashPasswordSync,
  verifyPassword
};
