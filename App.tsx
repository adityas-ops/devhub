import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client/react';
import { store } from './src/store';
import { client } from './src/graphql/client';
import NavigationProvider from './src/routes';
import { StatusBar } from 'react-native';

import SplashScreen from './src/components/SplashScreen';

function App() {
  const [appLoading, setAppLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ApolloProvider client={client}>
          <StatusBar barStyle={'dark-content'} />
          <SafeAreaProvider>
            <NavigationProvider />
          </SafeAreaProvider>
          <SplashScreen isLoading={appLoading} />
        </ApolloProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
