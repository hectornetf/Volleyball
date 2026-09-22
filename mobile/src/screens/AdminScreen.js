import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { readSheet } from 'read-excel-file/universal';
import { subscribeJogadores, addJogador, updateJogador, gerarDadosDeTestePro, resetDadosGrupo } from '../services/jogadorService';
import { carregarHistoricoTimes } from '../services/teamDrawService';
import { montarPainelEstatisticas, idsJogadoresDoTime, confrontosDoSorteio } from '../utils/estatisticasUtils';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { gerarAvatarAleatorio } from '../utils/avatarUtils';

const formatarData = (iso) => {
  const [a, m, d] = (iso || '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso || '—';
};

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const base64ToArrayBuffer = (base64) => {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/=+$/, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const b0 = CHARS.indexOf(clean[i]);
    const b1 = CHARS.indexOf(clean[i + 1]);
    const b2 = CHARS.indexOf(clean[i + 2] || 'A');
    const b3 = CHARS.indexOf(clean[i + 3] || 'A');
    bytes.push((b0 << 2) | (b1 >> 4));
    if (clean[i + 2]) bytes.push(((b1 & 15) << 4) | (b2 >> 2));
    if (clean[i + 3]) bytes.push(((b2 & 3) << 6) | b3);
  }
  return new Uint8Array(bytes).buffer;
};

