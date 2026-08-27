const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { VIEW_TYPE } = require("./sidebar-model");

const PREFERENCES_KEY = "svgManualEditor.preferences.v1";

class SvgCustomDocument {
  constructor(uri, text) {
    this.uri = uri;
    this.text = text;
    this.panels = new Set();
    this.writeTimer = null;
    this.writeQueue = Promise.resolve();
    this.writing = false;
    this.disposed = false;
    this.watchListener = null;
    this.onWriteError = null;
  }

  static async create(uri, openContext) {
    let bytes;
    if (openContext && openContext.untitledDocumentData) {
      bytes = openContext.untitledDocumentData;
    } else {
      const source = openContext && openContext.backupId
        ? vscode.Uri.parse(openContext.backupId)
        : uri;
      bytes = await vscode.workspace.fs.readFile(source);
    }
    const document = new SvgCustomDocument(uri, Buffer.from(bytes).toString("utf8"));
    if (openContext && openContext.backupId) document.scheduleWrite();
    return document;
  }

  addPanel(panel) {
    this.panels.add(panel);
  }

  removePanel(panel) {
    this.panels.delete(panel);
  }

  postLoad(panel) {
    panel.webview.postMessage({
      type: "load",
      text: this.text,
      fileName: path.basename(this.uri.fsPath || this.uri.path),
    });
  }

  broadcastLoad(exceptPanel) {
    for (const panel of this.panels) {
      if (panel !== exceptPanel) this.postLoad(panel);
    }
  }

  updateFromWebview(text, sourcePanel) {
    if (typeof text !== "string" || text === this.text) return false;
    this.text = text;
    this.broadcastLoad(sourcePanel);
    this.scheduleWrite();
    return true;
  }

  scheduleWrite() {
    if (this.disposed) return;
    clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flush().catch((error) => this.reportWriteError(error));
    }, 120);
  }

  async writeText(target, text) {
    await vscode.workspace.fs.writeFile(target, Buffer.from(text, "utf8"));
  }

  async flush(target = this.uri) {
    clearTimeout(this.writeTimer);
    this.writeTimer = null;
    const snapshot = this.text;
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      this.writing = true;
      try {
        await this.writeText(target, snapshot);
      } finally {
        this.writing = false;
      }
    });
    return this.writeQueue;
  }

  reportWriteError(error) {
    if (typeof this.onWriteError === "function") this.onWriteError(error);
  }

  async reloadFromDisk(force = false) {
    if (this.disposed || (!force && (this.writing || this.writeTimer))) return;
    const bytes = await vscode.workspace.fs.readFile(this.uri);
    const diskText = Buffer.from(bytes).toString("utf8");
    if (diskText === this.text) return;
    this.text = diskText;
    this.broadcastLoad();
  }

  startWatching() {
    if (this.uri.scheme !== "file" || this.watchListener) return;
    const filePath = this.uri.fsPath;
    this.watchListener = (current, previous) => {
      if (
        this.disposed ||
        (current.mtimeMs === previous.mtimeMs && current.size === previous.size)
      ) {
        return;
      }
      this.reloadFromDisk().catch((error) => {
        if (error && error.code !== "FileNotFound") this.reportWriteError(error);
      });
    };
    fs.watchFile(filePath, { interval: 500, persistent: false }, this.watchListener);
  }

  async backup(destination) {
    const parentPath = destination.path.replace(/\/[^/]*$/, "") || "/";
    await vscode.workspace.fs.createDirectory(destination.with({ path: parentPath }));
    await this.writeText(destination, this.text);
    return {
      id: destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(destination);
        } catch (_) {
          // The editor host may already have removed this backup.
        }
      },
    };
  }

  dispose() {
    if (this.disposed) return;
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
      this.flush().catch((error) => this.reportWriteError(error));
    }
    this.disposed = true;
    if (this.watchListener && this.uri.scheme === "file") {
      fs.unwatchFile(this.uri.fsPath, this.watchListener);
    }
    this.panels.clear();
  }
}

