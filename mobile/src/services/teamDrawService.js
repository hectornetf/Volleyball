import { addDoc, collection, getDoc, getDocs, onSnapshot, query, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { registrarLog } from './historyService';

const COLLECTION = 'sorteios_times';
const normalizar = (dados) => dados.docs.map((item) => ({ id: item.id, ...item.data() }));

export const carregarHistoricoTimes = async (groupId) => {
  if (!groupId) return [];
  const dados = await getDocs(query(collection(db, COLLECTION), where('groupId', '==', groupId)));
  return normalizar(dados).filter((item) => item.concluido).sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 100);
};

export const subscribeSorteioAberto = (groupId, dia, callback) => {
  if (!groupId) return () => {};
  return onSnapshot(query(collection(db, COLLECTION), where('groupId', '==', groupId)), (dados) => {
    const abertos = normalizar(dados).filter((item) => item.dia === dia && !item.concluido);
    callback(abertos.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))[0] || null);
  });
};

export const salvarSorteio = async ({ groupId, dia, times, reservas, diagnostico }) => {
  const agora = new Date();
  const docRef = await addDoc(collection(db, COLLECTION), {
    groupId, dia, data: agora.toISOString().slice(0, 10), criadoEm: agora.toISOString(), concluido: false, diagnostico,
    times: times.map((time, indice) => ({ nome: `Time ${indice + 1}`, jogadores: time.map((j) => ({ id: j.id, nivelNoSorteio: Number(j.nivel) || 3 })), vitorias: 0 })),
    reservas: reservas.map((j) => j.id)
  });
  await registrarLog('SORTEIO', `Sorteio de ${dia} criado com ${times.length} times completos.`, 0, groupId);
  return docRef.id;
};

export const concluirSorteio = async (id, vitorias, groupId) => {
  const valores = vitorias.map((valor) => Math.max(0, parseInt(valor, 10) || 0));
  const referencia = doc(db, COLLECTION, id);
  const atual = await getDoc(referencia);
  if (!atual.exists()) throw new Error('Sorteio não encontrado');
  const times = (atual.data().times || []).map((time, indice) => ({ ...time, vitorias: valores[indice] || 0 }));
  await updateDoc(referencia, { times, concluido: true, concluidoEm: new Date().toISOString() });
  await registrarLog('PARTIDAS', `Resultados do sorteio registrados: ${valores.join(' x ')} vitórias por time.`, 0, groupId);
};

export const trocarJogadoresDoSorteio = async (id, origem, destino, groupId) => {
  const referencia = doc(db, COLLECTION, id);
  const atual = await getDoc(referencia);
  if (!atual.exists() || atual.data().concluido) throw new Error('Rodada não disponível para edição');
  const dados = atual.data();
  const times = [...(dados.times || [])];
  const reservas = [...(dados.reservas || [])];
  const pegar = (local) => local.tipo === 'reserva'
    ? (typeof reservas[local.indice] === 'string' ? { id: reservas[local.indice] } : reservas[local.indice])
    : (() => {
      const jogador = times[local.indice].jogadores[local.posicao];
      return typeof jogador === 'string' ? { id: jogador } : jogador;
    })();
  const colocar = (local, valor) => {
    // Reservas são persistidas apenas pelo ID; isso evita objetos duplicados no array.
    if (local.tipo === 'reserva') reservas[local.indice] = valor.id;
    else times[local.indice] = { ...times[local.indice], jogadores: times[local.indice].jogadores.map((j, i) => i === local.posicao ? valor : j) };
  };
  const jogadorOrigem = pegar(origem);
  const jogadorDestino = pegar(destino);
  if (!jogadorOrigem || !jogadorDestino) throw new Error('Jogador não encontrado');
  colocar(origem, jogadorDestino);
  colocar(destino, jogadorOrigem);
  await updateDoc(referencia, { times, reservas, editadoEm: new Date().toISOString() });
  await registrarLog('SORTEIO', 'Escalação ajustada manualmente.', 0, groupId);
};
