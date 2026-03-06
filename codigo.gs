/* codigo.gs */
const SHEET_JOGADORES = 'Jogadores';
const SHEET_PRESENCAS_SEG = 'Presenças_Seg';
const SHEET_PRESENCAS_SEX = 'Presenças_Sex';
const SHEET_PAGAMENTOS = 'Pagamentos';
const SHEET_CONFIG_FINANCEIRA = 'Config_Financeira';


function setupInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEET_JOGADORES)) {
    let sheet = ss.insertSheet(SHEET_JOGADORES);
    sheet.appendRow(['ID', 'Nome', 'Telefone', 'Nível (1-5)', 'Tipo']);
    sheet.getRange("A1:E1").setFontWeight("bold");
  }
  if (!ss.getSheetByName(SHEET_PRESENCAS_SEG)) {
    let sheet = ss.insertSheet(SHEET_PRESENCAS_SEG);
    sheet.appendRow(['Data', 'ID Jogador', 'Nome', 'Status', 'Tipo']);
    sheet.getRange("A1:E1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_PRESENCAS_SEG);
    if (sheet.getLastColumn() < 5) {
      sheet.getRange(1, 1, 1, 5).setValues([['Data', 'ID Jogador', 'Nome', 'Status', 'Tipo']]).setFontWeight("bold");
    }
  }
  if (!ss.getSheetByName(SHEET_PRESENCAS_SEX)) {
    let sheet = ss.insertSheet(SHEET_PRESENCAS_SEX);
    sheet.appendRow(['Data', 'ID Jogador', 'Nome', 'Status', 'Tipo']);
    sheet.getRange("A1:E1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_PRESENCAS_SEX);
    if (sheet.getLastColumn() < 5) {
      sheet.getRange(1, 1, 1, 5).setValues([['Data', 'ID Jogador', 'Nome', 'Status', 'Tipo']]).setFontWeight("bold");
    }
  }
  if (!ss.getSheetByName(SHEET_PAGAMENTOS)) {
    let sheet = ss.insertSheet(SHEET_PAGAMENTOS);
    sheet.appendRow(['ID Jogador', 'Nome', 'Dia Semana', 'Mes/Ano', 'Valor', 'Status']);
    sheet.getRange("A1:F1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_PAGAMENTOS);
    if (sheet.getLastColumn() < 6) {
      // Atualiza o cabeçalho para 6 colunas
      sheet.getRange(1, 1, 1, 6).setValues([['ID Jogador', 'Nome', 'Dia Semana', 'Mes/Ano', 'Valor', 'Status']]).setFontWeight("bold");
    }
  }
  if (!ss.getSheetByName(SHEET_CONFIG_FINANCEIRA)) {
    let sheet = ss.insertSheet(SHEET_CONFIG_FINANCEIRA);
    sheet.appendRow(['Mes/Ano', 'Custo Segunda', 'Custo Sexta', 'Status']);
    sheet.getRange("A1:D1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
    if (sheet.getLastColumn() < 4) {
      sheet.getRange(1, 4).setValue("Status").setFontWeight("bold");
    }
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('VoleizinDosCria')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Retorna a URL pública do webapp (para uso no cliente via google.script.run)
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

// Retorna lista de jogadores
function getJogadores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove cabeçalho
  return data.map(row => ({
    id: row[0],
    nome: row[1],
    telefone: row[2],
    nivel: row[3],
    tipo: row[4]
  }));
}

// Adiciona jogador
function adicionarJogador(nome, telefone, nivel, tipo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_JOGADORES); }
  const id = new Date().getTime().toString();
  sheet.appendRow([id, nome, telefone, nivel, tipo]);
  return getJogadores();
}

// Edita jogador existente
function editarJogador(id, nome, telefone, nivel, tipo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) return getJogadores();
  
  const data = sheet.getDataRange().getValues();
  // Começa do índice 1 para pular o cabeçalho
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == id) {
      // Atualiza as colunas B(2), C(3), D(4), E(5) da linha atual (i+1 pois getRange é índice 1-based)
      sheet.getRange(i+1, 2).setValue(nome);
      sheet.getRange(i+1, 3).setValue(telefone);
      sheet.getRange(i+1, 4).setValue(nivel);
      sheet.getRange(i+1, 5).setValue(tipo);
      return getJogadores();
    }
  }
  return getJogadores();
}

