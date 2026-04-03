# 📋 Guia Técnico de Desenvolvimento — VoleizinDosCria Platform

Este documento define a arquitetura, regras de negócio e padrões de segurança para a plataforma **VoleizinDosCria** (SaaS Multi-Tenancy).

---

## 🏗️ Arquitetura do Sistema

A plataforma foi migrada de uma estrutura fixa para uma arquitetura **SaaS (Software as a Service)** moderna:
- **Frontend**: React Native with Expo (Managed Workflow).
- **Backend**: Firebase Firestore (NoSQL) com isolamento por Grupo.
- **Segurança**: Criptografia AES-256 (Camada de Aplicação).
- **Styling**: NativeWind (Tailwind CSS para Mobile).

---

## 🛡️ Regras de Ouro (Segurança e Privacidade)

### 1. Criptografia AES-256
Todos os dados sensíveis dos jogadores **devem** ser criptografados antes de serem persistidos no Firestore.
- **Campos Obrigatórios**: `nome`, `celular`, `dataNascimento`.
- **Chave de Criptografia**: Composta pela `SECRET_KEY` (no `.env`) + `activeGroupId`. Isso garante que, mesmo em caso de vazamento, os dados de um grupo não possam ser descriptografados sem o ID específico.

**Como usar:**
```javascript
import { encryptData, decryptData } from '../utils/crypto';

// Ao Salvar:
const encrypted = encryptData("Nome do Jogador", activeGroupId);

// Ao Ler:
const plain = decryptData(doc.data().nome, activeGroupId);
```

### 2. Isolamento Multi-Tenancy (SaaS)
Nenhuma query ao Firestore deve ser feita sem o filtro de `groupId`. O `SessionContext` provê o `activeGroupId` globalmente.
- O campo `groupId` deve estar presente em todos os documentos das coleções `jogadores` e `operacoes_financeiras`.

---

## 💻 Padrões de Código

### 1. Linting & Análise Estática
Utilizamos o **ESLint v9 (Flat Config)** para manter a qualidade do código.
- **Executar Análise**: `npm run lint`
- **Regras Críticas**: `no-unused-vars` (Warning) e `no-useless-catch` (Error).

### 2. Estilização (UI Pro)
- Use apenas classes do **NativeWind**.
- Evite `inline styles` a menos que seja para propriedades dinâmicas de animação.
- Siga a paleta de cores *Dark Premium* definida no sistema (Slate 800/900 + Indigo/Cyan/Emerald).

---

## 🚀 Como Rodar o Ambiente de Desenvolvimento

1.  **Instalar Dependências**: `npm install`
2.  **Configurar Variáveis**: Crie um arquivo `.env` baseado no padrão:
    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=...
    EXPO_PUBLIC_ENCRYPTION_KEY=...
    ```
3.  **Iniciar Expo**: `npx expo start`

---

## 📊 Estrutura do Banco de Dados (Firestore)

### Coleção `jogadores`
| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | String (AES) | Nome do jogador (Encriptado) |
| `celular` | String (AES) | Telefone (Encriptado) |
| `groupId` | String | ID do grupo (Ex: VO-XXXX) |
| `nivel` | Number | Ranking técnico (1 a 5) |
| `tipo` | String | `MENSALISTA` ou `AVULSO` |

### Coleção `operacoes_financeiras`
| Campo | Tipo | Descrição |
|---|---|---|
| `tipo` | String | `ENTRADA_AVULSO` ou `SAIDA_DESPESA` |
| `valor` | Number | Valor da operação (Positivo/Negativo) |
| `descricao` | String (AES) | Identificador da transação (Encriptado) |

---

## ✅ Checklist para Novas Funcionalidades
1.  [ ] A nova funcionalidade respeita o filtro de `activeGroupId`?
2.  [ ] Dados sensíveis estão sendo encriptados via `utils/crypto`?
3.  [ ] O layout é responsivo e segue o padrão *Dark Mode*?
4.  [ ] Rodou o `npm run lint` e não há erros?

---

> Propriedade de **VoleizinDosCria Team**. O uso indevido de chaves de criptografia viola as políticas de privacidade de dados.
