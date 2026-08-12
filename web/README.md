# 🏐 VoleizinDosCria — Web SaaS Application (v2.1)

[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**VoleizinDosCria Web** é a aplicação web Single-Page (SPA) moderna e responsiva para a gestão completa de grupos de vôlei. Desenvolvida em **React + Vite + Tailwind CSS**, ela opera 100% em tempo real e em paridade total com o aplicativo **Mobile (React Native/Expo)** através do **Firebase Cloud Firestore**.

---

## 🚀 Principais Recursos

### 🌐 Sincronização em Tempo Real & Criptografia
- **Multi-Tenancy por Código (`VO-XXXX`)**: Acesso instantâneo a qualquer grupo criado no mobile ou na web.
- **Criptografia AES-256 no Cliente**: Dados sensíveis (nomes, telefones, datas de nascimento, lançamentos) criptografados com a chave secreta do grupo.
- **Auditoria em Tempo Real (`logs_atividades`)**: Feed de histórico com filtro por categoria (SISTEMA, FINANCEIRO, CADASTRO, PRESENÇA).

### 📅 Chamada de Presença por Dia da Semana
- **Navegação por Dias (`Segunda`..`Domingo`)**: Chamada inteligente por dia de treino.
- **Vou / Falto**: Status em tempo real que reflete instantaneamente no aplicativo dos atletas.
- **Cobrança em Massa via WhatsApp**: Notificação direta para o grupo com um clique.

### 🐍 Sorteio de Times Equilibrados (Snake Draft)
- **Equilíbrio Técnico**: Distribuição alternada baseada no nível dos atletas presentes (1 a 5 ⭐).
- **Formatos Flexíveis**: Suporte a times 4x4, 5x5 e 6x6.
- **Copiar para WhatsApp**: Texto formatado com emojis pronto para envio no grupo.

### 💰 Rateio Financeiro & Caixa de Equipamentos
- **Rateio por Dia de Treino**: Divisão do custo da quadra entre os mensalistas cadastrados para aquele dia.
- **Cobrança Individual de Mensalidades**: Links de cobrança direto no WhatsApp.
- **Caixa de Equipamentos**: Controle de entradas e saídas do fundo de materiais (bolas, coletes, redes).

---

## 📦 Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse no navegador: `http://localhost:3000`

### 3. Gerar Build de Produção
```bash
npm run build
```
Os artefatos otimizados serão gerados em `dist/`.

---

## 🛠️ Tecnologias
- **React 19 + Vite 6**
- **Tailwind CSS 3**
- **Firebase Firestore SDK (v11)**
- **Crypto-JS (AES-256)**
- **Lucide React Icons**

> Desenvolvido para a comunidade **VoleizinDosCria** 🏐🔥
