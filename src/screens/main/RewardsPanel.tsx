import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { redeemLoyaltyReward } from '@/features/customer/api';
import { confirmSheet } from '@/shared/components/ConfirmSheet';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { colors, font, shadow } from '@/shared/theme';
import { money } from './helpers';

export function RewardsPanel({ session, loyalty, program, onLogin, onChanged }: { session: boolean; loyalty?: any; program: any; onLogin: () => void; onChanged: () => void }) {
  const [redeeming, setRedeeming] = useState<number | null>(null); const ratio = Number(program.currency_amount_per_point || 100); const rewards = program.rewards ?? [];
  if (!session) return <View style={s.rewardsEmpty}><View style={s.rewardsGift}><Ionicons name="gift" size={38} color={colors.brown} /></View><Text style={s.bigTitle}>Convierte tus pedidos en premios</Text><Text style={s.mutedBody}>Inicia sesión para acumular 1 punto por cada {money(ratio)} y ver tus recompensas.</Text><Pressable onPress={onLogin} style={s.primary}><Text style={s.primaryText}>Iniciar sesión</Text></Pressable></View>;
  const balance = Number(loyalty?.balance ?? 0); const goal = Number(rewards[0]?.points_cost ?? 50); const progress = Math.min(1, balance / goal);
  const redeem = async (r: any) => { try { setRedeeming(r.id); const x = await redeemLoyaltyReward(r.id); haptics.success(); confirmSheet({ title: '¡Premio canjeado!', message: `Tu código es ${x.code}. Válido hasta ${new Date(x.expires_at).toLocaleDateString('es-DO')}.`, icon: 'gift', confirmText: 'Entendido', cancelText: null }); onChanged(); } catch (e: any) { haptics.error(); toast(e?.response?.data?.message || 'No pudimos canjearlo. Intenta nuevamente.', 'error'); } finally { setRedeeming(null); } };
  return <View><Text style={s.title}>Tus recompensas</Text><Text style={s.subtitle}>Cada pedido te acerca a algo delicioso.</Text>
    <LinearGradient colors={[colors.brownDark, colors.brown]} style={s.rewardsCard}><Text style={s.rewardsLabel}>PUNTOS DISPONIBLES</Text><Text style={s.rewardsBalance}>{balance}</Text><Text style={s.rewardsCaption}>1 punto por cada {money(ratio)} en pedidos</Text><View style={s.rewardsProgress}><View style={[s.rewardsProgressFill, { width: `${progress * 100}%` }]} /></View><Text style={s.rewardsNext}>{balance >= goal ? '¡Ya puedes canjear una recompensa!' : `Te faltan ${Math.max(0, goal - balance)} puntos para tu próxima recompensa`}</Text></LinearGradient>
    <Text style={s.sectionTitle}>Premios disponibles</Text>{rewards.map((r: any) => <View key={r.id} style={s.rewardMovement}><View style={s.rewardMovementIcon}><Ionicons name="gift" size={18} color={colors.orange} /></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{r.name}</Text><Text style={s.itemSub}>{r.description}{r.terms ? ` · ${r.terms}` : ''}</Text></View><Pressable disabled={balance < r.points_cost || redeeming === r.id} onPress={() => redeem(r)} style={[s.redeemCta, (balance < r.points_cost || redeeming === r.id) && { opacity: .45 }]}><Text style={s.redeemCtaText}>{redeeming === r.id ? '...' : `${r.points_cost} pts`}</Text></Pressable></View>)}
    {!!loyalty?.redemptions?.length && <><Text style={s.sectionTitle}>Mis códigos</Text>{loyalty.redemptions.map((r: any) => <View key={r.id} style={s.rewardMovement}><View style={{ flex: 1 }}><Text style={s.itemTitle}>{r.reward_name}</Text><Text style={s.itemSub}>Vence {new Date(r.expires_at).toLocaleDateString('es-DO')}</Text></View><Text style={s.rewardPoints}>{r.code}</Text></View>)}</>}
    <Text style={s.sectionTitle}>Actividad reciente</Text>{(loyalty?.movements ?? []).length ? loyalty.movements.map((item: any) => <View key={item.id} style={s.rewardMovement}><View style={s.rewardMovementIcon}><Ionicons name={item.points >= 0 ? 'add' : 'remove'} size={18} color={item.points >= 0 ? colors.green : colors.red} /></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{item.description || 'Movimiento de puntos'}</Text><Text style={s.itemSub}>{new Date(item.created_at).toLocaleDateString('es-DO')}</Text></View><Text style={[s.rewardPoints, { color: item.points >= 0 ? colors.green : colors.red }]}>{item.points >= 0 ? '+' : ''}{item.points}</Text></View>) : <EmptyState icon="sparkles-outline" title="Aún no tienes movimientos" body="Tus puntos aparecerán después de tu próximo pedido." />}
    {!!program.terms && <><Text style={s.sectionTitle}>Reglas y términos</Text><Text style={s.mutedBody}>{program.terms}</Text></>}
  </View>;
}

const s = StyleSheet.create({
  title: { fontSize: 32, fontFamily: font.display, letterSpacing: 0.4, color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  bigTitle: { fontSize: 34, lineHeight: 38, fontFamily: font.display, letterSpacing: 0.4, color: colors.text, textAlign: 'center', marginTop: 8 },
  mutedBody: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center', marginTop: 7 },
  primary: { width: '100%', height: 54, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  primaryText: { fontSize: 15, fontFamily: font.black, color: colors.brown },
  sectionTitle: { fontSize: 17, fontFamily: font.black, color: colors.text, marginTop: 22, marginBottom: 8 },
  itemTitle: { fontSize: 13, fontFamily: font.black, color: colors.text },
  itemSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  redeemCta: { alignSelf: 'flex-start', backgroundColor: colors.yellow, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  redeemCtaText: { fontSize: 12, fontFamily: font.black, color: colors.brown },
  rewardsEmpty: { alignItems: 'center', paddingTop: 48 },
  rewardsGift: { width: 78, height: 78, borderRadius: 26, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  rewardsCard: { borderRadius: 24, padding: 22, marginTop: 22, ...shadow },
  rewardsLabel: { fontSize: 10, fontFamily: font.black, letterSpacing: 1.4, color: colors.yellow },
  rewardsBalance: { fontSize: 62, fontFamily: font.display, letterSpacing: 1, color: 'white', marginTop: 3 },
  rewardsCaption: { fontSize: 12, color: '#E7D2CD' },
  rewardsProgress: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.18)', marginTop: 20, overflow: 'hidden' },
  rewardsProgressFill: { height: '100%', backgroundColor: colors.yellow, borderRadius: 4 },
  rewardsNext: { fontSize: 11, fontFamily: font.extraBold, color: 'white', marginTop: 9 },
  rewardMovement: { backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  rewardMovementIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  rewardPoints: { fontSize: 15, fontFamily: font.black },
});
