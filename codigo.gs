/* codigo.gs */
const SHEET_JOGADORES = 'Jogadores';
const SHEET_PRESENCAS = 'Presenças_Geral';
const SHEET_PAGAMENTOS = 'Pagamentos';
const SHEET_CONFIG_FINANCEIRA = 'Config_Financeira';


function setupInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(SHEET_JOGADORES)) {
    let sheet = ss.insertSheet(SHEET_JOGADORES);
    sheet.appendRow(['ID', 'Nome', 'Telefone', 'Nível (1-5)', 'Tipo', 'Data Nascimento']);
    sheet.getRange("A1:F1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_JOGADORES);
    if (sheet.getLastColumn() < 6) {
      sheet.getRange(1, 6).setValue("Data Nascimento").setFontWeight("bold");
    }
  }
  // ... rest of setup ...
  if (!ss.getSheetByName(SHEET_PRESENCAS)) {
    let sheet = ss.insertSheet(SHEET_PRESENCAS);
    sheet.appendRow(['Data', 'Dia Semana', 'ID Jogador', 'Nome', 'Status', 'Tipo']);
    sheet.getRange("A1:F1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_PRESENCAS);
    if (sheet.getLastColumn() < 6) {
      sheet.getRange(1, 1, 1, 6).setValues([['Data', 'Dia Semana', 'ID Jogador', 'Nome', 'Status', 'Tipo']]).setFontWeight("bold");
    }
  }

  if (!ss.getSheetByName(SHEET_PAGAMENTOS)) {
    let sheet = ss.insertSheet(SHEET_PAGAMENTOS);
    sheet.appendRow(['ID Jogador', 'Nome', 'Dia Semana', 'Mes/Ano', 'Valor', 'Status']);
    sheet.getRange("A1:F1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_PAGAMENTOS);
    if (sheet.getLastColumn() < 6) {
      sheet.getRange(1, 1, 1, 6).setValues([['ID Jogador', 'Nome', 'Dia Semana', 'Mes/Ano', 'Valor', 'Status']]).setFontWeight("bold");
    }
  }

  if (!ss.getSheetByName(SHEET_CONFIG_FINANCEIRA)) {
    let sheet = ss.insertSheet(SHEET_CONFIG_FINANCEIRA);
    sheet.appendRow(['Mes/Ano', 'Status', 'Custos_JSON']);
    sheet.getRange("A1:C1").setFontWeight("bold");
  } else {
    let sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
    if (sheet.getLastColumn() < 3) {
      sheet.getRange(1, 1, 1, 3).setValues([['Mes/Ano', 'Status', 'Custos_JSON']]).setFontWeight("bold");
    }
  }
}


/**
 * Gera dados de teste fictícios para validar o funcionamento do sistema.
 * Deve ser executado manualmente pelo administrador se desejar popular a planilha.
 */
function gerarDadosDeTeste() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- DADOS DE TESTE INICIAIS (MOCK) ---
  let sheetJogadores = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheetJogadores) {
    setupInicial();
    sheetJogadores = ss.getSheetByName(SHEET_JOGADORES);
  }

  // Só adiciona se estiver vazio (apenas cabeçalho)
  if (sheetJogadores && sheetJogadores.getLastRow() === 1) {
    // Adiciona Jogadores Fictícios
    let jogadoresMock = [
      ['1710000000001', 'João (Avulso)', '11999999999', '3', 'Avulso', '1990-01-01'],
      ['1710000000002', 'Maria (Mensalista Seg)', '11988888888', '4', 'Mensalista: Seg', '1995-05-10'],
      ['1710000000003', 'Pedro (Mensalista Seg/Sex)', '11977777777', '5', 'Mensalista: Seg, Sex', '1988-12-20'],
      ['1710000000004', 'Ana (Mensalista Dom)', '11966666666', '2', 'Mensalista: Dom', '2000-10-30'],
      ['1710000000005', 'Lucas (Avulso)', '11955555555', '3', 'Avulso', '1992-06-15'],
      ['1710000000006', 'Julia (Mensalista Sex)', '11944444444', '4', 'Mensalista: Sex', '1998-03-25']
    ];
    // Adiciona as linhas na aba de jogadores
    jogadoresMock.forEach(j => sheetJogadores.appendRow(j));

    // Adiciona Configuração Financeira Fictícia para o mês atual
    let sheetConfigFin = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
    if (sheetConfigFin && sheetConfigFin.getLastRow() === 1) {
      let hoje = new Date();
      let mesAno = ('0' + (hoje.getMonth() + 1)).slice(-2) + '/' + hoje.getFullYear();
      let custosMock = JSON.stringify({"Domingo": 100, "Segunda": 120, "Sexta": 150, "Avulso": 10});
      sheetConfigFin.appendRow([mesAno, 'Em Aberto', custosMock]);
    }

    // Adiciona Presenças para o dia atual para ter algo no Próximo Jogo
    let sheetPresencas = ss.getSheetByName(SHEET_PRESENCAS);
    if (sheetPresencas && sheetPresencas.getLastRow() === 1) {
      let hojeLocal = new Date().toLocaleDateString('pt-BR');
      let diaSemanaStr = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][new Date().getDay()];
      
      let presencasMock = [
        [hojeLocal, diaSemanaStr, '1710000000001', 'João (Avulso)', 'Confirmado', 'Avulso'],
        [hojeLocal, diaSemanaStr, '1710000000002', 'Maria (Mensalista Seg)', 'Ausente', 'Mensalista: Seg'],
        [hojeLocal, diaSemanaStr, '1710000000004', 'Ana (Mensalista Dom)', 'Confirmado', 'Mensalista: Dom']
      ];
      presencasMock.forEach(p => sheetPresencas.appendRow(p));
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
    tipo: row[4],
    dataNascimento: row[5] ? formatarParaInputData(row[5]) : ''
  }));
}

