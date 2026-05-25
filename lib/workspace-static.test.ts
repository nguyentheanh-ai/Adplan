import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Greezhub workspace integration", () => {
  it("renders the real Greezhub workspace app instead of the course/student dashboard", () => {
    const page = read("app/workspace/[[...slug]]/page.tsx");
    const component = read("components/workspace/greezhub-workspace-app.tsx");

    expect(page).toContain("GreezhubWorkspaceApp");
    expect(page).not.toContain("StudentDashboard");
    expect(component).toContain("WORKSPACE_REMOTE_CONFIG");
    expect(component).toContain("/api/workspace/app-state");
    expect(component).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(component).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(component).toContain("/greezhub-workspace/app.js");
    expect(component).toContain("/greezhub-workspace/styles.css");
  });

  it("ships the Greezhub workspace modules and maps them under /workspace", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");

    expect(app).toContain('id: "documents"');
    expect(app).toContain('id: "notes"');
    expect(app).toContain('id: "ideas"');
    expect(app).toContain('id: "prompts"');
    expect(app).toContain('id: "clock"');
    expect(app).toContain('id: "tasks"');
    expect(app).toContain('path: "/workspace/documents"');
    expect(app).toContain('path: "/workspace/tools/clock"');
    expect(app).not.toContain('path: "/noi-dung');
    expect(app).not.toContain("Â·");
    expect(app).toContain('value="${escapeUiText(note.title)}"');
    expect(app).toContain("toast.textContent = repairVietnameseText(message);");
    expect(app).toContain("initWorkspaceApiRemote");
    expect(app).toContain("loadSupabaseSdk");
    expect(app).not.toMatch(/service_role|SUPABASE_SERVICE|ACCESS_TOKEN|PAGE_ACCESS|adplan_agent_key|client_secret|private_key/i);
    expect(styles).toContain(".documents-layout");
    expect(styles).toContain(".notes-board");
    expect(styles).toContain(".clock-page");
  });
});
