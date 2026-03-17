# <p align="center">🏐 VoleizinDosCria 🏐</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Apps_Script-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" />
</p>

<p align="center">
  <strong>O sistema definitivo para gestão de grupos de vôlei amador — 100% gratuito e na nuvem.</strong><br />
  Transforma o Google Sheets em um Dashboard inteligente com presença, times, finanças e WhatsApp integrados.
</p>

<p align="center">
  <img src="./demo_voleizin.gif" alt="Preview do VoleizinDosCria" width="380">
</p>

> **Demo:** Interface real do Web App rodando via Google Apps Script. Siga o [INSTRUCOES.md](./INSTRUCOES.md) para configurar o seu próprio painel em minutos.

---

## 🌟 Visão Geral

**VoleizinDosCria** resolve o caos da organização de vôlei amador: listas de presença no WhatsApp, rateios manuais, times desequilibrados e cobrança esquecida. Com uma interface **Glassmorphism Dark Mode**, backend em Google Apps Script e suporte a qualquer dia da semana, ele centraliza tudo que um administrador de racha precisa — num app responsivo que funciona direto do celular.

**Custo:** R$ 0,00. Hospedado 100% no Google.

---

## 🚀 Funcionalidades

### 📊 Dashboard Analítico
- **Visão do elenco:** Total de jogadores, divisão entre mensalistas e avulsos
- **Saúde financeira:** Arrecadação acumulada com barras de progresso separando receita da quadra e caixa de equipamentos
- **Ranking de assiduidade:** Top 5 presenças do mês
- **Equilíbrio técnico:** Distribuição de níveis (⭐1 a ⭐5) do grupo

### 📅 Chamada Inteligente e Multi-Dia
- Suporte a **qualquer dia da semana** — não fica limitado a Segunda/Sexta
- O app detecta automaticamente o dia atual e já seleciona o card correto
- Status em tempo real: **Vou / Falto** com recálculo instantâneo de confirmados
- **Trava financeira:** Avulsos só podem confirmar presença após o pagamento da diária ser registrado
- Botão de cobrança em massa via WhatsApp

### 🔀 Sorteio Inteligente de Times (Algoritmo Híbrido)
- Jogadores **nível 3, 4 e 5** distribuídos via *Snake Draft* para equilibrar a base técnica
- Jogadores **nível 1 e 2** distribuídos por rodízio adaptativo, garantindo que nunca fiquem concentrados no mesmo time
- Compartilhamento dos times formatados diretamente no WhatsApp

### 💰 Inteligência Financeira Completa
- **Valor do avulso configurável por mês** — defina livremente quanto cobrar, sem valor fixo
- **Rateio automático dos mensalistas** por dia de treino (cada dia tem seu custo independente)
- **Fundo de Equipamentos:** receita dos avulsos vai para um caixa separado, nunca se mistura com o custo da quadra
- Listagem dos devedores do mês com link de cobrança individual no WhatsApp
- Botão de salvar configurações sem precisar fazer o fechamento completo

### 🔒 Privacidade e Segurança
- Telefones e datas de nascimento são **mascarados** na tela de edição (`(11) *****-1234`)
- Campo de telefone com **máscara automática** e validação de DDD + número
- Dados sensíveis só armazenados no Google Sheets da conta do administrador

---

## 📂 Estrutura do Projeto

```text
├── codigo.gs          # Backend — API hospedada no Google Apps Script
├── index.html         # Frontend — Vue 3 + TailwindCSS (app Single-Page)
├── demo_voleizin.gif  # Preview animado para o README
├── README.md          # Documentação principal
└── INSTRUCOES.md      # Guia de instalação passo a passo com imagens
```

---

## 🛠️ Guia Rápido de Instalação

> Para o guia completo e ilustrado, veja [INSTRUCOES.md](./INSTRUCOES.md).

1. Acesse **[sheets.new](https://sheets.new)** e crie uma planilha em branco
2. Clique em **Extensões > Apps Script**
3. Cole o conteúdo de `codigo.gs` no arquivo `Código.gs` e crie um arquivo HTML chamado `index` com o conteúdo de `index.html`
4. Execute a função **`setupInicial()`** para criar as abas da planilha
5. Clique em **Implantar > Nova Implantação > App da Web** com acesso para **Qualquer pessoa**
6. Copie o link gerado — esse é o seu sistema! 🎉

---

## 🧪 Dados de Teste

Para testar o sistema sem inserir dados manualmente, execute a função **`gerarDadosDeTeste()`** no Apps Script. Ela cria automaticamente:
- **12 jogadores** fictícios (8 mensalistas + 4 avulsos, níveis 1 a 5)
- **Presenças** para o dia atual com todos confirmados
- **Pagamentos** dos avulsos já registrados
- **Configuração financeira** do mês atual pronta

---

## 🎨 Interface e UX

- **Dark Mode** com estética Glassmorphism e acentos em Emerald, Cyan, Purple, Amber e Rose
- **Totalmente responsivo** — funciona perfeitamente em celular, tablet e desktop
- **PWA nativo** — pode ser adicionado à tela inicial do celular como um app
- Micro-animações e transições suaves para uma experiência premium

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
