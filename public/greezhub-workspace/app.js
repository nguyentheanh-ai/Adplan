const pages = [
  { id: "calendar", label: "Tổng quan", title: "Workspace", icon: "dashboard", space: "home", path: "/workspace" },
  { id: "noi-dung", label: "KhÃ´ng gian ná»™i dung", title: "KhÃ´ng gian ná»™i dung", icon: "inventory_2", space: "content", path: "/workspace/content", isSpace: true },
  { id: "van-hanh", label: "KhÃ´ng gian váº­n hÃ nh", title: "KhÃ´ng gian váº­n hÃ nh", icon: "hub", space: "operations", path: "/workspace/operations", isSpace: true },
  { id: "documents", label: "TÃ i liá»‡u", title: "TÃ i liá»‡u", icon: "folder_copy", space: "content", path: "/workspace/documents" },
  { id: "notes", label: "Notes", title: "Ghi chÃº", icon: "sticky_note_2", space: "content", path: "/workspace/notes" },
  { id: "ideas", label: "Idea", title: "Idea", icon: "lightbulb", space: "content", path: "/workspace/ideas" },
  { id: "prompts", label: "Prompt", title: "ThÆ° viá»‡n Prompt AI", icon: "terminal", space: "content", path: "/workspace/prompts" },
  { id: "content", label: "Plan Content", title: "Káº¿ hoáº¡ch ná»™i dung", icon: "edit_calendar", space: "operations", path: "/workspace/content-plan" },
  { id: "clock", label: "Clock", title: "Äá»“ng há»“", icon: "schedule", space: "operations", path: "/workspace/tools/clock" },
  { id: "dashboard", label: "Analytics", title: "Dashboard tá»•ng quan", icon: "monitoring", space: "operations", path: "/workspace/analytics" },
  { id: "ads", label: "Ads Tool", title: "CÃ´ng cá»¥ táº¡o tÃªn Ads", icon: "campaign", space: "operations", path: "/workspace/tools/ads-name" },
  { id: "tasks", label: "Tasks", title: "Quáº£n lÃ½ cÃ´ng viá»‡c", icon: "checklist", space: "operations", path: "/workspace/tasks" },
];

const moduleSpaces = [
  { id: "content", pageId: "noi-dung", label: "KhÃ´ng gian ná»™i dung", path: "/workspace/content", pages: ["documents", "notes", "ideas", "prompts"] },
  { id: "operations", pageId: "van-hanh", label: "KhÃ´ng gian váº­n hÃ nh", path: "/workspace/operations", pages: ["content", "clock", "dashboard", "ads", "tasks"] },
];

const DOCUMENT_MODEL_VERSION = 3;
const DOCUMENT_MAX_TEXT_LENGTH = 200000;
const DOCUMENT_DOCUMENT_TAGS = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "taskItem",
  "listItem",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "horizontalRule",
  "callout",
  "mindMap",
  "stickyNote",
  "flowDiagram",
  "text",
]);
const DOCUMENT_MIND_MAP_TYPE = "mindMap";
const DOCUMENT_STICKY_NOTE_TYPE = "stickyNote";
const DOCUMENT_FLOW_DIAGRAM_TYPE = "flowDiagram";
const DOCUMENT_AUTOSAVE_DELAY_MS = 1100;
const DOCUMENT_HISTORY_LIMIT = 20;
const DOCUMENT_DEFAULT_HIGHLIGHT_COLOR = "#fff2ac";
const DOCUMENT_STICKY_NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple"];
const DOCUMENT_FLOW_DIAGRAM_COLORS = ["blue", "green", "pink", "yellow", "purple", "white"];
const DOCUMENT_FLOW_DIAGRAM_CONNECTOR_SIDES = ["left", "right", "top", "bottom"];
const DOCUMENT_FLOW_DIAGRAM_EDGE_SHAPES = ["curve", "straight", "elbow"];
const DOCUMENT_FLOW_DIAGRAM_EDGE_ARROWS = ["none", "end", "both"];
const DOCUMENT_EDITOR_IMPORT_URLS = {
  core: "https://esm.sh/@tiptap/core@2.7.2",
  StarterKit: "https://esm.sh/@tiptap/starter-kit@2.7.2",
  Link: "https://esm.sh/@tiptap/extension-link@2.7.2",
  TextAlign: "https://esm.sh/@tiptap/extension-text-align@2.7.2",
  TextStyle: "https://esm.sh/@tiptap/extension-text-style@2.7.2",
  Color: "https://esm.sh/@tiptap/extension-color@2.7.2",
  Highlight: "https://esm.sh/@tiptap/extension-highlight@2.7.2",
  Underline: "https://esm.sh/@tiptap/extension-underline@2.7.2",
  Image: "https://esm.sh/@tiptap/extension-image@2.7.2",
  Table: "https://esm.sh/@tiptap/extension-table@2.7.2",
  TableRow: "https://esm.sh/@tiptap/extension-table-row@2.7.2",
  TableHeader: "https://esm.sh/@tiptap/extension-table-header@2.7.2",
  TableCell: "https://esm.sh/@tiptap/extension-table-cell@2.7.2",
  TaskList: "https://esm.sh/@tiptap/extension-task-list@2.7.2",
  TaskItem: "https://esm.sh/@tiptap/extension-task-item@2.7.2",
};
let documentEditorLibPromise = null;
const DOCUMENT_EDITOR_TIPTAP_READY = () => {
  const lib = window.__documentEditorLib || {};
  const core = lib.core || {};
  return Boolean(window.__documentEditorLibReady && (core.Editor || lib.Editor));
};
const DOCUMENT_SLASH_COMMANDS = [
  { id: "paragraph", label: "Paragraph", tags: ["paragraph", "normal", "text"], commandId: "paragraph" },
  { id: "heading1", label: "Heading 1", tags: ["h1", "heading", "title"], commandId: "heading1" },
  { id: "heading2", label: "Heading 2", tags: ["h2", "heading"], commandId: "heading2" },
  { id: "heading3", label: "Heading 3", tags: ["h3", "heading"], commandId: "heading3" },
  { id: "bullet-list", label: "Bulleted list", tags: ["list", "bullet", "bullet list", "ul"], commandId: "bulletList" },
  { id: "number-list", label: "Numbered list", tags: ["list", "number", "ordered", "ol"], commandId: "orderedList" },
  { id: "checklist", label: "Checklist", tags: ["checklist", "todo", "task"], commandId: "taskList" },
  { id: "blockquote", label: "Quote", tags: ["quote", "blockquote"], commandId: "blockquote" },
  { id: "codeBlock", label: "Code block", tags: ["code", "block", "```"], commandId: "codeBlock" },
  { id: "divider", label: "Divider", tags: ["divider", "hr", "horizontal"], commandId: "horizontalRule" },
  { id: "image", label: "Image", tags: ["image", "picture", "media"], commandId: "insertImage" },
  { id: "callout", label: "Callout", tags: ["callout", "note", "tip"], commandId: "callout" },
  { id: "sticky-note", label: "Sticky note", tags: ["note", "sticky", "giay note"], commandId: "stickyNote" },
  { id: "flow-diagram", label: "So do", tags: ["diagram", "flow", "block", "node", "wire", "so do"], commandId: "flowDiagram" },
];
const DOCUMENT_COMMAND_ALIAS = {
  bold: "toggleBold",
  italic: "toggleItalic",
  underline: "toggleUnderline",
  strike: "toggleStrike",
  code: "toggleCode",
  alignLeft: "setTextAlign",
  alignCenter: "setTextAlign",
  alignRight: "setTextAlign",
  alignJustify: "setTextAlign",
  heading1: "setHeading1",
  heading2: "setHeading2",
  heading3: "setHeading3",
  heading4: "setHeading4",
  heading5: "setHeading5",
  heading6: "setHeading6",
  clearFormatting: "unsetAllMarks",
  paragraph: "setParagraph",
  blockquote: "toggleBlockquote",
  codeBlock: "toggleCodeBlock",
  bulletList: "toggleBulletList",
  orderedList: "toggleOrderedList",
  taskList: "toggleTaskList",
};

function copyCurrentDocumentBlock(editor) {
  if (!editor?.state) return false;

  const { doc, selection } = editor.state;
  if (!doc || !selection) return false;

  let from = selection.from;
  let to = selection.to;

  if (selection.empty) {
    const $from = doc.resolve(selection.from);
    const depth = Math.max(1, $from.depth);
    const start = depth > 0 ? $from.start(depth) : 1;
    const end = depth > 0 ? $from.end(depth) : doc.content.size;
    from = Math.max(1, start);
    to = Math.max(from, end);
  }

  if (to <= from) return false;

  const slice = doc.slice(from, to);
  const content = slice?.content?.toJSON?.() || [];
  if (!content.length) return false;

  const snapshot = normalizeDocumentModel({ type: "doc", content });
  const text = serializeDocumentToMarkdown(snapshot);
  copyText(text || doc.textBetween(from, to, "\n", "\n"), "ÄÃ£ sao chÃ©p block");
  return true;
}

const documentAutosaveTimers = new Map();
const documentSaveStates = new Map();
const documentHistoryBuffers = new Map();
const DOCUMENT_MIND_MAP_NODE_TEMPLATE = {
  id: "mind-root",
  title: "Ã chÃ­nh",
  children: [],
};
const DOCUMENT_MIND_MAP_NODE_FALLBACK = {
  id: "mind-root",
  title: "Ã chÃ­nh",
  collapsed: false,
  children: [],
};

const DOCUMENT_LEGACY_HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
function createEmptyDocumentJson() {
  return { type: "doc", content: [{ type: "paragraph", content: [] }] };
}

function normalizeHeadingId(value = "") {
  const safe = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/-+/g, "-");
  return safe || `heading-${Math.random().toString(36).slice(2, 10)}`;
}

function flattenDocumentText(node, fallback = "") {
  if (!node) return "";
  if (node.type === "text") return String(node.text || "");
  if (!Array.isArray(node.content)) return fallback;
  return node.content.map((child) => flattenDocumentText(child, "")).join("");
}

function isEmptyDocumentParagraph(node) {
  if (!node || node.type !== "paragraph") return false;
  const hasText = flattenDocumentText(node).trim().length > 0;
  if (hasText) return false;
  return !Array.isArray(node.content) || node.content.every((child) => child?.type === "text" && !String(child.text || "").trim());
}

function isDocumentSectionBoundaryNode(node) {
  return Boolean(node && node.type === "heading");
}

function nearestNonEmptyDocumentNode(nodes = [], startIndex = 0, direction = 1) {
  for (let index = startIndex; index >= 0 && index < nodes.length; index += direction) {
    const node = nodes[index];
    if (!isEmptyDocumentParagraph(node)) return node;
  }
  return null;
}

function shouldKeepEmptyDocumentSeparator(nodes = [], index = 0) {
  const before = nearestNonEmptyDocumentNode(nodes, index - 1, -1);
  const after = nearestNonEmptyDocumentNode(nodes, index + 1, 1);
  return isDocumentSectionBoundaryNode(before) && isDocumentSectionBoundaryNode(after);
}

function removeEmptyDocumentRows(documentJson = createEmptyDocumentJson()) {
  const normalized = normalizeDocumentModel(documentJson);
  const cleanChildren = (nodes = []) => {
    const cleaned = [];
    nodes.forEach((node, index) => {
      const nextNode = Array.isArray(node?.content)
        ? { ...node, content: cleanChildren(node.content) }
        : node;
      if (isEmptyDocumentParagraph(nextNode)) {
        const last = cleaned[cleaned.length - 1];
        if (shouldKeepEmptyDocumentSeparator(nodes, index) && !isEmptyDocumentParagraph(last)) {
          cleaned.push({ type: "paragraph", content: [] });
        }
        return;
      }
      cleaned.push(nextNode);
    });
    return cleaned;
  };
  const content = cleanChildren(normalized.content || []);
  return normalizeDocumentModel({
    ...normalized,
    content: content.length ? content : createEmptyDocumentJson().content,
  });
}

function ensureDocumentHeadingIds(documentJson = createEmptyDocumentJson()) {
  const normalized = sanitizeDocumentDocumentJson(documentJson);
  const titleCount = {};
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "heading") {
      const text = flattenDocumentText(node).trim();
      const base = normalizeHeadingId(text);
      const index = (titleCount[base] || 0) + 1;
      titleCount[base] = index;
      node.attrs = node.attrs || {};
      node.attrs.headingId = `${base}${index > 1 ? `-${index}` : ""}`;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  (normalized.content || []).forEach(walk);
  return normalized;
}

function normalizeMindMapNodes(nodes = []) {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((node) => node && typeof node === "object")
    .map((node) => ({
      id: String(node.id || crypto.randomUUID()),
      text: sanitizeDocumentText(node.text || ""),
      collapsed: Boolean(node.collapsed),
      children: normalizeMindMapNodes(node.children || []),
    }))
    .filter((node) => node.text);
}

function createDefaultMindMapData() {
  return {
    type: DOCUMENT_MIND_MAP_TYPE,
    attrs: {
      title: "Ã chÃ­nh",
      layout: "mindmap",
      mode: "outline",
      nodes: [{
        ...DOCUMENT_MIND_MAP_NODE_TEMPLATE,
        id: crypto.randomUUID(),
      }],
    },
  };
}

function createMindMapFromLines(lines = []) {
  const rawLines = Array.isArray(lines) ? lines.map((line) => String(line || "")).filter((line) => line.trim()) : [];
  const title = sanitizeDocumentText(rawLines[0]?.trim() || "Ã chÃ­nh");
  const nodes = createMindMapBranchNodes(rawLines.slice(1));
  return {
    type: DOCUMENT_MIND_MAP_TYPE,
    attrs: {
      title,
      layout: "mindmap",
      mode: "outline",
      nodes,
    },
  };
}

function createMindMapBranchNodes(lines = []) {
  const entries = (Array.isArray(lines) ? lines : [])
    .map((line) => {
      const raw = String(line || "");
      const indent = raw.match(/^\s*/)?.[0] || "";
      const tabDepth = (indent.match(/\t/g) || []).length;
      const spaceDepth = Math.floor(indent.replace(/\t/g, "").length / 2);
      const text = sanitizeDocumentText(raw.trim().replace(/^([-*+]|\d+[.)]|\[[ xX]\])\s+/, ""));
      return text ? { depth: tabDepth + spaceDepth, text } : null;
    })
    .filter(Boolean);
  if (!entries.length) return [];

  const minDepth = Math.min(...entries.map((entry) => entry.depth));
  const roots = [];
  const stack = [];
  entries.forEach((entry) => {
    const depth = Math.max(0, entry.depth - minDepth);
    const node = {
      id: crypto.randomUUID(),
      text: entry.text,
      collapsed: false,
      children: [],
    };
    if (depth === 0 || !stack[depth - 1]) {
      roots.push(node);
      stack[0] = node;
      stack.length = 1;
      return;
    }
    stack[depth - 1].children.push(node);
    stack[depth] = node;
    stack.length = depth + 1;
  });
  return roots;
}

function displayMindMapBranchNodes(nodes = [], title = "") {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const rootTitle = String(title || "").trim().toLowerCase();
  if (!rootTitle || !safeNodes.length) return safeNodes;
  const firstText = String(safeNodes[0]?.text || "").trim().toLowerCase();
  return firstText === rootTitle ? safeNodes.slice(1) : safeNodes;
}

function updateMindMapNodeText(nodes = [], nodeId = "", text = "") {
  return (Array.isArray(nodes) ? nodes : []).map((node) => {
    if (!node || typeof node !== "object") return node;
    if (String(node.id || "") === String(nodeId || "")) {
      return { ...node, text: sanitizeDocumentText(text || "NhÃ¡nh") };
    }
    return { ...node, children: updateMindMapNodeText(node.children || [], nodeId, text) };
  });
}

function createMindMapInputPayload(value = "") {
  const lines = String(value || "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return null;
  const mindMap = createMindMapFromLines(lines);
  return {
    title: mindMap.attrs.title,
    outline: lines.join("\n"),
    text: lines.join("\n"),
    nodes: mindMap.attrs.nodes,
  };
}

function mindMapAttrsToOutline(attrs = {}) {
  const lines = [sanitizeDocumentText(attrs.title || "Ã chÃ­nh")];
  const appendNodes = (nodes = [], depth = 0) => {
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
      const text = sanitizeDocumentText(node?.text || "").trim();
      if (text) lines.push(`${"  ".repeat(depth)}${text}`);
      appendNodes(node?.children || [], depth + 1);
    });
  };
  appendNodes(displayMindMapBranchNodes(attrs.nodes || [], attrs.title || ""));
  return lines.join("\n");
}

function normalizeFlowDiagramColor(value = "") {
  const color = sanitizeDocumentText(value || "blue").toLowerCase();
  return DOCUMENT_FLOW_DIAGRAM_COLORS.includes(color) ? color : "blue";
}

function normalizeFlowDiagramConnectorSide(value = "", fallback = "right") {
  const side = sanitizeDocumentText(value || fallback).toLowerCase();
  return DOCUMENT_FLOW_DIAGRAM_CONNECTOR_SIDES.includes(side) ? side : fallback;
}

function normalizeFlowDiagramEdgeShape(value = "") {
  const shape = sanitizeDocumentText(value || "curve").toLowerCase();
  return DOCUMENT_FLOW_DIAGRAM_EDGE_SHAPES.includes(shape) ? shape : "curve";
}

function normalizeFlowDiagramEdgeArrow(value = "") {
  const arrow = sanitizeDocumentText(value || "end").toLowerCase();
  return DOCUMENT_FLOW_DIAGRAM_EDGE_ARROWS.includes(arrow) ? arrow : "end";
}

function normalizeFlowDiagramNodes(nodes = []) {
  return (Array.isArray(nodes) ? nodes : [])
    .filter((node) => node && typeof node === "object")
    .map((node, index) => ({
      id: String(node.id || crypto.randomUUID()),
      text: sanitizeDocumentText(node.text || `Block ${index + 1}`),
      x: Math.max(0, Math.min(1800, Number(node.x) || 0)),
      y: Math.max(0, Math.min(1200, Number(node.y) || 0)),
      width: Math.max(120, Math.min(520, Number(node.width) || 220)),
      height: Math.max(64, Math.min(260, Number(node.height) || 86)),
      color: normalizeFlowDiagramColor(node.color),
      autoPlaced: node.autoPlaced !== false,
    }));
}

function normalizeFlowDiagramEdges(edges = [], nodes = [], canvas = {}) {
  const nodeIds = new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node.id || "")));
  const canvasWidth = Math.max(520, Number(canvas.width) || 860);
  const canvasHeight = Math.max(320, Number(canvas.height) || 420);
  return (Array.isArray(edges) ? edges : [])
    .filter((edge) => edge && typeof edge === "object")
    .map((edge) => {
      const from = String(edge.from || edge.fromNodeId || "");
      const to = String(edge.to || edge.toNodeId || "");
      const toPoint = edge.toPoint && typeof edge.toPoint === "object"
        ? {
          x: Math.max(0, Math.min(canvasWidth, Number(edge.toPoint.x) || 0)),
          y: Math.max(0, Math.min(canvasHeight, Number(edge.toPoint.y) || 0)),
        }
        : null;
      if (!nodeIds.has(from)) return null;
      if (!nodeIds.has(to) && !toPoint) return null;
      return {
        id: String(edge.id || crypto.randomUUID()),
        from,
        to: nodeIds.has(to) ? to : "",
        fromSide: normalizeFlowDiagramConnectorSide(edge.fromSide || edge.sourceSide, "right"),
        toSide: normalizeFlowDiagramConnectorSide(edge.toSide || edge.targetSide, "left"),
        shape: normalizeFlowDiagramEdgeShape(edge.shape),
        arrow: normalizeFlowDiagramEdgeArrow(edge.arrow),
        toPoint,
        label: sanitizeDocumentText(edge.label || ""),
      };
    })
    .filter(Boolean);
}

function flowDiagramCanvasAttrs(attrs = {}) {
  return {
    width: Math.max(640, Math.min(1800, Number(attrs.width) || Number(attrs.canvasWidth) || 900)),
    height: Math.max(380, Math.min(1200, Number(attrs.height) || Number(attrs.canvasHeight) || 460)),
    align: ["center", "left"].includes(String(attrs.align || "").toLowerCase()) ? String(attrs.align).toLowerCase() : "center",
  };
}

function autoLayoutFlowDiagramNodes(nodes = [], attrs = {}) {
  const canvas = flowDiagramCanvasAttrs(attrs);
  const safeNodes = normalizeFlowDiagramNodes(nodes);
  if (!safeNodes.length) return [];
  const gap = 34;
  const totalWidth = safeNodes.reduce((sum, node) => sum + node.width, 0) + gap * Math.max(0, safeNodes.length - 1);
  const startX = canvas.align === "left" ? 48 : Math.max(32, Math.round((canvas.width - totalWidth) / 2));
  const centerY = Math.round(canvas.height / 2);
  let cursorX = startX;
  return safeNodes.map((node) => {
    const placed = {
      ...node,
      x: Math.max(16, Math.min(canvas.width - node.width - 16, cursorX)),
      y: Math.max(28, Math.min(canvas.height - node.height - 28, centerY - Math.round(node.height / 2))),
      autoPlaced: true,
    };
    cursorX += node.width + gap;
    return placed;
  });
}

function createFlowDiagramNode(index = 1, attrs = {}) {
  return {
    id: String(attrs.id || crypto.randomUUID()),
    text: sanitizeDocumentText(attrs.text || `Block ${index}`),
    x: Math.max(0, Number(attrs.x) || 0),
    y: Math.max(0, Number(attrs.y) || 0),
    width: Math.max(120, Math.min(520, Number(attrs.width) || 220)),
    height: Math.max(64, Math.min(260, Number(attrs.height) || 86)),
    color: normalizeFlowDiagramColor(attrs.color),
    autoPlaced: attrs.autoPlaced !== false,
  };
}

function createFlowDiagramDocumentNode(attrs = {}) {
  const canvas = flowDiagramCanvasAttrs(attrs);
  const rawNodes = Array.isArray(attrs.nodes) && attrs.nodes.length
    ? attrs.nodes
    : [createFlowDiagramNode(1, { text: attrs.text || "Block 1", color: attrs.color || "blue" })];
  const nodes = autoLayoutFlowDiagramNodes(rawNodes, canvas);
  return {
    type: DOCUMENT_FLOW_DIAGRAM_TYPE,
    attrs: {
      ...canvas,
      nodes,
      edges: normalizeFlowDiagramEdges(attrs.edges || [], nodes, canvas),
    },
  };
}

function flowDiagramNodeCenter(node = {}) {
  return {
    x: Math.round((Number(node.x) || 0) + (Number(node.width) || 220) / 2),
    y: Math.round((Number(node.y) || 0) + (Number(node.height) || 86) / 2),
  };
}

function flowDiagramNodeAnchor(node = {}, side = "right") {
  const normalized = normalizeFlowDiagramConnectorSide(side, "right");
  const x = Number(node.x) || 0;
  const y = Number(node.y) || 0;
  const width = Number(node.width) || 220;
  const height = Number(node.height) || 86;
  if (normalized === "left") return { x, y: Math.round(y + height / 2), side: normalized };
  if (normalized === "top") return { x: Math.round(x + width / 2), y, side: normalized };
  if (normalized === "bottom") return { x: Math.round(x + width / 2), y: y + height, side: normalized };
  return { x: x + width, y: Math.round(y + height / 2), side: normalized };
}

function flowDiagramSideVector(side = "right") {
  const normalized = normalizeFlowDiagramConnectorSide(side, "right");
  if (normalized === "left") return { x: -1, y: 0 };
  if (normalized === "top") return { x: 0, y: -1 };
  if (normalized === "bottom") return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

function flowDiagramEdgePath(fromNode, toNodeOrPoint, edge = {}) {
  const from = flowDiagramNodeAnchor(fromNode, edge.fromSide || "right");
  const to = toNodeOrPoint?.width ? flowDiagramNodeAnchor(toNodeOrPoint, edge.toSide || "left") : {
    x: Math.round(Number(toNodeOrPoint?.x) || from.x + 120),
    y: Math.round(Number(toNodeOrPoint?.y) || from.y),
    side: edge.toSide || "left",
  };
  const shape = normalizeFlowDiagramEdgeShape(edge.shape);
  if (shape === "straight") return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  if (shape === "elbow") {
    if (from.side === "top" || from.side === "bottom") {
      const midY = Math.round((from.y + to.y) / 2);
      return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
    }
    const midX = Math.round((from.x + to.x) / 2);
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }
  const fromVector = flowDiagramSideVector(from.side);
  const toVector = toNodeOrPoint?.width ? flowDiagramSideVector(to.side) : { x: -fromVector.x, y: -fromVector.y };
  const tension = Math.max(70, Math.min(150, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 2)));
  const c1 = { x: Math.round(from.x + fromVector.x * tension), y: Math.round(from.y + fromVector.y * tension) };
  const c2 = { x: Math.round(to.x - toVector.x * tension), y: Math.round(to.y - toVector.y * tension) };
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

function renderFlowDiagramHtml(attrs = {}) {
  const canvas = flowDiagramCanvasAttrs(attrs);
  const nodes = normalizeFlowDiagramNodes(attrs.nodes || []);
  const edges = normalizeFlowDiagramEdges(attrs.edges || [], nodes, canvas);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMarkup = edges.map((edge) => {
    const fromNode = nodeById.get(edge.from);
    const target = edge.to ? nodeById.get(edge.to) : edge.toPoint;
    if (!fromNode || !target) return "";
    return `<path class="document-flow-diagram__edge" d="${escapeHtml(flowDiagramEdgePath(fromNode, target, edge))}" marker-end="url(#document-flow-arrow)" />`;
  }).join("");
  return `<div class="document-flow-diagram document-flow-diagram--${canvas.align}" data-type="${DOCUMENT_FLOW_DIAGRAM_TYPE}" style="--flow-width:${canvas.width}px;--flow-height:${canvas.height}px">
    <svg class="document-flow-diagram__edge-layer" viewBox="0 0 ${canvas.width} ${canvas.height}" aria-hidden="true">
      <defs><marker id="document-flow-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>
      ${edgeMarkup}
    </svg>
    ${nodes.map((node) => `<div class="document-flow-diagram__node document-flow-diagram__node--${escapeHtml(node.color)}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px">${escapeHtml(node.text || "Block")}</div>`).join("")}
  </div>`;
}

function createDocumentTableNode(rows = 3, cols = 3) {
  const rowCount = Math.max(1, Number(rows) || 3);
  const colCount = Math.max(1, Number(cols) || 3);
  return {
    type: "table",
    content: Array.from({ length: rowCount }, () => ({
      type: "tableRow",
      content: Array.from({ length: colCount }, () => ({
        type: "tableCell",
        attrs: { colspan: 1, rowspan: 1 },
        content: [{ type: "paragraph", content: [] }],
      })),
    })),
  };
}

function createStickyNoteDocumentNode(attrs = {}) {
  const html = sanitizeStickyNoteHtml(attrs.html || "");
  const text = sanitizeDocumentText(attrs.text || "Ghi chÃº má»›i");
  return {
    type: DOCUMENT_STICKY_NOTE_TYPE,
    attrs: {
      text,
      html: html || escapeHtml(text).replace(/\n/g, "<br>"),
      color: "dark",
      x: Math.max(16, Number(attrs.x) || 48),
      y: Math.max(16, Number(attrs.y) || 180),
      width: Math.max(220, Math.min(520, Number(attrs.width) || 300)),
      height: Math.max(180, Math.min(720, Number(attrs.height) || 228)),
    },
  };
}

function sanitizeStickyNoteHtml(value = "") {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "BR", "DIV", "P", "SPAN"]);
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (!(child instanceof Element)) {
        child.remove();
        return;
      }
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent || ""));
        return;
      }
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
      clean(child);
    });
  };
  clean(template.content);
  return template.innerHTML;
}

function insertDocumentContentSafely(editor, content) {
  if (!editor || !content) return false;
  try {
    if (editor.chain().focus().insertContent(content).run()) return true;
  } catch (error) {
    console.warn("Document insert at cursor failed", error);
  }
  try {
    const endPosition = Math.max(0, editor.state?.doc?.content?.size || 0);
    return Boolean(editor.chain().focus().insertContentAt(endPosition, content).run());
  } catch (error) {
    console.warn("Document insert at end failed", error);
    return false;
  }
}

function createMindMapDocumentNode(attrs = {}) {
  const title = sanitizeDocumentText(attrs.title || "Ã chÃ­nh");
  const source = Array.isArray(attrs.nodes)
    ? attrs.nodes
    : createMindMapFromLines(String(attrs.text || attrs.outline || "").split("\n")).attrs.nodes;
  const outline = sanitizeDocumentText(attrs.outline || attrs.text || mindMapAttrsToOutline({ title, nodes: source }));
  return {
    type: DOCUMENT_MIND_MAP_TYPE,
    attrs: {
      title,
      outline,
      layout: "mindmap",
      mode: attrs.mode || "outline",
      nodes: source,
    },
  };
}

function replaceMindMapAtPosition(editor, position, mindMapNode) {
  if (!editor || !mindMapNode || !Number.isFinite(position)) return false;
  const node = editor.state?.doc?.nodeAt(position);
  if (!node || node.type?.name !== DOCUMENT_MIND_MAP_TYPE) return false;
  try {
    return Boolean(editor.chain().focus().deleteRange({ from: position, to: position + node.nodeSize }).insertContentAt(position, mindMapNode).run());
  } catch (error) {
    console.warn("Mind map replace failed", error);
    return false;
  }
}

function serializeMindMapNodes(nodes = [], depth = 0) {
  if (!Array.isArray(nodes) || !nodes.length) return "";
  const inner = nodes.map((node) => {
    const children = serializeMindMapNodes(node.children || [], depth + 1);
    const marker = `<li data-mindmap-node="${sanitizeDocumentText(node.id || "")}">
      <span>${escapeHtml(node.text || "")}</span>
      ${children ? `<ol>${children}</ol>` : ""}
    </li>`;
    return marker;
  }).join("");
  return inner;
}

function renderMindMapHtmlBranches(nodes = []) {
  if (!Array.isArray(nodes) || !nodes.length) return `<div class="document-mindmap__empty">ChÆ°a cÃ³ nhÃ¡nh</div>`;
  return `<div class="document-mindmap__branches">${nodes.map((node) => {
    const children = renderMindMapHtmlBranches(node.children || []);
    return `<div class="document-mindmap__branch" data-mindmap-node="${sanitizeDocumentText(node.id || "")}">
      <span class="document-mindmap__line"></span>
      <div class="document-mindmap__node">${escapeHtml(node.text || "NhÃ¡nh")}</div>
      ${Array.isArray(node.children) && node.children.length ? children : ""}
    </div>`;
  }).join("")}</div>`;
}

function findActiveDocumentSession(documentId) {
  return documentEditorSessions.get(documentId) || null;
}

function sanitizeDocumentUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const lowered = normalized.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:")) return "";
  if (lowered.startsWith("data:") && !lowered.startsWith("data:image/")) return "";
  if (lowered.startsWith("blob:") || lowered.startsWith("data:image/")) return normalized;
  try {
    new URL(normalized, window.location.href);
    if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) return "";
    return normalized;
  } catch {
    if (/^\/|^[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/.test(normalized)) return normalized;
    return "";
  }
}

function sanitizeDocumentText(value) {
  const text = String(value ?? "").replace(/\u0000/g, "");
  if (text.length <= DOCUMENT_MAX_TEXT_LENGTH) return text;
  return text.slice(0, DOCUMENT_MAX_TEXT_LENGTH);
}

function repairVietnameseText(value = "") {
  let text = String(value ?? "");
  if (/[ÃÄÆ]|áº|á»/.test(text)) {
    try {
      const windows1252Bytes = {
        "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
        "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
        "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
        "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
      };
      const byteValues = Array.from(text, (char) => {
        const code = char.charCodeAt(0);
        if (code <= 255) return code;
        return windows1252Bytes[char] ?? null;
      });
      if (byteValues.every((byte) => byte !== null)) {
        const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(byteValues));
        if (decoded && decoded !== text) text = decoded;
      }
    } catch {
      try {
        const bytes = Array.from(text, (char) => {
          const code = char.charCodeAt(0);
          return code <= 255 ? `%${code.toString(16).padStart(2, "0")}` : encodeURIComponent(char);
        }).join("");
        const decoded = decodeURIComponent(bytes);
        if (decoded && decoded !== text) text = decoded;
      } catch {
        // Keep original text when it is already valid Unicode.
      }
    }
  }
  if (/[ÃÄÆ]|áº|á»/.test(text)) {
    [
      ["TÃ i liá»‡u", "Tài liệu"],
      ["tÃ i liá»‡u", "tài liệu"],
      ["ThÃªm", "Thêm"],
      ["TÃ¬m", "Tìm"],
      ["KhÃ´ng", "Không"],
      ["KHÃ´NG", "KHÔNG"],
      ["ná»™i dung", "nội dung"],
      ["NÁ»™I DUNG", "NỘI DUNG"],
      ["LÆ°u", "Lưu"],
      ["giÃ¡o trÃ¬nh", "giáo trình"],
      ["vÃ ", "và"],
      ["ná»™i", "nội"],
      ["xuáº¥t", "xuất"],
      ["Ä‘á»ƒ", "để"],
      ["báº¥m", "bấm"],
      ["Ä‘á»c", "đọc"],
    ].forEach(([broken, fixed]) => {
      text = text.replaceAll(broken, fixed);
    });
  }
  return text
    .replaceAll("Giao trinh", "Giáo trình")
    .replaceAll("Khoa hoc", "Khóa học")
    .replaceAll("Tai lieu chung", "Tài liệu chung");
}

function escapeUiText(value = "") {
  return escapeHtml(repairVietnameseText(value));
}

function repairRenderedVietnameseText(root = document.body) {
  if (!root) return;
  const shouldSkip = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest?.(".ProseMirror, [contenteditable='true'], script, style, code, pre"));
  };
  const repairNodeText = (node) => {
    const current = node.nodeValue || "";
    const repaired = repairVietnameseText(current);
    if (repaired !== current) node.nodeValue = repaired;
  };

  if (!shouldSkip(root)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        return /[ÃÄÆ]|áº|á»/.test(node.nodeValue || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(repairNodeText);
  }

  const selector = "input[placeholder], textarea[placeholder], [title], [aria-label], option";
  const elements = root.matches?.(selector) ? [root, ...root.querySelectorAll?.(selector) || []] : [...root.querySelectorAll?.(selector) || []];
  elements.forEach((element) => {
    if (shouldSkip(element)) return;
    ["placeholder", "title", "aria-label"].forEach((attribute) => {
      if (!element.hasAttribute?.(attribute)) return;
      const current = element.getAttribute(attribute) || "";
      const repaired = repairVietnameseText(current);
      if (repaired !== current) element.setAttribute(attribute, repaired);
    });
    if (element.tagName === "OPTION") {
      const current = element.textContent || "";
      const repaired = repairVietnameseText(current);
      if (repaired !== current) element.textContent = repaired;
    }
  });
}

