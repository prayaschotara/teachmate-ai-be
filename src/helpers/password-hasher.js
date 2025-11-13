const bcrypt = require("bcrypt");
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(16);
  const hashed = await bcrypt.hashSync(password, salt);
  return hashed;
}

module.exports = hashPassword;
