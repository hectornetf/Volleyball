import React from 'react';
import {
  LayoutDashboard, CheckSquare, Users, DollarSign,
  History, Settings, LogOut, ShieldCheck, Copy, MessageCircle
} from 'lucide-react';
import { useSession } from '../context/SessionContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { activeGroupId, logout } = useSession();

  const copiarCodigo = async () => {
    await navigator.clipboard.writeText(activeGroupId);
    alert('Código do grupo copiado!');
  };

  const compartilharCodigo = () => {
    const mensagem = `🏐 CONVITE VOLEIZIN 🏐\n\nEntre no nosso grupo usando o código:\n\n🔑 ${activeGroupId}\n\nBora pro jogo!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const navItems = [
    { id: 'dashboard', label: 'Resumo', icon: LayoutDashboard },
    { id: 'presenca', label: 'Presença', icon: CheckSquare },
    { id: 'times', label: 'Times', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f1a]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Group Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xl">🏐</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-white">VoleizinDosCria</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO WEB</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-bold text-cyan-400">{activeGroupId}</span>
                <button onClick={copiarCodigo} title="Copiar código do grupo" className="p-1 text-slate-500 hover:text-cyan-400">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={compartilharCodigo} title="Compartilhar código no WhatsApp" className="p-1 text-slate-500 hover:text-emerald-400">
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout Action */}
          <div className="flex items-center space-x-2">
            <button
              onClick={logout}
              title="Sair do Grupo"
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs (Bottom / Responsive Bar) */}
      <div className="md:hidden flex items-center justify-around bg-slate-900/95 border-t border-slate-800 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${isActive
                  ? 'text-cyan-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
