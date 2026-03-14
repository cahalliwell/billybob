import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  getActiveEntitlementIds,
  getRevenueCatApiKey,
  hasPremiumAccess,
  REVENUECAT_CONFIG,
} from "./entitlements";

let Purchases = null;
let PurchasesLogLevel = null;

const getGlobalObject = () => {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof global !== "undefined") return global;
  if (typeof window !== "undefined") return window;
  if (typeof self !== "undefined") return self;
  return {};
};

const globalRef = getGlobalObject();

const attachRevenueCatModule = (maybeModule) => {
  if (!maybeModule) return null;
  const resolved = maybeModule?.default || maybeModule;
  if (!resolved) return null;
  if (Purchases === resolved) return resolved;
  Purchases = resolved;
  PurchasesLogLevel =
    resolved?.LOG_LEVEL || resolved?.LogLevel || resolved?.LOG_LEVELS || PurchasesLogLevel;
  return resolved;
};

const resolveRevenueCatModule = () => {
  const candidates = [
    globalRef?.RevenueCatPurchases,
    globalRef?.RevenueCat?.Purchases,
    globalRef?.RevenueCat?.PurchasesModule,
    globalRef?.ExpoModules?.RevenueCatPurchases,
    globalRef?.ExpoModules?.RevenueCatPurchasesModule,
    globalRef?.ExpoModulesProxy?.RevenueCatPurchases,
    globalRef?.NativeModules?.RevenueCatPurchases,
    globalRef?.expo?.modulesProxy?.RevenueCatPurchases,
  ];

  for (const candidate of candidates) {
    const resolved = candidate?.default || candidate;
    if (resolved && (resolved.configure || resolved.purchasePackage || resolved.purchaseProduct)) {
      return resolved;
    }
  }

  return null;
};

attachRevenueCatModule(resolveRevenueCatModule());

