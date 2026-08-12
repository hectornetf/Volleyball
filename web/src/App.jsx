import React, { useState } from 'react';
import { useSession } from './context/SessionContext';
import Navbar from './components/Navbar';
import WelcomePage from './pages/WelcomePage';
import DashboardPage from './pages/DashboardPage';
import PresencaPage from './pages/PresencaPage';
import TimesPage from './pages/TimesPage';
import FinanceiroPage from './pages/FinanceiroPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const { activeGroupId, loading } = useSession();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <span className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Carregando Voleizin...</span>
        </div>
      </div>
    );
  }

  if (!activeGroupId) {
    return <WelcomePage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage setActiveTab={setActiveTab} />;
      case 'presenca':
        return <PresencaPage />;
      case 'times':
        return <TimesPage />;
      case 'financeiro':
        return <FinanceiroPage />;
      case 'historico':
        return <HistoryPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <DashboardPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-600 font-semibold">
        <p>Voleizin dos Cria • Platform SaaS v2.1 • Criptografia AES-256</p>
      </footer>
    </div>
  );
}
