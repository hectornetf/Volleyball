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

// Gerador Simples de Código de 6 dígitos (VO-XXXX)
export const generateGroupCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem O e 0 para evitar confusão
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VO-${code}`;
};