function sanitizeDocumentDocumentJson(json) {
  if (!json || typeof json !== "object") return createEmptyDocumentJson();
  const normalizeMarks = (marks) => {
    if (!Array.isArray(marks)) return [];
    const seen = new Set();
    return marks
      .map((mark) => {
        if (!mark || typeof mark !== "object" || !mark.type) return null;
        if (mark.type === "link") {
          const href = sanitizeDocumentUrl(mark.attrs?.href);
          if (!href) return null;
          return { type: "link", attrs: { href } };
        }
        if (mark.type === "textStyle") {
          const color = sanitizeDocumentText(mark.attrs?.color);
          const background = sanitizeDocumentText(mark.attrs?.backgroundColor);
          if (!color && !background) return null;
          return { type: "textStyle", attrs: { ...(color ? { color } : {}), ...(background ? { backgroundColor: background } : {}) } };
        }
        if (mark.type === "highlight") {
          const color = sanitizeDocumentText(mark.attrs?.color || mark.attrs?.backgroundColor || "");
          if (!color) return null;
          return { type: "highlight", attrs: { color } };
        }
        if (["bold", "italic", "strike", "underline", "code"].includes(mark.type)) return { type: mark.type };
        return null;
      })
      .filter(Boolean)
      .filter((mark) => {
        const key = `${mark.type}:${JSON.stringify(mark.attrs || {})}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const sanitizeNode = (node) => {
    if (!node || typeof node !== "object") return null;
    if (node.type === "text") {
      const text = sanitizeDocumentText(node.text || "");
      return { type: "text", text, marks: normalizeMarks(node.marks || []) };
    }
    if (node.type === "paragraph") return { type: "paragraph", content: normalizeChildren(node.content || []) };
    if (node.type === "blockquote") return { type: "blockquote", content: normalizeChildren(node.content || []) };
    if (node.type === "codeBlock") return { type: "codeBlock", content: normalizeChildren(node.content || []) };
    if (node.type === "heading") {
      const level = Number(node.attrs?.level) || 1;
      return {
        type: "heading",
        attrs: {
          level: Math.min(6, Math.max(1, Number(level))),
          headingId: sanitizeDocumentText(node.attrs?.headingId || ""),
        },
        content: normalizeChildren(node.content || []),
      };
    }
    if (node.type === "bulletList") return { type: "bulletList", content: normalizeChildren(node.content || []) };
    if (node.type === "orderedList") return { type: "orderedList", content: normalizeChildren(node.content || []) };
    if (node.type === "taskList" || node.type === "taskItem") return { type: node.type, attrs: node.type === "taskItem" ? { checked: Boolean(node.attrs?.checked) } : undefined, content: normalizeChildren(node.content || []) };
    if (node.type === "listItem") return { type: "listItem", content: normalizeChildren(node.content || []) };
    if (node.type === "table") return { type: "table", attrs: { colwidth: Array.isArray(node.attrs?.colwidth) ? node.attrs.colwidth : [] }, content: normalizeChildren(node.content || []) };
    if (node.type === "tableRow") return { type: "tableRow", content: normalizeChildren(node.content || []) };
    if (node.type === "tableCell") return { type: "tableCell", attrs: { colspan: Math.max(1, Number(node.attrs?.colspan) || 1), rowspan: Math.max(1, Number(node.attrs?.rowspan) || 1) }, content: normalizeChildren(node.content || []) };
    if (node.type === DOCUMENT_MIND_MAP_TYPE) return { type: DOCUMENT_MIND_MAP_TYPE, attrs: { ...(node.attrs || {}), nodes: Array.isArray(node.attrs?.nodes) ? node.attrs.nodes : [] } };
    if (node.type === DOCUMENT_FLOW_DIAGRAM_TYPE) {
      const canvas = flowDiagramCanvasAttrs(node.attrs || {});
      const nodes = normalizeFlowDiagramNodes(node.attrs?.nodes || []);
      return {
        type: DOCUMENT_FLOW_DIAGRAM_TYPE,
        attrs: {
          ...canvas,
          nodes,
          edges: normalizeFlowDiagramEdges(node.attrs?.edges || [], nodes, canvas),
        },
      };
    }
    if (node.type === DOCUMENT_STICKY_NOTE_TYPE) {
      return {
        type: DOCUMENT_STICKY_NOTE_TYPE,
        attrs: {
          text: sanitizeDocumentText(node.attrs?.text || node.text || "Ghi chÃº má»›i"),
          html: sanitizeStickyNoteHtml(node.attrs?.html || ""),
          color: "dark",
          x: Math.max(0, Number(node.attrs?.x) || 48),
          y: Math.max(0, Number(node.attrs?.y) || 180),
          width: Math.max(220, Math.min(520, Number(node.attrs?.width) || 300)),
          height: Math.max(180, Math.min(720, Number(node.attrs?.height) || 228)),
        },
      };
    }
    if (node.type === "image") {
      const src = sanitizeDocumentUrl(node.attrs?.src || node.src);
      if (!src) return null;
      return {
        type: "image",
        attrs: {
          src,
          alt: sanitizeDocumentText(node.attrs?.alt || node.alt || ""),
          title: sanitizeDocumentText(node.attrs?.title || ""),
          caption: sanitizeDocumentText(node.attrs?.caption || ""),
          width: sanitizeDocumentText(node.attrs?.width || ""),
          height: sanitizeDocumentText(node.attrs?.height || ""),
          align: sanitizeDocumentText(node.attrs?.align || ""),
          uploadState: sanitizeDocumentText(node.attrs?.uploadState || ""),
        },
      };
    }
    if (node.type === "callout") {
      return {
        type: "callout",
        attrs: {
          type: sanitizeDocumentText(node.attrs?.type || "info"),
          title: sanitizeDocumentText(node.attrs?.title || ""),
        },
        content: normalizeChildren(node.content || []),
      };
    }
    return null;
  };

  const normalizeChildren = (nodes) => {
    const result = (Array.isArray(nodes) ? nodes : [])
      .map((item) => sanitizeNode(item))
      .filter(Boolean)
      .flatMap((item) => (Array.isArray(item) ? item : [item]));
    return result.length ? result : [];
  };

  const docContent = normalizeChildren(json?.content || []);
  return { type: "doc", content: docContent.length ? docContent : [{ type: "paragraph", content: [] }] };
}

function validateDocumentJson(json) {
  if (!json || typeof json !== "object" || json.type !== "doc" || !Array.isArray(json.content)) return false;
  return true;
}

function normalizeDocumentModel(json) {
  const sanitized = sanitizeDocumentDocumentJson(json && typeof json === "object" ? json : null);
  if (!Array.isArray(sanitized.content)) sanitized.content = [{ type: "paragraph", content: [] }];
  return ensureDocumentHeadingIds(sanitized);
}

function getDocumentEditorLib() {
  const lib = window.__documentEditorLib || {};
  return {
    core: lib.core || {},
    StarterKit: lib.StarterKit,
    Link: lib.Link,
    TextAlign: lib.TextAlign,
    TextStyle: lib.TextStyle,
    Color: lib.Color,
    Highlight: lib.Highlight,
    Underline: lib.Underline,
    Image: lib.Image,
    Table: lib.Table,
    TableRow: lib.TableRow,
    TableHeader: lib.TableHeader,
    TableCell: lib.TableCell,
    TaskList: lib.TaskList,
    TaskItem: lib.TaskItem,
  };
}

function normalizeEditorModule(module) {
  return module?.default || module;
}

function ensureDocumentEditorLibraryLoaded() {
  if (DOCUMENT_EDITOR_TIPTAP_READY()) return Promise.resolve(window.__documentEditorLib);
  if (documentEditorLibPromise) return documentEditorLibPromise;

  window.__documentEditorLibLoading = true;
  window.__documentEditorLibError = "";
  const entries = Object.entries(DOCUMENT_EDITOR_IMPORT_URLS);
  documentEditorLibPromise = Promise.all(entries.map(([, url]) => import(url)))
    .then((modules) => {
      const loaded = {};
      entries.forEach(([key], index) => {
        loaded[key] = key === "core" ? modules[index] : normalizeEditorModule(modules[index]);
      });
      window.__documentEditorLib = {
        core: loaded.core,
        StarterKit: loaded.StarterKit,
        Link: loaded.Link,
        TextAlign: loaded.TextAlign,
        TextStyle: loaded.TextStyle,
        Color: loaded.Color,
        Highlight: loaded.Highlight,
        Underline: loaded.Underline,
        Image: loaded.Image,
        Table: loaded.Table,
        TableRow: loaded.TableRow,
        TableHeader: loaded.TableHeader,
        TableCell: loaded.TableCell,
        TaskList: loaded.TaskList,
        TaskItem: loaded.TaskItem,
        ready: true,
      };
      window.__documentEditorLibReady = true;
      window.__documentEditorLibLoading = false;
      window.dispatchEvent(new CustomEvent("document-editor-lib-ready"));
      return window.__documentEditorLib;
    })
    .catch((error) => {
      window.__documentEditorLibLoading = false;
      window.__documentEditorLibReady = false;
      window.__documentEditorLibError = String(error?.message || error || "KhÃ´ng táº£i Ä‘Æ°á»£c editor");
      documentEditorLibPromise = null;
      console.error("Document editor engine failed to load", error);
      window.dispatchEvent(new CustomEvent("document-editor-lib-error"));
      return null;
    });

  return documentEditorLibPromise;
}

function getTiptapEditorCore() {
  const { core } = getDocumentEditorLib();
  return core.Editor ? core : core.default || {};
}

function normalizeTiptapEditorClass() {
  const { core } = getDocumentEditorLib();
  return core.Editor || core.default?.Editor || null;
}

function getBrowserEditorSelection(editor) {
  const selection = window.getSelection();
  if (!editor?.view?.dom || !selection?.rangeCount || !selection.anchorNode || !selection.focusNode) return null;
  if (!editor.view.dom.contains(selection.anchorNode) || !editor.view.dom.contains(selection.focusNode)) return null;
  const range = selection.getRangeAt(0);
  const text = selection.toString();
  if (!text.trim()) return null;
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  if (!normalize(editor.view.dom.innerText || editor.view.dom.textContent).includes(normalize(text))) return null;
  try {
    const from = editor.view.posAtDOM(range.startContainer, range.startOffset);
    const to = editor.view.posAtDOM(range.endContainer, range.endOffset);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return null;
    return { from: Math.min(from, to), to: Math.max(from, to), text };
  } catch {
    return null;
  }
}

function convertSelectionToSimpleList(editor, listType = "bulletList") {
  const selection = editor?.state?.selection;
  const browserSelection = getBrowserEditorSelection(editor);
  const savedSelection = documentEditorCommandSelection;
  const from = browserSelection?.from ?? savedSelection?.from ?? selection?.from;
  const to = browserSelection?.to ?? savedSelection?.to ?? selection?.to;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return false;
  const text = browserSelection?.text || savedSelection?.text || editor.state.doc.textBetween(from, to, "\n", "\n");
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => sanitizeDocumentText(line).trim())
    .filter(Boolean);
  if (!lines.length) return false;
  documentEditorCommandSelection = null;
  const tag = listType === "orderedList" ? "ol" : "ul";
  const listHtml = `<${tag}>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</${tag}>`;
  const resolvedFrom = editor.state.doc.resolve(Math.max(0, Math.min(from, editor.state.doc.content.size)));
  const resolvedTo = editor.state.doc.resolve(Math.max(0, Math.min(to, editor.state.doc.content.size)));
  const selectedAllText = String(editor.view.dom.innerText || editor.view.dom.textContent || "").replace(/\s+/g, " ").trim() === String(text || "").replace(/\s+/g, " ").trim();
  const replaceFrom = selectedAllText ? 0 : (resolvedFrom.depth ? resolvedFrom.before(1) : from);
  const replaceTo = selectedAllText ? editor.state.doc.content.size : (resolvedTo.depth ? resolvedTo.after(1) : to);
  if (browserSelection && document.queryCommandSupported?.("insertHTML")) {
    const inserted = document.execCommand("insertHTML", false, listHtml);
    if (inserted) {
      editor.commands.setContent(editor.view.dom.innerHTML, true);
      return true;
    }
  }
  if (typeof editor.commands?.insertContentAt === "function") {
    return Boolean(editor.commands.insertContentAt({ from: replaceFrom, to: replaceTo }, listHtml));
  }
  return Boolean(editor.chain().focus().deleteRange({ from: replaceFrom, to: replaceTo }).insertContent(listHtml).run());
}

function resolveSessionMenu(session, id) {
  if (!session?.menus) return null;
  return session.menus[id] || null;
}

function createDocumentCommandBus(editor) {
  if (!editor) return null;

  const execute = (commandId, payload = null) => {
    if (!editor || !commandId) return false;
    const chain = editor.chain().focus();
    const run = (fn) => Boolean(fn?.run && fn.run());
    const runCommand = (name, ...args) => {
      const command = chain[name];
      if (typeof command !== "function") return false;
      return run(command.apply(chain, args));
    };

    if (commandId === "heading1") return run(chain.setHeading({ level: 1 }));
    if (commandId === "heading2") return run(chain.setHeading({ level: 2 }));
    if (commandId === "heading3") return run(chain.setHeading({ level: 3 }));
    if (commandId === "heading4") return run(chain.setHeading({ level: 4 }));
    if (commandId === "heading5") return run(chain.setHeading({ level: 5 }));
    if (commandId === "heading6") return run(chain.setHeading({ level: 6 }));
    if (commandId === "paragraph") return run(chain.setParagraph());
    if (commandId === "blockquote") return run(chain.toggleBlockquote());
    if (commandId === "codeBlock") return run(chain.toggleCodeBlock());
    if (commandId === "horizontalRule") return run(chain.setHorizontalRule());
    if (commandId === "bulletList") {
      if (!editor.state.selection.empty && convertSelectionToSimpleList(editor, "bulletList")) return true;
      return run(chain.toggleBulletList()) || convertSelectionToSimpleList(editor, "bulletList");
    }
    if (commandId === "orderedList") {
      if (!editor.state.selection.empty && convertSelectionToSimpleList(editor, "orderedList")) return true;
      return run(chain.toggleOrderedList()) || convertSelectionToSimpleList(editor, "orderedList");
    }
    if (commandId === "taskList") return run(chain.toggleTaskList());
    if (commandId === "bold") return run(chain.toggleBold());
    if (commandId === "italic") return run(chain.toggleItalic());
    if (commandId === "underline") return run(chain.toggleUnderline());
    if (commandId === "strike") return run(chain.toggleStrike());
    if (commandId === "code") return run(chain.toggleCode());
    if (commandId === "clearFormatting") return run(chain.unsetAllMarks());
    if (commandId === "removeEmptyRows") {
      const cleaned = removeEmptyDocumentRows(editor.getJSON());
      return editor.commands.setContent(cleaned, true);
    }
    if (commandId === "alignLeft") return run(chain.setTextAlign("left"));
    if (commandId === "alignCenter") return run(chain.setTextAlign("center"));
    if (commandId === "alignRight") return run(chain.setTextAlign("right"));
    if (commandId === "alignJustify") return run(chain.setTextAlign("justify"));
    if (commandId === "textColor") {
      const color = sanitizeDocumentText(payload || "");
      if (!color) {
        const unsetColorCommand = chain.unsetColor?.();
        if (unsetColorCommand) return run(unsetColorCommand);
        return run(chain.unsetAllMarks());
      }
      return run(chain.setColor(color));
    }
    if (commandId === "textHighlight") {
      const color = sanitizeDocumentText(payload || "");
      if (!color) return typeof chain.unsetHighlight === "function" ? run(chain.unsetHighlight()) : false;
      return typeof chain.setHighlight === "function" ? run(chain.setHighlight({ color })) : false;
    }
    if (commandId === "align") {
      const alignment = String(payload || "").toLowerCase();
      if (!alignment) return false;
      return runCommand("setTextAlign", alignment);
    }
    if (commandId === "sinkListItem") return runCommand("sinkListItem", "listItem");
    if (commandId === "liftListItem") return runCommand("liftListItem", "listItem");
    if (commandId === "demoteBlockLevel") {
      const parentNames = getSelectionParentNodeNames(editor);
      if (parentNames.includes("listItem") && runCommand("sinkListItem", "listItem")) return true;
      if (parentNames.includes("taskItem") && runCommand("sinkListItem", "taskItem")) return true;
      if (editor.isActive("heading")) {
        const level = Math.min(6, Math.max(1, Number(editor.getAttributes("heading")?.level) || 1) + 1);
        return run(chain.setHeading({ level }));
      }
      return run(chain.insertContent("\u00a0\u00a0\u00a0\u00a0"));
    }
    if (commandId === "promoteBlockLevel") {
      const parentNames = getSelectionParentNodeNames(editor);
      if (parentNames.includes("listItem") && runCommand("liftListItem", "listItem")) return true;
      if (parentNames.includes("taskItem") && runCommand("liftListItem", "taskItem")) return true;
      if (editor.isActive("heading")) {
        const currentLevel = Math.min(6, Math.max(1, Number(editor.getAttributes("heading")?.level) || 1));
        if (currentLevel <= 1) return run(chain.setParagraph());
        return run(chain.setHeading({ level: currentLevel - 1 }));
      }
      return false;
    }
    if (commandId === "link") {
      const href = sanitizeDocumentUrl(payload || "");
      if (!href) return false;
      return run(chain.setLink({ href }));
    }
    if (commandId === "unlink") return run(chain.unsetLink());
    if (commandId === "insertImage") {
      const imageData = payload && typeof payload === "object" ? payload : { src: payload };
      const src = sanitizeDocumentUrl(imageData?.src || "");
      if (!src) return false;
      const alt = sanitizeDocumentText(imageData?.alt || "");
      const title = sanitizeDocumentText(imageData?.title || alt || "");
      return run(chain.setImage({
        src,
        alt: alt || "Image",
        title: title || "Image",
      }));
    }
    if (commandId === "openLink") {
      const href = sanitizeDocumentUrl(payload || "");
      if (!href) return false;
      return run(chain.setLink({ href }));
    }
    if (commandId === "table") {
      const rows = Number(payload?.rows || 3);
      const cols = Number(payload?.cols || 3);
      if (typeof chain.insertTable === "function" && run(chain.insertTable({ rows: Math.max(1, rows), cols: Math.max(1, cols), withHeaderRow: false }))) return true;
      return insertDocumentContentSafely(editor, createDocumentTableNode(rows, cols));
    }
    if (commandId === "stickyNote") {
      const existingNotes = [];
      editor.state?.doc?.descendants?.((node) => {
        if (node.type?.name === DOCUMENT_STICKY_NOTE_TYPE) existingNotes.push(node);
      });
      const offset = existingNotes.length * 22;
      return insertDocumentContentSafely(editor, [createStickyNoteDocumentNode({ x: 56 + offset, y: 170 + offset, ...(payload || {}) }), { type: "paragraph", content: [] }]);
    }
    if (commandId === "flowDiagram") {
      return insertDocumentContentSafely(editor, [createFlowDiagramDocumentNode(payload || {}), { type: "paragraph", content: [] }]);
    }
    if (commandId === "insertMindMap") {
      const attrs = payload?.attrs || payload || {};
      return insertDocumentContentSafely(editor, [createMindMapDocumentNode(attrs), { type: "paragraph", content: [] }]);
      const title = sanitizeDocumentText(attrs.title || "Ã chÃ­nh");
      const source = Array.isArray(attrs.nodes) ? attrs.nodes : createMindMapFromLines(String(attrs.text || "").split("\n")).attrs.nodes;
      const mindMapNode = {
        type: DOCUMENT_MIND_MAP_TYPE,
        attrs: {
          title,
          layout: "mindmap",
          mode: attrs.mode || "outline",
          nodes: source.length ? source : [{ id: crypto.randomUUID(), text: "Ã chÃ­nh", collapsed: false, children: [] }],
        },
      };
      return insertDocumentContentSafely(editor, [mindMapNode, { type: "paragraph", content: [] }]);
    }
    if (commandId === "uploadImage") {
      const safe = sanitizeDocumentUrl(payload?.src || payload || "");
      if (!safe) return false;
      return run(chain.setImage({ src: safe, alt: "áº¢nh Ä‘Ã­nh kÃ¨m" }));
    }
    if (commandId === "tableAddRowAfter") return runCommand("addRowAfter");
    if (commandId === "tableAddRowBefore") return runCommand("addRowBefore");
    if (commandId === "tableDeleteRow") return runCommand("deleteRow");
    if (commandId === "tableAddColumnAfter") return runCommand("addColumnAfter");
    if (commandId === "tableAddColumnBefore") return runCommand("addColumnBefore");
    if (commandId === "tableDeleteColumn") return runCommand("deleteColumn");
    if (commandId === "tableDeleteTable") return runCommand("deleteTable");
    if (commandId === "tableMergeCells") return runCommand("mergeCells");
    if (commandId === "tableSplitCell") return runCommand("splitCell");
    if (commandId === "tableToggleHeaderRow") return runCommand("toggleHeaderRow");
    if (commandId === "tableToggleHeaderColumn") return runCommand("toggleHeaderColumn");
    if (commandId === "tableNextCell") return runCommand("goToNextCell");
    if (commandId === "tablePreviousCell") return runCommand("goToPreviousCell");
    if (commandId === "callout") return run(chain.insertContent({
      type: "callout",
      attrs: {
        title: sanitizeDocumentText(payload?.title || "Ghi chÃº"),
        type: "info",
      },
      content: [{ type: "paragraph", content: [] }],
    }));
    if (commandId === "undo") return run(chain.undo());
    if (commandId === "redo") return run(chain.redo());
    if (commandId === "copyBlock") return copyCurrentDocumentBlock(editor);
    if (commandId === "convertSelectionToMindMap") {
      const { from, to } = editor.state.selection;
      if (from >= to) return false;
      const text = editor.state.doc.textBetween(from, to, "\n");
      const lines = String(text || "").split("\n").map((line) => sanitizeDocumentText(line).trim()).filter(Boolean);
      if (!lines.length) return false;
      const mindMapNode = createMindMapFromLines(lines);
      return run(chain.deleteSelection().insertContent(mindMapNode));
    }
    return false;
  };

  const isActive = (commandId) => {
    if (!editor) return false;
    if (commandId === "bold") return editor.isActive("bold");
    if (commandId === "italic") return editor.isActive("italic");
    if (commandId === "underline") return editor.isActive("underline");
    if (commandId === "strike") return editor.isActive("strike");
    if (commandId === "code") return editor.isActive("code");
    if (commandId === "link") return editor.isActive("link");
    if (commandId === "bulletList") return editor.isActive("bulletList");
    if (commandId === "orderedList") return editor.isActive("orderedList");
    if (commandId === "taskList") return editor.isActive("taskList");
    if (/^heading[1-6]$/.test(commandId)) {
      const level = Number(commandId.replace("heading", ""));
      return editor.isActive("heading", { level });
    }
    if (commandId === "paragraph") return editor.isActive("paragraph");
    if (commandId === "blockquote") return editor.isActive("blockquote");
    if (commandId === "codeBlock") return editor.isActive("codeBlock");
    if (commandId === "taskList") return editor.isActive("taskList");
    if (commandId === "table") return editor.isActive("table");
    if (commandId === "alignLeft") return editor.isActive({ textAlign: "left" });
    if (commandId === "alignCenter") return editor.isActive({ textAlign: "center" });
    if (commandId === "alignRight") return editor.isActive({ textAlign: "right" });
    if (commandId === "alignJustify") return editor.isActive({ textAlign: "justify" });
    if (commandId === "textColor") return editor.isActive("textStyle");
    if (commandId === "textHighlight") return editor.isActive("highlight");
    return false;
  };

  return { execute, isActive };
}

function buildDocumentEditorExtensions() {
  const lib = getDocumentEditorLib();
  const extensionList = [];
  if (lib.StarterKit) {
    extensionList.push(typeof lib.StarterKit.configure === "function"
      ? lib.StarterKit.configure({ history: { newGroupDelay: 250 } })
      : lib.StarterKit);
  }
  if (lib.TextAlign) extensionList.push(lib.TextAlign.configure({ types: ["heading", "paragraph", "blockquote"] }));
  if (lib.TextStyle) extensionList.push(lib.TextStyle);
  if (lib.Color) extensionList.push(lib.Color);
  if (lib.Highlight) extensionList.push(lib.Highlight.configure({ multicolor: true }));
  if (lib.Underline) extensionList.push(lib.Underline);
  if (lib.Link) extensionList.push(lib.Link.configure({ openOnClick: false, autolink: true }));
  if (lib.Image) extensionList.push(lib.Image.configure({ inline: false, allowBase64: true }));
  if (lib.Table) extensionList.push(lib.Table.configure({ resizable: true }));
  if (lib.TableRow) extensionList.push(lib.TableRow);
  if (lib.TableHeader) extensionList.push(lib.TableHeader);
  if (lib.TableCell) extensionList.push(lib.TableCell);
  if (lib.TaskList) extensionList.push(lib.TaskList);
  if (lib.TaskItem) extensionList.push(lib.TaskItem.configure({ nested: true }));

  const mindMapExt = createMindMapNodeExtension();
  const flowDiagramExt = createFlowDiagramNodeExtension();
  const calloutExt = createCalloutNodeExtension();
  const stickyNoteExt = createStickyNoteNodeExtension();
  if (mindMapExt) extensionList.push(mindMapExt);
  if (flowDiagramExt) extensionList.push(flowDiagramExt);
  if (calloutExt) extensionList.push(calloutExt);
  if (stickyNoteExt) extensionList.push(stickyNoteExt);
  return extensionList;
}

function createDocumentEditorSessionState(documentId) {
  return {
    id: documentId,
    root: null,
    editor: null,
    commandBus: null,
    menus: { slash: null, bubble: null, context: null },
    autosaveTimer: null,
    saveState: "saved",
    slashFilter: "",
    slashStart: null,
    isSlashOpen: false,
    slashIndex: 0,
    slashCommands: [],
    _menuBound: false,
    _lastSlashText: "",
    _pendingSelection: null,
  };
}

function documentIdFromSession(session) {
  return session?.id || "";
}

function setDocumentSaveState(documentId, status) {
  if (!documentId) return;
  documentSaveStates.set(documentId, status);
}

function updateDocumentSessionDocumentJson(documentId, nextJson) {
  const normalized = normalizeDocumentModel(nextJson);
  const documentItem = state.documents.find((item) => item.id === documentId);
  if (!documentItem) return null;
  documentItem.contentJson = normalized;
  documentItem.content = serializeDocumentToHtml(normalized);
  documentItem.updatedAt = new Date().toISOString();
  documentItem.contentVersion = DOCUMENT_MODEL_VERSION;
  documentItem.legacyContent = documentItem.legacyContent || documentItem.content;
  state.documents = state.documents.map((item) => (item.id === documentId ? documentItem : item));
  const history = documentHistoryBuffers.get(documentId) || [];
  history.push({ createdAt: new Date().toISOString(), contentJson: normalized });
  if (history.length > DOCUMENT_HISTORY_LIMIT) history.shift();
  documentHistoryBuffers.set(documentId, history);
  documentItem.history = history;
  return documentItem;
}

function documentTocLevelNumber(item) {
  return Number(String(item?.level || "h1").replace(/[^0-9]/g, "")) || 1;
}

function documentTocSemanticLevel(title = "", fallbackLevel = 1) {
  const normalized = String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (/^chuong\s+\d+/.test(normalized)) return 2;
  if (/^bai\s+\d+(?:\.\d+)*/.test(normalized)) return 3;
  return Math.min(3, Math.max(1, Number(fallbackLevel) || 1));
}

function documentTocItemHasChildren(items, index) {
  const level = documentTocLevelNumber(items[index]);
  for (let next = index + 1; next < items.length; next += 1) {
    const nextLevel = documentTocLevelNumber(items[next]);
    if (nextLevel <= level) return false;
    if (nextLevel > level) return true;
  }
  return false;
}

function documentTocItemIsHidden(items, index) {
  for (let previous = index - 1; previous >= 0; previous -= 1) {
    const previousLevel = documentTocLevelNumber(items[previous]);
    const currentLevel = documentTocLevelNumber(items[index]);
    if (previousLevel >= currentLevel) continue;
    if (state.documentTocCollapsedBranches?.[items[previous].id]) return true;
  }
  return false;
}

function renderDocumentTocInner(active) {
  const items = documentTocItems(active);
  return `
    <div class="document-toc__head">
      <span>M\u1ee4C L\u1ee4C</span>
      <button class="icon-button" type="button" data-document-toc-toggle aria-label="${state.documentTocCollapsed ? "M\u1edf m\u1ee5c l\u1ee5c" : "Thu g\u1ecdn m\u1ee5c l\u1ee5c"}" title="${state.documentTocCollapsed ? "M\u1edf m\u1ee5c l\u1ee5c" : "Thu g\u1ecdn m\u1ee5c l\u1ee5c"}">
        ${state.documentTocCollapsed ? "+" : "-"}
      </button>
    </div>
    <div class="document-toc__items">
      ${items.map((item, index) => {
        const hasChildren = documentTocItemHasChildren(items, index);
        const isCollapsed = Boolean(state.documentTocCollapsedBranches?.[item.id]);
        const isHidden = documentTocItemIsHidden(items, index);
        const itemTitle = repairVietnameseText(item.title);
        return `
          <div class="document-toc__row toc-${item.level}${isHidden ? " is-toc-hidden" : ""}" data-document-toc-row="${escapeHtml(item.id)}">
            ${hasChildren ? `<button class="document-toc__branch-toggle" type="button" data-document-toc-branch-toggle="${escapeHtml(item.id)}" aria-label="${isCollapsed ? "M\u1edf nh\u00e1nh" : "Thu nh\u00e1nh"}" title="${isCollapsed ? "M\u1edf nh\u00e1nh" : "Thu nh\u00e1nh"}">${isCollapsed ? "+" : "-"}</button>` : `<span class="document-toc__branch-spacer"></span>`}
            <button class="document-toc__link" type="button" data-document-heading="${escapeHtml(item.id)}" data-document-heading-title="${escapeHtml(itemTitle)}" data-document-heading-index="${index}">
              ${escapeHtml(itemTitle)}
            </button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function rebuildDocumentTocFromJson(documentItem) {
  if (!documentItem) return;
  const toc = document.querySelector(".document-toc");
  if (!toc) return;
  toc.classList.toggle("is-collapsed", state.documentTocCollapsed);
  toc.innerHTML = renderDocumentTocInner(documentItem);
  setDocumentTocClickHandlers();
}

function hideDocumentMenus(session) {
  if (!session) return;
  session.isSlashOpen = false;
  session.slashCommands = [];
  session._menuBound = session._menuBound || false;
  if (session.menus?.slash) session.menus.slash.hidden = true;
  if (session.menus?.bubble) session.menus.bubble.hidden = true;
  if (session.menus?.context) session.menus.context.hidden = true;
  if (session.menus?.table) session.menus.table.hidden = true;
}

function hideAllDocumentMenus() {
  documentEditorSessions.forEach((session) => hideDocumentMenus(session));
}

function handleDocumentEditorClickAway(event) {
  if (event.button !== 0) return;
  const target = event.target;
  if (!target?.closest) return;
  const keepsMenuOpen = target.closest(
    ".document-editor-slash-menu, .document-editor-bubble-menu, .document-editor-context-menu, .document-editor-table-menu, .document-editor-toolbar, .document-mindmap-input",
  );
  if (keepsMenuOpen) return;
  hideAllDocumentMenus();
  hideDocumentMindMapInputs();
  document.querySelectorAll(".document-table-picker__grid.is-open").forEach((grid) => grid.classList.remove("is-open"));
}

function positionMenu(menu, rect) {
  if (!menu || !rect) return;
  const menuWidth = Math.max(menu.offsetWidth || 162, 120);
  const menuHeight = Math.max(menu.offsetHeight || 86, 40);
  const preferredLeft = rect.left + ((rect.width || 0) / 2) - (menuWidth / 2);
  const left = Math.min(Math.max(preferredLeft, 8), window.innerWidth - menuWidth - 8);
  const topBelow = rect.bottom + 8;
  const topAbove = rect.top - menuHeight - 8;
  const preferredTop = topBelow + menuHeight < window.innerHeight ? topBelow : topAbove;
  const top = Math.min(Math.max(preferredTop, 8), window.innerHeight - menuHeight - 8);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.position = "absolute";
  menu.style.zIndex = "200";
}

function getDocumentSelectionRect(editor) {
  if (!editor?.view || editor.state.selection.empty) return null;
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const editorDom = editor.view.dom;
  if (!range || !editorDom.contains(range.commonAncestorContainer)) return null;
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width || rect.height);
  const rect = rects[0] || range.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return null;
  return rect;
}

function filterCommandsByQuery(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return DOCUMENT_SLASH_COMMANDS;
  return DOCUMENT_SLASH_COMMANDS.filter((item) => {
    return (
      item.label.toLowerCase().includes(q) ||
      item.tags.some((tag) => String(tag || "").toLowerCase().includes(q))
    );
  });
}

function drawDocumentSlashMenu(session, documentId, query = "") {
  if (!session?.menus?.slash) return;
  const filtered = filterCommandsByQuery(query);
    session.slashCommands = filtered;
    if (session.slashIndex >= filtered.length) session.slashIndex = 0;
    session._lastSlashText = query;
    session.menus.slash.innerHTML = filtered.length
      ? filtered.map((item, index) => `<button type="button" class="${index === session.slashIndex ? "is-active" : ""}" data-document-command="${item.commandId}">${escapeHtml(item.label)}</button>`).join("")
      : `<div class="document-editor-menu-empty">KhÃ´ng cÃ³ káº¿t quáº£</div>`;
  session.menus.slash.hidden = false;
  session.isSlashOpen = true;
}

function openSlashMenuFromCursor(session, documentId) {
  if (!session?.editor || !session.menus?.slash) return;
  const state = session.editor.state;
  if (!state.selection.empty) return hideDocumentMenus(session);
  const { $from } = state.selection;
  const lineStart = $from.start();
  const toCursor = state.selection.from;
  const lineText = session.editor.state.doc.textBetween(lineStart, toCursor, "\n");
  const slashIdx = lineText.lastIndexOf("/");
  if (slashIdx < 0) {
    hideDocumentMenus(session);
    return;
  }
  const prefix = lineText.slice(0, slashIdx).trim();
  if (prefix) {
    hideDocumentMenus(session);
    return;
  }
  const query = lineText.slice(slashIdx + 1).trim();
  const coords = session.editor.view.coordsAtPos(toCursor);
  session.slashStart = lineStart + slashIdx;
  positionMenu(session.menus.slash, coords);
  drawDocumentSlashMenu(session, documentId, query);
}

function executeSlashSuggestion(session, documentId, direction = 1) {
  if (!session?.slashCommands?.length) return;
  const next = session.slashIndex + direction;
  if (next < 0) session.slashIndex = session.slashCommands.length - 1;
  else if (next >= session.slashCommands.length) session.slashIndex = 0;
  else session.slashIndex = next;
  drawDocumentSlashMenu(session, documentId, session._lastSlashText);
}

function confirmSlashSuggestion(session, documentId) {
  if (!session?.commandBus) return;
  const item = session.slashCommands?.[session.slashIndex];
  if (!item) {
    hideDocumentMenus(session);
    return;
  }
  if (session.slashStart !== null && session.slashStart < session.editor.state.selection.from) {
    session.editor.chain().focus().deleteRange({ from: session.slashStart, to: session.editor.state.selection.from }).run();
  }
  session.commandBus.execute(item.commandId, item.commandId === "table" ? { rows: 3, cols: 3 } : null);
  hideDocumentMenus(session);
}

function applyBubbleMenuState(session, documentId) {
  if (!session?.menus?.bubble || !session.commandBus) return;
  const commands = ["bold", "italic", "underline", "strike", "code", "link"];
  const iconByCommand = {
    bold: "format_bold",
    italic: "format_italic",
    underline: "format_underlined",
    strike: "strikethrough_s",
    code: "code",
    textColor: "format_color_text",
    textHighlight: "highlight",
    link: "add_link",
  };
  const titleByCommand = {
    bold: "In Ä‘áº­m",
    italic: "In nghiÃªng",
    underline: "Gáº¡ch chÃ¢n",
    strike: "Gáº¡ch ngang",
    textColor: "MÃ u chá»¯",
    textHighlight: "Ná»n ná»•i báº­t",
    code: "Code",
    link: "Link",
  };
  session.menus.bubble.innerHTML = [...commands, "textColor", "textHighlight"].map((commandId) => {
    const active = session.commandBus.isActive(commandId) ? " is-active" : "";
    const title = titleByCommand[commandId] || commandId;
    return `<button type="button" class="document-editor-command${active}" data-document-command="${commandId}" aria-label="${title}" title="${title}">${icon(iconByCommand[commandId] || "edit")}</button>`;
  }).join("");
}

function updateDocumentMenus(session, documentId) {
  if (!session?.editor) return;
  if (!session.commandBus) session.commandBus = createDocumentCommandBus(session.editor);
  const hasSelection = !session.editor.state.selection.empty;
  if (session.menus?.bubble) session.menus.bubble.hidden = true;
  if (session.menus?.context) session.menus.context.hidden = true;
  updateDocumentTableMenu(session);
  if (hasSelection) {
    if (session.menus?.slash) session.menus.slash.hidden = true;
    return;
  }
  openSlashMenuFromCursor(session, documentId);
}

function syncDocumentToolbarStates(documentId) {
  const session = findActiveDocumentSession(documentId);
  if (!session?.commandBus) return;
  const toolbar = document.querySelector(".document-editor-toolbar");
  if (!toolbar) return;
  toolbar.querySelectorAll("[data-document-command]").forEach((button) => {
    const commandId = button.dataset.documentCommand;
    button.classList.toggle("is-active", session.commandBus.isActive(commandId));
  });
}

function setDocumentTocClickHandlers() {
  document.querySelectorAll("[data-document-toc-toggle]").forEach((button) => {
    button.onclick = null;
    button.addEventListener("click", () => {
      state.documentTocCollapsed = !state.documentTocCollapsed;
      localStorage.setItem("ta.documentTocCollapsed", String(state.documentTocCollapsed));
      rebuildDocumentTocFromJson(selectedDocument());
    });
  });
  document.querySelectorAll("[data-document-toc-branch-toggle]").forEach((button) => {
    button.onclick = null;
    button.addEventListener("click", () => {
      const branchId = button.dataset.documentTocBranchToggle;
      if (!branchId) return;
      state.documentTocCollapsedBranches = {
        ...(state.documentTocCollapsedBranches || {}),
        [branchId]: !state.documentTocCollapsedBranches?.[branchId],
      };
      if (!state.documentTocCollapsedBranches[branchId]) delete state.documentTocCollapsedBranches[branchId];
      writeStore("ta.documentTocCollapsedBranches", state.documentTocCollapsedBranches);
      rebuildDocumentTocFromJson(selectedDocument());
    });
  });
  document.querySelectorAll("[data-document-heading]").forEach((button) => {
    button.onclick = null;
    button.addEventListener("click", () => {
      const headingId = button.dataset.documentHeading;
      const headingTitle = String(button.dataset.documentHeadingTitle || "").trim();
      const headingIndex = Number(button.dataset.documentHeadingIndex || 0);
      const active = selectedDocument();
      if (!active) return;
      const editor = document.querySelector(".document-free-editor");
      if (!editor) return;
      const session = findActiveDocumentSession(active.id);
      if (!session?.editor) {
        ensureDocumentEditorSession(active);
        return;
      }
      const headings = editor.querySelectorAll("h1, h2, h3, p");
      if (!headings.length) return;
      const safeIndex = Number.isFinite(headingIndex) ? Math.max(0, headingIndex) : 0;
      const byLevel = Array.from(headings).find((node) => node.getAttribute("data-heading-id") === headingId)
        || Array.from(headings).find((node) => headingTitle && String(node.textContent || "").trim().startsWith(headingTitle))
        || Array.from(headings)[safeIndex];
      const target = byLevel || Array.from(headings)[0];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus?.();
    });
  });
}

function persistDocumentEditorFromSession(documentId) {
  const session = findActiveDocumentSession(documentId);
  const editor = session?.editor;
  if (!editor) return;
  const documentItem = state.documents.find((item) => item.id === documentId);
  if (!documentItem) return;
  setDocumentSaveState(documentId, "Äang lÆ°u...");
  const model = updateDocumentSessionDocumentJson(documentId, editor.getJSON());
  if (!model) return;
  writeStore("ta.documents", state.documents);
  setDocumentSaveState(documentId, "ÄÃ£ lÆ°u");
  rebuildDocumentTocFromJson(model);
}

function scheduleDocumentAutosave(documentId) {
  const session = findActiveDocumentSession(documentId);
  if (!session) return;
  window.clearTimeout(session.autosaveTimer);
  session.autosaveTimer = window.setTimeout(() => persistDocumentEditorFromSession(documentId), DOCUMENT_AUTOSAVE_DELAY_MS);
}

function destroyDocumentEditorSession(documentId) {
  const session = findActiveDocumentSession(documentId);
  if (!session) return;
  try {
    session.editor?.destroy();
  } catch (error) {
    // ignore
  }
  documentEditorSessions.delete(documentId);
}

function destroyAllDocumentEditorSessions(exceptDocumentId = "") {
  [...documentEditorSessions.keys()].forEach((documentId) => {
    if (exceptDocumentId && documentId === exceptDocumentId) return;
    destroyDocumentEditorSession(documentId);
  });
}

function bindDocumentSessionMenus(session, documentId) {
  if (!session || session._menuBound) return;
  const slashMenu = session.menus?.slash;
  const bubbleMenu = session.menus?.bubble;
  const contextMenu = session.menus?.context;
  const tableMenu = session.menus?.table;
  slashMenu?.addEventListener("mousedown", (event) => event.preventDefault());
  bubbleMenu?.addEventListener("mousedown", (event) => event.preventDefault());
  contextMenu?.addEventListener("mousedown", (event) => event.preventDefault());
  tableMenu?.addEventListener("mousedown", (event) => event.preventDefault());

  slashMenu?.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-document-command]");
    const commandId = target?.dataset?.documentCommand;
    if (!commandId || !session.commandBus) return;
    if (commandId === "insertMindMap") {
      hideDocumentMenus(session);
      showDocumentMindMapInput(documentId);
      return;
    }
    const payload = commandId === "table" ? { rows: 3, cols: 3 } : null;
    session.commandBus.execute(commandId, payload);
    hideDocumentMenus(session);
  });
  bubbleMenu?.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-document-command]");
    const commandId = target?.dataset?.documentCommand;
    if (!commandId || !session.commandBus) return;
    if (commandId === "link") {
      const url = window.prompt("DÃ¡n URL liÃªn káº¿t");
      if (url) session.commandBus.execute("link", url);
      return;
    }
    const documentItem = state.documents.find((item) => item.id === documentId);
    executeDocumentUiCommand(session, documentItem, commandId);
  });
  contextMenu?.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-document-context]");
    const action = target?.dataset?.documentContext;
    if (!action || !session.commandBus) return;
    if (action === "delete") {
      session.editor.chain().focus().deleteSelection().run();
    }
    if (action === "undo") session.editor.chain().focus().undo().run();
    if (action === "redo") session.editor.chain().focus().redo().run();
    if (action === "copy") {
      session.commandBus.execute("copyBlock");
    }
    if (action === "convertSelectionToMindMap") {
      session.commandBus.execute("convertSelectionToMindMap");
    }
    if (action.startsWith("table")) {
      session.commandBus.execute(action);
    }
    hideDocumentMenus(session);
  });
  tableMenu?.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-document-table-command]");
    const commandId = target?.dataset?.documentTableCommand;
    if (!commandId || !session.commandBus) return;
    session.commandBus.execute(commandId);
    updateDocumentTableMenu(session);
  });
  session._menuBound = true;
}

function getSelectionParentNodeNames(editor) {
  if (!editor?.state?.selection?.$from) return [];
  const $from = editor.state.selection.$from;
  const names = [];
  for (let depth = 0; depth <= $from.depth; depth += 1) {
    const nodeType = $from.node(depth).type;
    if (nodeType?.name) names.push(nodeType.name);
  }
  return names;
}

function isSelectionInTable(editor) {
  const names = getSelectionParentNodeNames(editor);
  return names.includes("tableCell") || names.includes("tableHeader") || names.includes("tableRow") || names.includes("table");
}

function renderDocumentTableMenu() {
  const actions = [
    ["tableAddRowBefore", "H\u00e0ng tr\u00ean", "add_row_above"],
    ["tableAddRowAfter", "H\u00e0ng d\u01b0\u1edbi", "add_row_below"],
    ["tableAddColumnBefore", "C\u1ed9t tr\u00e1i", "add_column_left"],
    ["tableAddColumnAfter", "C\u1ed9t ph\u1ea3i", "add_column_right"],
    ["tableMergeCells", "G\u1ed9p \u00f4", "cell_merge"],
    ["tableSplitCell", "T\u00e1ch \u00f4", "call_split"],
    ["tableToggleHeaderRow", "Header h\u00e0ng", "view_headline"],
    ["tableToggleHeaderColumn", "Header c\u1ed9t", "view_column"],
    ["tableDeleteRow", "X\u00f3a h\u00e0ng", "playlist_remove"],
    ["tableDeleteColumn", "X\u00f3a c\u1ed9t", "view_column_2"],
    ["tableDeleteTable", "X\u00f3a b\u1ea3ng", "delete"],
  ];
  return actions.map(([commandId, label, iconName]) => `
    <button type="button" data-document-table-command="${commandId}" aria-label="${label}" title="${label}">
      ${icon(iconName)}
      <span>${label}</span>
    </button>
  `).join("");
}

function updateDocumentTableMenu(session, anchorElement = null) {
  const menu = session?.menus?.table;
  if (!menu || !session?.editor) return;
  const selectionElement = anchorElement
    ? (anchorElement.nodeType === Node.ELEMENT_NODE ? anchorElement : anchorElement.parentElement)
    : (window.getSelection()?.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? window.getSelection().anchorNode
      : window.getSelection()?.anchorNode?.parentElement);
  const activeTable = selectionElement?.closest?.("table");
  if (!activeTable || !isSelectionInTable(session.editor)) {
    menu.hidden = true;
    return;
  }
  if (!menu.dataset.ready) {
    menu.innerHTML = renderDocumentTableMenu();
    repairRenderedVietnameseText(menu);
    menu.dataset.ready = "true";
  }
  const rect = activeTable.getBoundingClientRect();
  const menuWidth = Math.min(820, window.innerWidth - 24);
  const topAbove = rect.top + window.scrollY - 44;
  const top = topAbove > window.scrollY + 8 ? topAbove : rect.bottom + window.scrollY + 8;
  menu.style.left = `${Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.left))}px`;
  menu.style.top = `${Math.max(12, top)}px`;
  menu.hidden = false;
}

function hideDocumentMindMapInputs(exceptDocumentId = "") {
  document.querySelectorAll(".document-mindmap-input").forEach((panel) => {
    if (exceptDocumentId && panel.dataset.documentMindmapInput === exceptDocumentId) return;
    panel.hidden = true;
  });
}

function showDocumentMindMapInput(documentId, initialValue = "", editPosition = "") {
  if (!documentId) return false;
  hideDocumentMenus(documentEditorSessions.get(documentId));
  hideDocumentMindMapInputs(documentId);
  const panel = document.querySelector(`[data-document-mindmap-input="${documentId}"]`);
  const textarea = panel?.querySelector("[data-document-mindmap-text]");
  if (!panel || !textarea) return false;
  panel.dataset.mindmapEditPosition = editPosition === "" || editPosition === null || editPosition === undefined ? "" : String(editPosition);
  if (initialValue) textarea.value = initialValue;
  panel.querySelector("[data-document-mindmap-insert]")?.replaceChildren(document.createTextNode(editPosition === "" || editPosition === null || editPosition === undefined ? "Táº¡o mind map" : "Cáº­p nháº­t mind map"));
  panel.hidden = false;
  textarea.focus();
  textarea.select();
  return true;
}

function findMindMapPositionFromDom(editor, element) {
  if (!editor?.view || !element) return null;
  const candidates = [];
  try {
    candidates.push(editor.view.posAtDOM(element, 0));
    candidates.push(editor.view.posAtDOM(element.parentNode || element, 0));
  } catch {
    return null;
  }
  for (const position of candidates) {
    if (!Number.isFinite(position)) continue;
    const node = editor.state.doc.nodeAt(position) || editor.state.doc.nodeAt(Math.max(0, position - 1));
    const nodePosition = editor.state.doc.nodeAt(position)?.type?.name === DOCUMENT_MIND_MAP_TYPE ? position : Math.max(0, position - 1);
    if (node?.type?.name === DOCUMENT_MIND_MAP_TYPE) return { position: nodePosition, node };
  }
  return null;
}

function executeDocumentUiCommand(session, documentItem, commandId) {
  if (!session?.commandBus) return false;
  if (!commandId) return false;

  if (commandId === "insertMindMap") {
    showDocumentMindMapInput(documentItem?.id);
    return true;
  }

  if (commandId === "stickyNote") {
    return session.commandBus.execute("stickyNote", { text: "Ghi chÃº má»›i", color: "yellow" });
  }

  if (commandId === "textColor") {
    const color = window.prompt("Nháº­p mÃ£ mÃ u chá»¯ (Ä‘á»ƒ trá»‘ng Ä‘á»ƒ xÃ³a):", "#000000");
    if (color === null) return false;
    const value = String(color).trim();
    if (!value) return session.commandBus.execute("textColor", "");
    return session.commandBus.execute("textColor", value);
  }

  if (commandId === "textHighlight") {
    const nextColor = session.commandBus.isActive("textHighlight") ? "" : DOCUMENT_DEFAULT_HIGHLIGHT_COLOR;
    return session.commandBus.execute("textHighlight", nextColor);
  }

  if (commandId === "link") {
    const url = window.prompt("DÃ¡n URL liÃªn káº¿t");
    if (!url) return false;
    return session.commandBus.execute("link", url);
  }

  if (commandId === "insertImage") {
    const url = window.prompt("Nháº­p URL áº£nh");
    if (!url) return false;
    const safeUrl = sanitizeDocumentUrl(url);
    if (!safeUrl) {
      showToast("URL áº£nh khÃ´ng há»£p lá»‡");
      return false;
    }
    return session.commandBus.execute("insertImage", { src: safeUrl });
  }

  if (commandId === "uploadImage") {
    const uploadInput = document.querySelector(`#documentImageUpload-${documentItem?.id}`);
    if (!uploadInput) return false;
    uploadInput.click();
    return true;
  }

  return session.commandBus.execute(commandId, null);
}

function handleDocumentEditorShortcut(session, documentId, event, key, mod) {
  const lowerKey = key || "";
  const code = String(event.code || "").toLowerCase();
  const digit = lowerKey.match(/^[0-6]$/) ? lowerKey : (code.match(/^digit([0-6])$/)?.[1] || "");

  if (mod && event.altKey && digit) {
    event.preventDefault();
    session.commandBus.execute(digit === "0" ? "paragraph" : `heading${digit}`);
    return true;
  }

  if (mod && event.shiftKey && lowerKey === "7") {
    event.preventDefault();
    session.commandBus.execute("orderedList");
    return true;
  }

  if (mod && event.shiftKey && lowerKey === "8") {
    event.preventDefault();
    session.commandBus.execute("bulletList");
    return true;
  }

  if (mod && event.shiftKey && lowerKey === "9") {
    event.preventDefault();
    session.commandBus.execute("taskList");
    return true;
  }

  if (mod && event.altKey && lowerKey === "arrowleft") {
    event.preventDefault();
    session.commandBus.execute("promoteBlockLevel");
    return true;
  }

  if (mod && event.altKey && lowerKey === "arrowright") {
    event.preventDefault();
    session.commandBus.execute("demoteBlockLevel");
    return true;
  }

  return false;
}

function handleDocumentEditorKeydown(session, documentId, event) {
  if (!session?.editor || !session.commandBus) return;
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const key = event.key?.toLowerCase();
  const mod = isMac ? event.metaKey : event.ctrlKey;

  if (handleDocumentEditorShortcut(session, documentId, event, key, mod)) return;

  if (mod && key === "b") {
    event.preventDefault();
    session.commandBus.execute("bold");
    return;
  }
  if (mod && key === "i") {
    event.preventDefault();
    session.commandBus.execute("italic");
    return;
  }
  if (mod && key === "u") {
    event.preventDefault();
    session.commandBus.execute("underline");
    return;
  }
  if (mod && key === "k") {
    event.preventDefault();
    const link = window.prompt("DÃ¡n URL liÃªn káº¿t");
    if (link) session.commandBus.execute("link", link);
    return;
  }
  if (mod && ["c", "x", "v"].includes(key)) {
    hideDocumentMenus(session);
    return;
  }
  if (mod && key === "a") {
    event.preventDefault();
    session.editor.commands.selectAll();
    return;
  }
  if (mod && key === "s") {
    event.preventDefault();
    persistDocumentEditorFromSession(documentId);
    showToast("Đã lưu tài liệu");
    return;
  }
  if (mod && (key === "z")) {
    event.preventDefault();
    session.commandBus.execute(event.shiftKey ? "redo" : "undo");
    return;
  }
  if (mod && key === "y") {
    event.preventDefault();
    session.commandBus.execute("redo");
    return;
  }
  if (key === "tab" && !mod) {
    if (isSelectionInTable(session.editor)) {
      const moved = session.commandBus.execute(event.shiftKey ? "tablePreviousCell" : "tableNextCell");
      if (moved) {
        event.preventDefault();
        return;
      }
    }
    const listMoved = session.commandBus.execute(event.shiftKey ? "promoteBlockLevel" : "demoteBlockLevel");
    if (listMoved) {
      event.preventDefault();
      return;
    }
  }

  if (session.isSlashOpen) {
    if (key === "escape") {
      hideDocumentMenus(session);
      event.preventDefault();
      return;
    }
    if (key === "arrowdown") {
      event.preventDefault();
      executeSlashSuggestion(session, documentId, 1);
      return;
    }
    if (key === "arrowup") {
      event.preventDefault();
      executeSlashSuggestion(session, documentId, -1);
      return;
    }
    if (key === "enter") {
      event.preventDefault();
      confirmSlashSuggestion(session, documentId);
      return;
    }
  }

  if (event.key === " " && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const state = session.editor.state;
    if (state.selection.empty) {
      const { $from, from } = state.selection;
      const lineText = state.doc.textBetween($from.start(), from, "\n");
      const withSpace = `${lineText} `;
      const headingMatch = withSpace.match(/^(#{1,3})\s+$/);
      const ulMatch = withSpace.match(/^(\-|\*)\s+$/);
      const orderMatch = withSpace.match(/^([0-9]+)\.\s+$/);
      const taskMatch = withSpace.match(/^\[\s?\]\s+$/);
      const quoteMatch = withSpace.match(/^>\s+$/);
      const codeMatch = withSpace.match(/^```\s+$/);
      const checked = [
        headingMatch && headingMatch[1].length,
        ulMatch && 0,
        orderMatch && "ordered",
        taskMatch && "task",
        quoteMatch && "quote",
        codeMatch && "code",
      ].filter(Boolean);
      if (checked[0]) {
        const level = Math.min(3, Number(headingMatch[1].length));
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).setHeading({ level }).run();
        return;
      }
      if (ulMatch) {
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).toggleBulletList().run();
        return;
      }
      if (orderMatch) {
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).toggleOrderedList().run();
        return;
      }
      if (taskMatch) {
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).toggleTaskList().run();
        return;
      }
      if (quoteMatch) {
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).toggleBlockquote().run();
        return;
      }
      if (codeMatch) {
        event.preventDefault();
        session.editor.chain().focus().deleteRange({ from: $from.start(), to: from + 1 }).toggleCodeBlock().run();
        return;
      }
    }
  }

  if (event.key === "/") {
    const state = session.editor.state;
    if (state.selection.empty) {
      event.preventDefault();
      const insertionPos = state.selection.from;
      session.editor.chain().focus().insertContent("/").run();
      session.editor.commands.focus();
      openSlashMenuFromCursor(session, documentId);
      return;
    }
  }
}

function ensureDocumentEditorSession(documentItem = null) {
  if (!documentItem?.id) return null;
  const EditorClass = normalizeTiptapEditorClass();
  const root = document.querySelector(`[data-document-editor="${documentItem.id}"]`);
  if (!root) return null;
  if (!EditorClass) {
    ensureDocumentEditorLibraryLoaded();
    root.replaceChildren();
    setDocumentSaveState(documentItem.id, window.__documentEditorLibError ? "Lỗi tải editor" : "");
    return null;
  }

  const old = findActiveDocumentSession(documentItem.id);
  if (old?.root && old.root !== root) {
    destroyDocumentEditorSession(documentItem.id);
  }

  const session = findActiveDocumentSession(documentItem.id) || createDocumentEditorSessionState(documentItem.id);
  const json = normalizeDocumentModel(documentItem.contentJson || parseLegacyDocumentContent(documentItem.legacyContent || documentItem.content || ""));
  session.root = root;
  if (!session.editor) {
    const slashMenu = document.querySelector(`#documentSlashMenu-${documentItem.id}`);
    const bubbleMenu = document.querySelector(`#documentBubbleMenu-${documentItem.id}`);
    const contextMenu = document.querySelector(`#documentContextMenu-${documentItem.id}`);
    const tableMenu = document.querySelector(`#documentTableMenu-${documentItem.id}`);
    session.menus = { slash: slashMenu, bubble: bubbleMenu, context: contextMenu, table: tableMenu };

    session.editor = new EditorClass({
      element: root,
      extensions: buildDocumentEditorExtensions(),
      content: json,
      autofocus: false,
      onCreate() {
        session.editor.view.dom.setAttribute("spellcheck", "false");
        session.editor.view.dom.spellcheck = false;
        syncDocumentToolbarStates(documentItem.id);
        updateDocumentTableMenu(session);
      },
      onUpdate() {
        scheduleDocumentAutosave(documentItem.id);
        syncDocumentToolbarStates(documentItem.id);
        updateDocumentTableMenu(session);
      },
      onSelectionUpdate() {
        if (session.commandBus) syncDocumentToolbarStates(documentItem.id);
        updateDocumentMenus(session, documentItem.id);
      },
    });

    bindDocumentSessionMenus(session, documentItem.id);
    session.commandBus = createDocumentCommandBus(session.editor);

    const viewDom = session.editor.view.dom;
    viewDom.addEventListener("keydown", (event) => handleDocumentEditorKeydown(session, documentItem.id, event), true);
    viewDom.addEventListener("mouseup", (event) => updateDocumentTableMenu(session, event.target));
    viewDom.addEventListener("click", (event) => updateDocumentTableMenu(session, event.target));
    viewDom.addEventListener("paste", (event) => {
      const items = [...(event.clipboardData?.items || [])];
      const imageItem = items.find((item) => item.type && item.type.startsWith("image/"));
      if (imageItem) {
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const safeDataUrl = sanitizeDocumentUrl(String(reader.result || ""));
          if (!safeDataUrl) return;
          session.editor?.chain().focus().setImage({ src: safeDataUrl, alt: "áº¢nh Ä‘Ã­nh kÃ¨m" }).run();
        });
        reader.readAsDataURL(file);
        return;
      }

      const html = event.clipboardData?.getData("text/html");
      const text = event.clipboardData?.getData("text/plain");
      if (!html && !text) return;
      event.preventDefault();
      const imported = html
        ? importDocumentFromHtml(html)
        : importDocumentFromMarkdown(text || "");
      const payload = imported?.content?.length
        ? (imported.type === "doc" ? imported.content : imported)
        : null;
      if (!payload) return;
      session.editor?.chain().focus().insertContent(payload).run();
    });

    viewDom.addEventListener("contextmenu", (event) => {
      const rect = { left: event.clientX, right: 0, top: event.clientY, bottom: event.clientY + 4 };
      if (!session.menus?.context) return;
      event.preventDefault();
      hideDocumentMenus(session);
      if (!session.editor.state.selection.empty && session.menus?.bubble) {
        applyBubbleMenuState(session, documentItem.id);
        session.menus.bubble.hidden = false;
        positionMenu(session.menus.bubble, getDocumentSelectionRect(session.editor) || rect);
        return;
      }
      if (isSelectionInTable(session.editor)) {
        updateDocumentTableMenu(session);
        return;
      }
      session.menus.context.innerHTML = `
        <button type="button" data-document-context="undo">HoÃ n tÃ¡c</button>
        <button type="button" data-document-context="redo">LÃ m láº¡i</button>
        <button type="button" data-document-context="delete">XÃ³a</button>
        <button type="button" data-document-context="copy">Sao chÃ©p block</button>
      `;
      positionMenu(session.menus.context, rect);
      session.menus.context.hidden = false;
    });
    documentEditorSessions.set(documentItem.id, session);
  } else if (session.editor) {
    const docJson = json;
    if (JSON.stringify(docJson) !== JSON.stringify(normalizeDocumentModel(session.editor.getJSON()))) {
      session.editor.commands.setContent(docJson, false);
    }
  }
  return session;
}

function createMindMapNodeExtension() {
  const { core } = getDocumentEditorLib();
  const { Node, mergeAttributes } = core;
  if (!Node || !core.Node) return null;
  return Node.create({
    name: DOCUMENT_MIND_MAP_TYPE,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        title: { default: "Ã chÃ­nh" },
        outline: { default: "" },
        layout: { default: "mindmap" },
        mode: { default: "outline" },
        nodes: { default: [] },
      };
    },
    parseHTML() {
      return [
        { tag: "div.document-mindmap" },
        { tag: `div[data-type="${DOCUMENT_MIND_MAP_TYPE}"]` },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      const title = String(HTMLAttributes?.title || "Ã chÃ­nh");
      const nodes = displayMindMapBranchNodes(HTMLAttributes?.nodes, title);
      const renderBranches = (items = []) => [
        "div",
        { class: "document-mindmap__branches" },
        ...(Array.isArray(items) && items.length
          ? items.map((item) => [
            "div",
            { class: "document-mindmap__branch", "data-mindmap-node": String(item?.id || "") },
            ["span", { class: "document-mindmap__line" }],
            ["div", { class: "document-mindmap__node" }, String(item?.text || "NhÃ¡nh")],
            ...(Array.isArray(item?.children) && item.children.length ? [renderBranches(item.children)] : []),
          ])
          : [["div", { class: "document-mindmap__empty" }, "ChÆ°a cÃ³ nhÃ¡nh"]]),
      ];
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": DOCUMENT_MIND_MAP_TYPE,
          class: "document-mindmap",
          "data-title": title,
          "data-layout": HTMLAttributes?.layout || "mindmap",
          "data-mode": HTMLAttributes?.mode || "outline",
        }),
        ["div", { class: "document-mindmap__canvas" },
          ["div", { class: "document-mindmap__root" }, title],
          renderBranches(nodes),
        ],
      ];
    },
    renderText({ node }) {
      const fallback = node?.attrs?.nodes?.map((item) => item?.text || "").filter(Boolean).join(" | ");
      return fallback ? `Mind map: ${fallback}` : "Mind map";
    },
    addNodeView() {
      return ({ node, editor, getPos }) => {
        let currentNode = node;
        const dom = document.createElement("div");
        const updateAttrs = (attrs) => {
          const position = typeof getPos === "function" ? getPos() : null;
          if (!Number.isFinite(position)) return;
          const nextAttrs = { ...currentNode.attrs, ...attrs };
          const transaction = editor.state.tr.setNodeMarkup(position, undefined, nextAttrs);
          editor.view.dispatch(transaction);
        };
        const commitEditable = (target) => {
          const value = sanitizeDocumentText(target.value || target.textContent || "").trim();
          if (!value) {
            if ("value" in target) target.value = target.dataset.originalText || "NhÃ¡nh";
            else target.textContent = target.dataset.originalText || "NhÃ¡nh";
            return;
          }
          if (target.dataset.mindmapRole === "root") {
            updateAttrs({
              title: value,
              outline: mindMapAttrsToOutline({ ...currentNode.attrs, title: value }),
            });
            return;
          }
          const nodeId = target.dataset.mindmapNodeEdit;
          const nodes = updateMindMapNodeText(currentNode.attrs?.nodes || [], nodeId, value);
          updateAttrs({
            nodes,
            outline: mindMapAttrsToOutline({ ...currentNode.attrs, nodes }),
          });
        };
        const createEditable = (role, value, nodeId = "") => {
          const element = document.createElement("input");
          element.className = role === "root" ? "document-mindmap__root" : "document-mindmap__node";
          element.type = "text";
          element.spellcheck = false;
          element.dataset.mindmapEditable = "true";
          element.dataset.mindmapRole = role;
          element.dataset.originalText = value;
          if (nodeId) element.dataset.mindmapNodeEdit = nodeId;
          element.value = value;
          return element;
        };
        const createBranches = (items = []) => {
          const wrapper = document.createElement("div");
          wrapper.className = "document-mindmap__branches";
          if (!Array.isArray(items) || !items.length) {
            const empty = document.createElement("div");
            empty.className = "document-mindmap__empty";
            empty.textContent = "ChÆ°a cÃ³ nhÃ¡nh";
            wrapper.appendChild(empty);
            return wrapper;
          }
          items.forEach((item) => {
            const branch = document.createElement("div");
            branch.className = "document-mindmap__branch";
            branch.dataset.mindmapNode = String(item?.id || "");
            const line = document.createElement("span");
            line.className = "document-mindmap__line";
            branch.appendChild(line);
            branch.appendChild(createEditable("branch", String(item?.text || "NhÃ¡nh"), String(item?.id || "")));
            if (Array.isArray(item?.children) && item.children.length) {
              branch.appendChild(createBranches(item.children));
            }
            wrapper.appendChild(branch);
          });
          return wrapper;
        };
        const selectEditableText = (editable) => {
          if (!editable) return;
          if (typeof editable.select === "function") {
            editable.select();
            return;
          }
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editable);
          selection?.removeAllRanges();
          selection?.addRange(range);
        };
        const render = () => {
          const title = String(currentNode.attrs?.title || "Ã chÃ­nh");
          const nodes = displayMindMapBranchNodes(currentNode.attrs?.nodes, title);
          dom.replaceChildren();
          dom.setAttribute("data-type", DOCUMENT_MIND_MAP_TYPE);
          dom.className = "document-mindmap";
          dom.dataset.title = title;
          dom.dataset.layout = currentNode.attrs?.layout || "mindmap";
          dom.dataset.mode = currentNode.attrs?.mode || "outline";
          const canvas = document.createElement("div");
          canvas.className = "document-mindmap__canvas";
          canvas.appendChild(createEditable("root", title));
          canvas.appendChild(createBranches(nodes));
          dom.appendChild(canvas);
        };
        dom.addEventListener("mousedown", (event) => {
          const editable = event.target?.closest?.("[data-mindmap-editable]");
          if (!editable) return;
          event.preventDefault();
          event.stopPropagation();
          editable.focus();
          selectEditableText(editable);
        });
        dom.addEventListener("click", (event) => {
          const editable = event.target?.closest?.("[data-mindmap-editable]");
          if (!editable) return;
          event.preventDefault();
          event.stopPropagation();
          editable.focus();
        });
        dom.addEventListener("focusin", (event) => {
          const editable = event.target?.closest?.("[data-mindmap-editable]");
          if (editable) {
            editable.dataset.originalText = editable.textContent || "";
            selectEditableText(editable);
          }
        });
        dom.addEventListener("keydown", (event) => {
          const editable = event.target?.closest?.("[data-mindmap-editable]");
          if (!editable) return;
          if (event.key === "Enter") {
            event.preventDefault();
            editable.blur();
          }
          event.stopPropagation();
        });
        dom.addEventListener("blur", (event) => {
          const editable = event.target?.closest?.("[data-mindmap-editable]");
          if (editable) commitEditable(editable);
        }, true);
        render();
        return {
          dom,
          update(updatedNode) {
            if (updatedNode.type.name !== DOCUMENT_MIND_MAP_TYPE) return false;
            currentNode = updatedNode;
            render();
            return true;
          },
          stopEvent(event) {
            return Boolean(event.target?.closest?.("[data-mindmap-editable]"));
          },
          ignoreMutation(mutation) {
            return Boolean(mutation.target?.closest?.("[data-mindmap-editable]"));
          },
        };
      };
    },
  });
}

