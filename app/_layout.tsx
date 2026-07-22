import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/shared/theme';
import { getValidCustomerAccessToken, useCustomerAuth } from '@/features/auth/store';
import { appConfig } from '@/shared/config';
import { bindOnlineManager, ConnectivityBanner } from '@/shared/components/ConnectivityBanner';
import { PizzaGettoSplash } from '@/shared/components/PizzaGettoSplash';

Sentry.init({dsn:appConfig.sentryDsn,enabled:Boolean(appConfig.sentryDsn),environment:appConfig.environment,sendDefaultPii:false,tracesSampleRate:appConfig.environment==='production'?0.15:1});
const queryClient = new QueryClient({ defaultOptions: { queries: { retry:(count,error:any)=>!error?.response&&count<2,staleTime:60_000,gcTime:24*60*60_000,refetchOnMount:true,refetchOnReconnect:true,refetchOnWindowFocus:true,networkMode:'offlineFirst' },mutations:{networkMode:'online'} } });
const persister=createAsyncStoragePersister({storage:AsyncStorage,key:'pizza-getto-public-query-cache-v1',throttleTime:1000});

function Layout() {
  const [showSplash, setShowSplash] = useState(true);
  const finishSplash = useCallback(() => setShowSplash(false), []);
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
        {showSplash && <PizzaGettoSplash onFinish={finishSplash} />}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(Layout);
