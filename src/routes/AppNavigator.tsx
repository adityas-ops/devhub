import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList, AppTabParamList } from './types';

// Import Screens
import Home from '../screens/App/Home';
import Search from '../screens/App/Search';
import Inbox from '../screens/App/Inbox';
import Profile from '../screens/App/Profile';
import Setting from '../screens/App/Setting';
import Details from '../screens/App/Details';

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6', // Blue 500
        tabBarInactiveTintColor: '#94a3b8', // Slate 400
        tabBarStyle: {
          backgroundColor: '#1e293b', // Slate 800
          borderTopColor: '#334155',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, focused }) => {
          let label = '';
          switch (route.name) {
            case 'HomeTab':
              label = '🏠';
              break;
            case 'Search':
              label = '🔍';
              break;
            case 'Inbox':
              label = '📥';
              break;
            case 'Profile':
              label = '👤';
              break;
            case 'Setting':
              label = '⚙️';
              break;
          }
          return <Text style={{ fontSize: 20, color }}>{label}</Text>;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={Home} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Search" component={Search} />
      <Tab.Screen name="Inbox" component={Inbox} />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Setting" component={Setting} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Details"
        component={Details}
        options={({ route }) => ({
          title: route.params?.title || 'Details',
          headerStyle: {
            backgroundColor: '#1e293b',
          },
          headerTintColor: '#f8fafc',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      />
    </Stack.Navigator>
  );
}