// Helper para formatar data do Sheets (Date object) para string YYYY-MM-DD (input date)
function formatarParaInputData(data) {
  if (!(data instanceof Date)) return String(data);
  let d = data.getDate().toString().padStart(2, '0');
  let m = (data.getMonth() + 1).toString().padStart(2, '0');
  let y = data.getFullYear();
  return `${y}-${m}-${d}`;
}

// Adiciona jogador
function adicionarJogador(nome, telefone, nivel, tipo, dataNascimento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_JOGADORES); }
  const id = new Date().getTime().toString();
  // Se houver data, salva como Date object para o Sheets formatar corretamente
  let dataSalvar = dataNascimento ? new Date(dataNascimento + 'T00:00:00') : '';
  sheet.appendRow([id, nome, telefone, nivel, tipo, dataSalvar]);
  return getJogadores();
}

// Edita jogador existente
function editarJogador(id, nome, telefone, nivel, tipo, dataNascimento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) return getJogadores();
  
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == id) {
      sheet.getRange(i+1, 2).setValue(nome);
      sheet.getRange(i+1, 3).setValue(telefone);
      sheet.getRange(i+1, 4).setValue(nivel);
      sheet.getRange(i+1, 5).setValue(tipo);
      let dataSalvar = dataNascimento ? new Date(dataNascimento + 'T00:00:00') : '';
      sheet.getRange(i+1, 6).setValue(dataSalvar);
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
  let sheet = ss.getSheetByName(SHEET_PRESENCAS);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_PRESENCAS); }
  
  const data = sheet.getDataRange().getValues();
  const todosJogadores = getJogadores();
  const jogador = todosJogadores.find(j => j.id == idJogador);
  const tipo = jogador ? jogador.tipo : 'Avulso';

  for(let i=1; i<data.length; i++) {
    let rowDateStr = tratarDataDaPlanilha(data[i][0]);
    // Coluna 2 (índice 1) agora é o Dia Semana, Coluna 3 (índice 2) é ID Jogador
    // Compatibilidade com planilha velha: old format length 5
    let colIdIdx = data[0].length >= 6 ? 2 : 1; 
    let colStatusIdx = data[0].length >= 6 ? 4 : 3;
    let colTipoIdx = data[0].length >= 6 ? 5 : 4;
    
    if(rowDateStr == dataJogo && String(data[i][colIdIdx]) == String(idJogador)) {
      sheet.getRange(i+1, colStatusIdx + 1).setValue(status);
      sheet.getRange(i+1, colTipoIdx + 1).setValue(tipo);
      return getPresencas(diaDaSemana, dataJogo);
    }
  }
  
  // Array com 6 colunas: Data, Dia Semana, ID, Nome, Status, Tipo
  sheet.appendRow(["'" + dataJogo, diaDaSemana, idJogador, nome, status, tipo]);
  return getPresencas(diaDaSemana, dataJogo);
}

