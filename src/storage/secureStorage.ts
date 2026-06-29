import * as Keychain from 'react-native-keychain';

const SERVICE = 'devhub_github';

export const saveToken = async (accessToken: string) => {
  await Keychain.setGenericPassword('github_token', accessToken, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
};

export const getToken = async () => {
  const credentials = await Keychain.getGenericPassword({ service: SERVICE });
  return credentials ? credentials.password : null;
};

export const clearToken = async () => {
  await Keychain.resetGenericPassword({ service: SERVICE });
};
