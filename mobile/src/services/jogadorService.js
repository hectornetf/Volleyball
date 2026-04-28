import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, getDocs, where, writeBatch, setDoc, increment } from 'firebase/firestore';
import { encryptData, decryptData } from '../utils/crypto';
import { registrarLog } from './historyService';

const JOGADORES_COLLECTION = 'jogadores';
const FINANCEIRO_OP_COLLECTION = 'operacoes_financeiras';
const CONFIG_FINANCEIRA_COLLECTION = 'config_financeira';
const LOGS_COLLECTION = 'logs_atividades';

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
  historicoPresencas: parseInt(docData.historicoPresencas) || 0,
  status: docData.status || 'Ativo'
});

// Funções de Escrita com Criptografia
export const addJogador = async (jogador, groupId) => {
  if (!groupId) throw new Error("ID do Grupo obrigatório!");
  const encrypted = encryptPlayer(jogador, groupId);
  
  const docRef = await addDoc(collection(db, JOGADORES_COLLECTION), {
    ...encrypted,
    groupId,
    historicoPresencas: jogador.historicoPresencas || 0,
    mensalidadePaga: jogador.mensalidadePaga || false,
    diariaPaga: jogador.diariaPaga || false,
    presencaAtual: jogador.presencaAtual || 'Falto',
    status: jogador.status || 'Ativo'
  });
  
  await registrarLog('CADASTRO', `Novo jogador adicionado: ${jogador.nome}`, 0, groupId);
  return docRef;
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

  await updateDoc(docRef, encrypted);

  if (dados.status) {
    await registrarLog('SISTEMA', `Status do jogador alterado para ${dados.status}: ${dados.nome || id}`, 0, groupId);
  } else if (dados.nome || dados.nivel) {
    await registrarLog('SISTEMA', `Cadastro do jogador atualizado: ${dados.nome || id}`, 0, groupId);
  }

  return;
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
  
  const docRef = await addDoc(collection(db, FINANCEIRO_OP_COLLECTION), {
    tipo,
    groupId,
    valor: tipo === 'SAIDA_DESPESA' ? -Math.abs(valor) : Math.abs(valor),
    descricao: encryptData(descricao, groupId), // Criptografa descrição por segurança
    data: new Date().toISOString()
  });

  await registrarLog('FINANCEIRO', descricao, valor, groupId);
  return docRef;
};

/**
 * Liquida gastos do fundo de equipamentos (Saída de Caixa)
 */
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