function createFlowDiagramNodeExtension() {
  const { core } = getDocumentEditorLib();
  const { Node, mergeAttributes } = core;
  if (!Node || !core.Node) return null;
  return Node.create({
    name: DOCUMENT_FLOW_DIAGRAM_TYPE,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        width: { default: 900 },
        height: { default: 460 },
        align: { default: "center" },
        nodes: { default: [] },
        edges: { default: [] },
      };
    },
    parseHTML() {
      return [
        { tag: "div.document-flow-diagram" },
        { tag: `div[data-type="${DOCUMENT_FLOW_DIAGRAM_TYPE}"]` },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": DOCUMENT_FLOW_DIAGRAM_TYPE,
          class: `document-flow-diagram document-flow-diagram--${HTMLAttributes?.align || "center"}`,
        }),
      ];
    },
    renderText({ node }) {
      const nodes = normalizeFlowDiagramNodes(node?.attrs?.nodes || []);
      return nodes.length ? `Flow diagram: ${nodes.map((item) => item.text).join(" -> ")}` : "Flow diagram";
    },
    addNodeView() {
      return ({ node, editor, getPos }) => {
        let currentNode = node;
        let selectedNodeId = "";
        let selectedEdgeId = "";
        let connectFromId = "";
        let connectFromSide = "right";
        let toolsActive = false;
        const dom = document.createElement("div");
        const activateTools = () => {
          toolsActive = true;
          dom.classList.add("is-active");
        };
        const handleOutsidePress = (event) => {
          if (dom.contains(event.target) || !toolsActive) return;
          toolsActive = false;
          selectedNodeId = "";
          selectedEdgeId = "";
          render();
        };
        const handleDiagramKeyDown = (event) => {
          if (!toolsActive) return;
          if (!dom.contains(event.target)) return;
          const key = event.key.toLowerCase();
          const isUndo = (event.ctrlKey || event.metaKey) && key === "z";
          const isRedo = ((event.ctrlKey || event.metaKey) && key === "y") || (isUndo && event.shiftKey);
          if (isRedo) {
            event.preventDefault();
            event.stopPropagation();
            editor.commands?.redo?.();
            return;
          }
          if (isUndo) {
            event.preventDefault();
            event.stopPropagation();
            editor.commands?.undo?.();
            return;
          }
          if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId && !event.target?.closest?.("[contenteditable='true']")) {
            event.preventDefault();
            event.stopPropagation();
            deleteEdge(selectedEdgeId);
          }
        };
        dom.addEventListener("mousedown", activateTools, true);
        document.addEventListener("mousedown", handleOutsidePress, true);
        document.addEventListener("keydown", handleDiagramKeyDown, true);

        const getCanvas = () => flowDiagramCanvasAttrs(currentNode.attrs || {});
        const getNodes = () => normalizeFlowDiagramNodes(currentNode.attrs?.nodes || []);
        const getEdges = (nodes = getNodes()) => normalizeFlowDiagramEdges(currentNode.attrs?.edges || [], nodes, getCanvas());
        const updateAttrs = (attrs) => {
          const position = typeof getPos === "function" ? getPos() : null;
          if (!Number.isFinite(position)) return;
          const canvas = flowDiagramCanvasAttrs({ ...currentNode.attrs, ...attrs });
          const nodes = normalizeFlowDiagramNodes(attrs.nodes || currentNode.attrs?.nodes || []);
          const nextAttrs = {
            ...currentNode.attrs,
            ...attrs,
            ...canvas,
            nodes,
            edges: normalizeFlowDiagramEdges(attrs.edges || currentNode.attrs?.edges || [], nodes, canvas),
          };
          currentNode = { ...currentNode, attrs: nextAttrs };
          const transaction = editor.state.tr.setNodeMarkup(position, undefined, nextAttrs);
          editor.view.dispatch(transaction);
        };
        const updateNode = (nodeId, patch) => {
          const nodes = getNodes().map((item) => item.id === nodeId ? { ...item, ...patch, autoPlaced: false } : item);
          updateAttrs({ nodes });
        };
        const updateEdge = (edgeId, patch) => {
          const edges = getEdges().map((edge) => edge.id === edgeId ? {
            ...edge,
            ...patch,
            shape: normalizeFlowDiagramEdgeShape(patch.shape || edge.shape),
            arrow: normalizeFlowDiagramEdgeArrow(patch.arrow || edge.arrow),
          } : edge);
          selectedEdgeId = edgeId;
          updateAttrs({ edges });
          render();
        };
        const deleteEdge = (edgeId) => {
          const edges = getEdges().filter((edge) => edge.id !== edgeId);
          selectedEdgeId = "";
          updateAttrs({ edges });
          render();
        };
        const addNode = () => {
          const canvas = getCanvas();
          const nodes = getNodes();
          const nodeIndex = nodes.length + 1;
          const newNode = createFlowDiagramNode(nodeIndex, {
            text: `Block ${nodeIndex}`,
            x: Math.max(24, Math.round(canvas.width / 2 - 110 + nodes.length * 18)),
            y: Math.max(32, Math.round(canvas.height / 2 - 43 + nodes.length * 18)),
            color: DOCUMENT_FLOW_DIAGRAM_COLORS[nodes.length % DOCUMENT_FLOW_DIAGRAM_COLORS.length],
          });
          const nextNodes = nodes.length && nodes.every((item) => item.autoPlaced !== false)
            ? autoLayoutFlowDiagramNodes([...nodes, newNode], canvas)
            : [...nodes, newNode];
          selectedNodeId = newNode.id;
          updateAttrs({ nodes: nextNodes });
          render();
        };
        const alignNodes = (align) => {
          const canvas = { ...getCanvas(), align };
          const nodes = autoLayoutFlowDiagramNodes(getNodes().map((item) => ({ ...item, autoPlaced: true })), canvas);
          updateAttrs({ align, nodes });
          render();
        };
        const addEdge = (from, to, toPoint = null, fromSide = "right", toSide = "left") => {
          if (!from || (!to && !toPoint)) return;
          const nodes = getNodes();
          const edges = getEdges(nodes);
          const sourceSide = normalizeFlowDiagramConnectorSide(fromSide, "right");
          const targetSide = normalizeFlowDiagramConnectorSide(toSide, "left");
          if (to && edges.some((edge) => edge.from === from && edge.to === to && edge.fromSide === sourceSide && edge.toSide === targetSide)) return;
          const nextEdge = { id: crypto.randomUUID(), from, to: to || "", fromSide: sourceSide, toSide: targetSide, shape: "curve", arrow: "end", toPoint };
          selectedEdgeId = nextEdge.id;
          updateAttrs({ edges: [...edges, nextEdge] });
          render();
        };
        const beginDrag = (event, item) => {
          event.preventDefault();
          event.stopPropagation();
          selectedNodeId = item.id;
          selectedEdgeId = "";
          const startX = event.clientX;
          const startY = event.clientY;
          const startLeft = Number(item.x) || 0;
          const startTop = Number(item.y) || 0;
          const canvas = getCanvas();
          const nodeElement = event.currentTarget;
          const onMove = (moveEvent) => {
            const nextX = Math.max(0, Math.min(canvas.width - item.width, startLeft + moveEvent.clientX - startX));
            const nextY = Math.max(0, Math.min(canvas.height - item.height, startTop + moveEvent.clientY - startY));
            nodeElement.style.left = `${nextX}px`;
            nodeElement.style.top = `${nextY}px`;
          };
          const onUp = (upEvent) => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            updateNode(item.id, {
              x: Math.max(0, Math.min(canvas.width - item.width, startLeft + upEvent.clientX - startX)),
              y: Math.max(0, Math.min(canvas.height - item.height, startTop + upEvent.clientY - startY)),
            });
            render();
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        };
        const beginResize = (event, item, direction = "se") => {
          event.preventDefault();
          event.stopPropagation();
          selectedNodeId = item.id;
          selectedEdgeId = "";
          const startX = event.clientX;
          const startY = event.clientY;
          const startLeft = Number(item.x) || 0;
          const startTop = Number(item.y) || 0;
          const startWidth = Number(item.width) || 220;
          const startHeight = Number(item.height) || 86;
          const canvas = getCanvas();
          const nodeElement = event.target.closest("[data-flow-diagram-node]");
          const minWidth = 120;
          const minHeight = 64;
          const resizeFromEvent = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            let x = startLeft;
            let y = startTop;
            let width = startWidth;
            let height = startHeight;
            if (direction.includes("e")) width = Math.min(canvas.width - startLeft, Math.max(minWidth, startWidth + deltaX));
            if (direction.includes("s")) height = Math.min(canvas.height - startTop, Math.max(minHeight, startHeight + deltaY));
            if (direction.includes("w")) {
              x = Math.max(0, Math.min(startLeft + startWidth - minWidth, startLeft + deltaX));
              width = startLeft + startWidth - x;
            }
            if (direction.includes("n")) {
              y = Math.max(0, Math.min(startTop + startHeight - minHeight, startTop + deltaY));
              height = startTop + startHeight - y;
            }
            return { x, y, width, height };
          };
          const applyNodeBox = (box) => {
            nodeElement.style.left = `${box.x}px`;
            nodeElement.style.top = `${box.y}px`;
            nodeElement.style.width = `${box.width}px`;
            nodeElement.style.height = `${box.height}px`;
          };
          const onMove = (moveEvent) => {
            applyNodeBox(resizeFromEvent(moveEvent));
          };
          const onUp = (upEvent) => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            updateNode(item.id, resizeFromEvent(upEvent));
            render();
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        };
        const beginCanvasResize = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const startX = event.clientX;
          const startY = event.clientY;
          const canvas = getCanvas();
          const startWidth = canvas.width;
          const startHeight = canvas.height;
          const stage = dom.querySelector("[data-flow-diagram-stage]");
          const applySize = (width, height) => {
            dom.style.setProperty("--flow-width", `${width}px`);
            dom.style.setProperty("--flow-height", `${height}px`);
            if (stage) {
              stage.style.width = `${width}px`;
              stage.style.minWidth = `${width}px`;
              stage.style.height = `${height}px`;
            }
          };
          const nextSize = (moveEvent) => ({
            width: Math.max(640, Math.min(1800, startWidth + moveEvent.clientX - startX)),
            height: Math.max(380, Math.min(1200, startHeight + moveEvent.clientY - startY)),
          });
          const onMove = (moveEvent) => {
            const size = nextSize(moveEvent);
            applySize(size.width, size.height);
          };
          const onUp = (upEvent) => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            const size = nextSize(upEvent);
            updateAttrs(size);
            render();
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        };
        const beginConnect = (event, item, side = "right") => {
          event.preventDefault();
          event.stopPropagation();
          connectFromId = item.id;
          connectFromSide = normalizeFlowDiagramConnectorSide(side, "right");
          selectedNodeId = item.id;
          selectedEdgeId = "";
          const onUp = (upEvent) => {
            document.removeEventListener("mouseup", onUp);
            const targetConnector = upEvent.target?.closest?.("[data-flow-diagram-connect]");
            const targetNode = upEvent.target?.closest?.("[data-flow-diagram-node]");
            const targetNodeId = targetConnector?.dataset?.flowDiagramConnect || targetNode?.dataset?.flowDiagramNode || "";
            const targetSide = targetConnector?.dataset?.flowDiagramSide || "left";
            if (targetNodeId && targetNodeId !== connectFromId) {
              addEdge(connectFromId, targetNodeId, null, connectFromSide, targetSide);
            } else {
              const stage = dom.querySelector("[data-flow-diagram-stage]");
              const rect = stage?.getBoundingClientRect();
              if (rect) addEdge(connectFromId, "", {
                x: Math.max(0, Math.min(getCanvas().width, upEvent.clientX - rect.left)),
                y: Math.max(0, Math.min(getCanvas().height, upEvent.clientY - rect.top)),
              }, connectFromSide, "left");
            }
            connectFromId = "";
          };
          document.addEventListener("mouseup", onUp);
        };
        const edgeToolsPosition = (edge, nodeById) => {
          const fromNode = nodeById.get(edge.from);
          const target = edge.to ? nodeById.get(edge.to) : edge.toPoint;
          if (!fromNode || !target) return { x: 28, y: 28 };
          const from = flowDiagramNodeAnchor(fromNode, edge.fromSide || "right");
          const to = target.width ? flowDiagramNodeAnchor(target, edge.toSide || "left") : target;
          return {
            x: Math.round((from.x + to.x) / 2),
            y: Math.round((from.y + to.y) / 2),
          };
        };
        const createEdgeToolsElement = (edge, nodeById) => {
          const position = edgeToolsPosition(edge, nodeById);
          const element = document.createElement("div");
          element.className = "document-flow-diagram__edge-tools";
          element.style.left = `${position.x}px`;
          element.style.top = `${position.y}px`;
          element.innerHTML = `
            <button type="button" class="icon-button${edge.shape === "curve" ? " is-active" : ""}" data-flow-diagram-edge-shape="curve" aria-label="D\u00e2y cong" title="D\u00e2y cong">${icon("timeline")}</button>
            <button type="button" class="icon-button${edge.shape === "straight" ? " is-active" : ""}" data-flow-diagram-edge-shape="straight" aria-label="D\u00e2y th\u1eb3ng" title="D\u00e2y th\u1eb3ng">${icon("show_chart")}</button>
            <button type="button" class="icon-button${edge.shape === "elbow" ? " is-active" : ""}" data-flow-diagram-edge-shape="elbow" aria-label="D\u00e2y vu\u00f4ng g\u00f3c" title="D\u00e2y vu\u00f4ng g\u00f3c">${icon("turn_right")}</button>
            <button type="button" class="icon-button${edge.arrow === "none" ? " is-active" : ""}" data-flow-diagram-edge-arrow="none" aria-label="Kh\u00f4ng m\u0169i t\u00ean" title="Kh\u00f4ng m\u0169i t\u00ean">${icon("remove")}</button>
            <button type="button" class="icon-button${edge.arrow === "end" ? " is-active" : ""}" data-flow-diagram-edge-arrow="end" aria-label="M\u0169i t\u00ean cu\u1ed1i" title="M\u0169i t\u00ean cu\u1ed1i">${icon("arrow_forward")}</button>
            <button type="button" class="icon-button${edge.arrow === "both" ? " is-active" : ""}" data-flow-diagram-edge-arrow="both" aria-label="M\u0169i t\u00ean hai \u0111\u1ea7u" title="M\u0169i t\u00ean hai \u0111\u1ea7u">${icon("compare_arrows")}</button>
            <button type="button" class="icon-button danger-button" data-flow-diagram-edge-delete aria-label="X\u00f3a d\u00e2y" title="X\u00f3a d\u00e2y">${icon("delete")}</button>
          `;
          element.querySelectorAll("[data-flow-diagram-edge-shape]").forEach((button) => {
            button.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              updateEdge(edge.id, { shape: button.dataset.flowDiagramEdgeShape });
            });
          });
          element.querySelectorAll("[data-flow-diagram-edge-arrow]").forEach((button) => {
            button.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              updateEdge(edge.id, { arrow: button.dataset.flowDiagramEdgeArrow });
            });
          });
          element.querySelector("[data-flow-diagram-edge-delete]")?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteEdge(edge.id);
          });
          return element;
        };
        const renderEdges = (svg, nodes, edges) => {
          const canvas = getCanvas();
          const nodeById = new Map(nodes.map((item) => [item.id, item]));
          svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);
          svg.replaceChildren();
          const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
          marker.setAttribute("id", "document-flow-arrow");
          marker.setAttribute("markerWidth", "10");
          marker.setAttribute("markerHeight", "10");
          marker.setAttribute("refX", "9");
          marker.setAttribute("refY", "5");
          marker.setAttribute("orient", "auto");
          const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          markerPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
          marker.appendChild(markerPath);
          defs.appendChild(marker);
          const startMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
          startMarker.setAttribute("id", "document-flow-arrow-start");
          startMarker.setAttribute("markerWidth", "10");
          startMarker.setAttribute("markerHeight", "10");
          startMarker.setAttribute("refX", "1");
          startMarker.setAttribute("refY", "5");
          startMarker.setAttribute("orient", "auto");
          const startMarkerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          startMarkerPath.setAttribute("d", "M 10 0 L 0 5 L 10 10 z");
          startMarker.appendChild(startMarkerPath);
          defs.appendChild(startMarker);
          svg.appendChild(defs);
          edges.forEach((edge) => {
            const fromNode = nodeById.get(edge.from);
            const target = edge.to ? nodeById.get(edge.to) : edge.toPoint;
            if (!fromNode || !target) return;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", `document-flow-diagram__edge${edge.id === selectedEdgeId ? " is-selected" : ""}`);
            path.setAttribute("d", flowDiagramEdgePath(fromNode, target, edge));
            path.dataset.flowDiagramEdge = edge.id;
            if (edge.arrow === "end" || edge.arrow === "both") path.setAttribute("marker-end", "url(#document-flow-arrow)");
            if (edge.arrow === "both") path.setAttribute("marker-start", "url(#document-flow-arrow-start)");
            svg.appendChild(path);
            const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            hitPath.setAttribute("class", "document-flow-diagram__edge-hit");
            hitPath.setAttribute("d", flowDiagramEdgePath(fromNode, target, edge));
            hitPath.dataset.flowDiagramEdge = edge.id;
            hitPath.addEventListener("mousedown", (event) => {
              event.preventDefault();
              event.stopPropagation();
              selectedEdgeId = edge.id;
              selectedNodeId = "";
              render();
            });
            svg.appendChild(hitPath);
          });
        };
        const createNodeElement = (item) => {
          const element = document.createElement("div");
          element.className = `document-flow-diagram__node document-flow-diagram__node--${item.color}${selectedNodeId === item.id ? " is-selected" : ""}`;
          element.dataset.flowDiagramNode = item.id;
          element.style.left = `${item.x}px`;
          element.style.top = `${item.y}px`;
          element.style.width = `${item.width}px`;
          element.style.height = `${item.height}px`;

          const label = document.createElement("textarea");
          label.className = "document-flow-diagram__label";
          label.draggable = false;
          label.rows = 1;
          label.spellcheck = false;
          label.dataset.flowDiagramLabel = item.id;
          label.value = item.text || "Block";
          element.appendChild(label);

          const dragHandle = document.createElement("button");
          dragHandle.type = "button";
          dragHandle.className = "document-flow-diagram__drag";
          dragHandle.dataset.flowDiagramDrag = item.id;
          dragHandle.setAttribute("aria-label", "Kéo ô");
          dragHandle.setAttribute("title", "Kéo ô");
          dragHandle.innerHTML = icon("open_with");
          element.appendChild(dragHandle);

          DOCUMENT_FLOW_DIAGRAM_CONNECTOR_SIDES.forEach((side) => {
            const connector = document.createElement("button");
            connector.type = "button";
            connector.className = `document-flow-diagram__connector document-flow-diagram__connector--${side}`;
            connector.dataset.flowDiagramConnect = item.id;
            connector.setAttribute("data-flow-diagram-side", side);
            connector.setAttribute("aria-label", `K\u00e9o d\u00e2y ${side}`);
            connector.setAttribute("title", `K\u00e9o d\u00e2y ${side}`);
            element.appendChild(connector);
          });

          ["n", "e", "s", "w", "ne", "se", "sw", "nw"].forEach((direction) => {
            const resize = document.createElement("span");
            resize.className = `document-flow-diagram__resize document-flow-diagram__resize--${direction}`;
            resize.dataset.flowDiagramResize = item.id;
            resize.setAttribute("data-flow-diagram-resize-direction", direction);
            element.appendChild(resize);
          });

          const swatches = document.createElement("div");
          swatches.className = "document-flow-diagram__swatches";
          DOCUMENT_FLOW_DIAGRAM_COLORS.forEach((color) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `document-flow-diagram__color document-flow-diagram__color--${color}${item.color === color ? " is-active" : ""}`;
            button.dataset.flowDiagramColor = `${item.id}:${color}`;
            button.setAttribute("aria-label", `Màu ${color}`);
            swatches.appendChild(button);
          });
          element.appendChild(swatches);

          element.addEventListener("mousedown", (event) => {
            if (event.target?.closest?.("[data-flow-diagram-label], [data-flow-diagram-color], [data-flow-diagram-connect], [data-flow-diagram-resize], [data-flow-diagram-drag]")) return;
            beginDrag(event, item);
          });
          element.addEventListener("click", (event) => {
            selectedNodeId = item.id;
            if (event.target?.closest?.("[data-flow-diagram-color]")) {
              const [, color] = String(event.target.closest("[data-flow-diagram-color]").dataset.flowDiagramColor || "").split(":");
              updateNode(item.id, { color: normalizeFlowDiagramColor(color) });
            }
            event.stopPropagation();
            render();
          });
          element.querySelector("[data-flow-diagram-drag]")?.addEventListener("mousedown", (event) => beginDrag(event, item));
          element.querySelectorAll("[data-flow-diagram-resize]").forEach((resizeHandle) => {
            resizeHandle.addEventListener("mousedown", (event) => beginResize(event, item, resizeHandle.dataset.flowDiagramResizeDirection || "se"));
          });
          element.querySelectorAll("[data-flow-diagram-connect]").forEach((connector) => {
            connector.addEventListener("mousedown", (event) => beginConnect(event, item, connector.dataset.flowDiagramSide || "right"));
          });
          label.addEventListener("mousedown", (event) => {
            selectedNodeId = item.id;
            selectedEdgeId = "";
            element.classList.add("is-selected");
            event.stopPropagation();
          });
          label.addEventListener("click", (event) => {
            selectedNodeId = item.id;
            selectedEdgeId = "";
            element.classList.add("is-selected");
            event.stopPropagation();
          });
          label.addEventListener("focus", () => {
            selectedNodeId = item.id;
            selectedEdgeId = "";
            element.classList.add("is-selected");
          });
          label.addEventListener("input", () => updateNode(item.id, { text: sanitizeDocumentText(label.value || "Block") }));
          label.addEventListener("keydown", (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
              event.stopPropagation();
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              label.blur();
            }
            event.stopPropagation();
          });
          return element;
        };
        const render = () => {
          const canvas = getCanvas();
          const nodes = getNodes();
          const edges = getEdges(nodes);
          dom.replaceChildren();
          dom.className = `document-flow-diagram document-flow-diagram--${canvas.align}${toolsActive ? " is-active" : ""}`;
          dom.setAttribute("data-type", DOCUMENT_FLOW_DIAGRAM_TYPE);
          dom.style.setProperty("--flow-width", `${canvas.width}px`);
          dom.style.setProperty("--flow-height", `${canvas.height}px`);

          const toolbar = document.createElement("div");
          toolbar.className = "document-flow-diagram__toolbar";
          toolbar.innerHTML = `
            <button type="button" class="icon-button" data-flow-diagram-add-node aria-label="Th\u00eam \u00f4" title="Th\u00eam \u00f4">${icon("add")}</button>
            <button type="button" class="icon-button${canvas.align === "center" ? " is-active" : ""}" data-flow-diagram-align="center" aria-label="C\u0103n gi\u1eefa" title="C\u0103n gi\u1eefa">${icon("format_align_center")}</button>
            <button type="button" class="icon-button${canvas.align === "left" ? " is-active" : ""}" data-flow-diagram-align="left" aria-label="C\u0103n tr\u00e1i" title="C\u0103n tr\u00e1i">${icon("format_align_left")}</button>
          `;
          dom.appendChild(toolbar);

          const viewport = document.createElement("div");
          viewport.className = "document-flow-diagram__viewport";
          viewport.dataset.flowDiagramViewport = "true";
          const stage = document.createElement("div");
          stage.className = "document-flow-diagram__stage";
          stage.dataset.flowDiagramStage = "true";
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("class", "document-flow-diagram__edge-layer");
          svg.setAttribute("aria-hidden", "true");
          renderEdges(svg, nodes, edges);
          stage.appendChild(svg);
          nodes.forEach((item) => stage.appendChild(createNodeElement(item)));
          const nodeById = new Map(nodes.map((item) => [item.id, item]));
          const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
          if (selectedEdge) stage.appendChild(createEdgeToolsElement(selectedEdge, nodeById));
          viewport.appendChild(stage);
          dom.appendChild(viewport);

          const canvasResize = document.createElement("button");
          canvasResize.type = "button";
          canvasResize.className = "document-flow-diagram__canvas-resize";
          canvasResize.setAttribute("data-flow-diagram-canvas-resize", "true");
          canvasResize.setAttribute("aria-label", "K\u00e9o t\u0103ng gi\u1ea3m kh\u00f4ng gian");
          canvasResize.setAttribute("title", "K\u00e9o t\u0103ng gi\u1ea3m kh\u00f4ng gian");
          dom.appendChild(canvasResize);

          toolbar.querySelector("[data-flow-diagram-add-node]")?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            addNode();
          });
          toolbar.querySelectorAll("[data-flow-diagram-align]").forEach((button) => {
            button.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              alignNodes(button.dataset.flowDiagramAlign || "center");
            });
          });
          canvasResize.addEventListener("mousedown", beginCanvasResize);
          stage.addEventListener("click", (event) => {
            if (event.target === stage || event.target === svg) {
              selectedNodeId = "";
              selectedEdgeId = "";
              render();
            }
          });
        };
        render();
        return {
          dom,
          update(updatedNode) {
            if (updatedNode.type.name !== DOCUMENT_FLOW_DIAGRAM_TYPE) return false;
            currentNode = updatedNode;
            if (dom.contains(document.activeElement) && document.activeElement?.closest?.("[data-flow-diagram-label]")) return true;
            render();
            return true;
          },
          stopEvent(event) {
            return Boolean(event.target?.closest?.(".document-flow-diagram"));
          },
          ignoreMutation(mutation) {
            return Boolean(mutation.target?.closest?.(".document-flow-diagram"));
          },
          destroy() {
            document.removeEventListener("mousedown", handleOutsidePress, true);
            document.removeEventListener("keydown", handleDiagramKeyDown, true);
          },
        };
      };
    },
  });
}

