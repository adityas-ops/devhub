import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getToken } from '../storage/secureStorage';
import Config from 'react-native-config';

const uri = 'https://api.github.com/graphql'; 

const httpLink = new HttpLink({
  uri,
});

const authLink = setContext(async (_, { headers }) => {
  const token = (await getToken()) || Config.GITHUB_TOKEN;
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
