const crypto = require('crypto');

const ALGORITHM  = 'aes-256-cbc';
const KEY        = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8'); // 32 chars
const IV_LENGTH  = 16;

// Encrypt a string → returns "iv_hex:encrypted_hex"
exports.encrypt = (text) => {
  const iv      = crypto.randomBytes(IV_LENGTH);
  const cipher  = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted    += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt "iv_hex:encrypted_hex" → original string
exports.decrypt = (text) => {
  const [ivHex, encrypted] = text.split(':');
  const iv       = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted  = decipher.update(encrypted, 'hex', 'utf8');
  decrypted     += decipher.final('utf8');
  return decrypted;
};