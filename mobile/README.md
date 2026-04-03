# 🏐 VoleizinDosCria — SaaS Platform (v2.0)

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Firebase](https://img.badge.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**VoleizinDosCria** é uma plataforma **SaaS (Software as a Service)** de alta performance para a gestão completa de grupos de vôlei. Diferente de sistemas comuns, ele oferece **isolamento total de dados**, **privacidade máxima com criptografia AES-256** e uma experiência de usuário **Premium Dark Mode**.

---

## 🚀 Diferenciais da Plataforma (UX Pro)

### 💎 Experiência SaaS sem Barreiras
- **Acesso por Código**: Esqueça formulários de cadastro e senhas esquecidas. Basta digitar ou criar um código exclusivo (ex: `VO-887V`) para gerenciar seu vôlei instantaneamente.
- **Colaboração em Tempo Real**: Vários administradores podem usar o mesmo código para gerenciar o grupo simultaneamente.

### 🔐 Privacidade Blindada (AES-256)
- **Criptografia na Origem**: Nome e Celular dos jogadores são encriptados antes de sair do celular e salvos como "hashes" no Firebase. Somente quem possui o código do grupo pode ler os dados.
- **Multi-Tenancy**: Cada vôlei vive em seu próprio "container" lógico, garantindo que os dados nunca se cruzem.

### ⚡ Funcionalidades Inteligentes
- **Convite Express via WhatsApp**: Gere e envie links de convite com o código do grupo em um só clique.
- **Fundo de Equipamentos (Caixa)**: Gestão financeira automática que separa o custo da quadra (mensalistas) do fundo para bolas e materiais (avulsos).
- **Sorteio Snake Draft**: Algoritmo de balanceamento que cruza níveis técnicos para garantir jogos equilibrados.
- **UX Nativo**: Pull-to-refresh em todas as telas, teclados inteligentes e animações fluidas.

---

## 📦 Como Instalar e Rodar

### 1. Pré-requisitos
- Node.js instalado
- App **Expo Go** no celular
- Projeto configurado no **Firebase (Firestore)**

### 2. Setup do Projeto
```bash
git clone https://github.com/hectornetf/Volleyball.git
cd mobile
npm install
```

### 3. Configuração de Variáveis (`.env`)
Crie um arquivo `.env` na raiz da pasta `mobile` e preencha conforme o modelo:
```env
# Firebase Config
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
# ... (demais chaves do firebase)

# Camada de Segurança
EXPO_PUBLIC_ENCRYPTION_KEY=SuaChaveMestreSecretaAqui
```

### 4. Iniciar Servidor
```bash
npx expo start
```

---

## 🛠️ Stack Tecnológica
- **Linguagem:** Javascript (ES6+)
- **UI:** NativeWind (Tailwind CSS) + Lucide Icons
- **Backend:** Firebase Cloud Firestore + AES-JS Library
- **Análise:** ESLint v9 + Prettier

---

## 🤝 Contribuições e Suporte
Se o **VoleizinDosCria** ajudou o seu grupo, considere apoiar o projeto:

<p align="center">
  <a href="https://www.buymeacoffee.com/hectornetf" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="45">
  </a>
</p>

---
*Transformando o vôlei amador em uma experiência profissional.* 🏐🔥 
> Projeto desenvolvido pela equipe **Antigravity (Google Deepmind)**.
