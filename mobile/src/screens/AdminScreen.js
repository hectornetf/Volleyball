import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Animated } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, addJogador, updateJogador, gerarDadosDeTestePro, resetDadosGrupo } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/** Formata só com dígitos → AAAA-MM-DD (máx. 10 caracteres). */
function formatarDataNascimentoDigitos(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function dataNascimentoValidaOuVazia(s) {
  const t = (s || '').trim();
  if (!t) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const y = Number(t.slice(0, 4));
  const m = Number(t.slice(5, 7));
  const d = Number(t.slice(8, 10));
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
    dataNascimento: ''
  });

  const [editandoId, setEditandoId] = useState(null);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('TODOS'); 
  const [ordemNivel, setOrdemNivel] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

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

  const handleGerarTeste = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Simulação', 'Gerar elenco completo de teste (18 jogadores, finanças e config)?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Gerar', onPress: async () => {
         try {
           setCarregando(true);
           await gerarDadosDeTestePro(activeGroupId);
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
           Alert.alert('Sucesso', 'Elenco de amostra gerado com sucesso!');
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
    Alert.alert('PERIGO', 'Isso irá apagar TODOS os jogadores e finanças deste grupo. Confirmar?', [
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

  const toggleDia = (dia) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const novosDias = novoJogador.diasMensalista.includes(dia)
      ? novoJogador.diasMensalista.filter(d => d !== dia)
      : [...novoJogador.diasMensalista, dia];
    setNovoJogador({ ...novoJogador, diasMensalista: novosDias });
  };

  const salvarJogador = async () => {
    if (!novoJogador.nome || !novoJogador.celular) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('Erro', 'Nome e Celular são obrigatórios!');
    }

    const dataNasc = (novoJogador.dataNascimento || '').trim();
    if (!dataNascimentoValidaOuVazia(dataNasc)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Erro', 'Data de nascimento inválida. Use AAAA-MM-DD ou deixe em branco.');
    }
    
    try {
      const payload = {
        ...novoJogador,
        dataNascimento: dataNasc,
        groupId: activeGroupId,
        presencaAtual: 'Falta',
        diariaPaga: false,
        historicoPresencas: 0
      };

      if (editandoId) {
        await updateJogador(editandoId, payload, activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await addJogador(payload, activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setNovoJogador({ nome: '', celular: '', nivel: 3, tipo: 'MENSALISTA', diasMensalista: [], dataNascimento: '' });
      setEditandoId(null);
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const prepararEdicao = (j) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNovoJogador({
      nome: j.nome,
      celular: j.celular,
      nivel: j.nivel,
      tipo: j.tipo,
      diasMensalista: j.diasMensalista || [],
      dataNascimento: j.dataNascimento || ''
    });
    setEditandoId(j.id);
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
                onChangeText={t => setNovoJogador({...novoJogador, celular: t})}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#475569"
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
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#475569"
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
                  setNovoJogador({
                    nome: '',
                    celular: '',
                    nivel: 3,
                    tipo: 'MENSALISTA',
                    diasMensalista: [],
                    dataNascimento: ''
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
                  <View className="flex-1 pr-4">
                    <Text className="text-white font-black text-sm">{j.nome}</Text>
                    <Text className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">⭐ Nível {j.nivel || 3} • {j.tipo}</Text>
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
