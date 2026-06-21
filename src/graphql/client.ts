import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Replace with your actual GraphQL server URL
const uri = 'https://api.spacex.land/graphql'; 

const httpLink = new HttpLink({
  uri,
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
