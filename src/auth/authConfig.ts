import Config from 'react-native-config';
import { AuthConfiguration } from 'react-native-app-auth';

export const githubAuthConfig: AuthConfiguration = {
  clientId: Config.GITHUB_CLIENT_ID || '',
  clientSecret: Config.GITHUB_CLIENT_SECRET || '',
  redirectUrl: 'com.devhub://callback',
  scopes: ['read:user', 'user:email'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
  },
};
