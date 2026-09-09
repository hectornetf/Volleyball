import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users, Trophy, Calendar, Star, ArrowRightLeft, 
  CheckCircle2, Hash, Brain, Send
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const diaAtual = () => dias[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]] || 'Segunda';

const criarEstatisticas = (historico) => {
  const resultado = {};
  historico.forEach((sorteio) => {
    const maior = Math.max(...(sorteio.times || []).map((time) => Number(time.vitorias) || 0), 0);
    (sorteio.times || []).forEach((time) => (time.jogadores || []).forEach((j) => {
      const atual = resultado[j.id] || { jogos: 0, vitorias: 0 };
      atual.jogos += 1;
      atual.vitorias += maior ? (Number(time.vitorias) || 0) / maior : 0.5;
      resultado[j.id] = atual;
    }));
  });
  return resultado;
};

const poderJogador = (jogador, estatisticas) => {
  const nivel = Number(jogador.nivel) || 3;
  const historico = estatisticas[jogador.id];
  if (!historico) return nivel;
  const confianca = Math.min(historico.jogos / 8, 1);
  return nivel + ((historico.vitorias / historico.jogos) - 0.5) * 1.2 * confianca;
};

const equilibrar = (jogadores, historico, jogadoresPorTime) => {
  const estatisticas = criarEstatisticas(historico);
  const quantidadeTimes = Math.floor(jogadores.length / jogadoresPorTime);
  const ordenados = [...jogadores].sort((a, b) => poderJogador(b, estatisticas) - poderJogador(a, estatisticas) || Math.random() - 0.5);
  const times = Array.from({ length: quantidadeTimes }, () => []);
  const poderes = Array(quantidadeTimes).fill(0);
  ordenados.slice(0, quantidadeTimes * jogadoresPorTime).forEach((jogador) => {
    const indice = poderes.map((poder, i) => ({ poder, i })).filter(({ i }) => times[i].length < jogadoresPorTime).reduce((a, b) => b.poder < a.poder ? b : a).i;
    times[indice].push(jogador);
    poderes[indice] += poderJogador(jogador, estatisticas);
  });
  // Melhora a distribuição com trocas entre o time mais forte e o mais fraco.
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    const forte = poderes.indexOf(Math.max(...poderes));
    const fraco = poderes.indexOf(Math.min(...poderes));
    let melhor = null;
    let diferenca = poderes[forte] - poderes[fraco];
    times[forte].forEach((a, ia) => times[fraco].forEach((b, ib) => {
      const nova = Math.abs((poderes[forte] - poderJogador(a, estatisticas) + poderJogador(b, estatisticas)) - (poderes[fraco] - poderJogador(b, estatisticas) + poderJogador(a, estatisticas)));
      if (nova < diferenca) { diferenca = nova; melhor = { a, b, ia, ib }; }
    }));
    if (!melhor) break;
    times[forte][melhor.ia] = melhor.b; times[fraco][melhor.ib] = melhor.a;
    poderes[forte] += poderJogador(melhor.b, estatisticas) - poderJogador(melhor.a, estatisticas);
    poderes[fraco] += poderJogador(melhor.a, estatisticas) - poderJogador(melhor.b, estatisticas);
  }
  return { times, reservas: ordenados.slice(quantidadeTimes * jogadoresPorTime), diagnostico: { poderes: poderes.map((p) => Math.round(p * 10) / 10), jogadoresComHistorico: Object.keys(estatisticas).length } };
};