function createCalloutNodeExtension() {
  const { core } = getDocumentEditorLib();
  const { Node, mergeAttributes } = core;
  if (!Node || !core.Node) return null;
  return Node.create({
    name: "callout",
    group: "block",
    content: "block*",
    selectable: true,
    addAttributes() {
      return {
        title: { default: "Ghi chÃº" },
        type: { default: "info" },
      };
    },
    parseHTML() {
      return [{ tag: "aside[data-callout]" }];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "aside",
        mergeAttributes(HTMLAttributes, {
          "data-callout": "true",
          class: "document-callout",
        }),
        ["strong", {}, HTMLAttributes?.title || "Ghi chÃº"],
        ["p", 0],
      ];
    },
  });
}

function createStickyNoteNodeExtension() {
  const { core } = getDocumentEditorLib();
  const { Node, mergeAttributes } = core;
  if (!Node || !core.Node) return null;
  return Node.create({
    name: DOCUMENT_STICKY_NOTE_TYPE,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return {
        text: { default: "Ghi chú mới" },
        html: { default: "" },
        color: { default: "dark" },
        x: { default: 48 },
        y: { default: 180 },
        width: { default: 300 },
        height: { default: 228 },
      };
    },
    parseHTML() {
      return [{ tag: "aside[data-sticky-note]" }];
    },
    renderHTML({ HTMLAttributes }) {
      const noteHtml = sanitizeStickyNoteHtml(HTMLAttributes?.html || "") || escapeHtml(HTMLAttributes?.text || "Ghi chú mới");
      return [
        "aside",
        mergeAttributes(HTMLAttributes, {
          "data-sticky-note": "true",
          class: "document-sticky-note document-sticky-note--dark",
          style: `left:${Number(HTMLAttributes?.x) || 48}px;top:${Number(HTMLAttributes?.y) || 180}px;width:${Number(HTMLAttributes?.width) || 300}px;height:${Number(HTMLAttributes?.height) || 228}px;`,
        }),
        ["div", { class: "document-sticky-note__print" }, noteHtml],
      ];
    },
    renderText({ node }) {
      return sanitizeDocumentText(node?.attrs?.text || "Ghi chú mới");
    },
    addNodeView() {
      return ({ node, editor, getPos }) => {
        let currentNode = node;
        const dom = document.createElement("aside");
        const updateAttrs = (attrs) => {
          const position = typeof getPos === "function" ? getPos() : null;
          if (!Number.isFinite(position)) return;
          const nextAttrs = { ...currentNode.attrs, ...attrs };
          const transaction = editor.state.tr.setNodeMarkup(position, undefined, nextAttrs);
          editor.view.dispatch(transaction);
        };
        const syncBody = (body) => updateAttrs({
          html: sanitizeStickyNoteHtml(body.innerHTML || ""),
          text: sanitizeDocumentText(body.innerText || body.textContent || ""),
        });
        const deleteNote = () => {
          const position = typeof getPos === "function" ? getPos() : null;
          if (!Number.isFinite(position)) return;
          editor.view.dispatch(editor.state.tr.delete(position, position + currentNode.nodeSize));
          editor.view.focus();
        };
        const addSiblingNote = () => {
          const position = typeof getPos === "function" ? getPos() : null;
          if (!Number.isFinite(position)) return;
          const next = createStickyNoteDocumentNode({
            x: Math.max(16, Number(currentNode.attrs?.x) + 28 || 76),
            y: Math.max(16, Number(currentNode.attrs?.y) + 28 || 208),
            width: Number(currentNode.attrs?.width) || 300,
            height: Number(currentNode.attrs?.height) || 228,
          });
          editor.chain().focus().insertContentAt(position + currentNode.nodeSize, next).run();
        };
        const beginDrag = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const startX = event.clientX;
          const startY = event.clientY;
          const startLeft = Number(currentNode.attrs?.x) || 48;
          const startTop = Number(currentNode.attrs?.y) || 180;
          const onMove = (moveEvent) => {
            dom.style.left = `${Math.max(0, startLeft + moveEvent.clientX - startX)}px`;
            dom.style.top = `${Math.max(0, startTop + moveEvent.clientY - startY)}px`;
          };
          const onUp = (upEvent) => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            updateAttrs({
              x: Math.max(0, startLeft + upEvent.clientX - startX),
              y: Math.max(0, startTop + upEvent.clientY - startY),
            });
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        };
        const beginResize = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const startX = event.clientX;
          const startY = event.clientY;
          const startWidth = Number(currentNode.attrs?.width) || 300;
          const startHeight = Number(currentNode.attrs?.height) || 228;
          const onMove = (moveEvent) => {
            dom.style.width = `${Math.max(240, Math.min(560, startWidth + moveEvent.clientX - startX))}px`;
            dom.style.height = `${Math.max(180, Math.min(720, startHeight + moveEvent.clientY - startY))}px`;
          };
          const onUp = (upEvent) => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            updateAttrs({
              width: Math.max(240, Math.min(560, startWidth + upEvent.clientX - startX)),
              height: Math.max(180, Math.min(720, startHeight + upEvent.clientY - startY)),
            });
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        };
        const runFormat = (body, command) => {
          body.focus();
          document.execCommand(command, false, null);
          syncBody(body);
        };
        const render = () => {
          dom.className = "document-sticky-note document-sticky-note--dark";
          dom.setAttribute("data-sticky-note", "true");
          dom.style.left = `${Math.max(0, Number(currentNode.attrs?.x) || 48)}px`;
          dom.style.top = `${Math.max(0, Number(currentNode.attrs?.y) || 180)}px`;
          dom.style.width = `${Math.max(240, Math.min(560, Number(currentNode.attrs?.width) || 320))}px`;
          dom.style.height = `${Math.max(180, Math.min(720, Number(currentNode.attrs?.height) || 228))}px`;
          dom.replaceChildren();

          const header = document.createElement("div");
          header.className = "document-sticky-note__bar";
          header.dataset.stickyNoteDrag = "true";
          const add = document.createElement("button");
          add.type = "button";
          add.className = "document-sticky-note__add";
          add.dataset.stickyNoteAdd = "true";
          add.setAttribute("aria-label", "Thêm note");
          add.setAttribute("title", "Thêm note");
          add.textContent = "+";
          const more = document.createElement("span");
          more.className = "document-sticky-note__more";
          more.textContent = "...";
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "document-sticky-note__delete";
          remove.dataset.stickyNoteDelete = "true";
          remove.setAttribute("aria-label", "Xóa note");
          remove.setAttribute("title", "Xóa note");
          remove.textContent = "×";
          header.appendChild(add);
          header.appendChild(more);
          header.appendChild(remove);

          const body = document.createElement("div");
          body.className = "document-sticky-note__body";
          body.contentEditable = "true";
          body.spellcheck = false;
          body.dataset.stickyNoteBody = "true";
          body.innerHTML = sanitizeStickyNoteHtml(currentNode.attrs?.html || "") || escapeHtml(currentNode.attrs?.text || "Ghi chú mới").replace(/\n/g, "<br>");

          const toolbar = document.createElement("div");
          toolbar.className = "document-sticky-note__toolbar";
          [
            ["bold", "B", "In đậm"],
            ["italic", "I", "In nghiêng"],
            ["underline", "U", "Gạch chân"],
            ["strikeThrough", "ab", "Gạch chữ"],
            ["insertUnorderedList", "☰", "Danh sách"],
          ].forEach(([command, label, title]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.stickyNoteFormat = command;
            button.setAttribute("aria-label", title);
            button.setAttribute("title", title);
            button.textContent = label;
            toolbar.appendChild(button);
          });

          dom.appendChild(header);
          dom.appendChild(body);
          dom.appendChild(toolbar);
          const resize = document.createElement("span");
          resize.className = "document-sticky-note__resize";
          resize.dataset.stickyNoteResize = "true";
          resize.setAttribute("aria-hidden", "true");
          dom.appendChild(resize);
        };
        dom.addEventListener("mousedown", (event) => {
          if (event.target?.closest?.("[data-sticky-note-resize]")) {
            beginResize(event);
            return;
          }
          if (event.target?.closest?.("[data-sticky-note-body], [data-sticky-note-format], [data-sticky-note-add], [data-sticky-note-delete]")) {
            event.stopPropagation();
            return;
          }
          beginDrag(event);
        });
        dom.addEventListener("click", (event) => {
          const body = dom.querySelector("[data-sticky-note-body]");
          if (event.target?.closest?.("[data-sticky-note-add]")) {
            event.preventDefault();
            event.stopPropagation();
            addSiblingNote();
            return;
          }
          if (event.target?.closest?.("[data-sticky-note-delete]")) {
            event.preventDefault();
            event.stopPropagation();
            deleteNote();
            return;
          }
          const formatButton = event.target?.closest?.("[data-sticky-note-format]");
          if (formatButton && body) {
            event.preventDefault();
            event.stopPropagation();
            runFormat(body, formatButton.dataset.stickyNoteFormat);
            return;
          }
          if (event.target?.closest?.("[data-sticky-note-body]")) event.stopPropagation();
        });
        dom.addEventListener("input", (event) => {
          const body = event.target?.closest?.("[data-sticky-note-body]");
          if (body) syncBody(body);
        });
        render();
        return {
          dom,
          update(updatedNode) {
            if (updatedNode.type.name !== DOCUMENT_STICKY_NOTE_TYPE) return false;
            currentNode = updatedNode;
            if (dom.contains(document.activeElement) && document.activeElement?.closest?.("[data-sticky-note-body]")) return true;
            render();
            return true;
          },
          stopEvent(event) {
            return Boolean(event.target?.closest?.(".document-sticky-note"));
          },
          ignoreMutation(mutation) {
            return Boolean(mutation.target?.closest?.(".document-sticky-note"));
          },
        };
      };
    },
  });
}
function parseLegacyInlineNode(node, activeMarks = []) {
  if (!node) return [];
  if (node.nodeType === Node.TEXT_NODE) {
    const value = sanitizeDocumentText(node.textContent || "");
    if (!value) return [];
    return [{ type: "text", text: value, marks: [...activeMarks] }];
  }
  if (!(node instanceof Element)) return [];
  const tag = node.tagName?.toUpperCase();
  const marks = [...activeMarks];
  if (["B", "STRONG"].includes(tag)) marks.push({ type: "bold" });
  if (["I", "EM"].includes(tag)) marks.push({ type: "italic" });
  if (tag === "U") marks.push({ type: "underline" });
  if (tag === "S") marks.push({ type: "strike" });
  if (tag === "CODE") marks.push({ type: "code" });
  if (tag === "A") {
    const href = sanitizeDocumentUrl(node.getAttribute("href"));
    if (href) marks.push({ type: "link", attrs: { href } });
  }
  if (tag === "SPAN") {
    const style = String(node.getAttribute("style") || "").toLowerCase();
    const colorMatch = /color:\s*([^;]+)/i.exec(style);
    const bgMatch = /background(-color)?:\s*([^;]+)/i.exec(style);
    const attrs = {};
    if (colorMatch?.[1]) attrs.color = colorMatch[1].trim();
    if (bgMatch?.[2]) attrs.backgroundColor = bgMatch[2].trim();
    if (attrs.color || attrs.backgroundColor) marks.push({ type: "textStyle", attrs });
  }
  return [...node.childNodes].flatMap((child) => parseLegacyInlineNode(child, marks));
}

function parseLegacyBlockNode(node) {
  if (!node) return [];
  if (!(node instanceof Element) && node.nodeType !== Node.TEXT_NODE) return [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = sanitizeDocumentText(node.textContent || "");
    if (!text) return [];
    return [{ type: "paragraph", content: [{ type: "text", text }] }];
  }

  const tag = node.tagName?.toLowerCase();
  const parseChildren = (element) => [...element.childNodes].flatMap((child) => parseLegacyBlockNode(child)).filter(Boolean);

  if (DOCUMENT_LEGACY_HEADING_TAGS.has(node.tagName?.toUpperCase())) {
    const level = Number(node.tagName?.slice(1)) || 1;
    return [{ type: "heading", attrs: { level }, content: parseLegacyInlineNode(node) }];
  }
  if (tag === "p" || tag === "div") return [{ type: "paragraph", content: parseLegacyInlineNode(node) }];
  if (tag === "blockquote") return [{ type: "blockquote", content: parseChildren(node).length ? parseChildren(node) : [] }];
  if (tag === "pre") return [{ type: "codeBlock", content: [{ type: "text", text: sanitizeDocumentText(node.textContent || "") }] }];
  if (tag === "ul") {
    return [{ type: "bulletList", content: [...node.children].flatMap((item) => parseLegacyListItem(item)) }];
  }
  if (tag === "ol") {
    return [{ type: "orderedList", content: [...node.children].flatMap((item) => parseLegacyListItem(item)) }];
  }
  if (tag === "li") return parseLegacyListItem(node);
  if (tag === "img") {
    const src = sanitizeDocumentUrl(node.getAttribute("src"));
    if (!src) return [];
    return [{ type: "image", attrs: { src, alt: sanitizeDocumentText(node.getAttribute("alt") || "") } }];
  }
  if (tag === "table") {
    const rows = [...node.querySelectorAll("tr")].map((row) => ({
      type: "tableRow",
      content: [...row.children].map((cell) => ({
        type: "tableCell",
        attrs: {
          colspan: Number(cell.getAttribute("colspan") || 1),
          rowspan: Number(cell.getAttribute("rowspan") || 1),
        },
        content: parseLegacyInlineNode(cell),
      })),
    }));
    return [{ type: "table", content: rows }];
  }
  if (tag === "hr") return [{ type: "horizontalRule" }];
  return parseChildren(node);
}

function parseLegacyListItem(node) {
  if (!node) return [];
  return [{
    type: "listItem",
    content: [...node.childNodes].flatMap((item) => {
      if (item.nodeType === Node.TEXT_NODE && !String(item.textContent || "").trim()) return [];
      const parsed = parseLegacyBlockNode(item);
      if (!parsed.length) return [{ type: "paragraph", content: parseLegacyInlineNode(item) }];
      return parsed;
    }),
  }];
}

function parseMarkdownLines(markdownText = "") {
  const lines = String(markdownText || "").replace(/\r\n/g, "\n").split("\n");
  const nodes = [];
  let currentCode = null;
  let inCodeFence = false;
  let codeLang = "";
  let listStack = [];

  const pushListItem = (line, ordered = false, level = 0) => {
    const normalizedLevel = Math.max(0, Math.min(5, Math.floor(Number(level) || 0)));
    while (listStack.length <= normalizedLevel) {
      const listType = normalizedLevel === 0 ? (ordered ? "orderedList" : "bulletList") : listStack[normalizedLevel].type;
      listStack.push({
        type: listType,
        content: [],
        level: normalizedLevel,
      });
    }
    while (listStack.length - 1 > normalizedLevel) {
      const child = listStack.pop();
      const parent = listStack[listStack.length - 1];
      if (parent) parent.content.push(child);
    }
    if (!listStack[normalizedLevel]) return;
    listStack[normalizedLevel].type = ordered ? "orderedList" : "bulletList";
    listStack[normalizedLevel].content.push({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: line }] }],
    });
  };

  const finalizeList = () => {
    const stacks = [...listStack];
    if (!stacks.length) return;
    let built = stacks.pop();
    while (stacks.length) {
      const parent = stacks.pop();
      if (!parent.content.length) parent.content.push(built);
      else parent.content[parent.content.length - 1].content ||= [];
      built = parent;
    }
    nodes.push(built);
    listStack = [];
  };

  for (const raw of lines) {
    const line = String(raw || "");
    if (line.trim() === "```") {
      if (!inCodeFence) {
        finalizeList();
        inCodeFence = true;
        codeLang = "";
        currentCode = [];
        continue;
      }
      inCodeFence = false;
      nodes.push({ type: "codeBlock", content: [{ type: "text", text: String(currentCode?.join("\n") || "") }] });
      currentCode = null;
      continue;
    }
    if (inCodeFence) {
      currentCode.push(line);
      continue;
    }

    const checkboxMatch = line.match(/^(\s*)(?:-|\*)\s+\[(\s|x|X)\]\s+(.*)$/);
    const unorderedMatch = line.match(/^(\s*)(?:-|\*)\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const quoteMatch = line.match(/^>\s+(.*)$/);

    if (line.trim() === "---") {
      finalizeList();
      nodes.push({ type: "horizontalRule" });
      continue;
    }
    if (headingMatch) {
      finalizeList();
      const level = headingMatch[1].length;
      nodes.push({ type: "heading", attrs: { level }, content: [{ type: "text", text: sanitizeDocumentText(headingMatch[2] || "") }] });
      continue;
    }
    if (quoteMatch) {
      finalizeList();
      nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: sanitizeDocumentText(quoteMatch[1] || "") }] }] });
      continue;
    }
    if (orderedMatch) {
      const level = Math.max(0, (orderedMatch[1].match(/^ +/)?.[0]?.length || 0) / 2);
      pushListItem(orderedMatch[2], true, level);
      continue;
    }
    if (checkboxMatch) {
      const level = Math.max(0, (checkboxMatch[1].match(/^ +/)?.[0]?.length || 0) / 2);
      const marker = checkboxMatch[2].toLowerCase() === "x" ? "[x] " : "[ ] ";
      pushListItem(`${marker}${checkboxMatch[3]}`, false, level);
      continue;
    }
    if (unorderedMatch) {
      const level = Math.max(0, (unorderedMatch[1].match(/^ +/)?.[0]?.length || 0) / 2);
      pushListItem(unorderedMatch[2], false, level);
      continue;
    }
    if (line.trim() === "") {
      finalizeList();
      continue;
    }
    finalizeList();
    nodes.push({ type: "paragraph", content: [{ type: "text", text: sanitizeDocumentText(line) }] });
  }

  finalizeList();
  return nodes.filter(Boolean).length ? nodes : [{ type: "paragraph", content: [{ type: "text", text: "" }] }];
}

function importDocumentFromMarkdown(markdownText = "") {
  try {
    return normalizeDocumentModel({
      type: "doc",
      content: parseMarkdownLines(markdownText),
    });
  } catch {
    return createEmptyDocumentJson();
  }
}

