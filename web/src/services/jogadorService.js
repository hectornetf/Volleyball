import { db } from '../config/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, 
  getDocs, where, writeBatch, setDoc, increment 
} from 'firebase/firestore';
import { encryptData, decryptData } from '../utils/crypto';
import { registrarLog } from './historyService';
import { equilibraTimes } from '../utils/estatisticasUtils';

const JOGADORES_COLLECTION = 'jogadores';
const FINANCEIRO_OP_COLLECTION = 'operacoes_financeiras';
const CONFIG_FINANCEIRA_COLLECTION = 'config_financeira';
const LOGS_COLLECTION = 'logs_atividades';
const SORTEIOS_COLLECTION = 'sorteios_times';

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
  dataNascimento: decryptData(docData.dataNascimento, groupId),
  historicoPresencas: parseInt(docData.historicoPresencas) || 0,
  status: docData.status || 'Ativo'
});

export const addJogador = async (jogador, groupId) => {
  if (!groupId) throw new Error("ID do Grupo obrigatório!");
  const encrypted = encryptPlayer(jogador, groupId);
  
  const docRef = await addDoc(collection(db, JOGADORES_COLLECTION), {
    ...encrypted,
    groupId,
    historicoPresencas: jogador.historicoPresencas || 0,
    mensalidadePaga: jogador.mensalidadePaga || false,
    diariaPaga: jogador.diariaPaga || false,
    presencaAtual: jogador.presencaAtual || 'Falta',
    presencas: jogador.presencas || {},
    status: jogador.status || 'Ativo'
  });
  
  await registrarLog('CADASTRO', `Novo jogador adicionado: ${jogador.nome}`, 0, groupId);
  return docRef;
};

export const updateJogador = async (id, dados, groupId) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  const encrypted = { ...dados };
  if (dados.nome) encrypted.nome = encryptData(dados.nome, groupId);
  if (dados.celular) encrypted.celular = encryptData(dados.celular, groupId);
  if (dados.dataNascimento !== undefined) {
    encrypted.dataNascimento = encryptData(dados.dataNascimento, groupId);
  }

  await updateDoc(docRef, encrypted);

  if (dados.status) {
    await registrarLog('SISTEMA', `Status do jogador alterado para ${dados.status}: ${dados.nome || id}`, 0, groupId);
  } else if (dados.nome || dados.nivel) {
    await registrarLog('SISTEMA', `Cadastro do jogador atualizado: ${dados.nome || id}`, 0, groupId);
  }

  return;
};

export const deleteJogador = async (id, nome, groupId) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  await deleteDoc(docRef);
  await registrarLog('CADASTRO', `Jogador excluído: ${nome || id}`, 0, groupId);
};

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

export const registrarOperacaoFinanceira = async (tipo, valor, descricao, groupId, jogadorId = null) => {
  if (!groupId) throw new Error("ID do Grupo obrigatório!");
  
  const docRef = await addDoc(collection(db, FINANCEIRO_OP_COLLECTION), {
    tipo,
    groupId,
    valor: tipo === 'SAIDA_DESPESA' ? -Math.abs(valor) : Math.abs(valor),
    descricao: encryptData(descricao, groupId),
    data: new Date().toISOString(),
    ...(jogadorId ? { jogadorId } : {})
  });

  await registrarLog('FINANCEIRO', descricao, valor, groupId);
  return docRef;
};

export const getPagamentosAvulsosDoMes = async (groupId, referencia = new Date()) => {
  if (!groupId) return [];
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1).toISOString();
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1).toISOString();
  const dados = await getDocs(query(collection(db, FINANCEIRO_OP_COLLECTION), where('groupId', '==', groupId)));
  return dados.docs.map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.tipo === 'ENTRADA_AVULSO' && item.data >= inicio && item.data < fim)
    .map((item) => ({ ...item, nomeLegado: String(decryptData(item.descricao, groupId) || '').replace(/^Pago:\s*/i, '') }))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
};

export const registrarSaidaCaixa = async (valor, descricao, groupId) => {
  return await registrarOperacaoFinanceira('SAIDA_DESPESA', valor, descricao, groupId);
};