export default function TimesPage() {
  const { activeGroupId } = useSession();
  const [dia, setDia] = useState(diaAtual);
  const [jogadores, setJogadores] = useState([]);
  const [sorteio, setSorteio] = useState(null);
  const [vitorias, setVitorias] = useState([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [selecao, setSelecao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => activeGroupId ? subscribeJogadores(activeGroupId, (dados) => { setJogadores(dados); setCarregando(false); }) : undefined, [activeGroupId]);
  useEffect(() => activeGroupId ? subscribeSorteioAberto(activeGroupId, dia, (dados) => { setSorteio(dados); setSelecao(null); setVitorias((dados?.times || []).map((t) => String(t.vitorias || 0))); }) : undefined, [activeGroupId, dia]);

  const confirmados = useMemo(() => jogadores.filter((j) => j.presencas?.[dia] === 'Confirmado'), [jogadores, dia]);
  const times = useMemo(() => (sorteio?.times || []).map((time) => time.jogadores.map((registro) => {
    const id = typeof registro === 'string' ? registro : registro.id;
    return jogadores.find((j) => j.id === id) || { ...(typeof registro === 'string' ? { id } : registro), nome: 'Jogador removido', nivel: registro.nivelNoSorteio };
  })), [sorteio, jogadores]);

  const gerar = async () => {
    if (confirmados.length < jogadoresPorTime * 2) {
      alert(`Faltam atletas: são necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
      return;
    }
    setSalvando(true);
    try {
      const resultado = equilibrar(confirmados, await carregarHistoricoTimes(activeGroupId), jogadoresPorTime);
      await salvarSorteio({ groupId: activeGroupId, dia, ...resultado });
    } catch (_) {
      alert('Não foi possível salvar o sorteio. Verifique sua conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const concluir = async () => {
    setSalvando(true);
    try {
      await concluirSorteio(sorteio.id, vitorias, activeGroupId);
    } catch (_) {
      alert('Não foi possível concluir a rodada. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const selecionarJogador = async (local) => {
    if (!selecao) { setSelecao(local); return; }
    if (selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao) { setSelecao(null); return; }
    setSalvando(true);
    try {
      await trocarJogadoresDoSorteio(sorteio.id, selecao, local, activeGroupId);
    } catch (_) {
      alert('Não foi possível alterar a escalação. Tente novamente.');
    } finally {
      setSalvando(false);
      setSelecao(null);
    }
  };

  const estaSelecionado = (local) => selecao && selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao;

  const whatsapp = () => {
    const texto = times.map((time, i) => `*Time ${i + 1}*\n${time.map((j) => `- ${j.nome} (Nível ${j.nivel || 3})`).join('\n')}`).join('\n\n');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🏐 *VOLEIZIN: TIMES SORTEADOS*\n\n${texto}\n\nAcesse: https://voleizindoscria.vercel.app/`)}`, '_blank');
  };

  const poderes = sorteio?.diagnostico?.poderes || [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Montar Times</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Sorteio inteligente com base no nível atual e nos resultados anteriores de cada atleta.
          </p>
        </div>

        {carregando && (
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
            <span className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Carregando...</span>
          </div>
        )}
      </div>

      {/* Days Selector */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <Calendar className="w-5 h-5 text-cyan-400 shrink-0 ml-1 mr-2" />
        {dias.map((item) => {
          const isActive = dia === item;
          return (
            <button
              key={item}
              onClick={() => setDia(item)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Config Card */}
      <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-white text-base font-black">Jogadores por time</h2>
            <p className="text-slate-400 text-xs mt-1">Defina o formato da rodada.</p>
          </div>
          <div className="flex items-center bg-slate-900 rounded-xl overflow-hidden">
            <button
              disabled={!!sorteio || jogadoresPorTime <= 1}
              onClick={() => setJogadoresPorTime((valor) => Math.max(1, valor - 1))}
              className="px-4 py-3 text-white font-black text-lg disabled:opacity-30 hover:bg-slate-800 transition-colors"
            >
              −
            </button>
            <span className="text-cyan-300 font-black text-lg w-8 text-center">{jogadoresPorTime}</span>
            <button
              disabled={!!sorteio}
              onClick={() => setJogadoresPorTime((valor) => valor + 1)}
              className="px-4 py-3 text-white font-black text-lg disabled:opacity-30 hover:bg-slate-800 transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-cyan-100 text-xs leading-5 mt-4">
          {confirmados.length} confirmados: {Math.floor(confirmados.length / jogadoresPorTime)} time(s) completo(s)
          {confirmados.length % jogadoresPorTime ? ` e ${confirmados.length % jogadoresPorTime} reserva(s)` : ''}.
          O cálculo usa nível atual e os resultados anteriores.
        </p>
        <button
          onClick={gerar}
          disabled={salvando || !!sorteio}
          className={`w-full py-4 rounded-2xl mt-5 font-black text-xs uppercase transition-all ${
            sorteio
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          {salvando ? 'Salvando...' : sorteio ? 'Rodada aguardando conclusão' : 'Gerar times equilibrados'}
        </button>
      </div>

      {sorteio && (
        <div>
          {/* Aviso de edição + WhatsApp */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-indigo-200 text-xs font-bold flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>Para ajustar: toque em um jogador e depois no atleta com quem deseja trocar. As equipes manterão a mesma quantidade de jogadores.</span>
            </p>
            <button
              onClick={whatsapp}
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white font-black text-xs uppercase px-5 py-3 rounded-2xl flex items-center space-x-2 w-full sm:w-auto justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Enviar escalação</span>
            </button>
          </div>

          {/* Times */}
          {times.map((time, indice) => (
            <div key={indice} className="bg-slate-800/60 rounded-3xl border border-slate-700/40 mb-4 overflow-hidden">
              <div className="p-4 bg-cyan-500/10 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-cyan-300 font-black text-xs uppercase">Time {indice + 1} · {time.length} atletas</span>
                <span className="text-cyan-200 text-xs font-bold">Poder {poderes[indice] ?? '—'}</span>
              </div>
              <div className="p-4">
                {time.map((j, posicao) => {
                  const local = { tipo: 'time', indice, posicao };
                  const isSel = estaSelecionado(local);
                  return (
                    <button
                      key={j.id}
                      disabled={salvando}
                      onClick={() => selecionarJogador(local)}
                      className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                        isSel
                          ? 'bg-indigo-500 border border-indigo-300 text-white'
                          : 'bg-slate-900/40 hover:bg-slate-900/70 border border-transparent'
                      }`}
                    >
                      <span className="text-slate-100 font-bold text-xs">{j.nome} <span className="text-amber-400">★ {j.nivel || 3}</span></span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-700/40 mt-2 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-slate-300 font-black text-xs">PARTIDAS VENCIDAS</span>
                  <input
                    value={vitorias[indice] || ''}
                    onChange={(e) => setVitorias((atual) => atual.map((item, i) => i === indice ? e.target.value.replace(/[^0-9]/g, '') : item))}
                    type="number"
                    min="0"
                    className="bg-slate-900 text-white text-center font-black w-16 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Reservas */}
          {(sorteio?.reservas || []).length > 0 && (
            <div className="bg-amber-500/10 p-4 rounded-2xl mb-4 border border-amber-500/20">
              <p className="text-amber-300 text-xs font-black mb-2 flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>RESERVAS — toque para trocar</span>
              </p>
              {sorteio.reservas.map((registro, indice) => {
                const id = typeof registro === 'string' ? registro : registro.id;
                const local = { tipo: 'reserva', indice };
                const isSel = estaSelecionado(local);
                const jogador = jogadores.find((j) => j.id === id) || { id, nome: 'Jogador' };
                return (
                  <button
                    key={`reserva-${id}-${indice}`}
                    disabled={salvando}
                    onClick={() => selecionarJogador(local)}
                    className={`w-full text-left p-3 rounded-xl mb-1 font-bold text-xs transition-all ${
                      isSel
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-900/40 text-slate-100 hover:bg-slate-900/70'
                    }`}
                  >
                    {jogador.nome}
                  </button>
                );
              })}
            </div>
          )}

          {/* Concluir rodada */}
          <button
            onClick={concluir}
            disabled={salvando}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl text-white font-black text-xs uppercase flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {salvando ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{salvando ? 'Salvando...' : 'Concluir rodada e ensinar o algoritmo'}</span>
          </button>
        </div>
      )}

      {!sorteio && !carregando && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Brain className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Aguardando sorteio</h3>
          <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
            {confirmados.length > 0
              ? `${confirmados.length} jogadores confirmados em ${dia}. Clique em "Gerar times equilibrados" para criar a rodada.`
              : `Nenhum jogador confirmado em ${dia}. Marque as presenças antes de sortear.`}
          </p>
        </div>
      )}

      {/* Resumo de confirmados */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Hash className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-extrabold text-white">
            {confirmados.length} Jogadores Confirmados para {dia}
          </span>
        </div>
        {sorteio && (
          <Trophy className="w-5 h-5 text-emerald-400" />
        )}
      </div>

    </div>
  );
}