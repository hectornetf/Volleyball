import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { registrarLog } from './historyService';

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

// Um vôlei "existe" quando possui QUALQUER documento de dados com este groupId.
// Como todo documento exige groupId (firestore.rules), é a checagem canônica de
// existência — "Criar Novo Vôlei" deixa um log de criação permanente.
const COLECOES_DADOS = ['jogadores', 'logs_atividades', 'config_financeira', 'operacoes_financeiras', 'sorteios_times'];

export const existeGrupo = async (code) => {
  if (!code) return false;
  try {
    for (const col of COLECOES_DADOS) {
      const snap = await getDocs(query(collection(db, col), where('groupId', '==', code), limit(1)));
      if (snap.size > 0) return true;
    }
    return false;
  } catch (e) {
    // Falha de rede/leitura: fail-open para nunca bloquear um grupo real.
    console.error('Erro ao verificar se o grupo existe: ', e);
    return true;
  }
};

export const registrarGrupo = async (code) => {
  if (!code) return;
  await registrarLog('SISTEMA', `Vôlei criado. Código: ${code}`, 0, code);
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