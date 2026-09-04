# <p align="center">🏐 VoleizinDosCria — Multi-Platform 🏐</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" />
</p>

<p align="center">
  <strong>Plataforma Multiplataforma (Mobile App + Web App) para Gestão de Grupos de Vôlei Amador.</strong><br />
  Presença em tempo real por dia da semana, sorteio equilibrado de times por nível, rateios financeiros e caixa de equipamentos com criptografia AES-256.
</p>

---

## 🌟 Estrutura da Plataforma

O repositório está organizado em duas aplicações principais sincronizadas em tempo real via **Firebase Cloud Firestore**:

```text
Volleyball/
├── mobile/            # App Mobile (React Native + Expo + NativeWind)
│   ├── src/           # Componentes, Telas, Contexto e Serviços
│   ├── INSTRUCOES.md  # Guia técnico e build de APK/IPA (EAS)
│   └── README.md      # Documentação do projeto Mobile
│
├── web/               # App Web (Vite + React 19 + Tailwind CSS)
│   ├── src/           # Componentes, Páginas, Contexto e Serviços
│   ├── INSTRUCOES.md  # Guia de execução e deploy Web
│   └── README.md      # Documentação do projeto Web
│
├── codigo.gs          # Versão Legada (Google Apps Script)
├── index.html         # Versão Legada (Vue 3 + GAS)
└── README.md          # Documentação Principal da Plataforma
```

---

## 🚀 Principais Módulos da Plataforma

1. **📱 App Mobile ([`mobile/`](./mobile))**:
  - Desenvolvido em **React Native + Expo SDK 57**.
   - Notificações, suporte a gestos e build nativo Android/iOS via EAS Build.
  - Atualizações JavaScript distribuídas por EAS Update no canal `preview`.
   - Sincronização em tempo real do código do grupo (`VO-XXXX`).

2. **🌐 App Web ([`web/`](./web))**:
   - Desenvolvido em **Vite + React + Tailwind CSS**.
   - Interface Single-Page (SPA) rápida e 100% responsiva para desktop e navegador mobile.
  - Deploy contínuo na Vercel: [voleizindoscria.vercel.app](https://voleizindoscria.vercel.app/).
  - Funcionalidades compartilhadas com o aplicativo mobile via Firestore.

## 🚀 Publicação

- **Web:** cada push na branch `main` atualiza o deploy da Vercel.
- **Mobile OTA:** alterações JavaScript em `mobile/` são publicadas pelo GitHub Actions no canal `preview`.
- **Mobile nativo:** mudanças de SDK, dependências nativas ou configuração exigem uma nova build EAS.

Consulte os guias específicos em [`mobile/INSTRUCOES.md`](./mobile/INSTRUCOES.md) e [`web/INSTRUCOES.md`](./web/INSTRUCOES.md).

---

## � Arquitetura de Deploy Automatizado

A plataforma usa **CI/CD contínuo** com dois pipelines independentes, acionados por push na branch `main`:

```mermaid
flowchart TB
    subgraph DEV["👨‍💻 Desenvolvimento"]
        A["Código-fonte<br/>Monorepo Volleyball/"]
        A --> B["git push<br/>branch main"]
    end

    B --> C{"Arquivos alterados?"}

    subgraph WEB["🌐 Pipeline Web (Vercel)"]
        C -- "web/**" --> D["Vercel detecta push"]
        D --> E["npm install --prefix web"]
        E --> F["npm run build --prefix web<br/>(Vite + React 19)"]
        F --> G["Publica web/dist"]
        G --> H["🌍 voleizindoscria.vercel.app"]
    end

    subgraph MOBILE["📱 Pipeline Mobile (GitHub Actions)"]
        C -- "mobile/**" --> I["Workflow mobile-update.yml"]
        I --> J["npm ci + npm run lint"]
        J --> K["eas update --channel preview"]
        K --> L["📲 OTA via expo-updates<br/>(sem nova build)"]
    end

    subgraph NATIVE["🔧 Build Nativa (manual)"]
        M["Mudança de SDK / nativa /<br/>app.json / permissões"]
        M --> N["eas build --profile preview|production"]
        N --> O["APK / IPA"]
    end

    subgraph DATA["🗄️ Backend (Firebase)"]
        P["Firestore (NoSQL)"]
        Q["Auth + AsyncStorage"]
        R["AES-256 no cliente"]
    end

    H -. "lê/escreve" .-> P
    L -. "lê/escreve" .-> P
    O -. "lê/escreve" .-> P
    P --- Q --- R
```

### Fluxo resumido

| Gatilho | Pipeline | Resultado |
|---|---|---|
| Push `main` com mudanças em `web/**` | Vercel (via `vercel.json`) | Deploy automático da SPA |
| Push `main` com mudanças em `mobile/**` | GitHub Actions (`mobile-update.yml`) | EAS Update OTA no canal `preview` |
| Mudança nativa / SDK / `app.json` | Manual (`eas build`) | Nova build APK/IPA |

> **Regra de ouro:** OTA (EAS Update) só atualiza o JavaScript. Qualquer mudança em SDK, dependências nativas, permissões, ícone ou `app.json` exige uma nova build EAS.

---

## 🧹 Código Limpo e Qualidade

- **Lint obrigatório no CI**: o workflow `mobile-update.yml` executa `npm run lint` (ESLint) antes de publicar qualquer OTA — código com erro não vai para produção.
- **Padrão de pastas consistente**: `screens/`, `components/`, `services/`, `context/`, `config/`, `utils/` espelhados entre `mobile/` e `web/`.
- **Serviços desacoplados**: toda comunicação com o Firestore fica isolada em `services/` (`jogadorService`, `sessionService`, `historyService`), mantendo as telas limpas.
- **Contexto global**: `SessionContext` centraliza o `activeGroupId` e o estado de carregamento, evitando prop-drilling.
- **Criptografia centralizada**: `utils/crypto.js` encapsula AES-256, usado por todos os serviços.

---

## 🔒 Segurança e Multi-Tenancy

- **Multi-Tenancy por Código (`VO-XXXX`)**: Cada grupo gerencia seus atletas e caixa com um código isolado.
- **Criptografia AES-256 no Cliente**: Dados sensíveis (nomes, telefones, datas de nascimento, lançamentos) criptografados com a chave secreta do grupo.
- **Auditoria de Histórico**: Feed de logs gravados no Firestore para acompanhamento de pagamentos e presenças.
- **Regras do Firestore** (`firestore.rules`): toda query exige o filtro `groupId`, garantindo isolamento entre grupos.
- **Segredos fora do código**: credenciais via `.env` (`EXPO_PUBLIC_*` / `VITE_*`) e `EXPO_TOKEN` como secret do GitHub — nunca versionados.

---

## ☕ Apoie o Desenvolvedor

O VoleizinDosCria é **100% gratuito e open source**. Se ele te ajudou a organizar o racha, pague um café pro dev! ❤️

<p align="center">
  <a href="https://www.buymeacoffee.com/hectornetf" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
  </a>
  &nbsp;&nbsp;
  <a href="https://ko-fi.com/hectornet" target="_blank">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Ko-fi" height="50">
  </a>
</p>

---

<p align="center">
  <i>Desenvolvido com ❤️ e voleibol na veia.</i>
</p>
