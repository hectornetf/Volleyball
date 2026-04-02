import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function AuthWrapper({ children, title }) {
  const [user, setUser] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Fica escutando se o usuário já digitou as chaves antes, ou se acabou de logar
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoadingApp(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Erro', 'Preencha E-mail e Senha!');
    setLoadingAuth(true);
    try {
      // Tenta fazer o Login Tradicional
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      // Se a conta não existe, nós criamos pra ele (Super prático pra 1º acesso)
      // Se existisse erro de senha errada, a gente avisa
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
         Alert.alert(
           "Primeiro Acesso?", 
           "Essa será a conta Administradora mestre oficial da sua pelada. Deseja CADASTRAR essa nova senha?",
           [
             { text: 'Cancelar', style: 'cancel', onPress: () => setLoadingAuth(false) },
             { text: 'Registrar', onPress: async () => {
                 try {
                   await createUserWithEmailAndPassword(auth, email.trim(), password);
                 } catch (e) {
                   setLoadingAuth(false);
                   Alert.alert('Erro ao Criar', e.message);
                 }
             }}
           ]
         );
         return; // Pára aqui esperando a resposta do Alert
      }
      setLoadingAuth(false);
      Alert.alert('Erro de Acesso', err.message);
    }
  };

  if (loadingApp) {
    return (
      <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  // Se o cara tá logado e autorizado, entrega a tela que ele pediu!
  if (user) {
    return (
       <View className="flex-1">
         {/* Cabeçalho de Segurança para permitir ele deslogar caso decida dar o celular pro time ver algo */}
         <View className="bg-slate-900 px-4 py-2 flex-row justify-between items-center border-b border-purple-500/30 pt-10">
            <View className="flex-row items-center">
              <FontAwesome5 name="shield-alt" size={12} color="#10b981" />
              <Text className="text-emerald-400 font-bold ml-2 text-[10px] uppercase">Dono Autorizado</Text>
            </View>
            <TouchableOpacity onPress={() => signOut(auth)} className="bg-red-500/20 px-2 py-1 rounded">
               <Text className="text-red-400 font-bold text-[10px]">Sair (Trancar)</Text>
            </TouchableOpacity>
         </View>
         {children}
       </View>
    );
  }

  // Se NÃO tá logado, a Barreira do Cadeado aparece com UI Glass:
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center bg-[#0b0f1a] px-6">
       
       <View className="items-center mb-8 mt-10">
         <View className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700/50 items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
           <FontAwesome5 name="lock" size={30} color="#a855f7" />
         </View>
         <Text className="text-2xl font-black text-white text-center">Acesso Restrito</Text>
         <Text className="text-sm text-slate-400 text-center mt-2 max-w-[250px]">
           A aba de <Text className="font-bold text-slate-300">{title}</Text> só pode ser visualizada pelo dono mestre do sistema.
         </Text>
       </View>

       <View className="bg-slate-800 p-6 rounded-3xl shadow-xl shadow-black/40 border border-slate-700">
          <View className="mb-4 relative justify-center">
             <FontAwesome5 name="envelope" size={14} color="#64748b" style={{ position: 'absolute', left: 16, zIndex: 1 }} />
             <TextInput 
                value={email}
                onChangeText={setEmail}
                placeholder="Seu E-mail Administrativo"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ color: 'white' }}
                className="bg-[#0b0f1a] w-full p-4 pl-12 rounded-xl border border-slate-700 focus:border-purple-500"
             />
          </View>

          <View className="mb-6 relative justify-center">
             <FontAwesome5 name="key" size={14} color="#64748b" style={{ position: 'absolute', left: 16, zIndex: 1 }} />
             <TextInput 
                value={password}
                onChangeText={setPassword}
                placeholder="Senha Secreta"
                placeholderTextColor="#64748b"
                secureTextEntry
                style={{ color: 'white' }}
                className="bg-[#0b0f1a] w-full p-4 pl-12 rounded-xl border border-slate-700 focus:border-purple-500"
             />
          </View>

          <TouchableOpacity 
             onPress={handleLogin}
             disabled={loadingAuth}
             className={`w-full py-4 rounded-xl flex-row justify-center items-center ${loadingAuth ? 'bg-purple-900' : 'bg-purple-600 shadow-lg shadow-purple-500/40'}`}
          >
             {loadingAuth ? <ActivityIndicator color="white" /> : (
                <>
                  <FontAwesome5 name="unlock-alt" size={14} color="white" />
                  <Text className="text-white font-black ml-2 text-base">Destrancar Painel</Text>
                </>
             )}
          </TouchableOpacity>
       </View>

    </KeyboardAvoidingView>
  );
}
