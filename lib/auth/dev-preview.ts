import type { AppSession } from "@/lib/auth/session";

type PreviewEnv = {
  NODE_ENV?: string;
  ADPLAN_ENABLE_PREVIEW_AUTH?: string;
};

export function isDevPreviewAuthEnabled(env: PreviewEnv = process.env) {
  return env.NODE_ENV === "development" && env.ADPLAN_ENABLE_PREVIEW_AUTH === "1";
}

export function createDevPreviewSession(now = Date.now()): AppSession {
  return {
    userId: "dev-preview-user",
    facebookId: "dev-preview-facebook",
    name: "Preview User",
    accessToken: "dev-preview-token",
    expiresAt: now + 60 * 60 * 1000,
    grantedScopes: []
  };
}