// Helper para tratar datas lidas do Google Sheets e evitar falha na comparação
function tratarDataDaPlanilha(celula) {
  if (celula instanceof Date) {
    let d = celula.getDate().toString().padStart(2, '0');
    let m = (celula.getMonth() + 1).toString().padStart(2, '0');
    let y = celula.getFullYear();
    return d + '/' + m + '/' + y;
  }
  return String(celula).replace(/^'/, '').trim();
}

// Especial para Mês/Ano (evita que 03/2026 vire data)
function tratarMesAno(celula) {
  if (celula instanceof Date) {
    let m = (celula.getMonth() + 1).toString().padStart(2, '0');
    let y = celula.getFullYear();
    return m + '/' + y;
  }
  return String(celula).replace(/^'/, '').trim();
}

// Registra presença
function registrarPresenca(diaDaSemana, dataJogo, idJogador, nome, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = diaDaSemana === 'Segunda' ? SHEET_PRESENCAS_SEG : SHEET_PRESENCAS_SEX;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(sheetName); }
  
  // Verifica se já existe e atualiza, senão adiciona
  const data = sheet.getDataRange().getValues();
  
  // Busca o tipo do jogador para registrar
  const todosJogadores = getJogadores();
  const jogador = todosJogadores.find(j => j.id == idJogador);
  const tipo = jogador ? jogador.tipo : 'Avulso';

  for(let i=1; i<data.length; i++) {
    let rowDateStr = tratarDataDaPlanilha(data[i][0]);
    if(rowDateStr == dataJogo && String(data[i][1]) == String(idJogador)) {
      sheet.getRange(i+1, 4).setValue(status);
      sheet.getRange(i+1, 5).setValue(tipo);
      return getPresencas(diaDaSemana, dataJogo);
    }
  }
  
  // Adiciona ' na frente para forçar Sheets a ler como Texto e não formatar mal
  sheet.appendRow(["'" + dataJogo, idJogador, nome, status, tipo]);
  return getPresencas(diaDaSemana, dataJogo);
}

// Obtém presenças para um dia específico
function getPresencas(diaDaSemana, dataJogo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = diaDaSemana === 'Segunda' ? SHEET_PRESENCAS_SEG : SHEET_PRESENCAS_SEX;
  const sheet = ss.getSheetByName(sheetName);
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.filter(row => tratarDataDaPlanilha(row[0]) == dataJogo).map(row => ({
    data: dataJogo,
    idJogador: String(row[1]),
    nome: row[2],
    status: row[3]
  }));
}

// Sorteia times balanceados (baseado nos que confirmaram presença)
function sortearTimes(diaDaSemana, dataJogo, jogadoresPorTime) {
  const presencas = getPresencas(diaDaSemana, dataJogo).filter(p => p.status === 'Confirmado');
  const todosJogadores = getJogadores();
  
  // Cria lista de confirmados com seus níveis
  let confirmados = presencas.map(p => {
    let j = todosJogadores.find(jog => jog.id == p.idJogador);
    return {
      nome: p.nome,
      telefone: j ? j.telefone : '',
      nivel: j ? parseInt(j.nivel) || 3 : 3,
      tipo: j ? j.tipo.includes('Avulso') ? 'Avulso' : 'Mensalista' : 'Avulso'
    };
  });
  
  // Ordena por nível (decrescente) para os melhores sempre serem draftados primeiro e servirem de base
  confirmados.sort((a,b) => b.nivel - a.nivel);
  
  const numTimes = Math.ceil(confirmados.length / jogadoresPorTime) || 1;
  let times = Array.from({length: numTimes}, () => []);
  let divisoes = Array.from({length: numTimes}, () => 0); // Soma de niveis por time
  
  // SNAKE DRAFT REAL: 0, 1, 2, 2, 1, 0, 0, 1, 2... 
  // Distribui equilibrando a força dos Cabeças de Chave
  let direcaoAscendente = true;
  let timeAtual = 0;

  for (let i = 0; i < confirmados.length; i++) {
     times[timeAtual].push(confirmados[i]);
     divisoes[timeAtual] += confirmados[i].nivel;

     if (direcaoAscendente) {
        timeAtual++;
        if (timeAtual >= numTimes) {
           timeAtual = numTimes - 1;
           direcaoAscendente = false; // Inverte e volta do último pro primeiro
        }
     } else {
        timeAtual--;
        if (timeAtual < 0) {
           timeAtual = 0;
           direcaoAscendente = true; // Bateu no primeiro, inverte e sobe de novo
        }
     }
  }
  
  return times;
}

// Calcula Fechamento (divide custo pelos mensalistas)
function calcularFechamento(mesAno, custoSegunda, custoSexta) {
  const todos = getJogadores();
  const pagamentos = getPagamentos(mesAno);
  
  let relatorio = {
    segunda: { custo: custoSegunda, totalMensalistas: 0, valorPorPessoa: 0, jogadores: [] },
    sexta: { custo: custoSexta, totalMensalistas: 0, valorPorPessoa: 0, jogadores: [] }
  };
  
  todos.forEach(j => {
    // Só considera pagamentos ativos (status 'Pago')
    let pagoSeg = pagamentos.some(p => String(p.idJogador) === String(j.id) && p.diaSemana === 'Segunda' && p.status === 'Pago');
    let pagoSex = pagamentos.some(p => String(p.idJogador) === String(j.id) && p.diaSemana === 'Sexta' && p.status === 'Pago');
    
    // Suporte a categorias legadas ('MENS' ou 'Mensalista')
    let tipoUpper = String(j.tipo).toUpperCase();
    let ehMensSeg = tipoUpper.includes('SEG') || tipoUpper === 'MENS' || tipoUpper === 'MENSALISTA';
    let ehMensSex = tipoUpper.includes('SEX') || tipoUpper === 'MENS' || tipoUpper === 'MENSALISTA';

    if(ehMensSeg) {
      relatorio.segunda.totalMensalistas++;
      relatorio.segunda.jogadores.push({
        id: j.id, 
        nome: j.nome, 
        telefone: j.telefone,
        pago: pagoSeg
      });
    }
    if(ehMensSex) {
      relatorio.sexta.totalMensalistas++;
      relatorio.sexta.jogadores.push({
        id: j.id, 
        nome: j.nome, 
        telefone: j.telefone,
        pago: pagoSex
      });
    }
  });
  
  if(relatorio.segunda.totalMensalistas > 0 && custoSegunda > 0) {
    relatorio.segunda.valorPorPessoa = (custoSegunda / relatorio.segunda.totalMensalistas).toFixed(2);
  }
  if(relatorio.sexta.totalMensalistas > 0 && custoSexta > 0) {
    relatorio.sexta.valorPorPessoa = (custoSexta / relatorio.sexta.totalMensalistas).toFixed(2);
  }
  
  // Salva a configuração e calcula o status
  if (custoSegunda > 0 || custoSexta > 0) {
    let arrecadadoMensalistas = 0;
    let arrecadadoAvulsos = 0;
    
    // Só contabiliza pagamentos com status 'Pago' (ignora 'Cancelado')
    pagamentos.forEach(p => { 
      if (p.status !== 'Pago') return;
      let valor = parseFloat(String(p.valor).replace(',', '.')) || 0;
      // Se a data tem mais de 7 caracteres (ex: 06/03/2026), é pagamento diário de avulso
      if (p.mesAno && p.mesAno.length > 7) {
        arrecadadoAvulsos += valor;
      } else {
        arrecadadoMensalistas += valor;
      }
    });

    let custoTotal = (parseFloat(custoSegunda) || 0) + (parseFloat(custoSexta) || 0);
    // O status (para pagar a quadra) agora depende apenas da arrecadação dos mensalistas
    let status = arrecadadoMensalistas >= (custoTotal - 0.01) ? "Pago Totalmente" : "Em Aberto";
    
    salvarConfigFinanceira(mesAno, custoSegunda, custoSexta, status);
    relatorio.statusGeral = status;
    relatorio.totalArrecadado = arrecadadoMensalistas; // Arrecadação para a quadra
    relatorio.totalAvulsos = arrecadadoAvulsos; // Caixa de equipamentos
  }
  
  return relatorio;
}

// Salva os custos de um mês
function salvarConfigFinanceira(mesAno, custoSegunda, custoSexta, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA); }
  
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(tratarMesAno(data[i][0]) == mesAno) {
      sheet.getRange(i+1, 2).setValue(custoSegunda);
      sheet.getRange(i+1, 3).setValue(custoSexta);
      sheet.getRange(i+1, 4).setValue(status || "Em Aberto");
      return;
    }
  }
  sheet.appendRow(["'" + mesAno, custoSegunda, custoSexta, status || "Em Aberto"]);
}

