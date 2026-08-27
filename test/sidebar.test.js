const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  DEFAULT_SVG,
  RECENT_LIMIT,
  buildFileTree,
  compareByMtimeThenPath,
  countTreeFiles,
  formatTimestamp,
  getActiveSvgUri,
  hasOpenSvgTab,
  urisEqual,
  isSvgPath,
  recordRecentFile,
  removeRecentUri,
  replaceRecentUri,
  validateSvgFileName,
} = require("../sidebar-model");

test("recordRecentFile puts the newest uri first and drops duplicates", () => {
  const first = recordRecentFile([], "file:///a.svg", 10);
  assert.deepEqual(first, [{ uri: "file:///a.svg", openedAt: 10 }]);
  const second = recordRecentFile(first, "file:///b.svg", 20);
  assert.equal(second[0].uri, "file:///b.svg");
  assert.equal(second[1].uri, "file:///a.svg");
  const again = recordRecentFile(second, "file:///a.svg", 30);
  assert.equal(again[0].uri, "file:///a.svg");
  assert.equal(again[0].openedAt, 30);
  assert.equal(again.length, 2);
});

test("recordRecentFile caps the list", () => {
  let list = [];
  for (let i = 0; i < RECENT_LIMIT + 5; i += 1) {
    list = recordRecentFile(list, `file:///n${i}.svg`, i + 1);
  }
  assert.equal(list.length, RECENT_LIMIT);
  assert.equal(list[0].uri, `file:///n${RECENT_LIMIT + 4}.svg`);
});

