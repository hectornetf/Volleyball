import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUP_ID_KEY = '@voleizin_group_id';

export const saveGroupId = async (id) => {
  try {
    await AsyncStorage.setItem(GROUP_ID_KEY, id);
  } catch {
    // Erro silenciado
  }
};

export const getSavedGroupId = async () => {
  try {
    return await AsyncStorage.getItem(GROUP_ID_KEY);
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(GROUP_ID_KEY);
  } catch {
    // Erro silenciado
  }
};

// Gerador de código de 6 caracteres (VO-XXXXXX) — alfabeto de 32 chars (32^6 ≈ 1 bilhão de combinações)
export const generateGroupCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem O e 0 para evitar confusão
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VO-${code}`;
};
