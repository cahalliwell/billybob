import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import { ForgotPasswordScreen, ResetPasswordScreen } from "../screens/PasswordRecoveryScreens";

const AuthStack = createNativeStackNavigator();

export const linkingConfig = {
  prefixes: ["ichinginsightsai://"],
  config: {
    screens: {
      ResetPassword: "auth/reset",
    },
  },
};

export default function AuthStackScreen({
  passwordResetRequested = false,
  completePasswordResetFlow,
  supabase,
  loginGradientColors,
  loginStyles,
  palette,
  theme,
  GoldButton,
}) {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={passwordResetRequested ? "ResetPassword" : "Login"}
    >
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            supabase={supabase}
            loginGradientColors={loginGradientColors}
            loginStyles={loginStyles}
            palette={palette}
            theme={theme}
            GoldButton={GoldButton}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword">
        {(props) => (
          <ForgotPasswordScreen
            {...props}
            supabase={supabase}
            loginGradientColors={loginGradientColors}
            loginStyles={loginStyles}
            palette={palette}
            theme={theme}
            GoldButton={GoldButton}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="ResetPassword">
        {(props) => (
          <ResetPasswordScreen
            {...props}
            supabase={supabase}
            completePasswordResetFlow={completePasswordResetFlow}
            loginGradientColors={loginGradientColors}
            loginStyles={loginStyles}
            palette={palette}
            theme={theme}
            GoldButton={GoldButton}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}
