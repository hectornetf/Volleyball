import { db } from '../config/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, getDocs, doc, writeBatch } from 'firebase/firestore';

const LOGS_COLLECTION = 'logs_atividades';

/**
 * Deleta logs de atividades mais antigos que `meses` meses (padrão 3).
 * Deixa intactos os logs do mês atual e dos `meses - 1` anteriores.
 */
export const limparLogsAntigos = async (groupId, meses = 3) => {
  if (!groupId) return 0;
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - (meses - 1), 1);
  const corteMes = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;
  let total = 0;
  for (let i = meses - 1; i < 60; i += 1) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (mes >= corteMes) continue;
    const lote = writeBatch(db);
    const docs = (await getDocs(query(collection(db, LOGS_COLLECTION), where('groupId', '==', groupId), where('mes', '==', mes)))).docs;
    docs.forEach((docSnap) => lote.delete(doc(db, LOGS_COLLECTION, docSnap.id)));
    if (docs.length) await lote.commit();
    total += docs.length;
  }
  return total;
};

/**
 * Registra um evento no log de atividades (Firestore)
 */
export const registrarLog = async (categoria, descricao, valor = 0, groupId, status = 'Sucesso') => {
  if (!groupId) return;
  try {
    await addDoc(collection(db, LOGS_COLLECTION), {
      categoria,
      descricao,
      valor: parseFloat(valor) || 0,
      status,
      groupId,
      createdAt: serverTimestamp(),
      dataHora: new Date().toISOString()
    });
  } catch (e) {
    console.error("Erro ao registrar log: ", e);
  }
};

/**
 * Subscreve aos logs de atividade do grupo em tempo real
 */
export const subscribeLogs = (groupId, callback, errorCallback) => {
  if (!groupId) return () => {};
  
  const q = query(
    collection(db, LOGS_COLLECTION),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tipo: data.createdAt ? 
          new Date(data.createdAt.seconds * 1000).toLocaleString('pt-BR') : 
          (data.dataHora ? new Date(data.dataHora).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'))
      };
    });
    callback(logs);
  }, errorCallback);
};
