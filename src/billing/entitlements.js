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
    ios:
      readEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY") ||
      readEnv("REVENUECAT_IOS_API_KEY") ||
      readEnv("REVENUECAT_API_KEY_IOS") ||
      "", // TODO: Set RevenueCat iOS public SDK key.
    android:
      readEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY") ||
      readEnv("REVENUECAT_ANDROID_API_KEY") ||
      readEnv("REVENUECAT_API_KEY_ANDROID") ||
      "", // TODO: Set RevenueCat Android public SDK key.
  },
  entitlementIds: {
    core: readEnv("EXPO_PUBLIC_RC_CORE_ENTITLEMENT_ID") || "core", // TODO: Confirm RevenueCat core entitlement ID (if used).
    premium: readEnv("EXPO_PUBLIC_RC_PREMIUM_ENTITLEMENT_ID") || "premium", // TODO: Confirm RevenueCat premium entitlement ID.
  },
  packageIds: {
    core: readEnv("EXPO_PUBLIC_RC_CORE_PACKAGE_ID") || "core_lifetime", // TODO: Confirm RevenueCat core package ID (if offered in-app).
    premium: readEnv("EXPO_PUBLIC_RC_PREMIUM_PACKAGE_ID") || "premium_monthly", // TODO: Confirm RevenueCat premium package ID.
  },
  offeringId: readEnv("EXPO_PUBLIC_RC_OFFERING_ID") || "default", // TODO: Confirm RevenueCat offering ID.
  subscriptionProductIds: {
    premiumMonthly:
      readEnv("EXPO_PUBLIC_RC_PREMIUM_MONTHLY_PRODUCT_ID") ||
      "", // TODO: Set Google Play premium monthly product ID.
    premiumAnnual:
      readEnv("EXPO_PUBLIC_RC_PREMIUM_ANNUAL_PRODUCT_ID") ||
      "", // TODO: Set Google Play premium annual product ID (if applicable).
  },
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

export const hasEntitlement = (customerInfo, entitlementId) => {
  if (!entitlementId) return false;
  return Boolean(customerInfo?.entitlements?.active?.[entitlementId]);
};

export const hasPremiumAccess = (customerInfo) =>
  hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlementIds.premium);

export const hasCoreEntitlement = (customerInfo) =>
  hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlementIds.core);

export const canUsePremiumFeatures = ({ customerInfo, isPremiumFromProfile = false }) =>
  Boolean(isPremiumFromProfile || hasPremiumAccess(customerInfo));

export const canUseAIFeatures = ({ customerInfo, isPremiumFromProfile = false }) =>
  canUsePremiumFeatures({ customerInfo, isPremiumFromProfile });
