import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/features/auth/store';
import { getCustomerHome } from '@/features/customer/api';
import { getMenu,getMobileAppConfig } from './api';

export function useMobileExperienceData(branchId:number|null,activeTab:string){
  const session=useCustomerAuth(state=>state.session);
  const configQuery=useQuery({queryKey:['mobile-app','pizza-getto'],queryFn:()=>getMobileAppConfig(),refetchInterval:60_000});
  const branches=configQuery.data?.branches??[];
  const branch=branches.find(item=>item.id===branchId);
  const customerQuery=useQuery({queryKey:['customer-home',session?.profile.id],queryFn:getCustomerHome,enabled:Boolean(session),refetchInterval:activeTab==='orders'?15_000:60_000});
  const menuQuery=useQuery({queryKey:['menu',branch?.id],queryFn:()=>getMenu(branch!),enabled:Boolean(branch),refetchInterval:60_000});
  return {session,configQuery,customerQuery,menuQuery,branches,branch};
}
