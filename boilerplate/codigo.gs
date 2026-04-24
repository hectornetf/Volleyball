/**
 * BOILERPLATE VOLEIZIN PRO
 * Backend: Google Apps Script
 */

// --- CONFIGURAÇÃO DE ABAS ---
const SHEET_JOGADORES = 'Jogadores';
const SHEET_PAGAMENTOS = 'Pagamentos';
const SHEET_DATABASE = 'Database'; // Aba genérica para configurações

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Seu Projeto Voleizin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- SETUP INICIAL ---
function setupInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const abas = [
    { nome: SHEET_JOGADORES, colunas: ['ID', 'Nome', 'Telefone', 'Nível', 'Tipo', 'Nascimento'] },
    { nome: SHEET_PAGAMENTOS, colunas: ['ID_Jogador', 'Nome', 'Dia', 'Mês/Ano', 'Valor', 'Status'] }
  ];

  abas.forEach(aba => {
    if (!ss.getSheetByName(aba.nome)) {
      let sheet = ss.insertSheet(aba.nome);
      sheet.appendRow(aba.colunas).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    }
  });
}

// --- CORE LOGIC: SORTEIO (BOILERPLATE) ---
function sortearTimes(jogadores) {
  // Implementação de Snake Draft aqui
  // Use o Framework /voleizincoscria como referência técnica
  return []; 
}

// --- CORE LOGIC: FINANCEIRO (BOILERPLATE) ---
function calcularRateio(dados) {
  // Implementação de Rateio Proporcional aqui
  return {};
}

// --- DATA FETCHING ---
function getJogadores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_JOGADORES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove cabeçalho
  return data.map(row => ({
    id: String(row[0]),
    nome: row[1],
    telefone: row[2],
    nivel: row[3],
    tipo: row[4]
  }));
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}
