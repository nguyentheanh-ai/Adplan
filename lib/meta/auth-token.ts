import { createClient } from "@/lib/supabase/server";

type SessionWithProviderToken = {
  provider_token?: string | null;
};

export class FacebookAuthRequiredError extends Error {
  constructor() {
    super("Bạn cần đăng nhập bằng Facebook để kết nối tài khoản quảng cáo.");
    this.name = "FacebookAuthRequiredError";
  }
}

export async function getFacebookProviderToken() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session as (typeof data.session & SessionWithProviderToken) | null;
    return session?.provider_token ?? null;
  } catch {
    return null;
  }
}

export async function requireFacebookProviderToken() {
  const token = await getFacebookProviderToken();

  if (!token) {
    throw new FacebookAuthRequiredError();
  }

  return token;
}
