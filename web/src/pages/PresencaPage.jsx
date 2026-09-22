import React, { useState, useEffect } from 'react';
import { 
  Search, UserCheck, DollarSign, 
  AlertCircle, Calendar, MessageSquareShare
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { 
  subscribeJogadores, updateJogador, registrarOperacaoFinanceira, 
  incrementarPresencaHistorica, getConfigFinanceira,
  marcarDiariaAvulsa, removerDiariaAvulsa 
} from '../services/jogadorService';
import { registrarLog } from '../services/historyService';
import Avatar from '../components/Avatar';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const getDiaAtualSemana = () => {
  const hoje = new Date().getDay(); // 0=Dom, 1=Seg...
  const mapa = [6, 0, 1, 2, 3, 4, 5];
  return diasDaSemana[mapa[hoje]] ?? 'Segunda';
};

// Data do próximo jogo do dia em formato ISO yyyy-MM-dd (seguro como chave no Firestore,
// pois o caminho do campo não aceita '/'). Janela de 24h para acessar o jogo de ontem.
const descobrirProximaData = (nomeDia) => {
  const mapa = { Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6, Domingo: 0 };
  const alvo = mapa[nomeDia] ?? 5;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let diff = (alvo - hoje.getDay() + 7) % 7;
  if (diff === 6) diff = -1;
  const prox = new Date(hoje);
  prox.setDate(hoje.getDate() + diff);
  const d = String(prox.getDate()).padStart(2, '0');
  const m = String(prox.getMonth() + 1).padStart(2, '0');
  return `${prox.getFullYear()}-${m}-${d}`;
};

const formatarData = (dataISO) => {
  const [a, m, d] = (dataISO || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export default function PresencaPage() {
  const { activeGroupId } = useSession();
  const [diaSelecionado, setDiaSelecionado] = useState(getDiaAtualSemana);
  const [jogadores, setJogadores] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [valorAvulso, setValorAvulso] = useState(10);

  const dataJogo = descobrirProximaData(diaSelecionado);

  // Diária avulsa é paga POR DATA DO JOGO (yyyy-MM-dd), nunca por flag única,
  // para não "vazar" o pagamento de uma semana para a próxima (ex.: Sexta passada paga na Sexta futura).
  const pagouDiariaHoje = (jogador) => !!jogador.diariasPagas?.[dataJogo];

  useEffect(() => {
    if (!activeGroupId) return;

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list.filter(j => j.status === 'Ativo'));
      setLoading(false);
    });

    const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    getConfigFinanceira(activeGroupId, mesAtual).then(cfg => {
      setValorAvulso(parseFloat(String(cfg?.Avulso || 10).replace(',', '.')));
    });

    return () => unsub();
  }, [activeGroupId]);

  const handleMarcarPresenca = async (jogador, novoStatus) => {
    setUpdatingId(jogador.id);
    try {
      const isMensalistaDesteDia = jogador.tipo === 'MENSALISTA' && (jogador.diasMensalista || []).includes(diaSelecionado);
      const isAvulsoDesteDia = !isMensalistaDesteDia;

      if (isAvulsoDesteDia && !pagouDiariaHoje(jogador) && novoStatus === 'Confirmado') {
        alert(`Atenção: Para jogar em ${diaSelecionado}, ${jogador.nome} atua como Avulso e deve pagar a diária de R$${valorAvulso}!`);
        return;
      }

      const statusAntigo = jogador.presencas?.[dataJogo] || 'Falta';
      if (statusAntigo !== 'Confirmado' && novoStatus === 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, 1);
      } else if (statusAntigo === 'Confirmado' && novoStatus !== 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, -1);
      }

      await updateJogador(jogador.id, {
        [`presencas.${dataJogo}`]: novoStatus
      }, activeGroupId);

      await registrarLog('PRESENÇA', `Presença de ${jogador.nome} em ${diaSelecionado} alterada para: ${novoStatus}`, 0, activeGroupId);
    } catch (e) {
      console.error("Erro ao atualizar presença: ", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleDiariaAvulso = async (jogador) => {
    setUpdatingId(jogador.id);
    const novaDiariaPaga = !pagouDiariaHoje(jogador);
    try {
      if (novaDiariaPaga) {
        await marcarDiariaAvulsa(jogador.id, dataJogo, true, activeGroupId);
        await registrarOperacaoFinanceira(
          'ENTRADA_AVULSO',
          valorAvulso,
          `Diária paga: ${jogador.nome}`,
          activeGroupId,
          jogador.id
        );
      } else {
        await marcarDiariaAvulsa(jogador.id, dataJogo, false, activeGroupId);
        await removerDiariaAvulsa(jogador.id, dataJogo, activeGroupId);
      }
    } catch (e) {
      console.error("Erro ao alterar diária: ", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotificarWhatsApp = () => {
    const confirmados = jogadores.filter(j => j.presencas?.[dataJogo] === 'Confirmado');
    const msg = `🏐 *VOLEIZIN: Confirme sua Presença!* 🏐\n\nFala galera de ${diaSelecionado} (${formatarData(dataJogo)})!\n\nPor favor, confirme ou cancele sua presença no jogo!\n\nJá confirmados: *${confirmados.length}* 🔥\n\nAcesse: https://voleizindoscria.vercel.app/\n\nBora! 💪`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = jogadores.filter(j => 
    j.nome.toLowerCase().includes(search.toLowerCase())
  );

  const confirmados = jogadores.filter(j => j.presencas?.[dataJogo] === 'Confirmado');
  const mensalistasConfirmados = confirmados.filter(j => j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(diaSelecionado));
  const avulsosConfirmados = confirmados.filter(j => j.tipo === 'AVULSO' || (j.tipo === 'MENSALISTA' && !(j.diasMensalista || []).includes(diaSelecionado)));

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <UserCheck className="w-7 h-7 text-emerald-400" />
            <span>Chamada de Presença</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Chamada do dia <strong className="text-emerald-400">{diaSelecionado} {formatarData(dataJogo)}</strong> — cada data tem sua própria lista, sincronizada em tempo real com o aplicativo mobile.
          </p>
        </div>

        {/* Stats & Cobrar Presença */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleNotificarWhatsApp}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-2 rounded-2xl flex items-center space-x-1.5 text-xs transition-all"
          >
            <MessageSquareShare className="w-4 h-4" />
            <span>Cobrar Presença</span>
          </button>

          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase block">Presentes</span>
            <span className="text-lg font-black text-emerald-400">{confirmados.length}</span>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-cyan-400 font-extrabold uppercase block">Mensalistas</span>
            <span className="text-lg font-black text-cyan-400">{mensalistasConfirmados.length}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-amber-400 font-extrabold uppercase block">Avulsos</span>
            <span className="text-lg font-black text-amber-400">{avulsosConfirmados.length}</span>
          </div>
        </div>
      </div>

      {/* Days of the Week Selector Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <Calendar className="w-5 h-5 text-emerald-400 shrink-0 ml-1 mr-2" />
        {diasDaSemana.map((dia) => {
          const isActive = diaSelecionado === dia;
          const dataStr = formatarData(descobrirProximaData(dia));
          return (
            <button
              key={dia}
              onClick={() => setDiaSelecionado(dia)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex flex-col items-center shrink-0 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{dia}</span>
              <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                {dataStr}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar jogador por nome em ${diaSelecionado}...`}
          className="w-full bg-slate-900/80 text-white pl-12 pr-4 py-3.5 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Players List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((j) => {
          const statusDia = j.presencas?.[dataJogo] || 'Falta';
          const isConfirmado = statusDia === 'Confirmado';
          const isFalta = statusDia === 'Falta';

          const isMensalistaDesteDia = j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(diaSelecionado);
          const isAvulsoDesteDia = !isMensalistaDesteDia;
          const avulsoNaoPago = isAvulsoDesteDia && !pagouDiariaHoje(j);

          return (
            <div
              key={j.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                isConfirmado
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Left Info */}
              <div className="flex items-center space-x-3 min-w-0">
                <Avatar jogador={j} size={44} />
                <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-extrabold text-base ${isFalta ? 'line-through text-slate-500' : 'text-white'}`}>
                    {j.nome}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    isAvulsoDesteDia ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {isAvulsoDesteDia ? 'Avulso' : 'Mensalista'}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span>Nível: <strong className="text-amber-400">{j.nivel || 3} ⭐</strong></span>
                  
                  {isAvulsoDesteDia && (
                    <button
                      onClick={() => handleToggleDiariaAvulso(j)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 transition-all ${
                        pagouDiariaHoje(j)
                          ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-white font-extrabold shadow-md'
                      }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>{pagouDiariaHoje(j) ? 'Diária Paga ✅' : `Pagar R$${valorAvulso}`}</span>
                    </button>
                  )}
                </div>
                </div>
              </div>

              {/* Right Vou / Falto Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleMarcarPresenca(j, 'Confirmado')}
                  disabled={updatingId === j.id || (avulsoNaoPago && !isConfirmado)}
                  className={`px-3 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                    isConfirmado
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  } ${avulsoNaoPago && !isConfirmado ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Vou
                </button>

                <button
                  onClick={() => handleMarcarPresenca(j, 'Falta')}
                  disabled={updatingId === j.id}
                  className={`px-3 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
                    isFalta
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  Falto
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-semibold">Nenhum jogador encontrado com essa busca.</p>
        </div>
      )}

    </div>
  );
}
