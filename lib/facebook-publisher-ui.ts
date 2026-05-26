export type PublisherAccessState =
  | { kind: "signed_out" }
  | { kind: "needs_facebook"; title: string; message: string }
  | { kind: "ready" };

export function buildPublisherAccessState({
  hasAppSession,
  hasFacebookConnection
}: {
  hasAppSession: boolean;
  hasFacebookConnection: boolean;
}): PublisherAccessState {
  if (!hasAppSession) return { kind: "signed_out" };
  if (!hasFacebookConnection) {
    return {
      kind: "needs_facebook",
      title: "Cần kết nối Facebook",
      message: "Bạn đã đăng nhập vào app, nhưng cần kết nối Facebook để đọc Fanpage và đăng bài."
    };
  }
  return { kind: "ready" };
}

export function getSimplePublisherSteps() {
  return ["Chọn page", "Chọn bài trong Draft", "Preview", "Đăng"] as const;
}
