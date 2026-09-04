import React, { useState } from 'react';
import { Key, PlusCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { generateGroupCode } from '../services/sessionService';

export default function WelcomePage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { loginAsGroup } = useSession();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Por favor, informe um código válido de 4 caracteres (Ex: VO-ABCD ou ABCD).');
      return;
    }
    let finalCode = code.toUpperCase().trim();
    if (!finalCode.startsWith('VO-')) finalCode = `VO-${finalCode}`;
    setError('');
    await loginAsGroup(finalCode);
  };

  const handleCreate = async () => {
    const newCode = generateGroupCode();
    await loginAsGroup(newCode);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-5 bg-slate-900/80 rounded-3xl border border-slate-800 shadow-2xl mb-4 relative">
            <span className="text-5xl animate-bounce">🏐</span>
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">VoleizinDosCria</h1>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400 mt-1">
            • PRO WEB
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Plataforma de gestão de peladas, finanças, rateios e sorteio de times com dados criptografados.
          </p>
        </div>

        {/* Enter Existing Group Box */}
        <div className="bg-slate-900/70 p-6 sm:p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-5 text-center">
            Acessar Vôlei Existente
          </h2>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <div className="relative">
                <Key className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Código do Vôlei (Ex: VO-ABCD)"
                  className="w-full bg-[#0b0f1a] text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-700 font-mono font-bold text-lg focus:outline-none focus:border-cyan-500 transition-colors uppercase placeholder:text-slate-600"
                />
              </div>
              {error && <p className="text-rose-400 text-xs font-semibold mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-98"
            >
              <span>ENTRAR NO GRUPO</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Create New Group Footer */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Precisa de um novo grupo?
          </p>

          <button
            onClick={handleCreate}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 shadow-lg transition-all active:scale-98"
          >
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <span className="uppercase text-xs tracking-wider">Criar Novo Vôlei (Gerar Código)</span>
          </button>

          <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Dados 100% criptografados em AES-256</span>
          </div>
        </div>

      </div>
    </div>
  );
}
