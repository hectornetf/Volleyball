import CryptoJS from 'crypto-js';

// Chave base interna carregada do .env (Segurança Pro)
const SECRET_KEY_BASE = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;

/**
 * Encripta um texto
 */
export const encryptData = (text, groupId) => {
  if (!text || !groupId) return text;
  try {
    const secret = SECRET_KEY_BASE + groupId;
    // Forçamos o uso do modo ECB ou similar que não exija IV aleatório se o motor estiver falhando
    // Mas o ideal é que o polyfill resolva.
    const encrypted = CryptoJS.AES.encrypt(text.toString(), secret);
    return encrypted.toString();
  } catch (_e) {
    return text;
  }
};

/**
 * Decripta um hash AES
 */
export const decryptData = (ciphertext, groupId) => {
  if (!ciphertext || !groupId) return ciphertext;
  // Se o dado não parecer um hash (não tiver espaços e for curto), retorna original
  if (ciphertext.length < 10 && !ciphertext.includes(' ')) return ciphertext;

  try {
    const secret = SECRET_KEY_BASE + groupId;
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // Se a descriptografia resultar em vazio, talvez o dado estivesse em texto puro
    return originalText || ciphertext;
  } catch (_e) {
    return ciphertext;
  }
};