function importDocumentFromHtml(html = "") {
  try {
    const container = document.createElement("div");
    container.innerHTML = sanitizeLegacyHtmlForParsing(html);
    const content = [...container.childNodes].flatMap((node) => parseLegacyBlockNode(node)).filter(Boolean);
    return normalizeDocumentModel({
      type: "doc",
      content: content.length ? content : [{ type: "paragraph", content: [] }],
    });
  } catch {
    return createEmptyDocumentJson();
  }
}

function sanitizeLegacyHtmlForParsing(rawHtml = "") {
  const container = document.createElement("div");
  container.innerHTML = rawHtml || "";
  container.querySelectorAll("script, style, iframe").forEach((node) => node.remove());
  container.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      if (attribute.name.toLowerCase() === "srcdoc") element.removeAttribute(attribute.name);
      if (attribute.name.toLowerCase() === "style") {
        const style = String(attribute.value || "");
        const safeParts = [];
        if (/color:\s*#?[0-9a-f]{3,8}/i.test(style)) safeParts.push(style.match(/color:\s*[^;]+/i)?.[0]);
        if (/background(-color)?:\s*#?[0-9a-f]{3,8}/i.test(style)) safeParts.push(style.match(/background(?:-color)?\s*:\s*[^;]+/i)?.[0]);
        if (safeParts.filter(Boolean).length) element.setAttribute("style", safeParts.filter(Boolean).join(";"));
        else element.removeAttribute("style");
      }
    });
    if ((element.tagName || "").toUpperCase() === "IMG") {
      const src = sanitizeDocumentUrl(element.getAttribute("src") || "");
      if (!src) element.removeAttribute("src");
    }
    if ((element.tagName || "").toUpperCase() === "A") {
      const href = sanitizeDocumentUrl(element.getAttribute("href") || "");
      if (!href) element.removeAttribute("href");
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }
  });
  return container.innerHTML;
}

function parseLegacyDocumentContent(html = "") {
  try {
    const container = document.createElement("div");
    container.innerHTML = sanitizeLegacyHtmlForParsing(html);
    const content = [...container.childNodes].flatMap((node) => parseLegacyBlockNode(node)).filter(Boolean);
    return normalizeDocumentModel({ type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] });
  } catch {
    return createEmptyDocumentJson();
  }
}

function serializeDocumentTextWithMarks(textNode) {
  if (!textNode || textNode.type !== "text") return "";
  let html = escapeHtml(textNode.text || "");
  const marks = Array.isArray(textNode.marks) ? [...textNode.marks] : [];
  const ordered = ["bold", "italic", "underline", "strike", "code", "link", "textStyle", "highlight"];
  const byType = Object.fromEntries(marks.map((mark, index) => [index, mark]));
  ordered.forEach((type) => {
    const target = marks.find((mark) => mark.type === type);
    if (!target) return;
    if (type === "bold") html = `<strong>${html}</strong>`;
    if (type === "italic") html = `<em>${html}</em>`;
    if (type === "underline") html = `<u>${html}</u>`;
    if (type === "strike") html = `<s>${html}</s>`;
    if (type === "code") html = `<code>${html}</code>`;
    if (type === "link" && target.attrs?.href) html = `<a href="${escapeHtml(target.attrs.href)}" target="_blank" rel="noreferrer">${html}</a>`;
    if (type === "textStyle") {
      const styleBits = [];
      if (target.attrs?.color) styleBits.push(`color:${escapeHtml(target.attrs.color)}`);
      if (target.attrs?.backgroundColor) styleBits.push(`background-color:${escapeHtml(target.attrs.backgroundColor)}`);
      html = `<span style="${styleBits.join(";")}">${html}</span>`;
    }
    if (type === "highlight" && target.attrs?.color) {
      html = `<mark style="background-color:${escapeHtml(target.attrs.color)}">${html}</mark>`;
    }
  });
  return html;
}

function serializeDocumentNode(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return serializeDocumentTextWithMarks(node);
  if (node.type === "paragraph") return `<p>${(node.content || []).map(serializeDocumentNode).join("") || ""}</p>`;
  if (node.type === "blockquote") return `<blockquote>${(node.content || []).map(serializeDocumentNode).join("") || ""}</blockquote>`;
  if (node.type === "codeBlock") return `<pre><code>${(node.content || []).map(serializeDocumentNode).join("") || ""}</code></pre>`;
  if (node.type === "callout") return `<div class="document-callout">${(node.content || []).map(serializeDocumentNode).join("") || ""}</div>`;
  if (node.type === "heading") {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2));
    const headingId = sanitizeDocumentText(node.attrs?.headingId || "").trim();
    const headingAttr = headingId ? ` data-doc-heading-id="${escapeHtml(headingId)}"` : "";
    return `<h${level}${headingAttr}>${(node.content || []).map(serializeDocumentNode).join("") || ""}</h${level}>`;
  }
  if (node.type === "bulletList") return `<ul>${(node.content || []).map(serializeDocumentNode).join("")}</ul>`;
  if (node.type === "orderedList") return `<ol>${(node.content || []).map(serializeDocumentNode).join("")}</ol>`;
  if (node.type === "taskList") return `<ul data-type="taskList">${(node.content || []).map(serializeDocumentNode).join("")}</ul>`;
  if (node.type === "taskItem") {
    const checked = node.attrs?.checked ? " checked" : "";
    return `<li><label><input type="checkbox"${checked} disabled /> ${(node.content || []).map(serializeDocumentNode).join("")}</label></li>`;
  }
  if (node.type === "listItem") return `<li>${(node.content || []).map(serializeDocumentNode).join("")}</li>`;
  if (node.type === "image") {
    const attrs = node.attrs || {};
    if (!sanitizeDocumentUrl(attrs.src)) return "";
    const safeSrc = escapeHtml(sanitizeDocumentUrl(attrs.src));
    const extra = [
      attrs.alt ? `alt="${escapeHtml(attrs.alt)}"` : "",
      attrs.title ? `title="${escapeHtml(attrs.title)}"` : "",
      attrs.width ? `width="${escapeHtml(attrs.width)}"` : "",
      attrs.height ? `height="${escapeHtml(attrs.height)}"` : "",
      attrs.align ? `data-align="${escapeHtml(attrs.align)}"` : "",
      attrs.caption ? `data-caption="${escapeHtml(attrs.caption)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<img src="${safeSrc}" ${extra} loading="lazy" />`;
  }
  if (node.type === "table") {
    const rows = (node.content || [])
      .map((row) => `<tr>${(row.content || []).map((cell) => {
        const colspan = Math.max(1, Number(cell.attrs?.colspan || 1));
        const rowspan = Math.max(1, Number(cell.attrs?.rowspan || 1));
        const cellTag = row.type === "tableRow" ? "td" : "td";
        return `<${cellTag} colspan="${colspan}" rowspan="${rowspan}">${(cell.content || []).map(serializeDocumentNode).join("")}</${cellTag}>`;
      }).join("")}</tr>`)
      .join("");
    return `<table class="document-table"><tbody>${rows}</tbody></table>`;
  }
  if (node.type === "tableRow") {
    return `<tr>${(node.content || []).map(serializeDocumentNode).join("")}</tr>`;
  }
  if (node.type === "tableCell") {
    return `<td>${(node.content || []).map(serializeDocumentNode).join("")}</td>`;
  }
  if (node.type === DOCUMENT_MIND_MAP_TYPE) {
    const title = escapeHtml(node?.attrs?.title || "Ã chÃ­nh");
    const nodes = displayMindMapBranchNodes(node.attrs?.nodes, node?.attrs?.title || "");
    return `<div class="document-mindmap"><div class="document-mindmap__canvas"><div class="document-mindmap__root">${title}</div>${renderMindMapHtmlBranches(nodes)}</div></div>`;
  }
  if (node.type === DOCUMENT_FLOW_DIAGRAM_TYPE) {
    return renderFlowDiagramHtml(node.attrs || {});
  }
  if (node.type === DOCUMENT_STICKY_NOTE_TYPE) {
    const x = Math.max(0, Number(node.attrs?.x) || 48);
    const y = Math.max(0, Number(node.attrs?.y) || 180);
    const width = Math.max(220, Math.min(520, Number(node.attrs?.width) || 300));
    const height = Math.max(180, Math.min(720, Number(node.attrs?.height) || 228));
    const noteHtml = sanitizeStickyNoteHtml(node.attrs?.html || "") || escapeHtml(node.attrs?.text || "Ghi chú mới");
    return `<aside class="document-sticky-note document-sticky-note--dark" data-sticky-note="true" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px"><div class="document-sticky-note__print">${noteHtml}</div></aside>`;
  }
  if (node.type === "horizontalRule") return "<hr />";
  return "";
}

function serializeDocumentToHtml(documentJson = createEmptyDocumentJson()) {
  const normalized = normalizeDocumentModel(documentJson);
  return (normalized.content || []).map(serializeDocumentNode).join("") || "";
}

function serializeDocumentToMarkdown(documentJson = createEmptyDocumentJson()) {
  const normalized = normalizeDocumentModel(documentJson);
  const mapNode = (node, depth = 0) => {
    if (!node || typeof node !== "object") return "";
    if (node.type === "text") {
      let text = sanitizeDocumentText(node.text || "");
      const marks = Array.isArray(node.marks) ? node.marks : [];
      if (marks.find((mark) => mark?.type === "bold")) text = `**${text}**`;
      if (marks.find((mark) => mark?.type === "italic")) text = `_${text}_`;
      if (marks.find((mark) => mark?.type === "code")) text = `\`${text}\``;
      if (marks.find((mark) => mark?.type === "underline")) text = `_${text}_`;
      if (marks.find((mark) => mark?.type === "strike")) text = `~~${text}~~`;
      return text;
    }
    if (node.type === "paragraph") return `${(node.content || []).map((child) => mapNode(child, depth)).join("")}\n\n`;
    if (node.type === "heading") return `${"#".repeat(Math.min(6, Math.max(1, Number(node.attrs?.level) || 2)))} ${(node.content || []).map((child) => mapNode(child, depth)).join("")}\n\n`;
    if (node.type === "bulletList") return `${(node.content || []).map((child) => `${" ".repeat(depth)}- ${(child.content || []).map((grandChild) => mapNode(grandChild, depth + 2)).join("").trim()}\n`).join("")}\n`;
    if (node.type === "orderedList") return `${(node.content || []).map((child, index) => `${" ".repeat(depth)}${index + 1}. ${(child.content || []).map((grandChild) => mapNode(grandChild, depth + 2)).join("").trim()}\n`).join("")}\n`;
    if (node.type === "taskList") return `${(node.content || []).map((child, index) => `${" ".repeat(depth)}- [${child.attrs?.checked ? "x" : " "}] ${(child.content || []).map((grandChild) => mapNode(grandChild, depth + 2)).join("").trim()}\n`).join("")}\n`;
    if (node.type === "blockquote") return `> ${(node.content || []).map((child) => mapNode(child, depth + 1)).join("").trim()}\n\n`;
    if (node.type === "image") return `![${escapeHtml(node.attrs?.alt || "")}](${escapeHtml(node.attrs?.src || "")})\n`;
    if (node.type === DOCUMENT_MIND_MAP_TYPE) {
      const nodes = node.attrs?.nodes || [];
      return nodes.length ? nodes.map((item) => `- ${escapeHtml(item?.text || "")}`).join("\n") : "";
    }
    if (node.type === DOCUMENT_FLOW_DIAGRAM_TYPE) {
      const nodes = normalizeFlowDiagramNodes(node.attrs?.nodes || []);
      const edges = normalizeFlowDiagramEdges(node.attrs?.edges || [], nodes, node.attrs || {});
      const edgeText = edges.map((edge) => {
        const from = nodes.find((item) => item.id === edge.from)?.text || "Block";
        const to = edge.to ? nodes.find((item) => item.id === edge.to)?.text || "Block" : "Mũi tên tự do";
        return `${from} -> ${to}`;
      });
      return [`Flow diagram: ${nodes.map((item) => item.text).join(", ")}`, ...edgeText].filter(Boolean).join("\n");
    }
    if (node.type === DOCUMENT_STICKY_NOTE_TYPE) return `> ${sanitizeDocumentText(node.attrs?.text || "Ghi chÃº má»›i")}\n\n`;
    return "";
  };
  return `${(normalized.content || []).map((node) => mapNode(node)).join("")}`.trim();
}

const levelOrder = ["chapter", "lesson", "section", "item"];
const levelLabels = {
  course: "TÃªn khÃ³a",
  chapter: "ChÆ°Æ¡ng",
  lesson: "BÃ i",
  section: "Má»¥c 1/2/3",
  item: "Má»¥c a/b/c hoáº·c Ä‘oáº¡n",
};

let knowledgeDocumentsChanged = false;
const documentEditorSessions = new Map();

function pageFromPath(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/workspace/calendar") return "calendar";
  if (normalized === "/workspace/documents" || normalized.startsWith("/workspace/documents/")) return "documents";
  const exactPage = pages.find((page) => page.path === normalized);
  if (!exactPage) return "";
  if (!exactPage.isSpace) return exactPage.id;
  const space = moduleSpaces.find((item) => item.pageId === exactPage.id);
  return space?.pages[0] || "";
}

function routeForPage(pageId) {
  return pages.find((page) => page.id === pageId)?.path || "/";
}

function currentModuleSpace(pageId = state.page) {
  return moduleSpaces.find((space) => space.pages.includes(pageId)) || null;
}

function canonicalPathForCurrentRoute(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/workspace/calendar") return "";
  if (normalized === "/workspace/documents" || normalized.startsWith("/workspace/documents/")) return "";
  const exactPage = pages.find((page) => page.path === normalized);
  if (!exactPage?.isSpace) return "";
  const space = moduleSpaces.find((item) => item.pageId === exactPage.id);
  return routeForPage(space?.pages[0]);
}

function documentRouteIdFromPath(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const prefix = "/workspace/documents/";
  if (!normalized.startsWith(prefix)) return "";
  try {
    return decodeURIComponent(normalized.slice(prefix.length)).trim();
  } catch {
    return normalized.slice(prefix.length).trim();
  }
}

function findDocumentByRouteId(routeId = "") {
  const normalizedRouteId = String(routeId || "").trim();
  if (!normalizedRouteId) return null;
  return state.documents.find((documentItem) => (
    documentItem.id === normalizedRouteId ||
    documentStableId(documentItem) === normalizedRouteId ||
    documentDisplayId(documentItem).toLowerCase() === normalizedRouteId.toLowerCase()
  )) || null;
}

function documentRouteFor(documentItem = null) {
  if (!documentItem) return "/workspace/documents";
  return `/workspace/documents/${encodeURIComponent(documentStableId(documentItem))}`;
}

function knowledgeSeedDocuments() {
  return Array.isArray(window.TA_KNOWLEDGE_DOCUMENTS) ? window.TA_KNOWLEDGE_DOCUMENTS : [];
}

function mergeKnowledgeDocuments(documents = []) {
  const merged = [...(documents || [])];
  const existing = new Set(merged.map((documentItem) => documentItem.id || documentItem.title));
  knowledgeSeedDocuments().forEach((documentItem) => {
    const key = documentItem.id || documentItem.title;
    if (!existing.has(key)) {
      merged.push({ ...documentItem });
      existing.add(key);
      knowledgeDocumentsChanged = true;
    }
  });
  return merged;
}

function migrateDocumentItem(item) {
  const clone = item && typeof item === "object" ? { ...item } : null;
  if (!clone) return clone;
  if (!clone.id) clone.id = crypto.randomUUID();
  clone.contentVersion = Math.max(DOCUMENT_MODEL_VERSION, Number(clone.contentVersion) || DOCUMENT_MODEL_VERSION);
  if (!clone.legacyContent && clone.content) {
    clone.legacyContent = clone.content;
  }
  const hasModernModel = clone.contentJson && typeof clone.contentJson === "object";
  if (!hasModernModel) {
    clone.contentJson = parseLegacyDocumentContent(clone.legacyContent || clone.content || "");
    clone.content = sanitizeDocumentContent(clone.legacyContent || clone.content || "");
    clone.contentVersion = DOCUMENT_MODEL_VERSION;
  } else {
    clone.contentJson = normalizeDocumentModel(clone.contentJson);
  }
  if (!validateDocumentJson(clone.contentJson)) {
    const normalized = parseLegacyDocumentContent(clone.legacyContent || clone.content || "");
    clone.contentJson = normalizeDocumentModel(normalized);
    clone.content = serializeDocumentToHtml(clone.contentJson);
  }
  clone.contentJson = normalizeDocumentModel(clone.contentJson);
  clone.content = sanitizeDocumentContent(clone.content || serializeDocumentToHtml(clone.contentJson));
  clone.legacyContent = clone.legacyContent || "";
  if (!Array.isArray(clone.history)) clone.history = [];
  clone.updatedAt = clone.updatedAt || new Date().toISOString();
  return clone;
}

function normalizeStoredDocuments(documents = []) {
  return (documents || []).map(migrateDocumentItem).filter(Boolean);
}

function mergeRemoteDocumentsWithLocal(remoteDocuments = [], localDocuments = []) {
  const remoteItems = normalizeStoredDocuments(mergeKnowledgeDocuments(remoteDocuments));
  const remoteIds = new Set(remoteItems.map((item) => item.id).filter(Boolean));
  const localOnlyItems = normalizeStoredDocuments(localDocuments).filter((item) => item?.id && !remoteIds.has(item.id));
  return [...localOnlyItems, ...remoteItems];
}

const state = {
  page: pageFromPath() || localStorage.getItem("ta.page") || "calendar",
  search: "",
  taskFilter: "today",
  promptFilter: "all",
  ideaFormOpen: false,
  documentPanelOpen: false,
  documentFocusMode: localStorage.getItem("ta.documentFocusMode") === "true",
  documentTocHidden: localStorage.getItem("ta.documentTocHidden") !== "false",
  documentToolbarHidden: localStorage.getItem("ta.documentToolbarHidden") === "true",
  documentTocCollapsed: localStorage.getItem("ta.documentTocCollapsed") === "true",
  documentTocCollapsedBranches: readStore("ta.documentTocCollapsedBranches", {}),
  documentFolderFormOpen: false,
  documentFolderFilter: localStorage.getItem("ta.documentFolderFilter") || "all",
  zoom: Number(localStorage.getItem("ta.zoom") || 1.08),
  countdownTotal: Number(localStorage.getItem("ta.countdownTotal") || 25 * 60),
  countdownRemaining: Number(localStorage.getItem("ta.countdownRemaining") || 25 * 60),
  countdownRunning: false,
  stopwatchElapsed: Number(localStorage.getItem("ta.stopwatchElapsed") || 0),
  stopwatchRunning: false,
  stopwatchStartedAt: 0,
  stopwatchBase: 0,
  selectedCourseId: localStorage.getItem("ta.selectedCourseId") || "",
  courseDraftMode: "list",
  courseFocus: false,
  courseReadMode: false,
  selectedNoteId: localStorage.getItem("ta.selectedNoteId") || "",
  selectedDocumentId: localStorage.getItem("ta.selectedDocumentId") || "",
  authUser: null,
  authReady: false,
  tasks: readStore("ta.tasks", seedTasks()),
  prompts: readStore("ta.prompts", seedPrompts()),
  alarms: readStore("ta.alarms", []),
  courses: normalizeCourses(readStore("ta.courses", seedCourses())),
  notes: readStore("ta.notes", seedNotes()),
  documentFolders: readStore("ta.documentFolders", ["KhÃ³a há»c", "TÃ i liá»‡u chung"]),
  documents: normalizeStoredDocuments(mergeKnowledgeDocuments(readStore("ta.documents", seedDocuments()))),
  ideas: readStore("ta.ideas", seedIdeas()),
  contentPlans: readStore("ta.contentPlans", seedContentPlans()),
};

const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const pageTitle = document.querySelector("#pageTitle");
const searchInput = document.querySelector("#globalSearch");
const toast = document.querySelector("#toast");
const zoomValue = document.querySelector("#zoomValue");

if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;
if (!state.selectedNoteId && state.notes[0]) state.selectedNoteId = state.notes[0].id;
if (!pages.some((page) => page.id === state.page)) state.page = "calendar";
if (state.page === "documents") {
  const routeDocument = findDocumentByRouteId(documentRouteIdFromPath());
  if (routeDocument) {
    state.selectedDocumentId = routeDocument.id;
    state.documentFocusMode = true;
    localStorage.setItem("ta.selectedDocumentId", routeDocument.id);
    localStorage.setItem("ta.documentFocusMode", "true");
  }
}
const canonicalPath = canonicalPathForCurrentRoute();
if (canonicalPath && window.location.pathname !== canonicalPath) {
  history.replaceState({ page: state.page }, "", canonicalPath);
}

const remoteStateTable = "app_state";
let remoteStateId = "local-default";
let supabaseClient = null;
let workspaceApiRemote = false;
let remoteSaveTimer = null;
let remoteReady = false;
let remoteLoading = false;
let remoteErrorShown = false;
let documentSelectionRange = null;
let documentEditorCommandSelection = null;

function seedTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Thiáº¿t káº¿ landing page chiáº¿n dá»‹ch AI",
      description: "PhÃ¡t triá»ƒn wireframe vÃ  UI design cho chiáº¿n dá»‹ch quáº£ng bÃ¡ bá»™ cÃ´ng cá»¥ AI Marketing má»›i.",
      due: "2026-05-20",
      priority: "High",
      status: "today",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Viáº¿t 5 máº«u quáº£ng cÃ¡o remarketing",
      description: "Táº­p trung vÃ o nhÃ³m há»c viÃªn Ä‘Ã£ xem webinar nhÆ°ng chÆ°a Ä‘Äƒng kÃ½.",
      due: "2026-05-22",
      priority: "Medium",
      status: "upcoming",
      done: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Kiá»ƒm tra bÃ¡o cÃ¡o doanh thu tuáº§n",
      description: "Äá»‘i soÃ¡t chi phÃ­ ads, sá»‘ lead vÃ  doanh thu theo tá»«ng phá»…u.",
      due: "2026-05-14",
      priority: "Low",
      status: "completed",
      done: true,
    },
  ];
}

function seedPrompts() {
  return [
    {
      id: crypto.randomUUID(),
      title: "XÃ¢y dá»±ng káº¿ hoáº¡ch ná»™i dung 30 ngÃ y",
      category: "Content",
      body: "HÃ£y láº­p káº¿ hoáº¡ch ná»™i dung 30 ngÃ y cho [thÆ°Æ¡ng hiá»‡u], gá»“m chá»§ Ä‘á», hook, Ä‘á»‹nh dáº¡ng, kÃªnh Ä‘Äƒng vÃ  CTA.",
      favorite: true,
    },
    {
      id: crypto.randomUUID(),
      title: "PhÃ¢n tÃ­ch chÃ¢n dung khÃ¡ch hÃ ng",
      category: "Marketing",
      body: "ÄÃ³ng vai strategist. PhÃ¢n tÃ­ch nhÃ³m khÃ¡ch hÃ ng má»¥c tiÃªu cho [sáº£n pháº©m], nÃªu pain point, Ä‘á»™ng lá»±c mua vÃ  thÃ´ng Ä‘iá»‡p phÃ¹ há»£p.",
      favorite: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Viáº¿t angle quáº£ng cÃ¡o Facebook",
      category: "Ads",
      body: "Táº¡o 12 angle quáº£ng cÃ¡o Facebook cho [sáº£n pháº©m/dá»‹ch vá»¥], chia theo váº¥n Ä‘á», káº¿t quáº£ mong muá»‘n, social proof vÃ  Æ°u Ä‘Ã£i giá»›i háº¡n.",
      favorite: false,
    },
  ];
}

function seedCourses() {
  return [
    {
      id: crypto.randomUUID(),
      level: "course",
      title: "AI Marketing Mastery",
      description: "KhÃ³a há»c giÃºp marketer xÃ¢y dá»±ng há»‡ thá»‘ng ná»™i dung, ads vÃ  automation báº±ng AI.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
      children: [
        {
          id: crypto.randomUUID(),
          level: "chapter",
          title: "ChÆ°Æ¡ng 1: Chiáº¿n lÆ°á»£c ná»n táº£ng",
          description: "LÃ m rÃµ má»¥c tiÃªu, chÃ¢n dung khÃ¡ch hÃ ng vÃ  báº£n Ä‘á»“ ná»™i dung.",
          children: [
            { id: crypto.randomUUID(), level: "lesson", title: "BÃ i 1: Ná»n táº£ng chiáº¿n lÆ°á»£c AI Marketing", description: "", type: "BÃ i há»c", minutes: 28, children: [] },
            { id: crypto.randomUUID(), level: "lesson", title: "BÃ i 2: XÃ¢y thÆ° viá»‡n prompt váº­n hÃ nh", description: "", type: "Workshop", minutes: 42, children: [] },
          ],
        },
      ],
    },
  ];
}

function seedNotes() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Ã tÆ°á»Ÿng chiáº¿n dá»‹ch",
      body: "Viáº¿t nhanh cÃ¡c Ã½ tÆ°á»Ÿng, hook, checklist hoáº·c viá»‡c cáº§n nhá»› á»Ÿ Ä‘Ã¢y.",
      color: "yellow",
      pinned: true,
    },
    {
      id: crypto.randomUUID(),
      title: "Viá»‡c cáº§n xem láº¡i",
      body: "Kiá»ƒm tra prompt, lá»‹ch content vÃ  tÃªn ads trÆ°á»›c khi cháº¡y.",
      color: "blue",
      pinned: false,
    },
  ];
}

function seedContentPlans() {
  return [
    { id: crypto.randomUUID(), date: "2026-05-18", channel: "Facebook", topic: "Case study há»c viÃªn", courseId: "", status: "Draft" },
    { id: crypto.randomUUID(), date: "2026-05-20", channel: "TikTok", topic: "Hook video AI Marketing", courseId: "", status: "Scheduled" },
  ];
}

function seedDocuments() {
  return [
    {
      id: crypto.randomUUID(),
      title: "GiÃ¡o trÃ¬nh AI Growth System",
      type: "Giao trinh",
      color: "blue",
      folder: "KhÃ³a há»c",
      summary: "Khung Attract, Grow, Scale, CRM/Data Ä‘á»ƒ lÆ°u tÃ i liá»‡u AI táº¡o ra vÃ  má»Ÿ Ä‘á»c ngay trong app.",
      sourceUrl: "",
      content: "<h2>AI Growth System</h2><p>LÆ°u giÃ¡o trÃ¬nh, checklist, SOP hoáº·c tÃ i liá»‡u AI Ä‘Ã£ xuáº¥t sang app á»Ÿ Ä‘Ã¢y.</p><ul><li>Attract: kÃªnh thu hÃºt khÃ¡ch hÃ ng</li><li>Grow: chuyá»ƒn Ä‘á»•i vÃ  nuÃ´i dÆ°á»¡ng</li><li>Scale: má»Ÿ rá»™ng váº­n hÃ nh</li><li>CRM/Data: dá»¯ liá»‡u vÃ  chÄƒm sÃ³c láº¡i</li></ul>",
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Báº£ng theo dÃµi tÃ i liá»‡u",
      type: "Sheet",
      color: "green",
      folder: "TÃ i liá»‡u chung",
      summary: "CÃ³ thá»ƒ lÆ°u link Google Sheet, CSV hoáº·c báº£ng dá»¯ liá»‡u Ä‘á»ƒ má»Ÿ láº¡i nhanh.",
      sourceUrl: "https://docs.google.com/spreadsheets/",
      content: "<p>DÃ¡n link sheet vÃ o Ã´ nguá»“n, hoáº·c ghi chÃº cáº¥u trÃºc báº£ng cáº§n dÃ¹ng á»Ÿ Ä‘Ã¢y.</p>",
      updatedAt: new Date().toISOString(),
    },
  ];
}

function seedIdeas() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Swipe file landing page AI",
      url: "https://app.theanhmarketing.com/",
      note: "LÆ°u cÃ¡c link tham kháº£o, tiÃªu Ä‘á» vÃ  thumbnail nhá» Ä‘á»ƒ dÃ¹ng láº¡i khi brainstorm.",
      createdAt: new Date().toISOString(),
    },
  ];
}

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleRemoteSave();
}

function getSupabaseConfig() {
  const config = window.SUPABASE_CONFIG || {};
  const url = String(config.url || "").trim();
  const publishableKey = String(config.publishableKey || "").trim();
  const hasProjectUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !url.includes("your-project-ref");
  const hasPublishableKey = publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ");
  if (!hasProjectUrl || !hasPublishableKey) return null;
  return { url, publishableKey };
}

function loadSupabaseSdk() {
  if (window.supabase?.createClient) return Promise.resolve(true);
  if (window.__taSupabaseSdkPromise) return window.__taSupabaseSdkPromise;

  window.__taSupabaseSdkPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-ta-supabase-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.supabase?.createClient)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.106.0/dist/umd/supabase.min.js";
    script.async = true;
    script.dataset.taSupabaseSdk = "true";
    script.onload = () => resolve(Boolean(window.supabase?.createClient));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return window.__taSupabaseSdkPromise;
}

function getWorkspaceRemoteConfig() {
  const config = window.WORKSPACE_REMOTE_CONFIG || {};
  const endpoint = String(config.endpoint || "/api/workspace/app-state").trim();
  if (config.mode !== "adplan_api" || !endpoint.startsWith("/api/")) return null;
  return { endpoint };
}

function collectRemoteState() {
  return {
    tasks: state.tasks,
    prompts: state.prompts,
    alarms: state.alarms,
    courses: state.courses,
    notes: state.notes,
    documentFolders: state.documentFolders,
    documents: state.documents,
    ideas: state.ideas,
    contentPlans: state.contentPlans,
    selectedCourseId: state.selectedCourseId,
    selectedDocumentId: state.selectedDocumentId,
  };
}

function applyRemoteState(payload) {
  if (!payload || typeof payload !== "object") return false;
  remoteLoading = true;
  if (Array.isArray(payload.tasks)) state.tasks = payload.tasks;
  if (Array.isArray(payload.prompts)) state.prompts = payload.prompts;
  if (Array.isArray(payload.alarms)) state.alarms = payload.alarms;
  if (Array.isArray(payload.courses)) state.courses = normalizeCourses(payload.courses);
  if (Array.isArray(payload.notes)) state.notes = payload.notes;
  if (Array.isArray(payload.documentFolders)) state.documentFolders = payload.documentFolders;
  if (Array.isArray(payload.documents)) state.documents = mergeRemoteDocumentsWithLocal(payload.documents, state.documents);
  if (Array.isArray(payload.ideas)) state.ideas = payload.ideas;
  if (Array.isArray(payload.contentPlans)) state.contentPlans = payload.contentPlans;
  if (typeof payload.selectedCourseId === "string") state.selectedCourseId = payload.selectedCourseId;
  if (typeof payload.selectedDocumentId === "string") state.selectedDocumentId = payload.selectedDocumentId;
  if (!state.selectedCourseId && state.courses[0]) state.selectedCourseId = state.courses[0].id;
  if (!state.selectedDocumentId && state.documents[0]) state.selectedDocumentId = state.documents[0].id;
  if (state.page === "documents") {
    const routeDocument = findDocumentByRouteId(documentRouteIdFromPath());
    if (routeDocument) {
      state.selectedDocumentId = routeDocument.id;
      state.documentFocusMode = true;
    }
  }
  localStorage.setItem("ta.tasks", JSON.stringify(state.tasks));
  localStorage.setItem("ta.prompts", JSON.stringify(state.prompts));
  localStorage.setItem("ta.alarms", JSON.stringify(state.alarms));
  localStorage.setItem("ta.courses", JSON.stringify(state.courses));
  localStorage.setItem("ta.notes", JSON.stringify(state.notes));
  localStorage.setItem("ta.documentFolders", JSON.stringify(state.documentFolders));
  localStorage.setItem("ta.documents", JSON.stringify(state.documents));
  localStorage.setItem("ta.ideas", JSON.stringify(state.ideas));
  localStorage.setItem("ta.contentPlans", JSON.stringify(state.contentPlans));
  localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
  localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
  remoteLoading = false;
  return true;
}

async function initSupabase() {
  const config = getSupabaseConfig();
  if (!config) {
    state.authReady = true;
    showToast("Supabase chÆ°a cÃ³ URL há»£p lá»‡, Ä‘ang lÆ°u local");
    return false;
  }
  if (!window.supabase?.createClient) {
    const sdkLoaded = await loadSupabaseSdk();
    if (!sdkLoaded) {
      state.authReady = true;
      showToast("KhÃ´ng táº£i Ä‘Æ°á»£c Supabase, Ä‘ang lÆ°u local");
      return false;
    }
  }
  supabaseClient = window.supabase.createClient(config.url, config.publishableKey);
  const { data } = await supabaseClient.auth.getSession();
  setAuthUser(data?.session?.user || null);
  state.authReady = true;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setAuthUser(session?.user || null);
    remoteReady = false;
    remoteErrorShown = false;
    if (state.authUser) {
      loadRemoteState();
    }
    render();
  });
  return true;
}

async function initWorkspaceApiRemote() {
  const config = getWorkspaceRemoteConfig();
  if (!config) return false;

  try {
    const response = await fetch(config.endpoint, { cache: "no-store" });
    if (response.status === 401) {
      state.authReady = true;
      return false;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Workspace API error");

    workspaceApiRemote = true;
    remoteReady = true;
    remoteErrorShown = false;
    state.authReady = true;
    remoteStateId = payload.data?.user_id || "adplan-session";
    if (payload.data?.payload) applyRemoteState(payload.data.payload);
    return true;
  } catch {
    state.authReady = true;
    showToast("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c Workspace Supabase, Ä‘ang lÆ°u local");
    return false;
  }
}

function setAuthUser(user) {
  state.authUser = user;
  remoteStateId = user?.id || "local-default";
}

async function loadRemoteState() {
  if (!supabaseClient || !state.authUser) return;
  const { data, error } = await supabaseClient
    .from(remoteStateTable)
    .select("payload")
    .eq("id", remoteStateId)
    .maybeSingle();

  if (error) {
    showToast("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c Supabase, Ä‘ang lÆ°u local");
    return;
  }

  remoteReady = true;
  knowledgeDocumentsChanged = false;
  if (data?.payload && applyRemoteState(data.payload)) {
    if (knowledgeDocumentsChanged) saveRemoteState();
    render();
    return;
  }
  saveRemoteState();
}

function scheduleRemoteSave() {
  if (!remoteReady || remoteLoading) return;
  window.clearTimeout(remoteSaveTimer);
  remoteSaveTimer = window.setTimeout(saveRemoteState, 700);
}

async function saveRemoteState() {
  if (workspaceApiRemote) {
    const config = getWorkspaceRemoteConfig();
    if (!config || remoteLoading) return;
    const response = await fetch(config.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: collectRemoteState() }),
    });
    if (!response.ok && !remoteErrorShown) {
      remoteErrorShown = true;
      showToast("KhÃ´ng lÆ°u Ä‘Æ°á»£c Workspace lÃªn Supabase");
    }
    return;
  }

  if (!supabaseClient || remoteLoading || !state.authUser) return;
  const { error } = await supabaseClient.from(remoteStateTable).upsert({
    id: remoteStateId,
    payload: collectRemoteState(),
    updated_at: new Date().toISOString(),
  });
  if (error && !remoteErrorShown) {
    remoteErrorShown = true;
    showToast("KhÃ´ng lÆ°u Ä‘Æ°á»£c lÃªn Supabase");
  }
}

function normalizeCourses(courses) {
  return (courses || []).map((course) => {
    if (course.content !== undefined || course.toc) {
      return {
        ...course,
        level: "course",
        content: course.content || "",
        toc: course.toc || [],
        children: [],
      };
    }
    if (course.children) {
      const chapters = normalizeNodes(course.children).map((node, index) => nodeToChapter(node, index));
      return {
        ...course,
        level: "course",
        content: course.content || chapters.map((chapter) => [chapter.title, chapter.body, chapter.summary, chapter.materials].filter(Boolean).join("\n")).join("\n\n"),
        toc: course.toc || chapters.map((chapter) => ({ id: chapter.id || crypto.randomUUID(), level: "chapter", title: chapter.title || `ChÆ°Æ¡ng ${index + 1}`, parentId: "" })),
        children: [],
      };
    }
    if (course.modules) {
      return {
        id: course.id || crypto.randomUUID(),
        level: "course",
        title: course.title || "KhÃ³a há»c má»›i",
        description: course.description || "",
        image: course.image || "",
        content: (course.modules || []).map((module) => [module.title, module.description, ...(module.lessons || []).map((lesson) => lesson.title)].filter(Boolean).join("\n")).join("\n\n"),
        toc: (course.modules || []).map((module, index) => ({ id: module.id || crypto.randomUUID(), level: "chapter", title: module.title || `ChÆ°Æ¡ng ${index + 1}`, parentId: "" })),
        children: [],
      };
    }
    return {
      id: course.id || crypto.randomUUID(),
      level: "course",
      title: course.title || "KhÃ³a há»c má»›i",
      description: course.description || "",
      image: course.image || "",
      content: course.content || "",
      toc: course.toc || [],
      children: [],
    };
  });
}

