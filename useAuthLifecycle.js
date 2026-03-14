import { useEffect } from "react";
import { Alert, Linking } from "react-native";
import * as ExpoLinking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";

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

      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (newSession !== null) {
        setSession(newSession);
      }

      setAuthReady(true);

      if (event === "PASSWORD_RECOVERY") {
        console.log("🔐 PASSWORD_RECOVERY event received");
        setPasswordResetRequested(true);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [setAuthReady, setPasswordResetRequested, setSession, supabase]);

  useEffect(() => {
    const createSessionFromUrl = async (url) => {
      try {
        const { params, errorCode } = QueryParams.getQueryParams(url);

        if (errorCode) {
          throw new Error(errorCode);
        }

        const access_token = params?.access_token;
        const refresh_token = params?.refresh_token;
        const type = params?.type;

        console.log("🔗 Parsed deep link params:", {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          type: type || null,
        });

        if (!access_token || !refresh_token) {
          console.log("🔗 No auth tokens found in URL");
          return null;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          throw error;
        }

        console.log("✅ Recovery session established from URL");

        if (data?.session) {
          setSession(data.session);
        }

        if (type === "recovery") {
          setPasswordResetRequested(true);
        }

        return data?.session ?? null;
      } catch (error) {
        console.log("❌ Failed to create session from URL:", error?.message || error);
        Alert.alert(
          "Password reset",
          "We couldn't open that reset link. Please request a new one."
        );
        return null;
      }
    };

    const processResetLink = async (url) => {
      if (!url || !url.includes("auth/reset")) return;

      console.log("🔗 Reset link received:", url);
      await createSessionFromUrl(url);
    };

    const processAuthCallbackLink = async (url) => {
      if (!url || !url.includes("auth/callback")) return;

      console.log("🔗 Auth callback link received:", url);
      await createSessionFromUrl(url);
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
