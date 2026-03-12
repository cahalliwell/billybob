import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CommonActions,
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as MailComposer from "expo-mail-composer";
import {
  useFonts as useMarcellus,
  Marcellus_400Regular,
} from "@expo-google-fonts/marcellus";
import {
  useFonts as useLora,
  Lora_400Regular,
  Lora_600SemiBold,
} from "@expo-google-fonts/lora";
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect as SvgRect,
  Stop,
  Text as SvgText,
  Circle as SvgCircle,
} from "react-native-svg";
import { createClient } from "@supabase/supabase-js";
import LoginScreen from "./src/screens/LoginScreen";
import { createAuthStyles } from "./src/auth/authStyles";
import AuthStackScreen, { linkingConfig } from "./src/auth/AuthStackScreen";
import { AuthContext, useAuth } from "./src/auth/authContext";
import useAuthLifecycle from "./src/auth/useAuthLifecycle";
import { fetchAuthProfileByUserId, signOutUser } from "./src/auth/authHandlers";

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
  if (Purchases === resolved) {
    return resolved;
  }
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

const REVENUECAT_CONFIG = {
  apiKeys: {
    ios:
      readEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY") ||
      readEnv("REVENUECAT_IOS_API_KEY") ||
      readEnv("REVENUECAT_API_KEY_IOS") ||
      "",
    android:
      readEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY") ||
      readEnv("REVENUECAT_ANDROID_API_KEY") ||
      readEnv("REVENUECAT_API_KEY_ANDROID") ||
      "",
  },
  entitlementIds: {
    core: "core",
    premium: "premium",
  },
  packageIds: {
    core: "core_lifetime",
    premium: "premium_monthly",
  },
  offeringId: "default",
};

// 🎨 Design tokens
const palette = {
  parchmentA: "#FAF7ED",
  parchmentB: "#F3E2C0",
  parchmentGold: "#F7E4B0",
  card: "#F5E9D4",
  gold: "#D4AF37",
  goldLight: "#F8E8B5",
  goldDeep: "#B08B31",
  ink: "#2E261B",
  inkMuted: "#7A736A",
  border: "#E7D7BC",
  white: "#FFFFFF",
  danger: "#B44337",
  dangerDark: "#8C2C22",
};

const theme = {
  colors: palette,
  radius: 22,
  space: (n) => 8 * n,
};

const fonts = {
  title: "Marcellus_400Regular",
  body: "Lora_400Regular",
  bodyBold: "Lora_600SemiBold",
};

const GUIDANCE_MESSAGES = {
  Home:
    "Begin by taking a moment to settle your mind. Approach the I Ching with sincere and respectful intention. Hold your question gently in your thoughts and allow it to form clearly. When you feel ready, enter your question into the text box and tap 'Submit'.",
  Casting:
    "Cast the I Ching by tapping six times. Each tap forms one line of your hexagram. Black lines represent your current situation or energy. Gold lines show changing lines, shifts or future influences. Your cast reveals a Primary Hexagram, and if you have changing lines, a Resulting Hexagram as well. Upgrade for access to Manual Casting",
  Primary:
    "The Primary Hexagram reflects your present moment, the themes, challenges, or wisdom surrounding your question right now. Tap the hexagram to explore its meaning. If your cast includes any changing lines, the I Ching will also generate a Resulting Hexagram.",
  Resulting:
    "The Resulting Hexagram shows where things may be headed if the changing lines unfold. It offers guidance based on movement and transformation. Tap the hexagram to read the interpretation. When you're ready, tap 'Add to Journal' to save your insights.",
  Journal:
    "Your journal keeps all your readings in one place. Revisit past casts, follow your progress, and record personal notes or reflections. Upgrade for AI Ching to provide personalised interpretations and summaries tailored to your question and situation.",
  Library:
    "Explore all 64 hexagrams. Tap any hexagram to learn its core themes and wisdom.",
  Insights:
    "Track reading streaks, frequently cast hexagrams, and your activity over time.",
};

const screenTopPadding = Platform.select({
  ios: theme.space(1.5),
  android: theme.space(2),
  default: theme.space(1.5),
});

const createLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getRevenueCatApiKey = () => {
  const platformKey = Platform.select({
    ios: REVENUECAT_CONFIG.apiKeys.ios,
    android: REVENUECAT_CONFIG.apiKeys.android,
    default: REVENUECAT_CONFIG.apiKeys.android || REVENUECAT_CONFIG.apiKeys.ios,
  });
  return platformKey && platformKey.trim() ? platformKey.trim() : null;
};

const collectAllPackages = (offerings) => {
  if (!offerings) return [];
  const all = [];
  const current = offerings.current;
  if (current?.availablePackages?.length) {
    all.push(...current.availablePackages);
  }
  const others = offerings.all || {};
  Object.values(others).forEach((offering) => {
    if (offering?.availablePackages?.length) {
      offering.availablePackages.forEach((pkg) => all.push(pkg));
    }
  });
  return all;
};

const resolveRevenueCatPackage = (packageOrId, offerings) => {
  if (!packageOrId) return null;
  if (packageOrId?.identifier && packageOrId?.product) {
    return packageOrId;
  }
  const identifier =
    typeof packageOrId === "string"
      ? packageOrId
      : packageOrId?.identifier || packageOrId?.packageIdentifier || packageOrId?.product?.identifier;
  if (!identifier) return null;
  const allPackages = collectAllPackages(offerings);
  if (!allPackages.length) return null;
  return (
    allPackages.find((pkg) => {
      const identifiers = [pkg?.identifier, pkg?.packageIdentifier, pkg?.product?.identifier].filter(Boolean);
      return identifiers.some((value) => value === identifier);
    }) || null
  );
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

const notifyPurchaseOutcome = (outcome, messages = {}) => {
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

const notifyRestoreOutcome = (outcome) => {
  if (!outcome) return;
  if (outcome.success) {
    Alert.alert("Purchases restored", "Your active purchases are now synced on this device.");
  } else if (outcome.error) {
    Alert.alert("Restore failed", outcome.error?.message || "Please try again.");
  }
};

const defaultRevenueCatState = {
  ready: false,
  loading: false,
  activeAction: null,
  activeTargetId: null,
  offerings: null,
  packages: { premium: null, core: null },
  premiumPriceString: "",
  corePriceString: "",
  purchasePackage: async () => ({ success: false, error: new Error("Purchases unavailable") }),
  restorePurchases: async () => ({ success: false, error: new Error("Purchases unavailable") }),
  refreshOfferings: async () => null,
  premiumActive: false,
  coreActive: false,
  activeEntitlementIds: [],
  customerInfo: null,
  lastError: null,
};

const RevenueCatContext = createContext(defaultRevenueCatState);

function useRevenueCat() {
  return useContext(RevenueCatContext);
}

function usePremiumPurchaseFlow(successTitle, successMessage) {
  const { packages, purchasePackage } = useRevenueCat();
  return useCallback(async () => {
    const outcome = await purchasePackage(packages?.premium || REVENUECAT_CONFIG.packageIds.premium);
    notifyPurchaseOutcome(outcome, { successTitle, successMessage });
    return outcome;
  }, [packages?.premium, purchasePackage, successTitle, successMessage]);
}

function useRevenueCatController(appUserID, authReady) {
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
    if (!Purchases || !revenueCatApiKey) {
      return;
    }
    if (configureKeyRef.current === revenueCatApiKey || configuringRef.current) {
      return;
    }
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
        try {
          const info = await Purchases.getCustomerInfo();
          if (!cancelled) {
            setCustomerInfo(info);
          }
        } catch (infoError) {
          if (!cancelled) {
            setLastError(infoError);
          }
        }
        try {
          const nextOfferings = await Purchases.getOfferings();
          if (!cancelled) {
            setOfferings(nextOfferings);
          }
        } catch (offeringsError) {
          if (!cancelled) {
            setLastError(offeringsError);
          }
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
    if (!Purchases || !isConfigured || !authReady) {
      return;
    }
    if (appUserID && currentUserRef.current === appUserID) {
      return;
    }
    if (!appUserID && !currentUserRef.current) {
      return;
    }

    let cancelled = false;

    const syncIdentity = async () => {
      try {
        if (appUserID) {
          const result = await Purchases.logIn(appUserID);
          if (cancelled) return;
          currentUserRef.current = appUserID;
          const info = result?.customerInfo || result;
          if (info) {
            setCustomerInfo(info);
          }
        } else {
          const info = await Purchases.logOut();
          if (cancelled) return;
          currentUserRef.current = null;
          setCustomerInfo(info);
        }
        setLastError(null);
      } catch (error) {
        console.log("RevenueCat identity sync error:", error?.message || error);
        if (!cancelled) {
          setLastError(error);
        }
      }
    };

    syncIdentity();

    return () => {
      cancelled = true;
    };
  }, [appUserID, authReady, isConfigured]);

  useEffect(() => {
    if (!Purchases || !isConfigured) {
      return;
    }
    if (offerings) {
      return;
    }
    let cancelled = false;

    const loadOfferings = async () => {
      try {
        const nextOfferings = await Purchases.getOfferings();
        if (!cancelled) {
          setOfferings(nextOfferings);
        }
      } catch (error) {
        if (!cancelled) {
          setLastError(error);
        }
      }
    };

    loadOfferings();

    return () => {
      cancelled = true;
    };
  }, [isConfigured, offerings]);

  useEffect(() => {
    if (!customerInfo || !appUserID) return;
    const normalizedAppUser = customerInfo?.appUserID || customerInfo?.originalAppUserId;
    if (normalizedAppUser && normalizedAppUser !== appUserID) {
      console.warn(
        "RevenueCat alias mismatch detected",
        normalizedAppUser,
        "expected",
        appUserID
      );
    }
  }, [customerInfo, appUserID]);

  const refreshOfferings = useCallback(async () => {
    if (!Purchases || !isConfigured) {
      return null;
    }
    try {
      const nextOfferings = await Purchases.getOfferings();
      setOfferings(nextOfferings);
      setLastError(null);
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
      const resolved = resolveRevenueCatPackage(target, offerings) ||
        resolveRevenueCatPackage(target, { current: null, all: {} });
      const fallbackId = typeof target === "string" ? target : null;
      const targetId =
        resolved?.identifier ||
        resolved?.packageIdentifier ||
        resolved?.product?.identifier ||
        fallbackId;
      if (!resolved) {
        const error = new Error("Purchase options are unavailable. Please refresh and try again.");
        setLastError(error);
        return { success: false, error };
      }
      setBusyState({ busy: true, action: "purchase", targetId });
      try {
        const result = await Purchases.purchasePackage(resolved);
        const info = result?.customerInfo || result;
        if (info) {
          setCustomerInfo(info);
        }
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
      const info = await Purchases.restorePurchases();
      if (info) {
        setCustomerInfo(info);
      }
      setLastError(null);
      return { success: true, result: info };
    } catch (error) {
      console.log("RevenueCat restore error:", error?.message || error);
      setLastError(error);
      return { success: false, error };
    } finally {
      setBusyState({ busy: false, action: null, targetId: null });
    }
  }, [isConfigured]);

  const activeEntitlementIds = useMemo(() => {
    const active = customerInfo?.entitlements?.active || {};
    return Object.keys(active);
  }, [customerInfo?.entitlements?.active]);

  const activeEntitlements = useMemo(() => new Set(activeEntitlementIds), [activeEntitlementIds]);

  const premiumPackage = useMemo(
    () => resolveRevenueCatPackage(REVENUECAT_CONFIG.packageIds.premium, offerings),
    [offerings]
  );
  const corePackage = useMemo(
    () => resolveRevenueCatPackage(REVENUECAT_CONFIG.packageIds.core, offerings),
    [offerings]
  );

  const contextValue = useMemo(
    () => ({
      ready: isConfigured,
      loading: busyState.busy,
      activeAction: busyState.action,
      activeTargetId: busyState.targetId,
      offerings,
      packages: { premium: premiumPackage, core: corePackage },
      premiumPriceString: premiumPackage?.product?.priceString || "",
      corePriceString: corePackage?.product?.priceString || "",
      purchasePackage,
      restorePurchases,
      refreshOfferings,
      premiumActive: activeEntitlements.has(REVENUECAT_CONFIG.entitlementIds.premium),
      coreActive: activeEntitlements.has(REVENUECAT_CONFIG.entitlementIds.core),
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
      corePackage,
      purchasePackage,
      restorePurchases,
      refreshOfferings,
      activeEntitlements,
      activeEntitlementIds,
      customerInfo,
      lastError,
    ]
  );

  return contextValue;
}


// 🔗 Supabase client
export const SUPABASE_URL = "https://cvowwctcpepbctokktpn.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2b3d3Y3RjcGVwYmN0b2trdHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTYyMjIsImV4cCI6MjA3NjI5MjIyMn0.eOJ1Y7c5aBtf64sEXnO1G7z3YQAOhJNUqPfuLcjdNFw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// 📜 Hexagram data helpers
const SHEET_URL =
  "https://opensheet.elk.sh/1IYLzxYHomdVern98otj9Ff4C31qiJwK2S65tHMIJIC0/Sheet1";

const clean = (value) => (value == null ? "" : String(value).trim());

export const normalizeHexagramRow = (row) => {
  const map = {};
  Object.keys(row || {}).forEach((key) => {
    const normalized = String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    map[normalized] = row[key];
  });
  const changingLines = [
    map.cl1 || map.cl_1 || map["changing_line_1"] || "",
    map.cl2 || map.cl_2 || map["changing_line_2"] || "",
    map.cl3 || map.cl_3 || map["changing_line_3"] || "",
    map.cl4 || map.cl_4 || map["changing_line_4"] || "",
    map.cl5 || map.cl_5 || map["changing_line_5"] || "",
    map.cl6 || map.cl_6 || map["changing_line_6"] || "",
  ].map(clean);

  return {
    number: parseInt(map.number || map.no || map.hexagram || "0", 10) || null,
    name: clean(map.name || map.title),
    nature: clean(map.nature || map.trigrams || map.image),
    essence: clean(map.essence || map.judgment || map.judgement || map.meaning),
    description: clean(
      map.description ||
        map.summary ||
        map.overview ||
        map.image_text ||
        map["image:_text"] ||
        map.imagetext
    ),
    imageUrl: clean(map.image || map.image_url || map["image url"]) || null,
    linesBinary: (map.lines || "")
      .replace(/⚊/g, "1")
      .replace(/⚋/g, "0")
      .trim(),
    changingLines,
    judgment: clean(map.judgment || map.judgement || map.meaning || map.essence),
    imageText: clean(
      map.image_text || map["image:_text"] || map.imagetext || map.description
    ),
    _raw: row,
  };
};

export async function loadHexagrams() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`Sheet request failed: ${response.status}`);
    }
    const json = await response.json();
    return (json || [])
      .map(normalizeHexagramRow)
      .filter((item) => item.name)
      .sort((a, b) => {
        const aNum = a.number ?? Infinity;
        const bNum = b.number ?? Infinity;
        return aNum - bNum;
      });
  } catch (error) {
    console.log("Error loading sheet:", error?.message || error);
    return [];
  }
}

export function getHexagramNameByNumber(hexagrams, number) {
  if (!Array.isArray(hexagrams)) return null;
  const match = hexagrams.find((item) => item.number === number);
  return match ? match.name : null;
}

// 📈 Insights rebuilt
const monthAbbrevs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayAbbrevs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let MotionView = Animated.View;
try {
  const { MotiView } = require("moti");
  if (MotiView) {
    MotionView = MotiView;
  }
} catch (error) {
  // Fallback gracefully to Animated.View
}

const CARD_ANIMATION = {
  from: { opacity: 0, translateY: 16 },
  animate: { opacity: 1, translateY: 0 },
};

const isMotionComponent = MotionView !== Animated.View;
const motionProps = (delay = 0) =>
  isMotionComponent
    ? {
        from: CARD_ANIMATION.from,
        animate: CARD_ANIMATION.animate,
        transition: { type: "timing", duration: 600, delay },
      }
    : {};

function useAnimatedCounter(value, loading) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  useEffect(() => {
    if (loading) {
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
      setDisplay(0);
      return;
    }
    Animated.timing(animatedValue, {
      toValue: typeof value === "number" ? value : 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, loading, value]);

  return display;
}

function ShimmerPlaceholder({ height, style }) {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: theme.radius,
          backgroundColor: palette.card,
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
}

const formatCount = (value, noun) => {
  const safe = Number(value) || 0;
  const pluralized = safe === 1 ? noun : `${noun}s`;
  return `${safe} ${pluralized}`;
};

const dateKey = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const m = `${copy.getMonth() + 1}`.padStart(2, "0");
  const d = `${copy.getDate()}`.padStart(2, "0");
  return `${copy.getFullYear()}-${m}-${d}`;
};

const weekdayMostLabel = (key) => {
  const index = weekdayAbbrevs.indexOf(key);
  if (index === -1) return key;
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index];
};

function computeStreaks(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return { current: 0, longest: 0 };
  }
  const dateSet = new Set(entries.map((entry) => dateKey(entry.createdAt || entry.created_at || entry.date)));

  let current = 0;
  const cursor = new Date();
  while (dateSet.has(dateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDates = Array.from(dateSet)
    .map((value) => new Date(`${value}T00:00:00`))
    .sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous = null;
  sortedDates.forEach((date) => {
    if (!previous) {
      run = 1;
    } else {
      const diffDays = (date - previous) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        run += 1;
      } else {
        run = 1;
      }
    }
    longest = Math.max(longest, run);
    previous = date;
  });

  return { current, longest };
}

