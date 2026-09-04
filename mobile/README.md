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

## 🛠️ Stack
- React Native + Expo
- Tailwind CSS (NativeWind)
- Firebase Firestore + AES-256 Crypto

> Projeto desenvolvido pela equipe **Antigravity**. 🏐🔥
