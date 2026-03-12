import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { handleAuthAction } from "../auth/authHandlers";

export default function LoginScreen({
  navigation,
  supabase,
  loginGradientColors,
  loginStyles,
  palette,
  theme,
  GoldButton,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState(null);
  const [verificationDialogVisible, setVerificationDialogVisible] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleForgotPasswordPress = useCallback(() => {
    navigation.navigate("ForgotPassword");
  }, [navigation]);

  const handleAuth = async (type) => {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Please enter both email and password.");
      return;
    }
    setSubmitting(true);
    setMode(type);
    try {
      await handleAuthAction({ type, email, password, supabase });
      if (type !== "login") {
        setPendingEmail(email.trim());
        setVerificationDialogVisible(true);
      }
    } catch (error) {
      Alert.alert(
        type === "login" ? "Login failed" : "Sign up failed",
        error?.message || "Please try again."
      );
    } finally {
      setSubmitting(false);
      setMode(null);
    }
  };

  const handleCloseVerificationDialog = useCallback(() => {
    setVerificationDialogVisible(false);
  }, []);

  return (
    <>
      <LinearGradient
        colors={loginGradientColors}
        style={loginStyles.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={loginStyles.container}
              keyboardShouldPersistTaps="handled"
            >
              <View style={loginStyles.card}>
                <View style={loginStyles.titleRow}>
                  <Ionicons name="sparkles-outline" size={28} color={palette.goldDeep} />
                  <Text style={loginStyles.title}>Welcome Back</Text>
                </View>
                <Text style={loginStyles.subtitle}>
                  Sign in or create an account to continue your journey with the I Ching.
                </Text>

                <Text style={loginStyles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={palette.inkMuted}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={loginStyles.input}
                />

                <Text style={loginStyles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter a secure password"
                  placeholderTextColor={palette.inkMuted}
                  secureTextEntry
                  textContentType="password"
                  style={loginStyles.input}
                />

                <Text style={loginStyles.helperText}>
                  Use the credentials associated with your Supabase profile.
                </Text>

                <Pressable onPress={handleForgotPasswordPress} style={{ marginBottom: theme.space(1.5) }}>
                  <Text style={[loginStyles.helperText, { color: palette.goldDeep }]}>Forgot Password?</Text>
                </Pressable>

                <View style={loginStyles.buttonRow}>
                  <Pressable
                    style={[loginStyles.button, loginStyles.buttonPrimary]}
                    onPress={() => handleAuth("login")}
                    disabled={submitting}
                  >
                    {submitting && mode === "login" ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <Text style={loginStyles.buttonTextPrimary}>Login</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[loginStyles.button, loginStyles.buttonSecondary]}
                    onPress={() => handleAuth("signup")}
                    disabled={submitting}
                  >
                    {submitting && mode === "signup" ? (
                      <ActivityIndicator color={palette.gold} />
                    ) : (
                      <Text style={loginStyles.buttonTextSecondary}>Sign Up</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal
        transparent
        visible={verificationDialogVisible}
        animationType="fade"
        onRequestClose={handleCloseVerificationDialog}
      >
        <View style={loginStyles.modalBackdrop}>
          <View style={loginStyles.modalCard}>
            <Text style={loginStyles.modalTitle}>Verify your email</Text>
            <Text style={loginStyles.modalMessage}>
              We have sent a verification link to {pendingEmail || "your inbox"}. Please check your
              email and confirm your account before signing in.
            </Text>
            <GoldButton onPress={handleCloseVerificationDialog}>Got it</GoldButton>
          </View>
        </View>
      </Modal>
    </>
  );
}