// Obtém presenças para um dia específico
function getPresencas(diaDaSemana, dataJogo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRESENCAS);
  // Se ainda procurar na aba velha por fallback (somente leitura temporária pros updates de 7 dias)
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove cabeçalho
  
  return data.filter(row => tratarDataDaPlanilha(row[0]) == dataJogo).map(row => {
    let hasDiaCol = row.length >= 6;
    return {
      data: dataJogo,
      diaDaSemana: hasDiaCol ? row[1] : diaDaSemana, // Preserva compat com planilha de 5 col
      idJogador: String(hasDiaCol ? row[2] : row[1]),
      nome: hasDiaCol ? row[3] : row[2],
      status: hasDiaCol ? row[4] : row[3]
    };
  });
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
  
  // Separa jogadores em dois grupos: Elite/Medio (Nível >= 3) e Baixo (Nível <= 2)
  let grupoEliteMedio = confirmados.filter(j => j.nivel >= 3);
  let grupoBaixo = confirmados.filter(j => j.nivel <= 2);
  
  const numTimes = Math.ceil(confirmados.length / jogadoresPorTime) || 1;
  let times = Array.from({length: numTimes}, () => []);
  let divisoes = Array.from({length: numTimes}, () => 0); // Soma de niveis por time
  
  // 1. Distribui Grupo ELITE/MEDIO usando SNAKE DRAFT
  // Ordena por nível (decrescente)
  grupoEliteMedio.sort((a,b) => b.nivel - a.nivel);
  
  let direcaoAscendente = true;
  let timeAtual = 0;

  for (let i = 0; i < grupoEliteMedio.length; i++) {
     times[timeAtual].push(grupoEliteMedio[i]);
     divisoes[timeAtual] += grupoEliteMedio[i].nivel;

     if (direcaoAscendente) {
        timeAtual++;
        if (timeAtual >= numTimes) {
           timeAtual = numTimes - 1;
           direcaoAscendente = false;
        }
     } else {
        timeAtual--;
        if (timeAtual < 0) {
           timeAtual = 0;
           direcaoAscendente = true;
        }
     }
  }

  // 2. Distribui Grupo BAIXO usando ROUND ROBIN (para dispersar ao máximo)
  // Sorteia a ordem inicial de quem começa a receber jogadores nível baixo (baseado no time com menor peso atual)
  // Mas para garantir dispersão pura, usamos um round robin simples seguindo a ordem de menor ocupação
  grupoBaixo.sort((a,b) => b.nivel - a.nivel); // Maior nível baixo (2) primeiro

  for (let i = 0; i < grupoBaixo.length; i++) {
     // Encontra o time com MENOS jogadores atualmente
     // Se empatarem em número de jogadores, escolhe o que tem MENOR nível total
     let melhorTimeIdx = 0;
     for (let t = 1; t < times.length; t++) {
        if (times[t].length < times[melhorTimeIdx].length) {
           melhorTimeIdx = t;
        } else if (times[t].length === times[melhorTimeIdx].length) {
           if (divisoes[t] < divisoes[melhorTimeIdx]) {
              melhorTimeIdx = t;
           }
        }
     }
     
     times[melhorTimeIdx].push(grupoBaixo[i]);
     divisoes[melhorTimeIdx] += grupoBaixo[i].nivel;
  }
  
  return times;
}