function useInsightsData() {
  const { entries, loading: journalLoading } = useJournal();
  const [hexagrams, setHexagrams] = useState([]);
  const [hexagramsLoading, setHexagramsLoading] = useState(true);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const loaded = await loadHexagrams();
        if (active) setHexagrams(loaded);
      } catch (error) {
        console.log("Hexagram load error:", error?.message || error);
        if (active) setWarning("Showing recent data");
      } finally {
        if (active) setHexagramsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const safeEntries = useMemo(() => {
    return (entries || []).filter((entry) => entry && entry.createdAt);
  }, [entries]);

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const streaks = useMemo(() => computeStreaks(safeEntries), [safeEntries]);

  const aggregates = useMemo(() => {
    const monthMap = new Map();
    const weekdayMap = new Map();
    const hexagramCounts = new Map();
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;

    safeEntries.forEach((entry) => {
      const created = new Date(entry.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const monthLabel = monthAbbrevs[created.getMonth()] || "";
      const weekdayLabel = weekdayAbbrevs[created.getDay()] || "";

      if (!monthMap.has(key)) {
        monthMap.set(key, { month: monthLabel, year: created.getFullYear(), readings: 0 });
      }
      monthMap.get(key).readings += 1;

      const weekdayKey = weekdayLabel || created.getDay();
      weekdayMap.set(weekdayKey, (weekdayMap.get(weekdayKey) || 0) + 1);

      const todayKey = dateKey(now);
      if (dateKey(created) === todayKey) todayCount += 1;
      if (created >= sevenDaysAgo && created <= now) weekCount += 1;
      if (created >= startOfMonth) monthCount += 1;
      if (created >= startOfYear) yearCount += 1;

      const hexNum = entry?.primary?.number;
      if (hexNum != null && !Number.isNaN(Number(hexNum))) {
        const parsed = Number(hexNum);
        hexagramCounts.set(parsed, (hexagramCounts.get(parsed) || 0) + 1);
      }
    });

    const monthlyActivity = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const fromMap = monthMap.get(key);
      monthlyActivity.push({
        key,
        month: monthAbbrevs[date.getMonth()],
        year: date.getFullYear(),
        readings: fromMap?.readings || 0,
      });
    }

    const mostDrawn = Array.from(hexagramCounts.entries())
      .map(([number, total]) => ({ number, total }))
      .sort((a, b) => b.total - a.total)[0] || null;

    const distinctHexagrams = hexagramCounts.size;

    const totalReadings = safeEntries.length;

    const weeklyPattern = Array.from(weekdayMap.entries())
      .map(([weekday, readings]) => ({ weekday, readings }))
      .sort((a, b) => {
        return weekdayAbbrevs.indexOf(a.weekday) - weekdayAbbrevs.indexOf(b.weekday);
      });

    const mostActiveMonth = monthlyActivity.reduce(
      (acc, entry) => {
        if ((entry.readings || 0) > (acc?.readings || 0)) return entry;
        return acc;
      },
      { month: null, readings: 0 }
    );

    return {
      monthlyActivity,
      weeklyPattern,
      cadence: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        year: yearCount,
        total: totalReadings,
      },
      mostDrawn,
      distinctHexagrams,
      totalReadings,
      mostActiveMonth,
    };
  }, [safeEntries, now, sevenDaysAgo, startOfMonth, startOfYear]);

  const topHexagrams = useMemo(() => {
    const counts = new Map();
    safeEntries.forEach((entry) => {
      const hexNum = entry?.primary?.number;
      if (hexNum == null) return;
      const parsed = Number(hexNum);
      if (Number.isNaN(parsed)) return;
      counts.set(parsed, (counts.get(parsed) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([number, total]) => ({ number, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        name: getHexagramNameByNumber(hexagrams, item.number),
      }));
  }, [hexagrams, safeEntries]);

  const monthlyReadingsLastYear = aggregates.monthlyActivity.reduce(
    (sum, entry) => sum + (entry.readings || 0),
    0
  );

  const weeklyMostActive = aggregates.weeklyPattern.reduce(
    (acc, entry) => {
      if ((entry?.readings || 0) > (acc?.readings || 0)) return entry;
      return acc;
    },
    { weekday: null, readings: 0 }
  );

  const narrativeLines = [];
  if (monthlyReadingsLastYear > 0) {
    narrativeLines.push(`You cast ${monthlyReadingsLastYear} readings over the last 12 months.`);
  }
  if (aggregates.mostActiveMonth?.month) {
    narrativeLines.push(`Your most active month was ${aggregates.mostActiveMonth.month}.`);
  }
  if (weeklyMostActive?.weekday) {
    const label = weekdayMostLabel(weeklyMostActive.weekday);
    narrativeLines.push(`You tend to read most often on ${label}s.`);
  }
  if (!narrativeLines.length) {
    narrativeLines.push("Complete a few readings to reveal your patterns.");
  }

  const firstRecorded = aggregates.monthlyActivity.find((item) => (item?.readings || 0) > 0);

  const milestones = {
    firstMonth: firstRecorded?.month || "-",
    longestStreak: streaks.longest || 0,
    mostActiveMonth: aggregates.mostActiveMonth?.month || "-",
    lifetimeReadings: aggregates.totalReadings,
  };

  const summary = {
    totalReadings: aggregates.totalReadings,
    distinctHexagrams: aggregates.distinctHexagrams,
    mostDrawn: aggregates.mostDrawn,
    streak: streaks.current,
  };

  const cadence = aggregates.cadence;

  return {
    hexagrams,
    loading: journalLoading || hexagramsLoading,
    warning,
    summary,
    cadence,
    narrativeLines,
    topHexagrams,
    monthlyActivity: aggregates.monthlyActivity,
    milestones,
    weeklyPattern: aggregates.weeklyPattern,
  };
}

function SummaryMetricCard({ title, subtitle, value, loading, delay = 0 }) {
  const displayValue = useAnimatedCounter(value, loading);
  return (
    <MotionView style={[stylesInsights.card, stylesInsights.summaryCard]} {...motionProps(delay)}>
      <Text style={stylesInsights.cardTitle}>{title}</Text>
      {subtitle ? <Text style={stylesInsights.cardSubtitle}>{subtitle}</Text> : null}
      {loading ? (
        <ShimmerPlaceholder height={32} style={stylesInsights.shimmerLarge} />
      ) : (
        <Text style={stylesInsights.metricValue}>{value == null ? "-" : displayValue}</Text>
      )}
    </MotionView>
  );
}

function CadenceCard({ cadence, loading }) {
  const items = [
    { label: "Today", value: cadence.today },
    { label: "This week", value: cadence.week },
    { label: "This month", value: cadence.month },
    { label: "This year", value: cadence.year },
    { label: "Total", value: cadence.total },
  ];
  return (
    <MotionView style={stylesInsights.card} {...motionProps(80)}>
      <Text style={stylesInsights.cardTitle}>Reading cadence</Text>
      {items.map((item, index) => {
        const displayValue = useAnimatedCounter(item.value, loading);
        return (
          <View
            key={item.label}
            style={[stylesInsights.rowBetween, index !== items.length - 1 && stylesInsights.rowDivider]}
          >
            <Text style={stylesInsights.rowLabel}>{item.label}</Text>
            {loading ? (
              <ShimmerPlaceholder height={16} style={stylesInsights.shimmerSmall} />
            ) : (
              <Text style={stylesInsights.rowValue}>{displayValue}</Text>
            )}
          </View>
        );
      })}
    </MotionView>
  );
}

function NarrativeCard({ lines, loading }) {
  return (
    <MotionView style={stylesInsights.card} {...motionProps(120)}>
      <Text style={stylesInsights.cardTitle}>Your Reading Patterns</Text>
      <View style={stylesInsights.paragraphStack}>
        {loading
          ? [0, 1, 2].map((index) => (
              <ShimmerPlaceholder
                key={`narrative-${index}`}
                height={18}
                style={stylesInsights.paragraphShimmer}
              />
            ))
          : lines.map((line, index) => (
              <Text key={`pattern-${index}`} style={stylesInsights.paragraphText}>
                {line}
              </Text>
            ))}
      </View>
    </MotionView>
  );
}

function TopHexagramsCard({ data, loading }) {
  return (
    <MotionView style={stylesInsights.card} {...motionProps(160)}>
      <Text style={stylesInsights.cardTitle}>Top Hexagrams</Text>
      {loading ? (
        <View>
          {[0, 1, 2, 3, 4].map((index) => (
            <ShimmerPlaceholder key={`top-${index}`} height={18} style={stylesInsights.listShimmer} />
          ))}
        </View>
      ) : data.length ? (
        <View style={stylesInsights.listContainer}>
          {data.map((item, index) => (
            <View key={`${item.number}-${index}`} style={stylesInsights.listRow}>
              <Text style={stylesInsights.listIndex}>{index + 1}.</Text>
              <View style={stylesInsights.listContent}>
                <Text style={stylesInsights.listLabel}>
                  {`Hexagram ${item.number}`}
                  {item.name ? ` — ${item.name}` : ""}
                </Text>
                <Text style={stylesInsights.listValue}>{formatCount(item.total, "time")}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={stylesInsights.emptyText}>No readings yet. Your top hexagrams will appear here.</Text>
      )}
    </MotionView>
  );
}

function MonthlyActivityCard({ data, loading }) {
  return (
    <MotionView style={stylesInsights.card} {...motionProps(200)}>
      <Text style={stylesInsights.cardTitle}>Monthly Activity (Past Year)</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stylesInsights.monthScroller}
        renderItem={({ item }) =>
          loading ? (
            <ShimmerPlaceholder height={38} style={stylesInsights.monthShimmer} />
          ) : (
            <View style={stylesInsights.monthBadge}>
              <Text style={stylesInsights.monthLabel}>{item.month}</Text>
              <View style={stylesInsights.monthPill}>
                <Text style={stylesInsights.monthValue}>{item.readings || 0}</Text>
              </View>
            </View>
          )
        }
      />
    </MotionView>
  );
}

function MilestonesCard({ milestones, loading }) {
  const items = [
    { icon: "📘", label: "First recorded reading", value: milestones.firstMonth || "-" },
    { icon: "🔥", label: "Longest streak", value: milestones.longestStreak ? `${milestones.longestStreak} days` : "Not started" },
    { icon: "⭐", label: "Most active month", value: milestones.mostActiveMonth || "-" },
    { icon: "🌕", label: "Lifetime readings", value: milestones.lifetimeReadings || 0 },
  ];

  return (
    <MotionView style={stylesInsights.card} {...motionProps(240)}>
      <Text style={stylesInsights.cardTitle}>Milestones</Text>
      <View style={stylesInsights.milestoneGrid}>
        {loading
          ? [0, 1, 2, 3].map((index) => (
              <ShimmerPlaceholder
                key={`milestone-${index}`}
                height={60}
                style={stylesInsights.milestoneShimmer}
              />
            ))
          : items.map((item) => (
              <View key={item.label} style={stylesInsights.milestoneBadge}>
                <Text style={stylesInsights.milestoneIcon}>{item.icon}</Text>
                <View style={stylesInsights.milestoneTextGroup}>
                  <Text style={stylesInsights.milestoneLabel}>{item.label}</Text>
                  <Text style={stylesInsights.milestoneValue}>{item.value}</Text>
                </View>
              </View>
            ))}
      </View>
    </MotionView>
  );
}

function InsightsOverviewScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { isPremium: premiumMember } = useAuth();
  const { visible, closeGuidance } = useGuidanceOnce("hasSeenGuidance_Insights");

  const {
    summary,
    cadence,
    narrativeLines,
    topHexagrams,
    monthlyActivity,
    milestones,
    loading,
    warning,
  } = useInsightsData();

  const columns = width < 360 ? 1 : 2;

  const summaryCards = [
    {
      title: "Total Readings",
      value: summary.totalReadings,
      loading,
      delay: 40,
    },
    {
      title: "Most-Drawn Hexagram",
      subtitle: summary.mostDrawn
        ? `Hexagram ${summary.mostDrawn.number}${summary.mostDrawn.total ? ` — ${formatCount(summary.mostDrawn.total, "time")}` : ""}`
        : "",
      value: summary.mostDrawn ? summary.mostDrawn.number : 0,
      loading,
      delay: 80,
    },
    {
      title: "Reading Streak",
      subtitle: "Consecutive days",
      value: summary.streak || 0,
      loading,
      delay: 120,
    },
    {
      title: "Distinct Hexagrams",
      subtitle: "Primary draws",
      value: summary.distinctHexagrams || 0,
      loading,
      delay: 160,
    },
  ];

  const summaryRows = [];
  for (let i = 0; i < summaryCards.length; i += columns) {
    summaryRows.push(summaryCards.slice(i, i + columns));
  }

  const handleGuidanceLearnMore = useCallback(() => {
    closeGuidance();
    navigation.navigate("Library");
  }, [closeGuidance, navigation]);

  const header = (
    <View style={stylesInsights.header}>
      <Text style={stylesInsights.screenTitle}>Insight Overview</Text>
      <Text style={stylesInsights.screenSubtitle}>A reflective glance at your journey with the I Ching.</Text>
      {warning ? <Text style={stylesInsights.warningText}>{warning}</Text> : null}
    </View>
  );

  const insightsContent = (
    <ScrollView
      style={stylesInsights.container}
      contentContainerStyle={{ paddingBottom: theme.space(4) }}
      showsVerticalScrollIndicator={false}
    >
      {header}

      <View style={stylesInsights.summaryGrid}>
        {summaryRows.map((row, rowIndex) => (
          <View key={`summary-row-${rowIndex}`} style={stylesInsights.summaryRow}>
            {row.map((card, index) => (
              <View
                key={`summary-${card.title}`}
                style={[
                  stylesInsights.summaryColumn,
                  index < row.length - 1 ? stylesInsights.summaryGap : null,
                ]}
              >
                <SummaryMetricCard {...card} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <CadenceCard cadence={cadence} loading={loading} />
      <NarrativeCard lines={narrativeLines} loading={loading} />
      <TopHexagramsCard data={topHexagrams} loading={loading} />
      <MonthlyActivityCard data={monthlyActivity} loading={loading} />
      <MilestonesCard milestones={milestones} loading={loading} />
    </ScrollView>
  );

  const paywallCard = (
    <View style={stylesInsights.paywallCard}>
      <Text style={stylesInsights.cardTitle}>Insights are a premium feature.</Text>
      <Text style={stylesInsights.paragraphText}>Upgrade to unlock your reading streaks, top hexagrams, and activity trends.</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[palette.parchmentA, palette.parchmentB, palette.parchmentGold]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={stylesInsights.gradient}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {premiumMember ? insightsContent : (
          <ScrollView
            style={stylesInsights.container}
            contentContainerStyle={{ paddingBottom: theme.space(4) }}
            showsVerticalScrollIndicator={false}
          >
            {header}
            {paywallCard}
          </ScrollView>
        )}
        <SimpleGuidanceModal
          visible={visible}
          onClose={closeGuidance}
          onLearnMore={handleGuidanceLearnMore}
          text={GUIDANCE_MESSAGES.Insights}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const stylesInsights = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: theme.space(3), paddingTop: screenTopPadding + theme.space(2) },
  header: { marginBottom: theme.space(2) },
  screenTitle: { fontFamily: fonts.title, fontSize: 30, color: palette.ink },
  screenSubtitle: { fontFamily: fonts.body, color: palette.inkMuted, marginTop: theme.space(0.5) },
  warningText: { fontFamily: fonts.body, color: palette.goldDeep, marginTop: theme.space(0.5) },
  summaryGrid: { marginTop: theme.space(2), marginBottom: theme.space(3) },
  summaryRow: { flexDirection: "row", marginBottom: theme.space(1.5) },
  summaryColumn: { flex: 1 },
  summaryGap: { marginRight: theme.space(1.5) },
  card: {
    backgroundColor: palette.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(2),
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: theme.space(2),
  },
  summaryCard: { minHeight: 130 },
  cardTitle: { fontFamily: fonts.title, fontSize: 20, color: palette.ink },
  cardSubtitle: { fontFamily: fonts.body, color: palette.inkMuted, marginTop: 4 },
  metricValue: { fontFamily: fonts.title, fontSize: 34, color: palette.ink, marginTop: theme.space(1.5) },
  shimmerLarge: { marginTop: theme.space(1.5), borderRadius: 10 },
  shimmerSmall: { width: 40, borderRadius: 6 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(0.75),
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  rowLabel: { fontFamily: fonts.body, color: palette.ink },
  rowValue: { fontFamily: fonts.bodyBold, color: palette.goldDeep },
  paragraphStack: { gap: theme.space(1), marginTop: theme.space(0.5) },
  paragraphShimmer: { borderRadius: 8 },
  paragraphText: { fontFamily: fonts.body, fontSize: 15, color: palette.ink, lineHeight: 22 },
  listContainer: { marginTop: theme.space(1) },
  listRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: theme.space(0.75) },
  listIndex: { fontFamily: fonts.bodyBold, color: palette.ink, marginRight: theme.space(1) },
  listContent: { flex: 1 },
  listLabel: { fontFamily: fonts.body, fontSize: 15, color: palette.ink },
  listValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.goldDeep, marginTop: 2 },
  listShimmer: { marginBottom: theme.space(1), borderRadius: 8 },
  emptyText: { fontFamily: fonts.body, color: palette.inkMuted },
  monthScroller: { paddingVertical: theme.space(0.5) },
  monthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: theme.space(1),
    paddingVertical: theme.space(0.75),
    marginRight: theme.space(1),
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  monthLabel: { fontFamily: fonts.bodyBold, color: palette.ink, marginRight: theme.space(0.75) },
  monthPill: { backgroundColor: palette.goldLight, borderRadius: 12, paddingHorizontal: theme.space(1), paddingVertical: 4 },
  monthValue: { fontFamily: fonts.bodyBold, color: palette.goldDeep },
  monthShimmer: { width: 74, borderRadius: 14, marginRight: theme.space(1) },
  milestoneGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(1) },
  milestoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 14,
    paddingVertical: theme.space(1),
    paddingHorizontal: theme.space(1.25),
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: 150,
    flex: 1,
  },
  milestoneIcon: { fontSize: 18, marginRight: theme.space(1) },
  milestoneTextGroup: { flex: 1 },
  milestoneLabel: { fontFamily: fonts.body, color: palette.inkMuted, fontSize: 13 },
  milestoneValue: { fontFamily: fonts.bodyBold, color: palette.ink, fontSize: 15, marginTop: 2 },
  milestoneShimmer: { borderRadius: 12, minWidth: 150 },
  paywallCard: {
    backgroundColor: palette.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(2),
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const JournalStack = createNativeStackNavigator();

function randomLine() {
  const roll = Math.floor(Math.random() * 4) + 6;
  if (roll === 6) return { v: 0, moving: true, roll };
  if (roll === 7) return { v: 1, moving: false, roll };
  if (roll === 8) return { v: 0, moving: false, roll };
  return { v: 1, moving: true, roll };
}

function lineFromManualValue(value) {
  const numeric = Number(value);
  if (numeric === 6) return { v: 0, moving: true, roll: 6 };
  if (numeric === 7) return { v: 1, moving: false, roll: 7 };
  if (numeric === 8) return { v: 0, moving: false, roll: 8 };
  if (numeric === 9) return { v: 1, moving: true, roll: 9 };
  return null;
}

function flipLinesForResult(lines) {
  if (!Array.isArray(lines) || !lines.some((line) => line?.moving)) {
    return [];
  }
  return lines.map((line) => ({
    v: line.moving ? (line.v ? 0 : 1) : line.v,
    moving: false,
  }));
}

function linesKey(lines) {
  return lines.map((line) => (line.v ? "1" : "0")).join("");
}

function chooseByLines(lines, list) {
  if (!list?.length) return null;
  const key = linesKey(lines);
  return (
    list.find(
      (item) =>
        item.linesBinary && item.linesBinary.replace(/\s+/g, "") === key
    ) || null
  );
}

function deriveChangingLineSummaries(hex, lines) {
  if (!hex || !Array.isArray(lines)) return [];
  const details = Array.isArray(hex.changingLines) ? hex.changingLines : [];
  return lines
    .map((line, index) => ({ line, index }))
    .filter((entry) => entry.line?.moving)
    .map((entry) => {
      const text = (details[entry.index] || "").toString().trim();
      if (!text) return null;
      return { number: entry.index + 1, text };
    })
    .filter(Boolean);
}

function fullChangingLineSummaries(hex) {
  if (!hex) return [];
  return (hex.changingLines || [])
    .map((value, index) => {
      const text = (value || "").toString().trim();
      if (!text) return null;
      return { number: index + 1, text };
    })
    .filter(Boolean);
}

// 🧭 Guidance helpers
function useGuidanceOnce(storageKey, options = {}) {
  const { autoShow = true } = options;
  const [visible, setVisible] = useState(false);
  const [hasSeenGuidance, setHasSeenGuidance] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedValue = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        setHasSeenGuidance(storedValue === "true");
      } catch (error) {
        console.log("Guidance flag error:", error?.message || error);
      } finally {
        if (active) {
          setHasLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const maybeAutoShow = async () => {
      if (!hasLoaded || hasSeenGuidance || !autoShow || visible) return;
      setVisible(true);
      try {
        await AsyncStorage.setItem(storageKey, "true");
        if (active) {
          setHasSeenGuidance(true);
        }
      } catch (error) {
        console.log("Guidance auto-show error:", error?.message || error);
      }
    };

    maybeAutoShow();
    return () => {
      active = false;
    };
  }, [autoShow, hasLoaded, hasSeenGuidance, storageKey, visible]);

  const openGuidance = useCallback(() => {
    setVisible(true);
    if (!hasSeenGuidance) {
      AsyncStorage.setItem(storageKey, "true").catch(() => {});
      setHasSeenGuidance(true);
    }
    setHasLoaded(true);
  }, [hasSeenGuidance, storageKey]);
  const closeGuidance = useCallback(() => setVisible(false), []);

  return { visible, hasSeenGuidance, openGuidance, closeGuidance, hasLoaded };
}

// 🗒️ Journal context
const JournalContext = createContext();

const safeParseJSON = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.log("JSON parse error:", error?.message || error);
    return fallback;
  }
};

function JournalProvider({ children }) {
  const { session, authReady, isPremium } = useAuth();
  const userId = session?.user?.id;
  const premiumMember = Boolean(isPremium && userId);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);
  const pendingNoteTimers = useRef({});

  const storageKey = useMemo(
    () => (userId ? `journal_entries_${userId}` : "journal_entries_guest"),
    [userId]
  );

  const normaliseHexagramRef = useCallback((detail, fallbackNumber) => {
    const numberCandidate =
      detail && detail.number != null ? detail.number : fallbackNumber;
    const parsedNumber = parseHexNumber(numberCandidate);
    if (detail) {
      return {
        ...detail,
        number:
          parsedNumber != null
            ? parsedNumber
            : detail.number != null
            ? detail.number
            : null,
      };
    }
    if (parsedNumber == null) {
      return null;
    }
    return { number: parsedNumber };
  }, []);

  const hydrateEntry = useCallback(
    (row, fallbackSummary = {}) => {
      const summary = Object.keys(fallbackSummary).length
        ? fallbackSummary
        : safeParseJSON(row?.summary, {});
      const primary = normaliseHexagramRef(summary.primary, row?.hexagram_primary);
      const resulting = normaliseHexagramRef(
        summary.resulting,
        row?.hexagram_resulting
      );
      return {
        id: row.id,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        note: row.notes ?? "",
        question: row.question ?? "",
        primary,
        resulting,
        primaryLines: Array.isArray(summary.primaryLines)
          ? summary.primaryLines
          : [],
        resultingLines: Array.isArray(summary.resultingLines)
          ? summary.resultingLines
          : [],
        aiSummary:
          fallbackSummary.aiSummary ?? row?.ai_summary ?? "",
        synced: true,
      };
    },
    [normaliseHexagramRef]
  );

  const reviveLocalEntry = useCallback(
    (item) => {
      if (!item) return null;
      const primary = normaliseHexagramRef(item.primary, item?.primary?.number);
      const resulting = normaliseHexagramRef(item.resulting, item?.resulting?.number);
      return {
        id: item.id,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        note: item.note ?? "",
        question: item.question ?? "",
        primary,
        resulting,
        primaryLines: Array.isArray(item.primaryLines)
          ? item.primaryLines
          : [],
        resultingLines: Array.isArray(item.resultingLines)
          ? item.resultingLines
          : [],
        aiSummary: item.aiSummary ?? "",
        synced: Boolean(item.synced),
      };
    },
    [normaliseHexagramRef]
  );

  const persistLocalEntries = useCallback(
    async (list) => {
      try {
        if (!storageKey) return;
        const serialisable = (list || []).map((entry) => ({
          ...entry,
          createdAt: entry.createdAt
            ? entry.createdAt.toISOString()
            : new Date().toISOString(),
        }));
        await AsyncStorage.setItem(storageKey, JSON.stringify(serialisable));
      } catch (error) {
        console.log("Local journal persist error:", error?.message || error);
      }
    },
    [storageKey]
  );

  const updateEntriesState = useCallback(
    (updater) => {
      setEntries((prev) => {
        const next = updater(prev);
        persistLocalEntries(next);
        return next;
      });
    },
    [persistLocalEntries]
  );

  const loadEntries = useCallback(async () => {
    if (!authReady) {
      return;
    }
    setLoading(true);
    let localEntries = [];
    try {
      if (storageKey) {
        const stored = await AsyncStorage.getItem(storageKey);
        const parsed = safeParseJSON(stored, []);
        if (Array.isArray(parsed)) {
          localEntries = parsed
            .map(reviveLocalEntry)
            .filter(Boolean);
        }
      }
      localEntries.sort((a, b) => b.createdAt - a.createdAt);
      setEntries(localEntries);

      if (!premiumMember) {
        setRemoteCount(0);
        await persistLocalEntries(localEntries);
        return;
      }

      const { data, error } = await supabase
        .from("JournalEntries")
        .select(
          "id, question, notes, hexagram_primary, hexagram_resulting, summary, ai_summary, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const remoteEntries = (data || []).map((row) => ({
        ...hydrateEntry(row),
        synced: true,
      }));
      setRemoteCount(remoteEntries.length);
      const remoteMap = new Map(remoteEntries.map((item) => [item.id, true]));
      const merged = [...remoteEntries];
      localEntries.forEach((entry) => {
        if (!remoteMap.has(entry.id)) {
          merged.push({ ...entry, synced: false });
        }
      });
      merged.sort((a, b) => b.createdAt - a.createdAt);
      setEntries(merged);
      await persistLocalEntries(merged);
    } catch (error) {
      console.log("Journal fetch error:", error?.message || error);
      setRemoteCount(localEntries.filter((entry) => entry.synced).length);
      if (premiumMember) {
        Alert.alert(
          "Showing recent data",
          "Cloud backup is unavailable. Displaying the latest entries stored on this device."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authReady, storageKey, premiumMember, userId, hydrateEntry, reviveLocalEntry, persistLocalEntries]);

  useEffect(() => {
    Object.values(pendingNoteTimers.current || {}).forEach((timer) =>
      clearTimeout(timer)
    );
    pendingNoteTimers.current = {};
    if (!authReady) return;
    loadEntries();
  }, [authReady, storageKey, premiumMember, userId, loadEntries]);

  useEffect(() => {
    return () => {
      Object.values(pendingNoteTimers.current || {}).forEach((timer) =>
        clearTimeout(timer)
      );
    };
  }, []);

  const addEntry = useCallback(
    async (entry) => {
      const summaryPayload = {
        primary: entry.primary ?? null,
        resulting: entry.resulting ?? null,
        primaryLines: entry.primaryLines ?? [],
        resultingLines: entry.resultingLines ?? [],
      };

      if (premiumMember && authReady && userId && remoteCount < 1000) {
        try {
          const { data, error } = await supabase
            .from("JournalEntries")
            .insert({
              user_id: userId,
              question: entry.question ?? "",
              notes: entry.note ?? "",
              hexagram_primary: entry.primary?.number ?? null,
              hexagram_resulting: entry.resulting?.number ?? null,
              summary: JSON.stringify(summaryPayload),
            })
            .select()
            .single();
          if (error) throw error;
          const hydrated = { ...hydrateEntry(data, summaryPayload), synced: true };
          setRemoteCount((prev) => prev + 1);
          updateEntriesState((prev) => [hydrated, ...prev]);
          return hydrated.id;
        } catch (error) {
          console.log("Journal cloud backup error:", error?.message || error);
          Alert.alert(
            "Cloud backup unavailable",
            "Your entry is saved on this device and will sync when the backup is available."
          );
        }
      } else if (premiumMember && remoteCount >= 1000) {
        Alert.alert(
          "Backup limit reached",
          "Premium backup can store up to 1,000 entries. New readings will remain on this device."
        );
      }

      const localEntry = {
        id: `local-${createLocalId()}`,
        createdAt: new Date(),
        note: entry.note ?? "",
        question: entry.question ?? "",
        primary: entry.primary ?? null,
        resulting: entry.resulting ?? null,
        primaryLines: entry.primaryLines ?? [],
        resultingLines: entry.resultingLines ?? [],
        aiSummary: entry.aiSummary ?? "",
        synced: false,
      };
      updateEntriesState((prev) => [localEntry, ...prev]);
      return localEntry.id;
    },
    [premiumMember, authReady, userId, remoteCount, hydrateEntry, updateEntriesState]
  );

  const updateEntryNote = useCallback(
    (id, note) => {
      const targetEntry = entries.find((item) => item.id === id);
      updateEntriesState((prev) =>
        prev.map((item) => (item.id === id ? { ...item, note } : item))
      );

      const shouldSync =
        premiumMember &&
        authReady &&
        userId &&
        targetEntry?.synced &&
        !String(id).startsWith("local-");
      if (!shouldSync) {
        return;
      }

      if (pendingNoteTimers.current[id]) {
        clearTimeout(pendingNoteTimers.current[id]);
      }
      pendingNoteTimers.current[id] = setTimeout(async () => {
        try {
          await supabase
            .from("JournalEntries")
            .update({ notes: note })
            .eq("id", id)
            .eq("user_id", userId);
        } catch (error) {
          console.log("Note update error:", error?.message || error);
        }
      }, 750);
    },
    [entries, premiumMember, authReady, userId, updateEntriesState]
  );

  const removeEntry = useCallback(
    async (id) => {
      const entry = entries.find((item) => item.id === id);
      if (!entry) return;

      if (pendingNoteTimers.current[id]) {
        clearTimeout(pendingNoteTimers.current[id]);
        delete pendingNoteTimers.current[id];
      }

      updateEntriesState((prev) =>
        prev.filter((item) => item.id !== id)
      );

      const shouldSync =
        premiumMember &&
        authReady &&
        userId &&
        entry.synced &&
        !String(id).startsWith("local-");
      if (!shouldSync) {
        return;
      }

      try {
        const { error } = await supabase
          .from("JournalEntries")
          .delete()
          .eq("id", id)
          .eq("user_id", userId)
          .select("id");
        if (error) throw error;
        setRemoteCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("❌ Delete error:", error?.message || error);
        Alert.alert(
          "Error",
          "Failed to remove the entry from backup. It will remain available locally."
        );
        updateEntriesState((prev) => {
          const next = [...prev, entry];
          next.sort((a, b) => b.createdAt - a.createdAt);
          return next;
        });
      }
    },
    [entries, premiumMember, authReady, userId, updateEntriesState]
  );

  const setEntryAiSummary = useCallback((id, aiSummary) => {
    updateEntriesState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, aiSummary } : item
      )
    );
  }, [updateEntriesState]);

  const fetchEntryAiSummary = useCallback(
    async (id) => {
      const targetEntry = entries.find((item) => item.id === id);
      if (!premiumMember || !authReady || !userId || !targetEntry?.synced) {
        return targetEntry?.aiSummary ?? "";
      }
      try {
        const { data, error } = await supabase
          .from("JournalEntries")
          .select("ai_summary")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        const aiSummary = data?.ai_summary ?? "";
        updateEntriesState((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, aiSummary } : item
          )
        );
        return aiSummary;
      } catch (error) {
        console.log("AI summary fetch error:", error?.message || error);
        throw error;
      }
    },
    [entries, premiumMember, authReady, userId, updateEntriesState]
  );

  const confirmDelete = useCallback(
    (id) => {
      Alert.alert("Delete entry?", "Are you sure you want to remove this entry?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setTimeout(() => removeEntry(id), 150),
        },
      ]);
    },
    [removeEntry]
  );

  const value = useMemo(
    () => ({
      entries,
      loading,
      addEntry,
      updateEntryNote,
      setEntryAiSummary,
      fetchEntryAiSummary,
      removeEntry,
      confirmDelete,
      refreshEntries: loadEntries,
    }),
    [
      entries,
      loading,
      addEntry,
      updateEntryNote,
      setEntryAiSummary,
      fetchEntryAiSummary,
      removeEntry,
      confirmDelete,
      loadEntries,
    ]
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return ctx;
}

