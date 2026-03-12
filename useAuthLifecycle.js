import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import * as ExpoLinking from "expo-linking";

export default function useAuthLifecycle({
  supabase,
  setSession,
  setAuthReady,
  setPasswordResetRequested,
}) {
  useEffect(() => {
    let isMounted = true;
    console.log("🔐 Auth hydration: fetching initial session...");
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        console.log(
          "🔐 Auth hydration result:",
          data?.session ? "session restored" : "no session",
          data?.session?.user ? "user present" : "no user"
        );
        setSession(data?.session ?? null);
        setAuthReady(true);
        console.log("🔐 Auth hydration complete: authReady set to true");
      })
      .catch((error) => {
        console.log("Session fetch error:", error?.message || error);
        if (isMounted) {
          setAuthReady(true);
          console.log("🔐 Auth hydration failed: authReady set to true");
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log(
        "🔐 Auth state change:",
        event,
        "session?",
        !!newSession,
        "user?",
        !!newSession?.user
      );
      // Prevent unwanted logout on app launch while still allowing explicit sign-out
      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (newSession !== null) {
        setSession(newSession);
      }

      // Auth is now ready regardless of event type
      setAuthReady(true);

      // Preserve password recovery logic
      if (event === "PASSWORD_RECOVERY") {
        setPasswordResetRequested(true);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [setAuthReady, setPasswordResetRequested, setSession, supabase]);

  useEffect(() => {
    const isResetLink = (url) => {
      if (!url) return false;
      const parsed = ExpoLinking.parse(url);
      const path = `${parsed?.path || ""}`;
      const type = parsed?.queryParams?.type;
      return path.includes("auth/reset") || type === "recovery" || url.includes("/auth/reset");
    };

    const establishSessionFromLink = async (url) => {
      const fromUrl = await supabase.auth.getSessionFromUrl({ url, storeSession: true });

      if (fromUrl?.data?.session) {
        return { session: fromUrl.data.session, error: null };
      }

      const code = ExpoLinking.parse(url)?.queryParams?.code;
      if (typeof code === "string" && code.length > 0) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        return {
          session: exchanged?.data?.session ?? null,
          error: exchanged?.error ?? fromUrl?.error ?? null,
        };
      }

      return {
        session: null,
        error: fromUrl?.error ?? null,
      };
    };

    const processResetLink = async (url) => {
      if (!isResetLink(url)) return;
      console.log("🔗 Incoming reset link:", url);
      // Move into the reset flow immediately so the Reset screen is presented even while the session hydrates.
      setPasswordResetRequested(true);

      try {
        const { session, error } = await establishSessionFromLink(url);

        if (error || !session) {
          console.log("❌ Supabase password recovery failed:", error?.message || "missing session");
          setPasswordResetRequested(false);
          Alert.alert(
            "Password reset",
            "We couldn't open that link. Please request a new reset email."
          );
          return;
        }

        setSession(session);
        console.log("✅ Supabase password recovery session established");
      } catch (error) {
        console.log("❌ Supabase password recovery failed:", error?.message || error);
        setPasswordResetRequested(false);
        Alert.alert(
          "Password reset",
          "We couldn't open that link. Please request a new reset email."
        );
      }
    };

    const processAuthCallbackLink = async (url) => {
      if (!url || !url.includes("auth/callback")) return;
      console.log("🔗 Handling auth callback link:", url);
      const { error } = await supabase.auth.getSessionFromUrl({ url, storeSession: true });
      if (error) {
        console.log("Auth callback link error:", error?.message || error);
      }
    };

    const sub = Linking.addEventListener("url", async ({ url }) => {
      await processResetLink(url);
      await processAuthCallbackLink(url);
    });

    const resolveInitialUrl = async () => {
      try {
        const initialUrl = await ExpoLinking.getInitialURL();
        if (initialUrl) {
          console.log("🔗 Initial link:", initialUrl);
          await processResetLink(initialUrl);
          await processAuthCallbackLink(initialUrl);
        }
      } catch (error) {
        console.log("Initial URL error:", error?.message || error);
      }
    };

    resolveInitialUrl();

    return () => sub.remove();
  }, [setPasswordResetRequested, setSession, supabase]);
}
