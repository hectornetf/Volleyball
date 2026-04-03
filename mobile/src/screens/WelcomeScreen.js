import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { generateGroupCode } from '../services/sessionService';

export default function WelcomeScreen() {
  const [code, setCode] = useState('');
  const { loginAsGroup } = useSession();

  const handleJoin = async () => {
    if (code.length < 4) return Alert.alert('Erro', 'O código do vôlei é inválido.');
    let finalCode = code.toUpperCase().trim();
    if (!finalCode.startsWith('VO-')) finalCode = `VO-${finalCode}`;
    await loginAsGroup(finalCode);
  };

  const handleCreate = async () => {
    const newCode = generateGroupCode();
    Alert.alert(
      "Novo Vôlei", 
      `Criamos o código ${newCode} para o seu grupo. Compartilhe-o com os outros para gerenciarem juntos!`,
      [{ text: 'Começar!', onPress: () => loginAsGroup(newCode) }]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#0b0f1a]">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        
        <View className="items-center mb-10">
          <View className="bg-slate-800 p-6 rounded-full mb-4 border border-slate-700 shadow-2xl">
            <FontAwesome5 name="volleyball-ball" size={48} color="#22d3ee" />
          </View>
          <Text className="text-3xl font-black text-white text-center">Voleizin Dos Cria</Text>
          <Text className="text-slate-400 text-center mt-2">Gerencie sua pelada em tempo real</Text>
        </View>

        <View className="bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700">
          <Text className="text-white font-bold text-center mb-4 text-xs uppercase tracking-widest">Acessar Vôlei Existente</Text>
          
          <View className="relative justify-center mb-4">
            <FontAwesome5 name="key" size={14} color="#64748b" style={{ position: 'absolute', left: 16, zIndex: 1 }} />
            <TextInput 
              value={code}
              onChangeText={setCode}
              placeholder="Código (Ex: VO-ABCD)"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              className="bg-[#0b0f1a] w-full p-4 pl-12 rounded-xl border border-slate-700 text-white font-black text-lg focus:border-cyan-500"
            />
          </View>

          <TouchableOpacity 
            onPress={handleJoin}
            className="w-full bg-cyan-600 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-cyan-500/30"
          >
            <Text className="text-white font-black text-base uppercase">Entrar no Grupo</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-10 items-center">
          <Text className="text-slate-500 text-[10px] mb-4 font-bold">PRECISA DE UM NOVO?</Text>
          <TouchableOpacity onPress={handleCreate} className="bg-emerald-500/10 px-8 py-4 rounded-2xl border border-emerald-500/40 flex-row items-center">
             <FontAwesome5 name="plus-circle" size={16} color="#10b981" />
             <Text className="text-emerald-400 font-black uppercase tracking-widest text-xs ml-2">Criar Novo Vôlei</Text>
          </TouchableOpacity>
          <Text className="text-slate-600 text-[9px] mt-4 text-center px-10 italic">
            Ao criar, você recebe um código para compartilhar. Qualquer um com o código pode administrar.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
