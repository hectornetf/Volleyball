/**
 * Estatísticas e lógica de sorteio de times.
 * Compartilhado entre Web e Mobile para manter paridade de comportamento.
 * Arquivo 100% puro (sem imports) de propósito: permite ser testado de forma isolada.
 */

// Jogos necessários para considerar o histórico de um atleta confiável.
export const LIMIAR_HISTORICO = 8;

// Extrai os ids de um time persistido no Firestore (objeto ou string).
export const idsJogadoresDoTime = (time) => (time.jogadores || []).map((j) => (typeof j === 'string' ? j : j.id));

// Gera todos os confrontos (todos contra todos) para N times, zerados.
export const gerarConfrontos = (quantidade) => {
  const confrontos = [];
  for (let a = 0; a < quantidade; a += 1) {
    for (let b = a + 1; b < quantidade; b += 1) {
      confrontos.push({ a, b, vitoriasA: 0, vitoriasB: 0 });
    }
  }
  return confrontos;
};

// Confrontos salvos (formato novo) ou fallback para registros antigos (2 times).
export const confrontosDoSorteio = (sorteio) => {
  const times = sorteio.times || [];
  if (Array.isArray(sorteio.confrontos) && sorteio.confrontos.length > 0) return sorteio.confrontos;
  if (times.length === 2) {
    return [{ a: 0, b: 1, vitoriasA: Number(times[0].vitorias) || 0, vitoriasB: Number(times[1].vitorias) || 0 }];
  }
  return null;
};

// Estatísticas agregadas por atleta: { [id]: { jogos, vitorias } }.
export const criarEstatisticas = (historico) => {
  const resultado = {};
  historico.forEach((sorteio) => {
    const times = sorteio.times || [];
    const confrontos = confrontosDoSorteio(sorteio);
    if (confrontos) {
      confrontos.forEach((c) => {
        const vitoriasA = Number(c.vitoriasA) || 0;
        const vitoriasB = Number(c.vitoriasB) || 0;
        const ganhoA = vitoriasA > vitoriasB ? 1 : vitoriasA < vitoriasB ? 0 : 0.5;
        const timeA = times[c.a];
        const timeB = times[c.b];
        if (timeA) idsJogadoresDoTime(timeA).forEach((id) => {
          const atual = resultado[id] || { jogos: 0, vitorias: 0 };
          atual.jogos += 1;
          atual.vitorias += ganhoA;
          resultado[id] = atual;
        });
        if (timeB) idsJogadoresDoTime(timeB).forEach((id) => {
          const atual = resultado[id] || { jogos: 0, vitorias: 0 };
          atual.jogos += 1;
          atual.vitorias += 1 - ganhoA;
          resultado[id] = atual;
        });
      });
    } else {
      const maior = Math.max(...times.map((time) => Number(time.vitorias) || 0), 0);
      times.forEach((time) => idsJogadoresDoTime(time).forEach((id) => {
        const atual = resultado[id] || { jogos: 0, vitorias: 0 };
        atual.jogos += 1;
        atual.vitorias += maior ? (Number(time.vitorias) || 0) / maior : 0.5;
        resultado[id] = atual;
      }));
    }
  });
  return resultado;
};

// Nota de confiança: só ajusta a força quando existe histórico suficiente.
export const estatisticaJogador = (jogador, estatisticas) => {
  const nivel = Number(jogador.nivel) || 3;
  const historico = estatisticas[jogador.id];
  if (!historico || !historico.jogos) {
    return { valor: nivel, jogos: 0, confianca: 0, historicoSuficiente: false };
  }
  const confianca = Math.min(historico.jogos / LIMIAR_HISTORICO, 1);
  const valor = nivel + ((historico.vitorias / historico.jogos) - 0.5) * 1.2 * confianca;
  return { valor, jogos: historico.jogos, confianca, historicoSuficiente: historico.jogos >= LIMIAR_HISTORICO };
};

// Força numérica usada pelo algoritmo (mesma base da nota de confiança).
export const poderJogador = (jogador, estatisticas) => estatisticaJogador(jogador, estatisticas).valor;

// Frequência de parcerias no histórico: duplas { [idA|idB]: n } e trios { [idA|idB|idC]: n }.
export const criarParcerias = (historico) => {
  const parcerias = {};
  const trios = {};
  const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const chaveTripla = (a, b, c) => [a, b, c].sort().join('|');
  historico.forEach((sorteio) => {
    (sorteio.times || []).forEach((time) => {
      const ids = idsJogadoresDoTime(time);
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const k = chave(ids[i], ids[j]);
          parcerias[k] = (parcerias[k] || 0) + 1;
          for (let l = j + 1; l < ids.length; l += 1) {
            const t = chaveTripla(ids[i], ids[j], ids[l]);
            trios[t] = (trios[t] || 0) + 1;
          }
        }
      }
    });
  });
  return { parcerias, trios, chave, chaveTripla };
};