// Obtém os custos configurados de um mês
function getConfigFinanceira(mesAno) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(tratarMesAno(data[i][0]) == mesAno) {
      return {
        custoSegunda: data[i][1],
        custoSexta: data[i][2],
        status: data[i][3] || "Em Aberto"
      };
    }
  }
  return null;
}

// Remove a configuração de custos de um mês
function deletarConfigFinanceira(mesAno) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(tratarMesAno(data[i][0]) == mesAno) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// Obtém pagamentos de um mês específico (retorna todos os registros, inclusive Cancelados, para histórico)
function getPagamentos(mesAno) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PAGAMENTOS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  
  return data.map(row => {
    let hasNameCol = row.length >= 5;
    let mAno = hasNameCol ? tratarMesAno(row[3]) : tratarMesAno(row[2]);
    
    // Se o filtro (ex: 03/2026) está contido na data (ex: 06/03/2026), incluímos
    if (!mAno.includes(mesAno)) return null;
    
    return {
      idJogador: String(row[0]),
      nome: hasNameCol ? row[1] : '',
      diaSemana: hasNameCol ? row[2] : row[1],
      mesAno: mAno,
      valor: hasNameCol ? row[4] : (row[3] || 0),
      status: row.length >= 6 && row[5] ? row[5] : 'Pago'
    };
  }).filter(p => p !== null);
}

