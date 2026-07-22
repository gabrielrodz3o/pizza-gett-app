const DEFAULT_API='https://services-test.comandpos.com';
const apiBaseUrl=(process.env.EXPO_PUBLIC_API_BASE_URL||DEFAULT_API).replace(/\/+$/,'');
if(!/^https:\/\//.test(apiBaseUrl))throw new Error('EXPO_PUBLIC_API_BASE_URL debe usar HTTPS');
export const appConfig={apiBaseUrl,sentryDsn:process.env.EXPO_PUBLIC_SENTRY_DSN||'',environment:process.env.EXPO_PUBLIC_APP_ENV||'test',isDevelopment:__DEV__} as const;
