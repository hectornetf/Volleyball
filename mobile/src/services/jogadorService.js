import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, getDocs, where, writeBatch } from 'firebase/firestore';
import { encryptData, decryptData } from '../utils/crypto';

const JOGADORES_COLLECTION = 'jogadores';
const FINANCEIRO_OP_COLLECTION = 'operacoes_financeiras';

/**
 * Funções de Sanitização Criptográfica
 */
const encryptPlayer = (jogador, groupId) => ({
  ...jogador,
  nome: encryptData(jogador.nome, groupId),
  celular: encryptData(jogador.celular, groupId),
  dataNascimento: encryptData(jogador.dataNascimento, groupId)
});

const decryptPlayer = (docData, groupId) => ({
  id: docData.id,
  ...docData,
  nome: decryptData(docData.nome, groupId),
  celular: decryptData(docData.celular, groupId),
  dataNascimento: decryptData(docData.dataNascimento, groupId)
});

// Funções de Escrita com Criptografia
export const addJogador = async (jogador, groupId) => {
  if (!groupId) throw new Error("ID do Grupo obrigatório!");
  const encrypted = encryptPlayer(jogador, groupId);
  return await addDoc(collection(db, JOGADORES_COLLECTION), {
    ...encrypted,
    groupId,
    historicoPresencas: jogador.historicoPresencas || 0,
    mensalidadePaga: jogador.mensalidadePaga || false,
    diariaPaga: jogador.diariaPaga || false,
    presencaAtual: jogador.presencaAtual || 'Falto'
  });
};

export const updateJogador = async (id, dados, groupId) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  // Se o dado tiver campos sensíveis, encripta eles antes do update
  const encrypted = { ...dados };
  if (dados.nome) encrypted.nome = encryptData(dados.nome, groupId);
  if (dados.celular) encrypted.celular = encryptData(dados.celular, groupId);
  
  return await updateDoc(docRef, encrypted);
};

// Funções de Leitura com Descriptografia
export const subscribeJogadores = (groupId, callback, errorCallback) => {
  if (!groupId) return () => {};
  const q = query(
    collection(db, JOGADORES_COLLECTION), 
    where('groupId', '==', groupId)
  );
  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs
      .map(doc => decryptPlayer({ id: doc.id, ...doc.data() }, groupId))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    callback(lista);
  }, errorCallback);
};

export const registrarOperacaoFinanceira = async (tipo, valor, descricao, groupId) => {
  if (!groupId) throw new Error("ID do Grupo obrigatório!");
  return await addDoc(collection(db, FINANCEIRO_OP_COLLECTION), {
    tipo,
    groupId,
    valor: tipo === 'SAIDA_DESPESA' ? -Math.abs(valor) : Math.abs(valor),
    descricao: encryptData(descricao, groupId), // Criptografa descrição por segurança
    data: new Date().toISOString()
  });
};

export const getSaldoGlobalEquipamentos = async (groupId) => {
  if (!groupId) return 0;
  try {
    const q = query(
        collection(db, FINANCEIRO_OP_COLLECTION),
        where('groupId', '==', groupId)
    );
    const snapshot = await getDocs(q);
    let saldo = 0;
    snapshot.forEach(doc => {
      saldo += doc.data().valor || 0;
    });
    return saldo;
  } catch (e) {
    return 0;
  }
};

export const resetDadosGrupo = async (groupId) => {
  if (!groupId) return;
  try {
    const batch = writeBatch(db);
    const qJ = query(collection(db, JOGADORES_COLLECTION), where('groupId', '==', groupId));
    const snapJ = await getDocs(qJ);
    snapJ.forEach(d => batch.delete(d.ref));
    const qF = query(collection(db, FINANCEIRO_OP_COLLECTION), where('groupId', '==', groupId));
    const snapF = await getDocs(qF);
    snapF.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (_e) {
    // Erro ignorado intencionalmente no reset
  }
};