// Quanto um jogador já jogou junto dos demais jogadores de um time (duplas + trios).
export const repeticaoDe = ({ parcerias, trios, chave, chaveTripla }, jogadorId, idsTime) => {
  let soma = 0;
  for (let i = 0; i < idsTime.length; i += 1) {
    const id = idsTime[i];
    if (id === jogadorId) continue;
    soma += parcerias[chave(jogadorId, id)] || 0;
    for (let j = i + 1; j < idsTime.length; j += 1) {
      soma += trios[chaveTripla(jogadorId, id, idsTime[j])] || 0;
    }
  }
  return soma;
};

// Total de parcerias repetidas (duplas + trios) presentes dentro de um time.
export const repeticaoDoTime = ({ parcerias, trios, chave, chaveTripla }, ids) => {
  let soma = 0;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      soma += parcerias[chave(ids[i], ids[j])] || 0;
      for (let l = j + 1; l < ids.length; l += 1) {
        soma += trios[chaveTripla(ids[i], ids[j], ids[l])] || 0;
      }
    }
  }
  return soma;
};

// Sorteio equilibrado com variedade de parcerias (duplas e trios).
export const equilibraTimes = (jogadores, historico, jogadoresPorTime) => {
  const estatisticas = criarEstatisticas(historico);
  const parcerias = criarParcerias(historico);
  const quantidadeTimes = Math.floor(jogadores.length / jogadoresPorTime);
  if (quantidadeTimes < 1) {
    return { times: [], reservas: jogadores, diagnostico: { poderes: [], jogadoresComHistorico: 0, repeticaoTotal: 0, variedadeAplicada: 0 } };
  }

  const ordenados = [...jogadores]
    .sort((a, b) => poderJogador(b, estatisticas) - poderJogador(a, estatisticas) || Math.random() - 0.5);
  const times = Array.from({ length: quantidadeTimes }, () => []);
  const poderes = Array(quantidadeTimes).fill(0);

  // 1) Distribuição gulosa: menor poder, com leve penalidade para evitar parcerias repetidas.
  ordenados.slice(0, quantidadeTimes * jogadoresPorTime).forEach((jogador) => {
    const candidatos = poderes
      .map((poder, i) => ({ poder: poder + Math.log1p(repeticaoDe(parcerias, jogador.id, times[i].map((m) => m.id))) * 1.2, i }))
      .filter(({ i }) => times[i].length < jogadoresPorTime);
    const indice = candidatos.reduce((a, b) => (b.poder < a.poder ? b : a)).i;
    times[indice].push(jogador);
    poderes[indice] += poderJogador(jogador, estatisticas);
  });

  // 2) Ajuste de equilíbrio: trocas entre o time mais forte e o mais fraco.
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    const forte = poderes.indexOf(Math.max(...poderes));
    const fraco = poderes.indexOf(Math.min(...poderes));
    let melhor = null;
    let diferenca = poderes[forte] - poderes[fraco];
    times[forte].forEach((a, ia) => times[fraco].forEach((b, ib) => {
      const nova = Math.abs(
        (poderes[forte] - poderJogador(a, estatisticas) + poderJogador(b, estatisticas)) -
        (poderes[fraco] - poderJogador(b, estatisticas) + poderJogador(a, estatisticas))
      );
      if (nova < diferenca) { diferenca = nova; melhor = { a, b, ia, ib }; }
    }));
    if (!melhor) break;
    times[forte][melhor.ia] = melhor.b;
    times[fraco][melhor.ib] = melhor.a;
    poderes[forte] += poderJogador(melhor.b, estatisticas) - poderJogador(melhor.a, estatisticas);
    poderes[fraco] += poderJogador(melhor.a, estatisticas) - poderJogador(melhor.b, estatisticas);
  }

  // 3) Variedade: reduz parcerias repetidas sem piorar o equilíbrio além de 1 ponto.
  let variedadeAplicada = 0;
  const limiteEquilibrio = Math.max(...poderes) - Math.min(...poderes) + 1;
  const repeticaoTotal = () => times.reduce((soma, time) => soma + repeticaoDoTime(parcerias, time.map((m) => m.id)), 0);
  for (let tentativa = 0; tentativa < 60 && quantidadeTimes > 1; tentativa += 1) {
    let melhorTroca = null;
    for (let i = 0; i < times.length - 1; i += 1) {
      for (let j = i + 1; j < times.length; j += 1) {
        if (Math.abs(poderes[i] - poderes[j]) > limiteEquilibrio) continue;
        times[i].forEach((a, ia) => times[j].forEach((b, ib) => {
          const novaDiff = Math.abs(
            (poderes[i] - poderJogador(a, estatisticas) + poderJogador(b, estatisticas)) -
            (poderes[j] - poderJogador(b, estatisticas) + poderJogador(a, estatisticas))
          );
          if (novaDiff > limiteEquilibrio) return;
          const idsI = times[i].map((m) => m.id);
          const idsJ = times[j].map((m) => m.id);
          const repAntes = repeticaoDe(parcerias, a.id, idsI) + repeticaoDe(parcerias, b.id, idsJ);
          const repDepois = repeticaoDe(parcerias, a.id, idsJ) + repeticaoDe(parcerias, b.id, idsI);
          const ganho = repAntes - repDepois;
          if (ganho > 1 && (!melhorTroca || ganho > melhorTroca.ganho)) {
            melhorTroca = { i, j, ia, ib, ganho };
          }
        }));
      }
    }
    if (!melhorTroca) break;
    const { i, j, ia, ib } = melhorTroca;
    const a = times[i][ia];
    const b = times[j][ib];
    times[i][ia] = b;
    times[j][ib] = a;
    poderes[i] += poderJogador(b, estatisticas) - poderJogador(a, estatisticas);
    poderes[j] += poderJogador(a, estatisticas) - poderJogador(b, estatisticas);
    variedadeAplicada += 1;
  }

  return {
    times,
    reservas: ordenados.slice(quantidadeTimes * jogadoresPorTime),
    diagnostico: {
      poderes: poderes.map((p) => Math.round(p * 10) / 10),
      jogadoresComHistorico: Object.keys(estatisticas).length,
      repeticaoTotal: repeticaoTotal(),
      variedadeAplicada,
    },
  };
};

