import { getAppSession } from "@/lib/auth/session";
import { getStoredFacebookProviderToken } from "@/lib/facebook-provider-token-store";

export class FacebookAuthRequiredError extends Error {
  constructor() {
    super("Bạn cần đăng nhập bằng Facebook để kết nối tài khoản quảng cáo.");
    this.name = "FacebookAuthRequiredError";
  }
}

export async function getFacebookProviderToken() {
  const session = await getAppSession();
  return session?.accessToken ?? null;
}

export async function requireFacebookProviderToken() {
  const token = await getFacebookProviderToken();

  if (!token) {
    throw new FacebookAuthRequiredError();
  }

  return token;
}

export async function getFacebookProviderTokenForUser(userId: string) {
  const stored = await getStoredFacebookProviderToken(userId);
  return stored?.accessToken ?? null;
}

export async function requireFacebookProviderTokenForUser(userId: string) {
  const token = await getFacebookProviderTokenForUser(userId);
  if (!token) {
    throw new Error("User này chưa có Facebook token server-side hợp lệ. Hãy đăng nhập lại Facebook trong webapp.");
  }
  return token;
}
