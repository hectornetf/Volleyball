# Como Publicar seu Sistema de Vôlei Grátis

Para que seu sistema fique **100% gratuito** e acessível por um **link no celular**, nós usamos o Google Apps Script integrado ao seu Google Sheets. Siga os passos abaixo:

## Passo 1: Criar a Planilha
1. Abra seu Google Drive e crie uma nova **Planilha do Google** em branco.
2. Dê um nome para ela (Ex: *Gerenciador Vôlei*).

## Passo 2: Adicionar o Código
1. Na planilha, clique no menu superior em **Extensões** > **Apps Script**.
2. Uma nova aba se abrirá. Você verá um arquivo chamado `Código.gs`.
3. Apague tudo que está lá e **cole o conteúdo do arquivo `codigo.gs`** que criei para você.
4. Salve o projeto clicando no ícone do disquete 💾 (ou aperte Ctrl+S).

## Passo 3: Criar a Interface de Usuário
1. Ainda no Apps Script, no menu lateral esquerdo, clique no botão de **+ (Adicionar um arquivo)** e escolha **HTML**.
2. Dê exatamente o nome de **`index`** (sem o .html) e aperte Enter.
3. Apague tudo e **cole o conteúdo do arquivo `index.html`** que acabei de criar na sua pasta.
4. Salve novamente 💾.

## Passo 4: Configurar a Planilha Inicial
1. No arquivo `codigo.gs` (selecione ele no menu lateral), na barra superior clique em `setupInicial` (no campo que diz "Selecionar função").
2. Clique no botão **Executar**.
3. O Google pedirá **Permissões de Acesso**. Siga até o final (clique em *Revisar Permissões* > *Sua Conta* > *Avançado* > *Acessar projeto* > *Permitir*).
4. Volte na aba da sua planilha do Google. Note que 3 novas guias foram criadas automaticamente na parte inferior (`Jogadores`, `Presenças_Seg`, `Presenças_Sex`).

## Passo 5: Gerar o seu Link de Acesso!
Agora vamos gerar o link que você vai usar e mandar para a galera (se quiser):

1. No Apps Script, clique no botão azul **Implantar** (canto superior direito) > **Nova implantação**.
2. Clique na engrenagem ⚙️ (Selecionar tipo) e marque **App da Web** (Web App).
3. Preencha assim:
   - **Descrição:** Vôlei Versão 1
   - **Executar como:** *Eu*
   - **Quem pode acessar:** *Qualquer pessoa* (Importante para não pedir login do Google aos jogadores).
4. Clique em **Implantar**.
5. Em alguns segundos, ele mostrará a **URL do app na Web**.
6. **Copie esse Link!** Esse é o link do seu sistema de gerenciamento gratuito do Volei. 

### Finalizando
Abra esse link no celular ou computador e adicione como Favorito ou na Tela Inicial! Lá você poderá gerenciar presenças, calcular a quadra, desenhar os times por nível, e com um clique criar as mensagens de WhatsApp.
