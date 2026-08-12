import CryptoJS from 'crypto-js';

const SECRET_KEY_BASE = import.meta.env.VITE_ENCRYPTION_KEY || 'voleizin-saas-2026-secure-v1';

/**
 * Encripta um texto utilizando AES-256 com secret + groupId
 */
export const encryptData = (text, groupId) => {
  if (!text || !groupId) return text;
  try {
    const secret = SECRET_KEY_BASE + groupId;
    const encrypted = CryptoJS.AES.encrypt(text.toString(), secret);
    return encrypted.toString();
  } catch {
    return text;
  }
};

/**
 * Decripta um hash AES-256 gerado no mobile ou web
 */
export const decryptData = (ciphertext, groupId) => {
  if (!ciphertext || !groupId) return ciphertext;
  if (ciphertext.length < 10 && !ciphertext.includes(' ')) return ciphertext;

  try {
    const secret = SECRET_KEY_BASE + groupId;
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext;
  } catch {
    return ciphertext;
  }
};