// 🌄 Background
function GradientBackground({ children }) {
  return (
    <LinearGradient
      colors={[palette.parchmentA, palette.parchmentB, palette.parchmentGold]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

// 🪵 Cards & buttons
function SectionCard({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: palette.border,
          padding: theme.space(1.75),
          marginBottom: theme.space(2),
          shadowColor: palette.goldDeep,
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function GoldButton({
  onPress,
  children,
  icon,
  kind = "primary",
  full = false,
  disabled = false,
  loading = false,
}) {
  const primary = kind === "primary";
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: full ? "stretch" : "flex-start",
          paddingHorizontal: theme.space(2),
          paddingVertical: theme.space(1.25),
          borderRadius: theme.radius,
          marginTop: theme.space(1),
          borderWidth: 1,
          shadowColor: palette.goldDeep,
          shadowOpacity: pressed ? 0.15 : 0.25,
          shadowRadius: pressed ? 6 : 10,
          shadowOffset: { width: 0, height: pressed ? 2 : 6 },
        },
        primary
          ? { backgroundColor: palette.gold, borderColor: palette.gold }
          : { backgroundColor: palette.white, borderColor: palette.gold },
        pressed && !isDisabled && { opacity: 0.98 },
        isDisabled && { opacity: 0.6, shadowOpacity: 0.1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? palette.white : palette.gold}
          style={{ marginRight: 8 }}
        />
      ) : (
        icon
      )}
      <Text
        style={{
          marginLeft: !loading && icon ? 8 : 0,
          fontFamily: fonts.bodyBold,
          fontSize: 16,
          color: primary ? palette.white : palette.gold,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

function DeleteAccountButton({ loading, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        deleteAccountButtonStyles.base,
        pressed && !loading && { opacity: 0.85 },
        loading && deleteAccountButtonStyles.disabled,
      ]}
    >
      {loading && (
        <ActivityIndicator size="small" color={palette.white} style={{ marginRight: 8 }} />
      )}
      <Text style={deleteAccountButtonStyles.label}>
        {loading ? "Deleting…" : "Delete Account"}
      </Text>
    </Pressable>
  );
}

const deleteAccountButtonStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: theme.space(1.5),
    paddingVertical: theme.space(1.25),
    borderRadius: theme.radius,
    backgroundColor: palette.danger,
    borderWidth: 1,
    borderColor: palette.dangerDark,
    shadowColor: palette.dangerDark,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  disabled: {
    opacity: 0.65,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.white,
  },
});

// ℹ️ Guidance UI
function SimpleGuidanceModal({ visible, onClose, onLearnMore, text }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={guidanceStyles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={guidanceStyles.card}
        >
          <Text style={guidanceStyles.title}>Guidance</Text>
          <Text style={guidanceStyles.message}>{text}</Text>
          <GoldButton full onPress={onClose}>
            Close
          </GoldButton>
          <Pressable style={guidanceStyles.linkButton} onPress={onLearnMore} hitSlop={8}>
            <Text style={guidanceStyles.linkText}>Learn more in Guidance, History & Glossary</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HelpButton({ onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [guidanceStyles.helpButton, style, pressed && { opacity: 0.9 }]}
    >
      <Ionicons name="help-circle-outline" size={22} color={palette.white} />
    </Pressable>
  );
}

const guidanceStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space(2.5),
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.goldLight,
    borderRadius: theme.radius,
    padding: theme.space(2),
    borderWidth: 1,
    borderColor: palette.goldDeep,
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 22,
    color: palette.ink,
    textAlign: "center",
    marginBottom: theme.space(1),
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: theme.space(1.5),
  },
  linkButton: {
    marginTop: theme.space(1),
    alignItems: "center",
  },
  linkText: {
    fontFamily: fonts.bodyBold,
    color: palette.goldDeep,
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  helpButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space(1),
    paddingVertical: theme.space(1),
    backgroundColor: palette.gold,
    borderRadius: theme.radius,
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 10,
  },
});

