import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Ionicons, {
  IoniconsIconName,
} from '@react-native-vector-icons/ionicons/static';

import { AppStackParamList, AppTabParamList } from './types';

import { useAppSelector } from '../store';

/* -------------------------------------------------------------------------- */
/* Screens                                                                    */
/* -------------------------------------------------------------------------- */

import Home from '../screens/App/Home';
import Search from '../screens/App/Search';
import Inbox from '../screens/App/Inbox';
import Profile from '../screens/App/Profile';
import Setting from '../screens/App/Setting';

import Details from '../screens/App/Details';
import ContributionsScreen from '../screens/App/ContributionsScreen';
import CodeViewer from '../screens/App/CodeViewer';

/* -------------------------------------------------------------------------- */
/* Navigators                                                                 */
/* -------------------------------------------------------------------------- */

const Tab = createBottomTabNavigator<AppTabParamList>();

const Stack = createNativeStackNavigator<AppStackParamList>();

/* -------------------------------------------------------------------------- */
/* Tab Configuration                                                          */
/* -------------------------------------------------------------------------- */

type TabConfig = {
  activeIcon: IoniconsIconName;
  inactiveIcon: IoniconsIconName;
};

const TAB_CONFIG: Record<keyof AppTabParamList, TabConfig> = {
  Home: {
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },

  Search: {
    activeIcon: 'search',
    inactiveIcon: 'search-outline',
  },

  Inbox: {
    activeIcon: 'notifications',
    inactiveIcon: 'notifications-outline',
  },

  Profile: {
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },

  Settings: {
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
  },
};

/* -------------------------------------------------------------------------- */
/* Animated Tab Item                                                          */
/* -------------------------------------------------------------------------- */

interface AnimatedTabItemProps {
  route: any;
  index: number;
  focused: boolean;
  descriptors: any;
  navigation: any;
  unreadCount: number;
}

function AnimatedTabItem({
  route,
  focused,
  descriptors,
  navigation,
  unreadCount,
}: AnimatedTabItemProps) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;

  const translateY = useRef(new Animated.Value(focused ? -2 : 0)).current;

  const pillWidth = useRef(new Animated.Value(focused ? 1 : 0)).current;

  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
        mass: 0.7,
      }),

      Animated.spring(translateY, {
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),

      Animated.timing(pillWidth, {
        toValue: focused ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused, scale, translateY, pillWidth]);

  useEffect(() => {
    if (route.name === 'Inbox' && unreadCount > 0) {
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.25,
          useNativeDriver: true,
          damping: 5,
        }),

        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
        }),
      ]).start();
    }
  }, [unreadCount, route.name, badgeScale]);

  const config = TAB_CONFIG[route.name as keyof AppTabParamList];

  const { options } = descriptors[route.key];

  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
      ? options.title
      : route.name;

  const color = focused ? '#111827' : '#94a3b8';

  const iconName = focused ? config.activeIcon : config.inactiveIcon;

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.tabItem}>
        {/* Animated Active Pill */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              opacity: pillWidth,
              transform: [
                {
                  scaleX: pillWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.tabContent,
            {
              transform: [
                {
                  scale,
                },
                {
                  translateY,
                },
              ],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name={iconName} size={23} color={color} />

            {/* Notification Badge */}
            {route.name === 'Inbox' && unreadCount > 0 && (
              <Animated.View
                style={[
                  styles.badge,
                  {
                    transform: [
                      {
                        scale: badgeScale,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.badgeDot} />
              </Animated.View>
            )}
          </View>

          {/* Label */}
          <Animated.Text
            style={[
              styles.tabLabel,
              {
                color,
                opacity: focused ? 1 : 0.9,
                fontWeight: focused ? '700' : '600',
              },
            ]}
          >
            {typeof label === 'string' ? label : route.name}
          </Animated.Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

/* -------------------------------------------------------------------------- */
/* Custom Tab Bar                                                             */
/* -------------------------------------------------------------------------- */

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const unreadCount = useAppSelector(s => s.notifications.unreadCount);

  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          return (
            <AnimatedTabItem
              key={route.key}
              route={route}
              index={index}
              focused={focused}
              descriptors={descriptors}
              navigation={navigation}
              unreadCount={unreadCount}
            />
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab Navigator                                                              */
/* -------------------------------------------------------------------------- */

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Home',
        }}
      />

      <Tab.Screen
        name="Search"
        component={Search}
        options={{
          title: 'Search',
        }}
      />

      <Tab.Screen
        name="Inbox"
        component={Inbox}
        options={{
          title: 'Inbox',
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Profile',
        }}
      />

      <Tab.Screen
        name="Settings"
        component={Setting}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

/* -------------------------------------------------------------------------- */
/* App Navigator                                                              */
/* -------------------------------------------------------------------------- */

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Details"
        component={Details}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="CodeViewer"
        component={CodeViewer}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Contributions"
        component={ContributionsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  /* ---------------------------------------------------------------------- */
  /* Tab Bar                                                                 */
  /* ---------------------------------------------------------------------- */

  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,

    backgroundColor: 'transparent',
  },

  tabBar: {
    height: 68,

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#ffffff',

    borderRadius: 24,

    borderWidth: 1,
    borderColor: '#eef0f3',

    paddingHorizontal: 6,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,

    elevation: 10,
  },

  /* ---------------------------------------------------------------------- */
  /* Tab Item                                                                */
  /* ---------------------------------------------------------------------- */

  tabItem: {
    flex: 1,
    height: '100%',

    alignItems: 'center',
    justifyContent: 'center',

    position: 'relative',
  },

  activePill: {
    position: 'absolute',

    width: 58,
    height: 54,

    borderRadius: 10,

    backgroundColor: '#f1f5f9',
  },

  tabContent: {
    width: 64,
    height: 58,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 2,
  },

  /* ---------------------------------------------------------------------- */
  /* Icon                                                                     */
  /* ---------------------------------------------------------------------- */

  iconWrapper: {
    width: 28,
    height: 27,

    alignItems: 'center',
    justifyContent: 'center',

    position: 'relative',
  },

  /* ---------------------------------------------------------------------- */
  /* Label                                                                    */
  /* ---------------------------------------------------------------------- */

  tabLabel: {
    marginTop: 3,

    fontSize: 10.5,
    lineHeight: 13,

    letterSpacing: 0.1,
  },

  /* ---------------------------------------------------------------------- */
  /* Badge                                                                    */
  /* ---------------------------------------------------------------------- */

  badge: {
    position: 'absolute',

    right: -5,
    top: -4,

    width: 10,
    height: 10,

    borderRadius: 5,

    backgroundColor: '#ffffff',

    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeDot: {
    width: 7,
    height: 7,

    borderRadius: 3.5,

    backgroundColor: '#ea580c',
  },
});
