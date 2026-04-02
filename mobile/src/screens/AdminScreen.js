import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { addJogador, subscribeJogadores } from '../services/jogadorService';
import AuthWrapper from '../components/AuthWrapper';

export default function AdminScreen() {
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [nivel, setNivel] = useState(3);
  const [isAvulso, setIsAvulso] = useState(false);
  
  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [diasSelecionados, setDiasSelecionados] = useState(['Seg']);
  
  const [elenco, setElenco] = useState([]);
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Ligar o App ao Banco de Dados "Real-Time" assim que a tela abre!
  useEffect(() => {
    const unsubscribe = subscribeJogadores((dadosDoBanco) => {
      setElenco(dadosDoBanco);
      setCarregandoBanco(false);
    }, (error) => {
      console.error(error);
      setCarregandoBanco(false);
      Alert.alert("Aviso do Firebase", "Falha de conexão. O Banco de Dados Firestore ainda não foi ativado ou está bloqueado. " + error.message);
    });
    return () => unsubscribe(); // Ao fechar a aba Admin, ele para de escutar o banco
  }, []);

  const toggleDia = (dia) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
    } else {
      setDiasSelecionados([...diasSelecionados, dia]);
    }
  };

  const handleSalvar = async () => {
    // ... logic remains
    if (!nome.trim()) return Alert.alert('Erro', 'O nome do jogador é obrigatório.');
    setSalvando(true);
    try {
      await addJogador({
        nome, celular, nivel, tipo: isAvulso ? 'AVULSO' : 'MENSALISTA',
        diasPermitidos: isAvulso ? [] : diasSelecionados, statusAtivo: true, dataCadastro: new Date().toISOString()
      });
      setNome(''); setCelular(''); setIsAvulso(false); setNivel(3);
      Alert.alert('Sucesso!', 'Jogador salvo na nuvem com sucesso!');
    } catch (err) {
      Alert.alert('Erro no Banco', 'Houve uma falha de conexão: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const seedFakeData = async () => {
    setCarregandoBanco(true);
    const fakes = [
      { nome: "Lucas (Fake)", celular: "11999990001", nivel: 5, tipo: "MENSALISTA", diasPermitidos: ["Seg", "Qua"] },
      { nome: "Marcelo (Fake)", celular: "11999990002", nivel: 4, tipo: "MENSALISTA", diasPermitidos: ["Seg"] },
      { nome: "Pedro (Fake)", celular: "11999990003", nivel: 3, tipo: "MENSALISTA", diasPermitidos: ["Seg"] },
      { nome: "Gustavo (Fake)", celular: "11999990004", nivel: 3, tipo: "MENSALISTA", diasPermitidos: ["Ter"] },
      { nome: "Felipe Lev (Fake)", celular: "11999990005", nivel: 5, tipo: "MENSALISTA", diasPermitidos: ["Qua"] },
      { nome: "Rodrigo (Fake)", celular: "11999990006", nivel: 2, tipo: "AVULSO", diasPermitidos: [] },
      { nome: "Bruno (Fake)", celular: "11999990007", nivel: 2, tipo: "AVULSO", diasPermitidos: [] },
      { nome: "Tiago Silva (Fake)", celular: "11999990008", nivel: 4, tipo: "AVULSO", diasPermitidos: [] },
      { nome: "Guilherme (Fake)", celular: "", nivel: 3, tipo: "MENSALISTA", diasPermitidos: ["Seg"] },
      { nome: "Matheus O. (Fake)", celular: "", nivel: 4, tipo: "MENSALISTA", diasPermitidos: ["Seg", "Ter"] }
    ];
    for(let j of fakes) {
      await addJogador({ ...j, statusAtivo: true, presencaAtual: "Confirmado", diariaPaga: false, mensalidadePaga: false });
    }
    setCarregandoBanco(false);
    Alert.alert("Pronto!", "10 Jogadores Fictícios foram adicionados!");
  };

  return (
    <AuthWrapper title="Administração de Elenco">
      <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        
        {/* Box de Criação / Cadastro */}
        <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-6 mt-4">
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
            
            <View className="relative justify-center mb-3">
              <FontAwesome5 name="whatsapp" size={16} color="#64748b" style={{ position: 'absolute', left: 16, zIndex: 1 }} />
              <TextInput 
                value={celular}
                onChangeText={setCelular}
                placeholder="(11) 99999-9999" 
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                style={{ color: 'white' }}
                className="w-full bg-[#0b0f1a] rounded-xl p-4 pl-12 font-semibold border border-slate-700/50 focus:border-purple-500"
              />
            </View>

            <View className="flex-row justify-between w-full mb-3">
               <View className="flex-1 mr-2">
                 <Text className="text-[10px] text-slate-400 uppercase font-bold ml-1 mb-1">Nível de Jogo</Text>
                 <View className="bg-[#0b0f1a] rounded-xl border border-slate-700/50 flex-row justify-between items-center p-2 h-12">
                   <TouchableOpacity onPress={() => setNivel(Math.max(1, nivel-1))} className="w-8 h-8 items-center justify-center bg-slate-800 rounded">
                     <Text className="text-white font-bold">-</Text>
                   </TouchableOpacity>
                   <Text className="text-white font-bold">⭐ {nivel}</Text>
                   <TouchableOpacity onPress={() => setNivel(Math.min(5, nivel+1))} className="w-8 h-8 items-center justify-center bg-slate-800 rounded">
                     <Text className="text-white font-bold">+</Text>
                   </TouchableOpacity>
                 </View>
               </View>

               <View className="flex-1 ml-2">
                 <Text className="text-[10px] text-slate-400 uppercase font-bold ml-1 mb-1">Categoria</Text>
                 <TouchableOpacity 
                   onPress={() => setIsAvulso(!isAvulso)}
                   className={`border flex-row items-center justify-center h-12 rounded-xl ${isAvulso ? 'bg-amber-500/20 border-amber-500 shadow-md' : 'bg-[#0b0f1a] border-slate-700/50'}`}
                 >
                   <FontAwesome5 name={isAvulso ? "check-square" : "square"} solid size={14} color={isAvulso ? "#fbbf24" : "#64748b"} />
                   <Text className={`font-bold ml-2 ${isAvulso ? 'text-amber-400' : 'text-slate-400'}`}>É Avulso?</Text>
                 </TouchableOpacity>
               </View>
            </View>

            {/* Dias Disponíveis caso seja Mensalista */}
            {!isAvulso && (
              <View className="bg-[#0b0f1a] p-3 rounded-xl border border-slate-700/50">
                 <Text className="text-[9px] text-slate-400 font-bold uppercase mb-2">Dias Permitidos da Mensalidade:</Text>
                 <View className="flex-row flex-wrap justify-between">
                   {diasDaSemana.map(dia => {
                     const sel = diasSelecionados.includes(dia);
                     return (
                       <TouchableOpacity 
                         key={dia} 
                         onPress={() => toggleDia(dia)}
                         className={`p-2 rounded-lg mb-2 w-[30%] items-center border ${sel ? 'bg-purple-500/20 border-purple-500' : 'bg-slate-800 border-slate-700'}`}
                       >
                          <Text className={`text-[10px] font-black uppercase ${sel ? 'text-purple-300' : 'text-slate-400'}`}>{dia}</Text>
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
             className={`w-full py-4 rounded-xl flex-row items-center justify-center shadow ${salvando ? 'bg-purple-900 border border-purple-700' : 'bg-purple-500 shadow-purple-500/40'}`}
          >
             {salvando ? (
                <ActivityIndicator color="white" />
             ) : (
               <>
                 <FontAwesome5 name="cloud-upload-alt" size={14} color="white" />
                 <Text className="text-white font-bold ml-2 text-base">Salvar na Nuvem</Text>
               </>
             )}
          </TouchableOpacity>
        </View>

        {/* Lista Real do Elenco (Firestore) */}
        <View className="bg-slate-800 p-5 rounded-2xl shadow-md">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="font-bold text-white text-lg">Elenco Real</Text>
             <TouchableOpacity onPress={seedFakeData} className="bg-emerald-500/20 border border-emerald-500/50 px-2 py-1 rounded-lg">
                <Text className="text-[10px] text-emerald-400 font-bold uppercase">Gerar Fakes</Text>
             </TouchableOpacity>
             <View className="bg-indigo-500/20 px-2 py-1 rounded-lg">
               <Text className="text-xs text-indigo-400 font-bold">{elenco.length} gravados</Text>
             </View>
          </View>

          {carregandoBanco ? (
             <ActivityIndicator color="#c084fc" style={{ marginVertical: 20 }} />
          ) : elenco.length === 0 ? (
             <Text className="text-slate-500 italic text-center py-5">Nenhum jogador cadastrado ainda. Comece a cadastrar no painel acima!</Text>
          ) : (
            <View className="space-y-3">
              {elenco.map(j => (
                <View key={j.id} className="bg-[#0b0f1a] p-3.5 rounded-xl border border-slate-700/50 flex-row justify-between items-center mb-2">
                    <View>
                      <Text className="font-bold text-slate-200">{j.nome}</Text>
                      {j.celular && (
                        <View className="flex-row items-center mt-1">
                          <FontAwesome5 name="phone" size={8} color="#94a3b8" />
                          <Text className="text-[10px] text-slate-400 ml-1.5">{j.celular}</Text>
                        </View>
                      )}
                    </View>
                    <View className="items-end justify-center flex-row">
                      <View className="items-end mr-3">
                        <View className="flex-row mb-1">
                          {[...Array(j.nivel)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={8} color="#fbbf24" style={{marginLeft: 1}}/>)}
                        </View>
                        <View className={`${j.tipo === 'AVULSO' ? 'bg-amber-500/20' : 'bg-slate-700'} px-1.5 py-0.5 rounded`}>
                          <Text className={`text-[9px] font-bold ${j.tipo === 'AVULSO' ? 'text-amber-400' : 'text-slate-300'}`}>{j.tipo}</Text>
                        </View>
                      </View>
                      <TouchableOpacity className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                        <FontAwesome5 name="pen" size={12} color="#22d3ee" />
                      </TouchableOpacity>
                    </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </AuthWrapper>
  );
}