function UpgradeCallout({ title, description, onUpgrade, style, icon = "sparkles-outline" }) {
  const { premiumPriceString, loading, activeAction } = useRevenueCat();
  const defaultPurchase = usePremiumPurchaseFlow();
  const purchaseBusy = loading && activeAction === "purchase";
  const buttonLabel = premiumPriceString
    ? `Upgrade to Premium (${premiumPriceString})`
    : "Upgrade to Premium";
  const handlePress = useCallback(() => {
    if (typeof onUpgrade === "function") {
      return onUpgrade();
    }
    return defaultPurchase();
  }, [onUpgrade, defaultPurchase]);

  return (
    <SectionCard
      style={[
        {
          backgroundColor: palette.card,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.title, fontSize: 18, color: palette.ink }}>
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: palette.ink,
          marginTop: 8,
          lineHeight: 22,
        }}
      >
        {description}
      </Text>
      <GoldButton
        full
        onPress={handlePress}
        loading={purchaseBusy}
        icon={<Ionicons name={icon} size={18} color={palette.white} />}
      >
        {buttonLabel}
      </GoldButton>
    </SectionCard>
  );
}

const { loginStyles, loginGradientColors } = createAuthStyles({ theme, palette, fonts });

// 🟡 Hexagram lines
function Line({ v, moving }) {
  const color = moving ? palette.gold : palette.ink;
  const glow = moving ? palette.gold : "transparent";
  return (
    <View style={{ height: 22, justifyContent: "center", marginVertical: 5 }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 22,
          borderRadius: 12,
          shadowColor: glow,
          shadowOpacity: moving ? 0.45 : 0,
          shadowRadius: 9,
        }}
      />
      {v === 1 ? (
        <View style={{ height: 12, borderRadius: 8, backgroundColor: color }} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, height: 12, borderRadius: 8, backgroundColor: color }} />
          <View style={{ width: 18 }} />
          <View style={{ flex: 1, height: 12, borderRadius: 8, backgroundColor: color }} />
        </View>
      )}
    </View>
  );
}

function AnimatedLine({ v, moving, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 360,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Line v={v} moving={moving} />
    </Animated.View>
  );
}

// 🔶 Hexagon thumb
const HEX_POINTS = "50,5 93,28 93,72 50,95 7,72 7,28";

const sanitizeImageUri = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^http:\/\//i, "https://");
};

const parseHexNumber = (value) => {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normaliseHexKey = (value) => {
  const parsed = parseHexNumber(value);
  if (parsed != null) {
    return String(parsed);
  }
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

const hexImageCache = {
  map: new Map(),
  promise: null,
};

function HexagonThumbnail({ uri, hexNumber = null, size = 52 }) {
  const clipIdRef = useRef(null);
  if (!clipIdRef.current) {
    HexagonThumbnail._id = (HexagonThumbnail._id || 0) + 1;
    clipIdRef.current = `hex-clip-${HexagonThumbnail._id}`;
  }
  const clipId = clipIdRef.current;

  const [resolvedUri, setResolvedUri] = useState(() => sanitizeImageUri(uri));
  const hexKey = useMemo(() => normaliseHexKey(hexNumber), [hexNumber]);

  useEffect(() => {
    setResolvedUri(sanitizeImageUri(uri));
  }, [uri]);

  useEffect(() => {
    if (resolvedUri || !hexKey) return;
    if (hexImageCache.map.has(hexKey)) {
      const cached = hexImageCache.map.get(hexKey);
      if (cached) {
        setResolvedUri(cached);
      }
      return;
    }

    let isMounted = true;

    if (!hexImageCache.promise) {
      hexImageCache.promise = loadHexagrams()
        .then((rows) => {
          (rows || []).forEach((hex) => {
            if (hex?.number == null) return;
            const cleaned = sanitizeImageUri(hex.imageUrl);
            const key = normaliseHexKey(hex.number);
            if (!key) return;
            hexImageCache.map.set(key, cleaned || null);
          });
        })
        .catch((error) =>
          console.log("Hexagram catalog load error:", error?.message || error)
        );
    }

    hexImageCache.promise
      .then(() => {
        if (!isMounted) return;
        const cached = hexImageCache.map.get(hexKey);
        if (cached) {
          setResolvedUri(cached);
        }
      })
      .catch((error) =>
        console.log("Hexagram cache resolve error:", error?.message || error)
      );

    return () => {
      isMounted = false;
    };
  }, [resolvedUri, hexKey]);

  const imageSource = resolvedUri;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        shadowColor: palette.goldDeep,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Polygon points={HEX_POINTS} />
          </ClipPath>
          <SvgLinearGradient id="hex-placeholder" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.goldLight} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={palette.gold} stopOpacity="0.9" />
          </SvgLinearGradient>
        </Defs>
        {imageSource ? (
          <SvgImage
            key={imageSource}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
            href={{ uri: imageSource }}
            xlinkHref={imageSource}
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <Path
            d="M0 0h100v100H0z"
            fill="url(#hex-placeholder)"
            clipPath={`url(#${clipId})`}
          />
        )}
        <Polygon points={HEX_POINTS} fill="transparent" stroke={palette.gold} strokeWidth={3} />
      </Svg>
    </View>
  );
}

