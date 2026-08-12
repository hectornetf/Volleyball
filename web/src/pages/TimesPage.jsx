import React, { useState, useEffect } from 'react';
import { 
  Users, Shuffle, Copy, Check, Flame, Trophy, Sparkles, Calendar
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores } from '../services/jogadorService';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const getDiaAtualSemana = () => {
  const hoje = new Date().getDay(); // 0=Dom, 1=Seg...
  const mapa = [6, 0, 1, 2, 3, 4, 5];
  return diasDaSemana[mapa[hoje]] ?? 'Segunda';
};

export default function TimesPage() {
  const { activeGroupId } = useSession();
  const [diaSelecionado, setDiaSelecionado] = useState(getDiaAtualSemana);
  const [confirmados, setConfirmados] = useState([]);
  const [tamanhoTime, setTamanhoTime] = useState(6);
  const [timesGerados, setTimesGerados] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (list) => {
      const pres = list.filter(j => {
        if (j.status !== 'Ativo') return false;
        const statusDia = j.presencas?.[diaSelecionado];
        if (statusDia) return statusDia === 'Confirmado';
        return j.presencaAtual === 'Confirmado';
      });
      setConfirmados(pres);
    });
    return () => unsub();
  }, [activeGroupId, diaSelecionado]);

  const handleSortearTimes = () => {
    if (confirmados.length === 0) return;

    const listaOrdenada = [...confirmados].sort((a, b) => {
      const diff = (b.nivel || 3) - (a.nivel || 3);
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

    const numTimes = Math.ceil(listaOrdenada.length / tamanhoTime);
    const times = Array.from({ length: numTimes }, () => []);

    let direcao = 1;
    let indexTime = 0;

    listaOrdenada.forEach((jogador) => {
      times[indexTime].push(jogador);
      if (direcao === 1) {
        if (indexTime === numTimes - 1) {
          direcao = -1;
        } else {
          indexTime++;
        }
      } else {
        if (indexTime === 0) {
          direcao = 1;
        } else {
          indexTime--;
        }
      }
    });

    setTimesGerados(times);
    setCopied(false);
  };

  const handleCopiarWhatsApp = () => {
    if (timesGerados.length === 0) return;

    let texto = `🏐 *SORTEIO DE TIMES (${diaSelecionado.toUpperCase()}) — VOLEIZIN DOS CRIA* 🔥\n`;
    texto += `Grupo: *${activeGroupId}* | Confirmados: ${confirmados.length}\n\n`;

    timesGerados.forEach((time, idx) => {
      const somaNivel = time.reduce((acc, j) => acc + (j.nivel || 3), 0);
      const media = (somaNivel / time.length).toFixed(1);
      texto += `*TIME ${idx + 1}* (Média: ⭐ ${media})\n`;
      time.forEach((j, jIdx) => {
        texto += `${jIdx + 1}. ${j.nome} (${j.nivel || 3}⭐)\n`;
      });
      texto += `\n`;
    });

    texto += `⚡ *Que vença o melhor time!*`;

    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Sorteio de Times Equilibrados</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gere times balanceados automaticamente com os jogadores confirmados em {diaSelecionado}.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Format Selector */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-2xl border border-slate-700">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => setTamanhoTime(num)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  tamanhoTime === num
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {num}x{num}
              </button>
            ))}
          </div>

          {/* Draw Button */}
          <button
            onClick={handleSortearTimes}
            disabled={confirmados.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider transition-all active:scale-98 disabled:opacity-50"
          >
            <Shuffle className="w-4 h-4" />
            <span>Sortear ({confirmados.length})</span>
          </button>
        </div>
      </div>

      {/* Days Selector */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <Calendar className="w-5 h-5 text-cyan-400 shrink-0 ml-1 mr-2" />
        {diasDaSemana.map((dia) => {
          const isActive = diaSelecionado === dia;
          return (
            <button
              key={dia}
              onClick={() => { setDiaSelecionado(dia); setTimesGerados([]); }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>

      {/* Confirmed Summary Banner */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Flame className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-extrabold text-white">
            {confirmados.length} Jogadores Confirmados para {diaSelecionado}
          </span>
        </div>
        
        {timesGerados.length > 0 && (
          <button
            onClick={handleCopiarWhatsApp}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold px-4 py-2 rounded-xl flex items-center space-x-2 text-xs transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar para WhatsApp'}</span>
          </button>
        )}
      </div>

      {/* Generated Teams Grid */}
      {timesGerados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timesGerados.map((time, idx) => {
            const somaNivel = time.reduce((acc, j) => acc + (j.nivel || 3), 0);
            const media = (somaNivel / time.length).toFixed(1);

            return (
              <div key={idx} className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4">
                
                {/* Team Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-lg text-white">TIME {idx + 1}</h3>
                  </div>
                  <div className="bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                    <span className="text-[11px] text-slate-400 font-bold">Média: </span>
                    <span className="text-xs font-black text-amber-400">{media} ⭐</span>
                  </div>
                </div>

                {/* Team Roster */}
                <div className="space-y-2">
                  {time.map((j, jIdx) => (
                    <div key={j.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-500 w-4">{jIdx + 1}.</span>
                        <span className="font-extrabold text-white">{j.nome}</span>
                      </div>
                      <span className="text-amber-400 font-bold">{j.nivel || 3} ⭐</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-white">Nenhum time sorteado para {diaSelecionado}</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Clique no botão <strong>Sortear</strong> acima para gerar os times equilibrados com os jogadores confirmados em {diaSelecionado}.
          </p>
        </div>
      )}

    </div>
  );
}
