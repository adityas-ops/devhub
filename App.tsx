import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client/react';
import { store } from './src/store';
import { client } from './src/graphql/client';
import NavigationProvider from './src/routes';

function App() {
  return (
    <Provider store={store}>
      <ApolloProvider client={client}>
        <SafeAreaProvider>
          <NavigationProvider />
        </SafeAreaProvider>
      </ApolloProvider>
    </Provider>
  );
}

export default App;