// 🪞 Hexagram card & modal
function HexagramCard({ item, onPress, showDetails = true }) {
  if (!item) return null;
  const hasImage = !!item.imageUrl;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: palette.card,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: palette.border,
          overflow: "hidden",
          marginBottom: theme.space(2),
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={stylesHexagramCard.imageWrapper}>
        {hasImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={stylesHexagramCard.image}
            resizeMode="cover"
          />
        ) : (
          <View style={stylesHexagramCard.placeholder}>
            <Ionicons name="sparkles-outline" size={30} color={palette.goldDeep} />
          </View>
        )}
      </View>
      {showDetails ? (
        <View style={stylesHexagramCard.details}>
          <Text style={stylesHexagramCard.name}>{item.name}</Text>
          {item.number ? (
            <Text style={stylesHexagramCard.subtitle}>Hexagram {item.number}</Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const stylesHexagramCard = StyleSheet.create({
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    backgroundColor: palette.parchmentB,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    padding: theme.space(1.5),
  },
  name: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    marginTop: 4,
  },
});

function ReadingModal({
  visible,
  onClose,
  hex,
  lines,
  variant = "primary",
  changingSummaries = [],
}) {
  if (!hex) return null;
  const essence = hex.essence || hex.judgment || "";
  const description = hex.description || hex.imageText || "";
  const diagramLines = Array.isArray(lines) ? lines : [];
  const showLines = diagramLines.length === 6;
  const showChanging =
    (variant === "primary" || variant === "library") &&
    changingSummaries.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={stylesReading.container}>
            <Pressable onPress={onClose} style={stylesReading.closeButton}>
              <Ionicons name="chevron-back" size={22} color={palette.ink} />
            </Pressable>
            <View style={stylesReading.heroWrapper}>
              <View style={stylesReading.heroCircle}>
                <View style={stylesReading.heroCircleInner}>
                  {hex.imageUrl ? (
                    <Image
                      source={{ uri: hex.imageUrl }}
                      style={stylesReading.heroImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="sparkles-outline" size={36} color={palette.goldDeep} />
                  )}
                  <Svg
                    pointerEvents="none"
                    width={120}
                    height={120}
                    viewBox="0 0 100 100"
                    style={stylesReading.heroHexOverlay}
                  >
                    <Polygon
                      points={HEX_POINTS}
                      fill="transparent"
                      stroke={palette.gold}
                      strokeWidth={2}
                    />
                  </Svg>
                </View>
              </View>
            </View>
            <Text style={stylesReading.readingTitle}>{hex.name}</Text>
            {hex.nature ? <Text style={stylesReading.readingNature}>{hex.nature}</Text> : null}

            {showLines ? (
              <SectionCard style={stylesReading.linesCard}>
                <Text style={stylesReading.sectionHeader}>Lines</Text>
                <View style={stylesReading.linesDiagram}>
                  {[...diagramLines].reverse().map((line, index) => (
                    <Line key={index} v={line.v} moving={line.moving} />
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {essence ? (
              <View style={stylesReading.sectionBlock}>
                <Text style={stylesReading.sectionHeader}>Essence</Text>
                <Text style={stylesReading.sectionText}>{essence}</Text>
              </View>
            ) : null}

            {description ? (
              <View style={stylesReading.sectionBlock}>
                <Text style={stylesReading.sectionHeader}>Description</Text>
                <Text style={stylesReading.sectionText}>{description}</Text>
              </View>
            ) : null}

            {showChanging ? (
              <View style={stylesReading.sectionBlock}>
                <Text style={stylesReading.sectionHeader}>Changing Lines</Text>
                {changingSummaries.map((item) => (
                  <View key={item.number} style={stylesReading.changingItem}>
                    <Text style={stylesReading.changingTitle}>{`Changing Line ${item.number}`}</Text>
                    <Text style={stylesReading.sectionText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </Modal>
  );
}

const stylesReading = StyleSheet.create({
  container: {
    padding: theme.space(2),
    paddingBottom: theme.space(4),
    paddingTop: theme.space(2) + screenTopPadding,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: theme.space(1.5),
  },
  heroWrapper: {
    alignItems: "center",
    marginBottom: theme.space(2.5),
  },
  heroCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(247, 228, 176, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.gold,
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroCircleInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  heroHexOverlay: {
    position: "absolute",
    top: 15,
    left: 15,
  },
  heroImage: {
    width: "210%",
    height: "210%",
    resizeMode: "cover",
  },
  readingTitle: {
    fontFamily: fonts.title,
    fontSize: 30,
    color: palette.ink,
    textAlign: "center",
  },
  readingNature: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: theme.space(2),
  },
  linesCard: {
    paddingVertical: theme.space(1.5),
  },
  linesDiagram: {
    marginTop: theme.space(1),
  },
  sectionBlock: {
    marginTop: theme.space(2),
  },
  sectionHeader: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: palette.ink,
    marginBottom: 6,
  },
  sectionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    lineHeight: 24,
  },
  changingItem: {
    marginTop: theme.space(1),
    paddingTop: theme.space(1),
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  changingTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.goldDeep,
    marginBottom: 4,
  },
});

// ✨ Hero hexagon
function GlowingHexagon() {
  const glowOpacity = useRef(new Animated.Value(0.7)).current;
  const glowScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const auraAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.95,
            duration: 3200,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.05,
            duration: 3200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.6,
            duration: 3200,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.92,
            duration: 3200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    auraAnimation.start();
    return () => auraAnimation.stop();
  }, [glowOpacity, glowScale]);

  return (
    <View style={{ alignItems: "center", marginVertical: theme.space(3) }}>
      <Animated.View
        style={{
          position: "absolute",
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      >
        <Svg width={240} height={240} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff9e8" stopOpacity="1" />
              <Stop offset="45%" stopColor={palette.goldLight} stopOpacity="0.85" />
              <Stop offset="100%" stopColor={palette.parchmentGold} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="innerGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <Stop offset="70%" stopColor="#ffcf70" stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id="edgeSheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#fff4c9" stopOpacity="0.8" />
              <Stop offset="55%" stopColor="rgba(255, 244, 201, 0)" stopOpacity="0" />
              <Stop offset="100%" stopColor="#d68a1f" stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
        </Svg>
      </Animated.View>

      <View
        style={{
          width: 190,
          height: 190,
          borderRadius: 95,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: palette.gold,
          shadowOpacity: 0.35,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 18 },
          elevation: 16,
          backgroundColor: "rgba(255, 241, 205, 0.28)",
        }}
      >
        <Svg width={170} height={170} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="core" cx="50%" cy="50%" r="55%">
              <Stop offset="0%" stopColor="#fffbe8" stopOpacity="1" />
              <Stop offset="38%" stopColor="#ffe7a6" stopOpacity="0.98" />
              <Stop offset="100%" stopColor="#f3b43c" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="innerGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <Stop offset="70%" stopColor="#ffcf70" stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id="edgeSheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#fff4c9" stopOpacity="0.8" />
              <Stop offset="55%" stopColor="rgba(255, 244, 201, 0)" stopOpacity="0" />
              <Stop offset="100%" stopColor="#d68a1f" stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          <Polygon points={HEX_POINTS} fill="url(#core)" />
          <Polygon points={HEX_POINTS} fill="url(#edgeSheen)" opacity="0.5" />
          <Polygon points={HEX_POINTS} fill="url(#innerGlow)" opacity="0.7" />
          <Polygon
            points={HEX_POINTS}
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth={0.9}
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
}

// 🏠 Home screen
function HomeScreen({ navigation, route }) {
  const [question, setQuestion] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const isFocused = useIsFocused();
  const { session, profile, loadingProfile, signOut, refreshProfile } = useAuth();
  const { premiumActive: premiumEntitlementActive, coreActive: coreEntitlementActive } =
    useRevenueCat();
  const {
    visible: guidanceVisible,
    hasSeenGuidance,
    hasLoaded: guidanceLoaded,
    openGuidance,
    closeGuidance,
  } = useGuidanceOnce("hasSeenGuidance_Home");

  const handleGuidanceLearnMore = useCallback(() => {
    closeGuidance();
    navigation.navigate("Guide");
  }, [closeGuidance, navigation]);

  const hasProfile = Boolean(profile);
  const profileEmail = hasProfile
    ? profile.email || session?.user?.email || "Not set"
    : session?.user?.email || "Not set";
  const premiumStatusLabel = premiumEntitlementActive
    ? "Premium"
    : coreEntitlementActive
    ? "Core"
    : hasProfile
    ? profile.subscription_tier === "premium" || profile.is_premium
      ? "Premium"
      : profile.subscription_tier === "core"
      ? "Core"
      : "Core"
    : "Guest";

  useEffect(() => {
    if (route?.params?.resetQuestion) {
      setQuestion("");
      navigation.setParams({ resetQuestion: undefined });
    }
  }, [route?.params?.resetQuestion, navigation]);

  useEffect(() => {
    if (menuVisible) {
      refreshProfile();
    }
  }, [menuVisible, refreshProfile]);

  const closeMenuAndNavigate = useCallback(
    (target) => {
      setMenuVisible(false);
      if (target) {
        requestAnimationFrame(() => navigation.navigate(target));
      }
    },
    [navigation]
  );

  const handleOpenGuide = useCallback(() => closeMenuAndNavigate("Guide"), [closeMenuAndNavigate]);
  const handleOpenSettings = useCallback(() => closeMenuAndNavigate("Settings"), [closeMenuAndNavigate]);
  const handleOpenPremium = useCallback(() => closeMenuAndNavigate("Premium"), [closeMenuAndNavigate]);

  const handleLogout = useCallback(async () => {
    setMenuVisible(false);
    try {
      setQuestion("");
      await signOut();
    } catch (error) {
      Alert.alert("Logout failed", error?.message || "Please try again.");
    }
  }, [signOut]);

  useFocusEffect(
    useCallback(() => {
      if (guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
        openGuidance();
      }
    }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, openGuidance])
  );

  useEffect(() => {
    if (isFocused && guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
      openGuidance();
    }
  }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, isFocused, openGuidance]);

  const handleSubmitQuestion = useCallback(() => {
    const trimmed = question?.trim() || null;
    navigation.navigate("Cast", { question: trimmed });
    setQuestion("");
  }, [navigation, question]);

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={stylesHome.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={stylesHome.headerRow}>
              <HelpButton onPress={openGuidance} />
              <Pressable
                onPress={() => setMenuVisible(true)}
                style={stylesHome.menuButton}
                hitSlop={8}
              >
                <Ionicons name="ellipsis-vertical" size={22} color={palette.ink} />
              </Pressable>
            </View>
            <View style={stylesHome.mainContent}>
              <View style={stylesHome.heroBlock}>
                <Text style={stylesHome.appTitle}>AI Ching Insights</Text>
                <GlowingHexagon />
                <Text style={stylesHome.subtitle}>
                  The oracle awaits with quiet truths and timeless wisdom
                </Text>
              </View>

              <View style={stylesHome.formBlock}>
                <Text style={stylesHome.prompt}>What question brings you here today?</Text>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={150}
                  placeholder="Ask with sincerity…"
                  placeholderTextColor={palette.inkMuted}
                  style={stylesHome.input}
                />
                <Text style={stylesHome.counter}>{question.length}/150</Text>

                <GoldButton
                  full
                  onPress={handleSubmitQuestion}
                  icon={<Ionicons name="sparkles-outline" size={18} color={palette.white} />}
                >
                  Submit
                </GoldButton>
              </View>
            </View>
          </ScrollView>
          <Modal
            visible={menuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
          >
            <Pressable
              style={stylesHome.menuOverlay}
              onPress={() => setMenuVisible(false)}
            >
              <Pressable
                style={stylesHome.menuCard}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={stylesHome.menuTitle}>Account</Text>
                {loadingProfile ? (
                  <Text style={stylesHome.menuValue}>Loading profile…</Text>
                ) : (
                  <>
                    <Text style={stylesHome.menuLabel}>Email</Text>
                    <Text style={stylesHome.menuValue}>{profileEmail}</Text>
                    <Text style={stylesHome.menuLabel}>Premium Status</Text>
                    <Text style={stylesHome.menuValue}>{premiumStatusLabel}</Text>
                    {!hasProfile ? (
                      <Text style={stylesHome.menuHint}>
                        No profile record found for this account.
                      </Text>
                    ) : null}
                  </>
                )}
                <View style={stylesHome.menuDivider} />
                <Pressable style={stylesHome.menuOption} onPress={handleOpenGuide}>
                  <Ionicons name="book-outline" size={18} color={palette.goldDeep} />
                  <Text style={stylesHome.menuOptionText}>Guide</Text>
                </Pressable>
                <Pressable style={stylesHome.menuOption} onPress={handleOpenSettings}>
                  <Ionicons name="settings-outline" size={18} color={palette.goldDeep} />
                  <Text style={stylesHome.menuOptionText}>Settings</Text>
                </Pressable>
                <Pressable style={stylesHome.menuOption} onPress={handleOpenPremium}>
                  <Ionicons name="diamond-outline" size={18} color={palette.goldDeep} />
                  <Text style={stylesHome.menuOptionText}>Premium</Text>
                </Pressable>
                <View style={stylesHome.menuDivider} />
                <GoldButton
                  full
                  kind="secondary"
                  onPress={handleLogout}
                  icon={<Ionicons name="log-out-outline" size={18} color={palette.gold} />}
                >
                  Logout
                </GoldButton>
              </Pressable>
            </Pressable>
          </Modal>
          <SimpleGuidanceModal
            visible={guidanceVisible}
            onClose={closeGuidance}
            onLearnMore={handleGuidanceLearnMore}
            text={GUIDANCE_MESSAGES.Home}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const stylesHome = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.space(2.5),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.select({
      ios: theme.space(1),
      android: theme.space(1.25),
      default: theme.space(1),
    }),
    marginBottom: theme.space(1.5),
  },
  mainContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: theme.space(3),
  },
  heroBlock: {
    alignItems: "center",
  },
  formBlock: {
    marginTop: theme.space(3),
  },
  appTitle: {
    fontFamily: fonts.title,
    fontSize: 34,
    color: palette.ink,
    marginTop: 0,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.inkMuted,
    textAlign: "center",
    marginTop: theme.space(1),
    marginBottom: theme.space(2),
    paddingHorizontal: theme.space(2),
    lineHeight: 22,
  },
  prompt: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
    marginBottom: 6,
    textAlign: "center",
  },
  input: {
    minHeight: 64,
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
  },
  counter: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.inkMuted,
    textAlign: "right",
    marginTop: 4,
  },
  menuButton: {
    padding: theme.space(0.5),
    alignSelf: "flex-end",
    marginTop: -theme.space(0.25),
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: theme.space(2.5),
  },
  menuCard: {
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(2),
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  menuTitle: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: palette.ink,
    marginBottom: theme.space(1.5),
  },
  menuLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.ink,
    marginTop: theme.space(1),
  },
  menuValue: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    marginTop: 4,
  },
  menuHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: theme.space(1),
  },
  menuDivider: {
    marginVertical: theme.space(2),
    height: 1,
    backgroundColor: palette.border,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space(0.5),
  },
  menuOptionText: {
    marginLeft: theme.space(1),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
  },
});

// 🎴 Cast screen
function CastScreen({ route, navigation }) {
  const { isPremium } = useAuth();
  const premiumMember = Boolean(isPremium);
  const { premiumPriceString } = useRevenueCat();
  const startPremiumPurchase = usePremiumPurchaseFlow();
  const question = route.params?.question ?? null;
  const [all, setAll] = useState([]);
  const [lines, setLines] = useState([]);
  const [isDone, setIsDone] = useState(false);
  const isFocused = useIsFocused();
  const {
    visible: guidanceVisible,
    hasSeenGuidance,
    openGuidance,
    closeGuidance,
    hasLoaded: guidanceLoaded,
  } = useGuidanceOnce("hasSeenGuidance_Casting");

  const handleGuidanceLearnMore = useCallback(() => {
    closeGuidance();
    navigation.navigate("Guide");
  }, [closeGuidance, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
        openGuidance();
      }
    }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, openGuidance])
  );

  useEffect(() => {
    if (isFocused && guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
      openGuidance();
    }
  }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, isFocused, openGuidance]);

  useEffect(() => {
    loadHexagrams().then(setAll);
  }, []);

  const handleCastLine = () => {
    if (lines.length >= 6) return;
    const newLine = randomLine();
    setLines((prev) => {
      const next = [...prev, newLine];
      if (next.length === 6) setIsDone(true);
      return next;
    });
  };

  const hasMovingLines = useMemo(
    () => lines.some((line) => line?.moving),
    [lines]
  );

  const resultingLines = useMemo(
    () => (hasMovingLines ? flipLinesForResult(lines) : []),
    [hasMovingLines, lines]
  );
  const primaryHex = useMemo(
    () => (lines.length === 6 ? chooseByLines(lines, all) : null),
    [lines, all]
  );
  const resultingHex = useMemo(
    () =>
      hasMovingLines && resultingLines.length === 6
        ? chooseByLines(resultingLines, all)
        : null,
    [hasMovingLines, resultingLines, all]
  );

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.space(2.5),
            paddingBottom: theme.space(3),
            paddingTop: theme.space(2.5) + screenTopPadding,
          }}
        >
          <View style={stylesCast.headerRow}>
            <HelpButton onPress={openGuidance} />
            <Text style={stylesCast.sectionTitle}>Casting</Text>
          </View>
          {question ? (
            <>
              <Text style={stylesCast.subText}>Question</Text>
              <View style={stylesCast.questionBox}>
                <Text style={stylesCast.questionText}>{question}</Text>
              </View>
            </>
          ) : null}

          <SectionCard>
            <Text style={stylesCast.sectionHeader}>Lines</Text>
            <View style={{ marginTop: 6 }}>
              {[...Array(6)].map((_, topIdx) => {
                const storeIdx = 5 - topIdx;
                const line = lines[storeIdx];
                if (!line) {
                  return <View key={topIdx} style={{ height: 22, marginVertical: 5 }} />;
                }
                return (
                  <AnimatedLine
                    key={topIdx}
                    v={line.v}
                    moving={line.moving}
                    delay={topIdx * 100}
                  />
                );
              })}
            </View>
            {!isDone ? (
              <GoldButton
                onPress={handleCastLine}
                icon={<Ionicons name="hand-left-outline" size={18} color={palette.white} />}
              >
                Cast Line {lines.length + 1}/6
              </GoldButton>
            ) : null}
          </SectionCard>

          {!isDone && lines.length === 0 ? (
            premiumMember ? (
              <GoldButton
                full
                kind="secondary"
                onPress={() =>
                  navigation.navigate("ManualCasting", {
                    question,
                  })
                }
                icon={<Ionicons name="keypad-outline" size={18} color={palette.gold} />}
              >
                Manual Casting
              </GoldButton>
            ) : (
              <UpgradeCallout
                title="Manual casting is a Premium ritual"
                description={
                  premiumPriceString
                    ? `Unlock tactile casting methods, AI summaries, and deeper insights with Premium for ${premiumPriceString} per month.`
                    : "Unlock tactile casting methods, AI summaries, and deeper insights with Premium membership."
                }
                onUpgrade={startPremiumPurchase}
                icon="keypad-outline"
              />
            )
          ) : null}

          {isDone ? (
            <GoldButton
              kind="secondary"
              onPress={() =>
                navigation.replace("Results", {
                  question,
                  primary: primaryHex,
                  resulting: hasMovingLines ? resultingHex : null,
                  primaryLines: lines,
                  resultingLines: hasMovingLines ? resultingLines : [],
                })
              }
              icon={<Ionicons name="book-outline" size={18} color={palette.gold} />}
            >
              View Results
            </GoldButton>
          ) : null}
        </ScrollView>
        <SimpleGuidanceModal
          visible={guidanceVisible}
          onClose={closeGuidance}
          onLearnMore={handleGuidanceLearnMore}
          text={GUIDANCE_MESSAGES.Casting}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

function ManualCastingScreen({ route, navigation }) {
  const { isPremium } = useAuth();
  const premiumMember = Boolean(isPremium);
  const { premiumPriceString } = useRevenueCat();
  const startPremiumPurchase = usePremiumPurchaseFlow();
  const question = route.params?.question ?? null;
  const [inputs, setInputs] = useState(["", "", "", "", "", ""]);
  const [hexagrams, setHexagrams] = useState([]);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!premiumMember) return;
    loadHexagrams().then(setHexagrams);
  }, [premiumMember]);

  if (!premiumMember) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.space(2.5),
              paddingBottom: theme.space(3),
              paddingTop: theme.space(2.5) + screenTopPadding,
            }}
          >
            <UpgradeCallout
              title="Manual casting requires Premium"
              description={
                premiumPriceString
                  ? `Experience the full ritual of the I Ching with manual casting, AI-guided summaries, and advanced analytics for ${premiumPriceString} per month.`
                  : "Experience the full ritual of the I Ching with manual casting, AI-guided summaries, and advanced analytics when you upgrade."
              }
              onUpgrade={startPremiumPurchase}
              icon="sparkles-outline"
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const manualLines = useMemo(
    () => inputs.map((value) => lineFromManualValue(value)),
    [inputs]
  );

  const isComplete = manualLines.every((line) => line);

  const handleChange = (index, text) => {
    let value = text.replace(/[^0-9]/g, "");
    if (value.length > 1) value = value.slice(-1);
    if (!["6", "7", "8", "9"].includes(value)) {
      value = "";
    }
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleViewResult = () => {
    if (!isComplete) return;
    const resulting = flipLinesForResult(manualLines);
    const primaryHex = chooseByLines(manualLines, hexagrams);
    const resultingHex = resulting.length === 6 ? chooseByLines(resulting, hexagrams) : null;
    navigation.replace("Results", {
      question,
      primary: primaryHex,
      resulting: resultingHex,
      primaryLines: manualLines,
      resultingLines: resulting,
    });
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={stylesManual.container}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => navigation.goBack()}
              style={stylesManual.backButton}
            >
              <Ionicons name="chevron-back" size={20} color={palette.ink} />
              <Text style={stylesManual.backLabel}>Back</Text>
            </Pressable>

            <Text style={stylesManual.title}>Manual Casting</Text>
            <Text style={stylesManual.subtitle}>
              Enter six values (6, 7, 8, or 9) to form your hexagram lines.
            </Text>

            {question ? (
              <View style={stylesManual.questionBox}>
                <Text style={stylesManual.questionLabel}>Question</Text>
                <Text style={stylesManual.questionText}>{question}</Text>
              </View>
            ) : null}

            <SectionCard>
              <Text style={stylesManual.sectionHeader}>Lines</Text>
              <View style={{ marginTop: 6 }}>
                {[...Array(6)].map((_, topIdx) => {
                  const storeIdx = 5 - topIdx;
                  const line = manualLines[storeIdx];
                  if (!line) {
                    return (
                      <View key={topIdx} style={{ height: 22, marginVertical: 5 }} />
                    );
                  }
                  return <Line key={topIdx} v={line.v} moving={line.moving} />;
                })}
              </View>
              <Text style={stylesManual.helperText}>Use 6 or 9 for moving lines.</Text>
            </SectionCard>

            <View style={stylesManual.inputsRow}>
              {inputs.map((value, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  value={value}
                  onChangeText={(text) => handleChange(index, text)}
                  keyboardType="number-pad"
                  maxLength={1}
                  placeholder="-"
                  placeholderTextColor={palette.inkMuted}
                  style={stylesManual.input}
                  returnKeyType={index === inputs.length - 1 ? "done" : "next"}
                />
              ))}
            </View>

            {isComplete ? (
              <GoldButton
                full
                kind="secondary"
                onPress={handleViewResult}
                icon={<Ionicons name="book-outline" size={18} color={palette.gold} />}
              >
                View Result
              </GoldButton>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const stylesCast = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: 12,
    textAlign: "right",
    alignSelf: "flex-end",
  },
  subText: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
    marginBottom: 6,
  },
  questionBox: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: theme.radius,
    padding: theme.space(1.5),
    marginBottom: theme.space(1),
  },
  questionText: {
    fontFamily: fonts.body,
    color: palette.ink,
  },
  sectionHeader: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: palette.ink,
    marginBottom: 6,
  },
});

const stylesManual = StyleSheet.create({
  container: {
    padding: theme.space(2.5),
    paddingBottom: theme.space(4),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1),
    paddingVertical: 6,
    marginBottom: theme.space(1.5),
  },
  backLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    color: palette.ink,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    marginTop: 6,
    marginBottom: theme.space(2),
    lineHeight: 22,
  },
  questionBox: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: theme.radius,
    padding: theme.space(1.5),
    marginBottom: theme.space(2),
  },
  questionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.ink,
    marginBottom: 6,
  },
  questionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    lineHeight: 22,
  },
  sectionHeader: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: palette.ink,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: theme.space(1),
  },
  inputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.space(1.5),
    marginBottom: theme.space(2.5),
  },
  input: {
    width: 48,
    height: 54,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    textAlign: "center",
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: palette.ink,
  },
});

