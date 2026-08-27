const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const {
  DEFAULT_SVG,
  PROJECT_FILE_LIMIT,
  RECENT_KEY,
  SIDEBAR_VIEW_ID,
  VIEW_TYPE,
  buildFileTree,
  formatTimestamp,
  getActiveSvgUri,
  hasOpenSvgTab,
  isSvgPath,
  recordRecentFile,
  removeRecentUri,
  replaceRecentUri,
  validateSvgFileName,
} = require("./sidebar-model");

const SVG_EXCLUDE = "**/{node_modules,.git,dist,out,.vscode,.cursor,xhs-post}/**";

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 32; i += 1) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

class SvgSidebarViewProvider {
  constructor(context) {
    this.context = context;
    this.view = undefined;
    this.refreshTimer = null;
    this.pendingRefresh = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "sidebar"),
        vscode.Uri.joinPath(this.context.extensionUri, "assets"),
      ],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => this.onMessage(message));
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this.refresh();
    });
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) this.view = undefined;
    });
    this.refresh();
  }

  scheduleRefresh() {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh().catch(() => {});
    }, 280);
  }

  postActive() {
    if (!this.view) return;
    this.view.webview.postMessage({
      type: "active",
      activeUri: getActiveSvgUri(vscode.window.tabGroups, VIEW_TYPE),
      hasOpenSvg: hasOpenSvgTab(vscode.window.tabGroups, VIEW_TYPE),
    });
  }

  async refresh() {
    if (!this.view) return;
    const run = this.collectState()
      .then((state) => {
        if (this.view) this.view.webview.postMessage({ type: "state", ...state });
      })
      .catch((error) => {
        vscode.window.showErrorMessage(
          "刷新 SVG 列表失败：" + (error && error.message ? error.message : "未知错误")
        );
      });
    this.pendingRefresh = run;
    return run;
  }

  async collectState() {
    const folders = vscode.workspace.workspaceFolders || [];
    const hasWorkspace = folders.length > 0;
    const now = Date.now();
    const projectFiles = [];
    if (hasWorkspace) {
      const uris = await vscode.workspace.findFiles("**/*.svg", SVG_EXCLUDE, PROJECT_FILE_LIMIT);
      for (const uri of uris) {
        const entry = await this.statFile(uri, now);
        if (entry) projectFiles.push(entry);
      }
    }

    const foldersRoot = folders[0] && folders[0].uri;
    const projectTree = buildFileTree(projectFiles);
    this.attachFolderUris(projectTree, foldersRoot);

    const recentFiles = [];
    for (const item of this.readRecent()) {
      if (!item || !item.uri) continue;
      let uri;
      try {
        uri = vscode.Uri.parse(item.uri);
      } catch (_) {
        continue;
      }
      const entry = await this.statFile(uri, now);
      if (!entry) continue;
      const opened = formatTimestamp(item.openedAt, now);
      entry.openedAt = item.openedAt;
      entry.openedLabel = opened.text;
      recentFiles.push(entry);
    }

    return {
      hasWorkspace,
      workspaceName: folders[0] ? folders[0].name : "",
      hasOpenSvg: hasOpenSvgTab(vscode.window.tabGroups, VIEW_TYPE),
      activeUri: getActiveSvgUri(vscode.window.tabGroups, VIEW_TYPE),
      projectFiles,
      projectTree,
      recentFiles,
    };
  }

  attachFolderUris(node, rootUri) {
    if (!node) return;
    if (rootUri) {
      node.uri = node.path
        ? vscode.Uri.joinPath(rootUri, ...node.path.split("/")).toString()
        : rootUri.toString();
    }
    for (const folder of node.folders || []) this.attachFolderUris(folder, rootUri);
  }

  async statFile(uri, now) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const filePath = uri.fsPath || uri.path || "";
      if (!isSvgPath(filePath)) return null;
      const modified = formatTimestamp(stat.mtime, now);
      return {
        uri: uri.toString(),
        name: path.basename(filePath),
        relativePath: vscode.workspace.asRelativePath(uri, false),
        mtime: stat.mtime,
        modifiedLabel: modified.text,
      };
    } catch (_) {
      return null;
    }
  }

  readRecent() {
    const workspaceRecent = this.context.workspaceState.get(RECENT_KEY);
    if (Array.isArray(workspaceRecent) && workspaceRecent.length) return workspaceRecent;
    const globalRecent = this.context.globalState.get(RECENT_KEY);
    return Array.isArray(globalRecent) ? globalRecent : [];
  }

  async recordRecent(uri) {
    if (!uri || (uri.scheme !== "file" && uri.scheme !== "untitled")) return;
    if (uri.scheme === "untitled") return;
    const key = uri.toString();
    const openedAt = Date.now();
    const workspaceRecent = recordRecentFile(this.context.workspaceState.get(RECENT_KEY), key, openedAt);
    const globalRecent = recordRecentFile(this.context.globalState.get(RECENT_KEY), key, openedAt);
    await this.context.workspaceState.update(RECENT_KEY, workspaceRecent);
    await this.context.globalState.update(RECENT_KEY, globalRecent);
    await this.refresh();
  }

  parseUri(value, svgOnly = false) {
    if (typeof value !== "string" || !value) return null;
    try {
      const uri = vscode.Uri.parse(value);
      if (uri.scheme !== "file") return null;
      const filePath = uri.fsPath || uri.path || "";
      if (svgOnly && !isSvgPath(filePath)) return null;
      return uri;
    } catch (_) {
      return null;
    }
  }

  async onMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "ready" || message.type === "refresh") {
      await this.refresh();
      return;
    }
    if (message.type === "new") {
      await this.createNewSvg();
      return;
    }
    if (message.type === "open") {
      await this.openSvgDialog();
      return;
    }
    if (message.type === "openUri") {
      await this.openSvgUri(this.parseUri(message.uri, true));
      return;
    }
    if (message.type === "rename") {
      await this.renameSvg(this.parseUri(message.uri, true));
      return;
    }
    if (message.type === "delete") {
      await this.deleteSvg(this.parseUri(message.uri, true));
      return;
    }
    if (message.type === "revealOs") {
      await this.revealInOs(this.parseUri(message.uri));
    }
  }

  suggestedNewUri() {
    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!folder) return undefined;
    return vscode.Uri.joinPath(folder.uri, "untitled.svg");
  }

  async createNewSvg() {
    const target = await vscode.window.showSaveDialog({
      defaultUri: this.suggestedNewUri(),
      filters: { "SVG 矢量图": ["svg"] },
      saveLabel: "新建 SVG",
    });
    if (!target) return;
    if (!isSvgPath(target.fsPath || target.path || "")) {
      vscode.window.showErrorMessage("请使用 .svg 作为文件名。");
      return;
    }
    await vscode.workspace.fs.writeFile(target, Buffer.from(DEFAULT_SVG, "utf8"));
    await this.openSvgUri(target);
  }

  async openSvgDialog() {
    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      defaultUri: folder && folder.uri,
      filters: { "SVG 矢量图": ["svg"] },
      openLabel: "用 SVG 手动编辑器打开",
    });
    if (!picked || !picked[0]) return;
    await this.openSvgUri(picked[0]);
  }

  async openSvgUri(uri) {
    if (!uri) return;
    if (!isSvgPath(uri.fsPath || uri.path || "")) {
      vscode.window.showInformationMessage("请选择一个 SVG 文件。");
      return;
    }
    await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
  }

  async updateRecentStore(mutator) {
    const workspaceRecent = mutator(this.context.workspaceState.get(RECENT_KEY));
    const globalRecent = mutator(this.context.globalState.get(RECENT_KEY));
    await this.context.workspaceState.update(RECENT_KEY, workspaceRecent);
    await this.context.globalState.update(RECENT_KEY, globalRecent);
  }

  async renameSvg(uri) {
    if (!uri) return;
    const oldName = path.basename(uri.fsPath || uri.path || "");
    const nextName = await vscode.window.showInputBox({
      prompt: "重命名 SVG",
      value: oldName,
      valueSelection: oldName.toLowerCase().endsWith(".svg")
        ? [0, oldName.length - 4]
        : undefined,
      validateInput(value) {
        const error = validateSvgFileName(value);
        return error || undefined;
      },
    });
    if (!nextName || nextName === oldName) return;
    const dest = vscode.Uri.file(path.join(path.dirname(uri.fsPath), nextName));
    try {
      await vscode.workspace.fs.stat(dest);
      vscode.window.showErrorMessage(`已存在同名文件：${nextName}`);
      return;
    } catch (_) {
      // Destination is free.
    }
    await vscode.workspace.fs.rename(uri, dest, { overwrite: false });
    await this.updateRecentStore((list) => replaceRecentUri(list, uri.toString(), dest.toString()));
    await this.refresh();
  }

  async deleteSvg(uri) {
    if (!uri) return;
    const name = path.basename(uri.fsPath || uri.path || "");
    const confirmed = await vscode.window.showWarningMessage(
      `确定删除 ${name}？此操作无法撤销。`,
      { modal: true },
      "删除"
    );
    if (confirmed !== "删除") return;
    await vscode.workspace.fs.delete(uri, { useTrash: true });
    await this.updateRecentStore((list) => removeRecentUri(list, uri.toString()));
    await this.refresh();
  }

  async revealInOs(uri) {
    if (!uri) return;
    await vscode.commands.executeCommand("revealFileInOS", uri);
  }

  getHtml(webview) {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "sidebar", "sidebar.css")
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "sidebar", "sidebar.js")
    );
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "assets", "icon.png")
    );
    const fontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "sidebar", "fonts", "seti.woff")
    );
    const htmlPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "sidebar",
      "index.html"
    ).fsPath;
    let html = fs.readFileSync(htmlPath, "utf8");
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
    ].join("; ");
    html = html.replace(
      "<!-- CSP -->",
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );
    html = html.replace('href="sidebar.css"', `href="${cssUri}"`);
    html = html.replace('src="sidebar.js"', `nonce="${nonce}" src="${jsUri}"`);
    html = html.replace('src="icon.png"', `src="${iconUri}"`);
    html = html.replace("url(\"seti.woff\")", `url("${fontUri}")`);
    return html;
  }
}

function registerSidebar(context) {
  const provider = new SvgSidebarViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  const watcher = vscode.workspace.createFileSystemWatcher("**/*.svg");
  watcher.onDidCreate(() => provider.scheduleRefresh());
  watcher.onDidChange(() => provider.scheduleRefresh());
  watcher.onDidDelete(() => provider.scheduleRefresh());
  context.subscriptions.push(watcher);

  const syncActive = () => provider.postActive();
  context.subscriptions.push(vscode.window.tabGroups.onDidChangeTabs(syncActive));
  context.subscriptions.push(vscode.window.tabGroups.onDidChangeTabGroups(syncActive));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(syncActive));
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.scheduleRefresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("svgManualEditor.newFile", () => provider.createNewSvg())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("svgManualEditor.openFile", () => provider.openSvgDialog())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("svgManualEditor.refreshSidebar", () => provider.refresh())
  );

  return provider;
}

module.exports = {
  SvgSidebarViewProvider,
  registerSidebar,
};
