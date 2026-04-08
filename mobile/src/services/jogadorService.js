import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, getDocs, where, writeBatch, setDoc } from 'firebase/firestore';
import { encryptData, decryptData } from '../utils/crypto';

const JOGADORES_COLLECTION = 'jogadores';
const FINANCEIRO_OP_COLLECTION = 'operacoes_financeiras';
const CONFIG_FINANCEIRA_COLLECTION = 'config_financeira';

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
  // Garante que o histórico seja numérico para o ranking
  historicoPresencas: parseInt(docData.historicoPresencas) || 0
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
  if (dados.dataNascimento !== undefined) {
    encrypted.dataNascimento = encryptData(dados.dataNascimento, groupId);
  }

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

/**
 * Liquida gastos do fundo de equipamentos (Saída de Caixa)
 */
export const registrarSaidaCaixa = async (valor, descricao, groupId) => {
  return await registrarOperacaoFinanceira('SAIDA_DESPESA', valor, descricao, groupId);
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

/**
 * Incrementa o contador de presença histórica de um jogador
 */
export const incrementarPresencaHistorica = async (id, valor) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  // Usamos fieldValue.increment ou buscamos o valor atual se o SDK estiver limitado
  // Para simplificar e garantir precisão:
  const snap = await getDocs(query(collection(db, JOGADORES_COLLECTION), where('__name__', '==', id)));
  if (!snap.empty) {
    const atual = parseInt(snap.docs[0].data().historicoPresencas) || 0;
    return await updateDoc(docRef, { historicoPresencas: Math.max(0, atual + valor) });
  }
};

// --- CONFIGURAÇÃO FINANCEIRA (COSTS PER DAY) ---

export const saveConfigFinanceira = async (groupId, config) => {
  const docRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, groupId);
  return await setDoc(docRef, { ...config, updatedAt: new Date() }, { merge: true });
};

export const getConfigFinanceira = async (groupId) => {
  const docRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, groupId);
  const q = query(collection(db, CONFIG_FINANCEIRA_COLLECTION), where('__name__', '==', groupId));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].data();
  }
  
  // Fallback para custos padrão do legado
  return {
    Segunda: 0, Terça: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0, Domingo: 0, Avulso: 10
  };
};

// --- SIMULAÇÃO DE DADOS (DEVELOPER TOOLS) ---

/**
 * Gera elenco + config + movimentações financeiras para exercitar todas as abas.
 * Grava `mesReferenciaYYYYMM` e `mesReferenciaOffset: 0` alinhados ao mês civil atual.
 * `autoIniciarRateioMock: true` faz a Financeiro abrir o rateio ao carregar (teste da tela).
 * Dica: use "Zerar Grupo" antes, se quiser só estes dados no Firestore.
 */
export const gerarDadosDeTestePro = async (groupId) => {
  if (!groupId) throw new Error('ID do Grupo obrigatório!');

  /** Todos os dias — alinha com custos por dia na config (evita “nenhum mensalista” no financeiro). */
  const diasTreino = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const mm = String(new Date().getMonth() + 1).padStart(2, '0');
  const dd = String(new Date().getDate()).padStart(2, '0');
  const anivHojeA = `1995-${mm}-${dd}`;
  const anivHojeB = `2001-${mm}-${dd}`;

  /** Mesmo valor em config Avulso, diárias mock e ENTRADA_AVULSO no Firestore. */
  const valorDiariaAvulso = 20;

  const nomesMensalistas = [
    'Hector Neto',
    'Lucas Silva',
    'Mariana Costa',
    'João Pedro',
    'Bruna Oliveira',
    'Ricardo Santos',
    'Aline Ferreira',
    'Gabriel Sousa',
    'Zeca Alves',
    'Maya Ribeiro',
    'Kadu Martins',
    'Tati Lima',
    'Felipe Dias',
    'Larissa Motta',
  ];

  const mensalistas = nomesMensalistas.map((nome, i) => {
    const nivel = (i % 5) + 1;
    const dataNascimento =
      i === 0 ? anivHojeA : i === 1 ? anivHojeB : `199${i % 10}-${String(((i % 9) + 1)).padStart(2, '0')}-15`;
    return {
      nome: encryptData(nome, groupId),
      celular: encryptData(`(11) 98765-${String(1000 + i).slice(-4)}`, groupId),
      dataNascimento: encryptData(dataNascimento, groupId),
      nivel,
      tipo: 'MENSALISTA',
      diasMensalista: [...diasTreino],
      groupId,
      historicoPresencas: 58 - i * 3,
      mensalidadePaga: i >= 4,
      diariaPaga: false,
      presencaAtual: i < 9 ? 'Confirmado' : 'Falta',
    };
  });

  const avulsosPlain = [
    { nome: 'Convidado Alpha', cel: '(11) 97755-1001', nivel: 4, diariaPaga: true, presencaAtual: 'Confirmado', historico: 14 },
    { nome: 'Convidado Beta', cel: '(11) 97755-1002', nivel: 2, diariaPaga: true, presencaAtual: 'Confirmado', historico: 9 },
    { nome: 'Convidado Gamma', cel: '(11) 97755-1003', nivel: 3, diariaPaga: false, presencaAtual: 'Falta', historico: 6 },
    { nome: 'Convidado Delta', cel: '(11) 97755-1004', nivel: 1, diariaPaga: false, presencaAtual: 'Falta', historico: 3 },
  ];

  const avulsos = avulsosPlain.map((a, i) => ({
    nome: encryptData(a.nome, groupId),
    celular: encryptData(a.cel, groupId),
    dataNascimento: encryptData(`200${i + 2}-06-10`, groupId),
    nivel: a.nivel,
    tipo: 'AVULSO',
    diasMensalista: [],
    groupId,
    historicoPresencas: a.historico,
    mensalidadePaga: false,
    diariaPaga: a.diariaPaga,
    presencaAtual: a.presencaAtual,
  }));

  const batch = writeBatch(db);

  [...mensalistas, ...avulsos].forEach((jogador) => {
    batch.set(doc(collection(db, JOGADORES_COLLECTION)), jogador);
  });

  const refDate = new Date();
  const mesReferenciaYYYYMM = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;

  const configRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, groupId);
  batch.set(
    configRef,
    {
      Segunda: 160,
      Terca: 0,
      Terça: 120,
      Quarta: 200,
      Quinta: 140,
      Sexta: 190,
      Sabado: 0,
      Sábado: 100,
      Domingo: 80,
      Avulso: valorDiariaAvulso,
      mesReferenciaOffset: 0,
      mesReferenciaYYYYMM,
      autoIniciarRateioMock: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  const agora = refDate.toISOString();
  /** 2 entradas = só os 2 avulsos com diária paga; saída coerente com saldo exibido no card. */
  const operacoes = [
    { tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso, desc: 'Diária: Convidado Alpha' },
    { tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso, desc: 'Diária: Convidado Beta' },
    { tipo: 'SAIDA_DESPESA', valor: 25, desc: 'Equipamentos: bolas e redes' },
  ];

  operacoes.forEach((op) => {
    const valorArmazenado =
      op.tipo === 'SAIDA_DESPESA' ? -Math.abs(op.valor) : Math.abs(op.valor);
    batch.set(doc(collection(db, FINANCEIRO_OP_COLLECTION)), {
      tipo: op.tipo,
      groupId,
      valor: valorArmazenado,
      descricao: encryptData(op.desc, groupId),
      data: agora,
    });
  });

  return await batch.commit();
};
