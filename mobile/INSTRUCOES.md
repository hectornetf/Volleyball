# 📖 Guia de Operação: VoleizinDosCria

Este guia contém as regras de negócio e o funcionamento lógico do sistema para os administradores.

## 🏐 Regras de Elenco e Nível
Os jogadores no aplicativo são classificados de **1 a 5 estrelas**:
- **Nível 5:** Levantadores e Atacantes de ponta (Referência técnica).
- **Nível 1-3:** Jogadores casuais ou iniciantes.
- **Categorias:**
    - **Mensalistas:** Jogam em dias fixos e pagam valor cheio para a quadra.
    - **Avulsos:** Pagam diária de R$ 10,00 revertida para o fundo de bolas/materiais.

## 🔀 Algoritmo de Sorteio (Snake Draft)
O sorteio não é aleatório puro. Ele segue a lógica de **Serpente (Snake)**:
1. Pega-se os jogadores confirmados ("Vou").
2. Ordena-se do maior nível (5 ⭐) para o menor (1 ⭐).
3. Distribui-se os Nível 5 um em cada time (ex: Time A, Time B, Time C).
4. Próxima rodada (Nível 4) em ordem inversa (Time C, Time B, Time A).
5. Isso garante que nunca um time fique com todos os "carregadores" (Nível 5).

## 💰 Lógica Financeira e Fechamento
Ao final do mês, o sistema calcula o rateio:
- **Rateio Base:** Divide o custo da quadra pelo número de mensalistas ativos.
- **Caixa de Equipamentos:** Acumula os R$ 10,00 de cada avulso para compra de bolas, rede e joelheiras.
- **Botão WhatsApp:** Gera uma mensagem formatada com o link de cobrança/pix para os devedores.

## 🔐 Controle de Acesso
A aba de **Admin** permite:
- **Seed de Dados:** Gerar 10 jogadores fake para testar o sistema se o banco estiver vazio.
- **Edição de Cadastro:** Alterar telefone ou nível se o jogador evoluir no vôlei.

---

### Manutenção do Firebase
Caso o banco pare de responder:
1. Verifique as **Regras de Segurança** no Console do Firebase.
2. Certifique-se de que o uso do Firestore não excedeu a cota gratuita do plano Spark da Google.
