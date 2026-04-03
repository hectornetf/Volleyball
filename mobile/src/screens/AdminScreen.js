import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { addJogador, subscribeJogadores, resetDadosGrupo } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';
import AuthWrapper from '../components/AuthWrapper';

export default function AdminScreen() {
  const { activeGroupId, logout } = useSession();
  
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [nivel, setNivel] = useState(3);
  const [isAvulso, setIsAvulso] = useState(false);
  const [nascimento, setNascimento] = useState(''); // Formato DD/MM
  const [historicoManual, setHistoricoManual] = useState('0'); // Para migrar dados GS
  
  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [diasSelecionados, setDiasSelecionados] = useState(['Seg']);
  
  const [elenco, setElenco] = useState([]);
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // subscribeJogadores já é real-time, o refresh apenas dá feedback visual
    // e garante que o componente está "vivo".
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const unsubscribe = subscribeJogadores(activeGroupId, (dados) => {
      setElenco(dados);
      setCarregandoBanco(false);
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  const toggleDia = (dia) => {
    setDiasSelecionados(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleSalvar = async () => {
    if (!nome.trim()) return Alert.alert('Erro', 'O nome do jogador é obrigatório.');
    if (!activeGroupId) return;
    setSalvando(true);
    try {
      await addJogador({
        nome, 
        celular, 
        nivel, 
        tipo: isAvulso ? 'AVULSO' : 'MENSALISTA',
        diasPermitidos: isAvulso ? [] : diasSelecionados, 
        dataNascimento: nascimento,
        historicoPresencas: parseInt(historicoManual) || 0,
        statusAtivo: true, 
        dataCadastro: new Date().toISOString()
      }, activeGroupId);
      setNome(''); setCelular(''); setNascimento(''); setHistoricoManual('0');
      Alert.alert('Sucesso!', 'Jogador salvo no seu grupo!');
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSalvando(false);
    }
  };

  const seedFakeData = async () => {
    if (!activeGroupId) return;
    
    Alert.alert(
      "Atenção!", 
      "Isso vai APAGAR todos os jogadores atuais e gerar dados de teste. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Zerar e Gerar", style: "destructive", onPress: async () => {
             setCarregandoBanco(true);
             try {
               await resetDadosGrupo(activeGroupId);
               
               const fakes = [
                 { nome: "Lucas (Elite)", celular: "(11) 99999-0001", nivel: 5, tipo: "MENSALISTA", dataNascimento: '15/03', historicoPresencas: 45 },
                 { nome: "Marcelo (Elite)", celular: "(11) 99999-0002", nivel: 4, tipo: "MENSALISTA", dataNascimento: '22/07', historicoPresencas: 38 },
                 { nome: "Julia (Elite)", celular: "(11) 99999-0003", nivel: 4, tipo: "MENSALISTA", dataNascimento: '10/11', historicoPresencas: 42 },
                 { nome: "Gustavo (Inic)", celular: "(11) 99999-0004", nivel: 2, tipo: "MENSALISTA", dataNascimento: '05/02', historicoPresencas: 10 },
                 { nome: "Rodrigo (Inic)", celular: "(11) 99999-0005", nivel: 1, tipo: "AVULSO", dataNascimento: '18/04', historicoPresencas: 5 },
                 { nome: "Tiago Silva (Elite)", celular: "(11) 99999-0006", nivel: 4, tipo: "AVULSO", dataNascimento: '12/01', historicoPresencas: 33 }
               ];

               for(let j of fakes) {
                 await addJogador({ 
                   ...j, 
                   statusAtivo: true, 
                   presencaAtual: "Confirmado",
                   dataCadastro: new Date().toISOString(),
                   diasPermitidos: j.tipo === 'MENSALISTA' ? ['Seg'] : []
                 }, activeGroupId);
               }
               Alert.alert("Sucesso", "Dados de teste gerados!");
             } catch (err) {
               console.error(err);
               Alert.alert("Erro", "Falha ao gerar dados: " + err.message);
             } finally {
               setCarregandoBanco(false);
             }
        }}
      ]
    );
  };

  return (
    <ScrollView 
      className="flex-1 bg-[#0b0f1a]" 
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }} 
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c084fc" />}
    >
      
      {/* Botão de Sair do Grupo (Voltar para Welcome) */}
      <View className="flex-row justify-end mb-2">
         <TouchableOpacity onPress={logout} className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 flex-row items-center">
            <FontAwesome5 name="door-open" size={10} color="#ef4444" />
            <Text className="text-red-400 text-[10px] font-bold ml-1.5 uppercase">Sair do Grupo</Text>
         </TouchableOpacity>
      </View>

      {/* Card do Código de Grupo */}
      <View className="bg-slate-800 p-5 rounded-2xl border-t-4 border-cyan-400 shadow-md mb-6">
         <Text className="text-[10px] text-slate-400 font-bold uppercase mb-1">Código de Acesso do seu Vôlei</Text>
         <View className="flex-row justify-between items-center bg-[#0b0f1a] p-3 rounded-xl border border-slate-700">
           <Text className="text-2xl font-black text-cyan-400 tracking-widest">{activeGroupId}</Text>
           <TouchableOpacity 
             className="bg-cyan-500/20 px-3 py-1 rounded" 
             onPress={async () => {
               await Clipboard.setStringAsync(activeGroupId);
               Alert.alert("Copiado!", "Código copiado!");
             }}
           >
              <Text className="text-cyan-400 text-[10px] font-bold uppercase">Copiar</Text>
           </TouchableOpacity>
         </View>
         <Text className="text-[10px] text-slate-500 italic mt-2">Qualquer um com esse código pode editar este elenco.</Text>
      </View>

        {/* Botão de Reset Temporário */}
        <TouchableOpacity onPress={seedFakeData} className="w-full bg-slate-900/50 py-3 rounded-xl border border-dashed border-slate-700 mb-6 items-center">
            <Text className="text-slate-400 font-bold text-xs uppercase">Zerar e Gerar Dados Amostra (MODO TESTE)</Text>
        </TouchableOpacity>

        {/* Box de Criação / Cadastro */}
        <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-6">
          <View className="flex-row items-center mb-5">
            <FontAwesome5 name="user-plus" size={18} color="#c084fc" />
            <Text className="text-xl font-bold text-white ml-2">Cadastrar Jogador</Text>
          </View>

          {/* Formulário */}
          <View className="space-y-4 mb-5">
            <TextInput 
              value={nome}
              onChangeText={setNome}
              placeholder="Nome Completo" 
              placeholderTextColor="#64748b"
              style={{ color: 'white' }}
              className="w-full bg-[#0b0f1a] rounded-xl p-4 font-semibold border border-slate-700/50 mb-3 focus:border-purple-500"
            />
            
            <View className="flex-row justify-between w-full mb-3">
               <View className="flex-[2] mr-2 relative justify-center">
                 <FontAwesome5 name="whatsapp" size={12} color="#64748b" style={{ position: 'absolute', left: 16, zIndex: 1 }} />
                 <TextInput 
                   value={celular}
                   onChangeText={setCelular}
                   placeholder="(11) 99999-9999" 
                   placeholderTextColor="#64748b"
                   keyboardType="phone-pad"
                   style={{ color: 'white' }}
                   className="w-full bg-[#0b0f1a] rounded-xl p-4 pl-10 font-semibold border border-slate-700/50 focus:border-purple-500"
                 />
               </View>
               <View className="flex-1 ml-2 relative justify-center">
                 <FontAwesome5 name="birthday-cake" size={12} color="#64748b" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                 <TextInput 
                   value={nascimento}
                   onChangeText={setNascimento}
                   placeholder="15/03" 
                   placeholderTextColor="#64748b"
                   maxLength={5}
                   style={{ color: 'white' }}
                   className="w-full bg-[#0b0f1a] rounded-xl p-4 pl-10 font-semibold border border-slate-700/50 focus:border-purple-500"
                 />
               </View>
            </View>

            <View className="bg-[#0b0f1a] p-3 rounded-xl border border-slate-700/50 mb-3">
               <Text className="text-[9px] text-slate-400 font-bold uppercase mb-2">Migração Legada (GS):</Text>
               <View className="flex-row items-center justify-between">
                 <Text className="text-xs text-slate-300">Presenças Acumuladas no Passado:</Text>
                 <TextInput 
                    value={historicoManual}
                    onChangeText={setHistoricoManual}
                    keyboardType="numeric"
                    style={{ color: '#c084fc', width: 60, textAlign: 'center', fontWeight: 'bold' }}
                    className="bg-slate-800 rounded-lg p-2 border border-slate-700"
                 />
               </View>
            </View>

            <View className="flex-row justify-between w-full mb-4">
               <View className="flex-1 mr-2">
                 <Text className="text-[10px] text-slate-500 uppercase font-black ml-1 mb-1.5 opacity-70">Nível</Text>
                 <View className="bg-[#0b0f1a] rounded-2xl border border-slate-700/50 flex-row justify-between items-center px-1 h-14">
                   <TouchableOpacity onPress={() => setNivel(Math.max(1, nivel-1))} className="w-10 h-10 items-center justify-center bg-slate-800 rounded-xl">
                     <Text className="text-white font-bold">-</Text>
                   </TouchableOpacity>
                   <Text className="text-white font-black">⭐ {nivel}</Text>
                   <TouchableOpacity onPress={() => setNivel(Math.min(5, nivel+1))} className="w-10 h-10 items-center justify-center bg-slate-800 rounded-xl">
                     <Text className="text-white font-bold">+</Text>
                   </TouchableOpacity>
                 </View>
               </View>

               <View className="flex-1 ml-2">
                 <Text className="text-[10px] text-slate-500 uppercase font-black ml-1 mb-1.5 opacity-70">Categoria</Text>
                 <TouchableOpacity 
                   onPress={() => setIsAvulso(!isAvulso)}
                   className={`border flex-row items-center justify-center h-14 rounded-2xl ${isAvulso ? 'bg-amber-500/10 border-amber-500/50 shadow-md' : 'bg-[#0b0f1a] border-slate-700/50'}`}
                 >
                   <FontAwesome5 name={isAvulso ? "check-square" : "square"} solid size={14} color={isAvulso ? "#fbbf24" : "#64748b"} />
                   <Text numberOfLines={1} className={`font-black ml-2 text-[11px] ${isAvulso ? 'text-amber-400' : 'text-slate-500'}`}>
                     {isAvulso ? 'AVULSO' : 'MENSALISTA'}
                   </Text>
                 </TouchableOpacity>
               </View>
            </View>

            {/* Dias Disponíveis caso seja Mensalista */}
            {!isAvulso && (
              <View className="bg-[#0b0f1a] p-4 rounded-2xl border border-slate-700/50 mb-5">
                 <Text className="text-[9px] text-slate-500 font-black uppercase mb-3 opacity-70">Frenquência Semanal:</Text>
                 <View className="flex-row flex-wrap justify-between">
                   {diasDaSemana.map(dia => {
                     const sel = diasSelecionados.includes(dia);
                     return (
                       <TouchableOpacity 
                         key={dia} 
                         onPress={() => toggleDia(dia)}
                         className={`p-2 rounded-xl mb-2 w-[31%] items-center border ${sel ? 'bg-purple-500/20 border-purple-500 shadow-sm' : 'bg-slate-800/40 border-slate-700/50'}`}
                       >
                          <Text className={`text-[10px] font-black uppercase ${sel ? 'text-purple-300' : 'text-slate-500'}`}>{dia}</Text>
                       </TouchableOpacity>
                     );
                   })}
                 </View>
              </View>
            )}

          </View>

          {/* Botão de Salvar via Firebase */}
          <TouchableOpacity 
             onPress={handleSalvar}
             disabled={salvando}
             className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${salvando ? 'bg-purple-900 border border-purple-700' : 'bg-purple-500 shadow-purple-500/30'}`}
          >
             {salvando ? (
                <ActivityIndicator color="white" />
             ) : (
               <>
                 <FontAwesome5 name="cloud-upload-alt" size={16} color="white" />
                 <Text className="text-white font-black ml-2 text-base uppercase">Salvar no Elenco</Text>
               </>
             )}
          </TouchableOpacity>
        </View>

        {/* Lista Real do Elenco (Firestore) */}
        <View className="bg-slate-800 p-5 rounded-3xl shadow-md">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="font-black text-white text-base">Elenco Gravado</Text>
             <View className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
               <Text className="text-[10px] text-indigo-400 font-black capitalize">{elenco.length} Inscritos</Text>
             </View>
          </View>

          {carregandoBanco ? (
             <ActivityIndicator color="#c084fc" style={{ marginVertical: 20 }} />
          ) : elenco.length === 0 ? (
             <Text className="text-slate-500 italic text-center py-5">Nenhum jogador cadastrado ainda.</Text>
          ) : (
            <View className="space-y-3">
              {elenco.map(j => (
                <View key={j.id} className="bg-[#0b0f1a] p-3.5 rounded-2xl border border-slate-700/50 flex-row justify-between items-center mb-2">
                    <View className="flex-1 pr-3">
                      <Text numberOfLines={1} className="font-bold text-slate-100">{j.nome}</Text>
                      <View className="flex-row items-center mt-0.5 opacity-60">
                        <FontAwesome5 name="phone" size={8} color="#94a3b8" />
                        <Text className="text-[9px] text-slate-400 ml-1.5">{j.celular || 'Sem celular'}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className="items-end mr-3">
                        <View className="flex-row mb-1">
                          {[...Array(j.nivel)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={8} color="#fbbf24" style={{marginLeft: 1}}/>)}
                        </View>
                        <View className={`${j.tipo === 'AVULSO' ? 'bg-amber-500/20' : 'bg-slate-700/50'} px-2 py-0.5 rounded-md`}>
                          <Text className={`text-[8px] font-black uppercase ${j.tipo === 'AVULSO' ? 'text-amber-400' : 'text-slate-400'}`}>{j.tipo}</Text>
                        </View>
                      </View>
                      <TouchableOpacity className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 items-center justify-center">
                        <FontAwesome5 name="pen" size={12} color="#22d3ee" />
                      </TouchableOpacity>
                    </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
  );
}
