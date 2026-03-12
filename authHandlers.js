export async function handleAuthAction({ type, email, password, supabase }) {
  const trimmedEmail = email.trim();
  if (type === "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
  });
  if (error) throw error;
}

export async function sendPasswordReset({ email, supabase }) {
  const trimmed = email.trim();
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: "ichinginsightsai://auth/reset",
  });
  if (error) throw error;
}

export async function fetchAuthProfileByUserId({ supabase, userId }) {
  const { data, error } = await supabase
    .from("Profiles")
    .select("display_name,email,is_premium,subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function signOutUser({ supabase }) {
  await supabase.auth.signOut();
}