// Calcula Fechamento (Dinamico para múltiplos dias)
function calcularFechamento(mesAno, custosJsonStr) {
  const todos = getJogadores();
  const pagamentos = getPagamentos(mesAno);
  
  let custosObj = {};
  try {
    custosObj = JSON.parse(custosJsonStr);
  } catch(e) { /* silent fail */ }

  let relatorio = {
    dias: {}, // { "Segunda": { custo: X, totalMensalistas: Y, valorPorPessoa: Z, jogadores: [] } }
    statusGeral: "Em Aberto",
    totalArrecadado: 0,
    totalAvulsos: 0
  };

  // Inicializa o objeto do relatório com os dias que têm custo > 0
  Object.keys(custosObj).forEach(dia => {
    if (dia === 'Avulso') return; // Pula a configuração de preço do avulso (é receita)
    let c = parseFloat(custosObj[dia]) || 0;
    if (c > 0) {
      relatorio.dias[dia] = { custo: c, totalMensalistas: 0, valorPorPessoa: 0, jogadores: [] };
    }
  });

  todos.forEach(j => {
    let tipoUpper = String(j.tipo).toUpperCase(); // Ex: "MENSALISTA SEG, QUA, SEX"
    
    // Para cada dia configurado com custo, checamos se o jogador é mensalista desse dia
    Object.keys(relatorio.dias).forEach(dia => {
      // Suporte legado MENSALISTA SEG E SEX map
      let ehMensalistaDiaVelho = (dia === 'Segunda' && (tipoUpper.includes('SEG') || tipoUpper === 'MENS' || tipoUpper === 'MENSALISTA')) ||
                                 (dia === 'Sexta' && (tipoUpper.includes('SEX') || tipoUpper === 'MENS' || tipoUpper === 'MENSALISTA'));
      // Novo formato: Mensalista "DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"
      let ehMensalistaDiaNovo = tipoUpper.includes(dia.substring(0, 3).toUpperCase()) && !tipoUpper.includes('AVULSO');
      
      let ehMensalista = ehMensalistaDiaVelho || ehMensalistaDiaNovo;

      if(ehMensalista) {
        let pago = pagamentos.some(p => String(p.idJogador) === String(j.id) && p.diaSemana === dia && p.status === 'Pago');
        relatorio.dias[dia].totalMensalistas++;
        relatorio.dias[dia].jogadores.push({
          id: j.id, 
          nome: j.nome, 
          telefone: j.telefone,
          pago: pago
        });
      }
    });
  });
  
  let custoTotalQuadra = 0;
  
  // Calcula rateios por pessoa
  Object.keys(relatorio.dias).forEach(dia => {
    let d = relatorio.dias[dia];
    custoTotalQuadra += d.custo;
    if(d.totalMensalistas > 0 && d.custo > 0) {
      d.valorPorPessoa = (d.custo / d.totalMensalistas).toFixed(2);
    }
  });
  
  // Salva a configuração (sempre que houver custos configurados ou status alterado)
  let temQualquerCusto = Object.keys(custosObj).some(k => parseFloat(custosObj[k]) > 0);
  
  if (temQualquerCusto || custoTotalQuadra > 0) {
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

    // O status (para pagar a quadra) agora depende apenas da arrecadação dos mensalistas
    let status = (custoTotalQuadra > 0 && arrecadadoMensalistas >= (custoTotalQuadra - 0.01)) ? "Pago Totalmente" : "Em Aberto";
    
    salvarConfigFinanceira(mesAno, custosJsonStr, status);
    relatorio.statusGeral = status;
    relatorio.totalArrecadado = arrecadadoMensalistas; // Arrecadação para a quadra
    relatorio.totalAvulsos = arrecadadoAvulsos; // Caixa de equipamentos
  }
  
  return relatorio;
}

