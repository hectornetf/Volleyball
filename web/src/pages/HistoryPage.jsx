import React, { useState, useEffect } from 'react';
import { History, Filter, Clock, ShieldAlert, DollarSign, UserPlus, CheckCircle2 } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeLogs } from '../services/historyService';

export default function HistoryPage() {
  const { activeGroupId } = useSession();
  const [logs, setLogs] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeLogs(activeGroupId, (list) => {
      setLogs(list);
      setLoading(false);
    });
    return () => unsub();
  }, [activeGroupId]);

  const categorias = ['TODAS', 'SISTEMA', 'FINANCEIRO', 'CADASTRO', 'PRESENÇA'];

  const filteredLogs = logs.filter(log => {
    if (categoriaFiltro === 'TODAS') return true;
    return log.categoria === categoriaFiltro;
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
