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
    expect(app).toContain('data-flow-diagram-drag');
    expect(app).toContain('data-flow-diagram-canvas-resize');
    expect(app).toContain('data-flow-diagram-canvas-resize-direction');
    expect(app).toContain('["n", "e", "s", "w", "ne", "se", "sw", "nw"]');
    expect(app).toContain('beginCanvasResize(event, direction)');
    expect(app).toContain("width: Math.max(640, nextWidth)");
    expect(app).toContain("height: Math.max(380, nextHeight)");
    expect(app).not.toContain("Math.min(1800, nextWidth)");
    expect(app).not.toContain("Math.min(1200, nextHeight)");
    expect(app).toContain('element.querySelector("[data-flow-diagram-resize]")?.addEventListener("mousedown", (event) => beginResize(event, item))');
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
    expect(app).toContain('document.createElement("textarea")');
    expect(app).toContain("label.draggable = false;");
    expect(app).toContain("label.value = item.text || \"Block\";");
    expect(app).toContain('label.addEventListener("mousedown"');
    expect(app).toContain('label.addEventListener("click"');
    expect(app).toContain("sanitizeDocumentText(label.value || \"Block\")");
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
    expect(styles).toContain(".document-flow-diagram__drag");
    expect(styles).toContain(".document-flow-diagram__resize");
    expect(styles).not.toContain(".document-flow-diagram__resize--n");
    expect(styles).not.toContain(".document-flow-diagram__resize--e");
    expect(styles).not.toContain(".document-flow-diagram__resize--s");
    expect(styles).not.toContain(".document-flow-diagram__resize--w");
    expect(styles).toContain(".document-flow-diagram__connector");
    expect(styles).toContain(".document-flow-diagram__connector--left");
    expect(styles).toContain(".document-flow-diagram__connector--right");
    expect(styles).toContain(".document-flow-diagram__connector--top");
    expect(styles).toContain(".document-flow-diagram__connector--bottom");
    expect(styles).toContain(".document-flow-diagram__canvas-resize");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--n");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--e");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--s");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--w");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--ne");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--se");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--sw");
    expect(styles).toContain(".document-flow-diagram__canvas-resize--nw");
    expect(styles).not.toContain(".document-flow-diagram__pan-group");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__toolbar");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__toolbar");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__canvas-resize");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__canvas-resize");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node:hover .document-flow-diagram__swatches");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node:hover .document-flow-diagram__drag");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node.is-selected .document-flow-diagram__resize");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__node:focus-within .document-flow-diagram__connector");
    expect(styles).toContain(".document-flow-diagram:not(.is-active) .document-flow-diagram__viewport");
    expect(styles).toContain(".document-flow-diagram.is-active .document-flow-diagram__viewport:hover");
    expect(styles).toContain(".document-flow-diagram__viewport::-webkit-scrollbar");
    expect(styles).toContain("height: var(--flow-height, 460px);");
    expect(styles).not.toContain("max-height: min(430px, var(--flow-height, 460px));");
    expect(styles).toContain("cursor: text;");
    expect(styles).toContain("user-select: text;");
  });

  it("shows a stable document ID and export actions for each document", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");

    expect(app).toContain("function documentStableId");
    expect(app).toContain("function documentDisplayId");
    expect(app).toContain("function documentRouteFor");
    expect(app).toContain("function findDocumentByRouteId");
    expect(app).toContain("function mergeRemoteDocumentsWithLocal");
    expect(app).toContain("function shouldDelayDocumentRouteSync");
    expect(app).toContain("documentRouteFor(active)");
    expect(app).toContain('return `DOC-${documentStableId(documentItem).toUpperCase()}`');
    expect(app).toContain("function documentExportHtml");
    expect(app).toContain("function exportDocumentAsPdf");
    expect(app).toContain("function exportDocumentAsDoc");
    expect(app).toContain("data-copy-document-id");
    expect(app).toContain("data-export-document-pdf");
    expect(app).toContain("data-export-document-doc");
    expect(app).toContain("data-document-toc-visibility");
    expect(app).toContain("ta.documentTocHidden");
    expect(app).toContain("data-document-toolbar-visibility");
    expect(app).toContain("ta.documentToolbarHidden");
    expect(styles).toContain(".document-id-strip");
    expect(styles).toContain("word-break: break-all");
    expect(app).toContain("function documentFocusActionBar");
    expect(app).toContain('class="document-focus-floating-actions"');
    expect(styles).toContain(".document-focus-floating-actions");
    expect(styles).toContain(".document-focus-floating-actions .icon-button");
    expect(styles).toContain(".document-focus-layout.is-toc-hidden");
  });

  it("keeps document editing commands usable for undo and lists", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");

    expect(app).toContain("function getBrowserEditorSelection");
    expect(app).toContain("function convertSelectionToSimpleList");
    expect(app).toContain("documentEditorCommandSelection");
    expect(app).toContain("function handleDocumentEditorShortcut");
    expect(app).toContain('session.commandBus.execute(digit === "0" ? "paragraph" : `heading${digit}`)');
    expect(app).toContain('session.commandBus.execute("orderedList")');
    expect(app).toContain('session.commandBus.execute("bulletList")');
    expect(app).toContain('session.commandBus.execute("taskList")');
    expect(app).toContain('chain.insertContent("\\u00a0\\u00a0\\u00a0\\u00a0")');
    expect(app).toContain('if (commandId === "undo") return run(chain.undo())');
    expect(app).toContain('if (commandId === "redo") return run(chain.redo())');
    expect(app).toContain("newGroupDelay: 250");
    expect(app).toContain('if (!dom.contains(event.target)) return;');
    expect(styles).toContain(".document-free-editor .ProseMirror ul");
    expect(styles).toContain("list-style: disc");
  });

  it("repairs Vietnamese mojibake in document defaults and table of contents", () => {
    const app = read("public/greezhub-workspace/app.js");

    expect(app).toContain('title: "Tài liệu mới"');
    expect(app).toContain("Bắt đầu viết nội dung tài liệu tại đây");
    expect(app).toContain("const itemTitle = repairVietnameseText(item.title)");
    expect(app).not.toContain("document-editor-loading");
    expect(app).not.toContain("Đang tải editor");
    expect(app).not.toContain('title: "TÃ i liá»‡u má»›i"');
  });

  it("supports idea list view, tags, and server-side link thumbnails", () => {
    const app = read("public/greezhub-workspace/app.js");
    const styles = read("public/greezhub-workspace/styles.css");
    const route = read("app/api/workspace/link-preview/route.ts");

    expect(app).toContain("ideaViewMode");
    expect(app).toContain("ideaTagFilter");
    expect(app).toContain("normalizeIdeaTags");
    expect(app).toContain("normalizeIdeaImageFile");
    expect(app).toContain("ideaListItem");
    expect(app).toContain('data-idea-view="list"');
    expect(app).toContain("data-idea-tag-filter");
    expect(app).toContain("data-refresh-idea-preview");
    expect(app).toContain("data-edit-idea-note");
    expect(app).toContain("data-clear-idea-image");
    expect(app).toContain("clipboardData");
    expect(app).toContain("Th\\u00eam \\u00edt nh\\u1ea5t link");
    expect(app).not.toContain('id="ideaUrl" type="url" placeholder="https://..." required');
    expect(app).toContain("Nh\\u1eadp ghi ch\\u00fa cho idea");
    expect(app).toContain("/api/workspace/link-preview?url=");
    expect(app).toContain("sourceTitle");
    expect(app).toContain("thumbnail");
    expect(styles).toContain(".idea-list-row");
    expect(styles).toContain(".idea-paste-zone");
    expect(styles).toContain(".idea-image-preview");
    expect(styles).toContain(".idea-tag-filter__chip");
    expect(styles).toContain(".idea-tags");
    expect(route).toContain("og:image");
    expect(route).toContain("twitter:image");
    expect(route).toContain("facebookexternalhit");
    expect(route).toContain("isPrivateIpv4");
  });

  it("merges remote ideas and prompts without dropping local browser edits", () => {
    const app = read("public/greezhub-workspace/app.js");

    expect(app).toContain("function mergeRemoteListWithLocal");
    expect(app).toContain("function mergeRemotePromptsWithLocal");
    expect(app).toContain("function mergeRemoteIdeasWithLocal");
    expect(app).toContain("state.prompts = mergeRemotePromptsWithLocal(payload.prompts, state.prompts)");
    expect(app).toContain("state.ideas = mergeRemoteIdeasWithLocal(payload.ideas, state.ideas)");
    expect(app).not.toContain("state.prompts = payload.prompts;");
    expect(app).not.toContain("state.ideas = normalizeIdeas(payload.ideas);");
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