/** Formata só com dígitos → DD/MM/AAAA (máx. 10 caracteres). */
function formatarDataNascimentoDigitos(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

const mascaraTelefone = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  let res = digits;
  if (digits.length > 2) {
    res = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length > 7) {
    res = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return res;
};

function dataNascimentoValidaOuVazia(s) {
  const t = (s || '').trim();
  if (!t) return true;
  // Suporta o formato ISO antigo e o novo formato DD/MM/AAAA
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return true;
  
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return false;
  const d = Number(t.slice(0, 2));
  const m = Number(t.slice(3, 5));
  const y = Number(t.slice(6, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId, logout: logoutSession } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [novoJogador, setNovoJogador] = useState({
    nome: '',
    celular: '',
    nivel: 3,
    tipo: 'MENSALISTA',
    diasMensalista: [],
    dataNascimento: '',
    status: 'Ativo'
  });

  const [editandoId, setEditandoId] = useState(null);
  const [editandoOriginal, setEditandoOriginal] = useState({ celular: '', dataNascimento: '' });
  const [filtroBusca, setFiltroBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('TODOS'); 
  const [ordemNivel, setOrdemNivel] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  const [avatarSel, setAvatarSel] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [salvandoAvatar, setSalvandoAvatar] = useState(false);
  const [historicoTimes, setHistoricoTimes] = useState([]);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setJogadores(dados);
      setCarregando(false);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();

    return () => unsub();
  }, [activeGroupId]);

  useEffect(() => {
    if (!activeGroupId || !editandoId) return;
    let ativo = true;
    carregarHistoricoTimes(activeGroupId).then((historico) => {
      if (ativo) setHistoricoTimes(historico);
    });
    return () => { ativo = false; };
  }, [activeGroupId, editandoId]);

  const jogadorPerfil = jogadores.find((j) => j.id === editandoId) || null;

  useEffect(() => {
    if (!editandoId) return;
    if (jogadorPerfil?.avatar) setAvatarSel(jogadorPerfil.avatar);
    else setAvatarSel((prev) => prev || gerarAvatarAleatorio());
  }, [editandoId, jogadores]);

  const painelPerfil =
    montarPainelEstatisticas(jogadores, historicoTimes).find((p) => p.jogador.id === jogadorPerfil?.id) || {
      jogos: 0,
      vitorias: 0,
      aproveitamento: 0,
      presencas: Number(jogadorPerfil?.historicoPresencas) || 0,
      forca: Number(jogadorPerfil?.nivel) || 3,
      historicoSuficiente: false,
      serie: [],
      evolucao: 0,
    };

  const presencasRecentes = Object.entries(jogadorPerfil?.presencas || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8);

  const partidasRecentes = historicoTimes
    .filter((sorteio) => (sorteio.times || []).some((t) => idsJogadoresDoTime(t).includes(jogadorPerfil?.id)))
    .map((sorteio) => {
      const times = sorteio.times || [];
      const idx = times.findIndex((t) => idsJogadoresDoTime(t).includes(jogadorPerfil.id));
      const confrontos = confrontosDoSorteio(sorteio) || [];
      const vitorias = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0);
      const derrotas = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0);
      return { data: sorteio.data, dia: sorteio.dia, time: `Time ${idx + 1}`, vitorias, derrotas };
    })
    .slice(0, 8);

  const tendenciaPerfil = painelPerfil.evolucao;
  const corFlecha = tendenciaPerfil > 0.05 ? '#34d399' : tendenciaPerfil < -0.05 ? '#f87171' : '#94a3b8';

  const salvarAvatar = async (url) => {
    if (!jogadorPerfil) return;
    setSalvandoAvatar(true);
    try {
      await updateJogador(jogadorPerfil.id, { avatar: (url ?? avatarSel).trim() }, activeGroupId);
      if (url !== undefined) setAvatarSel(url);
      setUrlInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Pronto', (url ?? avatarSel).trim() ? 'Avatar salvo com sucesso!' : 'Avatar removido.');
    } catch (e) {
      Alert.alert('Erro ao salvar avatar', e.message);
    } finally {
      setSalvandoAvatar(false);
    }
  };

  const handleGerarTeste = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Simulação', 'Gerar amostra completa do sistema: 16 jogadores (elenco), 12 rodadas concluídas com placar por confronto, 1 rodada aberta, presenças, finanças e configuração?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Gerar', onPress: async () => {
         try {
           setCarregando(true);
           await gerarDadosDeTestePro(activeGroupId);
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
           Alert.alert('Sucesso', 'Amostra completa de teste gerada com sucesso!');
         } catch (e) {
           Alert.alert('Erro', e.message);
         } finally {
           setCarregando(false);
         }
      }}
    ]);
  };

  const handleReset = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('PERIGO', 'Isso irá apagar TODOS os dados deste grupo: jogadores, rodadas, finanças e configurações. Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'APAGAR TUDO', style: 'destructive', onPress: async () => {
        try {
          setCarregando(true);
          await resetDadosGrupo(activeGroupId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Sucesso', 'Dados do grupo resetados.');
        } catch (e) {
          Alert.alert('Erro', e.message);
        } finally {
          setCarregando(false);
        }
      }}
    ]);
  };

  const handleImportarPlanilha = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      setCarregando(true);
      const fileUri = result.assets[0].uri;
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      const buffer = base64ToArrayBuffer(fileBase64);
      const rows = await readSheet(buffer);
      const [headers, ...body] = rows;

      const json = body.map((row) => {
        const obj = {};
        headers.forEach((header, i) => { obj[header] = row[i]; });
        return obj;
      });

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
          groupId: activeGroupId,
          presencas: {},
          presencaAtual: 'Falta',
          diariaPaga: false,
          historicoPresencas: 0
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
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', `Importação concluída!\nAdicionados: ${adicionados}\nAtualizados: ${atualizados}`);

    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível importar a planilha.');
    } finally {
      setCarregando(false);
    }
  };

  const toggleDia = (dia) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const novosDias = novoJogador.diasMensalista.includes(dia)
      ? novoJogador.diasMensalista.filter(d => d !== dia)
      : [...novoJogador.diasMensalista, dia];
    setNovoJogador({ ...novoJogador, diasMensalista: novosDias });
  };

  const salvarJogador = async () => {
    // Se não estiver editando, celular é obrigatório. Se estiver editando, só é obrigatório se o original também não existir (o que é impossível pela regra)
    if (!novoJogador.nome || (!novoJogador.celular && !editandoId)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('Erro', 'Nome e Celular são obrigatórios!');
    }

    let dataNascFinal = (novoJogador.dataNascimento || '').trim();
    if (editandoId && !dataNascFinal) {
      dataNascFinal = editandoOriginal.dataNascimento || '';
    } else if (dataNascFinal && !dataNascimentoValidaOuVazia(dataNascFinal)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Erro', 'Data de nascimento inválida. Use DD/MM/AAAA ou deixe em branco.');
    }

    let celularFinal = (novoJogador.celular || '').trim();
    if (editandoId && !celularFinal) {
      celularFinal = editandoOriginal.celular;
    }
    
    try {
      const payload = {
        ...novoJogador,
        celular: celularFinal,
        dataNascimento: dataNascFinal,
        avatar: (urlInput.trim() || avatarSel || '').trim(),
        groupId: activeGroupId,
        presencas: {},
        presencaAtual: 'Falta', // Mantido por compatibilidade
        diariaPaga: false,
        historicoPresencas: 0,
        status: novoJogador.status || 'Ativo'
      };

      if (editandoId) {
        await updateJogador(editandoId, payload, activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await addJogador(payload, activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setNovoJogador({ nome: '', celular: '', nivel: 3, tipo: 'MENSALISTA', diasMensalista: [], dataNascimento: '', status: 'Ativo' });
      setEditandoId(null);
      setEditandoOriginal({ celular: '', dataNascimento: '' });
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const prepararEdicao = (j) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNovoJogador({
      nome: j.nome,
      celular: '', // Deixa em branco para não expor
      nivel: j.nivel,
      tipo: j.tipo,
      diasMensalista: j.diasMensalista || [],
      dataNascimento: '', // Deixa em branco para não expor
      status: j.status || 'Ativo'
    });
    setEditandoOriginal({ celular: j.celular, dataNascimento: j.dataNascimento || '' });
    setEditandoId(j.id);
    setUrlInput('');
    setAvatarSel('');
  };

  return (
    <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {/* Cadastro Card */}
        <View 
          style={{ marginTop: Math.max(insets.top, 20) }}
          className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 mb-6 shadow-2xl relative"
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className={`bg-${editandoId ? 'amber-500' : 'purple-600'}/20 p-3 rounded-2xl`}>
                <FontAwesome5 name={editandoId ? "user-edit" : "user-plus"} size={18} color={editandoId ? "#fbbf24" : "#a855f7"} />
              </View>
              <Text className="text-xl font-black text-white ml-4">{editandoId ? 'Editar' : 'Novo Jogador'}</Text>
            </View>

            <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Sair', 'Deseja realmente sair deste grupo?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair agora', style: 'destructive', onPress: () => logoutSession() }
                  ]);
                }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl active:scale-95"
            >
                <FontAwesome5 name="power-off" size={14} color="#f87171" />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Nome Completo</Text>
              <TextInput 
                value={novoJogador.nome}
                onChangeText={t => setNovoJogador({...novoJogador, nome: t})}
                placeholder="Ex: Hector Silva"
                placeholderTextColor="#475569"
                autoCapitalize="words"
                returnKeyType="next"
                className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-white font-bold"
              />
            </View>

            <View>
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">WhatsApp</Text>
              <TextInput 
                value={novoJogador.celular}
                onChangeText={t => setNovoJogador({...novoJogador, celular: mascaraTelefone(t)})}
                placeholder={editandoId ? "(Oculto) Digite para alterar..." : "(11) 99999-9999"}
                placeholderTextColor={editandoId ? "#fbbf24" : "#475569"}
                keyboardType="phone-pad"
                returnKeyType="done"
                className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-white font-bold"
              />
            </View>

            <View>
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Data de nascimento (opcional)</Text>
              <TextInput
                value={novoJogador.dataNascimento}
                onChangeText={(t) =>
                  setNovoJogador({ ...novoJogador, dataNascimento: formatarDataNascimentoDigitos(t) })
                }
                placeholder={editandoId && editandoOriginal.dataNascimento ? "(Oculta) Digite para alterar..." : "DD/MM/AAAA"}
                placeholderTextColor={editandoId && editandoOriginal.dataNascimento ? "#fbbf24" : "#475569"}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                returnKeyType="next"
                className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-white font-bold"
              />
            </View>

            <View className="flex-row space-x-3">
               <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Nível</Text>
                  <View className="bg-slate-900/60 border border-white/5 rounded-2xl p-1.5 flex-row justify-around">
                    {[1,2,3,4,5].map(n => (
                      <TouchableOpacity 
                        key={n} 
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNovoJogador({...novoJogador, nivel: n}); }} 
                        className={`flex-1 h-11 mx-0.5 rounded-xl items-center justify-center ${novoJogador.nivel === n ? 'bg-purple-600 shadow-lg shadow-purple-500/40' : 'bg-slate-800/40'}`}
                      >
                          <Text className={`text-[10px] font-black ${novoJogador.nivel === n ? 'text-white' : 'text-slate-500'}`}>{n}</Text>
                       </TouchableOpacity>
                     ))}
                  </View>
               </View>
               <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Categoria</Text>
                  <View className="bg-slate-900/60 border border-white/5 rounded-2xl p-1.5 flex-row">
                    <TouchableOpacity 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNovoJogador({...novoJogador, tipo: 'MENSALISTA'}); }}
                      className={`flex-1 h-11 rounded-xl items-center justify-center ${novoJogador.tipo === 'MENSALISTA' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40' : 'bg-transparent'}`}
                    >
                      <Text className={`text-[9.5px] font-black ${novoJogador.tipo === 'MENSALISTA' ? 'text-white' : 'text-slate-500'}`}>MENSAL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNovoJogador({...novoJogador, tipo: 'AVULSO'}); }}
                      className={`flex-1 h-11 rounded-xl items-center justify-center ${novoJogador.tipo === 'AVULSO' ? 'bg-amber-600 shadow-lg shadow-amber-500/40' : 'bg-transparent'}`}
                    >
                      <Text className={`text-[9.5px] font-black ${novoJogador.tipo === 'AVULSO' ? 'text-white' : 'text-slate-500'}`}>AVULSO</Text>
                    </TouchableOpacity>
                  </View>
               </View>
            </View>

            {novoJogador.tipo === 'MENSALISTA' && (
              <View>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Dias de Treino</Text>
                <View className="flex-row flex-wrap">
                  {diasDaSemana.map(dia => (
                    <TouchableOpacity 
                      key={dia} 
                      onPress={() => toggleDia(dia)}
                      className={`mr-2 mb-2 px-4 py-2.5 rounded-xl border ${novoJogador.diasMensalista.includes(dia) ? 'bg-purple-600 border-white/20' : 'bg-slate-900/60 border-white/5'}`}
                    >
                      <Text className={`text-[9px] font-bold ${novoJogador.diasMensalista.includes(dia) ? 'text-white' : 'text-slate-500'}`}>{dia.substring(0,3)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {editandoId && (
              <View>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Status do Jogador</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNovoJogador({ ...novoJogador, status: novoJogador.status === 'Ativo' ? 'Inativo' : 'Ativo' });
                  }}
                  className={`w-full py-4 rounded-2xl border flex-row items-center justify-between px-4 ${novoJogador.status === 'Ativo' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                >
                  <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-xl items-center justify-center ${novoJogador.status === 'Ativo' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <FontAwesome5 name={novoJogador.status === 'Ativo' ? "user-check" : "user-slash"} size={12} color={novoJogador.status === 'Ativo' ? "#10b981" : "#ef4444"} />
                    </View>
                    <Text className={`font-black text-xs ml-3 ${novoJogador.status === 'Ativo' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {novoJogador.status === 'Ativo' ? 'ATIVO NO GRUPO' : 'INATIVO / AFASTADO'}
                    </Text>
                  </View>
                  <View className={`w-10 h-5 rounded-full px-1 justify-center ${novoJogador.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <View className={`w-3 h-3 rounded-full bg-white ${novoJogador.status === 'Ativo' ? 'self-end' : 'self-start'}`} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {editandoId && jogadorPerfil && (
              <View className="border-t border-white/5 pt-5 space-y-4">
                <View className="flex-row items-center gap-4">
                  <Avatar jogador={{ ...jogadorPerfil, avatar: avatarSel }} size={72} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <FontAwesome5 name="user-circle" size={13} color="#22d3ee" />
                      <Text className="text-cyan-400 font-bold text-[10px] uppercase tracking-widest">Perfil & Avatar</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setAvatarSel(gerarAvatarAleatorio())}
                      className="self-start flex-row items-center gap-2 bg-violet-600 px-4 py-2 rounded-xl"
                    >
                      <FontAwesome5 name="random" size={12} color="#fff" />
                      <Text className="text-white font-extrabold text-[10px] uppercase tracking-wider">Gerar aleatório</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-2 ml-1 flex-row items-center">
                    <FontAwesome5 name="link" size={11} color="#22d3ee" />  Usar uma foto por link
                  </Text>
                  <TextInput
                    value={urlInput}
                    onChangeText={setUrlInput}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    className="bg-slate-900/60 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm mb-2"
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => urlInput.trim() && salvarAvatar(urlInput.trim())}
                      disabled={!urlInput.trim() || salvandoAvatar}
                      className={`flex-1 rounded-2xl py-3 items-center ${urlInput.trim() && !salvandoAvatar ? 'bg-cyan-600' : 'bg-slate-700/60'}`}
                    >
                      <Text className="text-white font-extrabold text-[10px] uppercase tracking-wider">
                        {salvandoAvatar ? 'Salvando...' : 'Usar esta foto'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => salvarAvatar()}
                      disabled={salvandoAvatar}
                      className="flex-1 rounded-2xl py-3 items-center bg-emerald-500"
                    >
                      <Text className="text-white font-extrabold text-[10px] uppercase tracking-wider">
                        {salvandoAvatar ? 'Salvando...' : 'Salvar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => salvarAvatar('')}
                      disabled={salvandoAvatar}
                      className="flex-1 rounded-2xl py-3 items-center bg-slate-800/60 border border-white/10"
                    >
                      <Text className="text-rose-400 font-extrabold text-[10px] uppercase tracking-wider">Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Análise do jogador */}
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center gap-2">
                      <FontAwesome5 name="chart-bar" size={13} color="#22d3ee" />
                      <Text className="text-white font-bold text-xs">Análise do jogador</Text>
                    </View>
                    {!painelPerfil.historicoSuficiente && (
                      <Text className="text-[7px] font-extrabold uppercase text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        insuficiente
                      </Text>
                    )}
                  </View>
                  <Text className="text-slate-500 text-[9px] mb-3">
                    {painelPerfil.historicoSuficiente
                      ? 'Baseada nas partidas concluídas, presença e força estimada.'
                      : 'Continue jogando para estimar sua força com confiança a partir de 8 partidas.'}
                  </Text>
                  <View className="flex-row flex-wrap justify-between mb-2">
                    <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3 border border-white/5 mb-2">
                      <Text className="text-[8px] uppercase font-extrabold text-slate-500">Partidas</Text>
                      <Text className="text-base font-black text-white">{painelPerfil.jogos || '—'}</Text>
                      <Text className="text-[8px] font-bold text-slate-400">{painelPerfil.vitorias} vitória(s)</Text>
                    </View>
                    <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3 border border-white/5 mb-2">
                      <Text className="text-[8px] uppercase font-extrabold text-slate-500">Aproveitamento</Text>
                      <Text className={`text-base font-black ${painelPerfil.aproveitamento >= 60 ? 'text-emerald-400' : painelPerfil.aproveitamento >= 40 ? 'text-cyan-300' : 'text-white'}`}>
                        {painelPerfil.jogos ? `${painelPerfil.aproveitamento}%` : '—'}
                      </Text>
                      <Text className="text-[8px] font-bold text-slate-400">de vitórias</Text>
                    </View>
                    <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3 border border-white/5">
                      <Text className="text-[8px] uppercase font-extrabold text-slate-500">Presença</Text>
                      <Text className="text-base font-black text-white">{painelPerfil.presencas}</Text>
                      <Text className="text-[8px] font-bold text-slate-400">{painelPerfil.presencas === 1 ? 'presença' : 'presenças'}</Text>
                    </View>
                    <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3 border border-white/5">
                      <Text className="text-[8px] uppercase font-extrabold text-slate-500">Força estimada</Text>
                      <Text className={`text-base font-black ${painelPerfil.historicoSuficiente ? 'text-cyan-300' : 'text-slate-600'}`}>
                        {painelPerfil.historicoSuficiente ? `⭐ ${painelPerfil.forca.toFixed(1)}` : '—'}
                      </Text>
                      <Text className="text-[8px] font-bold text-slate-400">{painelPerfil.jogos ? `${painelPerfil.jogos} de 8 partidas` : 'na criação → 3.0'}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 bg-slate-900/40 rounded-2xl px-3 py-2.5 border border-white/5">
                    <FontAwesome5 name="chart-line" size={12} color="#22d3ee" />
                    <Text className="text-slate-300 font-bold text-[11px]">Evolução:</Text>
                    {painelPerfil.serie.length ? (
                      <>
                        <FontAwesome5 name={tendenciaPerfil > 0.05 ? 'arrow-up' : tendenciaPerfil < -0.05 ? 'arrow-down' : 'minus'} size={9} color={corFlecha} />
                        <Text className={`text-[10px] font-black ${tendenciaPerfil > 0.05 ? 'text-emerald-400' : tendenciaPerfil < -0.05 ? 'text-rose-400' : 'text-slate-500'}`}>
                          {tendenciaPerfil === 0 ? '0.0' : `${tendenciaPerfil > 0 ? '+' : '−'}${Math.abs(tendenciaPerfil).toFixed(1)} pts`}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-slate-600 text-[10px] font-bold">sem partidas suficientes ainda</Text>
                    )}
                  </View>
                </View>

                {/* Histórico do jogador */}
                <View>
                  <View className="flex-row items-center gap-2 mb-3">
                    <FontAwesome5 name="history" size={13} color="#34d399" />
                    <Text className="text-white font-bold text-xs">Histórico do jogador</Text>
                  </View>

                  <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1.5">Presenças recentes</Text>
                  {presencasRecentes.length === 0 ? (
                    <Text className="text-slate-500 text-[10px] italic mb-3">Sem presenças registradas ainda.</Text>
                  ) : (
                    <View className="mb-3">
                      {presencasRecentes.map(([data, status]) => (
                        <View key={data} className="flex-row items-center justify-between py-1.5 border-b border-slate-800/60">
                          <Text className="text-slate-300 font-bold text-[11px]">{formatarData(data)}</Text>
                          <Text className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            status === 'Confirmado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            {status || '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text className="text-[9px] uppercase font-extrabold text-slate-500 mb-1.5">Partidas recentes</Text>
                  {partidasRecentes.length === 0 ? (
                    <Text className="text-slate-500 text-[10px] italic">Ainda não participou de partidas concluídas.</Text>
                  ) : (
                    <View>
                      {partidasRecentes.map((partida, i) => (
                        <View key={`${partida.data}-${i}`} className="flex-row items-center justify-between py-1.5 border-b border-slate-800/60">
                          <View className="flex-1 mr-2" style={{ minWidth: 0 }}>
                            <Text className="text-slate-300 font-bold text-[11px]">{formatarData(partida.data)}</Text>
                            <Text className="text-[8px] text-slate-500 font-bold">{partida.dia || ''} · {partida.time}</Text>
                          </View>
                          <Text className={`text-[9px] font-black ${
                            partida.vitorias === partida.derrotas ? 'text-slate-400' : partida.vitorias > partida.derrotas ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {partida.vitorias}V · {partida.derrotas}D
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity onPress={salvarJogador} className={`w-full py-4.5 rounded-2xl items-center shadow-lg active:scale-[0.98] ${editandoId ? 'bg-amber-500' : 'bg-purple-600'}`}>
              <Text className={`font-black text-sm uppercase tracking-widest ${editandoId ? 'text-slate-900' : 'text-white'}`}>
                {editandoId ? 'Atualizar Jogador' : 'Salvar no Elenco'}
              </Text>
            </TouchableOpacity>
            
            {editandoId && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditandoId(null);
                  setEditandoOriginal({ celular: '', dataNascimento: '' });
                  setAvatarSel('');
                  setUrlInput('');
                  setNovoJogador({
                    nome: '',
                    celular: '',
                    nivel: 3,
                    tipo: 'MENSALISTA',
                    diasMensalista: [],
                    dataNascimento: '',
                    status: 'Ativo'
                  });
                }}
                className="w-full py-2 items-center"
              >
                <Text className="text-slate-600 font-bold text-xs uppercase">Cancelar Edição</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Listagem */}
        <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 shadow-xl mb-6">
          <View className="mb-6">
             <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-black text-sm uppercase tracking-widest">Elenco</Text>
                <TouchableOpacity 
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOrdemNivel(!ordemNivel); }}
                  className={`px-4 py-2 rounded-2xl border ${ordemNivel ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-slate-900/60 border-white/5'}`}
                >
                   <Text className={`text-[9px] font-black uppercase ${ordemNivel ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {ordemNivel ? 'Por Nível ⭐' : 'Ordem A-Z'}
                   </Text>
                </TouchableOpacity>
             </View>

             <View className="flex-row items-center bg-slate-900/60 rounded-2xl border border-white/5 px-4 mb-5">
                <FontAwesome5 name="search" size={14} color="#475569" />
                <TextInput 
                  placeholder="Buscar por nome ou celular..."
                  placeholderTextColor="#475569"
                  value={filtroBusca}
                  onChangeText={setFiltroBusca}
                  className="flex-1 p-4 text-white font-bold text-xs"
                />
             </View>

             <View className="flex-row space-x-2">
                {['TODOS', 'MENSALISTA', 'AVULSO'].map(aba => (
                  <TouchableOpacity 
                    key={aba}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAbaAtiva(aba); }}
                    className={`flex-1 py-3 rounded-2xl items-center border ${abaAtiva === aba ? 'bg-purple-600 border-purple-400 shadow-lg' : 'bg-slate-900/40 border-white/5'}`}
                  >
                    <Text className={`text-[9px] font-black uppercase ${abaAtiva === aba ? 'text-white' : 'text-slate-500'}`}>{aba}</Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>

          {carregando ? <ActivityIndicator color="#a855f7" /> : (
            <View className="space-y-4">
              {jogadores
                .filter(j => {
                  const busca = filtroBusca.toLowerCase();
                  const matchNome = j.nome.toLowerCase().includes(busca);
                  const matchCel = j.celular.includes(busca);
                  const matchAba = abaAtiva === 'TODOS' || j.tipo === abaAtiva;
                  return (matchNome || matchCel) && matchAba;
                })
                .sort((a, b) => {
                  if (ordemNivel) return (b.nivel || 3) - (a.nivel || 3);
                  return a.nome.localeCompare(b.nome);
                })
                .map(j => (
                <View key={j.id} className="bg-slate-900/60 p-5 rounded-3xl border border-white/5 flex-row justify-between items-center mb-3">
                  <View className="flex-1 flex-row items-center">
                    <Avatar jogador={j} size={40} />
                    <View className="flex-1 pl-3 pr-2">
                      <Text className="text-white font-black text-sm" numberOfLines={1}>{j.nome}</Text>
                      <View className="flex-row items-center mt-1">
                        {j.status === 'Inativo' && (
                          <View className="bg-red-500/20 px-1.5 py-0.5 rounded mr-2 border border-red-500/30">
                            <Text className="text-red-400 font-black text-[7px] uppercase tracking-tighter">Inativo</Text>
                          </View>
                        )}
                        <Text className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">⭐ Nível {j.nivel || 3} • {j.tipo}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => prepararEdicao(j)} className="bg-slate-800/80 w-11 h-11 rounded-2xl items-center justify-center border border-white/5">
                    <FontAwesome5 name="pen" size={14} color="#22d3ee" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {jogadores.length > 0 && jogadores.filter(j => {
                  const busca = filtroBusca.toLowerCase();
                  const matchNome = j.nome.toLowerCase().includes(busca);
                  const matchAba = abaAtiva === 'TODOS' || j.tipo === abaAtiva;
                  return matchNome && matchAba;
                }).length === 0 && (
                  <View className="py-20 items-center">
                    <FontAwesome5 name="search-minus" size={40} color="#1e293b" />
                    <Text className="text-slate-600 font-bold text-xs mt-4 uppercase tracking-widest">Nenhum resultado</Text>
                  </View>
              )}
            </View>
          )}
        </View>

        {/* Footer Tools */}
        <View className="mt-6 mb-24 border-t border-white/5 pt-10 px-2 opacity-60">
          <Text className="text-[10px] text-slate-600 font-bold uppercase tracking-[4px] mb-8 text-center">Gestão Avançada</Text>
          
          <View className="flex-row justify-between mb-3">
             <TouchableOpacity 
              onPress={handleImportarPlanilha}
              className="flex-1 bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-[32px] items-center"
            >
              <FontAwesome5 name="file-excel" size={16} color="#6366f1" />
              <Text className="text-indigo-400 font-black text-[9px] uppercase mt-3">Importar</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between">
            <TouchableOpacity 
              onPress={handleGerarTeste}
              className="flex-1 bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-[32px] items-center mr-3"
            >
              <FontAwesome5 name="vial" size={16} color="#10b981" />
              <Text className="text-emerald-500 font-black text-[9px] uppercase mt-3">Mock Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleReset}
              className="flex-1 bg-red-500/5 border border-red-500/10 p-5 rounded-[32px] items-center"
            >
              <FontAwesome5 name="trash-alt" size={16} color="#ef4444" />
              <Text className="text-red-500 font-black text-[9px] uppercase mt-3">Zerar Grupo</Text>
            </TouchableOpacity>
          </View>
        </View>

      </Animated.View>
    </ScrollView>
  );
}
