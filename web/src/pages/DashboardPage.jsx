import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, CheckCircle2, DollarSign, Calendar, ArrowUpRight, 
  TrendingUp, ShieldCheck, UserCheck, Flame, Gift, Star, Activity, AlertCircle
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores, getSaldoGlobalEquipamentos, getConfigFinanceira } from '../services/jogadorService';
import { computarFechamento } from '../utils/financeiroUtils';

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
  const [custosMes, setCustosMes] = useState(null);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const mesAtualNome = hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const diaAtual = hoje.getDate().toString().padStart(2, '0');

  const carregarDados = useCallback(async () => {
    if (!activeGroupId) return;
    try {
      const saldo = await getSaldoGlobalEquipamentos(activeGroupId);
      setSaldoCaixa(saldo);
      
      const conf = await getConfigFinanceira(activeGroupId, mesAtualNome);
      setCustosMes({
        Segunda: conf.Segunda, Terça: conf.Terca ?? conf.Terça, Quarta: conf.Quarta, Quinta: conf.Quinta, 
        Sexta: conf.Sexta, Sábado: conf.Sabado ?? conf.Sábado, Domingo: conf.Domingo, Avulso: conf.Avulso,
        status: conf.status || 'Em Aberto'
      });
    } catch (e) {
      console.error(e);
    }
  }, [activeGroupId, mesAtualNome]);

  useEffect(() => {
    if (!activeGroupId) return;

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
      setLoading(false);
    });

    carregarDados();

    const diaNome = getDiaAtualSemana();
    setDiaHojeStr(diaNome);

    const proxDataStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    setProximoJogo(proxDataStr);

    return () => unsub();
  }, [activeGroupId, carregarDados]);

  const ativos = jogadores.filter(j => j.status === 'Ativo');
  const mensalistas = ativos.filter(j => j.tipo === 'MENSALISTA');
  const avulsos = ativos.filter(j => j.tipo === 'AVULSO');
  
  // Leitura sincronizada com o Mobile
  const confirmadosHoje = ativos.filter(j => {
    const statusDia = j.presencas?.[diaHojeStr];
    if (statusDia) return statusDia === 'Confirmado';
    return j.presencaAtual === 'Confirmado';
  });

  // Aniversariantes do Mês
  const aniversariantesMes = ativos.filter(j => {
    if (!j.dataNascimento) return false;
    const dn = j.dataNascimento;
    return dn.includes(`-${mesAtual}-`) || dn.substring(3, 5) === mesAtual;
  }).map(j => {
    const dn = j.dataNascimento;
    const isHoje = dn.includes(`-${mesAtual}-${diaAtual}`) || dn.startsWith(`${diaAtual}/${mesAtual}`);
    const dia = dn.includes('-') ? dn.substring(8, 10) : dn.substring(0, 2);
    return { ...j, isHoje, dia };
  }).sort((a, b) => a.dia.localeCompare(b.dia));

  // Ranking Top 5 Assíduos
  const ranking = [...jogadores]
    .sort((a, b) => (b.historicoPresencas || 0) - (a.historicoPresencas || 0))
    .slice(0, 5);

  // Equilíbrio Técnico
  const niveis = [5, 4, 3, 2, 1].map(n => ({
    nivel: n,
    qtd: ativos.filter(j => (j.nivel || 3) === n).length
  }));
  const maxNivel = Math.max(...niveis.map(n => n.qtd), 1);

  // Financeiro Pendências
  const fechamento = custosMes && jogadores.length > 0 ? computarFechamento(custosMes, jogadores, mesAtualNome, custosMes.status) : null;
  const devedoresMap = {};
  const jaPagoTotalmente = fechamento && fechamento.statusGeral === 'Pago Totalmente';

  if (fechamento && !jaPagoTotalmente) {
    Object.keys(fechamento.dias).forEach(dia => {
       const infoDia = fechamento.dias[dia];
       infoDia.jogadores.forEach(j => {
          const pagamentoDaChaveConsta = j.pagamentosMensais && j.pagamentosMensais[`${dia}_${mesAtualNome}`];
          if (!pagamentoDaChaveConsta) {
             if (!devedoresMap[j.id]) {
                 devedoresMap[j.id] = { ...j, valor: 0 };
             }
             devedoresMap[j.id].valor += infoDia.valorPorPessoa;
          }
       });
    });
  }
  const devedores = Object.values(devedoresMap).sort((a, b) => a.nome.localeCompare(b.nome));

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Listas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Confirmados List Snapshot */}
          <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
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

          {/* Devedores e Aniversariantes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <h2 className="text-base font-extrabold text-white">Devedores de {mesAtualNome}</h2>
                </div>
              </div>
              {devedores.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Todos em dia!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {devedores.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                      <span className="text-xs font-bold text-slate-300">{d.nome}</span>
                      <span className="text-xs font-black text-rose-400">R$ {d.valor.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-extrabold text-white">Aniversariantes ({mesAtualNome})</h2>
                </div>
              </div>
              {aniversariantesMes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Nenhum aniversariante neste mês.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {aniversariantesMes.map(j => (
                    <div key={j.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${j.isHoje ? 'bg-purple-500/20 border-purple-500/30' : 'bg-slate-800/40 border-slate-700/30'}`}>
                      <span className={`text-xs font-bold ${j.isHoje ? 'text-purple-300' : 'text-slate-300'}`}>
                        {j.nome}
                      </span>
                      <span className={`text-xs font-black ${j.isHoje ? 'text-purple-400' : 'text-slate-400'}`}>
                        Dia {j.dia}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Lado Direito: Dashboards Secundários */}
        <div className="space-y-6">
          
          <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
            <h2 className="text-base font-extrabold text-white mb-4 flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span>Top 5 Assíduos</span>
            </h2>
            <div className="space-y-3">
              {ranking.map((j, i) => (
                <div key={j.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300' :
                      i === 2 ? 'bg-amber-800/30 text-amber-700' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold text-white">{j.nome}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{j.historicoPresencas || 0} presenças</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
            <h2 className="text-base font-extrabold text-white mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>Equilíbrio Técnico (Ativos)</span>
            </h2>
            <div className="space-y-3">
              {niveis.map(n => (
                <div key={n.nivel} className="flex items-center space-x-3">
                  <span className="w-10 text-xs font-bold text-slate-400">{n.nivel} ⭐</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${(n.qtd / maxNivel) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-white">{n.qtd}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white mb-2">Ações Rápidas</h2>
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
          </div>

        </div>
      </div>
    </div>
  );
}