test("formatTimestamp shows relative time plus an absolute stamp", () => {
  const now = Date.parse("2026-08-27T15:20:00+08:00");
  assert.equal(formatTimestamp(now - 20 * 1000, now).relative, "刚刚");
  const fiveMinutes = formatTimestamp(now - 5 * 60 * 1000, now);
  assert.equal(fiveMinutes.relative, "5 分钟前");
  assert.match(fiveMinutes.text, /5 分钟前 · \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.equal(formatTimestamp(0, now).text, "");
});

test("getActiveSvgUri reads the active tab svg", () => {
  assert.equal(getActiveSvgUri({ all: [] }), "");
  assert.equal(
    getActiveSvgUri({
      activeTabGroup: {
        activeTab: {
          input: {
            viewType: "svgManualEditor.editor",
            uri: { fsPath: "C:/work/a.svg", path: "/work/a.svg", toString: () => "file:///C:/work/a.svg" },
          },
        },
      },
      all: [],
    }),
    "file:///C:/work/a.svg"
  );
  assert.equal(
    getActiveSvgUri({
      activeTabGroup: {
        activeTab: {
          input: {
            uri: { fsPath: "C:/work/plain.svg", toString: () => "file:///C:/work/plain.svg" },
          },
        },
      },
      all: [],
    }),
    "file:///C:/work/plain.svg"
  );
  assert.equal(
    getActiveSvgUri({
      activeTabGroup: {
        activeTab: { input: { uri: { fsPath: "notes.md", toString: () => "file:///notes.md" } } },
      },
      all: [],
    }),
    ""
  );
});

test("urisEqual ignores encoding, slash style and case", () => {
  assert.equal(urisEqual("file:///C:/work/a.svg", "file:///c%3A/work/a.svg"), true);
  assert.equal(urisEqual("file:///C:/work/a.svg", "file:///C:\\work\\a.svg"), true);
  assert.equal(urisEqual("file:///C:/work/a.svg", "file:///C:/work/b.svg"), false);
  assert.equal(urisEqual("", "file:///C:/work/a.svg"), false);
});

test("hasOpenSvgTab detects the custom editor and plain svg tabs", () => {
  assert.equal(hasOpenSvgTab({ all: [] }), false);
  assert.equal(
    hasOpenSvgTab({
      all: [{ tabs: [{ input: { viewType: "svgManualEditor.editor" } }] }],
    }),
    true
  );
  assert.equal(
    hasOpenSvgTab({
      all: [{ tabs: [{ input: { uri: { fsPath: "C:\\\\work\\\\figure.svg" } } }] }],
    }),
    true
  );
  assert.equal(
    hasOpenSvgTab({
      all: [{ tabs: [{ input: { uri: { fsPath: "readme.md" } } }] }],
    }),
    false
  );
});

test("isSvgPath and empty-svg template stay conservative", () => {
  assert.equal(isSvgPath("figure.SVG"), true);
  assert.equal(isSvgPath("figure.svg?cache=1"), true);
  assert.equal(isSvgPath("notes.md"), false);
  assert.match(DEFAULT_SVG, /viewBox="0 0 800 600"/);
});

test("project files sort by newest mtime then path", () => {
  const files = [
    { relativePath: "b.svg", mtime: 1 },
    { relativePath: "a.svg", mtime: 2 },
    { relativePath: "c.svg", mtime: 2 },
  ];
  files.sort(compareByMtimeThenPath);
  assert.deepEqual(files.map((item) => item.relativePath), ["a.svg", "c.svg", "b.svg"]);
});

test("sidebar page offers new/open plus recent and project lists", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sidebar", "index.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "sidebar", "sidebar.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "..", "sidebar", "sidebar.css"), "utf8");
  assert.match(html, /id="btn-new"/);
  assert.match(html, /id="btn-open"/);
  assert.match(html, /id="recent-list"/);
  assert.match(html, /id="project-list"/);
  assert.match(html, /class="brand-icon"/);
  assert.match(html, /id="context-menu"/);
  assert.match(css, /\.context-item[\s\S]*text-align:\s*left/);
  assert.match(css, /\.context-item:hover/);
  assert.match(html, /还没有打开 SVG/);
  assert.match(js, /打开于/);
  assert.match(js, /修改于/);
  assert.match(js, /type: "openUri"/);
  assert.match(js, /重命名/);
  assert.match(js, /在文件资源管理器中显示/);
  assert.doesNotMatch(js, /revealExplorer/);
  assert.match(js, /renderFolderItem/);
  assert.match(js, /CHEVRON_DOWN/);
  assert.match(js, /file-icon/);
  assert.doesNotMatch(js, /spacer\.className = "chevron"/);
  assert.match(js, /is-active/);
  assert.match(js, /type === "active"/);
  assert.match(js, /revealActiveFile/);
  assert.match(css, /\.row\.is-file\.is-active/);
  assert.match(css, /border-radius: 5px/);
  assert.match(css, /\.row\.is-file \.row-name[\s\S]*font-weight: 600/);
  assert.match(css, /\.block h2[\s\S]*letter-spacing: 0/);
  assert.match(css, /\.folder-count[\s\S]*font-size: 13px/);
  assert.doesNotMatch(css, /\.file-list li \+ li \{[\s\S]*border-top/);
  assert.doesNotMatch(css, /\.tree-file \+ \.tree-file \{[\s\S]*border-top/);
  const view = fs.readFileSync(path.join(__dirname, "..", "sidebar-view.js"), "utf8");
  assert.match(view, /postActive/);
  assert.match(view, /onDidChangeTabGroups/);
  assert.match(view, /activeUri: getActiveSvgUri/);
});

test("buildFileTree groups svg files under nested folders", () => {
  const tree = buildFileTree([
    { name: "root.svg", relativePath: "root.svg" },
    { name: "one.svg", relativePath: "assets/one.svg" },
    { name: "two.svg", relativePath: "assets/icons/two.svg" },
    { name: "win.svg", relativePath: "figures\\win.svg" },
  ]);
  assert.equal(countTreeFiles(tree), 4);
  assert.equal(tree.files[0].name, "root.svg");
  assert.equal(tree.folders[0].name, "assets");
  assert.equal(tree.folders[0].fileCount, 2);
  assert.equal(tree.folders[0].files[0].name, "one.svg");
  assert.equal(tree.folders[0].folders[0].name, "icons");
  assert.equal(tree.folders[0].folders[0].files[0].name, "two.svg");
  assert.equal(tree.folders[1].name, "figures");
});

test("validateSvgFileName rejects unsafe names", () => {
  assert.equal(validateSvgFileName("figure.svg"), "");
  assert.equal(validateSvgFileName("notes.md"), "文件名需以 .svg 结尾");
  assert.equal(validateSvgFileName("a/b.svg"), "文件名包含非法字符");
  const renamed = replaceRecentUri([{ uri: "file:///a.svg", openedAt: 1 }], "file:///a.svg", "file:///b.svg");
  assert.equal(renamed[0].uri, "file:///b.svg");
  assert.equal(removeRecentUri(renamed, "file:///b.svg").length, 0);
});
