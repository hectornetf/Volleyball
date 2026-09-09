import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Users, Trophy, Calendar, Star, ArrowRightLeft, 
  CheckCircle2, Hash, Brain, Send, Swords
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';
import { criarEstatisticas, equilibraTimes, estatisticaJogador, gerarConfrontos } from '../utils/estatisticasUtils';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const diaAtual = () => dias[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]] || 'Segunda';

export default function TimesPage() {
  const { activeGroupId } = useSession();
  const [dia, setDia] = useState(diaAtual);
  const [jogadores, setJogadores] = useState([]);
  const [sorteio, setSorteio] = useState(null);
  const [confrontos, setConfrontos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [selecao, setSelecao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const sorteioIdRef = useRef(null);

  useEffect(() => activeGroupId ? subscribeJogadores(activeGroupId, (dados) => { setJogadores(dados); setCarregando(false); }) : undefined, [activeGroupId]);
  useEffect(() => {
    if (!activeGroupId) return undefined;
    let ativo = true;
    carregarHistoricoTimes(activeGroupId)
      .then((dados) => { if (ativo) setHistorico(dados); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [activeGroupId]);
  useEffect(() => activeGroupId ? subscribeSorteioAberto(activeGroupId, dia, (dados) => {
    setSorteio(dados);
    setSelecao(null);
    const novoId = dados?.id || null;
    if (!novoId) { sorteioIdRef.current = null; setConfrontos([]); return; }
    if (novoId === sorteioIdRef.current) return;
    sorteioIdRef.current = novoId;
    setConfrontos(dados?.confrontos?.length ? dados.confrontos.map((c) => ({ ...c })) : gerarConfrontos(dados?.times?.length || 0));
  }) : undefined, [activeGroupId, dia]);

  const confirmados = useMemo(() => jogadores.filter((j) => j.presencas?.[dia] === 'Confirmado'), [jogadores, dia]);
  const estatisticas = useMemo(() => criarEstatisticas(historico), [historico]);
  const infoJogador = (jogador) => estatisticaJogador(jogador, estatisticas);
  const times = useMemo(() => (sorteio?.times || []).map((time) => time.jogadores.map((registro) => {
    const id = typeof registro === 'string' ? registro : registro.id;
    return jogadores.find((j) => j.id === id) || { ...(typeof registro === 'string' ? { id } : registro), nome: 'Jogador removido', nivel: registro.nivelNoSorteio };
  })), [sorteio, jogadores]);

  const vitoriasDoTime = (indice) => confrontos.reduce((soma, c) => soma + (c.a === indice ? Number(c.vitoriasA) || 0 : c.b === indice ? Number(c.vitoriasB) || 0 : 0), 0);
  const atualizarConfronto = (indice, campo, valor) => setConfrontos((atual) => atual.map((c, i) => i === indice ? { ...c, [campo]: valor.replace(/[^0-9]/g, '') } : c));

  const gerar = async () => {
    if (confirmados.length < jogadoresPorTime * 2) {
      alert(`Faltam atletas: são necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
      return;
    }
    setSalvando(true);
    try {
      const dadosHistoricos = await carregarHistoricoTimes(activeGroupId);
      setHistorico(dadosHistoricos);
      const resultado = equilibraTimes(confirmados, dadosHistoricos, jogadoresPorTime);
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
      await concluirSorteio(sorteio.id, confrontos, activeGroupId);
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
            Sorteio inteligente: nível atual, resultados anteriores (nota de confiança) e variedade de parcerias.
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
          O cálculo usa o nível atual, os resultados anteriores (com nota de confiança) e evita repetir duplas e trios.
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
          {/* Aviso de edição + WhatsApp + diagnóstico */}
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
          {sorteio.diagnostico?.repeticaoTotal !== undefined && (
            <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40 mb-4 flex items-center space-x-3">
              <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-slate-300 text-[10px] font-bold">
                Parcerias repetidas na rodada: {sorteio.diagnostico.repeticaoTotal} · Trocas de variedade: {sorteio.diagnostico.variedadeAplicada || 0} · Atletas com histórico: {sorteio.diagnostico.jogadoresComHistorico}
              </p>
            </div>
          )}

          {/* Times */}
          {times.map((time, indice) => (
            <div key={indice} className="bg-slate-800/60 rounded-3xl border border-slate-700/40 mb-4 overflow-hidden">
              <div className="p-4 bg-cyan-500/10 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-cyan-300 font-black text-xs uppercase">Time {indice + 1} · {time.length} atletas</span>
                <span className="text-cyan-200 text-xs font-bold">Poder {poderes[indice] ?? '—'} · V {vitoriasDoTime(indice)}</span>
              </div>
              <div className="p-4">
                {time.map((j, posicao) => {
                  const local = { tipo: 'time', indice, posicao };
                  const isSel = estaSelecionado(local);
                  const stat = infoJogador(j);
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
                      <span className="text-slate-100 font-bold text-xs">{j.nome} <span className="text-amber-400">★ {j.nivel || 3}</span>{!stat.historicoSuficiente && <span className="text-amber-300/90 text-[9px] ml-1">· histórico insuficiente</span>}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Placar por confronto */}
          {confrontos.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-3xl mb-4">
              <h3 className="text-indigo-300 text-xs font-black uppercase flex items-center space-x-2">
                <Swords className="w-4 h-4" />
                <span>Placar por confronto</span>
              </h3>
              <p className="text-indigo-200 text-[10px] font-bold mt-1 mb-3">Registre quem jogou contra quem (todos contra todos).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {confrontos.map((confronto, indice) => (
                  <div key={`${confronto.a}-${confronto.b}`} className="bg-slate-900/40 p-3 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-slate-200 text-[10px] font-black shrink-0">Time {confronto.a + 1}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={confronto.vitoriasA}
                        onChange={(e) => atualizarConfronto(indice, 'vitoriasA', e.target.value)}
                        className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-slate-500 font-black">×</span>
                      <input
                        type="number"
                        min="0"
                        value={confronto.vitoriasB}
                        onChange={(e) => atualizarConfronto(indice, 'vitoriasB', e.target.value)}
                        className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <span className="text-slate-200 text-[10px] font-black shrink-0">Time {confronto.b + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                const stat = infoJogador(jogador);
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
                    {jogador.nome}{!stat.historicoSuficiente && <span className="text-amber-300/90 text-[9px] ml-1">· histórico insuficiente</span>}
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