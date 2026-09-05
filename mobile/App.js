import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import { SessionProvider } from './src/context/SessionContext';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox, View, Text } from 'react-native';
import { firebaseConfigError } from './src/config/firebase';

// Ignora o alerta inofensivo do Firebase Firestore no console
LogBox.ignoreLogs(['BloomFilter error']);

export default function App() {
  if (firebaseConfigError) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-[#0b0f1a] justify-center items-center px-7">
          <Text className="text-white text-xl font-bold text-center mb-3">Não foi possível conectar</Text>
          <Text className="text-slate-300 text-center leading-6">
            Este APK foi gerado sem a configuração do Firebase. Gere uma nova versão após configurar as variáveis do ambiente de build.
          </Text>
          <Text className="text-slate-500 text-xs text-center mt-5">{firebaseConfigError}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
