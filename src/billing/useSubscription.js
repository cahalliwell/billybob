import { useCallback, useContext, useMemo } from "react";
import { RevenueCatContext, notifyPurchaseOutcome } from "./revenuecat";
import {
  canUseAIFeatures,
  canUsePremiumFeatures,
  REVENUECAT_CONFIG,
} from "./entitlements";

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}

export function usePremiumPurchaseFlow(successTitle, successMessage) {
  const { packages, purchasePackage } = useRevenueCat();
  return useCallback(async () => {
    const outcome = await purchasePackage(packages?.premium || REVENUECAT_CONFIG.packageIds.premium);
    notifyPurchaseOutcome(outcome, { successTitle, successMessage });
    return outcome;
  }, [packages?.premium, purchasePackage, successTitle, successMessage]);
}

export function useSubscriptionAccess(isPremiumFromProfile = false) {
  const { customerInfo, premiumActive } = useRevenueCat();

  return useMemo(
    () => ({
      hasPremiumAccess: Boolean(canUsePremiumFeatures({ customerInfo, isPremiumFromProfile })),
      canUsePremiumFeatures: Boolean(canUsePremiumFeatures({ customerInfo, isPremiumFromProfile })),
      canUseAIFeatures: Boolean(canUseAIFeatures({ customerInfo, isPremiumFromProfile })),
      premiumActive,
    }),
    [customerInfo, isPremiumFromProfile, premiumActive]
  );
}
