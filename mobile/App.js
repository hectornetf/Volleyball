import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import { SessionProvider } from './src/context/SessionContext';

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
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
