import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateGroupCode } from '../services/sessionService';
import { useSession } from '../context/SessionContext';

export default function AuthWrapper({ children, title }) {
  const { activeGroupId, logout } = useSession();
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      setLoadingApp(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Erro', 'Preencha E-mail e Senha!');
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
         Alert.alert(
           "Primeiro Acesso?", 
           "Deseja CADASTRAR essa nova conta e gerar um código oficial para seu vôlei?",
           [
             { text: 'Cancelar', style: 'cancel', onPress: () => setLoadingAuth(false) },
             { text: 'Registrar e Criar Grupo', onPress: async () => {
                 try {
                   const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
                   const newCode = generateGroupCode();
                   // Salva o vínculo do usuário ao NOVO código de grupo
                   await setDoc(doc(db, 'users', user.uid), {
                      email: user.email,
                      groupId: newCode,
                      role: 'ADMIN'
                   });
                   // O SessionProvider vai detectar o login e ler esse groupId!
                 } catch (e) {
                   setLoadingAuth(false);
                   Alert.alert('Erro ao Criar', e.message);
                 }
             }}
           ]
         );
         return;
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

  // Se o cara tá logado e é admin, entrega!
  if (currentUser) {
    return (
       <View className="flex-1">
         <View className="bg-slate-900 px-4 py-2 flex-row justify-between items-center border-b border-purple-500/30 pt-10">
            <View className="flex-row items-center">
              <FontAwesome5 name="shield-alt" size={12} color="#10b981" />
              <Text className="text-emerald-400 font-bold ml-2 text-[10px] uppercase">Dono Autorizado | {activeGroupId}</Text>
            </View>
            <TouchableOpacity onPress={() => signOut(auth).then(logout)} className="bg-red-500/20 px-2 py-1 rounded">
               <Text className="text-red-400 font-bold text-[10px]">Sair (Trancar)</Text>
            </TouchableOpacity>
         </View>
         {children}
       </View>
    );
  }

  // Login Form
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center bg-[#0b0f1a] px-6">
       <View className="items-center mb-8 mt-10">
         <View className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700/50 items-center justify-center mb-4">
           <FontAwesome5 name="lock" size={24} color="#a855f7" />
         </View>
         <Text className="text-2xl font-black text-white text-center">Painel de Controle</Text>
         <Text className="text-sm text-slate-400 text-center mt-2 max-w-[250px]">
           A aba de <Text className="font-bold text-slate-300">{title}</Text> exige login do organizador.
         </Text>
       </View>

       <View className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl shadow-black/30">
          <TextInput 
             value={email} onChangeText={setEmail} placeholder="E-mail Administrativo" placeholderTextColor="#64748b" 
             style={{ color: 'white' }} className="bg-[#0b0f1a] w-full p-4 rounded-xl border border-slate-700 mb-4"
          />
          <TextInput 
             value={password} onChangeText={setPassword} placeholder="Senha Secreta" placeholderTextColor="#64748b"
             secureTextEntry style={{ color: 'white' }} className="bg-[#0b0f1a] w-full p-4 rounded-xl border border-slate-700 mb-6"
          />
          <TouchableOpacity onPress={handleLogin} disabled={loadingAuth} className="w-full py-4 rounded-xl flex-row justify-center items-center bg-purple-600">
             {loadingAuth ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base uppercase">Login / Criar Grupo</Text>}
          </TouchableOpacity>
       </View>
    </KeyboardAvoidingView>
  );
}