// 🧘 Results screen
function ResultsScreen({ navigation, route }) {
    const { question, primary, resulting, primaryLines, resultingLines } =
      route.params || {};
    const [tab, setTab] = useState("Primary");
    const [show, setShow] = useState(false);
    const [selected, setSelected] = useState(null);
    const isFocused = useIsFocused();
    const { addEntry } = useJournal();
    const {
      visible: primaryGuidanceVisible,
      hasSeenGuidance: hasSeenPrimaryGuidance,
      openGuidance: openPrimaryGuidance,
      closeGuidance: closePrimaryGuidance,
      hasLoaded: primaryGuidanceLoaded,
    } = useGuidanceOnce("hasSeenGuidance_Primary", { autoShow: false });
    const {
      visible: resultingGuidanceVisible,
      hasSeenGuidance: hasSeenResultingGuidance,
      openGuidance: openResultingGuidance,
      closeGuidance: closeResultingGuidance,
      hasLoaded: resultingGuidanceLoaded,
    } = useGuidanceOnce("hasSeenGuidance_Resulting", { autoShow: false });

    useEffect(() => {
      if (
        isFocused &&
        primaryGuidanceLoaded &&
        tab === "Primary" &&
        !hasSeenPrimaryGuidance &&
        !primaryGuidanceVisible
      ) {
        openPrimaryGuidance();
      }
      if (
        isFocused &&
        resultingGuidanceLoaded &&
        tab === "Resulting" &&
        !hasSeenResultingGuidance &&
        !resultingGuidanceVisible
      ) {
        openResultingGuidance();
      }
    }, [
      primaryGuidanceLoaded,
      resultingGuidanceLoaded,
      hasSeenPrimaryGuidance,
      hasSeenResultingGuidance,
      openPrimaryGuidance,
      openResultingGuidance,
      primaryGuidanceVisible,
      resultingGuidanceVisible,
      isFocused,
      tab,
    ]);

    useFocusEffect(
      useCallback(() => {
        if (
          isFocused &&
          primaryGuidanceLoaded &&
          !hasSeenPrimaryGuidance &&
          !primaryGuidanceVisible &&
          tab === "Primary"
        ) {
          openPrimaryGuidance();
        }
        if (
          isFocused &&
          resultingGuidanceLoaded &&
          !hasSeenResultingGuidance &&
          !resultingGuidanceVisible &&
          tab === "Resulting"
        ) {
          openResultingGuidance();
        }
      }, [
        primaryGuidanceLoaded,
        resultingGuidanceLoaded,
        hasSeenPrimaryGuidance,
        hasSeenResultingGuidance,
        openPrimaryGuidance,
        openResultingGuidance,
        primaryGuidanceVisible,
        resultingGuidanceVisible,
        isFocused,
        tab,
      ])
    );

    const handleGuidanceLearnMore = useCallback(() => {
      if (tab === "Resulting") {
        closeResultingGuidance();
      } else {
        closePrimaryGuidance();
      }
      navigation.navigate("Guide");
    }, [closePrimaryGuidance, closeResultingGuidance, navigation, tab]);

  const openReading = (hex, lines, variant) => {
    if (!hex) return;
    const changingSummaries =
      variant === "primary" ? deriveChangingLineSummaries(hex, lines || []) : [];
    setSelected({ hex, lines, variant, changingSummaries });
    setShow(true);
  };

  const handleJournal = async () => {
    if (!primary) {
      Alert.alert("Still casting", "Complete the casting before journaling.");
      return;
    }
    const newId = await addEntry({
      question,
      primary,
      resulting,
      primaryLines,
      resultingLines,
    });
    if (!newId) {
      return;
    }
    navigation.popToTop();
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("Journal", {
        screen: "JournalList",
        params: { focusId: newId },
      });
    }
  };

    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.space(2.5),
              paddingBottom: theme.space(3),
              paddingTop: theme.space(2.5) + screenTopPadding,
            }}
          >
            <View style={stylesResults.headerRow}>
              <HelpButton
                onPress={
                  tab === "Resulting" ? openResultingGuidance : openPrimaryGuidance
                }
              />
              <Text style={stylesResults.sectionTitle}>Results</Text>
            </View>
            {question ? (
              <>
                <Text style={stylesResults.subText}>Question</Text>
                <View style={stylesResults.questionBox}>
                  <Text style={stylesResults.questionText}>{question}</Text>
                </View>
              </>
            ) : null}

            <View style={stylesResults.tabs}>
              {["Primary", "Resulting"].map((tabName) => {
                const active = tab === tabName;
                return (
                  <Pressable
                    key={tabName}
                    onPress={() => setTab(tabName)}
                    style={[stylesResults.tabBtn, active && { backgroundColor: palette.gold }]}
                  >
                    <Text style={[stylesResults.tabText, active && { color: palette.white }]}>
                      {tabName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === "Primary" ? (
              <HexagramCard
                item={primary}
                onPress={() => openReading(primary, primaryLines, "primary")}
              />
            ) : resulting ? (
              <HexagramCard
                item={resulting}
                onPress={() => openReading(resulting, resultingLines, "resulting")}
              />
            ) : (
              <View style={stylesResults.noResultingBox}>
                <Text style={stylesResults.noResultingTitle}>
                  No changing lines — no resulting hexagram.
                </Text>
              </View>
            )}

            {primary ? (
              <GoldButton
                full
                onPress={handleJournal}
                icon={<Ionicons name="create-outline" size={18} color={palette.white} />}
              >
                Add to Journal
              </GoldButton>
            ) : null}

            <ReadingModal
              visible={show}
              onClose={() => setShow(false)}
              hex={selected?.hex}
              lines={selected?.lines || []}
              variant={selected?.variant}
              changingSummaries={selected?.changingSummaries || []}
            />
          </ScrollView>
          <SimpleGuidanceModal
            visible={primaryGuidanceVisible}
            onClose={closePrimaryGuidance}
            onLearnMore={handleGuidanceLearnMore}
            text={GUIDANCE_MESSAGES.Primary}
          />
          <SimpleGuidanceModal
            visible={resultingGuidanceVisible}
            onClose={closeResultingGuidance}
            onLearnMore={handleGuidanceLearnMore}
            text={GUIDANCE_MESSAGES.Resulting}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

const stylesResults = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(1.5),
  },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: 12,
    textAlign: "right",
    alignSelf: "flex-end",
  },
  subText: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
    marginBottom: 6,
  },
  questionBox: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: theme.radius,
    padding: theme.space(1.5),
    marginBottom: theme.space(1),
  },
  questionText: {
    fontFamily: fonts.body,
    color: palette.ink,
  },
  noResultingBox: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: theme.radius,
    padding: theme.space(1.5),
    marginBottom: theme.space(1),
    alignItems: "center",
  },
  noResultingTitle: {
    fontFamily: fonts.bodyBold,
    color: palette.ink,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 4,
    marginBottom: theme.space(1.5),
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.radius,
  },
  tabText: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
  },
});

// 📚 Library screen
function LibraryScreen({ navigation }) {
  const [hexagrams, setHexagrams] = useState([]);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const {
    visible: guidanceVisible,
    hasSeenGuidance,
    openGuidance,
    closeGuidance,
    hasLoaded: guidanceLoaded,
  } = useGuidanceOnce("hasSeenGuidance_Library");

  const handleGuidanceLearnMore = useCallback(() => {
    closeGuidance();
    navigation?.navigate("Guide");
  }, [closeGuidance, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
        openGuidance();
      }
    }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, openGuidance])
  );

  useEffect(() => {
    if (isFocused && guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
      openGuidance();
    }
  }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, isFocused, openGuidance]);

  useEffect(() => {
    let active = true;
    loadHexagrams()
      .then((data) => {
        if (!active) return;
        const ordered = (data || [])
          .filter((item) => {
            const number = item?.number;
            return typeof number === "number" && number >= 1 && number <= 64;
          })
          .sort((a, b) => (a.number || 0) - (b.number || 0));
        console.log("Library hexagrams prepared:", ordered.length);
        setHexagrams(ordered);
      })
      .catch((error) => console.log("Library load error:", error));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return hexagrams;
    return hexagrams.filter((item) => {
      const name = item?.name?.toLowerCase() || "";
      const number = item?.number ? String(item.number) : "";
      return name.includes(term) || number.includes(term);
    });
  }, [hexagrams, search]);

  const openHexagram = (hex) => {
    if (!hex) return;
    const summaries = fullChangingLineSummaries(hex);
    setSelected({ hex, summaries });
    setShow(true);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={stylesLibrary.container}>
          <View style={stylesLibrary.content}>
            <View style={stylesLibrary.header}>
              <Text style={stylesLibrary.title}>Library</Text>
              <Text style={stylesLibrary.subtitle}>
                Explore each of the 64 hexagrams at your own pace.
              </Text>
            </View>
            <View style={stylesLibrary.searchBar}>
              <Ionicons name="search" size={18} color={palette.inkMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or number"
                placeholderTextColor={palette.inkMuted}
                style={stylesLibrary.searchInput}
              />
            </View>
            <View style={stylesLibrary.carouselWrapper}>
              <FlatList
                data={filtered}
                keyExtractor={(item) => `${item.number || item.name}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={stylesLibrary.flatList}
                contentContainerStyle={stylesLibrary.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      stylesLibrary.cardSlot,
                      { width: Math.max(240, width - theme.space(5)) },
                    ]}
                  >
                    <HexagramCard
                      item={item}
                      onPress={() => openHexagram(item)}
                    />
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={stylesLibrary.loadingText}>
                    {hexagrams.length && search.trim()
                      ? "No matches found."
                      : "Loading library…"}
                  </Text>
                }
              />
            </View>
          </View>
        </View>
        <ReadingModal
          visible={show}
          onClose={() => setShow(false)}
          hex={selected?.hex}
          lines={[]}
          variant="library"
          changingSummaries={selected?.summaries || []}
        />
        <SimpleGuidanceModal
          visible={guidanceVisible}
          onClose={closeGuidance}
          onLearnMore={handleGuidanceLearnMore}
          text={GUIDANCE_MESSAGES.Library}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const stylesLibrary = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.space(2.5),
    paddingBottom: theme.space(3),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: theme.space(3),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: 10,
    marginBottom: theme.space(2),
  },
  searchInput: {
    marginLeft: theme.space(1),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    flex: 1,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
  },
  carouselWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  flatList: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: theme.space(0.5),
    paddingVertical: theme.space(1),
  },
  cardSlot: {
    marginRight: theme.space(1.75),
  },
  loadingText: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
  },
});

// 📝 Journal list
const formatDate = (date) => {
  try {
    return date.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    return "";
  }
};

function JournalListScreen({ navigation, route }) {
  const { entries, confirmDelete } = useJournal();
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const listRef = useRef(null);
  const isFocused = useIsFocused();
  const {
    visible: guidanceVisible,
    hasSeenGuidance,
    openGuidance,
    closeGuidance,
    hasLoaded: guidanceLoaded,
  } = useGuidanceOnce("hasSeenGuidance_Journal");

  const handleGuidanceLearnMore = useCallback(() => {
    closeGuidance();
    navigation.navigate("Guide");
  }, [closeGuidance, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
        openGuidance();
      }
    }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, openGuidance])
  );

  useEffect(() => {
    if (isFocused && guidanceLoaded && !hasSeenGuidance && !guidanceVisible) {
      openGuidance();
    }
  }, [guidanceLoaded, guidanceVisible, hasSeenGuidance, isFocused, openGuidance]);

  const goHome = () => {
    const tabNav = navigation.getParent();
    if (tabNav) {
      tabNav.navigate("Home", {
        screen: "HomeRoot",
        params: { resetQuestion: true },
      });
    }
  };

  useEffect(() => {
    const focusId = route?.params?.focusId;
    if (focusId) {
      setHighlightId(focusId);
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      navigation.setParams({ focusId: undefined });
      const timeout = setTimeout(() => setHighlightId(null), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [route?.params?.focusId, navigation]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      return (
        entry.question?.toLowerCase().includes(term) ||
        entry.primary?.name?.toLowerCase().includes(term) ||
        entry.resulting?.name?.toLowerCase().includes(term)
      );
    });
  }, [entries, search]);

  const renderItem = ({ item }) => {
    const questionText = item.question?.trim()
      ? item.question.trim()
      : item.primary?.name || "Untitled Reading";
    const primaryLine = item.primary
      ? `Primary · Hexagram ${item.primary.number ?? "--"} · ${item.primary.name ?? "Unknown"}`
      : "Primary hexagram unavailable";
    const highlight = item.id === highlightId;

    return (
      <Pressable
        onPress={() => navigation.navigate("JournalDetail", { id: item.id })}
        style={({ pressed }) => [
          stylesJournal.row,
          highlight && stylesJournal.rowHighlight,
          pressed && { opacity: 0.92 },
        ]}
      >
        <HexagonThumbnail uri={item.primary?.imageUrl} hexNumber={item.primary?.number} />
        <View style={stylesJournal.rowContent}>
          <Text style={stylesJournal.rowTitle} numberOfLines={2}>
            {questionText}
          </Text>
          <Text style={stylesJournal.rowMeta} numberOfLines={1}>
            {primaryLine}
          </Text>
          <Text style={stylesJournal.rowDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            confirmDelete(item.id);
          }}
          hitSlop={8}
          style={({ pressed }) => [stylesJournal.deleteButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={20} color={palette.goldDeep} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={stylesJournal.container}>
          <View style={stylesJournal.headerRow}>
            <HelpButton onPress={openGuidance} />
            <Text style={stylesJournal.title}>Journal</Text>
          </View>
          <View style={stylesJournal.searchBar}>
            <Ionicons name="search" size={18} color={palette.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={palette.inkMuted}
              style={stylesJournal.searchInput}
            />
          </View>
          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: theme.space(1) }} />}
            style={stylesJournal.list}
            contentContainerStyle={stylesJournal.listContent}
            ListEmptyComponent={
              <View style={stylesJournal.emptyState}>
                <Ionicons name="book-outline" size={48} color={palette.gold} />
                <Text style={stylesJournal.emptyTitle}>No entries yet</Text>
                <Text style={stylesJournal.emptyBody}>
                  Save a reading from the Results screen to begin your journal.
                </Text>
              </View>
            }
          />
          <GoldButton
            full
            onPress={goHome}
            icon={<Ionicons name="sparkles-outline" size={18} color={palette.white} />}
          >
            Ask Another Question
          </GoldButton>
        </View>
        <SimpleGuidanceModal
          visible={guidanceVisible}
          onClose={closeGuidance}
          onLearnMore={handleGuidanceLearnMore}
          text={GUIDANCE_MESSAGES.Journal}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const stylesJournal = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.space(2.5),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(1.5),
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: theme.space(2),
    textAlign: "right",
    alignSelf: "flex-end",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1.5),
    paddingVertical: 10,
    marginBottom: theme.space(2),
  },
  searchInput: {
    marginLeft: theme.space(1),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    flex: 1,
  },
  list: {
    flex: 1,
    alignSelf: "stretch",
  },
  listContent: {
    paddingBottom: theme.space(4),
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
  },
  rowHighlight: {
    borderColor: palette.gold,
    backgroundColor: "#FDF7E8",
  },
  rowContent: {
    flex: 1,
    marginLeft: theme.space(1.5),
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginBottom: 2,
  },
  rowDate: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
  },
  deleteButton: {
    padding: theme.space(0.5),
  },
  emptyState: {
    alignItems: "center",
    marginTop: theme.space(6),
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: palette.ink,
    marginTop: theme.space(1),
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    textAlign: "center",
    marginTop: theme.space(1),
    paddingHorizontal: theme.space(2),
  },
});

// 🗒️ Journal detail
const wordCount = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

function JournalDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { session, isPremium: premiumStatus } = useAuth();
  const userId = session?.user?.id;
  const { entries, updateEntryNote, setEntryAiSummary, fetchEntryAiSummary } =
    useJournal();
  const { premiumPriceString } = useRevenueCat();
  const startPremiumPurchase = usePremiumPurchaseFlow();
  const entry = useMemo(() => entries.find((item) => item.id === id), [entries, id]);
  const [note, setNote] = useState(entry?.note || "");
  const [limitReached, setLimitReached] = useState(false);
  const [modal, setModal] = useState(null);
  const [aiSummary, setAiSummary] = useState(entry?.aiSummary || "");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [hasRequestedInsight, setHasRequestedInsight] = useState(
    Boolean(entry?.aiSummary)
  );
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const premiumMember = Boolean(premiumStatus);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);
  const premiumMonthlyLimit = 100;

  useEffect(() => {
    if (!entry) {
      Alert.alert("Not found", "This journal entry was removed.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  }, [entry, navigation]);

  useEffect(() => {
    if (entry) {
      setNote(entry.note || "");
      setAiSummary(entry.aiSummary || "");
      setHasRequestedInsight(Boolean(entry.aiSummary));
      setSummaryExpanded(false);
    }
  }, [entry?.note, entry?.aiSummary, entry?.id]);

  useEffect(() => {
    if (!premiumMember || !userId) return;
    let active = true;
    const loadUsage = async () => {
      setAiUsageLoading(true);
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count, error } = await supabase
          .from("JournalEntries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .not("ai_summary", "is", null)
          .gte("created_at", startOfMonth.toISOString());
        if (error) throw error;
        if (active) {
          setAiUsageCount(count || 0);
        }
      } catch (usageError) {
        console.log("AI usage count error:", usageError?.message || usageError);
      } finally {
        if (active) {
          setAiUsageLoading(false);
        }
      }
    };
    loadUsage();
    return () => {
      active = false;
    };
  }, [premiumMember, userId, entry?.id]);

  if (!entry) {
    return null;
  }

  const handleNoteChange = (text) => {
    const count = wordCount(text);
    if (count > 1000) {
      setLimitReached(true);
      return;
    }
    setLimitReached(false);
    setNote(text);
    updateEntryNote(entry.id, text);
  };

  const openReading = (hex, lines, variant) => {
    if (!hex) return;
    const changingSummaries =
      variant === "primary" ? deriveChangingLineSummaries(hex, lines || []) : [];
    setModal({ hex, lines, variant, changingSummaries });
  };

  const handleAiInsight = async () => {
    // Prevent duplicate requests while the oracle is already being consulted
    if (summaryLoading) return;

    // Require authentication before invoking the oracle
    if (!userId || !entry?.id) {
      Alert.alert("Sign in required", "Log in to request an oracle insight.");
      return;
    }

    if (!premiumMember) {
      Alert.alert(
        "Premium required",
        "Upgrade to Premium to receive monthly AI oracle insights."
      );
      navigation.navigate("Premium");
      return;
    }

    if (premiumMember && aiUsageCount >= premiumMonthlyLimit) {
      Alert.alert(
        "Monthly limit reached",
        "You have used all 100 Premium AI insights this month."
      );
      return;
    }

    if (premiumMember && aiUsageLoading) {
      Alert.alert(
        "Please wait",
        "Checking your remaining AI insight allowance."
      );
      return;
    }

    setSummaryError("");
    setSummaryLoading(true);

    try {
      // Reuse any cached AI insight before making a new request
      let summaryText = aiSummary || entry.aiSummary || "";
      let generatedFresh = false;

      if (!summaryText) {
        try {
          summaryText = await fetchEntryAiSummary(entry.id);
        } catch (lookupError) {
          console.log(
            "AI summary lookup error:",
            lookupError?.message || lookupError
          );
        }
      }

      if (!summaryText) {
        const payload = { entry_id: entry.id, user_id: userId };
        console.log("Invoking AI summary with payload:", payload);

        const accessToken = session?.access_token || SUPABASE_ANON_KEY;
        if (!accessToken) {
          throw new Error("Missing access token");
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/ai_summary`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(payload),
          }
        );

        const raw = await response.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch (parseError) {
          console.log("AI summary parse error:", raw);
          throw new Error("Unexpected response from oracle");
        }

        console.log("AI summary response status:", response.status);
        console.log("AI summary data:", data);

        summaryText = data?.summary || data?.message || "";

        if (!response.ok || !summaryText) {
          throw new Error(data?.error || "Unable to receive insight.");
        }

        Alert.alert("Insight received!", "Your AI oracle summary is ready.");
        generatedFresh = true;
      }

      setSummaryError("");
      setAiSummary(summaryText);
      setEntryAiSummary(entry.id, summaryText);
      setHasRequestedInsight(true);
      setSummaryExpanded(false);
      if (generatedFresh) {
        setAiUsageCount((prev) => {
          const next = (prev || 0) + 1;
          return next > premiumMonthlyLimit ? premiumMonthlyLimit : next;
        });
      }
    } catch (error) {
      console.log("AI summary error:", error?.message || error);
      setSummaryError("Unable to receive insight. Please try again.");
      Alert.alert("Unable to receive insight. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={stylesDetail.container}
        >
          <Pressable onPress={() => navigation.goBack()} style={stylesDetail.backButton}>
            <Ionicons name="chevron-back" size={20} color={palette.ink} />
            <Text style={stylesDetail.backLabel}>Back</Text>
          </Pressable>
          <Text style={stylesDetail.title}>Journal Entry</Text>
          <Text style={stylesDetail.timestamp}>{formatDate(entry.createdAt)}</Text>

          {entry.question ? (
            <View style={stylesDetail.questionBox}>
              <Text style={stylesDetail.questionLabel}>Question</Text>
              <Text style={stylesDetail.questionText}>{entry.question}</Text>
            </View>
          ) : null}

          <View style={stylesDetail.hexList}>
            <View style={stylesDetail.hexRow}>
              <HexagonThumbnail
                uri={entry.primary?.imageUrl}
                hexNumber={entry.primary?.number}
                size={60}
              />
              <View style={stylesDetail.hexContent}>
                <Text style={stylesDetail.hexTitle}>{entry.primary?.name || "Primary"}</Text>
                <Text style={stylesDetail.hexSubtitle}>
                  Hexagram {entry.primary?.number ?? "--"}
                </Text>
              </View>
              <Text
                style={stylesDetail.viewLink}
                onPress={() => openReading(entry.primary, entry.primaryLines, "primary")}
              >
                View
              </Text>
            </View>
            {entry.resulting ? (
              <View style={stylesDetail.hexRow}>
                <HexagonThumbnail
                  uri={entry.resulting?.imageUrl}
                  hexNumber={entry.resulting?.number}
                  size={60}
                />
                <View style={stylesDetail.hexContent}>
                  <Text style={stylesDetail.hexTitle}>{entry.resulting?.name || "Resulting"}</Text>
                  <Text style={stylesDetail.hexSubtitle}>
                    Hexagram {entry.resulting?.number ?? "--"}
                  </Text>
                </View>
                <Text
                  style={stylesDetail.viewLink}
                  onPress={() => openReading(entry.resulting, entry.resultingLines, "resulting")}
                >
                  View
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={stylesDetail.noteLabel}>Note</Text>
          <TextInput
            value={note}
            onChangeText={handleNoteChange}
            placeholder="Write a note..."
            placeholderTextColor={palette.inkMuted}
            multiline
            textAlignVertical="top"
            style={stylesDetail.noteInput}
          />
          <Text style={stylesDetail.wordCount}>
            {wordCount(note)}/1000 words{limitReached ? " • Limit reached" : ""}
          </Text>

          {premiumMember ? (
            <>
              <GoldButton
                full
                onPress={handleAiInsight}
                disabled={summaryLoading || aiUsageCount >= premiumMonthlyLimit}
                icon={<Ionicons name="sparkles-outline" size={18} color={palette.white} />}
              >
                AI Oracle Insight
              </GoldButton>
              <Text style={stylesDetail.aiQuotaText}>
                {aiUsageLoading
                  ? "Checking your monthly insight allowance…"
                  : `${aiUsageCount}/${premiumMonthlyLimit} insights used this month`}
              </Text>
              {aiUsageCount >= premiumMonthlyLimit ? (
                <Text style={stylesDetail.aiLimitText}>
                  Monthly limit reached. New insights unlock next month.
                </Text>
              ) : null}
            </>
          ) : (
            <UpgradeCallout
              title="Invite the AI Oracle"
              description={
                premiumPriceString
                  ? `Premium members receive up to 100 personalised AI summaries every month from ${premiumPriceString} per month. Upgrade to unlock this guidance.`
                  : "Premium members receive up to 100 personalised AI summaries every month. Upgrade to unlock this guidance."
              }
              onUpgrade={startPremiumPurchase}
              icon="sparkles-outline"
            />
          )}

          {summaryLoading ? (
            <View style={stylesDetail.aiCard}>
              <ActivityIndicator color={palette.goldDeep} size="small" />
              <Text style={stylesDetail.aiStatus}>Consulting the Oracle…</Text>
            </View>
          ) : null}

          {!summaryLoading && summaryError ? (
            <View style={[stylesDetail.aiCard, stylesDetail.aiErrorCard]}>
              <Text style={stylesDetail.aiErrorText}>{summaryError}</Text>
            </View>
          ) : null}

          {!summaryLoading && hasRequestedInsight && aiSummary ? (
            <View style={stylesDetail.aiCard}>
              <Text style={stylesDetail.aiCardTitle}>AI Oracle Insight</Text>
              <Text
                style={stylesDetail.aiCardText}
                numberOfLines={summaryExpanded ? undefined : 6}
              >
                {aiSummary}
              </Text>
              {aiSummary ? (
                <Pressable
                  onPress={() => setSummaryExpanded((prev) => !prev)}
                  style={stylesDetail.aiToggle}
                >
                  <Text style={stylesDetail.aiToggleText}>
                    {summaryExpanded ? "Read less" : "Read more"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
        <ReadingModal
          visible={!!modal}
          onClose={() => setModal(null)}
          hex={modal?.hex}
          lines={modal?.lines || []}
          variant={modal?.variant}
          changingSummaries={modal?.changingSummaries || []}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const stylesDetail = StyleSheet.create({
  container: {
    padding: theme.space(2.5),
    paddingBottom: theme.space(4),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1),
    paddingVertical: 6,
    marginBottom: theme.space(1.5),
  },
  backLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    color: palette.ink,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
  },
  timestamp: {
    fontFamily: fonts.body,
    color: palette.inkMuted,
    marginTop: 4,
    marginBottom: theme.space(2),
  },
  questionBox: {
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
    marginBottom: theme.space(2),
  },
  questionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.ink,
    marginBottom: 6,
  },
  questionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    lineHeight: 22,
  },
  hexList: {
    marginBottom: theme.space(2),
  },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
    marginBottom: theme.space(1),
  },
  hexContent: {
    flex: 1,
    marginLeft: theme.space(1.5),
  },
  hexTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
  },
  hexSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 2,
  },
  viewLink: {
    fontFamily: fonts.bodyBold,
    color: palette.goldDeep,
  },
  noteLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 160,
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
  },
  wordCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 6,
    textAlign: "right",
  },
  aiCard: {
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: theme.space(1.5),
    marginTop: theme.space(1.5),
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  aiQuotaText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: theme.space(0.75),
  },
  aiLimitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: palette.goldDeep,
    marginTop: 4,
  },
  aiCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
    marginBottom: 6,
  },
  aiCardText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    lineHeight: 22,
  },
  aiToggle: {
    alignSelf: "flex-end",
    marginTop: theme.space(0.5),
  },
  aiToggleText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.goldDeep,
  },
  aiStatus: {
    marginTop: theme.space(1),
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    textAlign: "center",
  },
  aiErrorCard: {
    borderColor: "#F2B8B5",
    backgroundColor: "#FFF5F4",
  },
  aiErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#A43D37",
  },
});

