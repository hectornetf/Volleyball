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
- Notificações direto pelo WhatsApp

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
| `Presenças_Seg` | Presenças de cada jogo de **Segunda-feira** (data exata) |
| `Presenças_Sex` | Presenças de cada jogo de **Sexta-feira** (data exata) |
| `Pagamentos` | Histórico permanente de pagamentos com campo `Status` (Pago / Cancelado) |
| `Config_Financeira` | Custos mensais e status do fechamento (Em Aberto / Pago Totalmente) |

---

## 👥 Tipos de Jogadores

### Mensalista
Jogador fixo que paga uma **mensalidade proporcional** ao custo da quadra.
- Pode ser de **Segunda**, **Sexta** ou **ambos os dias**.
- Tipos aceitos: `Mensalista Seg`, `Mensalista Sex`, `Mensalista Seg e Sex`, `MENS`.
- Pagamento registrado por **Mês/Ano** (ex: `03/2026`).

### Avulso
Jogador visitante que paga **R$ 10,00 fixo por jogo**.
- Tipo: `Avulso` ou `Apenas Avulso`.
- **Regra:** O botão **"Vou"** fica bloqueado até o pagamento ser confirmado pelo organizador.
- Pagamento registrado com a **data exata do jogo** (ex: `06/03/2026`).
- O valor vai para a **Caixa de Equipamentos**, separado da verba da quadra.

---

## 💰 Regras Financeiras

### Arrecadação para a Quadra (Mensalistas)
- O organizador informa o **custo total de cada dia** (Segunda e/ou Sexta) mensalmente.
- O sistema divide o custo entre todos os **mensalistas** do respectivo dia.
- **Fórmula:** `Valor por pessoa = Custo do Dia ÷ Número de Mensalistas`
- Status do mês: **"Em Aberto"** → **"Pago Totalmente"** conforme pagamentos são confirmados.

### Caixa de Equipamentos (Avulsos)
- Todo R$ 10,00 pago por avulso vai para a **Caixa de Equipamentos**.
- Valor completamente **separado** do custo da quadra.
- Usado pelo organizador para comprar bolas, redes, coletes, etc.

### Resumo Visual — Aba Financeiro

| Card | O que mostra |
|---|---|
| **Arrecadação p/ Quadra** | Total pago pelos mensalistas + status do mês |
| **Rateio Mensalistas** | Meta de custo e quanto já foi arrecadado |
| **Caixa de Equipamentos** | Valor acumulado dos pagamentos de avulsos |

### Histórico de Pagamentos
- Pagamentos **nunca são deletados** da planilha — ficam registrados para histórico.
- Ao desmarcar um pagamento, o campo `Status` alterna entre `Pago` e `Cancelado`.
- Apenas pagamentos com `Status = Pago` são contabilizados no fechamento.

### Fechamento Automático
- Quando **todos os mensalistas** de um mês pagam, o app exibe uma notificação de conclusão e **limpa a tela automaticamente** após 3,5 segundos.
- A configuração e os pagamentos permanecem salvos na planilha como histórico permanente.
- O botão **"Corrigir / Refazer Cálculo"** só deve ser usado em caso de erro de lançamento.

---

## 📅 Ciclo de um Jogo (Chamada)

A aba **Chamada** funciona por data exata do jogo.

1. O app detecta automaticamente se é dia de **Segunda** ou **Sexta** e calcula a próxima data.
2. Para cada jogo, é registrada uma lista de presença **independente** na planilha.
3. **Mensalistas:** podem clicar em "Vou" ou "Falto" diretamente.
4. **Avulsos:** devem ter o pagamento de R$ 10 confirmado antes de poder confirmar presença.
5. Ao mudar de dia (Segunda ↔ Sexta), a chamada é recarregada para a data correta.

---

## 🔀 Sorteio de Times

- O organizador define o número de jogadores por time (4 a 8).
- O algoritmo usa **Snake Draft** com base no **nível de habilidade** (1 a 5 ⭐) para balancear os times.
- O resultado pode ser enviado ao grupo pelo **WhatsApp**.

---

## 📲 Notificações WhatsApp

| Função | Descrição |
|---|---|
| **Cobrar Presença** | Envia link público do app para o grupo confirmar presença |
| **Cobrar Individual** | Envia mensagem privada ao jogador com o valor do rateio |
| **Cobrar Todos (Seg/Sex)** | Envia mensagem de cobrança para o grupo de mensalistas |
| **Enviar Times** | Envia os times sorteados para o grupo |

> **Nota:** o link enviado na notificação de presença é sempre a URL pública do webapp (não a URL interna do Google Apps Script).

---

## 🚀 Como Configurar (1ª vez)

1. Crie uma planilha no **Google Sheets**.
2. No menu **Extensões > Apps Script**, cole o conteúdo de `codigo.gs`.
3. Na mesma editora, crie um arquivo HTML chamado `index` e cole o conteúdo de `index.html`.
4. Execute a função `setupInicial()` uma vez para criar todas as abas necessárias.
5. Clique em **Implantar > Nova Implantação** como **"App da Web"**:
   - Execute como: **Você (sua conta)**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie o link gerado — esse é o link permanente do app.

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
- O link público permite acesso, mas todas as operações passam pelo Apps Script autenticado.
- A URL pública do app é obtida via `ScriptApp.getService().getUrl()` para garantir o link correto nas notificações.