export const registrarEntradaCaixa = async (valor, descricao, groupId) => {
  return await registrarOperacaoFinanceira('ENTRADA_MANUAL', valor, descricao, groupId);
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
  } catch {
    return 0;
  }
};

/**
 * Helper: comita itens em lotes de até 400 escritas (limite de 500 do Firestore).
 */
const commitEmLotes = async (itens, montador, tamanhoLote = 400) => {
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = writeBatch(db);
    itens.slice(i, i + tamanhoLote).forEach((item) => montador(lote, item));
    await lote.commit();
  }
};

export const resetDadosGrupo = async (groupId) => {
  if (!groupId) return;
  try {
    // Deleta em lotes todos os documentos de todas as coleções vinculadas ao grupo.
    const queries = [
      query(collection(db, JOGADORES_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, FINANCEIRO_OP_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, CONFIG_FINANCEIRA_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, LOGS_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, SORTEIOS_COLLECTION), where('groupId', '==', groupId))
    ];

    for (const q of queries) {
      const snap = await getDocs(q);
      await commitEmLotes(snap.docs.map((d) => d.ref), (lote, ref) => lote.delete(ref));
    }

    // Garante exclusão dos registros legado (sem campo groupId) e dos meses gerados.
    const refsLegado = [doc(db, CONFIG_FINANCEIRA_COLLECTION, groupId)];
    [-2, -1, 0, 1, 2].forEach((offset) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset);
      const mes = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
      refsLegado.push(doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mes}`));
    });
    await commitEmLotes(refsLegado, (lote, ref) => lote.delete(ref));
  } catch (e) {
    console.error("Erro no reset: ", e);
    throw e;
  }
};

export const incrementarPresencaHistorica = async (id, valor) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  return await updateDoc(docRef, { 
    historicoPresencas: increment(valor) 
  });
};

export const saveConfigFinanceira = async (groupId, mes, config) => {
  const docRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mes}`);
  return await setDoc(docRef, { ...config, groupId, updatedAt: new Date() }, { merge: true });
};

