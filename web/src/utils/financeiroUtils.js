const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function computarFechamento(custos, elenco, mesRefStr, statusAtual) {
  const dias = {};
  let metaArrecadacao = 0;
  let totalArrecadadoMensalistas = 0;
  
  const isFrozen = statusAtual === 'Pago Totalmente';

  diasDaSemana.forEach((dia) => {
    const custoDia = parseFloat(String(custos[dia] || '0').replace(',', '.')) || 0;
    if (custoDia <= 0) return;
    
    // Se o mês estiver congelado, filtramos apenas quem REALMENTE pagou naquele dia/mês.
    // Se o mês estiver aberto, filtramos quem é MENSALISTA no cadastro atual para aquele dia.
    const mensalistasNoDia = elenco.filter((j) => {
      const temPagamento = !!(j.pagamentosMensais && j.pagamentosMensais[`${dia}_${mesRefStr}`]);
      if (isFrozen) {
        return temPagamento;
      }
      return j.status === 'Ativo' && j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(dia);
    });

    const totalMensalistas = mensalistasNoDia.length;
    const valorPorPessoa = totalMensalistas > 0 ? custoDia / totalMensalistas : 0;
    const arrecadadoDia = mensalistasNoDia.filter((j) => j.pagamentosMensais && j.pagamentosMensais[`${dia}_${mesRefStr}`]).length * valorPorPessoa;

    dias[dia] = {
      custo: custoDia,
      totalMensalistas,
      valorPorPessoa,
      jogadores: mensalistasNoDia.map((j) => ({ ...j, mensalidadePaga: !!(j.pagamentosMensais && j.pagamentosMensais[`${dia}_${mesRefStr}`]) })),
      aviso:
        mensalistasNoDia.length === 0 && custoDia > 0
          ? 'Nenhum mensalista cadastrado para este dia.'
          : null,
    };

    metaArrecadacao += custoDia;
    totalArrecadadoMensalistas += arrecadadoDia;
  });

  const margemErro = 0.05;
  const statusGeral =
    metaArrecadacao > 0 && totalArrecadadoMensalistas >= (metaArrecadacao - margemErro) 
      ? 'Pago Totalmente' 
      : (totalArrecadadoMensalistas > 0 ? 'Em Aberto' : 'Pendente');

  return { dias, metaArrecadacao, totalArrecadadoMensalistas, statusGeral };
}
