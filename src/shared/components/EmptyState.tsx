import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/theme';
export function EmptyState({icon,title,body}:{icon:any;title:string;body?:string}){return <View style={s.empty}><View style={s.icon}><Ionicons name={icon} size={34} color={colors.brown}/></View><Text style={s.title}>{title}</Text>{body?<Text style={s.body}>{body}</Text>:null}</View>}
const s=StyleSheet.create({empty:{alignItems:'center',paddingVertical:65,paddingHorizontal:25},icon:{width:72,height:72,borderRadius:24,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},title:{fontSize:18,fontWeight:'900',color:colors.text,marginTop:15,textAlign:'center'},body:{fontSize:13,lineHeight:19,color:colors.muted,textAlign:'center',marginTop:7}})
