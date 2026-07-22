import * as Sentry from '@sentry/react-native';
import { appConfig } from './config';

const clean=(value:unknown)=>String(value??'').replace(/Bearer\s+[\w.-]+/gi,'Bearer [redacted]').replace(/\+?\d[\d\s()-]{8,}/g,'[phone]');
export const logger={
  info:(message:string,context?:Record<string,unknown>)=>{if(appConfig.isDevelopment)console.info(clean(message),context??'');},
  error:(error:unknown,context?:Record<string,unknown>)=>{if(appConfig.isDevelopment)console.error(error,context??'');Sentry.captureException(error instanceof Error?error:new Error(clean(error)),{extra:context});},
  breadcrumb:(message:string,data?:Record<string,unknown>)=>Sentry.addBreadcrumb({message:clean(message),data,level:'info'}),
};
