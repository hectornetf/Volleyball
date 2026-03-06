# 🏐 VoleizinDosCria

Sistema de gestão para grupos de vôlei amador, desenvolvido com **Google Apps Script** e **Vue.js**, usando **Google Sheets** como banco de dados.

---

## 📋 Visão Geral

O VoleizinDosCria organiza tudo do seu grupo de vôlei em um único link:
- Cadastro e gerenciamento de jogadores
- Chamada e confirmação de presença por jogo
- Sorteio de times equilibrados
- Fechamento financeiro mensal (rateio, mensalidades, avulsos)
- Separação inteligente de verbas (quadra vs. equipamentos)

---

## 🏗️ Arquitetura

| Componente | Tecnologia |
|---|---|
| Backend / Lógica | Google Apps Script (`codigo.gs`) |
| Frontend / UI | HTML + Vue.js 3 + Tailwind CSS (`index.html`) |
| Banco de Dados | Google Sheets (abas dedicadas por entidade) |
| Hospedagem | Google Apps Script Web App |

### Abas da Planilha

| Aba | Descrição |
|---|---|
| `Jogadores` | Cadastro de todos os jogadores (ID, Nome, Telefone, Nível, Tipo) |
| `Presenças_Seg` | Presenças de cada jogo de **Segunda-feira** (com data exata) |
| `Presenças_Sex` | Presenças de cada jogo de **Sexta-feira** (com data exata) |
| `Pagamentos` | Histórico de todos os pagamentos (mensalistas e avulsos) |
| `Config_Financeira` | Custos mensais configurados pelo organizador |

---

## 👥 Tipos de Jogadores

### Mensalista
Jogador fixo que paga uma **mensalidade proporcional** ao custo da quadra.
- Pode ser de **Segunda**, **Sexta** ou **ambos os dias**.
- Tipos aceitos: `Mensalista Seg`, `Mensalista Sex`, `Mensalista Seg e Sex`, `MENS`.
- Seu pagamento é registrado por **Mês/Ano** (ex: `03/2026`).

### Avulso
Jogador visitante que paga **R$ 10,00 fixo por jogo**.
- Tipo: `Avulso` ou `Apenas Avulso`.
- **Regra de negócio:** O botão **"Vou"** fica bloqueado até que o pagamento seja confirmado pelo organizador.
- Seu pagamento é registrado com a **data exata do jogo** (ex: `06/03/2026`).
- O valor pago vai para a **Caixa de Equipamentos**, separado da verba da quadra.

---

## 💰 Regras Financeiras

### Arrecadação para a Quadra (Mensalistas)
- O organizador informa o **custo total de cada dia** (Segunda e/ou Sexta) mensalmente.
- O sistema divide o custo proporcionalmente entre todos os **mensalistas** do respectivo dia.
- **Fórmula:** `Valor por pessoa = Custo do Dia ÷ Número de Mensalistas`.
- O status do mês é **"Em Aberto"** até que a soma dos pagamentos dos mensalistas cubra o custo total, quando passa para **"Pago Totalmente"**.

### Caixa de Equipamentos (Avulsos)
- Todo pagamento de **R$ 10,00** de avulso vai direto para a **Caixa de Equipamentos**.
- Este valor é completamente **separado** do custo da quadra.
- O organizador pode usar este fundo para comprar bolas, coletes, redes, etc.

### Resumo Visual no App (Aba Financeiro)
| Card | O que mostra |
|---|---|
| **Arrecadação p/ Quadra** | Total pago pelos mensalistas vs. status (Em Aberto / Pago Totalmente) |
| **Rateio Mensalistas** | Meta total de custo e quanto já foi arrecadado |
| **Caixa de Equipamentos** | Valor acumulado vindo dos pagamentos de avulsos |

---

## 📅 Ciclo de um Jogo (Chamada)

A aba **Chamada** funciona por data exata do jogo.

1. O app detecta automaticamente se é dia de **Segunda** ou **Sexta** e calcula a próxima data.
2. Para cada jogo, é registrada uma lista de presença **independente** na planilha.
3. **Mensalistas:** podem clicar em "Vou" ou "Falto" diretamente.
4. **Avulsos:** devem primeiro receber o pagamento de R$ 10 confirmado pelo organizador antes de poder confirmar presença.
5. Ao mudar de dia (Segunda ↔ Sexta), a chamada é recarregada para a data correta.

---

## 🔀 Sorteio de Times

- O organizador define o número de jogadores por time (4 a 8).
- O algoritmo sorteia times balanceados com base no **nível de habilidade** (1 a 5 estrelas) de cada jogador confirmado.
- O resultado pode ser enviado ao grupo pelo **WhatsApp**.

---

## 📲 Notificações WhatsApp

| Função | Descrição |
|---|---|
| **Cobrar Presença** | Envia mensagem com link do app para o grupo confirmar presença |
| **Cobrar Individual** | Envia mensagem privada ao jogador com o valor do rateio |
| **Enviar Times** | Envia os times sorteados para o grupo |

---

## 🚀 Como Configurar (1ª vez)

1. Crie uma cópia da planilha Google Sheets.
2. No menu **Extensões > Apps Script**, cole o conteúdo de `codigo.gs`.
3. Na mesma editora, clique em **+** (novo arquivo HTML) e cole o conteúdo de `index.html`.
4. Execute a função `setupInicial()` uma vez para criar todas as abas necessárias.
5. Clique em **Implantar > Nova Implantação** para gerar o link público do app.

---

## 🔧 Como Atualizar (após mudanças no código)

1. Copie o código atualizado de `codigo.gs` e `index.html` para o editor do Apps Script.
2. Clique em **Implantar > Gerenciar implantações > ✏️ Editar**.
3. Selecione **"Nova versão"** e clique em **Implantar**.
4. O link permanece o mesmo, mas o código é atualizado.

---

## 📁 Estrutura dos Arquivos

```
Volleyball/
├── codigo.gs        # Backend: todas as funções do Google Apps Script
├── index.html       # Frontend: UI completa em Vue.js + Tailwind CSS
├── INSTRUCOES.md    # Instruções detalhadas de uso
└── README.md        # Este arquivo
```

---

## 🛡️ Segurança e Permissões

- O app usa `HtmlService.XFrameOptionsMode.ALLOWALL` para compatibilidade de embed.
- O acesso à planilha é restrito ao proprietário da conta Google que fez o deploy.
- O link público permite acesso, mas as operações passam pelo Apps Script autenticado.
