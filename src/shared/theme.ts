// Marrón #481918 y amarillo #FFC100 extraídos del logo oficial (gettopizza.com).
export const colors = {
  brown: '#481918', brownDark: '#2F1010', yellow: '#FFC100', gold: '#FFC100', yellowSoft: '#FFF2CF',
  cream: '#F7F5F3', white: '#FFFFFF', text: '#241818', muted: '#766968', border: '#E9E1DC',
  green: '#2E9E5B', red: '#D83A3A', orange: '#F07A27',
};
export const font = {
  display: 'BebasNeue_400Regular',
  black: 'Montserrat_900Black',
  extraBold: 'Montserrat_800ExtraBold',
  bold: 'Montserrat_700Bold',
  semiBold: 'Montserrat_600SemiBold',
  medium: 'Montserrat_500Medium',
} as const;
export const shadow = { shadowColor: '#321313', shadowOpacity: 0.10, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 4 } as const;
