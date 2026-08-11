import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAppSelector } from '../store';

// Import Navigators
import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function NavigationProvider() {
  const { isOnboarded, isAuthenticated } = useAppSelector(state => state.auth);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isOnboarded ? (
            <Stack.Screen
              name="OnboardingFlow"
              component={OnboardingNavigator}
            />
          ) : !isAuthenticated ? (
            <Stack.Screen name="AuthFlow" component={AuthNavigator} />
          ) : (
            <Stack.Screen name="AppFlow" component={AppNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}
