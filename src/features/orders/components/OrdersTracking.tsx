import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator,Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { EmptyState } from '@/shared/components/EmptyState';
import { colors,shadow } from '@/shared/theme';
import { isActiveOrder,isCancelledOrder,orderEta,orderProgress,orderStages } from '../presentation';
import { OrderDetailModal } from './OrderDetailModal';

const money=(v:number)=>`RD$${v.toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fallback=<Ionicons name="pizza-outline" size={24} color={colors.brown}/>;
const orderDate=(order:any)=>{
  if(order.created_at_format)return order.created_at_format;
  const raw=String(order.created_at||'').trim();
  if(!raw)return '';
  const normalized=raw.replace(' ','T').replace(/(\.\d{3})\d+/,'$1');
  const hasTimezone=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parsed=new Date(hasTimezone?normalized:`${normalized}Z`);
  if(Number.isNaN(parsed.getTime()))return raw;
  return parsed.toLocaleString('es-DO',{timeZone:'America/Santo_Domingo',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
};

export function OrdersTracking({session,loading,orders,onLogin,onRetry,onReorder}:{session:boolean;loading:boolean;orders:any[];onLogin:()=>void;onRetry:()=>void;onReorder:(order:any)=>void}){
  const [selectedOrder,setSelectedOrder]=useState<number|null>(null);
  if(!session)return <View style={s.empty}><Ionicons name="navigate-outline" size={42} color={colors.brown}/><Text style={s.emptyTitle}>Sigue tu pedido en vivo</Text><Text style={s.emptyBody}>Inicia sesión para saber cuándo entra al horno y cuándo sale a delivery.</Text><Pressable onPress={onLogin} style={s.button}><Text style={s.buttonText}>Iniciar sesión</Text></Pressable></View>;
  if(loading)return <View style={s.empty}><ActivityIndicator color={colors.yellow} size="large"/><Text style={s.emptyBody}>Actualizando tus pedidos…</Text></View>;
  if(!orders.length)return <EmptyState icon="receipt-outline" title="Aún no tienes pedidos" body="Cuando ordenes, podrás seguir tu pizza desde el horno hasta tu puerta."/>;
  const active=orders.filter(isActiveOrder),history=orders.filter(x=>!isActiveOrder(x));
  return <>
    <View style={s.header}><View><Text style={s.title}>Mis pedidos</Text><Text style={s.subtitle}>{active.length?'Seguimiento en tiempo real':'Tu historial de Pizza Getto'}</Text></View><Pressable accessibilityLabel="Actualizar pedidos" onPress={onRetry} style={s.refresh}><Ionicons name="refresh" size={20} color={colors.brown}/></Pressable></View>
    {active.length>0&&<><Text style={s.sectionKicker}>PEDIDO ACTIVO</Text>{active.map(order=><OrderCard key={order.account_id} order={order} active onPress={()=>setSelectedOrder(order.account_id)} onReorder={()=>onReorder(order)}/>)}</>}
    {history.length>0&&<><Text style={[s.sectionKicker,{marginTop:22}]}>PEDIDOS ANTERIORES</Text>{history.map(order=><OrderCard key={order.account_id} order={order} onPress={()=>setSelectedOrder(order.account_id)} onReorder={()=>onReorder(order)}/>)}</>}
    <OrderDetailModal visible={selectedOrder!==null} orderId={selectedOrder} onClose={()=>setSelectedOrder(null)} onReorder={()=>{const order=orders.find(x=>x.account_id===selectedOrder);if(order)onReorder(order);}}/>
  </>;
}

function OrderCard({order,active=false,onPress,onReorder}:{order:any;active?:boolean;onPress:()=>void;onReorder:()=>void}){
  const stages=orderStages(Boolean(order.is_delivery)),progress=orderProgress(order),cancelled=isCancelledOrder(order),preview=Array.isArray(order.item_preview)?order.item_preview:[];
  return <Pressable onPress={onPress} style={({pressed})=>[s.card,active&&s.activeCard,pressed&&{opacity:.86}]}>
    <View style={s.top}><View style={{flex:1}}><Text style={s.number}>Orden {order.order_code||`#${order.account_id}`}</Text><Text style={s.date}>{orderDate(order)} · {order.location_name||'Pizza Getto'}</Text></View><View style={[s.badge,cancelled&&s.cancelBadge]}><View style={[s.statusDot,cancelled&&{backgroundColor:colors.red}]}/><Text style={[s.badgeText,cancelled&&{color:colors.red}]}>{order.status_name||'Recibido'}</Text></View></View>
    {active&&!cancelled&&<><Text style={s.eta}>{orderEta(order)}</Text><View style={s.timeline}>{stages.map((stage,index)=>{const done=index<progress,current=index===progress-1;return <View key={stage.key} style={s.stage}><View style={[s.stageIcon,done&&s.stageDone,current&&s.stageCurrent]}><Ionicons name={stage.icon as any} size={15} color={done?'white':colors.muted}/></View>{index<stages.length-1&&<View style={[s.stageLine,done&&index<progress-1&&s.stageLineDone]}/>}<Text style={[s.stageLabel,current&&s.stageLabelCurrent]} numberOfLines={1}>{stage.label}</Text></View>})}</View></>}
    <View style={s.products}>{preview.length?preview.map((item:any,index:number)=><View key={`${item.item_id}-${index}`} style={s.thumb}>{item.item_image_url?<Image source={{uri:item.item_image_url}} style={s.thumbImage}/>:fallback}</View>):<View style={s.thumb}>{fallback}</View>}<View style={{flex:1}}><Text style={s.productSummary}>{Number(order.item_count)||preview.length} {Number(order.item_count)===1?'producto':'productos'}</Text><Text style={s.productNames} numberOfLines={1}>{preview.map((x:any)=>`${x.quantity}× ${x.item_name}`).join(' · ')||'Ver detalle del pedido'}</Text></View><Text style={s.price}>{money(Number(order.subtotal||0)+Number(order.delivery_cost||0))}</Text></View>
    <View style={s.bottom}><View style={s.mode}><Ionicons name={order.is_delivery?'bicycle-outline':'bag-handle-outline'} size={15} color={colors.brown}/><Text style={s.modeText}>{order.is_delivery?'Delivery':'Recogida'}</Text></View><Pressable onPress={e=>{e.stopPropagation();onReorder();}} style={s.reorder}><Ionicons name="repeat" size={15} color={colors.brown}/><Text style={s.reorderText}>Volver a pedir</Text></Pressable><View style={s.detail}><Text style={s.detailText}>Ver detalle</Text><Ionicons name="chevron-forward" size={16} color={colors.brown}/></View></View>
  </Pressable>;
}

