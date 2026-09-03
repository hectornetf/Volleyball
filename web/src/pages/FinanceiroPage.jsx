import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ChevronLeft, ChevronRight, CheckCircle2, 
  Settings, TrendingUp, MessageSquareShare, PlusCircle, MinusCircle, RefreshCw, Calculator
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { 
  subscribeJogadores, getConfigFinanceira, saveConfigFinanceira, 
  updateJogador, getSaldoGlobalEquipamentos, registrarEntradaCaixa, registrarSaidaCaixa 
} from '../services/jogadorService';
import { registrarLog } from '../services/historyService';
import { computarFechamento } from '../utils/financeiroUtils';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function FinanceiroPage() {
  const { activeGroupId } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [offsetMes, setOffsetMes] = useState(0);
  const [custosQuadra, setCustosQuadra] = useState({
    Segunda: '0', Terça: '0', Quarta: '0', Quinta: '0', Sexta: '0', Sábado: '0', Domingo: '0', Avulso: '10'
  });
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [modalCaixa, setModalCaixa] = useState(false);
  const [tipoCaixa, setTipoCaixa] = useState('ENTRADA');
  const [valorCaixa, setValorCaixa] = useState('');
  const [descCaixa, setDescCaixa] = useState('');
  const [modalConfig, setModalConfig] = useState(false);
  const [configTemp, setConfigTemp] = useState({});
  const [fechamentoIniciado, setFechamentoIniciado] = useState(true);
  const [statusMes, setStatusMes] = useState('Em Aberto');

  const refDate = new Date();
  refDate.setMonth(refDate.getMonth() + offsetMes);
  const mesRefStr = refDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

  useEffect(() => {
    if (!activeGroupId) return;

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
    });

    getConfigFinanceira(activeGroupId, mesRefStr).then(cfg => {
      const parsedCfg = {
        Segunda: String(cfg.Segunda ?? '0'),
        Terça: String(cfg.Terça ?? cfg.Terca ?? '0'),
        Quarta: String(cfg.Quarta ?? '0'),
        Quinta: String(cfg.Quinta ?? '0'),
        Sexta: String(cfg.Sexta ?? '0'),
        Sábado: String(cfg.Sábado ?? cfg.Sabado ?? '0'),
        Domingo: String(cfg.Domingo ?? '0'),
        Avulso: String(cfg.Avulso ?? '10')
      };
      setCustosQuadra(parsedCfg);
      setConfigTemp(parsedCfg);
      setStatusMes(cfg.status || 'Em Aberto');

      const temCusto = diasDaSemana.some(d => (parseFloat(String(parsedCfg[d]).replace(',', '.')) || 0) > 0);
      setFechamentoIniciado(temCusto || cfg.autoIniciarRateioMock === true);
    });

    getSaldoGlobalEquipamentos(activeGroupId).then(setSaldoCaixa);

    return () => unsub();
  }, [activeGroupId, mesRefStr]);

  const fechamento = computarFechamento(custosQuadra, jogadores, mesRefStr, statusMes);

  const handleTogglePagamentoMensalista = async (jogador, dia) => {
    const key = `${dia}_${mesRefStr}`;
    const pagamentosAtuais = jogador.pagamentosMensais || {};
    const novoStatus = !pagamentosAtuais[key];

    await updateJogador(jogador.id, { [`pagamentosMensais.${key}`]: novoStatus }, activeGroupId);
    await registrarLog('FINANCEIRO', `Mensalidade (${dia}) de ${jogador.nome} marcada como: ${novoStatus ? 'PAGO' : 'PENDENTE'}`, 0, activeGroupId);

    const elencoAtualizado = jogadores.map(item => item.id === jogador.id
      ? { ...item, pagamentosMensais: { ...pagamentosAtuais, [key]: novoStatus } }
      : item
    );
    const fechamentoAtualizado = computarFechamento(custosQuadra, elencoAtualizado, mesRefStr, statusMes);
    if (fechamentoAtualizado.statusGeral !== statusMes) {
      setStatusMes(fechamentoAtualizado.statusGeral);
      await saveConfigFinanceira(activeGroupId, mesRefStr, { status: fechamentoAtualizado.statusGeral });
    }
  };

  const handleCobrarMensalidadeDia = (valorPorPessoa, dia) => {
    const v = valorPorPessoa.toFixed(2).replace('.', ',');
    const msg = `🏐 *VOLEIZIN: Mensalidade ${dia}* 🏐\n\nGalera de ${dia}!\n\nO valor da mensalidade deste mês é:\n💰 *R$ ${v} por pessoa*\n\nPor favor, efetuem o pagamento para garantir a quadra! 🙏`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSalvarCaixa = async (e) => {
    e.preventDefault();
    const val = parseFloat(valorCaixa.replace(',', '.'));
    if (!val || val <= 0 || !descCaixa.trim()) return;

    if (tipoCaixa === 'ENTRADA') {
      await registrarEntradaCaixa(val, descCaixa, activeGroupId);
    } else {
      await registrarSaidaCaixa(val, descCaixa, activeGroupId);
    }

    setValorCaixa('');
    setDescCaixa('');
    setModalCaixa(false);
    getSaldoGlobalEquipamentos(activeGroupId).then(setSaldoCaixa);
  };

  const handleSalvarConfigCustos = async () => {
    await saveConfigFinanceira(activeGroupId, mesRefStr, {
      ...configTemp,
      Terca: configTemp.Terça,
      Sabado: configTemp.Sábado,
      status: statusMes
    });
    setCustosQuadra(configTemp);
    setFechamentoIniciado(true);
    setModalConfig(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            <span>Gestão Financeira & Rateio</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Controle de custos da quadra por dia da semana e caixa de equipamentos.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setOffsetMes(prev => prev - 1)}
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 font-extrabold text-xs text-cyan-400 uppercase tracking-wider min-w-[120px] text-center">
            {mesRefStr}
          </div>
          <button
            onClick={() => setOffsetMes(prev => prev + 1)}
            className="p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form / Configuration setup if not started */}
      {!fechamentoIniciado ? (
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <span>Novo Fechamento ({mesRefStr})</span>
          </h2>
          <p className="text-xs text-slate-400">Configure os custos fixos da quadra para cada dia da semana:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {diasDaSemana.map((dia) => (
              <div key={dia}>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">{dia}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">R$</span>
                  <input
                    type="number"
                    value={configTemp[dia] || ''}
                    onChange={(e) => setConfigTemp({ ...configTemp, [dia]: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-white font-bold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            ))}
            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-xs text-amber-400 font-bold uppercase block mb-1">Valor Diária Avulso (R$)</label>
              <input
                type="number"
                value={configTemp.Avulso || '10'}
                onChange={(e) => setConfigTemp({ ...configTemp, Avulso: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            onClick={handleSalvarConfigCustos}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
          >
            Iniciar Rateio do Mês
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Meta da Quadra */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Custo Total Quadra ({mesRefStr})</span>
              <div className="text-3xl font-black text-white mt-1">
                R$ {fechamento.metaArrecadacao.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                Soma dos custos configurados
              </span>
            </div>

            {/* Total Arrecadado Mensalistas */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Arrecadado Mensalistas</span>
              <div className="text-3xl font-black text-emerald-400 mt-1">
                R$ {fechamento.totalArrecadadoMensalistas.toFixed(2)}
              </div>
              <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">
                Status: {fechamento.statusGeral}
              </span>
            </div>

            {/* Caixa de Equipamentos */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Caixa Equipamentos</span>
                <div className={`text-3xl font-black mt-1 ${saldoCaixa >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  R$ {saldoCaixa.toFixed(2)}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => { setTipoCaixa('ENTRADA'); setModalCaixa(true); }}
                    className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => { setTipoCaixa('SAIDA'); setModalCaixa(true); }}
                    className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                  >
                    - Saída
                  </button>
                </div>
              </div>

              <button
                onClick={() => setModalConfig(true)}
                title="Configurar Custos da Quadra"
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Rateio por Dia da Semana Cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Rateio por Dia da Semana</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {diasDaSemana.filter(dia => fechamento.dias[dia]).map((dia) => {
                const infoDia = fechamento.dias[dia];

                return (
                  <div key={dia} className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-3">
                    
                    {/* Card Top */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h3 className="font-black text-base text-white">{dia}</h3>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          Custo Quadra: <strong>R$ {infoDia.custo.toFixed(2)}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Valor/Pessoa</span>
                        <span className="text-sm font-black text-cyan-400">
                          R$ {infoDia.valorPorPessoa.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Mensalistas List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {infoDia.jogadores.map((j) => (
                        <div
                          key={j.id}
                          onClick={() => handleTogglePagamentoMensalista(j, dia)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            j.mensalidadePaga
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-xs font-bold">{j.nome}</span>
                          <div className="flex items-center space-x-1.5 text-xs font-extrabold">
                            {j.mensalidadePaga ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>PAGO</span>
                              </>
                            ) : (
                              <span className="text-rose-400 text-[10px] uppercase font-bold">Pendente</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {infoDia.jogadores.length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center py-4">
                          {infoDia.aviso || 'Nenhum mensalista cadastrado para este dia.'}
                        </p>
                      )}
                    </div>

                    {/* Cobrar Todos via WhatsApp Button */}
                    {infoDia.jogadores.length > 0 && (
                      <button
                        onClick={() => handleCobrarMensalidadeDia(infoDia.valorPorPessoa, dia)}
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all mt-2"
                      >
                        <MessageSquareShare className="w-4 h-4" />
                        <span>Cobrar Todos ({dia})</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal Lançamento Caixa */}
      {modalCaixa && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black text-white">
              {tipoCaixa === 'ENTRADA' ? 'Lançar Entrada no Caixa' : 'Lançar Saída/Despesa no Caixa'}
            </h3>

            <form onSubmit={handleSalvarCaixa} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorCaixa}
                  onChange={(e) => setValorCaixa(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Descrição</label>
                <input
                  type="text"
                  value={descCaixa}
                  onChange={(e) => setDescCaixa(e.target.value)}
                  placeholder="Ex: Bolas novas ou doação"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCaixa(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`w-1/2 font-extrabold py-3 rounded-xl text-xs uppercase text-white ${
                    tipoCaixa === 'ENTRADA' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                  }`}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuração de Custos */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white">Configurar Custos da Quadra ({mesRefStr})</h3>
            <p className="text-xs text-slate-400">Defina o valor fixo cobrado pela quadra em cada dia da semana:</p>

            <div className="grid grid-cols-2 gap-3">
              {diasDaSemana.map((dia) => (
                <div key={dia}>
                  <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">{dia}</label>
                  <input
                    type="number"
                    value={configTemp[dia] || ''}
                    onChange={(e) => setConfigTemp({ ...configTemp, [dia]: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[11px] text-amber-400 font-bold uppercase block mb-1">Valor Diária Avulso (R$)</label>
                <input
                  type="number"
                  value={configTemp.Avulso || '10'}
                  onChange={(e) => setConfigTemp({ ...configTemp, Avulso: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <button
                onClick={() => setModalConfig(false)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarConfigCustos}
                className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 rounded-xl text-xs uppercase"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
