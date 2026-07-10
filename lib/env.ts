export function cleanEnvValue(value: string | null | undefined) {
  const cleaned = String(value ?? "")
    .replace(/\uFEFF/g, "")
    .trim();

  return cleaned || null;
}

export function hasSupabasePublicEnv() {
  return Boolean(cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function hasSupabaseServerEnv() {
  return Boolean(
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
