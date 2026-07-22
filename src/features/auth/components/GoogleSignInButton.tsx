import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { confirmSheet } from '@/shared/components/ConfirmSheet';
import { colors, font } from '@/shared/theme';

WebBrowser.maybeCompleteAuthSession();

const ids = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

const activeClientId = ids[Platform.OS as keyof typeof ids] || ids.web || ids.ios || ids.android;
export const googleSignInConfigured = Boolean(activeClientId);

function ConfiguredGoogleButton({ onToken, onError }: { onToken: (idToken: string) => void; onError: () => void }) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest({
    iosClientId: ids.ios,
    androidClientId: ids.android,
    webClientId: ids.web,
    clientId: activeClientId,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params?.id_token) {
      onToken(response.params.id_token);
    } else if (response.type !== 'dismiss' && response.type !== 'cancel') {
      onError();
    }
  }, [response, onToken, onError]);

  return (
    <Pressable disabled={!request} onPress={() => prompt()} style={s.button}>
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={s.text}>Continuar con Google</Text>
    </Pressable>
  );
}

function FallbackGoogleButton() {
  const handlePress = () => {
    confirmSheet({
      title: 'Google Client ID no configurado',
      message: 'Para habilitar el inicio de sesión con Google, debes colocar EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID en tu archivo .env',
      icon: 'logo-google',
      confirmText: 'Entendido',
      cancelText: null,
    });
  };

  return (
    <Pressable onPress={handlePress} style={[s.button, s.disabled]}>
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={s.text}>Continuar con Google</Text>
    </Pressable>
  );
}

export function GoogleSignInButton({ onToken, onError }: { onToken: (idToken: string) => void; onError: () => void }) {
  if (!googleSignInConfigured) {
    return <FallbackGoogleButton />;
  }
  return <ConfiguredGoogleButton onToken={onToken} onError={onError} />;
}

const s = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  disabled: {
    opacity: 0.8,
  },
  text: { fontSize: 15, fontFamily: font.extraBold, color: colors.text },
});