function normalizeNodes(nodes) {
  return (nodes || []).map((node) => ({
    id: node.id || crypto.randomUUID(),
    level: node.level || "lesson",
    title: node.title || "Ná»™i dung má»›i",
    description: node.description || "",
    type: node.type || "BÃ i há»c",
    minutes: Number(node.minutes || 0),
    image: node.image || "",
    children: normalizeNodes(node.children || []),
  }));
}

function nodeToChapter(node, index = 0) {
  if (node.level === "chapter") {
    return {
      ...node,
      level: "chapter",
      title: node.title || `ChÆ°Æ¡ng ${index + 1}`,
      body: node.body || flattenChapterBody(node.children || []),
      summary: node.summary || "",
      materials: node.materials || "",
      collapsed: Boolean(node.collapsed),
      children: [],
    };
  }
  return {
    id: node.id || crypto.randomUUID(),
    level: "chapter",
    title: node.title || `ChÆ°Æ¡ng ${index + 1}`,
    description: node.description || "",
    image: node.image || "",
    body: [node.title, node.description, flattenChapterBody(node.children || [])].filter(Boolean).join("\n"),
    summary: "",
    materials: "",
    collapsed: false,
    children: [],
  };
}

function flattenChapterBody(nodes) {
  return (nodes || [])
    .flatMap((node) => [node.title, node.description, flattenChapterBody(node.children || [])])
    .filter(Boolean)
    .join("\n");
}

function writeAll() {
  writeStore("ta.tasks", state.tasks);
  writeStore("ta.prompts", state.prompts);
  writeStore("ta.alarms", state.alarms);
  writeStore("ta.courses", state.courses);
  writeStore("ta.notes", state.notes);
  writeStore("ta.documentFolders", state.documentFolders);
  writeStore("ta.documents", state.documents);
  writeStore("ta.ideas", state.ideas);
  writeStore("ta.contentPlans", state.contentPlans);
}

function icon(name) {
  return `<span class="material-symbols-outlined">${name}</span>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function showToast(message) {
  toast.textContent = repairVietnameseText(message);
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function applyZoom() {
  const value = Math.min(1.35, Math.max(0.9, Number(state.zoom || 1)));
  state.zoom = value;
  document.documentElement.style.setProperty("--ui-scale", value.toFixed(2));
  if (zoomValue) zoomValue.textContent = `${Math.round(value * 100)}%`;
  localStorage.setItem("ta.zoom", String(value));
}

function changeZoom(delta) {
  state.zoom = Math.min(1.35, Math.max(0.9, Number(state.zoom || 1) + delta));
  applyZoom();
}

function copyText(text, label = "ÄÃ£ sao chÃ©p") {
  const value = String(text || "").trim();
  if (!value) return showToast("KhÃ´ng cÃ³ ná»™i dung Ä‘á»ƒ sao chÃ©p");
  const fallbackCopy = () => {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    showToast(ok ? label : "KhÃ´ng sao chÃ©p Ä‘Æ°á»£c, hÃ£y chá»n vÃ  sao chÃ©p thá»§ cÃ´ng");
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(() => showToast(label)).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
}

function shouldDelayDocumentRouteSync() {
  const routeId = documentRouteIdFromPath();
  return Boolean(routeId && !findDocumentByRouteId(routeId) && !remoteReady);
}

function syncDocumentUrl(options = {}) {
  if (state.page !== "documents") return;
  if (!options.force && shouldDelayDocumentRouteSync()) return;
  const active = state.documentFocusMode ? selectedDocument() : null;
  const nextPath = active ? documentRouteFor(active) : routeForPage("documents");
  if (window.location.pathname === nextPath) return;
  const method = options.replace ? "replaceState" : "pushState";
  history[method]({ page: state.page, documentId: active?.id || "" }, "", nextPath);
}

function setPage(page, options = {}) {
  state.page = page;
  state.search = "";
  state.courseFocus = false;
  searchInput.value = "";
  localStorage.setItem("ta.page", page);
  const nextPath = page === "documents" && state.documentFocusMode ? documentRouteFor(selectedDocument()) : routeForPage(page);
  if (options.push !== false && window.location.pathname !== nextPath) {
    history.pushState({ page }, "", nextPath);
  }
  document.body.classList.remove("menu-open");
  render();
}

function matchesSearch(...values) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return values.join(" ").toLowerCase().includes(q);
}

function renderNav() {
  const homePage = pages.find((page) => page.space === "home");
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const activeSpace = currentModuleSpace();
  const navBody = activeSpace ? `
    <button class="home-page-link" type="button" data-page="${homePage?.id || "calendar"}">
      ${icon("arrow_back")}
      Home
    </button>
    <div class="nav-section nav-section-current" data-module-space="${activeSpace.id}">
      <span>${activeSpace.label}</span>
      ${activeSpace.pages.map((pageId) => {
        const page = pageById.get(pageId);
        if (!page) return "";
        return `
          <button class="${page.id === state.page ? "is-active" : ""}" type="button" data-page="${page.id}">
            ${icon(page.icon)}
            ${page.label}
          </button>
        `;
      }).join("")}
    </div>
  ` : `
    <button class="home-page-link ${homePage?.id === state.page ? "is-active" : ""}" type="button" data-page="${homePage?.id || "calendar"}">
      ${icon(homePage?.icon || "home")}
      ${homePage?.label || "Home"}
    </button>
    <div class="nav-section nav-section-gateway">
      <span>KhÃ´ng gian lÃ m viá»‡c</span>
      ${moduleSpaces.map((space) => `
        <button class="nav-space-link" type="button" data-page="${space.pages[0]}">
          ${icon(pageById.get(space.pageId)?.icon || "folder")}
          ${space.label}
        </button>
      `).join("")}
    </div>
  `;
  nav.innerHTML = navBody + (state.authUser ? `
      <button type="button" data-logout>
        ${icon("logout")}
        Logout
      </button>
    ` : "");
}

function render() {
  const authLocked = Boolean(supabaseClient && state.authReady && !state.authUser);
  document.body.classList.toggle("course-focus", state.page === "courses" && state.courseFocus);
  document.body.classList.toggle("document-focus", state.page === "documents" && state.documentFocusMode);
  document.body.classList.toggle("auth-focus", authLocked);
  renderNav();
  repairRenderedVietnameseText(nav);
  if (authLocked) {
    pageTitle.textContent = "ÄÄƒng nháº­p";
    searchInput.placeholder = "ÄÄƒng nháº­p Ä‘á»ƒ má»Ÿ dashboard...";
    app.innerHTML = renderAuth();
    repairRenderedVietnameseText(document.body);
    bindAuthEvents();
    return;
  }
  const page = pages.find((item) => item.id === state.page) || pages[0];
  pageTitle.textContent = repairVietnameseText(page.title);
  searchInput.placeholder = {
    dashboard: "TÃ¬m sá»‘ liá»‡u...",
    notes: "TÃ¬m ghi chÃº...",
    documents: "TÃ¬m tÃ i liá»‡u...",
    ideas: "TÃ¬m idea...",
    content: "TÃ¬m káº¿ hoáº¡ch content...",
    calendar: "TÃ¬m lá»‹ch...",
    clock: "Tim bao thuc...",
    ads: "TÃ¬m trong cÃ´ng cá»¥...",
    tasks: "TÃ¬m cÃ´ng viá»‡c...",
    prompts: "TÃ¬m prompt...",
  }[state.page] || "TÃ¬m kiáº¿m...";
  searchInput.placeholder = repairVietnameseText(searchInput.placeholder);
  app.innerHTML = {
    dashboard: renderDashboard,
    notes: renderNotes,
    documents: renderDocuments,
    ideas: renderIdeas,
    content: renderContentPlan,
    calendar: renderCalendar,
    clock: renderClock,
    ads: renderAds,
    tasks: renderTasks,
    prompts: renderPrompts,
    settings: renderSimplePage,
    support: renderSimplePage,
  }[state.page]?.() || renderDashboard();
  repairRenderedVietnameseText(app);
  const activeDocument = state.page === "documents" && state.documentFocusMode ? selectedDocument() : null;
  if (activeDocument) {
    syncDocumentUrl({ replace: true });
    ensureDocumentEditorSession(activeDocument);
    setDocumentTocClickHandlers();
  } else {
    destroyAllDocumentEditorSessions();
  }
  repairRenderedVietnameseText(document.body);
  bindViewEvents();
}

function renderAuth() {
  return `
    <section class="page auth-page">
      <form class="card pad auth-card" id="authForm">
        <span class="eyebrow">${icon("verified_user")} Báº£n quyá»n The Anh Marketing</span>
        <h1 class="headline">ÄÄƒng nháº­p dashboard</h1>
        <p class="subhead">ÄÄƒng nháº­p hoáº·c táº¡o tÃ i khoáº£n Ä‘á»ƒ lÆ°u Notes, Tasks, Prompts vÃ  Plan Content lÃªn Supabase.</p>
        <input id="authMode" type="hidden" value="login" />
        <div class="field">
          <label for="authEmail">Email</label>
          <input id="authEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
        </div>
        <div class="field">
          <label for="authPassword">Máº­t kháº©u</label>
          <input id="authPassword" type="password" autocomplete="current-password" required minlength="6" placeholder="Tá»‘i thiá»ƒu 6 kÃ½ tá»±" />
        </div>
        <div class="course-form-actions">
          <button class="primary-button" type="submit" data-auth-action="login">${icon("login")} ÄÄƒng nháº­p</button>
          <button class="secondary-button" type="submit" data-auth-action="register">${icon("person_add")} Táº¡o tÃ i khoáº£n</button>
        </div>
        <button class="secondary-button auth-google" type="button" id="googleLogin">${icon("account_circle")} ÄÄƒng nháº­p báº±ng Google</button>
      </form>
    </section>
  `;
}

function bindAuthEvents() {
  const form = document.querySelector("#authForm");
  const modeInput = document.querySelector("#authMode");
  let authAction = "login";
  document.querySelectorAll("[data-auth-action]").forEach((button) => {
    button.addEventListener("click", () => {
      authAction = button.dataset.authAction || "login";
      modeInput.value = authAction;
    });
  });
  document.querySelector("#googleLogin")?.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) showToast(error.message);
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#authEmail").value.trim();
    const password = document.querySelector("#authPassword").value;
    const mode = authAction || modeInput.value;
    const redirectUrl = window.location.origin + window.location.pathname;
    const result = mode === "register"
      ? await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) {
      showToast(result.error.message);
      return;
    }
    if (mode === "register") {
      showToast(result.data?.session ? "ÄÃ£ táº¡o tÃ i khoáº£n vÃ  Ä‘Äƒng nháº­p" : "ÄÃ£ táº¡o tÃ i khoáº£n, hÃ£y kiá»ƒm tra email Ä‘á»ƒ xÃ¡c nháº­n");
      return;
    }
    showToast("ÄÃ£ Ä‘Äƒng nháº­p");
  });
}

function flattenNodes(node) {
  return [node, ...(node.children || []).flatMap(flattenNodes)];
}

function courseStats() {
  const pinnedNotes = state.notes.filter((note) => note.pinned).length;
  return {
    notes: state.notes.length,
    pinnedNotes,
    documents: state.documents.length,
    ideas: state.ideas.length,
    prompts: state.prompts.length,
    tasks: state.tasks.length,
    plans: state.contentPlans.length,
  };
}

function countBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item) || "KhÃ¡c";
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {});
}

function ideaCategory(idea) {
  const text = `${idea.title || ""} ${idea.url || ""} ${idea.note || ""}`.toLowerCase();
  if (/(facebook|fb|meta)/.test(text)) return "Facebook";
  if (/(tiktok|tik tok)/.test(text)) return "TikTok";
  if (/(ads|quáº£ng cÃ¡o|quang cao|campaign)/.test(text)) return "Quáº£ng cÃ¡o";
  if (/(landing|page|website|web)/.test(text)) return "Landing";
  if (/(email|zalo|crm)/.test(text)) return "CRM";
  if (/(content|post|reel|video)/.test(text)) return "Content";
  return "KhÃ¡c";
}

function percent(part, total) {
  return Math.round((part / Math.max(total, 1)) * 100);
}

function ratioRows(groups, total) {
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return `<div class="ratio-empty">ChÆ°a cÃ³ dá»¯ liá»‡u</div>`;
  return entries.map(([label, value]) => {
    const width = percent(value, total);
    return `
      <div class="ratio-row">
        <div class="ratio-row__text">
          <span>${escapeHtml(label)}</span>
          <strong>${value} · ${width}%</strong>
        </div>
        <div class="ratio-track"><i style="width:${width}%"></i></div>
      </div>
    `;
  }).join("");
}

function reportCard(iconName, title, total, groups, actionPage) {
  return `
    <article class="card pad report-card">
      <div class="report-card__head">
        <div>
          <span>${icon(iconName)}</span>
          <h3>${title}</h3>
        </div>
        <button class="icon-button" type="button" data-page="${actionPage}" aria-label="Má»Ÿ ${title}">${icon("open_in_new")}</button>
      </div>
      <strong class="report-total">${total}</strong>
      <p class="muted">Tá»•ng sá»‘ má»¥c Ä‘ang lÆ°u</p>
      <div class="ratio-list">${ratioRows(groups, total)}</div>
    </article>
  `;
}

function renderDashboard() {
  const done = state.tasks.filter((task) => task.done).length;
  const completion = Math.round((done / Math.max(state.tasks.length, 1)) * 100);
  const stats = courseStats();
  const noteGroups = countBy(state.notes, (note) => note.pinned ? "Äang ghim" : `MÃ u ${note.color || "white"}`);
  const documentGroups = countBy(state.documents, (documentItem) => documentItem.type || "Doc");
  const ideaGroups = countBy(state.ideas, ideaCategory);
  const promptGroups = countBy(state.prompts, (prompt) => prompt.category || "KhÃ¡c");
  const taskGroups = {
    "ÄÃ£ xong": done,
    "ChÆ°a xong": Math.max(state.tasks.length - done, 0),
    ...countBy(state.tasks, (task) => task.status || "today"),
  };
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("bolt")} Live Updates</span>
          <h1 class="headline">Dashboard <span class="highlight">Tá»•ng Quan</span></h1>
          <p class="subhead">BÃ¡o cÃ¡o sá»‘ lÆ°á»£ng vÃ  tá»· lá»‡ phÃ¢n nhÃ³m cá»§a Notes, TÃ i liá»‡u, Idea, Prompt vÃ  Task trong má»™t dashboard.</p>
        </div>
        <button class="primary-button" type="button" data-page="notes">${icon("add")} ThÃªm ghi chÃº</button>
      </div>
      <div class="grid metrics">
        ${metric("sticky_note_2", "Ghi chÃº", stats.notes, `${stats.pinnedNotes} ghim`, "pill")}
        ${metric("folder_copy", "TÃ i liá»‡u", stats.documents, `${Object.keys(documentGroups).length} loáº¡i`, "pill")}
        ${metric("lightbulb", "Idea", stats.ideas, `${Object.keys(ideaGroups).length} nhÃ³m`, "pill")}
        ${metric("terminal", "Prompt AI", stats.prompts, `${state.prompts.filter((item) => item.favorite).length} favorite`, "pill")}
        ${metric("speed", "HoÃ n thÃ nh cÃ´ng viá»‡c", `${completion}%`, `${done}/${state.tasks.length}`, "pill")}
      </div>
      <div class="dashboard-reports">
        ${reportCard("sticky_note_2", "Notes", stats.notes, noteGroups, "notes")}
        ${reportCard("folder_copy", "TÃ i liá»‡u", stats.documents, documentGroups, "documents")}
        ${reportCard("lightbulb", "Idea", stats.ideas, ideaGroups, "ideas")}
        ${reportCard("terminal", "Prompt", stats.prompts, promptGroups, "prompts")}
        ${reportCard("checklist", "Task", stats.tasks, taskGroups, "tasks")}
      </div>
    </section>
  `;
}

function metric(iconName, label, value, trend, trendClass) {
  return `<article class="card metric"><div class="metric__top">${icon(iconName)}<span class="${trendClass}">${trend}</span></div><p>${label}</p><strong>${value}</strong></article>`;
}

function activity(iconName, title, body) {
  return `<div class="list-item">${icon(iconName)}<div><h4>${title}</h4><p>${body}</p></div></div>`;
}

function selectedCourse() {
  return state.courses.find((course) => course.id === state.selectedCourseId) || state.courses[0] || null;
}

function selectedDocument() {
  return state.documents.find((documentItem) => documentItem.id === state.selectedDocumentId) || state.documents[0] || null;
}

function deleteDocumentById(documentId) {
  if (!documentId) return false;
  const exists = state.documents.some((item) => item.id === documentId);
  if (!exists) return false;
  destroyDocumentEditorSession(documentId);
  state.documents = state.documents.filter((item) => item.id !== documentId);
  state.selectedDocumentId = state.documents[0]?.id || "";
  state.documentPanelOpen = false;
  state.documentFocusMode = false;
  localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
  localStorage.setItem("ta.documentFocusMode", "false");
  writeStore("ta.documents", state.documents);
  syncDocumentUrl({ replace: true });
  showToast("ÄÃ£ xÃ³a tÃ i liá»‡u");
  render();
  return true;
}

function renderNotes() {
  const filtered = [...state.notes]
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .filter((note) => matchesSearch(note.title, note.body));
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("sticky_note_2")} Sticky Notes</span>
          <h1 class="headline">Ghi chÃº</h1>
          <p class="subhead">Ghi nhanh Ã½ tÆ°á»Ÿng, checklist vÃ  viá»‡c cáº§n nhá»› theo kiá»ƒu sticky notes.</p>
        </div>
        <button class="primary-button" id="newNoteButton" type="button">${icon("add")} ThÃªm ghi chÃº</button>
      </div>
      <div class="notes-board">
        ${filtered.length ? filtered.map(noteCard).join("") : `<div class="empty">ChÆ°a cÃ³ ghi chÃº phÃ¹ há»£p.</div>`}
      </div>
    </section>
  `;
}

function noteCard(note) {
  return `
    <article class="sticky-note note-${note.color || "yellow"} ${note.pinned ? "is-pinned" : ""}">
      <div class="note-toolbar">
        <button class="icon-button" type="button" data-pin-note="${note.id}" aria-label="Ghim">${icon(note.pinned ? "push_pin" : "keep")}</button>
        <select data-note-color="${note.id}" aria-label="MÃ u ghi chÃº">
          ${["yellow", "blue", "green", "pink", "white"].map((color) => `<option value="${color}" ${color === note.color ? "selected" : ""}>${color}</option>`).join("")}
        </select>
        <button class="icon-button danger-button" type="button" data-delete-note="${note.id}" aria-label="XÃ³a ghi chÃº">${icon("delete")}</button>
      </div>
      <input class="note-title-input" data-note-title="${note.id}" value="${escapeUiText(note.title)}" placeholder="TiÃªu Ä‘á» ghi chÃº" />
      <textarea class="note-body-input" data-note-body="${note.id}" placeholder="Viáº¿t ghi chÃº...">${escapeUiText(note.body)}</textarea>
    </article>
  `;
}

function documentTypeOptions(activeType = "Doc") {
  const active = repairVietnameseText(activeType);
  return ["Doc", "Sheet", "PDF", "Link", "Giáo trình"].map((type) => `<option value="${escapeUiText(type)}" ${type === active ? "selected" : ""}>${escapeUiText(type)}</option>`).join("");
}

function documentColorOptions(activeColor = "blue") {
  return ["blue", "green", "pink", "yellow", "white"].map((color) => `<option value="${color}" ${color === activeColor ? "selected" : ""}>${color}</option>`).join("");
}

function documentFolderName(documentItem) {
  return repairVietnameseText(documentItem.folder || (repairVietnameseText(documentItem.type) === "Giáo trình" ? "Khóa học" : "Tài liệu chung"));
}

function documentFolders() {
  return [...new Set([...(state.documentFolders || []).map(repairVietnameseText), ...state.documents.map(documentFolderName)])].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
}

function documentFolderOptions(activeFolder = "Tài liệu chung") {
  const active = repairVietnameseText(activeFolder);
  return documentFolders().map((folder) => `<option value="${escapeUiText(folder)}" ${folder === active ? "selected" : ""}>${escapeUiText(folder)}</option>`).join("");
}

function renderDocumentFolderBar() {
  const folders = documentFolders();
  return `
    <div class="document-folder-bar">
      <button class="${state.documentFolderFilter === "all" ? "is-active" : ""}" type="button" data-document-folder="all">${icon("dashboard")} T\u1ea5t c\u1ea3</button>
      ${folders.map((folder) => `
        <button class="${repairVietnameseText(state.documentFolderFilter) === folder ? "is-active" : ""}" type="button" data-document-folder="${escapeUiText(folder)}">${icon("folder")} ${escapeUiText(folder)}</button>
      `).join("")}
      <button type="button" id="newDocumentFolderButton">${icon("create_new_folder")} Th\u01b0 m\u1ee5c</button>
    </div>
    ${state.documentFolderFormOpen ? `
      <form class="document-folder-form" id="documentFolderForm">
        <input id="documentFolderName" type="text" placeholder="T\u00ean th\u01b0 m\u1ee5c, v\u00ed d\u1ee5: Kh\u00f3a h\u1ecdc" required />
        <button class="primary-button" type="submit">${icon("check")} T\u1ea1o</button>
        <button class="secondary-button" type="button" id="cancelDocumentFolder">${icon("close")} H\u1ee7y</button>
      </form>
    ` : ""}
  `;
}

function nodeTextForSearch(node) {
  if (!node) return "";
  if (node.type === "text") return String(node.text || "");
  if (!Array.isArray(node.content)) return "";
  return node.content.map((child) => nodeTextForSearch(child)).join("");
}

function collectDocumentHeadings(documentItem = null) {
  if (!documentItem) return [];
  const doc = normalizeDocumentModel(documentItem.contentJson || parseLegacyDocumentContent(documentItem.legacyContent || documentItem.content || ""));
  const headings = [];
  const seen = new Set();
  const pushTocItem = (node, fallbackLevel = 1, force = false) => {
    const title = nodeTextForSearch(node).trim();
    if (!title) return;
    const semanticLevel = documentTocSemanticLevel(title, fallbackLevel);
    const normalizedTitle = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const isLessonParagraph = node.type === "paragraph" && semanticLevel === 3 && /^bai\s+\d+(?:\.\d+)*/.test(normalizedTitle);
    if (!force && node.type !== "heading" && !isLessonParagraph) return;
    const headingId = sanitizeDocumentText(node.attrs?.headingId || normalizeHeadingId(title));
    const key = `${headingId}:${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    node.attrs = node.attrs || {};
    node.attrs.headingId = headingId;
    headings.push({ id: headingId, level: `h${semanticLevel}`, title });
  };
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "heading") {
      pushTocItem(node, Number(node.attrs?.level) || 1, true);
    } else if (node.type === "paragraph") {
      pushTocItem(node, 3, false);
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  (doc.content || []).forEach(walk);
  if (!headings.length) {
    const title = sanitizeDocumentText(documentItem.title || "Ná»™i dung");
    headings.push({ id: normalizeHeadingId(title || "document"), level: "h1", title: title || "Ná»™i dung" });
  }
  return headings;
}

function renderDocumentContentHtml(documentItem) {
  if (!documentItem) return "";
  return serializeDocumentToHtml(documentItem.contentJson || parseLegacyDocumentContent(documentItem.legacyContent || documentItem.content || ""));
}

function documentStableId(documentItem = {}) {
  const raw = sanitizeDocumentText(documentItem.id || "").trim() || crypto.randomUUID();
  return raw.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
}

function documentDisplayId(documentItem = {}) {
  return `DOC-${documentStableId(documentItem).toUpperCase()}`;
}

function documentFileSlug(documentItem = {}) {
  const title = repairVietnameseText(documentItem.title || "tai-lieu")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-+/g, "-");
  return `${title || "tai-lieu"}-${documentDisplayId(documentItem).toLowerCase()}`;
}

function syncDocumentEditorBeforeExport(documentItem) {
  const session = findActiveDocumentSession(documentItem?.id);
  if (session?.editor?.getJSON) {
    updateDocumentSessionDocumentJson(documentItem.id, session.editor.getJSON());
    writeStore("ta.documents", state.documents);
  }
  return state.documents.find((item) => item.id === documentItem?.id) || documentItem;
}