export const resetDadosGrupo = async (groupId) => {
  if (!groupId) return;
  try {
    const batch = writeBatch(db);
    
    // Deleta em lote todos os documentos de todas as coleções vinculadas ao grupo
    const queries = [
      query(collection(db, JOGADORES_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, FINANCEIRO_OP_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, CONFIG_FINANCEIRA_COLLECTION), where('groupId', '==', groupId)),
      query(collection(db, LOGS_COLLECTION), where('groupId', '==', groupId))
    ];

    for (const q of queries) {
      const snap = await getDocs(q);
      snap.forEach(d => batch.delete(d.ref));
    }

    // Garante exclusão do global "legacy" ou dos meses gerados no último teste
    batch.delete(doc(db, CONFIG_FINANCEIRA_COLLECTION, groupId));
    const mesesParaLimpar = [0, -1, 1].map(offset => {
      const d = new Date(); d.setMonth(d.getMonth() + offset); 
      return d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    });
    mesesParaLimpar.forEach(mes => batch.delete(doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mes}`)));

    await batch.commit();
  } catch (e) {
    console.error("Erro no reset: ", e);
  }
};

/**
 * Incrementa o contador de presença histórica de um jogador
 */
export const incrementarPresencaHistorica = async (id, valor) => {
  const docRef = doc(db, JOGADORES_COLLECTION, id);
  return await updateDoc(docRef, { 
    historicoPresencas: increment(valor) 
  });
};

// --- CONFIGURAÇÃO FINANCEIRA (COSTS PER DAY) ---

export const saveConfigFinanceira = async (groupId, mes, config) => {
  const docRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mes}`);
  return await setDoc(docRef, { ...config, groupId, updatedAt: new Date() }, { merge: true });
};

export const getConfigFinanceira = async (groupId, mes) => {
  const q = query(collection(db, CONFIG_FINANCEIRA_COLLECTION), where('__name__', '==', `${groupId}_${mes}`));
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

export const gerarDadosDeTestePro = async (groupId) => {
  if (!groupId) throw new Error('ID do Grupo obrigatório!');

  const diasTreino = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const refDate = new Date();
  const mesAtualNome = refDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  const mesReferenciaYYYYMM = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  const valorDiariaAvulso = 20;

  const nomesMensalistas = [
    'Hector Neto', 'Lucas Silva', 'Mariana Costa', 'João Pedro', 
    'Bruna Oliveira', 'Ricardo Santos', 'Aline Ferreira', 'Gabriel Sousa',
    'Zeca Alves', 'Maya Ribeiro', 'Kadu Martins', 'Tati Lima', 'Felipe Dias', 'Larissa Motta'
  ];

  const arrDiasVariados = [
    ['Segunda', 'Quarta'], ['Terça', 'Quinta'], ['Sexta', 'Sábado', 'Domingo'],
    ['Segunda', 'Sexta'], ['Quarta', 'Domingo'], ['Terça', 'Sábado'], ['Segunda', 'Quarta', 'Sexta']
  ];

  const mensalistas = nomesMensalistas.map((nome, i) => {
    const nivel = (i % 5) + 1;
    const diasDesteMensalista = arrDiasVariados[i % arrDiasVariados.length];
    return {
      nome: encryptData(nome, groupId),
      celular: encryptData(`(11) 98765-${String(1000 + i).slice(-4)}`, groupId),
      dataNascimento: encryptData(`15/01/1990`, groupId),
      nivel,
      tipo: 'MENSALISTA',
      diasMensalista: diasDesteMensalista,
      groupId,
      historicoPresencas: 50 - i,
      pagamentosMensais: i >= 4 ? { [`Segunda_${mesAtualNome}`]: true } : {},
      diariaPaga: false,
      presencaAtual: 'Falta',
      presencas: diasTreino.reduce((acc, dia) => {
        acc[dia] = (diasDesteMensalista.includes(dia) && i < 8) ? 'Confirmado' : 'Falta';
        return acc;
      }, {}),
      status: i === 13 ? 'Inativo' : 'Ativo' // Um inativo para teste
    };
  });

  const avulsos = [
    { nome: 'Convidado Alpha', nivel: 4, paga: true, pres: 'Confirmado' },
    { nome: 'Convidado Beta', nivel: 2, paga: false, pres: 'Falta' }
  ].map((a, i) => ({
    nome: encryptData(a.nome, groupId),
    celular: encryptData(`(11) 90000-000${i}`, groupId),
    dataNascimento: encryptData(`01/01/2000`, groupId),
    nivel: a.nivel,
    tipo: 'AVULSO',
    diasMensalista: [],
    groupId,
    historicoPresencas: 10,
    pagamentosMensais: {},
    diariaPaga: a.paga,
    presencaAtual: a.pres,
    presencas: diasTreino.reduce((acc, dia) => { acc[dia] = a.pres; return acc; }, {}),
    status: 'Ativo'
  }));

  const batch = writeBatch(db);

  [...mensalistas, ...avulsos].forEach((j) => {
    batch.set(doc(collection(db, JOGADORES_COLLECTION)), j);
  });

  const configRef = doc(db, CONFIG_FINANCEIRA_COLLECTION, `${groupId}_${mesAtualNome}`);
  batch.set(configRef, {
    groupId, Segunda: 160, Terça: 120, Quarta: 200, Quinta: 140, Sexta: 190, Sábado: 100, Domingo: 80,
    Avulso: valorDiariaAvulso, mesReferenciaOffset: 0, mesReferenciaYYYYMM, autoIniciarRateioMock: true, updatedAt: new Date()
  }, { merge: true });

  const operacoes = [
    { tipo: 'ENTRADA_AVULSO', valor: valorDiariaAvulso, desc: 'Diária: Convidado Alpha' },
    { tipo: 'SAIDA_DESPESA', valor: 25, desc: 'Equipamentos: bolas novas' }
  ];

  operacoes.forEach((op) => {
    batch.set(doc(collection(db, FINANCEIRO_OP_COLLECTION)), {
      tipo: op.tipo, groupId, valor: op.tipo === 'SAIDA_DESPESA' ? -op.valor : op.valor,
      descricao: encryptData(op.desc, groupId), data: new Date().toISOString()
    });
  });

  const logsTeste = [
    { cat: 'SISTEMA', desc: 'Simulação de dados iniciada.', val: 0 },
    { cat: 'CADASTRO', desc: 'Importação de 16 jogadores concluída.', val: 0 },
    { cat: 'FINANCEIRO', desc: 'Custo da quadra configurado.', val: 0 },
    { cat: 'PRESENÇA', desc: 'Chamada do dia realizada automaticamente.', val: 0 }
  ];

  logsTeste.forEach((log) => {
    batch.set(doc(collection(db, LOGS_COLLECTION)), {
      categoria: log.cat, descricao: log.desc, valor: log.val, groupId,
      createdAt: new Date(), dataHora: new Date().toISOString()
    });
  });

  return await batch.commit();
};
