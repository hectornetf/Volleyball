# 📋 Guia Técnico de Desenvolvimento — VoleizinDosCria Platform

Este documento define a arquitetura, regras de negócio e padrões de segurança para a plataforma **VoleizinDosCria** (SaaS Multi-Tenancy).

---

## 🏗️ Arquitetura do Sistema

A plataforma utiliza uma arquitetura **SaaS (Software as a Service)** moderna:
- **Frontend**: React Native with Expo SDK 57 (Managed Workflow).
- **Backend**: Firebase Firestore (NoSQL) com isolamento por Grupo.
- **Segurança**: Criptografia AES-256 (Camada de Aplicação).
- **Styling**: NativeWind (Tailwind CSS para Mobile).

---

## 🛠️ Passo a Passo: Configuração Inicial

Para rodar este projeto pela primeira vez, siga estas etapas:

### 1. Criar Projeto no Firebase
1. Vá ao [Firebase Console](https://console.firebase.google.com/) e clique em **Adicionar Projeto**.
2. No menu lateral, clique em **Build > Cloud Firestore** e clique em **Criar banco de dados**.
3. Em **Regras de Segurança**, use o conteúdo do arquivo `firestore.rules` que está na raiz desta pasta mobile.

### 2. Registrar o App (Obter Credenciais)
1. No console do Firebase, clique no ícone de **Web (</>)** para adicionar um app.
2. Copie o objeto `firebaseConfig` que aparecerá. Você usará esses valores no seu `.env`.

### 3. Configurar Variáveis de Ambiente (.env)
Crie um arquivo chamado `.env` na raiz da pasta `mobile/`:

```env
# Configurações do Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Chave de Criptografia (Mantenha em segredo!)
EXPO_PUBLIC_ENCRYPTION_KEY=sua_chave_aqui
```

### 4. Índices do Firestore (Obrigatório)
Para que a aba de **Histórico** funcione, crie o índice composto no console:
- **Coleção**: `logs_atividades`
- **Campos**: `groupId` (Ascending) + `createdAt` (Descending)

---

## 🛡️ Regras de Ouro (Segurança e Privacidade)

### 1. Criptografia AES-256
Dados sensíveis dos jogadores **devem** ser criptografados.
- **Campos Encriptados**: `nome`, `celular`, `dataNascimento` (na col. jogadores) e `descricao` (nas finanças).

### 2. Isolamento Multi-Tenancy
Nenhuma query deve ser feita sem o filtro de `groupId`. O `SessionContext` provê o `activeGroupId` globalmente.

---

## 📊 Estrutura do Banco de Dados (Firestore)

### Coleção `jogadores`
| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | String (AES) | Nome do jogador |
| `groupId` | String | ID do grupo (Ex: VO-XXXX) |
| `tipo` | String | `MENSALISTA` ou `AVULSO` |
| `status` | String | `Ativo` ou `Inativo` (Filtra presenças) |

### Coleção `operacoes_financeiras`
| Campo | Tipo | Descrição |
|---|---|---|
| `tipo` | String | `ENTRADA_AVULSO`, `SAIDA_DESPESA`, etc. |
| `valor` | Number | Valor da operação |
| `groupId` | String | Vínculo com o grupo |

### Coleção `logs_atividades` (Novo)
| Campo | Tipo | Descrição |
|---|---|---|
| `categoria` | String | `FINANCEIRO`, `CADASTRO`, `PRESENÇA`, `SISTEMA` |
| `descricao` | String | Texto amigável da ação |
| `createdAt` | Timestamp | Data/Hora para ordenação oficial |
| `groupId` | String | Vínculo com o grupo |

### Coleção `config_financeira` (Novo)
| Campo | Tipo | Descrição |
|---|---|---|
| ID Documento | String | Formato: `{groupId}_{Mês}` (Ex: VO-123_Janeiro 2026) |
| `Segunda..Domingo` | Number | Custo fixo da quadra por dia da semana |
| `Avulso` | Number | Valor padrão da diária |

---

## 📦 Como Gerar APK (Android) e IPA (iOS)

Para gerar os arquivos de instalação final, utilizamos o **EAS Build**.

### 1. Login
```bash
npx eas-cli login
```

### 2. Configuração do Projeto
Execute na pasta `mobile/`:
```bash
npx eas-cli@latest project:info
```

### 3. Comandos de Geração
- **Android (APK de Teste)**: `npx eas-cli build --platform android --profile preview`
- **Android (Play Store)**: `npx eas-cli build --platform android --profile production`
- **iOS (IPA)**: `npx eas-cli build --platform ios` (Requer conta Apple Developer)

O projeto EAS atual é `@hectornetf/voleizin-dos-cria`. O perfil `preview` usa o canal `preview` e gera uma build para distribuição interna.

### 4. Atualizações automáticas (EAS Update)

Após instalar uma build configurada com `expo-updates`, pushes na branch `main` que alterarem `mobile/` publicam automaticamente o JavaScript pelo workflow `.github/workflows/mobile-update.yml`. O workflow usa o secret `EXPO_TOKEN` do GitHub e publica no canal `preview`.

Atualizações OTA não substituem uma nova build quando houver alterações em SDK, dependências nativas, permissões, ícone, `app.json` ou código nativo.

---

## 🚀 Comandos Úteis
- `npm install`: Instala dependências.
- `npx expo start -c`: Inicia o app limpando o cache.
- `npm run lint`: Verifica qualidade do código.
- `npx -y expo-doctor`: Verifica dependências e configuração do Expo.

> Propriedade de **VoleizinDosCria Team**. v2.1 (Abril 2026).
