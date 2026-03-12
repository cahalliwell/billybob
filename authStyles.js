import { StyleSheet } from "react-native";

export function createAuthStyles({ theme, palette, fonts }) {
  const loginStyles = StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      padding: theme.space(2.5),
      justifyContent: "center",
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.space(2.5),
      shadowColor: palette.goldDeep,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.space(1.5),
    },
    title: {
      fontFamily: fonts.title,
      fontSize: 28,
      color: palette.ink,
      marginLeft: theme.space(1),
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: palette.inkMuted,
      lineHeight: 22,
      marginBottom: theme.space(2),
    },
    label: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: palette.ink,
      marginTop: theme.space(1.5),
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius,
      paddingHorizontal: theme.space(1.5),
      paddingVertical: theme.space(1),
      backgroundColor: palette.white,
      fontFamily: fonts.body,
      fontSize: 16,
      color: palette.ink,
    },
    helperText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.inkMuted,
      marginTop: theme.space(1),
    },
    buttonRow: {
      marginTop: theme.space(2.5),
      flexDirection: "row",
      justifyContent: "space-between",
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.space(1.25),
      borderRadius: theme.radius,
      borderWidth: 1,
      marginHorizontal: theme.space(0.5),
    },
    buttonPrimary: {
      backgroundColor: palette.gold,
      borderColor: palette.gold,
    },
    buttonSecondary: {
      backgroundColor: palette.white,
      borderColor: palette.gold,
    },
    buttonTextPrimary: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: palette.white,
    },
    buttonTextSecondary: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: palette.gold,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
      padding: theme.space(2),
    },
    modalCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.space(2.5),
      shadowColor: palette.goldDeep,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
      width: "100%",
      maxWidth: 420,
    },
    modalTitle: {
      fontFamily: fonts.title,
      fontSize: 22,
      color: palette.ink,
      marginBottom: theme.space(1),
    },
    modalMessage: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: palette.ink,
      lineHeight: 22,
    },
  });

  const loginGradientColors = [
    palette.parchmentA,
    palette.parchmentB,
    palette.parchmentGold,
  ];

  return {
    loginStyles,
    loginGradientColors,
  };
}