function documentExportHtml(documentItem = {}) {
  const safeDocument = syncDocumentEditorBeforeExport(documentItem);
  const title = repairVietnameseText(safeDocument.title || "Tài liệu");
  const summary = repairVietnameseText(safeDocument.summary || "");
  const docId = documentDisplayId(safeDocument);
  const html = renderDocumentContentHtml(safeDocument);
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(docId)}</title>
  <style>
    body { margin: 0; padding: 32px; color: #111827; font-family: Arial, "Segoe UI", sans-serif; line-height: 1.65; }
    h1, h2, h3 { color: #0f172a; line-height: 1.2; }
    .document-export-meta { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #dbe7fb; color: #475569; font-size: 13px; }
    .document-export-id { display: inline-block; margin-bottom: 8px; padding: 4px 8px; border: 1px solid #bfdbfe; border-radius: 999px; color: #004cca; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
    img { max-width: 100%; height: auto; }
    .document-flow-diagram { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; overflow: hidden; }
    .document-flow-diagram__toolbar, .document-flow-diagram__canvas-resize, .document-flow-diagram__connector, .document-flow-diagram__resize, .document-flow-diagram__swatches, .document-flow-diagram__edge-tools { display: none !important; }
  </style>
</head>
<body>
  <main>
    <p class="document-export-id">${escapeHtml(docId)}</p>
    <h1>${escapeHtml(title)}</h1>
    <div class="document-export-meta">
      <div>ID gốc: ${escapeHtml(documentStableId(safeDocument))}</div>
      <div>Loại: ${escapeUiText(safeDocument.type || "Doc")} · Thư mục: ${escapeUiText(documentFolderName(safeDocument))}</div>
      ${summary ? `<p>${escapeUiText(summary)}</p>` : ""}
    </div>
    ${html || "<p></p>"}
  </main>
</body>
</html>`;
}

function downloadDocumentFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportDocumentAsDoc(documentItem) {
  const safeDocument = syncDocumentEditorBeforeExport(documentItem);
  downloadDocumentFile(`${documentFileSlug(safeDocument)}.doc`, documentExportHtml(safeDocument), "application/msword;charset=utf-8");
  showToast("Đã tải DOC");
}

function exportDocumentAsPdf(documentItem) {
  const safeDocument = syncDocumentEditorBeforeExport(documentItem);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!printWindow) return showToast("Trình duyệt đang chặn cửa sổ PDF");
  printWindow.document.open();
  printWindow.document.write(documentExportHtml(safeDocument));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 350);
  showToast("Chọn Lưu thành PDF trong hộp thoại in");
}

function documentTocItems(content = "") {
  if (!content) return [];
  if (content?.id && (content.contentJson || content.content || content.legacyContent)) return collectDocumentHeadings(content);
  if (content.type === "doc") return collectDocumentHeadings({ contentJson: content });
  return [];
}

function renderDocumentToc(active) {
  if (state.documentTocHidden) return "";
  return `
    <aside class="document-toc${state.documentTocCollapsed ? " is-collapsed" : ""}">
      ${renderDocumentTocInner(active)}
    </aside>
  `;
}

function renderDocumentFocus(active) {
  return `
    <section class="document-focus-page">
      <header class="document-focus-header">
        <button class="secondary-button" type="button" data-exit-document-focus>${icon("arrow_back")} Quay láº¡i kho</button>
        <div>
          <span class="eyebrow">${icon("folder_copy")} ${escapeUiText(active.type || "Doc")}</span>
          <h1>${escapeUiText(active.title || "T\u00e0i li\u1ec7u ch\u01b0a \u0111\u1eb7t t\u00ean")}</h1>
        </div>
        <div class="document-focus-actions">
          <button class="icon-button" type="button" data-document-toolbar-visibility aria-label="${state.documentToolbarHidden ? "Hi\u1ec7n thanh c\u00f4ng c\u1ee5" : "\u1ea8n thanh c\u00f4ng c\u1ee5"}" title="${state.documentToolbarHidden ? "Hi\u1ec7n thanh c\u00f4ng c\u1ee5" : "\u1ea8n thanh c\u00f4ng c\u1ee5"}">${icon(state.documentToolbarHidden ? "keyboard" : "keyboard_hide")}</button>
          <button class="icon-button" type="button" data-document-toc-visibility aria-label="${state.documentTocHidden ? "Hi\u1ec7n m\u1ee5c l\u1ee5c" : "\u1ea8n m\u1ee5c l\u1ee5c"}" title="${state.documentTocHidden ? "Hi\u1ec7n m\u1ee5c l\u1ee5c" : "\u1ea8n m\u1ee5c l\u1ee5c"}">${icon(state.documentTocHidden ? "view_sidebar" : "hide_source")}</button>
          <button class="icon-button document-id-copy" type="button" data-copy-document-id="${active.id}" aria-label="Sao ch\u00e9p ID t\u00e0i li\u1ec7u" title="Sao ch\u00e9p ID t\u00e0i li\u1ec7u">${icon("tag")}</button>
          <button class="icon-button" type="button" data-export-document-pdf="${active.id}" aria-label="T\u1ea3i PDF" title="T\u1ea3i PDF">${icon("picture_as_pdf")}</button>
          <button class="icon-button" type="button" data-export-document-doc="${active.id}" aria-label="T\u1ea3i DOC" title="T\u1ea3i DOC">${icon("description")}</button>
          <button class="icon-button danger-button" type="button" data-delete-document="${active.id}" aria-label="X\u00f3a t\u00e0i li\u1ec7u" title="X\u00f3a t\u00e0i li\u1ec7u">${icon("delete")}</button>
        </div>
      </header>
      <div class="document-id-strip">
        <span>${icon("fingerprint")} ID: ${escapeUiText(documentDisplayId(active))}</span>
        <code>URL: ${escapeHtml(documentRouteFor(active))}</code>
      </div>
      <div class="document-focus-meta">
        <input class="doc-title-input" data-document-title="${active.id}" value="${escapeUiText(active.title)}" placeholder="T\u00ean t\u00e0i li\u1ec7u" />
        <textarea class="doc-desc-input compact-desc" data-document-summary="${active.id}" placeholder="M\u00f4 t\u1ea3 ng\u1eafn...">${escapeUiText(active.summary || "")}</textarea>
        <input class="document-source-input" data-document-source="${active.id}" value="${escapeHtml(active.sourceUrl || "")}" placeholder="D\u00e1n link Doc, Sheet, PDF ho\u1eb7c ngu\u1ed3n tham kh\u1ea3o..." />
        <select data-document-type="${active.id}" aria-label="Lo\u1ea1i t\u00e0i li\u1ec7u">${documentTypeOptions(active.type)}</select>
        <select data-document-color="${active.id}" aria-label="M\u00e0u t\u00e0i li\u1ec7u">${documentColorOptions(active.color)}</select>
        <select data-document-folder-field="${active.id}" aria-label="Th\u01b0 m\u1ee5c t\u00e0i li\u1ec7u">${documentFolderOptions(documentFolderName(active))}</select>
      </div>
      <div class="document-focus-layout${state.documentTocHidden ? " is-toc-hidden" : ""}">
        ${renderDocumentToc(active)}
        <article class="document-focus-sheet">
          ${documentEditorToolbar()}
          <div class="document-free-editor document-focus-editor" data-document-editor="${active.id}" spellcheck="false"></div>
          <input type="file" accept="image/*" class="document-image-upload-input" data-document-image-upload="${active.id}" id="documentImageUpload-${active.id}" hidden />
          <div class="document-editor-slash-menu" id="documentSlashMenu-${active.id}" role="menu" aria-label="Slash menu" hidden></div>
          <div class="document-editor-bubble-menu" id="documentBubbleMenu-${active.id}" role="menu" aria-label="Bubble menu" hidden></div>
          <div class="document-editor-context-menu" id="documentContextMenu-${active.id}" role="menu" aria-label="Context menu" hidden></div>
          <div class="document-editor-table-menu" id="documentTableMenu-${active.id}" role="toolbar" aria-label="Table menu" hidden></div>
        </article>
      </div>
    </section>
  `;
}

function documentEditorToolbar() {
  if (state.documentToolbarHidden) return "";
  return `
    <div class="document-editor-toolbar">
      <button class="icon-button" type="button" data-document-command="bold" aria-label="In \u0111\u1eadm" title="In \u0111\u1eadm">${icon("format_bold")}</button>
      <button class="icon-button" type="button" data-document-command="italic" aria-label="In nghi\u00eang" title="In nghi\u00eang">${icon("format_italic")}</button>
      <button class="icon-button" type="button" data-document-command="underline" aria-label="G\u1ea1ch ch\u00e2n" title="G\u1ea1ch ch\u00e2n">${icon("format_underlined")}</button>
      <button class="icon-button" type="button" data-document-command="strike" aria-label="G\u1ea1ch ngang" title="G\u1ea1ch ngang">${icon("strikethrough_s")}</button>
      <button class="icon-button" type="button" data-document-command="bulletList" aria-label="Danh s\u00e1ch ch\u1ea5m" title="Danh s\u00e1ch ch\u1ea5m">${icon("format_list_bulleted")}</button>
      <button class="icon-button" type="button" data-document-command="orderedList" aria-label="Danh s\u00e1ch s\u1ed1" title="Danh s\u00e1ch s\u1ed1">${icon("format_list_numbered")}</button>
      <button class="icon-button" type="button" data-document-command="taskList" aria-label="Checklist" title="Checklist">${icon("checklist")}</button>
      <button class="icon-button" type="button" data-document-command="heading2" aria-label="Ti\u00eau \u0111\u1ec1" title="Ti\u00eau \u0111\u1ec1">${icon("title")}</button>
      <button class="icon-button" type="button" data-document-command="blockquote" aria-label="Tr\u00edch d\u1eabn" title="Tr\u00edch d\u1eabn">${icon("format_quote")}</button>
      <button class="icon-button" type="button" data-document-command="textColor" aria-label="M\u00e0u ch\u1eef" title="M\u00e0u ch\u1eef">${icon("format_color_text")}</button>
      <button class="icon-button" type="button" data-document-command="textHighlight" aria-label="N\u1ec1n n\u1ed5i b\u1eadt" title="N\u1ec1n n\u1ed5i b\u1eadt">${icon("highlight")}</button>
      <button class="icon-button" type="button" data-document-command="alignLeft" aria-label="Canh tr\u00e1i" title="Canh tr\u00e1i">${icon("format_align_left")}</button>
      <button class="icon-button" type="button" data-document-command="alignCenter" aria-label="Canh gi\u1eefa" title="Canh gi\u1eefa">${icon("format_align_center")}</button>
      <button class="icon-button" type="button" data-document-command="promoteBlockLevel" aria-label="L\u00ean m\u1ed9t c\u1ea5p" title="Shift+Tab: l\u00ean m\u1ed9t c\u1ea5p">${icon("format_indent_decrease")}</button>
      <button class="icon-button" type="button" data-document-command="demoteBlockLevel" aria-label="Xu\u1ed1ng m\u1ed9t c\u1ea5p" title="Tab: xu\u1ed1ng m\u1ed9t c\u1ea5p">${icon("format_indent_increase")}</button>
      <button class="icon-button" type="button" data-document-command="alignRight" aria-label="Canh ph\u1ea3i" title="Canh ph\u1ea3i">${icon("format_align_right")}</button>
      <button class="icon-button" type="button" data-document-command="removeEmptyRows" aria-label="X\u00f3a h\u00e0ng tr\u1ed1ng" title="X\u00f3a h\u00e0ng tr\u1ed1ng">${icon("playlist_remove")}</button>
      <button class="icon-button" type="button" data-document-command="clearFormatting" aria-label="X\u00f3a \u0111\u1ecbnh d\u1ea1ng" title="X\u00f3a \u0111\u1ecbnh d\u1ea1ng">${icon("format_clear")}</button>
      <button class="icon-button" type="button" data-document-command="link" aria-label="Th\u00eam link" title="Th\u00eam link">${icon("add_link")}</button>
      <button class="icon-button" type="button" data-document-command="insertImage" aria-label="Nh\u1eadp URL \u1ea3nh" title="Nh\u1eadp URL \u1ea3nh">${icon("image")}</button>
      <button class="icon-button" type="button" data-document-command="uploadImage" aria-label="T\u1ea3i \u1ea3nh l\u00ean" title="T\u1ea3i \u1ea3nh l\u00ean">${icon("image")}</button>
      <button class="icon-button" type="button" data-document-command="stickyNote" aria-label="D\u00e1n note" title="D\u00e1n note">${icon("sticky_note_2")}</button>
      <button class="icon-button" type="button" data-document-command="flowDiagram" aria-label="S\u01a1 \u0111\u1ed3" title="S\u01a1 \u0111\u1ed3">${icon("hub")}</button>
      <span class="document-table-picker">
        <button class="icon-button" type="button" data-document-command="table" data-document-table-toggle aria-label="T\u1ea1o b\u1ea3ng" title="T\u1ea1o b\u1ea3ng - nh\u1ea5p \u0111\u00f4i t\u1ea1o nhanh 4x4">${icon("table")}</button>
        <span class="document-table-picker__grid" role="menu" aria-label="Ch\u1ecdn k\u00edch th\u01b0\u1edbc b\u1ea3ng">
          <label>H\u00e0ng <input type="number" min="1" max="30" value="4" data-document-table-rows inputmode="numeric" /></label>
          <label>C\u1ed9t <input type="number" min="1" max="20" value="4" data-document-table-cols inputmode="numeric" /></label>
          <button class="secondary-button" type="button" data-document-table-create>T\u1ea1o b\u1ea3ng</button>
          <button class="ghost-action" type="button" data-document-table-size="4x4">4 x 4</button>
        </span>
      </span>
    </div>
  `;
}

function renderDocuments() {
  const active = state.documentFocusMode ? selectedDocument() : null;
  if (active && state.documentFocusMode) return renderDocumentFocus(active);
  const filtered = state.documents.filter((documentItem) => {
    const folderOk = state.documentFolderFilter === "all" || documentFolderName(documentItem) === repairVietnameseText(state.documentFolderFilter);
    return folderOk && matchesSearch(documentItem.title, documentItem.type, documentItem.summary, documentItem.content, documentItem.sourceUrl, documentFolderName(documentItem));
  });
  return `
    <section class="page documents-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("folder_copy")} T\u00e0i li\u1ec7u</span>
          <h1 class="headline">Kho tÃ i liá»‡u</h1>
          <p class="subhead">LÆ°u giÃ¡o trÃ¬nh, doc, sheet, PDF, link vÃ  ná»™i dung AI xuáº¥t sang app Ä‘á»ƒ báº¥m vÃ o lÃ  Ä‘á»c ngay.</p>
        </div>
        <button class="primary-button" id="newDocumentButton" type="button">${icon("add")} ThÃªm tÃ i liá»‡u</button>
      </div>
      ${renderDocumentFolderBar()}
      <div class="document-board">
        ${filtered.length ? filtered.map((documentItem) => `
          <article class="document-module document-color-${documentItem.color || "blue"}" data-open-document="${documentItem.id}">
            <div class="document-module__top">
              <span>${escapeHtml(documentItem.type || "Doc")}</span>
              <small>${escapeHtml(documentFolderName(documentItem))}</small>
            </div>
            <strong>${escapeUiText(documentItem.title || "T\u00e0i li\u1ec7u ch\u01b0a \u0111\u1eb7t t\u00ean")}</strong>
            <p>${escapeUiText(documentItem.summary || documentItem.sourceUrl || "B\u1ea5m \u0111\u1ec3 m\u1edf t\u00e0i li\u1ec7u to\u00e0n trang")}</p>
          </article>
        `).join("") : `<div class="empty compact-empty">ChÆ°a cÃ³ tÃ i liá»‡u phÃ¹ há»£p.</div>`}
      </div>
    </section>
  `;
}

function renderIdeas() {
  const filtered = state.ideas.filter((idea) => matchesSearch(idea.title, idea.url, idea.note));
  return `
    <section class="page ideas-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("lightbulb")} Idea</span>
          <h1 class="headline">Kho idea vÃ  link</h1>
          <p class="subhead">LÆ°u tiÃªu Ä‘á», link vÃ  thumbnail tá»± láº¥y tá»« website Ä‘á»ƒ gom tÆ° liá»‡u tham kháº£o cho content, offer vÃ  funnel.</p>
        </div>
        <button class="primary-button" id="newIdeaButton" type="button">${icon(state.ideaFormOpen ? "close" : "add")} ${state.ideaFormOpen ? "ÄÃ³ng" : "ThÃªm idea"}</button>
      </div>
      ${state.ideaFormOpen ? `<form class="idea-form card pad" id="ideaForm">
        <div class="field">
          <label for="ideaTitle">TiÃªu Ä‘á»</label>
          <input id="ideaTitle" type="text" placeholder="VD: Máº«u landing page khÃ³a há»c AI" required />
        </div>
        <div class="field">
          <label for="ideaUrl">Link</label>
          <input id="ideaUrl" type="url" placeholder="https://..." required />
        </div>
        <div class="field">
          <label for="ideaNote">Ghi chÃº</label>
          <textarea id="ideaNote" placeholder="Ghi angle, insight, lÃ½ do cáº§n lÆ°u..."></textarea>
        </div>
        <button class="primary-button" type="submit">${icon("add")} LÆ°u idea</button>
      </form>` : ""}
      <div class="idea-grid">
        ${filtered.length ? filtered.map((idea) => `
          <article class="idea-card">
            <div class="idea-card-actions">
              <button class="icon-button" type="button" data-copy-idea="${idea.id}" aria-label="Sao chÃ©p link">${icon("content_copy")}</button>
              <button class="icon-button danger-button" type="button" data-delete-idea="${idea.id}" aria-label="XÃ³a idea">${icon("delete")}</button>
            </div>
            <div class="idea-thumbnail">
              ${ideaThumbnailUrl(idea) ? `<img src="${escapeHtml(ideaThumbnailUrl(idea))}" alt="" loading="lazy" />` : icon("link")}
            </div>
            <div class="idea-content">
              <h3>${escapeHtml(idea.title)}</h3>
              <a href="${escapeHtml(idea.url)}" target="_blank" rel="noreferrer">${escapeHtml(idea.url)}</a>
              <p>${escapeHtml(idea.note || "ChÆ°a cÃ³ ghi chÃº.")}</p>
            </div>
          </article>
        `).join("") : `<div class="empty">ChÆ°a cÃ³ idea phÃ¹ há»£p.</div>`}
      </div>
    </section>
  `;
}

function ideaThumbnailUrl(idea) {
  if (idea?.thumbnail) return idea.thumbnail;
  try {
    const hostname = new URL(idea.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return "";
  }
}

function renderCourses() {
  const course = selectedCourse();
  const filteredCourses = state.courses.filter((item) => matchesSearch(item.title, item.description, item.content, ...(item.toc || []).map((toc) => toc.title)));
  if (state.courseDraftMode === "create") return renderCourseCreateDetail();
  if (state.courseDraftMode === "read" && course) return renderCourseRead(course);
  if (state.courseDraftMode === "edit" && course) return renderCourseDetail(course);
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("school")} Courses</span>
          <h1 class="headline">KhÃ³a há»c</h1>
        </div>
        <button class="primary-button" id="newCourseButton" type="button">${icon("add")} Táº¡o khÃ³a há»c</button>
      </div>
      <div class="grid three-col">
        ${filteredCourses.map((item) => `
          <article class="card pad prompt-card course-card">
            <div class="row-between">
              <span class="tag">${(item.toc || []).length} má»¥c lá»¥c</span>
              <button class="icon-button danger-button" type="button" data-delete-course="${item.id}" aria-label="XÃ³a khÃ³a">${icon("delete")}</button>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || "ChÆ°a cÃ³ mÃ´ táº£.")}</p>
            <button class="primary-button" type="button" data-open-course="${item.id}">${icon("edit")} Má»Ÿ khÃ³a há»c</button>
          </article>
        `).join("") || `
          <article class="card pad prompt-card course-card">
            <h3>ChÆ°a cÃ³ khÃ³a há»c</h3>
            <p>Báº¥m nÃºt táº¡o khÃ³a há»c Ä‘á»ƒ báº¯t Ä‘áº§u.</p>
            <button class="primary-button" id="bigNewCourse" type="button">${icon("add")} Táº¡o khÃ³a há»c</button>
          </article>
        `}
      </div>
    </section>
  `;
}

function courseIndex(courseId) {
  return state.courses.findIndex((course) => course.id === courseId);
}

function courseNav(course) {
  const index = courseIndex(course.id);
  const prev = state.courses[index - 1];
  const next = state.courses[index + 1];
  return `
    <div class="course-nav-bar">
      <button class="secondary-button" type="button" data-course-list>${icon("arrow_back")} Danh sÃ¡ch khÃ³a há»c</button>
      <div class="course-nav-actions">
        ${course.id ? `<button class="secondary-button" type="button" data-toggle-course-read="${course.id}">${icon(state.courseDraftMode === "read" ? "edit" : "menu_book")} ${state.courseDraftMode === "read" ? "Sá»­a khÃ³a há»c" : "Xem khÃ³a há»c"}</button>` : ""}
        <button class="icon-button" type="button" data-nav-course="${prev?.id || ""}" ${prev ? "" : "disabled"} aria-label="KhÃ³a trÆ°á»›c">${icon("chevron_left")}</button>
        <button class="icon-button" type="button" data-nav-course="${next?.id || ""}" ${next ? "" : "disabled"} aria-label="KhÃ³a sau">${icon("chevron_right")}</button>
      </div>
    </div>
  `;
}

function renderCourseRead(course) {
  const chapters = (course.toc || []).filter((item) => item.level === "chapter");
  return `
    <section class="page course-reader-page">
      ${courseNav(course)}
      <article class="course-reader">
        <header class="course-reader-cover">
          <span class="eyebrow">${icon("menu_book")} Cháº¿ Ä‘á»™ Ä‘á»c</span>
          <h1>${escapeHtml(course.title)}</h1>
          <p>${escapeHtml(course.description || "ChÆ°a cÃ³ mÃ´ táº£ khÃ³a há»c.")}</p>
        </header>
        ${chapters.length ? `
          <nav class="reader-chapters">
            ${chapters.map((chapter, index) => `<a href="#chapter-${chapter.id}">${index + 1}. ${escapeHtml(chapter.title)}</a>`).join("")}
          </nav>
        ` : ""}
        <div class="reader-content">
          ${chapters.length ? chapters.map((chapter, index) => `
            <section class="reader-chapter" id="chapter-${chapter.id}">
              <span>ChÆ°Æ¡ng ${index + 1}</span>
              <h2>${escapeHtml(chapter.title)}</h2>
            </section>
          `).join("") : ""}
          <div class="reader-body">${course.content || `<p>ChÆ°a cÃ³ ná»™i dung khÃ³a há»c.</p>`}</div>
        </div>
      </article>
    </section>
  `;
}

function editorToolbar() {
  return `
    <div class="course-editor-toolbar">
      <button class="icon-button" type="button" data-format="bold" aria-label="In Ä‘áº­m">${icon("format_bold")}</button>
      <button class="icon-button" type="button" data-format="italic" aria-label="In nghiÃªng">${icon("format_italic")}</button>
      <button class="icon-button" type="button" data-format="underline" aria-label="Gáº¡ch chÃ¢n">${icon("format_underlined")}</button>
      <button class="icon-button" type="button" data-format="insertUnorderedList" aria-label="Danh sÃ¡ch">${icon("format_list_bulleted")}</button>
      <button class="icon-button" type="button" data-insert-image aria-label="ThÃªm áº£nh">${icon("image")}</button>
    </div>
  `;
}

function renderCourseCreateDetail() {
  return `
    <section class="page">
      ${courseNav({ id: "" })}
      <form class="course-create-basic card pad" id="courseCreateForm">
        <h2>Táº¡o khÃ³a há»c</h2>
        <div class="field">
          <label for="newCourseTitle">TÃªn khÃ³a</label>
          <input id="newCourseTitle" type="text" placeholder="VD: AI Marketing Mastery" autofocus />
        </div>
        <div class="field">
          <label for="newCourseDescription">MÃ´ táº£</label>
          <textarea id="newCourseDescription" placeholder="Má»¥c tiÃªu, Ä‘á»‘i tÆ°á»£ng há»c, káº¿t quáº£ Ä‘áº§u ra..."></textarea>
        </div>
        <div class="field">
          <label for="newCourseImage">HÃ¬nh minh há»a URL</label>
          <input id="newCourseImage" type="text" placeholder="https://..." />
        </div>
        <button class="primary-button" type="submit">${icon("save")} Táº¡o khÃ³a há»c</button>
      </form>
    </section>
  `;
}

function renderCourseDetail(course) {
  return `
    <section class="page course-editor-page">
      ${courseNav(course)}
      <div class="course-word-layout">
        <section class="course-word-editor">
          <div class="course-word-title">
            <input class="doc-title-input" data-course-title="${course.id}" value="${escapeHtml(course.title)}" />
            <button class="icon-button danger-button" type="button" data-delete-course="${course.id}" aria-label="XÃ³a khÃ³a">${icon("delete")}</button>
          </div>
          <textarea class="doc-desc-input compact-desc" data-course-desc="${course.id}" placeholder="MÃ´ táº£ khÃ³a há»c...">${escapeHtml(course.description)}</textarea>
          ${editorToolbar()}
          <div class="course-free-editor" contenteditable="true" data-course-content="${course.id}">${course.content || ""}</div>
          <div class="selection-menu" id="selectionMenu" hidden>
            <button type="button" data-mark-toc="chapter">ChÆ°Æ¡ng</button>
            <button type="button" data-mark-toc="lesson">BÃ i há»c</button>
            <button type="button" data-mark-toc="section">Má»¥c</button>
          </div>
        </section>
        <aside class="course-toc-panel">
          <div class="row-between">
            <h3>Má»¥c lá»¥c</h3>
            <button class="icon-button" type="button" data-add-toc="${course.id}" aria-label="ThÃªm má»¥c lá»¥c">${icon("add")}</button>
          </div>
          <div class="toc-list">
            ${(course.toc || []).map((item) => renderTocItem(course.id, item)).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderTocItem(courseId, item) {
  const className = item.level === "chapter" ? "toc-item toc-chapter" : item.level === "lesson" ? "toc-item toc-lesson" : "toc-item toc-section";
  return `
    <div class="${className}">
      <button type="button" data-focus-toc="${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>
      <span>${item.level === "chapter" ? "ChÆ°Æ¡ng" : item.level === "lesson" ? "BÃ i há»c" : "Má»¥c"}</span>
      <button class="toc-plus" type="button" data-add-child-toc="${courseId}:${item.id}" aria-label="ThÃªm má»¥c con">+</button>
      <button class="toc-delete" type="button" data-delete-toc="${courseId}:${item.id}" aria-label="XÃ³a">Ã—</button>
    </div>
  `;
}

function courseStatsFor(course) {
  return {
    chapters: (course.toc || []).filter((item) => item.level === "chapter").length,
    lessons: (course.toc || []).filter((item) => item.level === "lesson").length,
    sections: (course.toc || []).filter((item) => item.level === "section").length,
  };
}

function tocLevelAfter(level) {
  if (level === "chapter") return "lesson";
  if (level === "lesson") return "section";
  return "section";
}

function tocTitle(level) {
  return level === "chapter" ? "ChÆ°Æ¡ng má»›i" : level === "lesson" ? "BÃ i há»c má»›i" : "Má»¥c má»›i";
}

function showSelectionMenu(editor, event) {
  event.preventDefault();
  const menu = document.querySelector("#selectionMenu");
  if (!menu) return;
  const selection = window.getSelection();
  const text = selectedTextInEditor(editor);
  if (!text || !selection?.rangeCount) {
    menu.hidden = true;
    state.pendingSelectionText = "";
    return;
  }
  state.pendingSelectionText = text;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const left = Math.min(Math.max(rect.right + 8, 8), window.innerWidth - 170);
  const top = Math.min(Math.max(rect.top, 8), window.innerHeight - 120);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.hidden = false;
}

function selectedTextInEditor(editor) {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || "";
  if (!text || !selection?.anchorNode || !selection?.focusNode) return "";
  if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return "";
  return text;
}

function hideSelectionMenu() {
  const menu = document.querySelector("#selectionMenu");
  if (menu) menu.hidden = true;
  state.pendingSelectionText = "";
}

function saveDocumentSelection(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) return false;
  if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return false;
  documentSelectionRange = selection.getRangeAt(0).cloneRange();
  return !selection.toString().trim() || true;
}

function restoreDocumentSelection() {
  if (!documentSelectionRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(documentSelectionRange);
}

function showDocumentSelectionMenu(editor, event) {
  event.preventDefault();
  const menu = document.querySelector("#documentSelectionMenu");
  if (!menu) return;
  const selection = window.getSelection();
  const text = selectedTextInEditor(editor);
  if (!text || !selection?.rangeCount) {
    menu.hidden = true;
    documentSelectionRange = null;
    return;
  }
  documentSelectionRange = selection.getRangeAt(0).cloneRange();
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 190);
  const top = Math.min(Math.max(rect.bottom + 8, 8), window.innerHeight - 220);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.hidden = false;
}

function hideDocumentSelectionMenu() {
  const menu = document.querySelector("#documentSelectionMenu");
  if (menu) menu.hidden = true;
}

function sanitizeDocumentContent(html = "") {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("img").forEach((image) => {
    const source = image.getAttribute("src") || "";
    if (source.startsWith("data:") || source.startsWith("blob:") || image.hasAttribute("data-doc-ephemeral-image")) {
      const placeholder = document.createElement("p");
      placeholder.className = "document-image-placeholder";
      placeholder.textContent = "[áº¢nh táº¡m khÃ´ng lÆ°u vÃ o Supabase]";
      image.replaceWith(placeholder);
    }
  });
  return container.innerHTML;
}

function persistDocumentEditor(editor) {
  const documentItem = state.documents.find((item) => item.id === editor?.dataset.documentContent);
  if (!documentItem || !editor) return;
  documentItem.content = sanitizeDocumentContent(editor.innerHTML);
  documentItem.updatedAt = new Date().toISOString();
  writeStore("ta.documents", state.documents);
}

function insertDocumentHtml(html) {
  const editor = document.querySelector("[data-document-content]");
  if (!editor) return;
  editor.focus();
  restoreDocumentSelection();
  document.execCommand("insertHTML", false, html);
  persistDocumentEditor(editor);
  saveDocumentSelection(editor);
}

function insertDocumentTable() {
  insertDocumentHtml(`
    <table class="document-table">
      <tbody>
        <tr><th>Cá»™t 1</th><th>Cá»™t 2</th><th>Cá»™t 3</th></tr>
        <tr><td>Ná»™i dung</td><td>Ná»™i dung</td><td>Ná»™i dung</td></tr>
        <tr><td>Ná»™i dung</td><td>Ná»™i dung</td><td>Ná»™i dung</td></tr>
      </tbody>
    </table>
  `);
}

function insertDocumentMindMap() {
  insertDocumentHtml(`
    <div class="document-mindmap">
      <strong>Ã chÃ­nh</strong>
      <ol>
        <li>BÆ°á»›c 1: XÃ¡c Ä‘á»‹nh má»¥c tiÃªu</li>
        <li>BÆ°á»›c 2: Chia nhÃ¡nh ná»™i dung</li>
        <li>BÆ°á»›c 3: Gáº¯n hÃ nh Ä‘á»™ng tiáº¿p theo</li>
      </ol>
    </div>
  `);
}

function insertTemporaryImage(dataUrl) {
  const safeDataUrl = String(dataUrl || "").replace(/"/g, "&quot;");
  insertDocumentHtml(`<img src="${safeDataUrl}" alt="áº¢nh táº¡m" data-doc-ephemeral-image="true" />`);
}

function handleDocumentPaste(editor, event) {
  const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;
  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    editor.focus();
    insertTemporaryImage(reader.result);
    showToast("ÄÃ£ dÃ¡n áº£nh táº¡m, áº£nh khÃ´ng lÆ°u vÃ o Supabase");
  });
  reader.readAsDataURL(file);
}

function runDocumentCommand(command, value = null) {
  const editor = document.querySelector("[data-document-content]");
  if (!editor) return;
  editor.focus();
  restoreDocumentSelection();
  document.execCommand(command, false, value);
  persistDocumentEditor(editor);
  saveDocumentSelection(editor);
}

function runDocumentBlock(tagName) {
  runDocumentCommand("formatBlock", tagName);
}

function syncTocWithEditor(course, editor) {
  const text = editor.innerText || "";
  course.toc = (course.toc || []).filter((item) => item.source !== "selection" || text.includes(item.title));
}

function findCourse(courseId) {
  return state.courses.find((course) => course.id === courseId);
}

function findNode(nodes, nodeId) {
  for (const node of nodes || []) {
    if (node.id === nodeId) return node;
    const found = findNode(node.children, nodeId);
    if (found) return found;
  }
  return null;
}

function findCourseNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return null;
  if (course.id === nodeId) return course;
  return findNode(course.children, nodeId);
}

function findParent(root, childId, parent = null) {
  if (!root) return null;
  if (root.id === childId) return parent;
  for (const child of root.children || []) {
    const found = findParent(child, childId, root);
    if (found) return found;
  }
  return null;
}

function removeNode(nodes, nodeId) {
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) return nodes.splice(index, 1)[0];
  for (const node of nodes) {
    const removed = removeNode(node.children || [], nodeId);
    if (removed) return removed;
  }
  return null;
}

function findSiblingsInfo(nodes, nodeId, parent = null) {
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) return { siblings: nodes, index, parent };
  for (const node of nodes) {
    const found = findSiblingsInfo(node.children || [], nodeId, node);
    if (found) return found;
  }
  return null;
}

function createOutlineNode(level, title = "") {
  return {
    id: crypto.randomUUID(),
    level,
    title: title || nextTitle(level),
    description: "",
    type: level === "lesson" ? "BÃ i há»c" : "",
    minutes: level === "lesson" ? 20 : 0,
    children: [],
  };
}

function createChapter(title = "ChÆ°Æ¡ng má»›i") {
  return {
    id: crypto.randomUUID(),
    level: "chapter",
    title,
    description: "",
    image: "",
    body: "",
    summary: "",
    materials: "",
    collapsed: false,
    children: [],
  };
}

function nextTitle(level) {
  const labels = {
    chapter: "ChÆ°Æ¡ng má»›i",
    lesson: "BÃ i má»›i",
    section: "Má»¥c má»›i",
    item: "Äoáº¡n má»›i",
  };
  return labels[level] || "Ná»™i dung má»›i";
}

function insertAfter(rootNodes, nodeId, newNode) {
  const index = rootNodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) {
    rootNodes.splice(index + 1, 0, newNode);
    return true;
  }
  return rootNodes.some((node) => insertAfter(node.children || [], nodeId, newNode));
}

function syncLevelFromDepth(node, depth) {
  node.level = levelOrder[Math.min(depth, levelOrder.length - 1)];
  (node.children || []).forEach((child) => syncLevelFromDepth(child, depth + 1));
}

function indentNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return;
  const info = findSiblingsInfo(course.children, nodeId);
  if (!info || info.index === 0) {
    showToast("Cáº§n cÃ³ má»™t dÃ²ng á»Ÿ phÃ­a trÃªn Ä‘á»ƒ lÃ¹i vÃ o");
    return;
  }
  const [node] = info.siblings.splice(info.index, 1);
  const newParent = info.siblings[info.index - 1];
  newParent.children ||= [];
  newParent.children.push(node);
  const parentDepth = levelOrder.indexOf(newParent.level);
  syncLevelFromDepth(node, parentDepth + 1);
  writeStore("ta.courses", state.courses);
  render();
}

function outdentNode(courseId, nodeId) {
  const course = findCourse(courseId);
  if (!course) return;
  const info = findSiblingsInfo(course.children, nodeId);
  if (!info || !info.parent) {
    showToast("DÃ²ng nÃ y Ä‘Ã£ á»Ÿ cáº¥p ngoÃ i cÃ¹ng");
    return;
  }
  const [node] = info.siblings.splice(info.index, 1);
  const parentInfo = findSiblingsInfo(course.children, info.parent.id);
  if (!parentInfo) {
    course.children.push(node);
    syncLevelFromDepth(node, 0);
  } else {
    parentInfo.siblings.splice(parentInfo.index + 1, 0, node);
    const parentDepth = parentInfo.parent ? levelOrder.indexOf(parentInfo.parent.level) + 1 : 0;
    syncLevelFromDepth(node, parentDepth);
  }
  writeStore("ta.courses", state.courses);
  render();
}

function renderAds() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("campaign")} Ads Tool</span>
          <h1 class="headline">CÃ´ng cá»¥ <span class="highlight">Marketing</span></h1>
         <p class="subhead">Táº¡o tÃªn ads nhanh, cÃ¡c pháº§n Ä‘Æ°á»£c ná»‘i báº±ng dáº¥u gáº¡ch dÆ°á»›i.</p>
        </div>
      </div>
      <div class="grid two-col">
        <form class="card pad form-grid" id="adsForm">
          ${field("NgÃ y", "adsDate", "date", "2026-05-15")}
          <div class="field">
             <label for="adsCampaign">Chiáº¿n dá»‹ch</label>
            <input id="adsCampaign" type="text" value="AI Marketing" />
          </div>
          ${field("Content", "adsContent", "text", "Video-Viral-01")}
          ${field("Tá»‡p", "adsAudience", "text", "LAL-1-3")}
          <button class="primary-button" type="button" id="copyAdName">${icon("content_copy")} Sao chÃ©p tÃªn Ads</button>
        </form>
        <aside class="card pad">
          <h3>TÃªn quáº£ng cÃ¡o</h3>
          <div class="preview-box" id="adPreview"></div>
          <p class="muted">Vi du: ngay_chien_dich_content_tep.</p>
        </aside>
      </div>
    </section>
  `;
}

function field(label, id, type, value) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" /></div>`;
}

