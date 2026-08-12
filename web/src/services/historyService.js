import { db } from '../config/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

const LOGS_COLLECTION = 'logs_atividades';

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
