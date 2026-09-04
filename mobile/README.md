# 🏐 VoleizinDosCria — SaaS Platform (v2.1)

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**VoleizinDosCria** é uma plataforma **SaaS (Software as a Service)** de alta performance para a gestão completa de grupos de vôlei, desenvolvida com **Expo SDK 57**.

---

## 🚀 Diferenciais da Plataforma

### 💎 Gestão SaaS e Auditoria
- **Histórico Completo**: Cada ação (pagamento, cadastro, presença) gera um log de auditoria em tempo real.
- **Isolamento de Dados**: Cada grupo possui seu próprio espaço seguro no banco de dados.

### 💰 Inteligência Financeira
- **Rateio Automático**: O sistema calcula o valor por pessoa dividindo o custo de cada dia apenas pelos mensalistas ativos cadastrados naquele dia. Dias sem custo não entram no rateio.
- **Fundo de Equipamentos**: Gestão separada para compra de bolas e materiais.

### 🐍 Sorteio Balanceado (Snake Draft)
- **Equilíbrio Técnico**: Algoritmo que distribui jogadores de elite e iniciantes de forma alternada para garantir jogos competitivos.

---

## 📦 Setup Rápido

1. `npm install`
2. Configure o `.env` (veja `INSTRUCOES.md`)
3. `npx expo start -c`

Para testar no celular, use o Expo Go compatível com SDK 57 ou gere uma build própria. O projeto está vinculado ao EAS como `@hectornetf/voleizin-dos-cria`.

## Atualizações e builds

- Pushes na `main` que alteram `mobile/` publicam EAS Update automaticamente no canal `preview`.
- A instalação inicial deve ser uma build EAS do perfil `preview`.
- Mudanças nativas exigem uma nova build Android ou iOS.

```bash
npx eas-cli@latest build --platform android --profile preview
```

---

## � Deploy Automatizado (CI/CD)

```mermaid
flowchart LR
    A["💻 Código<br/>mobile/"] --> B["git push main"]
    B --> C{"Mudou<br/>mobile/**?"}
    C -- "Sim" --> D["GitHub Actions<br/>mobile-update.yml"]
    D --> E["npm ci"]
    E --> F["npm run lint ✅"]
    F --> G["eas update<br/>--channel preview"]
    G --> H["📲 OTA no app<br/>(expo-updates)"]

    C -- "Mudança nativa / SDK / app.json" --> I["eas build<br/>--profile preview|production"]
    I --> J["📦 APK / IPA"]

    H -. "Firestore" .-> K[("🗄️ Firebase")]
    J -. "Firestore" .-> K
```

> **Regra:** OTA atualiza só o JavaScript. SDK, dependências nativas, permissões, ícone ou `app.json` exigem nova build.

---

## 🧹 Código Limpo

- **Lint no CI**: `npm run lint` (ESLint) roda antes de publicar qualquer OTA.
- **Estrutura organizada**: `screens/`, `components/`, `services/`, `context/`, `config/`, `utils/`.
- **Serviços desacoplados**: Firestore isolado em `services/` (`jogadorService`, `sessionService`, `historyService`).
- **Contexto global**: `SessionContext` centraliza `activeGroupId` e estado de carregamento.

## 🔒 Segurança

- **AES-256 no cliente** via `utils/crypto.js` (nomes, telefones, datas, lançamentos).
- **Multi-Tenancy**: toda query exige `groupId` (`firestore.rules`).
- **Segredos no `.env`** (`EXPO_PUBLIC_*`) e `EXPO_TOKEN` como secret do GitHub — nunca versionados.

---

## 🛠️ Stack
- React Native + Expo SDK 57
- Tailwind CSS (NativeWind)
- Firebase Firestore (v12) + AES-256 Crypto

> Projeto desenvolvido pela equipe **Antigravity**. 🏐🔥
