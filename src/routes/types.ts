import { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Search: undefined;
  Inbox: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<AppTabParamList>;
  Details: { itemId: number; title: string };
};

export type RootStackParamList = {
  OnboardingFlow: undefined;
  AuthFlow: undefined;
  AppFlow: undefined;
};
