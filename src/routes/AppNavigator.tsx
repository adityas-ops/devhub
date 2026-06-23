import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons, {
  IoniconsIconName,
} from '@react-native-vector-icons/ionicons/static';
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
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: IoniconsIconName = 'home';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Inbox':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }
          return <Ionicons name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        options={{
          animation: 'shift',
        }}
        name="Home"
        component={Home}
      />
      <Tab.Screen
        options={{
          animation: 'shift',
        }}
        name="Search"
        component={Search}
      />
      <Tab.Screen
        name="Inbox"
        component={Inbox}
        options={{
          tabBarBadge: '',
          tabBarBadgeStyle: styles.badgeStyle,
          animation: 'shift',
        }}
      />
      <Tab.Screen
        options={{
          animation: 'shift',
        }}
        name="Profile"
        component={Profile}
      />
      <Tab.Screen
        options={{
          animation: 'shift',
        }}
        name="Settings"
        component={Setting}
      />
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff', // White background matching screenshot
    borderTopColor: '#f1f5f9', // Very light gray border top
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeStyle: {
    backgroundColor: '#ea580c', // Orange badge dot matching screenshot
    minWidth: 8,
    maxWidth: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
