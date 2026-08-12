import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, DollarSign, Calendar, ArrowUpRight, 
  TrendingUp, ShieldCheck, UserCheck, Flame
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores, getSaldoGlobalEquipamentos } from '../services/jogadorService';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const getDiaAtualSemana = () => {
  const hoje = new Date().getDay(); // 0=Dom, 1=Seg...
  const mapa = [6, 0, 1, 2, 3, 4, 5];
  return diasDaSemana[mapa[hoje]] ?? 'Segunda';
};

export default function DashboardPage({ setActiveTab }) {
  const { activeGroupId } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [proximoJogo, setProximoJogo] = useState('');
  const [diaHojeStr, setDiaHojeStr] = useState(getDiaAtualSemana);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) return;

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
      setLoading(false);
    });

    getSaldoGlobalEquipamentos(activeGroupId).then(setSaldoCaixa);

    const hoje = new Date();
    const diaNome = getDiaAtualSemana();
    setDiaHojeStr(diaNome);

    const proxDataStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    setProximoJogo(proxDataStr);

    return () => unsub();
  }, [activeGroupId]);

  const ativos = jogadores.filter(j => j.status === 'Ativo');
  const mensalistas = ativos.filter(j => j.tipo === 'MENSALISTA');
  const avulsos = ativos.filter(j => j.tipo === 'AVULSO');
  
  // Leitura sincronizada com o Mobile (checa presencas.[diaHoje] ou presencaAtual)
  const confirmadosHoje = ativos.filter(j => {
    const statusDia = j.presencas?.[diaHojeStr];
    if (statusDia) return statusDia === 'Confirmado';
    return j.presencaAtual === 'Confirmado';
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Painel de Controle • Grupo {activeGroupId}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Visão Geral do Vôlei
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Acompanhe presenças, fluxo financeiro do grupo e monte os times do próximo jogo.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('presenca')}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-extrabold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all text-xs uppercase tracking-wider"
            >
              <UserCheck className="w-4 h-4" />
              <span>Fazer Chamada ({diaHojeStr})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ativos Total */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total de Jogadores</span>
            <div className="text-3xl font-black text-white mt-1">{ativos.length}</div>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
              {mensalistas.length} Mensalistas • {avulsos.length} Avulsos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Confirmados Hoje */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Confirmados ({diaHojeStr})</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{confirmadosHoje.length}</div>
            <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">
              Prontos para jogar!
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo de Equipamentos */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Caixa Equipamentos</span>
            <div className={`text-3xl font-black mt-1 ${saldoCaixa >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              R$ {saldoCaixa.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
              Fundo de bolas e coletes
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Próximo Jogo */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Data de Hoje</span>
            <div className="text-2xl font-black text-white mt-1">{proximoJogo}</div>
            <span className="text-[11px] text-cyan-400 font-semibold mt-1 block">
              Pelada de {diaHojeStr}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Quick Action Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Confirmed List Snapshot */}
        <div className="lg:col-span-2 bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-extrabold text-white">Lista de Confirmados ({diaHojeStr}: {confirmadosHoje.length})</h2>
            </div>
            <button
              onClick={() => setActiveTab('presenca')}
              className="text-xs text-cyan-400 hover:underline font-bold flex items-center space-x-1"
            >
              <span>Gerenciar Presença</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {confirmadosHoje.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500 text-xs font-semibold">Nenhum jogador confirmou presença ainda para {diaHojeStr}.</p>
              <button
                onClick={() => setActiveTab('presenca')}
                className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all"
              >
                Abrir Chamada de {diaHojeStr}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {confirmadosHoje.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-sm text-white">{j.nome}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      Nível {j.nivel || 3} ⭐
                    </span>
                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                      j.tipo === 'MENSALISTA' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {j.tipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Menu Panel */}
        <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white mb-2">Ações Rápidas</h2>
            <p className="text-slate-400 text-xs mb-4">
              Navegue pelas ferramentas de gestão da pelada:
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('times')}
              className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">Sortear Times Equilibrados</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('financeiro')}
              className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">Ver Rateio do Mês</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-800">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
              Sincronizado em tempo real com Mobile
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