// 📘 Guide screen
function GuideScreen({ navigation }) {
  const [tab, setTab] = useState("Guidance");
  const tabs = ["Guidance", "History", "Glossary"];

  const renderGuidance = () => (
    <SectionCard>
      <Text style={stylesGuide.cardTitle}>Guidance</Text>
      <Text style={stylesGuide.paragraph}>
        <Text style={stylesGuide.bold}>For App Guidance see below.</Text>
      </Text>
      <Text style={stylesGuide.paragraph}>See the <Text style={stylesGuide.bold}>Glossary</Text> for key terms.</Text>
      <Text style={stylesGuide.paragraph}>Visit the <Text style={stylesGuide.bold}>History</Text> tab for a short background on the I Ching.</Text>

      <Text style={stylesGuide.sectionSubtitle}>How It Works</Text>
      <Text style={stylesGuide.paragraph}>
        The system is built on 64 hexagrams, each a figure of six lines (broken for yin, solid for yang).
      </Text>
      <Text style={stylesGuide.paragraph}>Each hexagram represents a pattern, principle, or state of change.</Text>
      <Text style={stylesGuide.paragraph}>
        When you “cast” the I Ching (traditionally with coins or yarrow stalks), you form a primary hexagram describing the present situation.
      </Text>
      <Text style={stylesGuide.paragraph}>
        Some lines may be marked as changing, creating a resulting hexagram that points to where things may be moving.
      </Text>

      <Text style={stylesGuide.sectionSubtitle}>Step by Step</Text>
      <Text style={stylesGuide.paragraph}>
        <Text style={stylesGuide.bold}>Home –</Text> Meditate with a sincere, respectful intention on your question. Enter your question.
      </Text>
      <Text style={stylesGuide.paragraph}>
        <Text style={stylesGuide.bold}>Cast –</Text> Press the Cast button 6 times to reveal your hexagram.
      </Text>
      <Text style={stylesGuide.paragraph}>
        <Text style={stylesGuide.bold}>Reflect –</Text> Read the results and journal your insights.
      </Text>
      <Text style={stylesGuide.paragraph}>
        <Text style={stylesGuide.bold}>Return –</Text> Revisit your Journal to deepen understanding.
      </Text>
    </SectionCard>
  );

  const renderHistory = () => (
    <SectionCard>
      <Text style={stylesGuide.cardTitle}>The I Ching – An Overview</Text>
      <Text style={stylesGuide.paragraph}>
        The I Ching (易經), or Book of Changes, is one of the oldest works of wisdom literature in the world, with roots in ancient China more than 3,000 years ago. It has been studied, consulted, and honored for centuries by philosophers, rulers, and everyday seekers.
      </Text>

      <Text style={stylesGuide.sectionSubtitle}>Core Idea</Text>
      <Text style={stylesGuide.paragraph}>
        The I Ching is not a book of fixed answers, but a guide to understanding change. It reflects the natural cycles of life — growth and decline, stillness and movement, yin and yang. By engaging with it, you invite perspective on your situation and the forces at play.
      </Text>

      <Text style={stylesGuide.sectionSubtitle}>Why Consult It</Text>
      <Text style={stylesGuide.paragraph}>
        The I Ching is not fortune-telling. It offers symbols, images, and reflections that invite you to think differently about your question, decision, or challenge. The wisdom comes from the dialogue you create between your intention and the text.
      </Text>

      <Text style={stylesGuide.sectionSubtitle}>Approach</Text>
      <Text style={stylesGuide.paragraph}>Begin with a sincere and focused intention.</Text>
      <Text style={stylesGuide.paragraph}>
        Read the hexagrams slowly, noticing the imagery and how it resonates with your life.
      </Text>
      <Text style={stylesGuide.paragraph}>
        Reflect rather than rush — the value is in the insights and connections you discover.
      </Text>

      <Text style={stylesGuide.sectionSubtitle}>In Essence</Text>
      <Text style={stylesGuide.paragraph}>
        The I Ching is a mirror of change. Used with respect and openness, it becomes a lifelong companion for clarity, reflection, and guidance.
      </Text>
    </SectionCard>
  );

  const renderGlossary = () => (
    <SectionCard>
      <Text style={stylesGuide.cardTitle}>Glossary</Text>
      {[
        {
          term: "I Ching (Book of Changes)",
          definition:
            "An ancient Chinese text used for divination and self-reflection, composed of hexagrams and commentaries.",
        },
        {
          term: "Hexagram (卦, guà)",
          definition:
            "A six-line figure made up of broken (yin) and unbroken (yang) lines. There are 64 possible hexagrams, each representing a situation, principle, or pattern of change.",
        },
        {
          term: "Yin (陰)",
          definition:
            "A broken line (– –), symbolizing receptivity, yielding, darkness, or the feminine principle.",
        },
        {
          term: "Yang (陽)",
          definition:
            "A solid line (—), symbolizing activity, strength, light, or the masculine principle.",
        },
        {
          term: "Cast",
          definition:
            "The act of consulting the I Ching, traditionally done with yarrow stalks or coins, to generate a hexagram based on chance and intention.",
        },
        {
          term: "Primary Hexagram",
          definition:
            "The initial hexagram you cast, it describes the present situation or main theme of your question.",
        },
        {
          term: "Resulting Hexagram",
          definition:
            "The hexagram formed when changing lines are transformed, offering insight into the direction of change or possible outcome.",
        },
        {
          term: "Changing Lines",
          definition:
            "Lines in a hexagram that shift from yin to yang (or vice versa), producing a second, or “resulting,” hexagram. These highlight the dynamic nature of the situation.",
        },
        {
          term: "Oracle",
          definition:
            "The role the I Ching plays as a source of wisdom — not prediction, but guidance and perspective.",
        },
      ].map((item) => (
        <View key={item.term} style={stylesGuide.glossaryItem}>
          <Text style={stylesGuide.glossaryTerm}>{item.term}</Text>
          <Text style={stylesGuide.paragraph}>{item.definition}</Text>
        </View>
      ))}
    </SectionCard>
  );

    const renderContent = () => {
      if (tab === "History") return renderHistory();
      if (tab === "Glossary") return renderGlossary();
      return renderGuidance();
    };

    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.space(2.5),
              paddingBottom: theme.space(3),
            paddingTop: theme.space(2.5) + screenTopPadding,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={stylesGuide.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={palette.ink} />
            <Text style={stylesGuide.backLabel}>Back</Text>
          </Pressable>
          <Text style={stylesGuide.sectionTitle}>Guide</Text>
          <View style={stylesGuide.tabRow}>
            {tabs.map((label) => {
              const active = tab === label;
              return (
                <Pressable
                  key={label}
                  onPress={() => setTab(label)}
                  style={[stylesGuide.tabButton, active && stylesGuide.tabButtonActive]}
                >
                  <Text
                    style={[stylesGuide.tabButtonText, active && stylesGuide.tabButtonTextActive]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const stylesGuide = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1),
    paddingVertical: 6,
    marginBottom: theme.space(1.5),
  },
  backLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    color: palette.ink,
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 4,
    marginBottom: theme.space(2),
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: palette.gold,
  },
  tabButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: palette.inkMuted,
  },
  tabButtonTextActive: {
    color: palette.white,
  },
  cardTitle: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: palette.ink,
    marginBottom: theme.space(1),
  },
  sectionSubtitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.ink,
    marginTop: theme.space(2),
    marginBottom: 6,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    lineHeight: 22,
    marginTop: 6,
  },
  glossaryItem: {
    marginTop: theme.space(1.5),
  },
  glossaryTerm: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.ink,
  },
  bold: {
    fontFamily: fonts.bodyBold,
    color: palette.ink,
  },
});

