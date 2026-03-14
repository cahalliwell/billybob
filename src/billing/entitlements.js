import { Platform } from "react-native";

const readEnv = (key) => {
  try {
    if (typeof process !== "undefined" && process?.env && process.env[key] != null) {
      return process.env[key];
    }
  } catch (error) {
    console.log("Environment read error:", error?.message || error);
  }
  return undefined;
};

export const REVENUECAT_CONFIG = {
  apiKeys: {
    ios: readEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY") || "",
    android: readEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY") || "",
  },
  entitlementId: "premium",
  offeringId: "Default",
  packageId: "$rc_monthly",
  subscriptionProductId: "premium_monthly",
};

export const getRevenueCatApiKey = () => {
  const platformKey = Platform.select({
    ios: REVENUECAT_CONFIG.apiKeys.ios,
    android: REVENUECAT_CONFIG.apiKeys.android,
    default: REVENUECAT_CONFIG.apiKeys.android || REVENUECAT_CONFIG.apiKeys.ios,
  });
  return platformKey && platformKey.trim() ? platformKey.trim() : null;
};

export const getActiveEntitlementIds = (customerInfo) => {
  const active = customerInfo?.entitlements?.active || {};
  return Object.keys(active);
};

export const hasPremiumAccess = (customerInfo) =>
  Boolean(customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]);

export const canUsePremiumFeatures = ({ customerInfo }) => Boolean(hasPremiumAccess(customerInfo));

export const canUseAIFeatures = ({ customerInfo }) => Boolean(hasPremiumAccess(customerInfo));