export const getConfigFinanceira = async (groupId, mes) => {
  const snapshot = await getDoc(doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mes}`));
  
  if (snapshot.exists()) {
    return snapshot.data();
  }
  
  return {
    Segunda: 0, Terça: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0, Domingo: 0, Avulso: 10
  };
};

// PRNG determinístico (mulberry32) para uma amostra reproduzível.
const criarRandom = (semente) => {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Data (sempre no passado) de um dia da semana há "semanasAtras".
const dataDoDiaDaSemana = (nomeDia, semanasAtras) => {
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const hoje = new Date();
  const alvo = nomes.indexOf(nomeDia);
  const diasAtras = (hoje.getDay() - alvo + 7) % 7 || 7;
  const data = new Date(hoje);
  data.setDate(hoje.getDate() - diasAtras - semanasAtras * 7);
  data.setHours(12, 0, 0, 0);
  return data;
};

// Poder de um time a partir dos níveis registrados no sorteio.
const poderDoTime = (time) => time.jogadores.reduce((soma, jogador) => soma + (Number(jogador.nivelNoSorteio) || 3), 0);

export const gerarDadosDeTestePro = async (groupId) => {
  if (!groupId) throw new Error('ID do Grupo obrigatório!');

  // Não duplica amostras: se o grupo já possui elenco, é preciso resetar antes.
  const existentes = await getDocs(query(collection(db, JOGADORES_COLLECTION), where('groupId', '==', groupId)));
  if (!existentes.empty) {
    throw new Error('Este grupo já possui dados. Use "Resetar" antes de gerar uma nova amostra.');
  }

  const diasTreino = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const nomeDiaHoje = diasTreino[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]];

  const refDate = new Date();
  const mesAtualNome = refDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
  const mesAtual = String(refDate.getMonth() + 1).padStart(2, '0');
  const diaAtual = String(refDate.getDate()).padStart(2, '0');
  const mesReferenciaYYYYMM = `${refDate.getFullYear()}-${mesAtual}`;
  const valorDiariaAvulso = 20;
  const rng = criarRandom(20250909);

  // ---- 1. Elenco base (14 mensalistas + 2 avulsos; 1 inativo) ----
  const nomesMensalistas = [
    'Hector Neto', 'Lucas Silva', 'Mariana Costa', 'João Pedro',
    'Bruna Oliveira', 'Ricardo Santos', 'Aline Ferreira', 'Gabriel Sousa',
    'Zeca Alves', 'Maya Ribeiro', 'Kadu Martins', 'Tati Lima', 'Felipe Dias', 'Larissa Motta'
  ];
  const arrDiasVariados = [
    ['Segunda', 'Quarta'], ['Terça', 'Quinta'], ['Sexta', 'Sábado', 'Domingo'],
    ['Segunda', 'Sexta'], ['Quarta', 'Domingo'], ['Terça', 'Sábado'], ['Segunda', 'Quarta', 'Sexta'],
    ['Quinta', 'Sábado'], ['Terça', 'Quinta', 'Sábado'], ['Segunda', 'Domingo']
  ];
  const arranjosAvulsos = [
    { nome: 'Convidado Alpha', nivel: 4, presente: true },
    { nome: 'Convidado Beta', nivel: 2, presente: false }
  ];

  const dataNascimentoDe = (i) => {
    if (i === 0) return `15/${mesAtual}/1989`; // aniversariante do mês
    if (i === 1) return `${diaAtual}/${mesAtual}/1992`; // aniversariante de hoje
    if (i % 5 === 0) return `${String(2 + i)}/${mesAtual}/199${i % 10}`; // mais aniversariantes do mês
    const dia = String(1 + ((i * 7) % 27)).padStart(2, '0');
    const mes = String(1 + ((i * 3) % 12)).padStart(2, '0');
    return `${dia}/${mes}/199${i % 10}`;
  };

  const elenco = [];
  nomesMensalistas.forEach((nome, i) => {
    elenco.push({
      id: `mock_j${i}`,
      nome,
      nivel: (i % 5) + 1,
      tipo: 'MENSALISTA',
      diasMensalista: arrDiasVariados[i % arrDiasVariados.length],
      status: i === 13 ? 'Inativo' : 'Ativo',
      celular: `(11) 98765-${String(1000 + i).slice(-4)}`,
      dataNascimento: dataNascimentoDe(i),
    });
  });
  arranjosAvulsos.forEach((a, i) => {
    elenco.push({
      id: `mock_a${i}`,
      nome: a.nome,
      nivel: a.nivel,
      tipo: 'AVULSO',
      diasMensalista: [],
      status: 'Ativo',
      celular: `(11) 90000-000${i}`,
      dataNascimento: `01/01/2000`,
      presente: a.presente,
    });
  });

  // ---- 2. Rodadas concluídas (12 rodadas / 2 por semana, 6 semanas) ----
  const participacoes = {};
  elenco.forEach((p) => { participacoes[p.id] = 0; });
  const ativos = elenco.filter((p) => p.status === 'Ativo');
  const incluir = (alvo, candidato, limite) => {
    if (alvo.length >= limite) return;
    if (!alvo.some((x) => x.id === candidato.id)) alvo.push(candidato);
  };

  const sequenciaDias = ['Quinta', 'Segunda', 'Quarta', 'Sábado', 'Terça', 'Sexta'];
  const rodadas = [];

  for (let r = 0; r < 12; r += 1) {
    const dia = sequenciaDias[r % sequenciaDias.length];
    const semanasAtras = Math.floor(r / 2);
    const tresTimes = r % 3 === 0; // rodadas a cada 3 rodadas acontecem entre 3 times

    // Participantes: mensalistas do dia + mais assíduos até completar 12.
    const participantes = [];
    ativos
      .filter((p) => p.tipo === 'MENSALISTA' && (p.diasMensalista || []).includes(dia))
      .forEach((p) => incluir(participantes, p, 10));
    ativos
      .filter((p) => !participantes.some((x) => x.id === p.id))
      .sort((a, b) => participacoes[b.id] - participacoes[a.id] || b.nivel - a.nivel)
      .forEach((p) => incluir(participantes, p, 12));
    ativos
      .filter((p) => p.tipo === 'AVULSO' && p.presente && !participantes.some((x) => x.id === p.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((p) => incluir(participantes, p, 13));

    // Distribuição em cobra: equilibra a força por nível técnico.
    const ordenados = [...participantes].sort((a, b) => b.nivel - a.nivel);
    const nTimes = tresTimes ? 3 : 2;
    const equipes = Array.from({ length: nTimes }, () => []);
    const tamBloco = nTimes * 2;
    ordenados.forEach((p, idx) => {
      const pos = idx % tamBloco;
      equipes[pos < nTimes ? pos : tamBloco - 1 - pos].push(p);
    });

    const times = equipes.map((equipe, t) => ({
      nome: `Time ${t + 1}`,
      jogadores: equipe.map((p) => ({ id: p.id, nivelNoSorteio: p.nivel })),
      vitorias: 0,
    }));

    // Placar por confronto (todos contra todos), com chance proporcional à força.
    const confrontos = [];
    for (let a = 0; a < nTimes; a += 1) {
      for (let b = a + 1; b < nTimes; b += 1) {
        const pA = poderDoTime(times[a]);
        const pB = poderDoTime(times[b]);
        const prob = pA / (pA + pB);
        const sorteioSet = rng();
        const empate = sorteioSet > 0.72 && sorteioSet < 0.86;
        let vitoriasA;
        let vitoriasB;
        if (empate) { vitoriasA = 1; vitoriasB = 1; }
        else if (sorteioSet < prob) { vitoriasA = 2; vitoriasB = rng() < 0.35 ? 0 : 1; }
        else { vitoriasA = rng() < 0.35 ? 0 : 1; vitoriasB = 2; }
        confrontos.push({ a, b, vitoriasA, vitoriasB });
        times[a].vitorias += vitoriasA;
        times[b].vitorias += vitoriasB;
      }
    }

    const dataRodada = dataDoDiaDaSemana(dia, semanasAtras);
    rodadas.push({
      groupId,
      dia,
      data: dataRodada.toISOString().slice(0, 10),
      criadoEm: dataRodada.toISOString(),
      concluido: true,
      concluidoEm: dataRodada.toISOString(),
      times,
      reservas: [],
      confrontos,
      diagnostico: {
        poderes: times.map((time) => poderDoTime(time)),
        jogadoresComHistorico: participantes.length,
        repeticaoTotal: 0,
        variedadeAplicada: 0,
      },
      origem: 'dados_teste',
    });

    participantes.forEach((p) => { participacoes[p.id] += 1; });
  }

  // ---- 3. Rodada aberta de hoje (sorteio real do sistema, com equilíbrio) ----
  const participantesHoje = [];
  ativos
    .filter((p) => p.tipo === 'MENSALISTA' && (p.diasMensalista || []).includes(nomeDiaHoje))
    .forEach((p) => incluir(participantesHoje, p, 14));
  ativos
    .filter((p) => !participantesHoje.some((x) => x.id === p.id))
    .sort((a, b) => participacoes[b.id] - participacoes[a.id] || b.nivel - a.nivel)
    .forEach((p) => incluir(participantesHoje, p, 14));

  const draw = equilibraTimes(participantesHoje, rodadas, 6);
  const sorteioAberto = {
    groupId,
    dia: nomeDiaHoje,
    data: refDate.toISOString().slice(0, 10),
    criadoEm: refDate.toISOString(),
    concluido: false,
    times: draw.times.map((time, t) => ({
      nome: `Time ${t + 1}`,
      jogadores: time.map((j) => ({ id: j.id, nivelNoSorteio: Number(j.nivel) || 3 })),
      vitorias: 0,
    })),
    reservas: draw.reservas.map((j) => j.id),
    diagnostico: draw.diagnostico,
    origem: 'dados_teste',
  };

  // ---- 4. Presenças, pagamentos e persistência ----
  const jogadoresPersistencia = elenco.map((p) => {
    const presencas = {};
    diasTreino.forEach((dia) => {
      if (dia === nomeDiaHoje) {
        presencas[dia] = participantesHoje.some((x) => x.id === p.id) ? 'Confirmado' : 'Falta';
      } else {
        presencas[dia] = p.tipo === 'MENSALISTA' && (p.diasMensalista || []).includes(dia) ? 'Confirmado' : 'Falta';
      }
    });

    const pagamentosMensais = {};
    if (p.tipo === 'MENSALISTA' && p.status === 'Ativo') {
      (p.diasMensalista || []).forEach((dia) => {
        if (rng() < 0.68) pagamentosMensais[`${dia}_${mesAtualNome}`] = true;
      });
    }

    return {
      id: p.id,
      nome: encryptData(p.nome, groupId),
      celular: encryptData(p.celular, groupId),
      dataNascimento: encryptData(p.dataNascimento, groupId),
      nivel: p.nivel,
      tipo: p.tipo,
      diasMensalista: p.diasMensalista || [],
      groupId,
      historicoPresencas: participacoes[p.id] || 0,
      mensalidadePaga: false,
      diariaPaga: false,
      presencaAtual: p.status === 'Inativo' ? 'Falta' : 'Confirmado',
      presencas,
      pagamentosMensais,
      status: p.status,
    };
  });

  const operacoes = [
    {
      tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso,
      descricao: encryptData('Pago: Convidado Alpha', groupId), jogadorId: 'mock_a0',
      data: refDate.toISOString()
    },
    {
      tipo: 'SAIDA_DESPESA', valor: -25,
      descricao: encryptData('Equipamentos: bolas novas', groupId),
      data: new Date(refDate.getTime() - 2 * 86400000).toISOString()
    },
    {
      tipo: 'ENTRADA_MANUAL', valor: 40,
      descricao: encryptData('Arrecadação extra da galera', groupId),
      data: new Date(refDate.getTime() - 5 * 86400000).toISOString()
    },
    {
      tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso,
      descricao: encryptData('Pago: Convidado Alpha', groupId), jogadorId: 'mock_a0',
      data: new Date(refDate.getTime() - 40 * 86400000).toISOString()
    },
    {
      tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso,
      descricao: encryptData('Pago: Convidado Beta', groupId), jogadorId: 'mock_a1',
      data: new Date(refDate.getTime() - 33 * 86400000).toISOString()
    },
    {
      tipo: 'SAIDA_DESPESA', valor: -60,
      descricao: encryptData('Manutenção: rede nova', groupId),
      data: new Date(refDate.getTime() - 47 * 86400000).toISOString()
    }
  ].map((op) => ({ ...op, groupId }));

  const configFinanceira = {
    groupId, Segunda: 160, Terça: 120, Quarta: 200, Quinta: 140, Sexta: 190, Sábado: 100, Domingo: 80,
    Avulso: valorDiariaAvulso, mesReferenciaOffset: 0, mesReferenciaYYYYMM, autoIniciarRateioMock: true, updatedAt: new Date()
  };

  const logs = [
    { categoria: 'SISTEMA', descricao: 'Amostra de dados gerada automaticamente.', valor: 0 },
    { categoria: 'CADASTRO', descricao: `Importação de ${jogadoresPersistencia.length} jogadores concluída.`, valor: 0 },
    { categoria: 'SORTEIO', descricao: `Simulação de ${rodadas.length} rodadas concluídas.`, valor: 0 },
    { categoria: 'PRESENÇA', descricao: `Chamada do dia marcada para ${participantesHoje.length} atletas.`, valor: 0 },
    { categoria: 'FINANCEIRO', descricao: 'Custo da quadra configurado.', valor: 0 },
    { categoria: 'FINANCEIRO', descricao: 'Diária avulsa recebida.', valor: valorDiariaAvulso },
    { categoria: 'PARTIDAS', descricao: 'Resultados registrados por confronto.', valor: 0 },
  ].map((log) => ({ ...log, groupId, createdAt: new Date(), dataHora: new Date().toISOString() }));

  await commitEmLotes(jogadoresPersistencia, (lote, jogador) => {
    const { id, ...dados } = jogador;
    lote.set(doc(collection(db, JOGADORES_COLLECTION), id), dados);
  });
  await commitEmLotes(rodadas, (lote, rodada) => lote.set(doc(collection(db, SORTEIOS_COLLECTION)), rodada));
  await commitEmLotes(operacoes, (lote, op) => lote.set(doc(collection(db, FINANCEIRO_OP_COLLECTION)), op));
  await commitEmLotes(logs, (lote, log) => lote.set(doc(collection(db, LOGS_COLLECTION)), log));

  await setDoc(doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mesAtualNome}`), configFinanceira, { merge: true });
  await addDoc(collection(db, SORTEIOS_COLLECTION), sorteioAberto);

  return true;
};
