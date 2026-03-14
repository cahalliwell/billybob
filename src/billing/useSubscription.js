import { useCallback, useContext, useMemo } from "react";
import { RevenueCatContext, notifyPurchaseOutcome } from "./revenuecat";
import { canUseAIFeatures, canUsePremiumFeatures, REVENUECAT_CONFIG } from "./entitlements";

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}

export function usePremiumPurchaseFlow(successTitle, successMessage) {
  const { packages, purchasePackage } = useRevenueCat();
  return useCallback(async () => {
    const outcome = await purchasePackage(packages?.premium || REVENUECAT_CONFIG.packageId);
    notifyPurchaseOutcome(outcome, { successTitle, successMessage });
    return outcome;
  }, [packages?.premium, purchasePackage, successTitle, successMessage]);
}

export function useSubscriptionAccess() {
  const { customerInfo, premiumActive } = useRevenueCat();

  return useMemo(
    () => ({
      hasPremiumAccess: Boolean(canUsePremiumFeatures({ customerInfo })),
      canUsePremiumFeatures: Boolean(canUsePremiumFeatures({ customerInfo })),
      canUseAIFeatures: Boolean(canUseAIFeatures({ customerInfo })),
      premiumActive,
    }),
    [customerInfo, premiumActive]
  );
}
