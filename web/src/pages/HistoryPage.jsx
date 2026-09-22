import React, { useState, useEffect } from 'react';
import { History, Clock, ShieldAlert, DollarSign, UserPlus, CheckCircle2, Search, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeLogs, limparLogsAntigos } from '../services/historyService';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const mesAtual = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const rotularMes = (mes) => {
  const [a, m] = (mes || '').split('-');
  if (!a || !m) return mes || '—';
  return `${MESES[Number(m) - 1]} de ${a}`;
};

const somarMes = (mes, delta) => {
  const [a, m] = (mes || '').split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Retenção/análise: apenas 3 meses (atual e 2 anteriores).
const MESES_RETENCAO = 3;
const mesMinimo = () => somarMes(mesAtual(), -(MESES_RETENCAO - 1));

export default function HistoryPage() {
  const { activeGroupId } = useSession();
  const [logs, setLogs] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [mes, setMes] = useState(mesAtual());
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeLogs(activeGroupId, (list) => {
      setLogs(list);
      setLoading(false);
    }, undefined, mes);
    return () => unsub();
  }, [activeGroupId, mes]);

  useEffect(() => {
    if (!activeGroupId) return;
    const chave = `voleizin_logs_limpos_${activeGroupId}_${mesAtual()}`;
    if (localStorage.getItem(chave)) return;
    limparLogsAntigos(activeGroupId).finally(() => localStorage.setItem(chave, '1'));
  }, [activeGroupId]);

  const categorias = ['TODAS', 'SISTEMA', 'FINANCEIRO', 'CADASTRO', 'PRESENÇA'];

  const filteredLogs = logs.filter(log => {
    const termo = busca.toLowerCase();
    const correspondeTexto = (log.descricao || '').toLowerCase().includes(termo) ||
      (log.categoria || '').toLowerCase().includes(termo) ||
      (log.tipo || '').toLowerCase().includes(termo);
    const correspondeCategoria = categoriaFiltro === 'TODAS' || log.categoria === categoriaFiltro;
    return correspondeTexto && correspondeCategoria;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'FINANCEIRO':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: DollarSign };
      case 'CADASTRO':
        return { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: UserPlus };
      case 'PRESENÇA':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: CheckCircle2 };
      default:
        return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: ShieldAlert };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <History className="w-7 h-7 text-cyan-400" />
            <span>Histórico de Atividades</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Feed de auditoria em tempo real das ações registradas no grupo.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar descrição, categoria ou tipo..."
            className="w-full bg-slate-950 text-white pl-9 pr-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-1 rounded-xl font-extrabold text-[11px] uppercase transition-all ${
                categoriaFiltro === cat
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Navegação por mês (máx. 3 meses) */}
        <div className="flex items-center justify-between gap-3 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => mes !== mesMinimo() && setMes(somarMes(mes, -1))}
            className={`p-2 rounded-xl transition-all ${
              mes === mesMinimo() ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            aria-label="Mês anterior"
            disabled={mes === mesMinimo()}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMes(mesAtual())}
            className="flex items-center space-x-2 text-slate-200 font-extrabold text-[11px] uppercase tracking-wider hover:text-cyan-300 transition-all"
            title="Voltar ao mês atual"
          >
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span>{rotularMes(mes)}</span>
          </button>
          <button
            onClick={() => setMes(somarMes(mes, 1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const badge = getCategoryBadge(log.categoria);
          const Icon = badge.icon;

          return (
            <div
              key={log.id}
              className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-start justify-between hover:border-slate-700 transition-all"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl border ${badge.bg} mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badge.bg}`}>
                      {log.categoria}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{log.tipo}</span>
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-white mt-1">{log.descricao}</p>
                </div>
              </div>

              {log.valor ? (
                <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                  log.valor > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {log.valor > 0 ? `+ R$ ${log.valor.toFixed(2)}` : `- R$ ${Math.abs(log.valor).toFixed(2)}`}
                </span>
              ) : null}
            </div>
          );
        })}

        {filteredLogs.length === 0 && !loading && (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-semibold">Nenhuma atividade encontrada nesta categoria.</p>
          </div>
        )}
      </div>

    </div>
  );
}
