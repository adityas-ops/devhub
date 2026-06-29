import Config from 'react-native-config';
import { AuthConfiguration } from 'react-native-app-auth';

export const githubAuthConfig: AuthConfiguration = {
  clientId: Config.GITHUB_CLIENT_ID || 'Ov23liGC50kcj0s3Cu3K',
  clientSecret: Config.GITHUB_CLIENT_SECRET || '6d104e29141e7f849f175f0c335c5b056676f1af',
  redirectUrl: 'com.devhub://callback',
  scopes: ['read:user', 'user:email'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
  },
};
