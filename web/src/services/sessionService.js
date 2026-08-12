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

// Gerador Simples de Código de 4 caracteres aleatórios (VO-XXXX)
export const generateGroupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem O e 0 para evitar confusão
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VO-${code}`;
};
