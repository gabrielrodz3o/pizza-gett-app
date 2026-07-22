import NetInfo,{useNetInfo} from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StyleSheet,Text,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function bindOnlineManager(){return NetInfo.addEventListener(state=>onlineManager.setOnline(state.isConnected!==false&&state.isInternetReachable!==false));}
export function ConnectivityBanner(){const network=useNetInfo();const offline=network.isConnected===false||network.isInternetReachable===false;if(!offline)return null;return <View style={s.banner}><Ionicons name="cloud-offline" size={16} color="white"/><Text style={s.text}>Sin conexión · Mostrando información guardada</Text></View>}
const s=StyleSheet.create({banner:{position:'absolute',left:12,right:12,top:54,zIndex:9999,minHeight:38,borderRadius:12,backgroundColor:'#8F2D25',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:12},text:{fontSize:11,fontWeight:'900',color:'white'}});
