# 📋 Guia Completo de Instalação — VoleizinDosCria

> Siga os passos abaixo para ter seu sistema de vôlei funcionando em menos de 10 minutos, 100% de graça no Google.

---

## Pré-requisitos

- Uma conta Google (Gmail)
- Acesso ao [Google Drive](https://drive.google.com) e [Google Sheets](https://sheets.google.com)
- Os arquivos `codigo.gs` e `index.html` deste repositório

---

## Passo 1 — Criar a Planilha

1. Acesse **[sheets.new](https://sheets.new)** ou abra o Google Drive e clique em **Novo > Planilhas Google**
2. Dê um nome para ela (ex: *VoleizinDosCria*)

---

## Passo 2 — Abrir o Editor de Scripts

1. Na planilha recém-criada, clique no menu superior em **Extensões > Apps Script**
2. Uma nova aba se abrirá com o editor de código

---

## Passo 3 — Inserir o Código Backend

1. No editor, você verá um arquivo chamado **`Código.gs`** com uma função vazia
2. **Selecione tudo** (Ctrl+A) e apague
3. **Cole o conteúdo completo** do arquivo `codigo.gs` deste repositório
4. Salve com **Ctrl+S** ou clicando no ícone 💾

---

## Passo 4 — Inserir a Interface Visual (HTML)

1. No painel lateral esquerdo (lista de arquivos), clique no botão **➕ (Adicionar arquivo)**
2. Escolha **HTML**
3. Digite exatamente **`index`** como nome (sem o `.html`) e pressione Enter
4. **Selecione tudo** o que aparece no novo arquivo e apague
5. **Cole o conteúdo completo** do arquivo `index.html` deste repositório
6. Salve com **Ctrl+S** 💾

---

## Passo 5 — Criar as Abas da Planilha

1. No editor, clique no campo **"Selecionar função"** no topo (onde diz algo como `myFunction`)
2. Escolha **`setupInicial`** na lista
3. Clique no botão ▶️ **Executar**

### ⚠️ Permissões (só na primeira vez)

O Google pedirá permissão para acessar sua planilha. Siga estes passos:
1. Clique em **Examinar permissões**
2. Selecione sua conta Google
3. Clique em **Avançado** (link no canto inferior esquerdo)
4. Clique em **Acessar [nome do projeto] (não seguro)**
5. Clique em **Permitir**

> Essas permissões são necessárias para que o script leia e escreva na sua planilha. Nenhum dado é enviado para fora da sua conta Google.

Após executar, volte na sua planilha e veja que foram criadas automaticamente as abas:
- `Jogadores`
- `Presenças_Geral`
- `Pagamentos`
- `Config_Financeira`

---

## Passo 6 — (Opcional) Gerar Dados de Teste

Se quiser testar o sistema com dados fictícios antes de usar de verdade:

1. No campo **"Selecionar função"**, escolha **`gerarDadosDeTeste`**
2. Clique em ▶️ **Executar**

Isso criará automaticamente:
- 12 jogadores (8 mensalistas + 4 avulsos com níveis variados)
- Presenças do dia com todos confirmados
- Pagamentos dos avulsos registrados
- Configuração financeira do mês atual

> **⚠️ Atenção:** Execute `gerarDadosDeTeste` apenas com as abas **vazias** (só com cabeçalho). Se já existirem dados, a função pulará cada aba automaticamente.

---

## Passo 7 — Publicar e Gerar o Link do App

1. No Apps Script, clique no botão azul **Implantar** (canto superior direito)
2. Selecione **Nova implantação**
3. Clique na engrenagem ⚙️ em **"Selecionar tipo"** e marque **App da Web**
4. Preencha os campos:
   - **Descrição:** `VoleizinDosCria v1`
   - **Executar como:** `Eu`
   - **Quem pode acessar:** `Qualquer pessoa` ← **importante!**
5. Clique em **Implantar**
6. Copie a **URL do App na Web** gerada

---

## Passo 8 — Acessar e Adicionar à Tela Inicial

1. Abra o link copiado no navegador do celular
2. No Android: toque em **⋮ Menu > Adicionar à tela inicial**
3. No iPhone/Safari: toque em **Compartilhar > Adicionar à tela de início**

O app aparecerá como um ícone na sua tela inicial, funcionando como um aplicativo nativo!

---

## Atualizando o Sistema (quando houver novas versões)

Se você atualizou o código e quer publicar as mudanças:

1. Copie o novo conteúdo dos arquivos
2. Substitua no editor do Apps Script
3. Clique em **Implantar > Gerenciar implantações**
4. Clique no ✏️ lápis da implantação existente
5. Em **Versão**, escolha **Nova versão**
6. Clique em **Implantar** — o link permanece o mesmo!

---

## Regras de Negócio do Sistema

| Categoria | Mensalista do Dia | Visita / Avulso |
|---|---|---|
| **Definição** | Jogador cadastrado para este dia da semana | Avulso fixo OU Mensalista de outro dia |
| **Cobrança** | Rateio mensal do custo da quadra | Taxa diária fixa (Avulso) |
| **Confirmação** | Pode confirmar livremente | Só confirma após o PIX ser registrado |
| **Destino R$** | Custo da Quadra | Fundo de Equipamentos (Bolas/Redes) |
| **WhatsApp** | Cobrança mensal individual | Cobrança de presença no grupo |

### Gestão do Fundo de Equipamentos

O sistema agora possui um controle de caixa global que acumula as taxas dos avulsos:
- **💰 Entrada:** Use para registrar doações extras, lucros de vendas ou sobras.
- **💸 Saída:** Use para registrar a compra de uma bola nova, rede ou outros custos extras.
- **Histórico:** Todos os movimentos são registrados na aba `Pagamentos` com o ID `CAIXA`.

#### Fechamento e Histórico Financeiro

- **Status "Pago Totalmente":** Quando a arrecadação dos mensalistas atinge a meta do custo da quadra, o mês é marcado automaticamente como "Pago Totalmente".
- **Integridade de Dados (Congelamento):** Ao atingir este status, a lista de jogadores e os valores de rateio daquele mês são "congelados". Isso significa que se um jogador mudar de "Mensalista" para "Avulso" no futuro, ele continuará aparecendo como mensalista nos meses que ele já pagou, preservando o histórico financeiro.
- **Como Reabrir um Mês:** Para editar um mês já fechado, basta cancelar um pagamento ou alterar os custos configurados. Isso voltará o status para "Em Aberto" e permitirá novos cálculos baseados no cadastro atual.

### Níveis de Jogador (usados no sorteio)

| Nível | Classificação |
|---|---|
| ⭐ 1 | Iniciante |
| ⭐⭐ 2 | Básico |
| ⭐⭐⭐ 3 | Intermediário |
| ⭐⭐⭐⭐ 4 | Avançado |
| ⭐⭐⭐⭐⭐ 5 | Profissional |

### Algoritmo de Sorteio de Times

O sistema usa um **algoritmo híbrido** para garantir equilíbrio justo:
1. Jogadores **nível 3, 4 e 5** são distribuídos via *Snake Draft* (0→1→2→2→1→0...) garantindo equilíbrio técnico
2. Jogadores **nível 1 e 2** são distribuídos por rodízio no time com menor peso atual, evitando sua concentração

---

## Suporte e Contribuições

Encontrou um bug ou tem uma sugestão? Abra uma **Issue** ou **Pull Request** no GitHub!

Se o sistema te ajudou, considere apoiar o desenvolvimento:

<p align="center">
  <a href="https://www.buymeacoffee.com/hectornetf" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="45">
  </a>
  &nbsp;
  <a href="https://ko-fi.com/hectornet" target="_blank">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Ko-fi" height="45">
  </a>
</p>
