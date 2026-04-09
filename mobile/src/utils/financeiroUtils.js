const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function computarFechamento(custos, elenco, mesRefStr) {
  const dias = {};
  let metaArrecadacao = 0;
  let totalArrecadadoMensalistas = 0;

  diasDaSemana.forEach((dia) => {
    const custoDia = parseFloat(String(custos[dia] || '0').replace(',', '.')) || 0;
    const mensalistasNoDia = elenco.filter(
      (j) => j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(dia)
    );
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

  const statusGeral =
    totalArrecadadoMensalistas >= metaArrecadacao ? 'Pago Totalmente' : 'Pendente';

  return { dias, metaArrecadacao, totalArrecadadoMensalistas, statusGeral };
}