class SvgManualEditorProvider {
  static register(context, onDocumentOpened) {
    const provider = new SvgManualEditorProvider(context, onDocumentOpened);
    return vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    });
  }

  constructor(context, onDocumentOpened) {
    this.context = context;
    this.onDocumentOpened = onDocumentOpened;
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChangeCustomDocument = this.changeEmitter.event;
  }

  async openCustomDocument(uri, openContext) {
    const document = await SvgCustomDocument.create(uri, openContext || {});
    document.onWriteError = (error) => {
      vscode.window.showErrorMessage(
        "实时保存 SVG 失败：" + (error && error.message ? error.message : "未知错误")
      );
    };
    document.startWatching();
    return document;
  }

  async resolveCustomEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "editor"),
        vscode.Uri.joinPath(this.context.extensionUri, "assets"),
      ],
    };
    document.addPanel(webviewPanel);
    webviewPanel.onDidDispose(() => document.removePanel(webviewPanel));
    webviewPanel.webview.onDidReceiveMessage((message) =>
      this.onMessage(document, webviewPanel, message)
    );
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);
    if (typeof this.onDocumentOpened === "function") {
      Promise.resolve(this.onDocumentOpened(document.uri)).catch(() => {});
    }
  }

  async onMessage(document, webviewPanel, msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "ready") {
      document.postLoad(webviewPanel);
      const preferences = this.context.globalState.get(PREFERENCES_KEY);
      if (preferences && typeof preferences === "object") {
        webviewPanel.webview.postMessage({ type: "preferences", value: preferences });
      }
      return;
    }
    if (msg.type === "preferences" && msg.value && typeof msg.value === "object") {
      const previous = this.context.globalState.get(PREFERENCES_KEY);
      const next = previous && typeof previous === "object" ? { ...previous, ...msg.value } : msg.value;
      if (previous && Array.isArray(previous.recentSymbols) && !Array.isArray(msg.value.recentSymbols)) {
        next.recentSymbols = previous.recentSymbols;
      }
      if (previous && Array.isArray(previous.recentColors) && !Array.isArray(msg.value.recentColors)) {
        next.recentColors = previous.recentColors;
      }
      await this.context.globalState.update(PREFERENCES_KEY, next);
      return;
    }
    if (msg.type === "export-file") {
      await this.exportFile(document, webviewPanel, msg);
      return;
    }
    if ((msg.type === "edit" || msg.type === "save") && typeof msg.text === "string") {
      document.updateFromWebview(msg.text, webviewPanel);
      if (msg.type === "save") {
        try {
          await document.flush();
        } catch (error) {
          document.reportWriteError(error);
        }
      }
    }
  }

  async saveCustomDocument(document, cancellation) {
    if (cancellation && cancellation.isCancellationRequested) return;
    await document.flush();
  }

  async saveCustomDocumentAs(document, destination, cancellation) {
    if (cancellation && cancellation.isCancellationRequested) return;
    await document.writeText(destination, document.text);
  }

  async revertCustomDocument(document, cancellation) {
    if (cancellation && cancellation.isCancellationRequested) return;
    await document.reloadFromDisk(true);
  }

  async backupCustomDocument(document, context, cancellation) {
    if (cancellation && cancellation.isCancellationRequested) {
      return { id: context.destination.toString(), delete() {} };
    }
    return document.backup(context.destination);
  }

  async exportFile(document, webviewPanel, msg) {
    if (typeof msg.base64 !== "string" || typeof msg.fileName !== "string") return;
    try {
      if (msg.base64.length > 400 * 1024 * 1024) throw new Error("导出图片过大");
      const safeName = path.basename(msg.fileName).replace(/[<>:"/\\|?*]/g, "_");
      const extension = path.extname(safeName).slice(1).toLowerCase() || "png";
      const labels = {
        png: "PNG 图片",
        jpg: "JPEG 图片",
        jpeg: "JPEG 图片",
        webp: "WebP 图片",
        svg: "SVG 矢量图",
      };
      const quick = msg.direct === true && document.uri.scheme === "file";
      let target;
      if (quick) {
        const folder = path.dirname(document.uri.fsPath);
        let targetName = safeName;
        const requestedPath = path.resolve(folder, targetName);
        if (requestedPath.toLowerCase() === path.resolve(document.uri.fsPath).toLowerCase()) {
          const ext = path.extname(targetName);
          targetName = path.basename(targetName, ext) + "_export" + ext;
        }
        target = vscode.Uri.file(path.join(folder, targetName));
      } else {
        const defaultUri = document.uri.scheme === "file"
          ? vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), safeName))
          : undefined;
        target = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { [labels[extension] || "图片文件"]: [extension] },
          saveLabel: "导出图片",
        });
      }
      if (!target) {
        webviewPanel.webview.postMessage({ type: "export-result", ok: false, canceled: true });
        return;
      }
      await vscode.workspace.fs.writeFile(target, Buffer.from(msg.base64, "base64"));
      webviewPanel.webview.postMessage({
        type: "export-result",
        ok: true,
        fileName: path.basename(target.fsPath || safeName),
        quick,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        "导出图片失败：" + (error && error.message ? error.message : "未知错误")
      );
      webviewPanel.webview.postMessage({ type: "export-result", ok: false });
    }
  }

  getHtml(webview) {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "editor", "editor.css")
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "editor", "editor.js")
    );
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "assets", "icon.png")
    );
    const htmlPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "editor",
      "index.html"
    ).fsPath;
    let html = fs.readFileSync(htmlPath, "utf8");
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data: blob:`,
      `font-src ${webview.cspSource} data:`,
    ].join("; ");
    html = html.replace(
      "<!-- CSP -->",
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );
    html = html.replace('href="editor.css"', `href="${cssUri}"`);
    html = html.replace('src="editor.js"', `nonce="${nonce}" src="${jsUri}"`);
    html = html.replace('src="../assets/icon.png"', `src="${iconUri}"`);
    html = html.replace("<body>", '<body class="in-vscode">');
    html = html.replace("<!-- BOOT -->", "");
    return html;
  }
}

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 32; i += 1) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function activate(context) {
  const { registerSidebar } = require("./sidebar-view");
  const sidebar = registerSidebar(context);
  context.subscriptions.push(
    SvgManualEditorProvider.register(context, (uri) => sidebar.recordRecent(uri))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("svgManualEditor.open", async (uri) => {
      const target = uri || vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        vscode.window.showInformationMessage("请先选中一个 SVG 文件。");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", target, VIEW_TYPE);
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  SvgCustomDocument,
  SvgManualEditorProvider,
};
