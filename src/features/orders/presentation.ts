export type OrderStage={key:string;label:string;icon:string};

const normalized=(value?:string)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function isCancelledOrder(order:any){const name=normalized(order?.status_name||order?.account_state_name);return /cancel|anulad|rechaz/.test(name);}

export function orderStages(delivery:boolean):OrderStage[]{return delivery
  ?[{key:'received',label:'Recibido',icon:'receipt-outline'},{key:'preparing',label:'Preparando',icon:'flame-outline'},{key:'ready',label:'Listo',icon:'checkmark-circle-outline'},{key:'route',label:'En camino',icon:'bicycle-outline'},{key:'delivered',label:'Entregado',icon:'home-outline'}]
  :[{key:'received',label:'Recibido',icon:'receipt-outline'},{key:'preparing',label:'Preparando',icon:'flame-outline'},{key:'ready',label:'Listo',icon:'bag-check-outline'},{key:'delivered',label:'Entregado',icon:'checkmark-done-outline'}];}

export function orderProgress(order:any){
  const name=normalized(order?.status_name||order?.account_state_name);
  const stages=orderStages(Boolean(order?.is_delivery));
  if(isCancelledOrder(order))return 0;
  if(/entreg|complet|finaliz|cerrad/.test(name)||order?.invoice_id)return stages.length;
  if(/camino|ruta|despach|sali/.test(name))return Math.min(4,stages.length-1);
  if(/listo|terminad/.test(name))return 3;
  if(/prepar|cocin|produccion/.test(name))return 2;
  return 1;
}

export function isActiveOrder(order:any){return !isCancelledOrder(order)&&orderProgress(order)<orderStages(Boolean(order?.is_delivery)).length;}

export function orderEta(order:any){
  if(isCancelledOrder(order))return 'Pedido cancelado';
  const progress=orderProgress(order),stages=orderStages(Boolean(order?.is_delivery));
  if(progress>=stages.length)return 'Pedido completado';
  if(order?.estimated_ready_at){const date=new Date(order.estimated_ready_at);if(!Number.isNaN(date.getTime()))return `Estimado ${date.toLocaleTimeString('es-DO',{hour:'numeric',minute:'2-digit'})}`;}
  return order?.is_delivery?'Entrega estimada en 30–45 min':'Listo estimado en 15–25 min';
}
