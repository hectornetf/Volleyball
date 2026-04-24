# 🏗️ Voleizin Pro Boilerplate

Este é o esqueleto mestre baseado no framework **VoleizinDosCria**. Use este template para iniciar rapidamente novos projetos que necessitem de uma interface premium (Glassmorphism), banco de dados em Google Sheets e lógica de automação via Google Apps Script.

## 🚀 Como começar do zero

1.  **Crie a Planilha**: Acesse [sheets.new](https://sheets.new).
2.  **Abra o Editor**: Vá em `Extensões > Apps Script`.
3.  **Cole o Backend**:
    -   Substitua o conteúdo de `Código.gs` pelo conteúdo do arquivo `codigo.gs` deste boilerplate.
4.  **Adicione a Interface**:
    -   No editor, adicione um novo arquivo **HTML** chamado `index`.
    -   Cole o conteúdo do `index.html` deste boilerplate.
5.  **Setup Inicial**:
    -   No editor, selecione a função `setupInicial` e clique em **Executar**.
    -   Dê as permissões necessárias.
6.  **Publique**:
    -   Clique em **Implantar > Nova Implantação > App da Web**.
    -   Configure para "Qualquer pessoa" ter acesso.

## 🧠 Arquitetura Incluída

-   **Vue 3 (CDN)**: Estrutura reativa pronta.
-   **Tailwind CSS**: Estilização moderna via utilitários.
-   **Glassmorphism CSS**: Classe `.glass` pré-configurada.
-   **runGoogleScript**: Ponte de comunicação frontend-backend com suporte a carregamento (loading state).

## 🎨 Personalização Rápida

-   **Cores**: No `index.html`, altere as classes de gradiente (`from-emerald-400 to-cyan-400`) para mudar o tema do seu app.
-   **Ícones**: Utilize o [Font Awesome](https://fontawesome.com) já incluído.
-   **Logos**: Altere o ícone `<i class="fa-solid fa-volleyball"></i>` pelo que melhor representar seu novo projeto.

---
*Gerado automaticamente pelo framework Voleizin Pro.*
