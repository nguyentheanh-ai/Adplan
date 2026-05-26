import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Greezhub workspace integration", () => {
  it("keeps Workspace routes attached to the existing optimized app logic", () => {
    const page = read("app/workspace/[[...slug]]/page.tsx");

    expect(page).toContain("GreezhubWorkspaceApp");
    expect(page).toContain("WorkspaceOverview");
    expect(page).toContain("slug.length === 0");
    expect(page).not.toContain("WorkspacePageSurface");
    expect(page).not.toContain("Task hôm nay");
    expect(page).not.toContain("Chốt content plan tuần này");
  });

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
    expect(component).toContain("workspace-embedded");
    expect(component).toContain("id=\"nav\"");
    expect(component).not.toContain("<h1>Engine</h1>");
    expect(component).not.toContain("Pro Dashboard");
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

  it("supports document flow diagram blocks with draggable nodes and connectors", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");

    expect(app).toContain('const DOCUMENT_FLOW_DIAGRAM_TYPE = "flowDiagram";');
    expect(app).toContain('"flowDiagram"');
    expect(app).toContain('commandId: "flowDiagram"');
    expect(app).toContain("createFlowDiagramDocumentNode");
    expect(app).toContain("createFlowDiagramNodeExtension");
    expect(app).toContain("normalizeFlowDiagramNodes");
    expect(app).toContain("normalizeFlowDiagramEdges");
    expect(app).toContain('data-document-command="flowDiagram"');
    expect(app).toContain('data-flow-diagram-add-node');
    expect(app).toContain('data-flow-diagram-connect');
    expect(app).toContain('data-flow-diagram-color');
    expect(app).toContain('data-flow-diagram-resize');
    expect(app).toContain('data-flow-diagram-canvas-resize');
    expect(app).toContain("DOCUMENT_FLOW_DIAGRAM_CONNECTOR_SIDES");
    expect(app).toContain("DOCUMENT_FLOW_DIAGRAM_EDGE_SHAPES");
    expect(app).toContain("DOCUMENT_FLOW_DIAGRAM_EDGE_ARROWS");
    expect(app).toContain("normalizeFlowDiagramConnectorSide");
    expect(app).toContain("normalizeFlowDiagramEdgeShape");
    expect(app).toContain("normalizeFlowDiagramEdgeArrow");
    expect(app).toContain("flowDiagramNodeAnchor");
    expect(app).toContain('data-flow-diagram-edge');
    expect(app).toContain('data-flow-diagram-edge-shape');
    expect(app).toContain('data-flow-diagram-edge-arrow');
    expect(app).toContain('data-flow-diagram-edge-delete');
    expect(app).toContain('data-flow-diagram-side');
    expect(app).toContain("handleDiagramKeyDown");
    expect(app).toContain("editor.commands?.undo?.()");
    expect(app).toContain("editor.commands?.redo?.()");
    expect(app).toContain('"left", "right", "top", "bottom"');
    expect(app).toContain('"curve", "straight", "elbow"');
    expect(app).toContain('"none", "end", "both"');
    expect(app).not.toContain('data-flow-diagram-free-arrow');
    expect(app).not.toContain("freeArrowMode");
    expect(app).not.toContain('data-flow-diagram-pan');
    expect(app).not.toContain("document-flow-diagram__pan-group");
    expect(app).not.toContain('>Gi\u1eefa</button>');
    expect(app).not.toContain('>Tr\u00e1i</button>');
    expect(app).not.toContain('>M\u0169i t\u00ean t\u1ef1 do</button>');
    expect(app).toContain('class="document-flow-diagram');

    expect(styles).toContain(".document-flow-diagram");
    expect(styles).toContain(".document-flow-diagram__node");
    expect(styles).toContain(".document-flow-diagram__edge-layer");
    expect(styles).toContain(".document-flow-diagram__edge-hit");
    expect(styles).toContain(".document-flow-diagram__edge.is-selected");
    expect(styles).toContain(".document-flow-diagram__edge-tools");
    expect(styles).toContain(".document-flow-diagram__resize");
    expect(styles).toContain(".document-flow-diagram__connector");
    expect(styles).toContain(".document-flow-diagram__connector--left");
    expect(styles).toContain(".document-flow-diagram__connector--right");
    expect(styles).toContain(".document-flow-diagram__connector--top");
    expect(styles).toContain(".document-flow-diagram__connector--bottom");
    expect(styles).toContain(".document-flow-diagram__canvas-resize");
    expect(styles).not.toContain(".document-flow-diagram__pan-group");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__toolbar");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__toolbar");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__canvas-resize");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__canvas-resize");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node:hover .document-flow-diagram__swatches");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node:focus-within .document-flow-diagram__connector");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__viewport");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__viewport:hover");
    expect(styles).toContain(".document-flow-diagram__viewport::-webkit-scrollbar");
  });

  it("shows a stable document ID and export actions for each document", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");

    expect(app).toContain("function documentStableId");
    expect(app).toContain("function documentDisplayId");
    expect(app).toContain("function documentExportHtml");
    expect(app).toContain("function exportDocumentAsPdf");
    expect(app).toContain("function exportDocumentAsDoc");
    expect(app).toContain("data-copy-document-id");
    expect(app).toContain("data-export-document-pdf");
    expect(app).toContain("data-export-document-doc");
    expect(app).toContain("data-document-toc-visibility");
    expect(app).toContain("ta.documentTocHidden");
    expect(styles).toContain(".document-id-strip");
    expect(styles).toContain(".document-focus-actions");
    expect(styles).toContain(".document-focus-layout.is-toc-hidden");
  });

  it("repairs Vietnamese mojibake in document defaults and table of contents", () => {
    const app = read("public/greezhub-workspace/app.js");

    expect(app).toContain('title: "Tài liệu mới"');
    expect(app).toContain("Bắt đầu viết nội dung tài liệu tại đây");
    expect(app).toContain("const itemTitle = repairVietnameseText(item.title)");
    expect(app).not.toContain('title: "TÃ i liá»‡u má»›i"');
  });

  it("scopes legacy utility classes so the embedded app cannot override AppShell responsive UI", () => {
    const styles = read("public/greezhub-workspace/styles.css");

    expect(styles).toContain(".workspace-embedded .grid");
    expect(styles).not.toMatch(/^\.grid\s*\{/m);
  });

  it("shows Workspace child modules as overview blocks instead of sidebar submenu links", () => {
    const overview = read("components/workspace/workspace-overview.tsx");
    const navigation = read("lib/navigation.ts");
    const combined = `${overview}\n${navigation}`;

    expect(overview).toContain("workspaceNavItems");
    expect(overview).toContain('"/workspace/content"');
    expect(overview).toContain('"/workspace/operations"');
    expect(combined).toContain("Không gian nội dung");
    expect(combined).toContain("Tài liệu");
    expect(combined).toContain("Notes");
    expect(combined).toContain("Ideas");
    expect(combined).toContain("Prompts");
    expect(combined).toContain("Không gian vận hành");
    expect(combined).toContain("Plan Content");
    expect(combined).toContain("Calendar");
    expect(combined).toContain("Clock");
    expect(combined).toContain("Analytics");
    expect(combined).toContain("Tasks");
  });
});
