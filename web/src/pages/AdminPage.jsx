import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, UserPlus, Search, Edit, Trash2, Power, 
  Sparkles, AlertTriangle, ShieldCheck, Check, X, Phone, Calendar, Upload
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { 
  subscribeJogadores, addJogador, updateJogador, deleteJogador, 
  gerarDadosDeTestePro, resetDadosGrupo 
} from '../services/jogadorService';

function formatarDataNascimentoDigitos(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function dataNascimentoValidaOuVazia(value) {
  const text = (value || '').trim();
  if (!text) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return true;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return false;

  const day = Number(text.slice(0, 2));
  const month = Number(text.slice(3, 5));
  const year = Number(text.slice(6, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function mascaraTelefone(text) {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function AdminPage() {
  const { activeGroupId } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [search, setSearch] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [editingJogador, setEditingJogador] = useState(null);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('TODOS');
  const [ordemNivel, setOrdemNivel] = useState(false);
  
  const fileInputRef = useRef(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formCelular, setFormCelular] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [formTipo, setFormTipo] = useState('MENSALISTA');
  const [formNivel, setFormNivel] = useState(3);
  const [formDias, setFormDias] = useState(['Segunda', 'Quarta']);

  const diasDisponiveis = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
    });
    return () => unsub();
  }, [activeGroupId]);

  const resetForm = () => {
    setFormNome('');
    setFormCelular('');
    setFormDataNasc('');
    setFormTipo('MENSALISTA');
    setFormNivel(3);
    setFormDias(['Segunda', 'Quarta']);
    setEditingJogador(null);
    setModalNovo(false);
  };

  const handleOpenEdit = (j) => {
    setEditingJogador(j);
    setFormNome(j.nome || '');
    setFormCelular('');
    setFormDataNasc('');
    setFormTipo(j.tipo || 'MENSALISTA');
    setFormNivel(j.nivel || 3);
    setFormDias(j.diasMensalista || ['Segunda', 'Quarta']);
    setModalNovo(true);
  };

  const handleSaveJogador = async (e) => {
    e.preventDefault();
    if (!formNome.trim() || (!formCelular.trim() && !editingJogador)) {
      alert('Nome e celular são obrigatórios!');
      return;
    }
    if (!dataNascimentoValidaOuVazia(formDataNasc)) {
      alert('Data de nascimento inválida. Use DD/MM/AAAA ou deixe em branco.');
      return;
    }

    setLoading(true);
    try {
      const celular = formCelular.trim() || editingJogador?.celular || '';
      const dataNascimento = formDataNasc.trim() || editingJogador?.dataNascimento || '';
      const dados = {
        nome: formNome.trim(),
        celular,
        dataNascimento,
        tipo: formTipo,
        nivel: parseInt(formNivel) || 3,
        diasMensalista: formTipo === 'MENSALISTA' ? formDias : []
      };

      if (editingJogador) {
        await updateJogador(editingJogador.id, dados, activeGroupId);
      } else {
        await addJogador(dados, activeGroupId);
      }
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar jogador: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (j) => {
    const novoStatus = j.status === 'Ativo' ? 'Inativo' : 'Ativo';
    await updateJogador(j.id, { status: novoStatus, nome: j.nome }, activeGroupId);
  };

  const handleDelete = async (j) => {
    if (confirm(`Tem certeza que deseja excluir o jogador "${j.nome}"?`)) {
      await deleteJogador(j.id, j.nome, activeGroupId);
    }
  };

  const handleGerarMock = async () => {
    if (confirm("Gerar 16 jogadores de teste com finanças e chamadas para simulação PRO?")) {
      setLoading(true);
      await gerarDadosDeTestePro(activeGroupId);
      setLoading(false);
    }
  };

  const handleResetGeral = async () => {
    if (confirm(`ATENÇÃO: Deseja apagar TODOS os dados do grupo ${activeGroupId}? Essa ação não pode ser desfeita.`)) {
      setLoading(true);
      await resetDadosGrupo(activeGroupId);
      setLoading(false);
    }
  };

  const toggleDia = (dia) => {
    if (formDias.includes(dia)) {
      setFormDias(formDias.filter(d => d !== dia));
    } else {
      setFormDias([...formDias, dia]);
    }
  };

  const handleImportarPlanilha = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const { read, utils } = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = utils.sheet_to_json(worksheet);

      let adicionados = 0;
      let atualizados = 0;

      for (const row of json) {
        if (!row.Nome) continue;

        const nome = String(row.Nome).trim();
        let celular = row.Telefone ? String(row.Telefone).trim() : '';
        let nivel = parseInt(row['Nível (1-5)']) || 3;
        
        let tipo = 'MENSALISTA';
        let diasMensalista = [];
        const tipoRow = String(row.Tipo || '');
        if (tipoRow.toLowerCase().includes('avulso')) {
          tipo = 'AVULSO';
        } else {
          tipo = 'MENSALISTA';
          if (tipoRow.toLowerCase().includes('seg')) diasMensalista.push('Segunda');
          if (tipoRow.toLowerCase().includes('ter')) diasMensalista.push('Terça');
          if (tipoRow.toLowerCase().includes('qua')) diasMensalista.push('Quarta');
          if (tipoRow.toLowerCase().includes('qui')) diasMensalista.push('Quinta');
          if (tipoRow.toLowerCase().includes('sex')) diasMensalista.push('Sexta');
          if (tipoRow.toLowerCase().includes('sáb') || tipoRow.toLowerCase().includes('sab')) diasMensalista.push('Sábado');
          if (tipoRow.toLowerCase().includes('dom')) diasMensalista.push('Domingo');
        }

        let dataNascimento = row['Data Nascimento'] ? String(row['Data Nascimento']).trim() : '';
        let status = row.Status ? String(row.Status).trim() : 'Ativo';

        const payload = {
          nome,
          celular,
          nivel,
          tipo,
          diasMensalista: tipo === 'MENSALISTA' ? diasMensalista : [],
          dataNascimento,
          status,
        };

        const existingJogador = jogadores.find(j => j.nome.toLowerCase() === nome.toLowerCase());
        
        if (existingJogador) {
          await updateJogador(existingJogador.id, payload, activeGroupId);
          atualizados++;
        } else {
          await addJogador(payload, activeGroupId);
          adicionados++;
        }
      }

      alert(`Importação concluída!\nAdicionados: ${adicionados}\nAtualizados: ${atualizados}`);
    } catch (err) {
      console.error("Erro ao importar planilha: ", err);
      alert("Erro ao importar a planilha. Verifique o console.");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const filtered = jogadores
    .filter(j => {
      const matchAba = abaAtiva === 'TODOS' || j.tipo === abaAtiva;
      const term = search.toLowerCase();
      const matchSearch = j.nome.toLowerCase().includes(term) || (j.celular && j.celular.includes(term));
      return matchAba && matchSearch;
    })
    .sort((a, b) => {
      if (ordemNivel) return (b.nivel || 3) - (a.nivel || 3);
      return a.nome.localeCompare(b.nome);
    });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <Settings className="w-7 h-7 text-cyan-400" />
            <span>Administração de Jogadores</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Cadastre novos atletas, edite níveis técnicos e gerencie ativados/inativos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { resetForm(); setModalNovo(true); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Jogador</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou celular..."
              className="w-full bg-slate-900/80 text-white pl-12 pr-4 py-3 rounded-2xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>Total: <strong className="text-white">{jogadores.length}</strong></span>
            <span>•</span>
            <span>Ativos: <strong className="text-emerald-400">{jogadores.filter(j=>j.status==='Ativo').length}</strong></span>
            <span>•</span>
            <span>Inativos: <strong className="text-rose-400">{jogadores.filter(j=>j.status==='Inativo').length}</strong></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {['TODOS', 'MENSALISTA', 'AVULSO'].map(aba => (
              <button
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  abaAtiva === aba 
                    ? 'bg-purple-600 text-white border border-purple-400 shadow-lg shadow-purple-500/20' 
                    : 'bg-slate-900/40 text-slate-500 border border-slate-800 hover:text-white'
                }`}
              >
                {aba}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOrdemNivel(!ordemNivel)}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
              ordemNivel ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-white'
            }`}
          >
            {ordemNivel ? 'Por Nível ⭐' : 'Ordem A-Z'}
          </button>
        </div>
      </div>

      {/* Players List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((j) => {
          const isAtivo = j.status === 'Ativo';

          return (
            <div
              key={j.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isAtivo
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white">{j.nome}</h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="text-amber-400 font-bold">{j.nivel || 3} ⭐</span>
                    <span>•</span>
                    <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] ${
                      j.tipo === 'MENSALISTA' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {j.tipo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleStatus(j)}
                    title={isAtivo ? 'Desativar Jogador' : 'Ativar Jogador'}
                    className={`p-2 rounded-xl transition-all ${
                      isAtivo ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(j)}
                    title="Editar"
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-cyan-400 transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(j)}
                    title="Excluir"
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {j.tipo === 'MENSALISTA' && j.diasMensalista && j.diasMensalista.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/60">
                  {j.diasMensalista.map(d => (
                    <span key={d} className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Developer Tools Section */}
      <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-base font-black text-white flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Ferramentas de Desenvolvedor & Testes</span>
        </h2>
        <p className="text-xs text-slate-400">
          Utilize as ações abaixo para simular 16 jogadores reais, importar de uma planilha ou limpar o grupo para recomeçar.
        </p>

        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportarPlanilha} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={handleGerarMock}
            disabled={loading}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar 16 Jogadores de Teste PRO</span>
          </button>

          <button
            onClick={handleResetGeral}
            disabled={loading}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Resetar Todos os Dados do Grupo</span>
          </button>
        </div>
      </div>

      {/* Modal Modal Add/Edit */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white">
              {editingJogador ? 'Editar Jogador' : 'Novo Jogador'}
            </h3>

            <form onSubmit={handleSaveJogador} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Hector Neto"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Celular</label>
                  <input
                    type="text"
                    value={formCelular}
                    onChange={(e) => setFormCelular(mascaraTelefone(e.target.value))}
                    placeholder={editingJogador ? '(Oculto) Digite para alterar...' : '(11) 98765-4321'}
                    inputMode="tel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Data de nascimento</label>
                  <input
                    type="text"
                    value={formDataNasc}
                    onChange={(e) => setFormDataNasc(formatarDataNascimentoDigitos(e.target.value))}
                    placeholder={editingJogador ? '(Oculta) Digite para alterar...' : 'DD/MM/AAAA'}
                    maxLength={10}
                    inputMode="numeric"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Tipo de Atleta</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MENSALISTA">Mensalista</option>
                    <option value="AVULSO">Avulso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">
                  Nível Técnico: <strong className="text-amber-400 font-bold">{formNivel} ⭐</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formNivel}
                  onChange={(e) => setFormNivel(e.target.value)}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                  <span>Iniciante (1)</span>
                  <span>Intermediário (3)</span>
                  <span>Avançado (5)</span>
                </div>
              </div>

              {formTipo === 'MENSALISTA' && (
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase block mb-2">Dias Fixos de Treino</label>
                  <div className="flex flex-wrap gap-1.5">
                    {diasDisponiveis.map((dia) => {
                      const sel = formDias.includes(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => toggleDia(dia)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                            sel ? 'bg-cyan-500 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
