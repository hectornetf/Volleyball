import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import { SessionProvider } from './src/context/SessionContext';

export default function App() {
  return (
    <SessionProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </SessionProvider>
  );
}
