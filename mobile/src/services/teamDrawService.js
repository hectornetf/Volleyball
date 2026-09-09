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

export const concluirSorteio = async (id, confrontos, groupId) => {
  const referencia = doc(db, COLLECTION, id);
  const atual = await getDoc(referencia);
  if (!atual.exists()) throw new Error('Sorteio não encontrado');
  const dados = atual.data();
  const timesBase = dados.times || [];

  // Formato novo: array de confrontos { a, b, vitoriasA, vitoriasB } (todos contra todos).
  // Formato antigo: array de vitórias por time (retrocompatibilidade).
  const recebidos = Array.isArray(confrontos) ? confrontos : [];
  const ehConfronto = recebidos.length > 0 && recebidos[0] && typeof recebidos[0] === 'object' && 'a' in recebidos[0];
  const listaConfrontos = ehConfronto
    ? recebidos.map((c) => ({
        a: Math.max(0, parseInt(c.a, 10) || 0),
        b: Math.max(0, parseInt(c.b, 10) || 0),
        vitoriasA: Math.max(0, parseInt(c.vitoriasA, 10) || 0),
        vitoriasB: Math.max(0, parseInt(c.vitoriasB, 10) || 0),
      }))
    : (timesBase.length === 2
      ? [{
        a: 0, b: 1,
        vitoriasA: Math.max(0, parseInt(recebidos[0], 10) || 0),
        vitoriasB: Math.max(0, parseInt(recebidos[1], 10) || 0),
      }]
      : null);

  const valoresLegados = recebidos.map((valor) => Math.max(0, parseInt(valor, 10) || 0));
  const times = timesBase.map((time, indice) => ({
    ...time,
    vitorias: listaConfrontos
      ? listaConfrontos.filter((c) => c.a === indice || c.b === indice)
        .reduce((soma, c) => soma + (c.a === indice ? c.vitoriasA : c.vitoriasB), 0)
      : valoresLegados[indice] || 0,
  }));

  const atualizacao = { times, concluido: true, concluidoEm: new Date().toISOString() };
  if (listaConfrontos) atualizacao.confrontos = listaConfrontos;
  await updateDoc(referencia, atualizacao);

  const resumo = listaConfrontos
    ? `Time ${listaConfrontos[0].a + 1} ${listaConfrontos[0].vitoriasA} x ${listaConfrontos[0].vitoriasB} Time ${listaConfrontos[0].b + 1}${listaConfrontos.length > 1 ? ` (+${listaConfrontos.length - 1} confrontos)` : ''}`
    : `${valoresLegados.join(' x ')} vitórias por time`;
  await registrarLog('PARTIDAS', `Resultados registrados por confronto: ${resumo}.`, 0, groupId);
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