// Salva os custos de um mês
function salvarConfigFinanceira(mesAno, custosJsonStr, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
  if (!sheet) { setupInicial(); sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA); }
  
  // Suporte a migração: forçar nova estrutura
  if (sheet.getLastColumn() > 3 && sheet.getRange(1, 2).getValue() === "Custo Segunda") {
    // É uma planilha antiga. Vamos converter cabeçalho pra JSON
    sheet.getRange(1, 1, 1, 3).setValues([['Mes/Ano', 'Status', 'Custos_JSON']]).setFontWeight("bold");
    sheet.getRange(1, 4).clearContent(); // Apaga coluna D
  }

  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(tratarMesAno(data[i][0]) == mesAno) {
      // Formato Novo (Col 2 Status, Col 3 Json)
      sheet.getRange(i+1, 2).setValue(status || "Em Aberto");
      sheet.getRange(i+1, 3).setValue(typeof custosJsonStr === 'string' ? custosJsonStr : JSON.stringify(custosJsonStr));
      return;
    }
  }
  sheet.appendRow(["'" + mesAno, status || "Em Aberto", typeof custosJsonStr === 'string' ? custosJsonStr : JSON.stringify(custosJsonStr)]);
}

// Obtém os custos configurados de um mês
function getConfigFinanceira(mesAno) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG_FINANCEIRA);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  
  // Checa se é modelo antigo (Col B = Seg, Col C = Sex, Col D = Status)
  let isLegacy = sheet.getRange(1, 2).getValue() === "Custo Segunda";
  
  for(let i=1; i<data.length; i++) {
    if(tratarMesAno(data[i][0]) == mesAno) {
      if(isLegacy) {
        return {
          custosJsonStr: JSON.stringify({ "Segunda": data[i][1] || 0, "Sexta": data[i][2] || 0 }),
          status: data[i][3] || "Em Aberto"
        };
      } else {
        return {
          custosJsonStr: data[i][2],
          status: data[i][1] || "Em Aberto"
        };
      }
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

/** 
 * DASHBOARD: Consolida dados para visão analítica e financeira
 */
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. DADOS DE JOGADORES (Aniversariantes e Elenco)
  const jogadores = getJogadores();
  
  // ... lógica de aniversariantes omitida se não houver no código
  const dataHoje = new Date();
  const mesAtual = (dataHoje.getMonth() + 1).toString().padStart(2, '0');
  const diaAtual = dataHoje.getDate().toString().padStart(2, '0');
    
  let aniversariantes = [];
  let numMensalistas = 0;
  let numAvulsos = 0;
  
  jogadores.forEach(j => {
    // Conta tipos
    if(String(j.tipo).toLowerCase().includes('avulso')) {
      numAvulsos++;
    } else {
      numMensalistas++;
    }
  });

  // 2. DADOS FINANCEIROS
  const mesRef = mesAtual + '/' + dataHoje.getFullYear();
  const pagamentos = getPagamentos(mesRef);
  const configFin = getConfigFinanceira(mesRef);
  
  let arrecadadoMensalistas = 0;
  let arrecadadoAvulsos = 0;
  
  pagamentos.forEach(p => {
    if (p.status !== 'Pago') return;
    let valor = parseFloat(String(p.valor).replace(',', '.')) || 0;
    if (p.mesAno && p.mesAno.length > 7) {
      arrecadadoAvulsos += valor;
    } else {
      arrecadadoMensalistas += valor;
    }
  });
  
  let metaCustoTotal = 0;
  if(configFin && configFin.custosJsonStr) {
    try {
      let cObj = JSON.parse(configFin.custosJsonStr);
      Object.keys(cObj).forEach(d => {
        metaCustoTotal += (parseFloat(cObj[d]) || 0);
      });
    } catch(e) {}
  }
  
  let financeiroStatus = configFin ? configFin.status : 'Em Aberto';
  let saldoEmAberto = 0; 
  const devedores = [];
  
  if (configFin && configFin.custosJsonStr) {
    try {
      let cObj = JSON.parse(configFin.custosJsonStr);
      Object.keys(cObj).forEach(dia => {
        let custoDia = parseFloat(cObj[dia]) || 0;
        if(custoDia <= 0) return;
        
        let jDia = jogadores.filter(j => {
          let tipo = String(j.tipo).toUpperCase();
          let ehLegado = (dia === 'Segunda' && (tipo.includes('SEG') || tipo === 'MENS' || tipo === 'MENSALISTA')) ||
                         (dia === 'Sexta' && (tipo.includes('SEX') || tipo === 'MENS' || tipo === 'MENSALISTA'));
          let ehNovo = tipo.includes(dia.substring(0,3).toUpperCase()) && !tipo.includes('AVULSO');
          return ehLegado || ehNovo;
        });
        
        let valorUnitario = custoDia / (jDia.length || 1);
        
        jDia.forEach(j => {
          if (!pagamentos.some(p => String(p.idJogador) === String(j.id) && p.diaSemana === dia && p.status === 'Pago')) {
            saldoEmAberto += valorUnitario;
            devedores.push({ nome: j.nome, valor: valorUnitario, dia: dia.substring(0,3) });
          }
        });
      });
    } catch(e) {}
  }

  // 4. Ranking de Presença (Lendo da aba única)
  const presencasStr = ss.getSheetByName(SHEET_PRESENCAS) ? ss.getSheetByName(SHEET_PRESENCAS).getDataRange().getValues() : [];
  const contadorPresenca = {};
  if (presencasStr.length > 1) {
    presencasStr.slice(1).forEach(row => {
      // row: Data, Dia Semana, ID Jogador, Nome, Status, Tipo
      let statusCol = row.length >= 6 ? 4 : 3;
      let nomeCol = row.length >= 6 ? 3 : 2;
      if (row[statusCol] === 'Confirmado') {
        const nome = row[nomeCol];
        contadorPresenca[nome] = (contadorPresenca[nome] || 0) + 1;
      }
    });
  }

  const ranking = Object.keys(contadorPresenca)
    .map(nome => ({ nome, total: contadorPresenca[nome] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 5. Estatísticas Básicas
  const statsJogadores = {
    total: jogadores.length,
    mensalistas: numMensalistas,
    avulsos: numAvulsos,
    mediaNivel: (jogadores.reduce((acc, j) => acc + (parseInt(j.nivel) || 0), 0) / (jogadores.length || 1)).toFixed(1)
  };

  // 6. Aniversariantes do Mês (mantido)
  // ... omitted (already inside earlier logic or untouched)
  const hojeDia = dataHoje.getDate();
  const hojeMes = dataHoje.getMonth();
  aniversariantes = jogadores.filter(j => {
    if (!j.dataNascimento) return false;
    let [ano, mes, dia] = j.dataNascimento.split('-');
    return parseInt(dia) === hojeDia && parseInt(mes) === (hojeMes + 1);
  }).map(j => j.nome);

  return {
    statsJogadores,
    financeiro: {
      totalQuadra: arrecadadoMensalistas,
      totalEquipamentos: arrecadadoAvulsos,
      totalGeral: arrecadadoMensalistas + arrecadadoAvulsos,
      saldoEmAberto: saldoEmAberto,
      devedores: devedores.sort((a, b) => b.valor - a.valor)
    },
    ranking,
    niveis: [1,2,3,4,5].map(n => ({
      nivel: n,
      qtd: jogadores.filter(j => parseInt(j.nivel) === n).length
    })),
    aniversariantes
  };
}
