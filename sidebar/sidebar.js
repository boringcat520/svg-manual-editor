const vscode = acquireVsCodeApi();
const uiState = vscode.getState() || { collapsed: {} };

const emptyHint = document.getElementById("empty-hint");
const openHint = document.getElementById("open-hint");
const workspaceLabel = document.getElementById("workspace-label");
const recentList = document.getElementById("recent-list");
const recentEmpty = document.getElementById("recent-empty");
const recentCount = document.getElementById("recent-count");
const projectList = document.getElementById("project-list");
const projectEmpty = document.getElementById("project-empty");
const projectCount = document.getElementById("project-count");
const contextMenu = document.getElementById("context-menu");

const FOLDER_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h4.2l1.2 1.3H14.5v7.7H1.5z"/></svg>';
const CHEVRON_RIGHT =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.2v11.6L13.6 8z"/></svg>';
const CHEVRON_DOWN =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 5h11.6L8 13.6z"/></svg>';
const SETI_SVG_CHAR = "\uE091";

document.getElementById("btn-new").addEventListener("click", () => {
  vscode.postMessage({ type: "new" });
});
document.getElementById("btn-open").addEventListener("click", () => {
  vscode.postMessage({ type: "open" });
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;
  if (msg.type === "active") {
    applyActive(msg.activeUri || "", msg.hasOpenSvg);
    return;
  }
  if (msg.type !== "state") return;
  render(msg);
});

document.addEventListener("click", () => hideMenu());
window.addEventListener("blur", () => hideMenu());
window.addEventListener("resize", () => hideMenu());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideMenu();
});

function render(state) {
  workspaceLabel.textContent = state.hasWorkspace
    ? (state.workspaceName || "当前工作区")
    : "未打开工作区";
  emptyHint.classList.toggle("hidden", !!state.hasOpenSvg);
  openHint.classList.toggle("hidden", !state.hasOpenSvg);
  const activeUri = state.activeUri || "";
  if (activeUri) expandFoldersToFile(state.projectTree, activeUri);
  renderRecent(state.recentFiles || [], activeUri);
  renderProject(state.projectTree, state.projectFiles || [], state.hasWorkspace, activeUri);
  revealActiveFile();
}

function applyActive(activeUri, hasOpenSvg) {
  if (typeof hasOpenSvg === "boolean") {
    emptyHint.classList.toggle("hidden", hasOpenSvg);
    openHint.classList.toggle("hidden", !hasOpenSvg);
  }
  for (const el of document.querySelectorAll(".file.is-active, .row.is-file.is-active")) {
    el.classList.remove("is-active");
  }
  if (!activeUri) return;
  for (const el of document.querySelectorAll(".file, .row.is-file")) {
    if (sameUri(el.dataset.uri, activeUri)) el.classList.add("is-active");
  }
  revealActiveFile();
}

function firstChildByClass(node, className) {
  if (!node) return null;
  for (const child of node.children || []) {
    if (child.classList && child.classList.contains(className)) return child;
  }
  return null;
}

function revealActiveFile() {
  const active = document.querySelector(".file.is-active, .row.is-file.is-active");
  if (!active) return;
  let node = active.closest(".tree-folder");
  while (node) {
    const row = firstChildByClass(node, "is-folder");
    const children = firstChildByClass(node, "tree-children");
    if (row && row.dataset.path) uiState.collapsed[row.dataset.path] = false;
    if (children) children.classList.remove("hidden");
    if (row) {
      const chevron = row.querySelector(".chevron");
      if (chevron) chevron.innerHTML = CHEVRON_DOWN;
    }
    const parent = node.parentElement;
    node = parent ? parent.closest(".tree-folder") : null;
  }
  vscode.setState(uiState);
  active.scrollIntoView({ block: "nearest" });
}

function sameUri(a, b) {
  function norm(value) {
    let text = String(value || "");
    try {
      text = decodeURIComponent(text);
    } catch (_) {
      // Keep the original string if it is not encoded.
    }
    return text.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  }
  const left = norm(a);
  const right = norm(b);
  return !!left && left === right;
}

function expandFoldersToFile(tree, activeUri) {
  if (!tree || !activeUri) return;
  function walk(node) {
    let found = (node.files || []).some((file) => sameUri(file.uri, activeUri));
    for (const folder of node.folders || []) {
      if (walk(folder)) {
        uiState.collapsed[folder.path] = false;
        found = true;
      }
    }
    return found;
  }
  walk(tree);
  vscode.setState(uiState);
}

function renderRecent(files, activeUri) {
  recentList.replaceChildren();
  recentCount.textContent = files.length ? String(files.length) : "";
  recentEmpty.classList.toggle("hidden", files.length > 0);
  for (const file of files) {
    recentList.append(renderFileItem(file, "openedLabel", "打开于", true, activeUri));
  }
}

function renderProject(tree, files, hasWorkspace, activeUri) {
  projectList.replaceChildren();
  const count = files.length;
  projectCount.textContent = count ? String(count) : "";
  projectEmpty.classList.toggle("hidden", count > 0);
  if (!hasWorkspace) {
    projectEmpty.textContent = "先打开一个文件夹，才能列出项目里的 SVG。";
    return;
  }
  projectEmpty.textContent = "当前工作区没有 SVG 文件。";
  if (!tree || count === 0) return;
  appendTree(projectList, tree, 0, activeUri);
}

function appendTree(parent, node, depth, activeUri) {
  for (const folder of node.folders || []) {
    parent.append(renderFolderItem(folder, depth, activeUri));
  }
  for (const file of node.files || []) {
    parent.append(renderFileRow(file, depth, "modifiedLabel", "修改于", activeUri));
  }
}

