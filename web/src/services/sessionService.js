const GROUP_ID_KEY = '@voleizin_group_id';

export const saveGroupId = async (id) => {
  try {
    localStorage.setItem(GROUP_ID_KEY, id);
  } catch (e) {
    console.error("Erro ao salvar ID no localStorage: ", e);
  }
};

export const getSavedGroupId = async () => {
  try {
    return localStorage.getItem(GROUP_ID_KEY);
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  try {
    localStorage.removeItem(GROUP_ID_KEY);
  } catch (e) {
    console.error("Erro ao remover sessão do localStorage: ", e);
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