// Registra um pagamento (Toggle de status: Pago <-> Cancelado, mas NUNCA deleta o registro)
function registrarPagamento(idJogador, nome, diaSemana, mesAno, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PAGAMENTOS);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_PAGAMENTOS); }
  
  // Garante que o cabeçalho tenha o nome "Status" se a planilha já existia sem ele
  if (sheet.getLastColumn() < 6) {
    sheet.getRange(1, 1, 1, 6).setValues([['ID Jogador', 'Nome', 'Dia Semana', 'Mes/Ano', 'Valor', 'Status']]).setFontWeight("bold");
  }
  
  const data = sheet.getDataRange().getValues();
  idJogador = String(idJogador);
  
  for(let i=1; i<data.length; i++) {
    let rowId = String(data[i][0]);
    let rowDia = data[i].length >= 5 ? data[i][2] : data[i][1];
    let rowMes = data[i].length >= 5 ? tratarMesAno(data[i][3]) : tratarMesAno(data[i][2]);
    
    // Registro já existe: alterna o status (Pago <-> Cancelado) sem deletar
    if(rowId === idJogador && rowDia === diaSemana && rowMes === mesAno) {
      let statusAtual = data[i].length >= 6 && data[i][5] ? data[i][5] : 'Pago';
      let novoStatus = statusAtual === 'Pago' ? 'Cancelado' : 'Pago';
      sheet.getRange(i + 1, 6).setValue(novoStatus);
      let filtro = mesAno.length > 7 ? mesAno.split('/').slice(1).join('/') : mesAno;
      return getPagamentos(filtro);
    }
  }
  
  // Não existe: cria novo registro com status 'Pago'
  sheet.appendRow([idJogador, nome, diaSemana, "'" + mesAno, valor, 'Pago']);
  
  let filtroRetorno = mesAno.length > 7 ? mesAno.split('/').slice(1).join('/') : mesAno;
  return getPagamentos(filtroRetorno);
}
