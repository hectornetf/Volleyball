# <p align="center">🏐 VoleizinDosCria — Multi-Platform SaaS 🏐</p>

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

## 🔒 Segurança e Multi-Tenancy

- **Multi-Tenancy por Código (`VO-XXXX`)**: Cada grupo gerencia seus atletas e caixa com um código isolado.
- **Criptografia AES-256 no Cliente**: Dados sensíveis (nomes, telefones, datas de nascimento, lançamentos) criptografados com a chave secreta do grupo.
- **Auditoria de Histórico**: Feed de logs gravados no Firestore para acompanhamento de pagamentos e presenças.

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
