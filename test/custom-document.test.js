const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadExtension(initialText = "<svg/>") {
  const files = new Map([["file:///diagram.svg", Buffer.from(initialText)]]);
  class EventEmitter {
    constructor() {
      this.listeners = new Set();
      this.event = (listener) => {
        this.listeners.add(listener);
        return { dispose: () => this.listeners.delete(listener) };
      };
    }
    fire(value) { this.listeners.forEach((listener) => listener(value)); }
    dispose() { this.listeners.clear(); }
  }
  const vscode = {
    EventEmitter,
    Uri: {
      parse(value) { return { toString: () => value, scheme: value.split(":")[0], path: "/diagram.svg" }; },
      file(value) { return { scheme: "file", fsPath: value, path: value, toString: () => `file:///${value}` }; },
      joinPath(base, ...parts) { return { ...base, fsPath: path.join(base.fsPath || "", ...parts) }; },
    },
    workspace: {
      fs: {
        async readFile(uri) { return files.get(uri.toString()); },
        async writeFile(uri, bytes) { files.set(uri.toString(), Buffer.from(bytes)); },
        async createDirectory() {},
        async delete(uri) { files.delete(uri.toString()); },
      },
    },
    window: {},
    commands: {},
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", "extension.js"), "utf8");
  vm.runInNewContext(source, {
    Buffer,
    clearTimeout,
    console,
    module,
    exports: module.exports,
    require(id) {
      if (id === "vscode") return vscode;
      return require(id);
    },
    setTimeout,
  });
  return { ...module.exports, files, vscode };
}

function fileUri() {
  return {
    scheme: "file",
    fsPath: "C:\\work\\diagram.svg",
    path: "/diagram.svg",
    toString() { return "file:///diagram.svg"; },
    with(change) { return { ...this, ...change }; },
  };
}

test("self-managed SVG document reads and automatically writes without a TextDocument", async () => {
  const { SvgCustomDocument, files } = loadExtension("<svg id=\"old\"/>");
  const uri = fileUri();
  const document = await SvgCustomDocument.create(uri, {});
  assert.equal(document.text, "<svg id=\"old\"/>");

  document.updateFromWebview("<svg id=\"new\"/>");
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(files.get(uri.toString()).toString("utf8"), "<svg id=\"new\"/>");
  document.dispose();
});

test("external SVG changes are pushed back into every open editor panel", async () => {
  const { SvgCustomDocument, files } = loadExtension("<svg id=\"first\"/>");
  const uri = fileUri();
  const document = await SvgCustomDocument.create(uri, {});
  const messages = [];
  document.addPanel({ webview: { postMessage(message) { messages.push(message); } } });

  files.set(uri.toString(), Buffer.from("<svg id=\"agent\"/>"));
  await document.reloadFromDisk(true);
  assert.equal(document.text, "<svg id=\"agent\"/>");
  assert.equal(messages.at(-1).type, "load");
  assert.equal(messages.at(-1).text, "<svg id=\"agent\"/>");
  document.dispose();
});