function normalizeAdPart(value = "") {
  return String(value).trim().replace(/[\s\-\/]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function renderContentPlan() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("edit_calendar")} Plan Content</span>
          <h1 class="headline">Káº¿ hoáº¡ch <span class="highlight">Content</span></h1>
          <p class="subhead">LÃªn topic theo ngÃ y vÃ  kÃªnh. Calendar sáº½ láº¥y dá»¯ liá»‡u tá»« Ä‘Ã¢y.</p>
        </div>
      </div>
      <div class="grid two-col">
        <div class="list">${state.contentPlans.filter((plan) => matchesSearch(plan.topic, plan.channel)).map(planCard).join("")}</div>
        <form class="card pad form-grid" id="contentPlanForm">
          <h3>ThÃªm káº¿ hoáº¡ch</h3>
          ${field("NgÃ y", "planDate", "date", "2026-05-20")}
          ${field("Topic", "planTopic", "text", "")}
          <div class="field"><label for="planChannel">KÃªnh</label><select id="planChannel"><option>Facebook</option><option>TikTok</option><option>LinkedIn</option><option>Email</option><option>Blog</option></select></div>
          <button class="primary-button" type="submit">${icon("add")} ThÃªm content</button>
        </form>
      </div>
    </section>
  `;
}

function planCard(plan) {
  return `
    <article class="list-item">
      ${icon("edit_note")}
      <div style="flex:1">
        <div class="row-between">
          <h4>${escapeHtml(plan.topic)}</h4>
          <span class="tag">${escapeHtml(plan.channel)}</span>
        </div>
        <p>${new Date(plan.date).toLocaleDateString("vi-VN")}</p>
        <div class="item-actions task-actions">
        <button class="icon-button" type="button" data-copy-plan="${plan.id}" aria-label="Sao chÃ©p káº¿ hoáº¡ch">${icon("content_copy")}</button>
          <button class="icon-button danger-button" type="button" data-delete-plan="${plan.id}" aria-label="XÃ³a">${icon("delete")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCalendar() {
  const sorted = [...state.contentPlans].sort((a, b) => a.date.localeCompare(b.date));
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("calendar_month")} Calendar</span>
          <h1 class="headline">Lá»‹ch <span class="highlight">Triá»ƒn khai</span></h1>
          <p class="subhead">Tá»•ng há»£p task deadline vÃ  content plan theo ngÃ y.</p>
        </div>
      </div>
      <div class="calendar-board">
        ${sorted.map((plan) => `
          <article class="card pad calendar-day">
            <span class="pill">${new Date(plan.date).toLocaleDateString("vi-VN")}</span>
            <h3>${escapeHtml(plan.topic)}</h3>
            <p>${escapeHtml(plan.channel)}</p>
          </article>
        `).join("")}
        ${state.tasks.map((task) => `
          <article class="card pad calendar-day">
            <span class="pill">${new Date(task.due).toLocaleDateString("vi-VN")}</span>
            <h3>${escapeHtml(task.title)}</h3>
            <p>Task · ${escapeHtml(task.priority)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderClock() {
  const alarms = state.alarms.filter((alarm) => matchesSearch(alarm.time, alarm.label));
  return `
    <section class="page clock-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("schedule")} Time Center</span>
          <h1 class="headline">Äá»“ng há»“</h1>
          <p class="subhead">Äá»“ng há»“ Ä‘iá»‡n tá»­ lá»›n, bÃ¡o thá»©c, Ä‘áº¿m ngÆ°á»£c vÃ  báº¥m giá» trong cÃ¹ng má»™t mÃ n hÃ¬nh.</p>
        </div>
      </div>

      <div class="clock-hero card">
        <div>
          <p class="clock-label">Giá» hiá»‡n táº¡i</p>
          <div class="digital-clock" id="digitalClock">--:--:--</div>
          <p class="clock-date" id="clockDate">--</p>
        </div>
        <span class="material-symbols-outlined">schedule</span>
      </div>

      <div class="grid three-col clock-tools">
        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>BÃ¡o thá»©c</h3>
            <span class="pill">${state.alarms.length} alarms</span>
          </div>
          <form class="alarm-form" id="alarmForm">
            <input id="alarmTime" type="time" required />
            <input id="alarmLabel" type="text" placeholder="TÃªn bÃ¡o thá»©c" />
            <button class="primary-button" type="submit">${icon("add_alert")} ThÃªm</button>
          </form>
          <div class="alarm-list">
            ${alarms.length ? alarms.map(alarmCard).join("") : `<div class="empty compact-empty">ChÆ°a cÃ³ bÃ¡o thá»©c.</div>`}
          </div>
        </article>

        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>Äáº¿m ngÆ°á»£c</h3>
            <span class="pill" id="countdownStatus">${state.countdownRunning ? "Running" : "Ready"}</span>
          </div>
          <div class="timer-display" id="countdownDisplay">${formatDuration(state.countdownRemaining)}</div>
          <form class="timer-setup" id="countdownSetup">
            <input id="countdownHours" type="number" min="0" max="99" placeholder="Giá»" />
            <input id="countdownMinutes" type="number" min="0" max="59" placeholder="PhÃºt" />
            <input id="countdownSeconds" type="number" min="0" max="59" placeholder="GiÃ¢y" />
            <button class="secondary-button" type="submit">${icon("timer")} Set</button>
          </form>
          <div class="timer-actions">
            <button class="primary-button" type="button" id="toggleCountdown">${icon(state.countdownRunning ? "pause" : "play_arrow")} ${state.countdownRunning ? "Táº¡m dá»«ng" : "Báº¯t Ä‘áº§u"}</button>
            <button class="secondary-button" type="button" id="resetCountdown">${icon("restart_alt")} Reset</button>
          </div>
        </article>

        <article class="card pad clock-panel">
          <div class="row-between">
            <h3>Báº¥m giá»</h3>
            <span class="pill" id="stopwatchStatus">${state.stopwatchRunning ? "Running" : "Ready"}</span>
          </div>
          <div class="timer-display" id="stopwatchDisplay">${formatStopwatch(state.stopwatchElapsed)}</div>
          <div class="timer-actions stopwatch-actions">
            <button class="primary-button" type="button" id="toggleStopwatch">${icon(state.stopwatchRunning ? "pause" : "play_arrow")} ${state.stopwatchRunning ? "Táº¡m dá»«ng" : "Báº¯t Ä‘áº§u"}</button>
            <button class="secondary-button" type="button" id="lapStopwatch">${icon("flag")} Lap</button>
            <button class="secondary-button" type="button" id="resetStopwatch">${icon("restart_alt")} Reset</button>
          </div>
          <div class="lap-list" id="lapList"></div>
        </article>
      </div>
    </section>
  `;
}

function alarmCard(alarm) {
  return `
    <div class="alarm-item ${alarm.enabled ? "" : "is-off"}">
      <label>
        <input type="checkbox" data-toggle-alarm="${alarm.id}" ${alarm.enabled ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(alarm.time)}</strong>
          <small>${escapeHtml(alarm.label || "BÃ¡o thá»©c")}</small>
        </span>
      </label>
      <button class="icon-button danger-button" type="button" data-delete-alarm="${alarm.id}" aria-label="XÃ³a bÃ¡o thá»©c">${icon("delete")}</button>
    </div>
  `;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatStopwatch(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function renderTasks() {
  const filtered = state.tasks.filter((task) => {
    const statusOk = state.taskFilter === "all" || task.status === state.taskFilter || (state.taskFilter === "completed" && task.done);
    return statusOk && matchesSearch(task.title, task.description, task.priority);
  });
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("checklist")} Workflow</span>
          <h1 class="headline">Danh sÃ¡ch <span class="highlight">CÃ´ng viá»‡c</span></h1>
          <p class="subhead">Má»i task trá»« report/bÃ¡o cÃ¡o Ä‘á»u cÃ³ sá»­a. Táº¥t cáº£ task Ä‘á»u cÃ³ sao chÃ©p vÃ  xÃ³a.</p>
        </div>
      </div>
      <div class="controls">${segmented("task", [["today", "Today"], ["upcoming", "Upcoming"], ["completed", "Completed"], ["all", "Táº¥t cáº£"]], state.taskFilter)}</div>
      <div class="grid two-col">
        <div class="list">${filtered.length ? filtered.map(taskCard).join("") : `<div class="empty">KhÃ´ng cÃ³ cÃ´ng viá»‡c phÃ¹ há»£p.</div>`}</div>
        <form class="card pad form-grid" id="taskForm">
          <input id="taskEditId" type="hidden" value="" />
          <h3 id="taskFormTitle">Táº¡o cÃ´ng viá»‡c má»›i</h3>
          ${field("TiÃªu Ä‘á»", "taskTitle", "text", "")}
          <div class="field"><label for="taskDescription">MÃ´ táº£</label><textarea id="taskDescription"></textarea></div>
          ${field("Deadline", "taskDue", "date", "2026-05-20")}
          <div class="field"><label for="taskPriority">Äá»™ Æ°u tiÃªn</label><select id="taskPriority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
          <div class="course-form-actions">
            <button class="primary-button" type="submit">${icon("save")} LÆ°u cÃ´ng viá»‡c</button>
            <button class="secondary-button" type="button" id="resetTaskForm">${icon("restart_alt")} LÃ m má»›i</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function segmented(type, options, active) {
  return `<div class="segmented" data-segmented="${type}">${options.map(([value, label]) => `<button class="${value === active ? "is-active" : ""}" type="button" data-value="${value}">${label}</button>`).join("")}</div>`;
}

function isReportTask(task) {
  return /\breport\b|bÃ¡o cÃ¡o|bao cao/i.test(`${task.title} ${task.description}`);
}

function taskCard(task) {
  const isReport = isReportTask(task);
  return `
    <article class="list-item ${task.done ? "is-done" : ""}">
      <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""} aria-label="ÄÃ¡nh dáº¥u hoÃ n thÃ nh" />
      <div style="flex:1">
        <div class="row-between">
          <h4>${escapeHtml(task.title)}</h4>
          <span class="tag ${task.priority === "High" ? "high" : ""} ${task.done ? "done" : ""}">${task.done ? "Done" : task.priority}</span>
        </div>
        <p>${escapeHtml(task.description)}</p>
        <p><strong>Deadline:</strong> ${new Date(task.due).toLocaleDateString("vi-VN")}</p>
        <div class="item-actions task-actions">
        <button class="icon-button" type="button" data-copy-task="${task.id}" aria-label="Sao chÃ©p cÃ´ng viá»‡c">${icon("content_copy")}</button>
          ${isReport ? `<span class="pill">Report</span>` : `<button class="icon-button" type="button" data-edit-task="${task.id}" aria-label="Sá»­a">${icon("edit")}</button>`}
          <button class="icon-button danger-button" type="button" data-delete-task="${task.id}" aria-label="XÃ³a">${icon("delete")}</button>
        </div>
      </div>
    </article>
  `;
}

function taskCopyText(task) {
  return [`TiÃªu Ä‘á»: ${task.title}`, `MÃ´ táº£: ${task.description}`, `Deadline: ${task.due}`, `Æ¯u tiÃªn: ${task.priority}`, `Tráº¡ng thÃ¡i: ${task.done ? "Done" : task.status}`].join("\n");
}

function setTaskForm(task) {
  document.querySelector("#taskEditId").value = task?.id || "";
  document.querySelector("#taskTitle").value = task?.title || "";
  document.querySelector("#taskDescription").value = task?.description || "";
  document.querySelector("#taskDue").value = task?.due || "2026-05-20";
  document.querySelector("#taskPriority").value = task?.priority || "Medium";
  document.querySelector("#taskFormTitle").textContent = task ? "Sá»­a cÃ´ng viá»‡c" : "Táº¡o cÃ´ng viá»‡c má»›i";
}

function renderPrompts() {
  const categories = ["all", "Marketing", "Content", "Ads", "Automation", "Favorite"];
  const filtered = state.prompts.filter((prompt) => {
    const categoryOk = state.promptFilter === "all" || prompt.category === state.promptFilter || (state.promptFilter === "Favorite" && prompt.favorite);
    return categoryOk && matchesSearch(prompt.title, prompt.body, prompt.category);
  });
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <span class="eyebrow">${icon("terminal")} Prompt Library</span>
          <h1 class="headline">ThÆ° viá»‡n <span class="highlight">Prompt AI</span></h1>
          <p class="subhead">Lá»c prompt theo nhÃ³m, Ä‘Ã¡nh dáº¥u yÃªu thÃ­ch vÃ  sao chÃ©p nhanh ná»™i dung.</p>
        </div>
      </div>
      <div class="controls">${segmented("prompt", categories.map((item) => [item, item === "all" ? "Táº¥t cáº£" : item]), state.promptFilter)}</div>
      <div class="grid three-col">${filtered.length ? filtered.map(promptCard).join("") : `<div class="empty">KhÃ´ng cÃ³ prompt phÃ¹ há»£p.</div>`}</div>
    </section>
  `;
}

function promptCard(prompt) {
  return `
    <article class="card pad prompt-card">
      <div class="row-between">
        <select class="prompt-category-input" data-prompt-category="${prompt.id}">
          ${["Marketing", "Content", "Ads", "Automation"].map((category) => `<option ${category === prompt.category ? "selected" : ""}>${category}</option>`).join("")}
        </select>
        <button class="favorite ${prompt.favorite ? "is-active" : ""}" type="button" data-favorite="${prompt.id}" aria-label="YÃªu thÃ­ch">${icon("star")}</button>
      </div>
      <input class="prompt-title-input" data-prompt-title="${prompt.id}" value="${escapeHtml(prompt.title)}" />
      <textarea class="prompt-body-input" data-prompt-body="${prompt.id}">${escapeHtml(prompt.body)}</textarea>
      <div class="prompt-actions">
        <button class="primary-button" type="button" data-copy-prompt="${prompt.id}">${icon("content_copy")} Sao chÃ©p Prompt</button>
        <button class="icon-button danger-button" type="button" data-delete-prompt="${prompt.id}" aria-label="XÃ³a prompt">${icon("delete")}</button>
      </div>
    </article>
  `;
}

function renderSimplePage() {
  const isSettings = state.page === "settings";
  return `<section class="page"><div class="page-header"><div><span class="eyebrow">${icon(isSettings ? "settings" : "help")} ${isSettings ? "Settings" : "Support"}</span><h1 class="headline">${isSettings ? "CÃ i Ä‘áº·t" : "Trung tÃ¢m há»— trá»£"}</h1><p class="subhead">Khu vá»±c nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t chá»— Ä‘á»ƒ má»Ÿ rá»™ng sau.</p></div></div></section>`;
}

function bindViewEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await supabaseClient?.auth.signOut();
    showToast("ÄÃ£ Ä‘Äƒng xuáº¥t");
  });

  document.querySelector("#newNoteButton")?.addEventListener("click", () => {
    const colors = ["yellow", "blue", "green", "pink"];
    state.notes.unshift({
      id: crypto.randomUUID(),
      title: "Ghi chÃº má»›i",
      body: "",
      color: colors[state.notes.length % colors.length],
      pinned: false,
    });
    writeStore("ta.notes", state.notes);
    render();
  });
  document.querySelectorAll("[data-note-title], [data-note-body]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.noteTitle || field.dataset.noteBody;
      const note = state.notes.find((item) => item.id === id);
      if (!note) return;
      if (field.dataset.noteTitle) note.title = field.value;
      if (field.dataset.noteBody) note.body = field.value;
      writeStore("ta.notes", state.notes);
    });
  });
  document.querySelectorAll("[data-note-color]").forEach((select) => {
    select.addEventListener("change", () => {
      const note = state.notes.find((item) => item.id === select.dataset.noteColor);
      if (!note) return;
      note.color = select.value;
      writeStore("ta.notes", state.notes);
      render();
    });
  });
  document.querySelectorAll("[data-pin-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const note = state.notes.find((item) => item.id === button.dataset.pinNote);
      if (!note) return;
      note.pinned = !note.pinned;
      writeStore("ta.notes", state.notes);
      render();
    });
  });
  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => {
      state.notes = state.notes.filter((item) => item.id !== button.dataset.deleteNote);
      state.selectedNoteId = state.notes[0]?.id || "";
      writeStore("ta.notes", state.notes);
      render();
    });
  });

  document.querySelector("#newDocumentButton")?.addEventListener("click", () => {
    const documentItem = {
      id: crypto.randomUUID(),
      title: "Tài liệu mới",
      type: "Doc",
      color: "blue",
      folder: state.documentFolderFilter === "all" ? "T\u00e0i li\u1ec7u chung" : repairVietnameseText(state.documentFolderFilter),
      summary: "",
      sourceUrl: "",
      contentJson: createEmptyDocumentJson(),
      content: "<p>Bắt đầu viết nội dung tài liệu tại đây...</p>",
      updatedAt: new Date().toISOString(),
    };
    state.documents.unshift(documentItem);
    state.selectedDocumentId = documentItem.id;
    state.documentPanelOpen = true;
    state.documentFocusMode = true;
    localStorage.setItem("ta.selectedDocumentId", documentItem.id);
    localStorage.setItem("ta.documentFocusMode", "true");
    writeStore("ta.documents", state.documents);
    syncDocumentUrl({ force: true });
    render();
  });
  document.querySelector("#newDocumentFolderButton")?.addEventListener("click", () => {
    state.documentFolderFormOpen = !state.documentFolderFormOpen;
    render();
  });
  document.querySelector("#cancelDocumentFolder")?.addEventListener("click", () => {
    state.documentFolderFormOpen = false;
    render();
  });
  document.querySelector("#documentFolderForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#documentFolderName")?.value.trim();
    if (!name) return;
    if (!state.documentFolders.includes(name)) state.documentFolders.push(name);
    state.documentFolders = state.documentFolders.map(repairVietnameseText);
    state.documentFolderFilter = repairVietnameseText(name);
    state.documentFolderFormOpen = false;
    localStorage.setItem("ta.documentFolderFilter", name);
    writeStore("ta.documentFolders", state.documentFolders);
    render();
  });
  document.querySelectorAll("[data-document-folder]").forEach((button) => {
    button.addEventListener("click", () => {
      state.documentFolderFilter = button.dataset.documentFolder === "all" ? "all" : repairVietnameseText(button.dataset.documentFolder || "all");
      localStorage.setItem("ta.documentFolderFilter", state.documentFolderFilter);
      render();
    });
  });
  document.querySelectorAll("[data-open-document]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDocumentId = button.dataset.openDocument;
      state.documentPanelOpen = true;
      state.documentFocusMode = true;
      localStorage.setItem("ta.selectedDocumentId", state.selectedDocumentId);
      localStorage.setItem("ta.documentFocusMode", "true");
      scheduleRemoteSave();
      syncDocumentUrl();
      render();
    });
  });
  document.querySelectorAll("[data-document-title], [data-document-summary], [data-document-source], [data-document-type], [data-document-color], [data-document-folder-field]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.documentTitle || field.dataset.documentSummary || field.dataset.documentSource || field.dataset.documentType || field.dataset.documentColor || field.dataset.documentFolderField;
      const documentItem = state.documents.find((item) => item.id === id);
      if (!documentItem) return;
      if (field.dataset.documentTitle) documentItem.title = field.value;
      if (field.dataset.documentSummary) documentItem.summary = field.value;
      if (field.dataset.documentSource) documentItem.sourceUrl = field.value;
      if (field.dataset.documentType) documentItem.type = repairVietnameseText(field.value);
      if (field.dataset.documentColor) documentItem.color = field.value;
      if (field.dataset.documentFolderField) documentItem.folder = repairVietnameseText(field.value);
      documentItem.updatedAt = new Date().toISOString();
      writeStore("ta.documents", state.documents);
    });
  });
  document.querySelectorAll("[data-document-type], [data-document-color], [data-document-folder-field]").forEach((select) => {
    select.addEventListener("change", () => {
      const id = select.dataset.documentType || select.dataset.documentColor || select.dataset.documentFolderField;
      const documentItem = state.documents.find((item) => item.id === id);
      if (!documentItem) return;
      if (select.dataset.documentType) documentItem.type = repairVietnameseText(select.value);
      if (select.dataset.documentColor) documentItem.color = select.value;
      if (select.dataset.documentFolderField) documentItem.folder = repairVietnameseText(select.value);
      documentItem.updatedAt = new Date().toISOString();
      writeStore("ta.documents", state.documents);
      render();
    });
  });
  document.querySelector("[data-exit-document-focus]")?.addEventListener("click", () => {
    state.documentFocusMode = false;
    localStorage.setItem("ta.documentFocusMode", "false");
    destroyDocumentEditorSession(state.selectedDocumentId);
    syncDocumentUrl();
    render();
  });
  document.querySelector("[data-close-document]")?.addEventListener("click", () => {
    state.documentPanelOpen = false;
    state.documentFocusMode = false;
    localStorage.setItem("ta.documentFocusMode", "false");
    destroyDocumentEditorSession(state.selectedDocumentId);
    syncDocumentUrl();
    render();
  });
  document.querySelector("[data-document-toc-visibility]")?.addEventListener("click", () => {
    state.documentTocHidden = !state.documentTocHidden;
    localStorage.setItem("ta.documentTocHidden", String(state.documentTocHidden));
    render();
  });
  document.querySelector("[data-document-toolbar-visibility]")?.addEventListener("click", () => {
    state.documentToolbarHidden = !state.documentToolbarHidden;
    localStorage.setItem("ta.documentToolbarHidden", String(state.documentToolbarHidden));
    render();
  });
  document.querySelectorAll("[data-copy-document-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.copyDocumentId);
      if (!documentItem) return;
      copyText(documentStableId(documentItem), "Đã sao chép ID tài liệu");
    });
  });
  document.querySelectorAll("[data-export-document-pdf]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.exportDocumentPdf);
      if (documentItem) exportDocumentAsPdf(documentItem);
    });
  });
  document.querySelectorAll("[data-export-document-doc]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.exportDocumentDoc);
      if (documentItem) exportDocumentAsDoc(documentItem);
    });
  });
  document.querySelector(".document-editor-toolbar")?.addEventListener("mousedown", (event) => {
    const commandButton = event.target?.closest?.("[data-document-command]");
    if (commandButton) {
      const session = findActiveDocumentSession(state.selectedDocumentId);
      documentEditorCommandSelection = session?.editor ? getBrowserEditorSelection(session.editor) : null;
    }
    if (event.target?.closest?.("[data-document-command], [data-document-table-toggle], [data-document-table-size]")) event.preventDefault();
  }, true);
  document.querySelectorAll("[data-document-command]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (button.matches("[data-document-table-toggle]")) return;
      if (
        button.closest(".document-editor-slash-menu") ||
        button.closest(".document-editor-bubble-menu") ||
        button.closest(".document-editor-context-menu")
      ) return;
      const commandId = button.dataset.documentCommand;
      const documentItem = selectedDocument();
      const session = ensureDocumentEditorSession(documentItem);
      if (!session?.commandBus) return;
      executeDocumentUiCommand(session, documentItem, commandId);
    });
  });
  document.querySelectorAll("[data-document-table-toggle]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const documentItem = selectedDocument();
      const session = ensureDocumentEditorSession(documentItem);
      if (!session?.commandBus) return;
      session.commandBus.execute("table", { rows: 4, cols: 4 });
      button.closest(".document-table-picker")?.querySelector(".document-table-picker__grid")?.classList.remove("is-open");
      updateDocumentTableMenu(session);
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const grid = button.closest(".document-table-picker")?.querySelector(".document-table-picker__grid");
      if (!grid) return;
      document.querySelectorAll(".document-table-picker__grid.is-open").forEach((item) => {
        if (item !== grid) item.classList.remove("is-open");
      });
      grid.classList.toggle("is-open");
    });
  });
  document.querySelectorAll("[data-document-table-create]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const picker = button.closest(".document-table-picker");
      const rows = Math.max(1, Math.min(30, Number(picker?.querySelector("[data-document-table-rows]")?.value || 4) || 4));
      const cols = Math.max(1, Math.min(20, Number(picker?.querySelector("[data-document-table-cols]")?.value || 4) || 4));
      const documentItem = selectedDocument();
      const session = ensureDocumentEditorSession(documentItem);
      if (!session?.commandBus) return;
      session.commandBus.execute("table", { rows, cols });
      picker?.querySelector(".document-table-picker__grid")?.classList.remove("is-open");
      updateDocumentTableMenu(session);
    });
  });
  document.querySelectorAll("[data-document-table-size]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const documentItem = selectedDocument();
      const session = ensureDocumentEditorSession(documentItem);
      if (!session?.commandBus) return;
      const [rows, cols] = String(button.dataset.documentTableSize || "3x3").split("x").map((value) => Number(value) || 3);
      session.commandBus.execute("table", { rows, cols });
      button.closest(".document-table-picker__grid")?.classList.remove("is-open");
      updateDocumentTableMenu(session);
    });
  });
  document.querySelectorAll("[id^='documentImageUpload-']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const targetDocumentId = event.target?.dataset?.documentImageUpload;
      const file = event.target?.files?.[0];
      if (!file || !targetDocumentId) return;
      const session = ensureDocumentEditorSession(state.documents.find((documentItem) => documentItem.id === targetDocumentId));
      if (!session?.commandBus) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const safeDataUrl = sanitizeDocumentUrl(String(reader.result || ""));
        if (!safeDataUrl) return;
        session.commandBus.execute("insertImage", { src: safeDataUrl, alt: file.name || "áº¢nh Ä‘Ã£ táº£i" });
      });
      reader.readAsDataURL(file);
      event.target.value = "";
    });
  });
  document.querySelectorAll("[data-copy-document]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.copyDocument);
      copyText(documentItem?.content?.replace(/<[^>]+>/g, " ") || documentItem?.sourceUrl || "", "ÄÃ£ sao chÃ©p tÃ i liá»‡u");
    });
  });
  document.querySelectorAll("[data-open-document-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = state.documents.find((item) => item.id === button.dataset.openDocumentSource);
      if (documentItem?.sourceUrl) window.open(documentItem.sourceUrl, "_blank", "noopener,noreferrer");
    });
  });
  document.querySelectorAll("[data-delete-document]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteDocumentById(button.dataset.deleteDocument);
    });
  });

  document.querySelector("#newIdeaButton")?.addEventListener("click", () => {
    state.ideaFormOpen = !state.ideaFormOpen;
    render();
  });
  document.querySelector("#ideaForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#ideaTitle").value.trim();
    const url = document.querySelector("#ideaUrl").value.trim();
    if (!title || !url) return showToast("Nháº­p tiÃªu Ä‘á» vÃ  link trÆ°á»›c");
    state.ideas.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      note: document.querySelector("#ideaNote").value.trim(),
      createdAt: new Date().toISOString(),
    });
    state.ideaFormOpen = false;
    writeStore("ta.ideas", state.ideas);
    render();
  });
  document.querySelectorAll("[data-copy-idea]").forEach((button) => {
    button.addEventListener("click", () => {
      const idea = state.ideas.find((item) => item.id === button.dataset.copyIdea);
      copyText(idea?.url || "", "ÄÃ£ sao chÃ©p link idea");
    });
  });
  document.querySelectorAll("[data-delete-idea]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ideas = state.ideas.filter((item) => item.id !== button.dataset.deleteIdea);
      writeStore("ta.ideas", state.ideas);
      render();
    });
  });

  document.querySelector("#alarmForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const time = document.querySelector("#alarmTime").value;
    const label = document.querySelector("#alarmLabel").value.trim();
    if (!time) return showToast("Chá»n giá» bÃ¡o thá»©c trÆ°á»›c");
    state.alarms.push({ id: crypto.randomUUID(), time, label, enabled: true, lastTriggered: "" });
    writeStore("ta.alarms", state.alarms);
    render();
  });
  document.querySelectorAll("[data-toggle-alarm]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const alarm = state.alarms.find((item) => item.id === checkbox.dataset.toggleAlarm);
      if (!alarm) return;
      alarm.enabled = checkbox.checked;
      alarm.lastTriggered = "";
      writeStore("ta.alarms", state.alarms);
      render();
    });
  });
  document.querySelectorAll("[data-delete-alarm]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alarms = state.alarms.filter((item) => item.id !== button.dataset.deleteAlarm);
      writeStore("ta.alarms", state.alarms);
      render();
    });
  });
  document.querySelector("#countdownSetup")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const hours = Number(document.querySelector("#countdownHours").value || 0);
    const minutes = Number(document.querySelector("#countdownMinutes").value || 0);
    const seconds = Number(document.querySelector("#countdownSeconds").value || 0);
    const total = Math.max(1, (hours * 3600) + (minutes * 60) + seconds);
    state.countdownTotal = total;
    state.countdownRemaining = total;
    state.countdownRunning = false;
    persistTimers();
    updateClockDom();
  });
  document.querySelector("#toggleCountdown")?.addEventListener("click", () => {
    if (state.countdownRemaining <= 0) state.countdownRemaining = state.countdownTotal || 60;
    state.countdownRunning = !state.countdownRunning;
    render();
  });
  document.querySelector("#resetCountdown")?.addEventListener("click", () => {
    state.countdownRunning = false;
    state.countdownRemaining = state.countdownTotal || 25 * 60;
    persistTimers();
    render();
  });
  document.querySelector("#toggleStopwatch")?.addEventListener("click", () => {
    if (state.stopwatchRunning) {
      state.stopwatchElapsed = Date.now() - state.stopwatchStartedAt + state.stopwatchBase;
      state.stopwatchRunning = false;
    } else {
      state.stopwatchBase = state.stopwatchElapsed;
      state.stopwatchStartedAt = Date.now();
      state.stopwatchRunning = true;
    }
    persistTimers();
    render();
  });
  document.querySelector("#resetStopwatch")?.addEventListener("click", () => {
    state.stopwatchRunning = false;
    state.stopwatchElapsed = 0;
    state.stopwatchBase = 0;
    persistTimers();
    render();
  });
  document.querySelector("#lapStopwatch")?.addEventListener("click", () => {
    const list = document.querySelector("#lapList");
    if (!list) return;
    const lap = document.createElement("div");
    lap.className = "lap-item";
    lap.textContent = formatStopwatch(currentStopwatchElapsed());
    list.prepend(lap);
  });

  document.querySelector("#newCourseButton")?.addEventListener("click", () => {
    state.courseDraftMode = "create";
    state.courseFocus = false;
    render();
  });
  document.querySelector("#bigNewCourse")?.addEventListener("click", () => {
    state.courseDraftMode = "create";
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-course-list]")?.addEventListener("click", () => {
    state.courseDraftMode = "list";
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-toggle-course-read]")?.addEventListener("click", () => {
    state.courseDraftMode = state.courseDraftMode === "read" ? "edit" : "read";
    state.courseFocus = state.courseDraftMode === "read";
    render();
  });
  document.querySelectorAll("[data-nav-course]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.dataset.navCourse) return;
      state.selectedCourseId = button.dataset.navCourse;
      state.courseDraftMode = "edit";
      localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
      scheduleRemoteSave();
      render();
    });
  });
  document.querySelector("#exitCourseFocus")?.addEventListener("click", () => {
    state.courseFocus = false;
    render();
  });
  document.querySelector("[data-toggle-course-focus]")?.addEventListener("click", () => {
    state.courseFocus = !state.courseFocus;
    render();
  });
  document.querySelectorAll("[data-open-course]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCourseId = button.dataset.openCourse;
      state.courseDraftMode = "edit";
      localStorage.setItem("ta.selectedCourseId", state.selectedCourseId);
      scheduleRemoteSave();
      render();
    });
  });
  document.querySelector("#courseCreateForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#newCourseTitle").value.trim();
    if (!title) return showToast("Báº¡n cáº§n nháº­p tÃªn khÃ³a há»c");
    const course = {
      id: crypto.randomUUID(),
      level: "course",
      title,
      description: document.querySelector("#newCourseDescription").value.trim(),
      image: document.querySelector("#newCourseImage").value.trim(),
      content: "",
      toc: [],
      children: [],
    };
    state.courses.unshift(course);
    state.selectedCourseId = course.id;
    state.courseDraftMode = "edit";
    localStorage.setItem("ta.selectedCourseId", course.id);
    writeStore("ta.courses", state.courses);
    render();
  });
  document.querySelectorAll("[data-course-title]").forEach((input) => {
    input.addEventListener("input", () => {
      const course = findCourse(input.dataset.courseTitle);
      course.title = input.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-course-desc]").forEach((input) => {
    input.addEventListener("input", () => {
      const course = findCourse(input.dataset.courseDesc);
      course.description = input.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-course-content]").forEach((editor) => {
    editor.addEventListener("input", () => {
      const course = findCourse(editor.dataset.courseContent);
      course.content = editor.innerHTML;
      syncTocWithEditor(course, editor);
      writeStore("ta.courses", state.courses);
      hideSelectionMenu();
    });
    editor.addEventListener("contextmenu", (event) => showSelectionMenu(editor, event));
    editor.addEventListener("click", () => hideSelectionMenu());
  });
  document.querySelector("#selectionMenu")?.addEventListener("mousedown", (event) => event.preventDefault());
  document.querySelectorAll("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      document.execCommand(button.dataset.format, false, null);
      const editor = document.querySelector("[data-course-content]");
      const course = editor ? findCourse(editor.dataset.courseContent) : null;
      if (course && editor) {
        course.content = editor.innerHTML;
        writeStore("ta.courses", state.courses);
      }
    });
  });
  document.querySelector("[data-insert-image]")?.addEventListener("click", () => {
    const url = window.prompt("DÃ¡n URL hÃ¬nh áº£nh");
    if (!url) return;
    document.execCommand("insertImage", false, url);
    const editor = document.querySelector("[data-course-content]");
    const course = editor ? findCourse(editor.dataset.courseContent) : null;
    if (course && editor) {
      course.content = editor.innerHTML;
      writeStore("ta.courses", state.courses);
    }
  });
  document.querySelectorAll("[data-mark-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = selectedCourse();
      const text = (state.pendingSelectionText || "").trim();
      if (!course || !text) return showToast("BÃ´i Ä‘en ná»™i dung rá»“i báº¥m chuá»™t pháº£i ngay trÃªn Ä‘oáº¡n Ä‘Ã£ chá»n");
      course.toc ||= [];
      course.toc.push({ id: crypto.randomUUID(), level: button.dataset.markToc, title: text, parentId: "", source: "selection" });
      state.pendingSelectionText = "";
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-add-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = findCourse(button.dataset.addToc);
      course.toc ||= [];
      course.toc.push({ id: crypto.randomUUID(), level: "chapter", title: tocTitle("chapter"), parentId: "" });
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-add-child-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, tocId] = button.dataset.addChildToc.split(":");
      const course = findCourse(courseId);
      const parent = (course.toc || []).find((item) => item.id === tocId);
      const level = tocLevelAfter(parent?.level);
      const index = course.toc.findIndex((item) => item.id === tocId);
      course.toc.splice(index + 1, 0, { id: crypto.randomUUID(), level, title: tocTitle(level), parentId: tocId });
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-delete-toc]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, tocId] = button.dataset.deleteToc.split(":");
      const course = findCourse(courseId);
      course.toc = (course.toc || []).filter((item) => item.id !== tocId && item.parentId !== tocId);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-focus-toc]").forEach((button) => {
    button.addEventListener("click", () => showToast(`Má»¥c lá»¥c: ${button.dataset.focusToc}`));
  });
  document.querySelectorAll("[data-add-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const course = findCourse(button.dataset.addChapter);
      course.children.push(createChapter(`ChÆ°Æ¡ng ${course.children.length + 1}`));
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-toggle-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, chapterId] = button.dataset.toggleChapter.split(":");
      const chapter = findCourseNode(courseId, chapterId);
      chapter.collapsed = !chapter.collapsed;
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-delete-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, chapterId] = button.dataset.deleteChapter.split(":");
      const course = findCourse(courseId);
      course.children = course.children.filter((chapter) => chapter.id !== chapterId);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-chapter-title], [data-chapter-body], [data-chapter-summary], [data-chapter-materials]").forEach((field) => {
    field.addEventListener("input", () => {
      const key = field.dataset.chapterTitle ? "chapterTitle" : field.dataset.chapterBody ? "chapterBody" : field.dataset.chapterSummary ? "chapterSummary" : "chapterMaterials";
      const [courseId, chapterId] = field.dataset[key].split(":");
      const chapter = findCourseNode(courseId, chapterId);
      if (field.dataset.chapterTitle) chapter.title = field.value;
      if (field.dataset.chapterBody) chapter.body = field.value;
      if (field.dataset.chapterSummary) chapter.summary = field.value;
      if (field.dataset.chapterMaterials) chapter.materials = field.value;
      writeStore("ta.courses", state.courses);
    });
  });
  document.querySelectorAll("[data-outline-title]").forEach((input) => {
    input.addEventListener("input", () => {
      const [courseId, nodeId] = input.dataset.outlineTitle.split(":");
      findCourseNode(courseId, nodeId).title = input.value;
      writeStore("ta.courses", state.courses);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const [courseId, nodeId] = input.dataset.outlineTitle.split(":");
      const node = findCourseNode(courseId, nodeId);
      const course = findCourse(courseId);
      const newNode = createOutlineNode(node.level, nextTitle(node.level));
      insertAfter(course.children, nodeId, newNode);
      writeStore("ta.courses", state.courses);
      render();
      requestAnimationFrame(() => document.querySelector(`[data-outline-title="${courseId}:${newNode.id}"]`)?.focus());
    });
  });
  document.querySelectorAll("[data-add-child-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const [courseId, nodeId] = button.dataset.addChildRow.split(":");
      const node = findCourseNode(courseId, nodeId);
      const level = levelOrder[Math.min(levelOrder.indexOf(node.level) + 1, levelOrder.length - 1)];
      const child = createOutlineNode(level, nextTitle(level));
      node.children.push(child);
      writeStore("ta.courses", state.courses);
      render();
    });
  });
  document.querySelectorAll("[data-indent-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.indentNode.split(":");
    indentNode(courseId, nodeId);
  }));
  document.querySelectorAll("[data-outdent-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.outdentNode.split(":");
    outdentNode(courseId, nodeId);
  }));
  document.querySelectorAll("[data-delete-node]").forEach((button) => button.addEventListener("click", () => {
    const [courseId, nodeId] = button.dataset.deleteNode.split(":");
    const course = findCourse(courseId);
    removeNode(course.children, nodeId);
    writeStore("ta.courses", state.courses);
    render();
  }));
  document.querySelectorAll("[data-delete-course]").forEach((button) => button.addEventListener("click", () => {
    state.courses = state.courses.filter((course) => course.id !== button.dataset.deleteCourse);
    state.selectedCourseId = state.courses[0]?.id || "";
    writeStore("ta.courses", state.courses);
    render();
  }));

  const adsForm = document.querySelector("#adsForm");
  if (adsForm) {
    const preview = () => {
      const value = [
        document.querySelector("#adsDate").value,
        document.querySelector("#adsCampaign").value,
        document.querySelector("#adsContent").value,
        document.querySelector("#adsAudience").value,
      ].map(normalizeAdPart).filter(Boolean).join("_");
      document.querySelector("#adPreview").textContent = value || "Nháº­p Ä‘á»§ thÃ´ng tin Ä‘á»ƒ táº¡o tÃªn quáº£ng cÃ¡o";
    };
    adsForm.addEventListener("input", preview);
    document.querySelector("#copyAdName").addEventListener("click", () => copyText(document.querySelector("#adPreview").textContent, "ÄÃ£ sao chÃ©p tÃªn Ads"));
    preview();
  }

  document.querySelector("#contentPlanForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const topic = document.querySelector("#planTopic").value.trim();
    if (!topic) return showToast("Báº¡n cáº§n nháº­p topic");
    state.contentPlans.push({
      id: crypto.randomUUID(),
      date: document.querySelector("#planDate").value,
      channel: document.querySelector("#planChannel").value,
      topic,
      status: "Draft",
    });
    writeStore("ta.contentPlans", state.contentPlans);
    render();
  });
  document.querySelectorAll("[data-copy-plan]").forEach((button) => button.addEventListener("click", () => {
    const plan = state.contentPlans.find((item) => item.id === button.dataset.copyPlan);
    copyText(`${plan.date} - ${plan.channel} - ${plan.topic}`, "ÄÃ£ sao chÃ©p káº¿ hoáº¡ch content");
  }));
  document.querySelectorAll("[data-delete-plan]").forEach((button) => button.addEventListener("click", () => {
    state.contentPlans = state.contentPlans.filter((item) => item.id !== button.dataset.deletePlan);
    writeStore("ta.contentPlans", state.contentPlans);
    render();
  }));

  document.querySelectorAll("[data-segmented='task'] button").forEach((button) => button.addEventListener("click", () => {
    state.taskFilter = button.dataset.value;
    render();
  }));
  document.querySelectorAll("[data-task-toggle]").forEach((checkbox) => checkbox.addEventListener("change", () => {
    const task = state.tasks.find((item) => item.id === checkbox.dataset.taskToggle);
    task.done = checkbox.checked;
    task.status = checkbox.checked ? "completed" : "today";
    writeStore("ta.tasks", state.tasks);
    render();
  }));
  document.querySelector("#taskForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#taskTitle").value.trim();
    if (!title) return showToast("Báº¡n cáº§n nháº­p tiÃªu Ä‘á» cÃ´ng viá»‡c");
    const editId = document.querySelector("#taskEditId").value;
    const payload = {
      title,
      description: document.querySelector("#taskDescription").value.trim() || "ChÆ°a cÃ³ mÃ´ táº£.",
      due: document.querySelector("#taskDue").value,
      priority: document.querySelector("#taskPriority").value,
    };
    if (editId) {
      const task = state.tasks.find((item) => item.id === editId);
      if (task && !isReportTask(task)) Object.assign(task, payload);
    } else {
      state.tasks.unshift({ id: crypto.randomUUID(), ...payload, status: "today", done: false });
    }
    writeStore("ta.tasks", state.tasks);
    render();
  });
  document.querySelector("#resetTaskForm")?.addEventListener("click", () => setTaskForm(null));
  document.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => {
    const task = state.tasks.find((item) => item.id === button.dataset.editTask);
    if (task && !isReportTask(task)) setTaskForm(task);
  }));
  document.querySelectorAll("[data-copy-task]").forEach((button) => button.addEventListener("click", () => {
    const task = state.tasks.find((item) => item.id === button.dataset.copyTask);
    copyText(taskCopyText(task), "ÄÃ£ sao chÃ©p cÃ´ng viá»‡c");
  }));
  document.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", () => {
    state.tasks = state.tasks.filter((item) => item.id !== button.dataset.deleteTask);
    writeStore("ta.tasks", state.tasks);
    render();
  }));

  document.querySelectorAll("[data-segmented='prompt'] button").forEach((button) => button.addEventListener("click", () => {
    state.promptFilter = button.dataset.value;
    render();
  }));
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", () => {
    const prompt = state.prompts.find((item) => item.id === button.dataset.favorite);
    prompt.favorite = !prompt.favorite;
    writeStore("ta.prompts", state.prompts);
    render();
  }));
  document.querySelectorAll("[data-prompt-title], [data-prompt-body], [data-prompt-category]").forEach((field) => {
    field.addEventListener("input", () => {
      const id = field.dataset.promptTitle || field.dataset.promptBody || field.dataset.promptCategory;
      const prompt = state.prompts.find((item) => item.id === id);
      if (field.dataset.promptTitle) prompt.title = field.value;
      if (field.dataset.promptBody) prompt.body = field.value;
      if (field.dataset.promptCategory) prompt.category = field.value;
      writeStore("ta.prompts", state.prompts);
    });
  });
  document.querySelectorAll("[data-copy-prompt]").forEach((button) => button.addEventListener("click", () => {
    const prompt = state.prompts.find((item) => item.id === button.dataset.copyPrompt);
    copyText(prompt.body, "ÄÃ£ sao chÃ©p prompt");
  }));
  document.querySelectorAll("[data-delete-prompt]").forEach((button) => button.addEventListener("click", () => {
    state.prompts = state.prompts.filter((item) => item.id !== button.dataset.deletePrompt);
    writeStore("ta.prompts", state.prompts);
    render();
  }));
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  render();
});

document.querySelector("#menuButton").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

document.querySelector("#zoomIn")?.addEventListener("click", () => changeZoom(0.05));
document.querySelector("#zoomOut")?.addEventListener("click", () => changeZoom(-0.05));
window.addEventListener("popstate", () => {
  const page = pageFromPath() || "calendar";
  state.page = page;
  localStorage.setItem("ta.page", page);
  render();
});

function currentStopwatchElapsed() {
  return state.stopwatchRunning ? Date.now() - state.stopwatchStartedAt + state.stopwatchBase : state.stopwatchElapsed;
}

function persistTimers() {
  localStorage.setItem("ta.countdownTotal", String(state.countdownTotal));
  localStorage.setItem("ta.countdownRemaining", String(Math.max(0, Math.floor(state.countdownRemaining))));
  localStorage.setItem("ta.stopwatchElapsed", String(Math.floor(state.stopwatchElapsed)));
}

function updateClockDom() {
  const now = new Date();
  const digital = document.querySelector("#digitalClock");
  if (digital) digital.textContent = now.toLocaleTimeString("vi-VN", { hour12: false });
  const date = document.querySelector("#clockDate");
  if (date) date.textContent = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const sidebarClock = document.querySelector("#sidebarClock");
  if (sidebarClock) sidebarClock.textContent = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const sidebarClockDate = document.querySelector("#sidebarClockDate");
  if (sidebarClockDate) sidebarClockDate.textContent = now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

  const countdown = document.querySelector("#countdownDisplay");
  if (countdown) countdown.textContent = formatDuration(state.countdownRemaining);
  const countdownStatus = document.querySelector("#countdownStatus");
  if (countdownStatus) countdownStatus.textContent = state.countdownRunning ? "Running" : "Ready";

  const stopwatch = document.querySelector("#stopwatchDisplay");
  if (stopwatch) stopwatch.textContent = formatStopwatch(currentStopwatchElapsed());
  const stopwatchStatus = document.querySelector("#stopwatchStatus");
  if (stopwatchStatus) stopwatchStatus.textContent = state.stopwatchRunning ? "Running" : "Ready";
}

function tickClock() {
  const before = Math.ceil(state.countdownRemaining);
  if (state.countdownRunning) {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - 1);
    if (before > 0 && state.countdownRemaining <= 0) {
      state.countdownRunning = false;
      persistTimers();
      triggerAlert("Äáº¿m ngÆ°á»£c Ä‘Ã£ káº¿t thÃºc");
      render();
      return;
    }
    persistTimers();
  }

  if (state.stopwatchRunning) {
    localStorage.setItem("ta.stopwatchElapsed", String(Math.floor(currentStopwatchElapsed())));
  }

  checkAlarms();
  updateClockDom();
}

function checkAlarms() {
  if (!state.alarms.length) return;
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = now.toISOString().slice(0, 10);
  let changed = false;
  state.alarms.forEach((alarm) => {
    if (!alarm.enabled || alarm.time !== current || alarm.lastTriggered === today) return;
    alarm.lastTriggered = today;
    changed = true;
    triggerAlert(alarm.label ? `BÃ¡o thá»©c: ${alarm.label}` : `BÃ¡o thá»©c ${alarm.time}`);
  });
  if (changed) writeStore("ta.alarms", state.alarms);
}

function triggerAlert(message) {
  showToast(message);
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.85);
  } catch {}
}

window.setInterval(tickClock, 1000);
applyZoom();
updateClockDom();
window.addEventListener("document-editor-lib-ready", () => {
  if (state.page === "documents") render();
});
window.addEventListener("document-editor-lib-error", () => {
  if (state.page === "documents") render();
});
document.addEventListener("mousedown", handleDocumentEditorClickAway, true);
ensureDocumentEditorLibraryLoaded();
render();
(async () => {
  if (await initWorkspaceApiRemote()) {
    render();
    return;
  }
  if (await initSupabase()) {
    render();
    await loadRemoteState();
  }
})();
