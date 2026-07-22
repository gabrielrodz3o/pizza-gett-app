import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/shared/theme';
import { getValidCustomerAccessToken, useCustomerAuth } from '@/features/auth/store';
import { getMobileAppConfig } from '@/features/catalog/api';
import { appConfig } from '@/shared/config';
import { bindOnlineManager, ConnectivityBanner } from '@/shared/components/ConnectivityBanner';
import { ConfirmSheetHost } from '@/shared/components/ConfirmSheet';
import { PizzaGettoSplash } from '@/shared/components/PizzaGettoSplash';
import { AppToast } from '@/shared/components/Toast';

Sentry.init({dsn:appConfig.sentryDsn,enabled:Boolean(appConfig.sentryDsn),environment:appConfig.environment,sendDefaultPii:false,tracesSampleRate:appConfig.environment==='production'?0.15:1});
// Retenemos el splash nativo hasta que la escena JS esté montada; se oculta con fade desde PizzaGettoSplash.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
// setOptions solo está disponible en development builds; en Expo Go se omite el fade nativo.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
if (!isExpoGo) { try { SplashScreen.setOptions({ duration: 300, fade: true }); } catch { /* runtime sin soporte */ } }
const queryClient = new QueryClient({ defaultOptions: { queries: { retry:(count,error:any)=>!error?.response&&count<2,staleTime:60_000,gcTime:24*60*60_000,refetchOnMount:true,refetchOnReconnect:true,refetchOnWindowFocus:true,networkMode:'offlineFirst' },mutations:{networkMode:'online'} } });
const persister=createAsyncStoragePersister({storage:AsyncStorage,key:'pizza-getto-public-query-cache-v1',throttleTime:1000});

function Layout() {
  const [showSplash, setShowSplash] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const finishSplash = useCallback(() => setShowSplash(false), []);
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black,
  });
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['mobile-app', 'pizza-getto'], queryFn: () => getMobileAppConfig() })
      .catch(() => undefined)
      .finally(() => setConfigReady(true));
  }, []);
  useEffect(() => {
    void useCustomerAuth.getState().restore();
    const unbindNetwork=bindOnlineManager();
    const subscription = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(state === 'active');
        if(state==='active')void getValidCustomerAccessToken();
      }
    });
    const renewal=setInterval(()=>{if(AppState.currentState==='active')void getValidCustomerAccessToken();},5*60_000);
    return () => {subscription.remove();unbindNetwork();clearInterval(renewal);};
  }, []);
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{persister,maxAge:24*60*60_000,dehydrateOptions:{shouldDehydrateQuery:(query)=>query.state.status==='success'&&['mobile-app','menu'].includes(String(query.queryKey[0]))}}}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
        <ConnectivityBanner />
        <AppToast />
        <ConfirmSheetHost />
        {showSplash && <PizzaGettoSplash ready={fontsLoaded && configReady} onFinish={finishSplash} />}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(Layout);
