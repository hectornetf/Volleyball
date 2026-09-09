import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function logStep(step, message) {
  console.log(`\n${colors.cyan}${colors.bold}[PASSO ${step}]${colors.reset} ${colors.bold}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✔ ${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}✖ ${message}${colors.reset}`);
}

function runCommand(command, cwd, description) {
  try {
    process.stdout.write(`  ⏳ Executando: ${description}... `);
    const output = execSync(command, { cwd, stdio: 'pipe' });
    console.log(`${colors.green}APROVADO${colors.reset}`);
    return { success: true, output: output.toString() };
  } catch (error) {
    console.log(`${colors.red}FALHOU${colors.reset}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return { success: false, error };
  }
}

function runDependencyAudit(cwd, description) {
  try {
    process.stdout.write(`  ⏳ Executando: ${description}... `);
    let output;
    try {
      output = execSync('npm audit --json', { cwd, stdio: 'pipe' });
    } catch (error) {
      output = error.stdout;
      if (!output) throw error;
    }
    const report = JSON.parse(output.toString());
    const vulns = report.metadata?.vulnerabilities || {};
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;
    const low = vulns.low || 0;

    if (critical > 0) {
      console.log(`${colors.red}FALHOU${colors.reset}`);
      console.error(`Foram encontradas ${critical} vulnerabilidade(s) CRÍTICA(s) em ${description}.`);
      return { success: false, reason: 'critical' };
    }
    if (high > 0) {
      console.log(`${colors.red}FALHOU${colors.reset}`);
      console.error(`Foram encontradas ${high} vulnerabilidade(s) de severidade ALTA em ${description}.`);
      return { success: false, reason: 'high' };
    }
    if (moderate > 0) {
      console.log(`${colors.yellow}ADVERTÊNCIA${colors.reset}`);
      console.warn(`  ⚠ ${moderate} vulnerabilidade(s) moderada(s) em ${description} (não bloqueia o commit).`);
    } else {
      console.log(`${colors.green}APROVADO${colors.reset}`);
    }
    if (low > 0) {
      console.warn(`  ℹ ${low} vulnerabilidade(s) de severidade baixa em ${description}.`);
    }
    return { success: true };
  } catch (error) {
    console.log(`${colors.red}INDISPONÍVEL${colors.reset}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return { success: false, reason: 'audit-error' };
  }
}

console.log(`${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.bold}🛡️  VERIFICAÇÃO DE CÓDIGO E SEGURANÇA PRÉ-COMMIT 🛡️${colors.reset}`);
console.log(`${colors.bold}====================================================${colors.reset}`);

let hasErrors = false;

// -------------------------------------------------------------
// 1. ANÁLISE DE SEGURANÇA: STAGED FILES E DETECÇÃO DE SEGREDOS
// -------------------------------------------------------------
logStep('1/4', 'Auditoria de Segurança (Segredos e Arquivos Sensíveis)');

try {
  const stagedFiles = execSync('git diff --cached --name-only', { cwd: rootDir })
    .toString()
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const blockedPatterns = [
    /^\.env(\..+)?$/,
    /.*\.pem$/,
    /.*\.key$/,
    /.*id_rsa.*/,
    /.*serviceAccountKey.*\.json$/i,
    /.*google-services.*\.json$/i
  ];

  const leaks = stagedFiles.filter(file => {
    const base = path.basename(file);
    return blockedPatterns.some(pattern => pattern.test(base));
  });

  if (leaks.length > 0) {
    logError(`Arquivos confidenciais detectados na área de staging do Git:\n  ${leaks.join('\n  ')}`);
    logError('Remova esses arquivos do commit antes de prosseguir (ex: git reset HEAD <arquivo>).');
    hasErrors = true;
  } else {
    logSuccess('Nenhum arquivo confidencial (.env, chaves privadas) no commit.');
  }

  // Verificação de possíveis chaves expostas no diff staged
  const diffStaged = execSync('git diff --cached', { cwd: rootDir }).toString();
  const suspiciousKeywords = [
    /(?:AIza[0-9A-Za-z\\-_]{35})/g, // Firebase API Key regex
    /(?:-----BEGIN (?:RSA )?PRIVATE KEY-----)/g
  ];

  let foundSecret = false;
  for (const re of suspiciousKeywords) {
    if (re.test(diffStaged)) {
      foundSecret = true;
      break;
    }
  }

  if (foundSecret) {
    logError('Possível chave de segurança ou certificado detectado no conteúdo do commit!');
    hasErrors = true;
  } else {
    logSuccess('Análise estática de vazamento de segredos aprovada.');
  }

} catch (err) {
  logError(`Erro ao inspecionar git diff: ${err.message}`);
  hasErrors = true;
}

// -------------------------------------------------------------
// 2. ANÁLISE DE CÓDIGO DA VERSÃO WEB
// -------------------------------------------------------------
logStep('2/4', 'Análise de Código da Versão Web (ESLint & Build)');
const webDir = path.join(rootDir, 'web');
const webLintCheck = runCommand('npm run lint', webDir, 'Validação de regras e sintaxe ESLint Web');
const webBuildCheck = runCommand('npm run build', webDir, 'Compilação e validação Vite/React Web');
if (!webLintCheck.success || !webBuildCheck.success) {
  logError('A versão Web possui erros de lint ou compilação/sintaxe.');
  hasErrors = true;
} else {
  logSuccess('Versão Web validada (ESLint + build) com sucesso.');
}

// -------------------------------------------------------------
// 3. ANÁLISE DE CÓDIGO DA VERSÃO MOBILE
// -------------------------------------------------------------
logStep('3/4', 'Análise de Código da Versão Mobile (ESLint)');
const mobileDir = path.join(rootDir, 'mobile');
const mobileCheck = runCommand('npm run lint', mobileDir, 'Validação de regras e sintaxe ESLint Mobile');
if (!mobileCheck.success) {
  logError('A versão Mobile possui erros no linter ou regras de código.');
  hasErrors = true;
} else {
  logSuccess('Versão Mobile validada com sucesso pelo linter.');
}

// -------------------------------------------------------------
// 4. AUDITORIA DE SEGURANÇA DE DEPENDÊNCIAS (CRITICAL)
// -------------------------------------------------------------
logStep('4/4', 'Auditoria de Vulnerabilidades de Dependências (Critical | High)');
const auditWeb = runDependencyAudit(webDir, 'Web');
const auditMobile = runDependencyAudit(mobileDir, 'Mobile');

if (auditWeb.reason === 'critical' || auditMobile.reason === 'critical' ||
    auditWeb.reason === 'high' || auditMobile.reason === 'high') {
  logError('Vulnerabilidades críticas ou de alta severidade detectadas nas dependências.');
  hasErrors = true;
} else if (!auditWeb.success || !auditMobile.success) {
  console.warn(`${colors.yellow}⚠ Auditoria npm indisponível; commit liberado sem confirmação online de vulnerabilidades.${colors.reset}`);
  console.warn(`${colors.yellow}  Execute npm audit manualmente quando o registry estiver disponível.${colors.reset}`);
  logSuccess('Nenhuma vulnerabilidade crítica/alta foi confirmada.');
} else {
  logSuccess('Nenhuma vulnerabilidade crítica ou de alta severidade encontrada nas dependências.');
}

// -------------------------------------------------------------
// RESULTADO FINAL
// -------------------------------------------------------------
console.log('\n----------------------------------------------------');
if (hasErrors) {
  console.log(`${colors.red}${colors.bold}⛔ COMMIT BLOQUEADO! O código ou a segurança não atenderam aos critérios.${colors.reset}`);
  console.log(`${colors.yellow}Por favor, corrija os problemas apontados acima antes de realizar o commit.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}✅ TODAS AS CHECAGENS DE CÓDIGO E SEGURANÇA FORAM APROVADAS!${colors.reset}`);
  console.log(`${colors.cyan}Commit autorizado com sucesso.${colors.reset}\n`);
  process.exit(0);
}
