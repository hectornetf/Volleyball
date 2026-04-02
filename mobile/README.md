# 🏐 VoleizinDosCria Mobile

Aplicativo móvel de alta performance para gestão de grupos de vôlei, sorteio de times equilibrados e controle financeiro em tempo real. Desenvolvido para substituir sistemas baseados em planilhas, oferecendo uma experiência nativa e segura.

## 🚀 Tecnologias Utilizadas

- **Framework:** React Native + Expo (SDK 50+)
- **Estilização:** TailwindCSS (via NativeWind)
- **Banco de Dados:** Firebase Cloud Firestore (Tempo Real)
- **Autenticação:** Firebase Auth (E-mail/Senha)
- **Design:** Glassmorphism & Dark Mode Premium

## 📦 Como Instalar e Rodar

### 1. Pré-requisitos
- Node.js instalado
- Celular com o app **Expo Go** (disponível na Play Store/App Store)

### 2. Configuração do Ambiente
Clone o repositório e entre na pasta do mobile:
```bash
cd mobile
npm install
```

Crie um arquivo `.env` na raiz da pasta `mobile` e adicione suas chaves do Firebase (exemplo abaixo):
```env
EXPO_PUBLIC_FIREBASE_API_KEY=SUA_CHAVE
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=SEU_DOMINIO
EXPO_PUBLIC_FIREBASE_PROJECT_ID=SEU_PROJETO
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=SEU_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=SEU_ID
EXPO_PUBLIC_FIREBASE_APP_ID=SEU_APP_ID
```

### 3. Rodar o Aplicativo
```bash
npx expo start
```
Escaneie o QR Code gerado com o seu celular.

## 🛡️ Camada de Segurança
As abas **Financeiro** e **Admin** são protegidas por autenticação. No primeiro acesso, ao tentar logar com um e-mail novo, o app oferecerá a opção de registrar como a conta "Dono da Pelada".

---

## 🛠️ Funcionalidades Principais

1.  **Dashboard Social:** Resumo de quem confirmou presença no dia.
2.  **Presença Inteligente:** Marcação rápida de "Vou/Falto" com trava para avulsos devedores.
3.  **Sorteio Snake Draft:** Algoritmo que balanceia os times cruzando os melhores jogadores (Nível 5) primeiro.
4.  **Fechamento de Caixa:** Cálculo automático de rateio da quadra e fundo de equipamentos (bolas/materiais).
5.  **Admin:** Cadastro e edição de elenco vitalício.
