const RECENT_KEY = "svgManualEditor.recentFiles.v1";
const RECENT_LIMIT = 20;
const PROJECT_FILE_LIMIT = 400;
const VIEW_TYPE = "svgManualEditor.editor";
const SIDEBAR_VIEW_ID = "svgManualEditor.sidebar";

const DEFAULT_SVG = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">',
  "</svg>",
  "",
].join("\n");

function isSvgPath(value) {
  if (typeof value !== "string" || !value) return false;
  const clean = value.split(/[?#]/)[0];
  return /\.svg$/i.test(clean);
}

function recordRecentFile(list, uriString, openedAt = Date.now()) {
  if (!uriString) return Array.isArray(list) ? list.slice(0, RECENT_LIMIT) : [];
  const next = (Array.isArray(list) ? list : []).filter((item) => item && item.uri !== uriString);
  next.unshift({ uri: uriString, openedAt: Number(openedAt) || Date.now() });
  return next.slice(0, RECENT_LIMIT);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatAbsolute(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

function formatTimestamp(ms, now = Date.now()) {
  const time = Number(ms);
  if (!Number.isFinite(time) || time <= 0) {
    return { absolute: "", relative: "", text: "" };
  }
  const absolute = formatAbsolute(time);
  const delta = Math.max(0, Number(now) - time);
  let relative = absolute;
  if (delta < 45 * 1000) relative = "刚刚";
  else if (delta < 60 * 60 * 1000) relative = `${Math.floor(delta / 60000)} 分钟前`;
  else if (delta < 24 * 60 * 60 * 1000) relative = `${Math.floor(delta / 3600000)} 小时前`;
  else if (delta < 7 * 24 * 60 * 60 * 1000) relative = `${Math.floor(delta / 86400000)} 天前`;
  return {
    absolute,
    relative,
    text: relative === absolute ? absolute : `${relative} · ${absolute}`,
  };
}

function svgUriFromInput(input, viewType = VIEW_TYPE) {
  if (!input) return "";
  const uri = input.uri;
  if (!uri) return "";
  const filePath = uri.fsPath || uri.path || "";
  const asString = typeof uri.toString === "function" ? uri.toString() : String(uri);
  if (input.viewType === viewType) return asString;
  if (isSvgPath(filePath)) return asString;
  return "";
}

function getActiveSvgUri(tabGroups, viewType = VIEW_TYPE) {
  if (!tabGroups) return "";
  const groups = Array.isArray(tabGroups.all) ? tabGroups.all : [];
  const activeGroup = tabGroups.activeTabGroup
    || groups.find((group) => group && group.isActive)
    || groups[0];
  const activeTab = activeGroup && (
    activeGroup.activeTab
    || (Array.isArray(activeGroup.tabs) && activeGroup.tabs.find((tab) => tab && tab.isActive))
  );
  return svgUriFromInput(activeTab && activeTab.input, viewType);
}

function urisEqual(a, b) {
  if (!a || !b) return false;
  return normalizeFileUri(a) === normalizeFileUri(b);
}

function normalizeFileUri(value) {
  let text = typeof value === "string" ? value : String(value || "");
  try {
    text = decodeURIComponent(text);
  } catch (_) {
    // Keep the original string if it is not encoded.
  }
  return text.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function hasOpenSvgTab(tabGroups, viewType = VIEW_TYPE) {
  const groups = tabGroups && Array.isArray(tabGroups.all) ? tabGroups.all : [];
  for (const group of groups) {
    for (const tab of group && Array.isArray(group.tabs) ? group.tabs : []) {
      const input = tab && tab.input;
      if (!input) continue;
      if (input.viewType === viewType) return true;
      const uri = input.uri;
      const filePath = uri && (uri.fsPath || uri.path || "");
      if (isSvgPath(filePath)) return true;
    }
  }
  return false;
}

function compareByMtimeThenPath(a, b) {
  const delta = (b.mtime || 0) - (a.mtime || 0);
  if (delta !== 0) return delta;
  return compareName(a.relativePath || a.name, b.relativePath || b.name);
}

function compareName(a, b) {
  return String(a || "").localeCompare(String(b || ""), "zh", { numeric: true, sensitivity: "base" });
}

function splitRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
}

function countTreeFiles(node) {
  if (!node) return 0;
  let total = Array.isArray(node.files) ? node.files.length : 0;
  for (const folder of node.folders || []) total += countTreeFiles(folder);
  return total;
}

function serializeTree(node) {
  const folders = [...node.folders.values()]
    .sort((a, b) => compareName(a.name, b.name))
    .map(serializeTree);
  const files = node.files.slice().sort((a, b) => compareName(a.name, b.name));
  return {
    name: node.name,
    path: node.path,
    folders,
    files,
    fileCount: files.length + folders.reduce((sum, folder) => sum + (folder.fileCount || 0), 0),
  };
}

function buildFileTree(files) {
  const root = { name: "", path: "", folders: new Map(), files: [] };
  for (const file of Array.isArray(files) ? files : []) {
    const parts = splitRelativePath(file.relativePath || file.name);
    const fileName = parts.pop() || file.name || "未命名.svg";
    let node = root;
    const trail = [];
    for (const folder of parts) {
      trail.push(folder);
      if (!node.folders.has(folder)) {
        node.folders.set(folder, {
          name: folder,
          path: trail.join("/"),
          folders: new Map(),
          files: [],
        });
      }
      node = node.folders.get(folder);
    }
    node.files.push({ ...file, name: fileName });
  }
  return serializeTree(root);
}

function validateSvgFileName(value) {
  const name = String(value || "").trim();
  if (!name) return "文件名不能为空";
  if (!/\.svg$/i.test(name)) return "文件名需以 .svg 结尾";
  if (name === "." || name === ".." || name === ".svg") return "文件名无效";
  if (/[<>:"/\\|?*\u0000]/.test(name)) return "文件名包含非法字符";
  return "";
}

function replaceRecentUri(list, fromUri, toUri) {
  const from = String(fromUri || "");
  const to = String(toUri || "");
  if (!from || !to) return Array.isArray(list) ? list.slice() : [];
  return recordRecentFile(
    (Array.isArray(list) ? list : []).filter((item) => item && item.uri !== from && item.uri !== to),
    to,
    Date.now()
  );
}

function removeRecentUri(list, uriString) {
  const uri = String(uriString || "");
  return (Array.isArray(list) ? list : []).filter((item) => item && item.uri !== uri);
}

module.exports = {
  DEFAULT_SVG,
  PROJECT_FILE_LIMIT,
  RECENT_KEY,
  RECENT_LIMIT,
  SIDEBAR_VIEW_ID,
  VIEW_TYPE,
  buildFileTree,
  compareByMtimeThenPath,
  countTreeFiles,
  formatTimestamp,
  getActiveSvgUri,
  hasOpenSvgTab,
  isSvgPath,
  recordRecentFile,
  removeRecentUri,
  replaceRecentUri,
  splitRelativePath,
  urisEqual,
  validateSvgFileName,
};
