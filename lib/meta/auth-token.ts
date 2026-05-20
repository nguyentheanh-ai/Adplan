import { getAppSession } from "@/lib/auth/session";

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
