import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomerAuth } from '@/features/auth/store';
import { requestPhoneOtp, signInWithProviderToken, verifyPhoneOtp } from '@/features/customer/api';
import { colors } from '@/shared/theme';
import { GoogleSignInButton } from './GoogleSignInButton';

export function AuthDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  const signIn = useCustomerAuth((x) => x.signIn);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkToken, setLinkToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [maskedName, setMaskedName] = useState('');
  const nameRef = useRef<TextInput>(null);

  const phoneDigits = phone.replace(/\D/g, '');

  const google = useCallback(async (idToken: string) => {
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      const session = await signInWithProviderToken('google', idToken);
      if ('needsPhone' in session) {
        setLinkToken(session.linkToken);
        setError('Confirma tu teléfono para recuperar tus pedidos anteriores.');
        return;
      }
      await signIn(session);
      onClose();
    } catch {
      setError('No pudimos iniciar con Google.');
    } finally {
      setLoading(false);
    }
  }, [signIn, onClose]);

  const googleError = useCallback(() => setError('No pudimos iniciar con Google.'), []);

  const request = async () => {
    Keyboard.dismiss();
    if (phoneDigits.length < 10) return;
    setLoading(true);
    setError('');
    try {
      const result = await requestPhoneOtp(phone, linkToken || undefined);
      setChallenge(result.challenge_id);
      if (result.dev_code) setDevCode(result.dev_code);
      if (result.masked_name) setMaskedName(result.masked_name);
    } catch (e: any) {
      setError(e?.response?.data?.statusMessage || e?.response?.data?.message || 'No pudimos enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    Keyboard.dismiss();
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const session = await verifyPhoneOtp(challenge, code, name, linkToken || undefined);
      await signIn(session);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.statusMessage || e?.response?.data?.message || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
        {/* Header container */}
        <View style={s.modalHeader}>
          <Pressable onPress={onClose} style={s.close} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Tap outside inputs to dismiss keyboard */}
          <ScrollView
            style={s.flex}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={Keyboard.dismiss} style={s.dismiss}>
              <Text style={s.brand}>PIZZA GETTO</Text>
              <Text style={s.title}>
                {challenge
                  ? maskedName ? `¡Hola, ${maskedName}!` : 'Confirma tu número'
                  : 'Tus pedidos, siempre contigo'}
              </Text>
              <Text style={s.subtitle}>
                {challenge
                  ? maskedName
                    ? `Bienvenido de vuelta. Ingresa el código SMS enviado a ${phone} para confirmar tu cuenta.`
                    : `Escribe el código SMS enviado a ${phone}`
                  : 'Inicia sesión con tu teléfono (SMS) o Google para guardar direcciones y ver tu delivery.'}
              </Text>

              {!challenge ? (
                <>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Número de teléfono (ej. 8091234567)"
                    placeholderTextColor={colors.muted}
                    style={s.input}
                    returnKeyType="next"
                    onSubmitEditing={() => nameRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TextInput
                    ref={nameRef}
                    value={name}
                    onChangeText={setName}
                    placeholder="Tu nombre (si eres nuevo)"
                    placeholderTextColor={colors.muted}
                    style={s.input}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <Pressable
                    disabled={loading || phoneDigits.length < 10}
                    onPress={request}
                    style={[s.primary, (loading || phoneDigits.length < 10) && s.disabled]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.brown} />
                    ) : (
                      <Text style={s.primaryText}>Continuar con Teléfono (SMS)</Text>
                    )}
                  </Pressable>

                  <View style={s.or}>
                    <View style={s.line} />
                    <Text style={s.orText}>o continúa con</Text>
                    <View style={s.line} />
                  </View>

                  <GoogleSignInButton onToken={google} onError={googleError} />
                </>
              ) : (
                <>
                  {devCode ? (
                    <View style={s.devBanner}>
                      <Text style={s.devLabel}>🧪 Staging — código de prueba:</Text>
                      <Text style={s.devCode}>{devCode}</Text>
                    </View>
                  ) : null}
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor={colors.muted}
                    style={[s.input, s.otp]}
                    returnKeyType="done"
                    onSubmitEditing={verify}
                    autoFocus
                  />
                  <Pressable
                    disabled={loading || code.length !== 6}
                    onPress={verify}
                    style={[s.primary, (loading || code.length !== 6) && s.disabled]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.brown} />
                    ) : (
                      <Text style={s.primaryText}>Verificar Código SMS</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => { setChallenge(''); setCode(''); }}>
                    <Text style={s.change}>Cambiar número de teléfono</Text>
                  </Pressable>
                </>
              )}

              {error ? <Text style={s.error}>{error}</Text> : null}
              <Text style={s.legal}>Al continuar aceptas los términos y la política de privacidad de Pizza Getto.</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.cream },
  modalHeader: { height: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 10 },
  dismiss: { flex: 1 },
  close: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  brand: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: colors.orange },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 8, marginBottom: 22 },
  input: {
    height: 54, borderRadius: 16, backgroundColor: 'white',
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, fontSize: 15, color: colors.text, marginBottom: 10,
  },
  otp: { fontSize: 26, textAlign: 'center', letterSpacing: 10, fontWeight: '900' },
  primary: { height: 54, borderRadius: 16, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.5 },
  primaryText: { fontSize: 15, fontWeight: '900', color: colors.brown },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 11, color: colors.muted },
  change: { textAlign: 'center', color: colors.orange, fontWeight: '800', marginTop: 16 },
  error: { fontSize: 12, lineHeight: 18, color: colors.red, textAlign: 'center', marginTop: 14 },
  legal: { fontSize: 10, lineHeight: 14, color: colors.muted, textAlign: 'center', marginTop: 20 },
  devBanner: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FDE047' },
  devLabel: { fontSize: 11, color: '#713F12', fontWeight: '600', marginBottom: 2 },
  devCode: { fontSize: 30, fontWeight: '900', letterSpacing: 8, color: '#78350F' },
});