// 💎 Premium screen
function PremiumScreen({ navigation }) {
  const { isPremium: premiumStatus, subscriptionTier } = useAuth();
  const {
    packages,
    premiumPriceString,
    corePriceString,
    purchasePackage,
    restorePurchases,
    loading: transactionLoading,
    activeAction,
    activeTargetId,
    premiumActive,
    coreActive,
  } = useRevenueCat();
  const isPremiumMember = Boolean(premiumStatus || premiumActive);
  const startPremiumPurchase = usePremiumPurchaseFlow(
    "Welcome to Premium",
    "Your Premium access is now active. Enjoy the full experience!"
  );
  const currentTier = isPremiumMember
    ? "premium"
    : coreActive || subscriptionTier === "core"
    ? "core"
    : subscriptionTier || "core";

  const premiumPackageRef = packages?.premium;
  const corePackageRef = packages?.core;
  const premiumPackageId =
    premiumPackageRef?.identifier ||
    premiumPackageRef?.packageIdentifier ||
    premiumPackageRef?.product?.identifier ||
    REVENUECAT_CONFIG.packageIds.premium;
  const corePackageId =
    corePackageRef?.identifier ||
    corePackageRef?.packageIdentifier ||
    corePackageRef?.product?.identifier ||
    REVENUECAT_CONFIG.packageIds.core;

  const featureMatrix = [
    { label: "Complete hexagram library", core: true, premium: true },
    { label: "Automatic casting", core: true, premium: true },
    { label: "Journal & secure storage", core: true, premium: true },
    { label: "AI oracle summaries (100/mo)", core: false, premium: true },
    { label: "Manual casting rituals", core: false, premium: true },
    { label: "Cloud sync up to 1,000 entries", core: false, premium: true },
  ];

  const premiumPurchaseBusy =
    transactionLoading && activeAction === "purchase" && activeTargetId === premiumPackageId;
  const corePurchaseBusy =
    transactionLoading && activeAction === "purchase" && activeTargetId === corePackageId;
  const restoreBusy = transactionLoading && activeAction === "restore";

  const handleCoreUnlock = useCallback(async () => {
    const target = corePackageRef || REVENUECAT_CONFIG.packageIds.core;
    const outcome = await purchasePackage(target);
    notifyPurchaseOutcome(outcome, {
      successTitle: "Core unlocked",
      successMessage: "Core features are now available on your account.",
    });
    return outcome;
  }, [corePackageRef, purchasePackage]);

  const handleRestore = useCallback(async () => {
    const outcome = await restorePurchases();
    notifyRestoreOutcome(outcome);
    return outcome;
  }, [restorePurchases]);

  const premiumButtonLabel = premiumPriceString
    ? `Upgrade to Premium (${premiumPriceString})`
    : "Upgrade to Premium";
  const coreButtonLabel = corePriceString
    ? `Unlock Core (${corePriceString})`
    : "Unlock Core";
  const corePriceLabel = corePriceString || "Loading price…";
  const premiumPriceLabel = premiumPriceString || "Loading price…";

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stylesPremium.container}>
          <Pressable onPress={() => navigation.goBack()} style={stylesPremium.backButton}>
            <Ionicons name="chevron-back" size={20} color={palette.ink} />
            <Text style={stylesPremium.backLabel}>Back</Text>
          </Pressable>
          <Text style={stylesPremium.title}>Membership</Text>

          <SectionCard style={stylesPremium.pricingCard}>
            <Text style={stylesPremium.sectionTitle}>Choose your path</Text>
            <View style={stylesPremium.tierRow}>
              <View
                style={[
                  stylesPremium.tierCard,
                  currentTier === "core" && !isPremiumMember && stylesPremium.activeTier,
                ]}
              >
                <Text style={stylesPremium.tierLabel}>Core</Text>
                <Text style={stylesPremium.price}>{corePriceLabel}</Text>
                <Text style={stylesPremium.priceSub}>One-time unlock</Text>
                <Text style={stylesPremium.tierBody}>
                  Essential casting, journaling, and the full 64 hexagram library.
                </Text>
                {currentTier === "core" && !isPremiumMember ? (
                  <View style={stylesPremium.badge}>
                    <Text style={stylesPremium.badgeText}>Current plan</Text>
                  </View>
                ) : null}
                {!isPremiumMember && !coreActive ? (
                  <GoldButton
                    full
                    kind="secondary"
                    onPress={handleCoreUnlock}
                    loading={corePurchaseBusy}
                    icon={<Ionicons name="shield-checkmark-outline" size={18} color={palette.gold} />}
                  >
                    {coreButtonLabel}
                  </GoldButton>
                ) : null}
              </View>
              <View
                style={[
                  stylesPremium.tierCard,
                  stylesPremium.premiumTier,
                  isPremiumMember && stylesPremium.activeTier,
                ]}
              >
                <Text style={stylesPremium.tierLabel}>Premium</Text>
                <Text style={stylesPremium.price}>{premiumPriceLabel}</Text>
                <Text style={stylesPremium.priceSub}>Per month</Text>
                <Text style={stylesPremium.tierBody}>
                  Unlock AI summaries, manual casting, and secure cloud backup.
                </Text>
                {isPremiumMember ? (
                  <View style={stylesPremium.badge}>
                    <Text style={stylesPremium.badgeText}>Active</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={stylesPremium.matrixHeader}>
              <Text style={stylesPremium.matrixTitleLeft}>Feature</Text>
              <Text style={stylesPremium.matrixTitle}>Core</Text>
              <Text style={stylesPremium.matrixTitle}>Premium</Text>
            </View>
            {featureMatrix.map((row) => (
              <View key={row.label} style={stylesPremium.matrixRow}>
                <Text style={stylesPremium.featureLabel}>{row.label}</Text>
                <View style={stylesPremium.matrixIconCell}>
                  <Ionicons
                    name={row.core ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={row.core ? palette.goldDeep : palette.inkMuted}
                  />
                </View>
                <View style={stylesPremium.matrixIconCell}>
                  <Ionicons
                    name={row.premium ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={row.premium ? palette.goldDeep : palette.inkMuted}
                  />
                </View>
              </View>
            ))}

            {isPremiumMember ? (
              <View style={stylesPremium.noticeCard}>
                <Ionicons name="sparkles" size={18} color={palette.goldDeep} />
                <Text style={stylesPremium.noticeText}>
                  Thank you for supporting AI Ching Insights. Enjoy every premium feature.
                </Text>
              </View>
            ) : (
              <GoldButton
                full
                onPress={startPremiumPurchase}
                loading={premiumPurchaseBusy}
                icon={<Ionicons name="sparkles-outline" size={18} color={palette.white} />}
              >
                {premiumButtonLabel}
              </GoldButton>
            )}
            <GoldButton
              full
              kind="secondary"
              onPress={handleRestore}
              loading={restoreBusy}
              icon={<Ionicons name="refresh-outline" size={18} color={palette.gold} />}
            >
              Restore purchases
            </GoldButton>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const stylesPremium = StyleSheet.create({
  container: {
    padding: theme.space(2.5),
    paddingBottom: theme.space(4),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1),
    paddingVertical: 6,
    marginBottom: theme.space(1.5),
  },
  backLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    color: palette.ink,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: theme.space(2),
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: palette.ink,
    marginBottom: theme.space(1.5),
  },
  pricingCard: {
    backgroundColor: palette.white,
  },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.space(2),
    gap: theme.space(1.5),
    flexWrap: "wrap",
  },
  tierCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FAF7ED",
    borderRadius: theme.radius,
    padding: theme.space(1.75),
    borderWidth: 1,
    borderColor: palette.border,
    position: "relative",
  },
  premiumTier: {
    backgroundColor: "#FDF4DC",
    borderColor: palette.gold,
  },
  activeTier: {
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tierLabel: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: palette.ink,
    marginBottom: 4,
  },
  price: {
    fontFamily: fonts.title,
    fontSize: 24,
    color: palette.goldDeep,
  },
  priceSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginBottom: theme.space(1),
  },
  tierBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  badge: {
    position: "absolute",
    top: theme.space(1),
    right: theme.space(1),
    backgroundColor: palette.gold,
    borderRadius: 999,
    paddingHorizontal: theme.space(1),
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: palette.white,
  },
  matrixHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  matrixTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: palette.ink,
    textAlign: "center",
  },
  matrixTitleLeft: {
    flex: 2,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: palette.ink,
    textAlign: "left",
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  matrixIconCell: {
    flex: 1,
    alignItems: "center",
  },
  featureLabel: {
    flex: 2,
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.ink,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF4DC",
    borderRadius: theme.radius,
    padding: theme.space(1.25),
    marginTop: theme.space(2),
    gap: theme.space(1),
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.ink,
  },
});

// ⚙️ Settings screen
function SettingsScreen({ navigation }) {
  const [feedback, setFeedback] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenPremium = useCallback(() => {
    navigation.navigate("Premium");
  }, [navigation]);

  const handleRateApp = useCallback(async () => {
    const iosStore = "https://apps.apple.com/app/id000000000";
    const androidStore = "https://play.google.com/store/apps/details?id=com.example";
    const target = Platform.select({ ios: iosStore, android: androidStore, default: iosStore });
    try {
      if (target) {
        await Linking.openURL(target);
      }
    } catch (error) {
      Alert.alert("Unable to open store", error?.message || "Please try again.");
    }
  }, []);

  const handleShareApp = useCallback(async () => {
    try {
      await Share.share({
        message: "Explore AI Ching Insights for reflective guidance and journaling. Download now!",
      });
    } catch (error) {
      Alert.alert("Share failed", error?.message || "Please try again.");
    }
  }, []);

  const handleOpenLink = useCallback(async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open link", error?.message || "Please try again.");
    }
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    const trimmed = feedback.trim();
    if (!trimmed) {
      Alert.alert("Feedback", "Please share a few words before submitting.");
      return;
    }
    const subject = "AI Ching Insights Feedback";
    const mailto = `mailto:i.ching.insights64@gmail.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(trimmed)}`;
    try {
      const isMailAvailable = await MailComposer.isAvailableAsync();
      if (isMailAvailable) {
        const result = await MailComposer.composeAsync({
          recipients: ["i.ching.insights64@gmail.com"],
          subject,
          body: trimmed,
        });
        if (result?.status !== "cancelled") {
          setFeedback("");
        }
        return;
      }

      await Linking.openURL(mailto);
      setFeedback("");
    } catch (error) {
      Alert.alert(
        "Unable to send email",
        error?.message || "Please install an email app to send feedback."
      );
    }
  }, [feedback]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (error) {
        throw error;
      }
      if (data?.error) {
        const errorMessage =
          typeof data.error === "string" ? data.error : "Unable to delete your account.";
        throw new Error(errorMessage);
      }
      if (!data?.message) {
        throw new Error("Unexpected response from the server.");
      }

      await signOutUser({ supabase });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
      Alert.alert("Account deleted", "Your account has been permanently deleted.");
    } catch (error) {
      console.log("Delete account error", error?.message || error);
      Alert.alert(
        "Unable to delete account",
        error?.message || "Please check your connection and try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [navigation]);

  const confirmDeleteAccount = useCallback(() => {
    if (isDeleting) return;
    Alert.alert(
      "Delete account",
      "Are you sure? This will permanently delete your account and all data.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDeleteAccount },
      ]
    );
  }, [handleDeleteAccount, isDeleting]);

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={stylesSettings.container}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => navigation.goBack()} style={stylesSettings.backButton}>
              <Ionicons name="chevron-back" size={20} color={palette.ink} />
              <Text style={stylesSettings.backLabel}>Back</Text>
            </Pressable>
            <Text style={stylesSettings.title}>Settings</Text>

            <SectionCard>
              <Pressable onPress={handleOpenPremium} style={stylesSettings.row}>
                <Text style={stylesSettings.rowLabel}>Premium</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
              </Pressable>
              <View style={stylesSettings.rowDivider} />
              <Pressable onPress={handleRateApp} style={stylesSettings.row}>
                <Text style={stylesSettings.rowLabel}>Rate app</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
              </Pressable>
              <View style={stylesSettings.rowDivider} />
              <Pressable onPress={handleShareApp} style={stylesSettings.row}>
                <Text style={stylesSettings.rowLabel}>Share app</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
              </Pressable>
              <View style={stylesSettings.rowDivider} />
              <Pressable
                onPress={() =>
                  handleOpenLink("https://sites.google.com/view/ichinginsightspp/home")
                }
                style={stylesSettings.row}
              >
                <Text style={stylesSettings.rowLabel}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
              </Pressable>
              <View style={stylesSettings.rowDivider} />
              <Pressable
                onPress={() =>
                  handleOpenLink("https://sites.google.com/view/ai-ching-insightstc/home")
                }
                style={stylesSettings.row}
              >
                <Text style={stylesSettings.rowLabel}>Terms and Conditions</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
              </Pressable>
            </SectionCard>

            <SectionCard>
              <Text style={stylesSettings.feedbackTitle}>Feedback</Text>
              <Text style={stylesSettings.feedbackHint}>
                Share your reflections or suggestions. Your email app will open when you submit.
              </Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Type your feedback here"
                placeholderTextColor={palette.inkMuted}
                multiline
                style={stylesSettings.feedbackInput}
              />
              <GoldButton
                full
                onPress={handleSubmitFeedback}
                icon={<Ionicons name="send-outline" size={18} color={palette.white} />}
              >
                Send Feedback
              </GoldButton>
            </SectionCard>

            <SectionCard style={stylesSettings.dangerCard}>
              <Text style={stylesSettings.dangerTitle}>Delete account</Text>
              <Text style={stylesSettings.dangerHint}>
                Permanently remove your profile and all saved data. This action cannot be undone.
              </Text>
              <DeleteAccountButton loading={isDeleting} onPress={confirmDeleteAccount} />
            </SectionCard>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const stylesSettings = StyleSheet.create({
  container: {
    padding: theme.space(2.5),
    paddingBottom: theme.space(4),
    paddingTop: theme.space(2.5) + screenTopPadding,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: theme.space(1),
    paddingVertical: 6,
    marginBottom: theme.space(1.5),
  },
  backLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    color: palette.ink,
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: palette.ink,
    marginBottom: theme.space(2),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
  },
  rowDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 4,
  },
  feedbackTitle: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: palette.ink,
    marginBottom: 6,
  },
  feedbackHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    marginBottom: theme.space(1),
  },
  feedbackInput: {
    minHeight: 120,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    padding: theme.space(1.5),
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.ink,
    marginBottom: theme.space(1.5),
    textAlignVertical: "top",
  },
  dangerCard: {
    borderColor: palette.danger,
  },
  dangerTitle: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: palette.dangerDark,
    marginBottom: 6,
  },
  dangerHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.ink,
  },
});

// 🧭 Navigation
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent" },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeRoot" component={HomeScreen} />
      <Stack.Screen name="Cast" component={CastScreen} />
      <Stack.Screen name="ManualCasting" component={ManualCastingScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="Guide" component={GuideScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
    </Stack.Navigator>
  );
}

function JournalStackScreen() {
  return (
    <JournalStack.Navigator screenOptions={{ headerShown: false }}>
      <JournalStack.Screen name="JournalList" component={JournalListScreen} />
      <JournalStack.Screen name="JournalDetail" component={JournalDetailScreen} />
    </JournalStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: "rgba(176, 139, 49, 0.35)",
          borderTopWidth: 1,
          shadowColor: palette.goldDeep,
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyBold,
          fontSize: 12,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "home-outline",
            Library: "bookmarks-outline",
            Journal: "create-outline",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Journal" component={JournalStackScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [marcellusLoaded] = useMarcellus({ Marcellus_400Regular });
  const [loraLoaded] = useLora({ Lora_400Regular, Lora_600SemiBold });
  const navigationRef = useRef(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [passwordResetRequested, setPasswordResetRequested] = useState(false);

  const fetchProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const data = await fetchAuthProfileByUserId({ supabase, userId });
      setProfile(data);
    } catch (error) {
      console.log("Profile fetch error:", error?.message || error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [session?.user?.id]);

  const completePasswordResetFlow = useCallback(() => {
    setPasswordResetRequested(false);
  }, []);

  useAuthLifecycle({
    supabase,
    setSession,
    setAuthReady,
    setPasswordResetRequested,
  });

  useEffect(() => {
    if (!authReady) return;
    fetchProfile();
  }, [authReady, fetchProfile]);

  const signOut = useCallback(async () => {
    await signOutUser({ supabase });
  }, []);

  const revenueCatValue = useRevenueCatController(session?.user?.id ?? null, authReady);

  const premiumStatus = useMemo(
    () =>
      revenueCatValue?.premiumActive ||
      profile?.subscription_tier === "premium" ||
      profile?.is_premium,
    [
      profile?.is_premium,
      profile?.subscription_tier,
      revenueCatValue?.premiumActive,
    ]
  );

  const resolvedSubscriptionTier = useMemo(() => {
    if (revenueCatValue?.premiumActive) return "premium";
    if (revenueCatValue?.coreActive) return "core";
    return profile?.subscription_tier ?? null;
  }, [profile?.subscription_tier, revenueCatValue?.coreActive, revenueCatValue?.premiumActive]);

  const authValue = useMemo(
    () => ({
      session,
      profile,
      loadingProfile,
      refreshProfile: fetchProfile,
      signOut,
      authReady,
      isPremium: premiumStatus,
      subscriptionTier: resolvedSubscriptionTier,
      revenueCatCustomerInfo: revenueCatValue?.customerInfo ?? null,
      revenueCatEntitlements: revenueCatValue?.activeEntitlementIds ?? [],
      passwordResetRequested,
      completePasswordResetFlow,
    }),
    [
      session,
      profile,
      loadingProfile,
      fetchProfile,
      signOut,
      authReady,
      premiumStatus,
      resolvedSubscriptionTier,
      revenueCatValue?.customerInfo,
      revenueCatValue?.activeEntitlementIds,
      passwordResetRequested,
      completePasswordResetFlow,
    ]
  );

  if (!marcellusLoaded || !loraLoaded || !authReady) return null;

  const navigationKey = passwordResetRequested ? "reset-flow" : session ? "main" : "auth";

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={authValue}>
        <RevenueCatContext.Provider value={revenueCatValue || defaultRevenueCatState}>
          <JournalProvider>
            <NavigationContainer
              ref={navigationRef}
              key={navigationKey}
              theme={navTheme}
              linking={linkingConfig}
            >
              {passwordResetRequested || !session ? (
                <AuthStackScreen
                  passwordResetRequested={passwordResetRequested}
                  completePasswordResetFlow={completePasswordResetFlow}
                  supabase={supabase}
                  loginGradientColors={loginGradientColors}
                  loginStyles={loginStyles}
                  palette={palette}
                  theme={theme}
                  GoldButton={GoldButton}
                />
              ) : (
                <MainTabs />
              )}
            </NavigationContainer>
          </JournalProvider>
        </RevenueCatContext.Provider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