function renderFolderItem(folder, depth, activeUri) {
  const item = document.createElement("li");
  item.className = "tree-folder";
  const collapsed = !!uiState.collapsed[folder.path];
  const row = document.createElement("button");
  row.type = "button";
  row.className = "row is-folder";
  row.dataset.kind = "folder";
  row.dataset.uri = folder.uri || "";
  row.dataset.path = folder.path || "";

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.innerHTML = collapsed ? CHEVRON_RIGHT : CHEVRON_DOWN;

  const icon = document.createElement("span");
  icon.className = "row-icon";
  icon.innerHTML = FOLDER_ICON;

  const main = document.createElement("span");
  main.className = "row-main";
  const name = document.createElement("span");
  name.className = "row-name";
  name.textContent = folder.name || "文件夹";
  main.append(name);

  const count = document.createElement("span");
  count.className = "folder-count";
  count.textContent = String(folder.fileCount || 0);

  row.append(chevron, icon, main, count);
  row.addEventListener("click", () => {
    uiState.collapsed[folder.path] = !uiState.collapsed[folder.path];
    vscode.setState(uiState);
    chevron.innerHTML = uiState.collapsed[folder.path] ? CHEVRON_RIGHT : CHEVRON_DOWN;
    children.classList.toggle("hidden", !!uiState.collapsed[folder.path]);
  });
  bindContext(row, { kind: "folder", uri: folder.uri });

  const children = document.createElement("ul");
  children.className = "tree-children";
  if (collapsed) children.classList.add("hidden");
  appendTree(children, folder, depth + 1, activeUri);

  item.append(row, children);
  return item;
}

function renderFileItem(file, timeKey, timePrefix, showPath, activeUri) {
  const item = document.createElement("li");
  item.append(renderFileButton(file, timeKey, timePrefix, showPath, 0, false, activeUri));
  return item;
}

function renderFileRow(file, depth, timeKey, timePrefix, activeUri) {
  const item = document.createElement("li");
  item.className = "tree-file";
  item.append(renderFileButton(file, timeKey, timePrefix, false, depth, true, activeUri));
  return item;
}

function renderFileButton(file, timeKey, timePrefix, showPath, depth, withIcon, activeUri) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = withIcon ? "row is-file" : "file";
  button.dataset.kind = "file";
  button.dataset.uri = file.uri || "";
  if (sameUri(file.uri, activeUri)) button.classList.add("is-active");

  if (withIcon) {
    const icon = document.createElement("span");
    icon.className = "row-icon file-icon";
    icon.textContent = SETI_SVG_CHAR;
    const main = document.createElement("span");
    main.className = "row-main";
    const name = document.createElement("span");
    name.className = "row-name";
    name.textContent = file.name || "未命名.svg";
    const time = document.createElement("span");
    time.className = "row-time";
    const stamp = file[timeKey] || file.modifiedLabel || "";
    time.textContent = stamp ? `${timePrefix} ${stamp}` : "";
    main.append(name, time);
    button.append(icon, main);
  } else {
    const icon = document.createElement("span");
    icon.className = "row-icon file-icon";
    icon.textContent = SETI_SVG_CHAR;
    const main = document.createElement("span");
    main.className = "row-main";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name || "未命名.svg";
    main.append(name);
    if (showPath) {
      const path = document.createElement("span");
      path.className = "file-path";
      path.textContent = file.relativePath || file.name || "";
      main.append(path);
    }
    const time = document.createElement("span");
    time.className = "file-time";
    const stamp = file[timeKey] || file.modifiedLabel || "";
    time.textContent = stamp ? `${timePrefix} ${stamp}` : "";
    main.append(time);
    button.append(icon, main);
  }

  button.addEventListener("click", () => {
    vscode.postMessage({ type: "openUri", uri: button.dataset.uri });
  });
  bindContext(button, { kind: "file", uri: file.uri });
  return button;
}

function bindContext(target, payload) {
  target.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showMenu(payload, event.clientX, event.clientY);
  });
  target.addEventListener("keydown", (event) => {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      showMenu(payload, rect.left + 12, rect.bottom);
    }
  });
}

function showMenu(payload, x, y) {
  contextMenu.replaceChildren();
  const items = payload.kind === "folder"
    ? [["revealOs", "在文件资源管理器中显示"]]
    : [
        ["openUri", "打开"],
        "sep",
        ["rename", "重命名"],
        ["delete", "删除"],
        "sep",
        ["revealOs", "在文件资源管理器中显示"],
      ];
  for (const item of items) {
    if (item === "sep") {
      const sep = document.createElement("div");
      sep.className = "context-sep";
      contextMenu.append(sep);
      continue;
    }
    const [type, label] = item;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "context-item";
    button.role = "menuitem";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      hideMenu();
      vscode.postMessage({ type, uri: payload.uri });
    });
    contextMenu.append(button);
  }
  contextMenu.classList.remove("hidden");
  const menuWidth = contextMenu.offsetWidth;
  const menuHeight = contextMenu.offsetHeight;
  const left = Math.min(x, window.innerWidth - menuWidth - 8);
  const top = Math.min(y, window.innerHeight - menuHeight - 8);
  contextMenu.style.left = `${Math.max(8, left)}px`;
  contextMenu.style.top = `${Math.max(8, top)}px`;
}

function hideMenu() {
  contextMenu.classList.add("hidden");
  contextMenu.replaceChildren();
}

vscode.postMessage({ type: "ready" });