if (globalRef && !globalRef.__setRevenueCatPurchasesModule) {
  Object.defineProperty(globalRef, "__setRevenueCatPurchasesModule", {
    value: (moduleCandidate) => attachRevenueCatModule(moduleCandidate),
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

if (!Purchases) {
  console.log("RevenueCat SDK unavailable: purchases features are disabled by default.");
}

const getPreferredOffering = (offerings) => {
  if (!offerings) return null;
  return offerings?.all?.[REVENUECAT_CONFIG.offeringId] || offerings?.current || null;
};

const resolveRevenueCatPackage = (packageOrId, offerings) => {
  if (!packageOrId || !offerings) return null;
  if (packageOrId?.identifier && packageOrId?.product) return packageOrId;

  const identifier =
    typeof packageOrId === "string"
      ? packageOrId
      : packageOrId?.identifier || packageOrId?.packageIdentifier || packageOrId?.product?.identifier;
  if (!identifier) return null;

  const preferredOffering = getPreferredOffering(offerings);
  const preferredPackages = preferredOffering?.availablePackages || [];
  const preferredMatch = preferredPackages.find((pkg) => {
    const identifiers = [pkg?.identifier, pkg?.packageIdentifier, pkg?.product?.identifier].filter(Boolean);
    return identifiers.includes(identifier);
  });
  if (preferredMatch) return preferredMatch;

  const allOfferings = offerings?.all || {};
  for (const offering of Object.values(allOfferings)) {
    const packages = offering?.availablePackages || [];
    const match = packages.find((pkg) => {
      const identifiers = [pkg?.identifier, pkg?.packageIdentifier, pkg?.product?.identifier].filter(Boolean);
      return identifiers.includes(identifier);
    });
    if (match) return match;
  }

  return null;
};

const shouldTreatAsCancellation = (error) => {
  if (!error) return false;
  const code = error?.code;
  const message = String(error?.message || "").toLowerCase();
  return (
    Boolean(error?.userCancelled) ||
    code === "PURCHASE_CANCELLED" ||
    code === "USER_CANCELLED" ||
    code === "CANCELLED_PURCHASE" ||
    message.includes("cancel")
  );
};

export const notifyPurchaseOutcome = (outcome, messages = {}) => {
  if (!outcome) return;
  if (outcome.success) {
    Alert.alert(
      messages.successTitle || "Premium unlocked",
      messages.successMessage || "Your Premium access is now active across all devices."
    );
  } else if (outcome.error && !outcome.cancelled) {
    Alert.alert(
      messages.errorTitle || "Purchase not completed",
      outcome.error?.message || messages.errorMessage || "Please try again."
    );
  }
};

export const notifyRestoreOutcome = (outcome) => {
  if (!outcome) return;
  if (outcome.success) {
    Alert.alert("Purchases restored", "Your active purchases are now synced on this device.");
  } else if (outcome.error) {
    Alert.alert("Restore failed", outcome.error?.message || "Please try again.");
  }
};

export const defaultRevenueCatState = {
  ready: false,
  loading: false,
  activeAction: null,
  activeTargetId: null,
  offerings: null,
  packages: { premium: null },
  premiumPriceString: "",
  purchasePackage: async () => ({ success: false, error: new Error("Purchases unavailable") }),
  restorePurchases: async () => ({ success: false, error: new Error("Purchases unavailable") }),
  refreshOfferings: async () => null,
  premiumActive: false,
  activeEntitlementIds: [],
  customerInfo: null,
  lastError: null,
};

export const RevenueCatContext = createContext(defaultRevenueCatState);

export function useRevenueCatController(appUserID, authReady) {
  const [isConfigured, setConfigured] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [busyState, setBusyState] = useState({ busy: false, action: null, targetId: null });
  const configureKeyRef = useRef(null);
  const configuringRef = useRef(false);
  const currentUserRef = useRef(null);
  const revenueCatApiKey = useMemo(() => getRevenueCatApiKey(), []);

  useEffect(() => {
    if (!Purchases) return;

    if (!revenueCatApiKey) {
      const error = new Error(
        "RevenueCat API key missing. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (and EXPO_PUBLIC_REVENUECAT_IOS_KEY for iOS)."
      );
      setConfigured(false);
      setLastError(error);
      console.log("[RevenueCat] Configuration skipped: missing public SDK key.");
      return;
    }

    if (configureKeyRef.current === revenueCatApiKey || configuringRef.current) return;

    configuringRef.current = true;
    let cancelled = false;

    const configure = async () => {
      try {
        if (Purchases.setLogLevel && PurchasesLogLevel?.WARN != null) {
          Purchases.setLogLevel(PurchasesLogLevel.WARN);
        }

        await Purchases.configure({ apiKey: revenueCatApiKey });
        if (cancelled) return;

        configureKeyRef.current = revenueCatApiKey;
        setConfigured(true);
        setLastError(null);
        console.log("[RevenueCat] Configured successfully.");

        const info = await Purchases.getCustomerInfo();
        if (!cancelled && info) {
          setCustomerInfo(info);
        }

        const nextOfferings = await Purchases.getOfferings();
        if (!cancelled) {
          setOfferings(nextOfferings);
          const packageCount =
            nextOfferings?.all?.[REVENUECAT_CONFIG.offeringId]?.availablePackages?.length || 0;
          console.log("[RevenueCat] Offerings loaded:", packageCount > 0);
        }
      } catch (error) {
        console.log("RevenueCat configure error:", error?.message || error);
        if (!cancelled) {
          configureKeyRef.current = null;
          setConfigured(false);
          setLastError(error);
        }
      } finally {
        configuringRef.current = false;
      }
    };

    configure();

    const listener = Purchases.addCustomerInfoUpdateListener?.((info) => {
      setCustomerInfo(info);
    });

    return () => {
      cancelled = true;
      if (listener?.remove) {
        listener.remove();
      } else if (typeof listener === "function") {
        listener();
      }
    };
  }, [revenueCatApiKey]);

  useEffect(() => {
    if (!Purchases || !isConfigured || !authReady) return;
    if (appUserID && currentUserRef.current === appUserID) return;
    if (!appUserID && !currentUserRef.current) return;

    let cancelled = false;

    const syncIdentity = async () => {
      try {
        if (appUserID) {
          const result = await Purchases.logIn(appUserID);
          if (cancelled) return;
          currentUserRef.current = appUserID;
          const info = result?.customerInfo || result;
          if (info) setCustomerInfo(info);
        } else {
          const info = await Purchases.logOut();
          if (cancelled) return;
          currentUserRef.current = null;
          setCustomerInfo(info);
        }
        setLastError(null);
      } catch (error) {
        console.log("RevenueCat identity sync error:", error?.message || error);
        if (!cancelled) setLastError(error);
      }
    };

    syncIdentity();

    return () => {
      cancelled = true;
    };
  }, [appUserID, authReady, isConfigured]);

  const refreshOfferings = useCallback(async () => {
    if (!Purchases || !isConfigured) return null;
    try {
      const nextOfferings = await Purchases.getOfferings();
      setOfferings(nextOfferings);
      setLastError(null);
      const packageCount = nextOfferings?.all?.[REVENUECAT_CONFIG.offeringId]?.availablePackages?.length || 0;
      console.log("[RevenueCat] Offerings loaded:", packageCount > 0);
      return nextOfferings;
    } catch (error) {
      console.log("RevenueCat offerings error:", error?.message || error);
      setLastError(error);
      throw error;
    }
  }, [isConfigured]);

  const purchasePackage = useCallback(
    async (target) => {
      if (!Purchases || !isConfigured) {
        const error = new Error("Purchases not ready. Please try again shortly.");
        setLastError(error);
        return { success: false, error };
      }

      let availableOfferings = offerings;
      if (!availableOfferings) {
        try {
          availableOfferings = await Purchases.getOfferings();
          setOfferings(availableOfferings);
        } catch (offeringsError) {
          console.log(
            "RevenueCat offerings fetch during purchase error:",
            offeringsError?.message || offeringsError
          );
        }
      }

      const resolved = resolveRevenueCatPackage(target, availableOfferings);
      const fallbackId = typeof target === "string" ? target : null;
      const targetId =
        resolved?.identifier || resolved?.packageIdentifier || resolved?.product?.identifier || fallbackId;

      if (!resolved) {
        const error = new Error("Purchase options are unavailable. Please refresh and try again.");
        setLastError(error);
        return { success: false, error };
      }

      setBusyState({ busy: true, action: "purchase", targetId });
      try {
        const result = await Purchases.purchasePackage(resolved);
        const info = result?.customerInfo || result;
        if (info) setCustomerInfo(info);
        setLastError(null);
        return { success: true, result };
      } catch (error) {
        if (shouldTreatAsCancellation(error)) {
          return { success: false, cancelled: true };
        }
        console.log("RevenueCat purchase error:", error?.message || error);
        setLastError(error);
        return { success: false, error };
      } finally {
        setBusyState({ busy: false, action: null, targetId: null });
      }
    },
    [isConfigured, offerings]
  );

  const restorePurchases = useCallback(async () => {
    if (!Purchases || !isConfigured) {
      const error = new Error("Restore unavailable. Please try again later.");
      setLastError(error);
      return { success: false, error };
    }

    setBusyState({ busy: true, action: "restore", targetId: null });
    try {
      const restoredInfo = await Purchases.restorePurchases();
      const latestInfo = (await Purchases.getCustomerInfo?.()) || restoredInfo;
      if (latestInfo) setCustomerInfo(latestInfo);
      setLastError(null);
      return { success: true, result: latestInfo || restoredInfo };
    } catch (error) {
      console.log("RevenueCat restore error:", error?.message || error);
      setLastError(error);
      return { success: false, error };
    } finally {
      setBusyState({ busy: false, action: null, targetId: null });
    }
  }, [isConfigured]);

  const activeEntitlementIds = useMemo(() => getActiveEntitlementIds(customerInfo), [customerInfo]);

  const premiumPackage = useMemo(
    () => resolveRevenueCatPackage(REVENUECAT_CONFIG.packageId, offerings),
    [offerings]
  );

  useEffect(() => {
    console.log("[RevenueCat] Premium entitlement active:", hasPremiumAccess(customerInfo));
  }, [customerInfo]);

  return useMemo(
    () => ({
      ready: isConfigured,
      loading: busyState.busy,
      activeAction: busyState.action,
      activeTargetId: busyState.targetId,
      offerings,
      packages: { premium: premiumPackage },
      premiumPriceString: premiumPackage?.product?.priceString || "",
      purchasePackage,
      restorePurchases,
      refreshOfferings,
      premiumActive: hasPremiumAccess(customerInfo),
      activeEntitlementIds,
      customerInfo,
      lastError,
    }),
    [
      isConfigured,
      busyState.busy,
      busyState.action,
      busyState.targetId,
      offerings,
      premiumPackage,
      purchasePackage,
      restorePurchases,
      refreshOfferings,
      activeEntitlementIds,
      customerInfo,
      lastError,
    ]
  );
}