// Série de força estimada ao longo do tempo (base para a evolução no painel).
export const forcasPorPeriodo = (jogador, historico) => {
  const nivel = Number(jogador.nivel) || 3;
  const eventos = [];
  [...historico].reverse().forEach((sorteio) => {
    const registro = (sorteio.times || []).find((time) => idsJogadoresDoTime(time).includes(jogador.id));
    if (!registro) return;
    const maior = Math.max(...(sorteio.times || []).map((t) => Number(t.vitorias) || 0), 0);
    eventos.push({ frac: maior ? (Number(registro.vitorias) || 0) / maior : 0.5 });
  });
  if (eventos.length === 0) return [];
  const janelas = 4;
  const tamanho = Math.max(1, Math.ceil(eventos.length / janelas));
  const forcas = [];
  for (let k = 0; k < eventos.length; k += tamanho) {
    const fatia = eventos.slice(k, k + tamanho);
    const vitorias = fatia.reduce((soma, e) => soma + e.frac, 0);
    const jogos = fatia.length;
    const confianca = Math.min(jogos / LIMIAR_HISTORICO, 1);
    const forca = nivel + ((vitorias / jogos) - 0.5) * 1.2 * confianca;
    forcas.push(Math.round(forca * 10) / 10);
  }
  return forcas;
};

// Painel do atleta: vitórias, aproveitamento, presença, força estimada e evolução.
export const montarPainelEstatisticas = (jogadores, historico) => {
  const estatisticas = criarEstatisticas(historico);
  return jogadores
    .filter((jogador) => jogador.status !== 'Inativo')
    .map((jogador) => {
      const estat = estatisticaJogador(jogador, estatisticas);
      const bruto = estatisticas[jogador.id] || { jogos: 0, vitorias: 0 };
      const serie = forcasPorPeriodo(jogador, historico);
      const evolucao = serie.length >= 2 ? serie[serie.length - 1] - serie[0] : 0;
      return {
        jogador,
        jogos: bruto.jogos,
        vitorias: Math.round(bruto.vitorias),
        aproveitamento: bruto.jogos ? Math.round((bruto.vitorias / bruto.jogos) * 100) : 0,
        presencas: Number(jogador.historicoPresencas) || 0,
        forca: estat.valor,
        confianca: estat.confianca,
        historicoSuficiente: estat.historicoSuficiente,
        serie,
        evolucao,
      };
    })
    .sort((a, b) => b.forca - a.forca || b.jogos - a.jogos || (a.jogador.nome || '').localeCompare(b.jogador.nome || ''));
};