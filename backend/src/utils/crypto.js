'use strict';
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// Deriving a secure 32-byte key from the environment variable or fallback
const encryptionKeyRaw = process.env.DB_ENCRYPTION_KEY;
if (!encryptionKeyRaw) {
  console.warn('⚠️ WARNING: DB_ENCRYPTION_KEY environment variable is not defined. Using insecure fallback key.');
}
const ENCRYPTION_KEY = crypto.createHash('sha256').update(encryptionKeyRaw || 'default_32_bytes_fallback_key_123456').digest();

/**
 * Encrypts raw text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string prefixed with 'enc:'
 */
function encryptField(text) {
  if (text === null || text === undefined) return text;
  if (typeof text !== 'string') text = String(text);
  
  // If already encrypted, return as-is
  if (text.startsWith('enc:')) return text;

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Decrypts text encrypted with encryptField
 * @param {string} text - Encrypted text
 * @returns {string} - Decrypted plain text or original input if not encrypted
 */
function decryptField(text) {
  if (!text || typeof text !== 'string') return text;
  if (!text.startsWith('enc:')) {
    return text; // Return as-is if it's plaintext
  }

  try {
    const match = text.match(/^enc:([a-f0-9]+):([a-f0-9]+):([a-f0-9]+)(\s*[\s\S]*)?$/i);
    if (match) {
      const iv = Buffer.from(match[1], 'hex');
      const authTag = Buffer.from(match[2], 'hex');
      const encryptedText = Buffer.from(match[3], 'hex');
      const trailingText = match[4] || '';

      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted + trailingText;
    }

    const parts = text.substring(4).split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    const stripped = text.replace(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+\s*/i, '').trim();
    if (stripped) return stripped;
    return text;
  }
}

module.exports = {
  encryptField,
  decryptField
};