const s=StyleSheet.create({
  empty:{alignItems:'center',paddingVertical:65,paddingHorizontal:25},emptyTitle:{fontSize:20,fontWeight:'900',color:colors.text,marginTop:15,textAlign:'center'},emptyBody:{fontSize:13,lineHeight:19,color:colors.muted,textAlign:'center',marginTop:7},button:{marginTop:16,backgroundColor:colors.yellow,borderRadius:14,paddingHorizontal:22,paddingVertical:12},buttonText:{fontSize:13,fontWeight:'900',color:colors.brown},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},title:{fontSize:27,fontWeight:'900',color:colors.text},subtitle:{fontSize:14,color:colors.muted,marginTop:3},refresh:{width:42,height:42,borderRadius:14,backgroundColor:'white',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},sectionKicker:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:colors.orange,marginBottom:8},
  card:{backgroundColor:'white',borderRadius:21,padding:15,marginBottom:12,borderWidth:1,borderColor:colors.border},activeCard:{borderColor:'#EAC96A',...shadow},top:{flexDirection:'row',alignItems:'flex-start',gap:8},number:{fontSize:17,fontWeight:'900',color:colors.text},date:{fontSize:10,color:colors.muted,marginTop:4},badge:{borderRadius:11,backgroundColor:colors.yellowSoft,paddingHorizontal:9,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:5,maxWidth:125},cancelBadge:{backgroundColor:'#FFF0F0'},statusDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.green},badgeText:{fontSize:9,fontWeight:'900',color:colors.brown,flexShrink:1},eta:{fontSize:15,fontWeight:'900',color:colors.brown,marginTop:16},timeline:{flexDirection:'row',marginTop:14,marginBottom:14},stage:{flex:1,alignItems:'center',position:'relative'},stageIcon:{width:30,height:30,borderRadius:15,backgroundColor:'#EEE7E2',alignItems:'center',justifyContent:'center',zIndex:2},stageDone:{backgroundColor:colors.green},stageCurrent:{borderWidth:3,borderColor:'#BFE3CB'},stageLine:{position:'absolute',height:3,left:'50%',right:'-50%',top:14,backgroundColor:'#E6DDD8',zIndex:1},stageLineDone:{backgroundColor:colors.green},stageLabel:{fontSize:7.5,color:colors.muted,marginTop:6,textAlign:'center'},stageLabelCurrent:{color:colors.brown,fontWeight:'900'},
  products:{flexDirection:'row',alignItems:'center',gap:8},thumb:{width:42,height:42,borderRadius:12,backgroundColor:colors.cream,alignItems:'center',justifyContent:'center',overflow:'hidden'},thumbImage:{width:'100%',height:'100%'},productSummary:{fontSize:12,fontWeight:'900',color:colors.text},productNames:{fontSize:9,color:colors.muted,marginTop:3},price:{fontSize:14,fontWeight:'900',color:colors.brown,marginLeft:8},bottom:{borderTopWidth:1,borderTopColor:colors.border,marginTop:13,paddingTop:12,flexDirection:'row',alignItems:'center',gap:9},mode:{flexDirection:'row',alignItems:'center',gap:4},modeText:{fontSize:10,fontWeight:'800',color:colors.brown},reorder:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:colors.yellowSoft,borderRadius:9,paddingHorizontal:8,paddingVertical:7},reorderText:{fontSize:9,fontWeight:'900',color:colors.brown},detail:{marginLeft:'auto',flexDirection:'row',alignItems:'center'},detailText:{fontSize:10,fontWeight:'900',color:colors.brown}
});
