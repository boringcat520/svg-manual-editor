const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeNode {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.type = id.includes("toggle") ? "checkbox" : "text";
    this.checked = id === "smart-toggle";
    this.value = "";
    this.dataset = {};
    this.style = { removeProperty(name) { delete this[name]; } };
    this.attributes = [];
    this.childNodes = [];
    this.clientWidth = 1000;
    this.clientHeight = 600;
    const classes = new Set();
    this.classList = {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      },
      contains(name) { return classes.has(name); },
    };
  }
  addEventListener() {}
  setAttribute(name, value) { this[name] = String(value); }
  getAttribute(name) { return this[name] ?? null; }
  hasAttribute(name) { return this[name] !== undefined; }
  removeAttribute(name) { delete this[name]; }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child, ref) {
    child.parentNode = this;
    const index = ref ? this.childNodes.indexOf(ref) : 0;
    this.childNodes.splice(index < 0 ? 0 : index, 0, child);
    return child;
  }
  removeChild(child) {
    this.childNodes = this.childNodes.filter((node) => node !== child);
    if (child) child.parentNode = null;
    return child;
  }
  remove() {
    if (!this.parentNode || !Array.isArray(this.parentNode.childNodes)) return;
    this.parentNode.childNodes = this.parentNode.childNodes.filter((node) => node !== this);
    this.parentNode = null;
  }
  replaceChildren(...children) { this.childNodes = children; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getContext() { return { fillStyle: "#000000" }; }
}

function loadEditor(options = {}) {
  const nodes = new Map();
  const storage = new Map(Object.entries(options.storage || {}));
  const selectIds = new Set(["prop-ff", "prop-line-style", "prop-line-join", "prop-arrow-ends"]);
  const getNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, new FakeNode(id, selectIds.has(id) ? "select" : "div"));
    return nodes.get(id);
  };
  const document = {
    getElementById: getNode,
    querySelectorAll() { return []; },
    createElementNS(_ns, tag) { return new FakeNode("", tag); },
    createElement(tag) { return new FakeNode("", tag); },
  };
  const window = { addEventListener() {}, __SVG_BOOT__: undefined };
  const vscodeApi = {
    state: options.vscodeState || null,
    postMessage() {},
    getState() { return this.state; },
    setState(value) { this.state = value; },
  };
  const context = {
    acquireVsCodeApi: () => vscodeApi,
    atob,
    clearTimeout,
    console,
    document,
    getComputedStyle: () => ({ fill: "none", stroke: "none", fontSize: "16px" }),
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    setTimeout,
    TextDecoder,
    Uint8Array,
    window,
    XMLSerializer: class { serializeToString() { return "<svg/>"; } },
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "editor", "editor.js"), "utf8");
  vm.runInContext(source, context);
  return { editor: window.svgManualEditor, nodes, storage, vscodeApi };
}

function box(left, top, width, height, tag = "rect") {
  return {
    tag,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    cx: left + width / 2,
    cy: top + height / 2,
  };
}

test("horizontal smart spacing detects equal gaps between and after shapes", () => {
  const { editor } = loadEditor();
  const movingBetween = box(100, 0, 50, 50);
  const between = editor.horizontalSpacingCandidates(
    movingBetween,
    [box(0, 0, 50, 50), box(200, 0, 50, 50)],
    7,
    1
  );
  assert.equal(between[0].delta, 0);
  assert.equal(between[0].guides.length, 2);
  assert.equal(between[0].guides[0].distance, 50);

  const after = editor.horizontalSpacingCandidates(
    box(203, 0, 50, 50),
    [box(0, 0, 50, 50), box(100, 0, 50, 50)],
    7,
    1
  );
  assert.equal(after[0].delta, -3);
  assert.equal(after[0].guides[0].distance, 50);
});

test("vertical smart spacing and alignment return magnetic corrections", () => {
  const { editor, nodes } = loadEditor();
  const vertical = editor.verticalSpacingCandidates(
    box(0, 203, 50, 50),
    [box(0, 0, 50, 50), box(0, 100, 50, 50)],
    7,
    1
  );
  assert.equal(vertical[0].delta, -3);
  assert.equal(vertical[0].guides[0].distance, 50);

  editor.view.w = 1000;
  editor.boundsOf = () => box(96, 300, 40, 40);
  const aligned = editor.smartSnap([], [box(100, 0, 40, 40, "circle")], new Set(["rect"]), false);
  assert.equal(aligned.dx, 4);
  assert.equal(aligned.guides[0].kind, "align");

  nodes.get("smart-toggle").checked = false;
  assert.deepEqual(
    JSON.parse(JSON.stringify(editor.smartSnap([], [], new Set(), false))),
    { dx: 0, dy: 0, guides: [] }
  );
});

test("resizing a rectangle snaps to another shape's width and height", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const rect = new FakeNode("moving", "rect");
  rect.setAttribute("x", 100);
  rect.setAttribute("y", 120);
  rect.setAttribute("width", 94);
  rect.setAttribute("height", 76);
  const targets = [box(300, 200, 100, 80)];

  const guides = editor.resizeRect(rect, "se", 196, 198, targets, false);
  assert.equal(Number(rect.getAttribute("width")), 100);
  assert.equal(Number(rect.getAttribute("height")), 80);
  assert.deepEqual(JSON.parse(JSON.stringify(guides.map((guide) => guide.label))), ["同宽 100", "同高 80"]);
  assert.deepEqual(JSON.parse(JSON.stringify(guides.map((guide) => guide.axis))), ["x", "y"]);
  assert.equal(guides[0].matchLine.x1, guides[0].matchLine.x2);
  assert.equal(guides[1].matchLine.y1, guides[1].matchLine.y2);
  assert.ok(guides[1].matchLine.x1 < 100);
  assert.ok(guides[1].matchLine.x2 > 400);
});

test("resize handles use the correct directional mouse cursors", () => {
  const { editor, nodes } = loadEditor();
  assert.equal(editor.resizeCursor("n"), "ns-resize");
  assert.equal(editor.resizeCursor("e"), "ew-resize");
  assert.equal(editor.resizeCursor("nw"), "nwse-resize");
  assert.equal(editor.resizeCursor("ne"), "nesw-resize");

  editor.addHandle(20, 30, { kind: "shape", pos: "se" });
  const handle = nodes.get("overlay").childNodes.at(-1);
  assert.equal(handle.getAttribute("class"), "handle vertex resize-handle resize-se");

  editor.addHandle(40, 50, { kind: "text", pos: "nw" });
  const textHandle = nodes.get("overlay").childNodes.at(-1);
  assert.equal(textHandle.getAttribute("class"), "handle vertex resize-handle resize-nw");
});

test("text drag threshold distinguishes a click from an intentional move", () => {
  const { editor } = loadEditor();
  const drag = { pending: true, clientStart: { x: 100, y: 100 } };

  assert.equal(editor.dragThresholdPassed(drag, { clientX: 103, clientY: 104 }), false);
  assert.equal(drag.pending, true);
  assert.equal(editor.dragThresholdPassed(drag, { clientX: 107, clientY: 100 }), true);
  assert.equal(drag.pending, false);
  assert.equal(editor.dragThresholdPassed(drag, { clientX: 101, clientY: 100 }), true);
});

test("text editor metrics follow the current SVG screen scale without clipping", () => {
  const { editor } = loadEditor();
  const text = new FakeNode("scaled-text", "text");
  text.style.fontSize = "20px";
  text.getScreenCTM = () => ({ a: 2, b: 0 });

  const metrics = editor.textEditMetrics(text, { width: 100, height: 40 });
  assert.equal(metrics.fontSize, 40);
  assert.equal(metrics.width, 118);
  assert.ok(metrics.height >= 64);
});

test("top text toolbar applies color, font, size and character styles to multiple texts", () => {
  const { editor } = loadEditor();
  const first = new FakeNode("first-text", "text");
  const second = new FakeNode("second-text", "text");
  first.style.fontSize = "18px";
  second.style.fontSize = "22px";
  editor.selected = [first, second];

  editor.applyTextFormat("color", "#245a8d");
  editor.applyTextFormat("font-family", "Microsoft YaHei, PingFang SC, sans-serif");
  editor.applyTextFormat("font-size", 26);
  editor.applyTextFormat("bold");
  editor.applyTextFormat("italic");
  editor.applyTextFormat("underline");

  [first, second].forEach((text) => {
    assert.equal(text.getAttribute("fill"), "#245a8d");
    assert.equal(text.style.fontFamily, "Microsoft YaHei, PingFang SC, sans-serif");
    assert.equal(text.style.fontSize, "26px");
    assert.equal(text.style.fontWeight, "700");
    assert.equal(text.style.fontStyle, "italic");
    assert.equal(text.style.textDecoration, "underline");
  });
  clearTimeout(editor._propTimer);
});

test("property panel exposes style, alignment and line spacing when text is selected", () => {
  const { editor, nodes } = loadEditor();
  const text = new FakeNode("box-title", "text");
  text.style.fontSize = "20px";
  text.setAttribute("text-anchor", "middle");
  text.getBBox = () => ({ x: 100, y: 40, width: 80, height: 24 });
  editor.selected = [text];
  editor.syncLineStyleMenu = () => {};
  editor.syncPropLineStylePreview = () => {};
  editor.updateProps();

  assert.equal(nodes.get("prop-group-text").classList.contains("hidden"), false);
  assert.equal(nodes.get("prop-bold").disabled, false);
  assert.equal(nodes.get("prop-align-center").disabled, false);
  assert.equal(nodes.get("prop-align-center").getAttribute("aria-pressed"), "true");

  editor.applyTextFormat("bold");
  assert.equal(text.style.fontWeight, "700");
  assert.equal(nodes.get("prop-bold").getAttribute("aria-pressed"), "true");
  assert.equal(nodes.get("top-bold").getAttribute("aria-pressed"), "true");

  editor.applyTextFormat("align", "end");
  assert.equal(text.getAttribute("text-anchor"), "end");
  assert.equal(nodes.get("prop-align-right").getAttribute("aria-pressed"), "true");
  assert.equal(nodes.get("prop-align-center").getAttribute("aria-pressed"), "false");

  const label = new FakeNode("line-label", "text");
  label.setAttribute("data-line-label-for", "line-abc");
  editor.selected = [label];
  editor.syncTextToolbar();
  assert.equal(nodes.get("prop-bold").disabled, false);
  assert.equal(nodes.get("prop-align-left").disabled, true);
  assert.equal(nodes.get("prop-line-spacing").disabled, true);
  clearTimeout(editor._propTimer);
});

test("Office-style color palette applies editable SVG gradients and can return to a solid color", () => {
  const { editor, nodes } = loadEditor();
  assert.equal(nodes.get("text-color-theme").childNodes.length, 60);
  assert.equal(nodes.get("text-color-standard").childNodes.length, 10);
  assert.equal(nodes.get("text-color-gradients").childNodes.length, 14);
  const text = new FakeNode("gradient-text", "text");
  editor.selected = [text];

  editor.applyTextGradient("#d9e8fb", "#2f6db2");
  assert.match(text.getAttribute("fill"), /^url\(#text-gradient-/);
  assert.equal(text.getAttribute("data-text-color-preview"), "#d9e8fb");
  assert.match(text.getAttribute("data-text-gradient-preview"), /linear-gradient/);
  assert.equal(nodes.get("content").childNodes[0].tagName, "DEFS");

  editor.applyTextFormat("color", "#245a8d");
  assert.equal(text.getAttribute("fill"), "#245a8d");
  assert.equal(text.hasAttribute("data-text-color-preview"), false);
  assert.equal(text.hasAttribute("data-text-gradient-preview"), false);
  clearTimeout(editor._propTimer);
});

test("top alignment buttons update SVG text anchors without diagonal or positional ambiguity", () => {
  const { editor } = loadEditor();
  const text = new FakeNode("aligned-text", "text");
  text.getBBox = () => ({ x: 100, y: 40, width: 80, height: 24 });
  editor.selected = [text];

  editor.applyTextFormat("align", "start");
  assert.equal(text.getAttribute("text-anchor"), "start");
  assert.equal(Number(text.getAttribute("x")), 100);

  editor.applyTextFormat("align", "middle");
  assert.equal(text.getAttribute("text-anchor"), "middle");
  assert.equal(Number(text.getAttribute("x")), 140);

  editor.applyTextFormat("align", "end");
  assert.equal(text.getAttribute("text-anchor"), "end");
  assert.equal(Number(text.getAttribute("x")), 180);
  clearTimeout(editor._propTimer);
});

test("justify uses editable SVG spacing and normal alignment clears it", () => {
  const { editor } = loadEditor();
  const text = new FakeNode("justified-text", "text");
  text.getBBox = () => ({ x: 100, y: 40, width: 120, height: 24 });
  editor.selected = [text];

  editor.applyTextFormat("align", "justify");
  assert.equal(text.getAttribute("data-text-justify"), "true");
  assert.equal(text.getAttribute("text-anchor"), "start");
  assert.equal(Number(text.getAttribute("x")), 100);
  assert.equal(Number(text.getAttribute("textLength")), 120);
  assert.equal(text.getAttribute("lengthAdjust"), "spacing");

  editor.applyTextFormat("align", "end");
  assert.equal(text.getAttribute("data-text-justify"), null);
  assert.equal(text.getAttribute("textLength"), null);
  assert.equal(text.getAttribute("text-anchor"), "end");
  clearTimeout(editor._propTimer);
});

test("line spacing distributes separately selected SVG text lines", () => {
  const { editor } = loadEditor();
  const first = new FakeNode("line-one", "text");
  const second = new FakeNode("line-two", "text");
  first.setAttribute("y", 100);
  second.setAttribute("y", 130);
  first.style.fontSize = "20px";
  second.style.fontSize = "20px";
  editor.selected = [first, second];

  editor.applyTextFormat("line-spacing", 2);
  assert.equal(Number(first.getAttribute("y")), 100);
  assert.equal(Number(second.getAttribute("y")), 140);
  assert.equal(first.getAttribute("data-line-spacing"), "2");
  assert.equal(second.getAttribute("data-line-spacing"), "2");

  editor.applyTextFormat("line-spacing", 1.2);
  assert.equal(Number(second.getAttribute("y")), 124);
  assert.equal(second.getAttribute("data-line-spacing"), "1.2");
  clearTimeout(editor._propTimer);
});

test("text editing Enter inserts a line instead of committing", () => {
  const { editor, nodes } = loadEditor();
  const text = new FakeNode("title", "text");
  text.setAttribute("x", "40");
  text.setAttribute("y", "80");
  text.setAttribute("font-size", "16");
  text.textContent = "第一行";
  editor.selected = [text];
  editor.commit = (label) => { editor.lastCommit = label; };
  editor.syncConnectorLabels = () => {};
  editor.refreshHits = () => {};
  editor.redrawOverlay = () => {};
  editor.updateProps = () => {};
  editor.pruneUnusedArrowheadMarkers = () => {};
  editor.pruneDanglingGlue = () => {};
  editor.syncJustifiedText = () => {};
  editor.queueSync = () => {};

  editor.startTextEdit(text);
  assert.equal(nodes.get("text-input").value, "第一行");
  nodes.get("text-input").value = "第一行\n第二行";
  editor.commitTextEdit();
  const spans = text.childNodes.filter((node) => String(node.tagName).toLowerCase() === "tspan");
  assert.equal(spans.length, 2);
  assert.equal(spans[0].textContent, "第一行");
  assert.equal(spans[1].textContent, "第二行");
  assert.equal(editor.textElementPlainText(text), "第一行\n第二行");
  assert.equal(editor.lastCommit, "已修改文字");
});

test("Alt bypasses equal-size snapping while resizing", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const rect = new FakeNode("moving", "rect");
  rect.setAttribute("x", 100);
  rect.setAttribute("y", 120);
  rect.setAttribute("width", 94);
  rect.setAttribute("height", 76);

  const guides = editor.resizeRect(rect, "se", 196, 198, [box(300, 200, 100, 80)], true);
  assert.equal(Number(rect.getAttribute("width")), 96);
  assert.equal(Number(rect.getAttribute("height")), 78);
  assert.deepEqual(JSON.parse(JSON.stringify(guides)), []);
});

test("Ctrl keeps width and height proportional while resizing", () => {
  const { editor } = loadEditor();
  const origin = { x: 100, y: 120, w: 100, h: 50 };
  const rect = new FakeNode("scaled", "rect");
  rect.setAttribute("x", origin.x);
  rect.setAttribute("y", origin.y);
  rect.setAttribute("width", origin.w);
  rect.setAttribute("height", origin.h);

  editor.resizeRect(rect, "se", 300, 220, [], false, origin);
  assert.equal(Number(rect.getAttribute("x")), 100);
  assert.equal(Number(rect.getAttribute("y")), 120);
  assert.equal(Number(rect.getAttribute("width")), 200);
  assert.equal(Number(rect.getAttribute("height")), 100);

  rect.setAttribute("x", origin.x);
  rect.setAttribute("y", origin.y);
  rect.setAttribute("width", origin.w);
  rect.setAttribute("height", origin.h);
  editor.resizeRect(rect, "e", 250, 145, [], false, origin);
  assert.equal(Number(rect.getAttribute("width")), 150);
  assert.equal(Number(rect.getAttribute("height")), 75);
  assert.equal(Number(rect.getAttribute("x")), 100);
  assert.equal(Number(rect.getAttribute("y")), 107.5);
});

test("selected text exposes box resize handles", () => {
  const { editor, nodes } = loadEditor();
  const text = new FakeNode("caption", "text");
  text.isConnected = true;
  text.getBBox = () => ({ x: 10, y: 20, width: 80, height: 24 });
  editor.selected = [text];
  editor.redrawOverlay();

  const handles = nodes.get("overlay").childNodes.filter((node) =>
    String(node.getAttribute("class") || "").includes("resize-handle")
  );
  assert.equal(handles.length, 8);
  assert.equal(handles[4].getAttribute("class"), "handle vertex resize-handle resize-se");
  assert.equal(handles[4]._ed.kind, "text");
  assert.equal(handles[4]._ed.el, text);

  const label = new FakeNode("line-label", "text");
  label.isConnected = true;
  label.setAttribute("data-line-label-for", "line-abc");
  label.getBBox = () => ({ x: 30, y: 40, width: 40, height: 16 });
  editor.selected = [label];
  editor.redrawOverlay();
  const labelHandles = nodes.get("overlay").childNodes.filter((node) =>
    String(node.getAttribute("class") || "").includes("resize-handle")
  );
  assert.equal(labelHandles.length, 0);
});

test("resizing text scales font size and baseline with the box", () => {
  const { editor } = loadEditor();
  const text = new FakeNode("caption", "text");
  text.style.fontSize = "20px";
  text.setAttribute("font-size", "20");
  text.setAttribute("x", "40");
  text.setAttribute("y", "80");
  const span1 = new FakeNode("", "tspan");
  span1.setAttribute("x", "40");
  span1.setAttribute("y", "80");
  const span2 = new FakeNode("", "tspan");
  span2.setAttribute("x", "40");
  span2.setAttribute("y", "104");
  text.appendChild(span1);
  text.appendChild(span2);
  const origin = {
    x: 10,
    y: 20,
    w: 80,
    h: 24,
    fontSize: 20,
    textX: 40,
    textY: 80,
    tspans: [
      { x: 40, y: 80 },
      { x: 40, y: 104 },
    ],
  };

  editor.resizeText(text, "se", 170, 68, [], false, origin);
  assert.equal(Number(text.getAttribute("font-size")), 40);
  assert.equal(text.style.fontSize, "40px");
  assert.equal(Number(text.getAttribute("x")), 70);
  assert.equal(Number(text.getAttribute("y")), 140);
  assert.equal(Number(span1.getAttribute("x")), 70);
  assert.equal(Number(span1.getAttribute("y")), 140);
  assert.equal(Number(span2.getAttribute("x")), 70);
  assert.equal(Number(span2.getAttribute("y")), 188);
});

test("resizing shows live width and height labels", () => {
  const { editor } = loadEditor();
  const guides = editor.boxDimensionGuides(box(200, 100, 120, 80));
  assert.equal(guides.length, 2);
  assert.equal(guides[0].kind, "dimension");
  assert.equal(guides[0].label, "宽 120");
  assert.equal(guides[1].kind, "dimension");
  assert.equal(guides[1].label, "高 80");
});

test("flowchart shape geometry is preserved for each menu shape", () => {
  const { editor } = loadEditor();
  const diamond = editor.createFlowShapeElement("diamond");
  editor.updateFlowShapeGeometry(diamond, "diamond", 10, 20, 120, 80);
  assert.equal(diamond.tagName, "POLYGON");
  assert.equal(diamond.getAttribute("points"), "70,20 130,60 70,100 10,60");

  const ellipse = editor.createFlowShapeElement("ellipse");
  editor.updateFlowShapeGeometry(ellipse, "ellipse", 20, 30, 100, 60);
  assert.equal(ellipse.tagName, "ELLIPSE");
  assert.equal(Number(ellipse.getAttribute("cx")), 70);
  assert.equal(Number(ellipse.getAttribute("ry")), 30);

  const terminator = editor.createFlowShapeElement("terminator");
  editor.updateFlowShapeGeometry(terminator, "terminator", 0, 0, 140, 50);
  assert.equal(terminator.tagName, "RECT");
  assert.equal(Number(terminator.getAttribute("rx")), 25);
});

test("arrow endpoints snap to the nearest shape-side midpoint", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const anchors = [
    { x: 100, y: 50, side: "右" },
    { x: 50, y: 0, side: "上" },
  ];
  const snapped = editor.snapEndpoint(94, 52, anchors, false);
  assert.equal(snapped.x, 100);
  assert.equal(snapped.y, 50);
  assert.equal(snapped.anchor.side, "右");

  const strongerCapture = editor.snapEndpoint(83, 50, anchors, false);
  assert.equal(strongerCapture.x, 100);
  assert.equal(strongerCapture.y, 50);
  assert.equal(strongerCapture.anchor.side, "右");

  const far = editor.snapEndpoint(70, 70, anchors, false);
  assert.equal(far.anchor, null);
  assert.equal(far.x, 70);
  assert.equal(far.y, 70);

  const bypassed = editor.snapEndpoint(94, 52, anchors, true);
  assert.equal(bypassed.anchor, null);
  assert.equal(bypassed.x, 94);
  assert.equal(bypassed.y, 52);
});

test("arrow direction modes always create one two-point straight segment", () => {
  const { editor } = loadEditor();
  const start = { x: 20, y: 40 };
  const endpoint = { x: 180, y: 140, anchor: null, guides: [] };
  assert.deepEqual(JSON.parse(JSON.stringify(editor.straightArrowPoints(start, endpoint, "free"))), [
    { x: 20, y: 40 },
    { x: 180, y: 140 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.straightArrowPoints(start, endpoint, "horizontal"))), [
    { x: 20, y: 40 },
    { x: 180, y: 40 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.straightArrowPoints(start, endpoint, "vertical"))), [
    { x: 20, y: 40 },
    { x: 20, y: 140 },
  ]);
});

test("arrow endpoints magnetically align in height and column with other arrow endpoints", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const targets = [
    { x: 200, y: 100 },
    { x: 320, y: 220 },
  ];

  const sameHeight = editor.snapToArrowEndpoints(140, 106, targets, false);
  assert.equal(sameHeight.x, 140);
  assert.equal(sameHeight.y, 100);
  assert.equal(sameHeight.snappedY, true);
  assert.equal(sameHeight.guides[0].label, "端点等高");

  const sameColumn = editor.snapToArrowEndpoints(194, 160, targets, false);
  assert.equal(sameColumn.x, 200);
  assert.equal(sameColumn.y, 160);
  assert.equal(sameColumn.snappedX, true);
  assert.equal(sameColumn.guides[0].label, "端点同列");

  const bypassed = editor.snapToArrowEndpoints(194, 106, targets, true);
  assert.equal(bypassed.x, 194);
  assert.equal(bypassed.y, 106);
  assert.equal(bypassed.guides.length, 0);
});

test("all four-side connection anchors appear only while dragging", () => {
  const { editor, nodes } = loadEditor();
  editor.collectConnectionAnchors = () => [
    { x: 100, y: 20, side: "上" },
    { x: 180, y: 60, side: "右" },
    { x: 100, y: 100, side: "下" },
    { x: 20, y: 60, side: "左" },
  ];

  editor.connectionAnchorsVisible = true;
  editor.redrawOverlay();
  assert.equal(nodes.get("overlay").childNodes.length, 4);
  nodes.get("overlay").childNodes.forEach((anchor) => {
    assert.equal(anchor.getAttribute("class"), "connection-anchor connection-anchor-candidate");
  });

  editor.connectionAnchorsVisible = false;
  editor.redrawOverlay();
  assert.equal(nodes.get("overlay").childNodes.length, 0);
});

test("new connector points are routed only horizontally and vertically", () => {
  const { editor } = loadEditor();
  let points = editor.appendOrthogonalPoint([{ x: 0, y: 0 }], { x: 100, y: 50 });
  points = editor.appendOrthogonalPoint(points, { x: 160, y: 100 });
  assert.ok(points.length >= 4);
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y);
  });
});

test("polyline preview handles are visual-only and cannot intercept clicks", () => {
  const { editor, nodes } = loadEditor();
  editor.addHandle(120, 80, { kind: "preview" });
  const preview = nodes.get("overlay").childNodes.at(-1);
  assert.equal(preview.getAttribute("class"), "handle vertex preview-handle");
  assert.equal(preview.getAttribute("pointer-events"), "none");
  assert.equal(preview._ed, undefined);

  editor.addHandle(140, 80, { kind: "path", vertexIndex: 1 });
  const editable = nodes.get("overlay").childNodes.at(-1);
  assert.equal(editable._ed.kind, "path");
});

test("polyline creation snaps both endpoints and stores an orthogonal route", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const startAnchor = { x: 100, y: 50, side: "右" };
  const endpointTarget = { x: 300, y: 200 };
  editor.collectConnectionAnchors = () => [startAnchor];
  editor.collectArrowEndpoints = () => [endpointTarget];
  editor.commit = () => {};

  editor.addPolyPoint({ x: 95, y: 55 }, false);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.polyPoints[0])), { x: 100, y: 50 });
  assert.equal(editor.polyStartAnchor.side, "右");

  editor.addPolyPoint({ x: 295, y: 205 }, false);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.polyPoints.at(-1))), { x: 300, y: 200 });
  assert.equal(editor.polyPoints.length, 3, "two clicks must stay an L, with no approach stubs");
  editor.polyPoints.slice(0, -1).forEach((point, index) => {
    const next = editor.polyPoints[index + 1];
    assert.ok(point.x === next.x || point.y === next.y);
  });

  editor.finishPolyline();
  const connector = editor.selected[0];
  assert.equal(connector.getAttribute("data-routing"), "orthogonal");
  assert.equal(connector.getAttribute("data-arrow-mode"), "manual");
});

test("legacy manual polylines become constrained when every segment is orthogonal", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("legacy-polyline", "path");
  connector.setAttribute("d", "M0,0 L100,0 L100,80 L220,80");
  connector.setAttribute("data-routing", "manual");
  connector.setAttribute("data-arrow-mode", "manual");

  assert.equal(editor.upgradeLegacyOrthogonalConnector(connector), true);
  assert.equal(connector.getAttribute("data-routing"), "orthogonal");

  const model = editor.createOrthogonalModel(connector, 2);
  editor.applyOrthogonalDrag(model, 140, 120);
  const points = editor.connectorPoints(connector);
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y, "dragging must not create a V segment");
  });
});

test("the rotate icon turns only the arrowhead and leaves line geometry unchanged", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("arrow", "path");
  connector.setAttribute("d", "M0,0 L100,0");
  connector.setAttribute("marker-end", "url(#arrow)");
  connector.setAttribute("data-arrow-mode", "horizontal");
  let installed = null;
  editor.installRotatedArrowMarker = (el, attribute, baseReference, angle) => {
    installed = { el, attribute, baseReference, angle };
    editor.setConnectorMarkerReference(el, attribute, "url(#rotated-arrow)");
  };
  editor.syncConnectorMarkers = () => {};
  editor.commit = () => {};

  const angle = editor.rotateArrowheadClockwise(connector);

  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  assert.equal(angle, 90);
  assert.equal(installed.attribute, "marker-end");
  assert.equal(installed.baseReference, "url(#arrow)");
  assert.equal(installed.angle, 90);
  assert.equal(connector.getAttribute("data-arrowhead-rotation-end"), "90");
  assert.equal(connector.getAttribute("data-arrow-mode"), "horizontal");
});

test("rotating an orthogonal arrowhead does not change bends or route axes", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("orthogonal-arrow", "path");
  connector.setAttribute("d", "M0,0 L100,0 L100,60");
  connector.setAttribute("marker-end", "url(#arrow)");
  connector.setAttribute("data-routing", "orthogonal");
  connector.setAttribute("data-start-axis", "horizontal");
  connector.setAttribute("data-end-axis", "vertical");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "horizontal", startIndex: 0, endIndex: 1 }])
  );
  editor.installRotatedArrowMarker = (el, attribute) => {
    editor.setConnectorMarkerReference(el, attribute, "url(#rotated-arrow)");
  };
  editor.syncConnectorMarkers = () => {};
  editor.commit = () => {};
  const before = JSON.parse(JSON.stringify(editor.connectorPoints(connector)));

  editor.rotateArrowheadClockwise(connector);

  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), before);
  assert.equal(connector.getAttribute("data-start-axis"), "horizontal");
  assert.equal(connector.getAttribute("data-end-axis"), "vertical");
  assert.equal(editor.connectorRouteControls(connector)[0].axis, "horizontal");
});

test("selected arrows expose a clickable clockwise rotate icon", () => {
  const { editor, nodes } = loadEditor();
  editor.view.w = 1000;
  const connector = new FakeNode("arrow", "path");
  connector.setAttribute("marker-end", "url(#arrow)");

  editor.addConnectorRotateHandle(connector, { x: 20, y: 30, width: 100, height: 60 });

  const handle = nodes.get("overlay").childNodes.at(-1);
  assert.equal(handle.getAttribute("class"), "connector-rotate-handle");
  assert.equal(handle.getAttribute("aria-label"), "顺时针旋转箭头头部90度");
  assert.equal(handle.childNodes[2].textContent, "↻");
  assert.equal(handle._ed.kind, "rotate");
});

function selectorMatches(el, selector) {
  return selector
    .split(",")
    .map((part) => part.trim())
    .some((part) => {
      const exact = part.match(/^\[([\w-]+)="([^"]*)"\]$/);
      if (exact) return el.getAttribute(exact[1]) === exact[2];
      const bare = part.match(/^\[([\w-]+)\]$/);
      if (bare) return el.hasAttribute(bare[1]);
      if (part.startsWith(".")) return Boolean(el.classList && el.classList.contains(part.slice(1)));
      return el.tagName.toLowerCase() === part;
    });
}

function stubContent(nodes, all) {
  const content = nodes.get("content");
  content.querySelectorAll = (selector) => all.filter((el) => selectorMatches(el, selector));
  return content;
}

function glueShape(id, x, y, width, height) {
  const shape = new FakeNode(id, "rect");
  shape.box = { x, y, width, height };
  shape.getBBox = () => shape.box;
  shape.moveTo = (nextX, nextY) => {
    shape.box = { ...shape.box, x: nextX, y: nextY };
  };
  return shape;
}

function glueArrow(id, d) {
  const arrow = new FakeNode(id, "path");
  arrow.setAttribute("d", d);
  arrow.setAttribute("marker-end", "url(#arrow)");
  arrow.setAttribute("data-routing", "manual");
  return arrow;
}

test("an endpoint released on a shape side stays glued and follows the shape", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L820,150");
  stubContent(nodes, [shape, arrow]);

  editor.recordDragGlue({
    type: "handle",
    endpointAnchor: { el: shape, side: "右", x: 600, y: 150 },
    data: { kind: "path", el: arrow, endpoint: true, atStart: true },
  });
  assert.equal(arrow.getAttribute("data-start-glue-side"), "右");
  assert.equal(arrow.getAttribute("data-start-glue"), shape.getAttribute("data-glue-id"));

  shape.moveTo(440, 130);
  const rerouted = editor.reflowGluedConnectors([shape]);
  assert.equal(rerouted.length, 1);
  assert.equal(rerouted[0], arrow);

  const points = JSON.parse(JSON.stringify(editor.connectorPoints(arrow)));
  assert.deepEqual(points[0], { x: 640, y: 180 }, "glued end must sit on the shape side");
  assert.deepEqual(points.at(-1), { x: 820, y: 150 }, "free end must not move");
});

test("a two-point orthogonal glue follow never grows extra vertices", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L820,150");
  arrow.setAttribute("data-routing", "orthogonal");
  stubContent(nodes, [shape, arrow]);
  editor.setConnectorGlue(arrow, true, { el: shape, side: "右" });

  shape.moveTo(440, 40);
  editor.reflowGluedConnectors([shape]);

  const points = JSON.parse(JSON.stringify(editor.connectorPoints(arrow)));
  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { x: 640, y: 90 });
  assert.deepEqual(points[1], { x: 820, y: 150 });
});

test("moving a shape slides only the glued end and keeps hand-made bends", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L700,150 L700,400 L900,400");
  arrow.setAttribute("data-routing", "orthogonal");
  stubContent(nodes, [shape, arrow]);
  editor.setConnectorGlue(arrow, true, { el: shape, side: "右" });

  shape.moveTo(400, 40);
  editor.reflowGluedConnectors([shape]);

  const points = JSON.parse(JSON.stringify(editor.connectorPoints(arrow)));
  assert.deepEqual(points[0], { x: 600, y: 90 });
  assert.deepEqual(points.at(-1), { x: 900, y: 400 });
  assert.equal(points.length, 4, "the bend count must stay stable");
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y, "glue must not create a diagonal");
  });
});

test("a connector glued at both ends rides along when both shapes travel together", () => {
  const { editor, nodes } = loadEditor();
  const left = glueShape("left", 100, 100, 100, 100);
  const right = glueShape("right", 400, 100, 100, 100);
  const arrow = glueArrow("arrow", "M200,150 L300,150 L300,220 L400,220");
  arrow.setAttribute("data-routing", "orthogonal");
  stubContent(nodes, [left, right, arrow]);
  editor.setConnectorGlue(arrow, true, { el: left, side: "右" });
  editor.setConnectorGlue(arrow, false, { el: right, side: "左" });
  // The right anchor sits at the side midpoint, so line up the route with it first.
  editor.reflowGluedConnectors([left, right]);

  left.moveTo(140, 160);
  right.moveTo(440, 160);
  editor.reflowGluedConnectors([left, right]);

  const points = JSON.parse(JSON.stringify(editor.connectorPoints(arrow)));
  assert.deepEqual(points[0], { x: 240, y: 210 });
  assert.deepEqual(points.at(-1), { x: 440, y: 210 });
});

test("releasing an endpoint away from any shape drops the glue", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L820,150");
  stubContent(nodes, [shape, arrow]);
  editor.setConnectorGlue(arrow, true, { el: shape, side: "右" });

  editor.recordDragGlue({
    type: "handle",
    endpointAnchor: null,
    data: { kind: "path", el: arrow, endpoint: true, atStart: true },
  });

  assert.equal(arrow.hasAttribute("data-start-glue"), false);
  shape.moveTo(440, 130);
  assert.equal(editor.reflowGluedConnectors([shape]).length, 0);
  assert.equal(arrow.getAttribute("d"), "M600,150 L820,150");
});

test("clicking a node without dragging never silently unglues the connector", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L820,150");
  stubContent(nodes, [shape, arrow]);
  editor.setConnectorGlue(arrow, true, { el: shape, side: "右" });

  editor.recordDragGlue({
    type: "handle",
    data: { kind: "path", el: arrow, endpoint: true, atStart: true },
  });

  assert.equal(arrow.getAttribute("data-start-glue-side"), "右");
});

test("glue pointing at a deleted shape is cleaned up instead of lingering", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  const arrow = glueArrow("arrow", "M600,150 L820,150");
  const live = [shape, arrow];
  stubContent(nodes, live);
  editor.setConnectorGlue(arrow, true, { el: shape, side: "右" });

  live.splice(live.indexOf(shape), 1);
  editor.pruneDanglingGlue();

  assert.equal(arrow.hasAttribute("data-start-glue"), false);
  assert.equal(arrow.hasAttribute("data-start-glue-side"), false);
});

test("opening an older diagram adopts endpoints that already sit on a shape side", () => {
  const { editor, nodes } = loadEditor();
  const shape = glueShape("box", 400, 100, 200, 100);
  shape.setAttribute("data-ed-id", "shape-1");
  shape.closest = () => null;
  const onSide = glueArrow("attached", "M600,150 L820,150");
  const nearby = glueArrow("loose", "M604,150 L820,150");
  [onSide, nearby].forEach((el) => { el.closest = () => null; });
  stubContent(nodes, [shape, onSide, nearby]);

  assert.equal(editor.inferConnectorGlue(), 1);
  assert.equal(onSide.getAttribute("data-start-glue-side"), "右");
  assert.equal(nearby.hasAttribute("data-start-glue"), false);

  shape.moveTo(400, 200);
  editor.reflowGluedConnectors([shape]);
  assert.equal(editor.connectorPoints(onSide)[0].y, 250);
  assert.equal(editor.connectorPoints(nearby)[0].y, 150);
});

test("the rotate icon keeps clear of connector node handles near the viewport edge", () => {
  const { editor } = loadEditor();
  // The reported case: an up-right arrow whose bounding box touches the top and
  // right edges of the visible area, so the icon used to be clamped straight
  // onto the arrow endpoint handle.
  editor.view = { x: 1385, y: 362, w: 215, h: 165 };
  const box = { x: 1390, y: 370, width: 196.5, height: 146 };
  const vertices = [
    { x: 1390, y: 516 },
    { x: 1481.8, y: 516 },
    { x: 1481.8, y: 473 },
    { x: 1586.5, y: 473 },
    { x: 1586.5, y: 370 },
  ];
  editor.overlayHandlePoints = vertices.map((vertex) => ({ ...vertex }));

  const scale = editor.view.w / 1000;
  const radius = 10 * scale;
  const spot = editor.connectorRotateHandlePosition(box, radius);

  vertices.forEach((vertex) => {
    const distance = Math.hypot(spot.x - vertex.x, spot.y - vertex.y);
    assert.ok(distance > radius + 5, `rotate icon covers the node at ${vertex.x},${vertex.y}`);
  });
  assert.ok(spot.x >= editor.view.x && spot.x <= editor.view.x + editor.view.w);
  assert.ok(spot.y >= editor.view.y && spot.y <= editor.view.y + editor.view.h);
});

test("committing drops rotated arrowhead markers that nothing references", () => {
  const { editor, nodes } = loadEditor();
  const content = nodes.get("content");
  const keptId = "arrowhead-end-inuse";
  const marker = (id) => {
    const node = new FakeNode(id, "marker");
    node.id = id;
    node.remove = () => { node.removed = true; };
    node.closest = () => null;
    return node;
  };
  const markers = [marker("arrowhead-end-orphan"), marker(keptId), marker("arrow")];
  const arrow = new FakeNode("arrow-path", "path");
  arrow.setAttribute("marker-end", `url(#${keptId})`);
  arrow.closest = () => null;
  content.querySelectorAll = (selector) => (selector === "marker" ? markers : [arrow]);

  editor.pruneUnusedArrowheadMarkers();

  assert.equal(markers[0].removed, true);
  assert.equal(markers[1].removed, undefined);
  assert.equal(markers[2].removed, undefined, "hand-written markers must survive");
});

test("dragging a bend straightens diagonal segments without moving endpoints", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M579,164 L579,288 L306,285 L282,344");
  const model = editor.createOrthogonalModel(connector, 2);
  editor.applyOrthogonalDrag(model, 340, 260);
  const points = editor.connectorPoints(connector);

  assert.deepEqual(JSON.parse(JSON.stringify(points[0])), { x: 579, y: 164 });
  assert.deepEqual(JSON.parse(JSON.stringify(points.at(-1))), { x: 282, y: 344 });
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y);
  });
});

test("moving a manual two-point connector endpoint never creates an automatic elbow", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L100,0");
  connector.setAttribute("data-routing", "manual");
  connector.setAttribute("data-arrow-mode", "horizontal");
  const endpoint = editor.constrainExistingStraightEndpoint(connector, false, 120, 80);
  assert.deepEqual(JSON.parse(JSON.stringify(endpoint)), { x: 120, y: 0 });
  assert.equal(editor.connectorPoints(connector).length, 2);
});

test("snapping to a shape never inserts extra vertices", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M210,190 L210,250");
  connector.setAttribute("data-routing", "orthogonal");
  connector.setAttribute("marker-end", "url(#arrow)");
  editor.syncConnectorMarkers = () => {};
  editor.writeConnectorPoints(connector, [
    { x: 210, y: 190 },
    { x: 210, y: 220 },
    { x: 181, y: 220 },
    { x: 181, y: 300 },
  ]);

  editor.snapOrthogonalConnectorToAnchor(
    connector,
    { x: 181, y: 300, side: "上" },
    false,
    [
      { x: 210, y: 190 },
      { x: 210, y: 250 },
    ]
  );

  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), [
    { x: 210, y: 190 },
    { x: 181, y: 300 },
  ]);
});

test("dragging a two-point orthogonal endpoint does not insert elbows", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M210,190 L210,250");
  const model = editor.createOrthogonalModel(connector, 1);
  assert.equal(model.points.length, 2);
  editor.applyOrthogonalDrag(model, 181, 300);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), [
    { x: 210, y: 190 },
    { x: 210, y: 300 },
  ]);
});

test("an arrow enters each shape side from the correct direction", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const base = [{ x: 300, y: 0 }, { x: 300, y: 100 }];
  const cases = [
    [{ x: 200, y: 200, side: "右" }, (previous, end) => previous.x > end.x && previous.y === end.y],
    [{ x: 200, y: 200, side: "左" }, (previous, end) => previous.x < end.x && previous.y === end.y],
    [{ x: 200, y: 200, side: "上" }, (previous, end) => previous.y < end.y && previous.x === end.x],
    [{ x: 200, y: 200, side: "下" }, (previous, end) => previous.y > end.y && previous.x === end.x],
  ];
  cases.forEach(([anchor, isCorrect]) => {
    const points = editor.appendAnchoredEndpoint(base, anchor);
    assert.ok(isCorrect(points.at(-2), points.at(-1)), `wrong approach for ${anchor.side}`);
  });
});

test("snapping a folded arrow to a shape only moves that endpoint", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("folded-arrow", "path");
  connector.setAttribute("d", "M300,0 L300,100 L260,100 L260,160");
  connector.setAttribute("marker-end", "url(#rotated-arrow)");
  connector.setAttribute("data-routing", "controlled-orthogonal");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "vertical", startIndex: 1, endIndex: 2 }])
  );
  connector.setAttribute("data-arrowhead-base-end", "url(#arrow)");
  connector.setAttribute("data-arrowhead-rotation-end", "90");
  connector.setAttribute("data-arrowhead-marker-end", "rotated-arrow");
  editor.syncConnectorMarkers = () => {};

  editor.snapOrthogonalConnectorToAnchor(
    connector,
    { x: 200, y: 200, side: "右" },
    false
  );

  const points = editor.connectorPoints(connector);
  assert.deepEqual(JSON.parse(JSON.stringify(points)), [
    { x: 300, y: 0 },
    { x: 300, y: 100 },
    { x: 260, y: 100 },
    { x: 200, y: 200 },
  ]);
  assert.equal(connector.getAttribute("data-routing"), "controlled-orthogonal");
  assert.equal(editor.connectorRouteControls(connector).length, 1);
  assert.equal(connector.getAttribute("marker-end"), "url(#arrow)");
  assert.equal(connector.hasAttribute("data-arrowhead-rotation-end"), false);
});

test("adding a node creates one orthogonal control without moving either endpoint", () => {
  const { editor } = loadEditor();
  const inserted = editor.insertConnectorNodePoints([
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 50 },
  ]);
  assert.equal(inserted.points.length, 7);
  assert.equal(inserted.controls.length, 1);
  assert.equal(inserted.controls[0].axis, "horizontal");
  assert.deepEqual(JSON.parse(JSON.stringify(inserted.points.at(0))), { x: 0, y: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(inserted.points.at(-1))), { x: 200, y: 50 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(inserted.points[inserted.controls[0].startIndex])),
    JSON.parse(JSON.stringify(inserted.points[inserted.controls[0].startIndex - 1]))
  );
});

test("dragging the added control creates only right-angle segments", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  const inserted = editor.insertConnectorNodePoints([{ x: 0, y: 0 }, { x: 0, y: 300 }]);
  editor.writeConnectorPoints(connector, inserted.points);
  connector.setAttribute("data-route-controls", JSON.stringify(inserted.controls));

  editor.moveConnectorRouteControl(connector, 0, 100, 150);

  const points = editor.connectorPoints(connector);
  assert.deepEqual(JSON.parse(JSON.stringify(points)), [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 200 },
    { x: 0, y: 200 },
    { x: 0, y: 300 },
  ]);
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y);
  });
  assert.equal(points.at(-2).x, points.at(-1).x);
});

test("offset endpoints get one minimal three-segment dogleg", () => {
  const { editor } = loadEditor();
  const inserted = editor.insertConnectorNodePoints([
    { x: 250, y: 0 },
    { x: 150, y: 300 },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(inserted.points)), [
    { x: 250, y: 0 },
    { x: 250, y: 100 },
    { x: 150, y: 100 },
    { x: 150, y: 300 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(inserted.controls)), [
    { axis: "horizontal", startIndex: 1, endIndex: 2 },
  ]);
});

test("route controls snap to their own connector endpoints before other targets", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M70,96 L70,120 L350,120 L350,0");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "horizontal", startIndex: 1, endIndex: 2 }])
  );
  const targets = [
    { x: 70, y: 96, priority: 0, source: "own-endpoint" },
    { x: 200, y: 104, priority: 1, source: "shape-anchor" },
  ];

  const snapped = editor.snapConnectorRouteControl(connector, 0, 210, 107, targets, false);
  assert.equal(snapped.snapped, true);
  assert.equal(snapped.y, 96);
  assert.equal(snapped.guides[0].axis, "y");
  assert.equal(snapped.guides[0].label, "折线与连接点等高");

  const bypassed = editor.snapConnectorRouteControl(connector, 0, 210, 107, targets, true);
  assert.equal(bypassed.snapped, false);
  assert.equal(bypassed.y, 107);
});

test("vertical route controls snap into the same column as an endpoint", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M40,20 L80,20 L80,260 L200,260");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "vertical", startIndex: 1, endIndex: 2 }])
  );

  const snapped = editor.snapConnectorRouteControl(
    connector,
    0,
    52,
    140,
    [{ x: 40, y: 20, priority: 0, source: "own-endpoint" }],
    false
  );
  assert.equal(snapped.x, 40);
  assert.equal(snapped.guides[0].axis, "x");
  assert.equal(snapped.guides[0].label, "折线与连接点同列");
});

test("saved double-return routes simplify to the minimal dogleg", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M250,0 L250,100 L205,100 L205,200 L150,200 L150,300");
  connector.setAttribute("data-routing", "controlled-orthogonal");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "vertical", startIndex: 2, endIndex: 3 }])
  );

  assert.equal(editor.normalizeControlledConnectorRoute(connector), true);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), [
    { x: 250, y: 0 },
    { x: 250, y: 100 },
    { x: 150, y: 100 },
    { x: 150, y: 300 },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorRouteControls(connector))), [
    { axis: "horizontal", startIndex: 1, endIndex: 2 },
  ]);
});

test("moving a controlled endpoint collapses an unnecessary double return", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L0,100 L80,100 L80,200 L0,200 L0,300");
  connector.setAttribute("data-routing", "controlled-orthogonal");
  connector.setAttribute("data-end-axis", "vertical");
  connector.setAttribute(
    "data-route-controls",
    JSON.stringify([{ axis: "vertical", startIndex: 2, endIndex: 3 }])
  );

  editor.moveControlledConnectorEndpoint(connector, false, 160, 300);

  assert.deepEqual(JSON.parse(JSON.stringify(editor.connectorPoints(connector))), [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 160, y: 100 },
    { x: 160, y: 300 },
  ]);
});

test("legacy single-node V arrows upgrade to an orthogonal route", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("legacy-connector", "path");
  connector.setAttribute("d", "M0,0 L100,150 L0,300");
  connector.setAttribute("data-routing", "manual");
  connector.setAttribute("data-arrow-mode", "manual");

  assert.equal(editor.upgradeLegacyConnectorNode(connector), true);

  const points = editor.connectorPoints(connector);
  assert.deepEqual(JSON.parse(JSON.stringify(points)), [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 200 },
    { x: 0, y: 200 },
    { x: 0, y: 300 },
  ]);
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    assert.ok(point.x === next.x || point.y === next.y);
  });
  assert.equal(connector.getAttribute("data-routing"), "controlled-orthogonal");
  assert.equal(editor.connectorRouteControls(connector).length, 1);
});

test("snapped endpoints remain a direct segment even when the anchors are offset", () => {
  const { editor } = loadEditor();
  const start = { x: 435, y: 140 };
  const end = { x: 441, y: 380 };
  const points = editor.straightArrowPoints(start, { ...end, anchor: { ...end, side: "上" } }, "free");
  assert.deepEqual(JSON.parse(JSON.stringify(points)), [start, end]);
});

test("snapping removes a hidden border U-turn and preserves the arrowhead direction", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M420,100 L420,425 L480,425 L420,425");
  const anchor = { x: 420, y: 425, side: "上" };

  const cleaned = editor.simplifyOrthogonalPoints(editor.connectorPoints(connector));
  assert.deepEqual(JSON.parse(JSON.stringify(cleaned)), [
    { x: 420, y: 100 },
    { x: 420, y: 425 },
  ]);

  editor.enforceEndpointApproach(connector, anchor, false);
  const points = editor.connectorPoints(connector);
  const previous = points.at(-2);
  const end = points.at(-1);
  assert.equal(previous.x, end.x);
  assert.ok(previous.y < end.y, "a top-edge arrow must end by travelling downward");
  assert.deepEqual(JSON.parse(JSON.stringify(end)), { x: anchor.x, y: anchor.y });
});

test("a second added node increases manual routing freedom predictably", () => {
  const { editor } = loadEditor();
  const first = editor.insertConnectorNodePoints([{ x: 0, y: 0 }, { x: 160, y: 0 }]);
  const second = editor.insertConnectorNodePoints(first.points, first.controls);
  assert.equal(first.controls.length, 1);
  assert.equal(second.controls.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(second.points.at(0))), { x: 0, y: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(second.points.at(-1))), { x: 160, y: 0 });
});

test("the add-node command turns a selected arrow into a manually routed path", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L200,0");
  connector.setAttribute("fill", "none");
  connector.setAttribute("marker-end", "url(#arrow)");
  editor.selected = [connector];

  editor.addConnectorNode();

  assert.equal(editor.connectorPoints(connector).length, 6);
  assert.equal(editor.connectorRouteControls(connector).length, 1);
  assert.equal(connector.getAttribute("data-routing"), "controlled-orthogonal");
  assert.equal(connector.getAttribute("data-arrow-mode"), "manual");
});

test("the text tool places centered editable text inside a selected shape", () => {
  const { editor, nodes } = loadEditor();
  const shape = new FakeNode("box", "rect");
  shape.setAttribute("x", "70");
  shape.setAttribute("y", "50");
  shape.setAttribute("width", "280");
  shape.setAttribute("height", "140");
  shape.getBBox = () => ({ x: 70, y: 50, width: 280, height: 140 });
  editor.selected = [shape];
  editor.commit = () => {};
  let editing = null;
  editor.startTextEdit = (label) => { editing = label; };

  editor.setTool("text");

  assert.equal(editor.tool, "select");
  assert.ok(editing);
  assert.equal(editing.textContent, "文字");
  assert.equal(editing.getAttribute("text-anchor"), "middle");
  assert.equal(editing.getAttribute("dominant-baseline"), "central");
  assert.equal(Number(editing.getAttribute("x")), 210);
  assert.equal(Number(editing.getAttribute("y")), 120);
  assert.equal(nodes.get("content").childNodes.includes(editing), true);
});

test("the text tool still waits for a canvas click when no shape is selected", () => {
  const { editor, nodes } = loadEditor();
  const before = nodes.get("content").childNodes.length;
  editor.selected = [];
  let editing = null;
  editor.startTextEdit = (label) => { editing = label; };

  editor.setTool("text");

  assert.equal(editor.tool, "text");
  assert.equal(editing, null);
  assert.equal(nodes.get("content").childNodes.length, before);
});

test("the text tool ignores selected lines and still waits for a canvas click", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L200,0");
  connector.setAttribute("fill", "none");
  connector.setAttribute("marker-end", "url(#arrow)");
  editor.selected = [connector];
  let editing = null;
  editor.startTextEdit = (label) => { editing = label; };

  editor.setTool("text");

  assert.equal(editor.tool, "text");
  assert.equal(editing, null);
});

test("the text tool centers labels in diamonds and ellipses", () => {
  const { editor, nodes } = loadEditor();
  const diamond = new FakeNode("judge", "polygon");
  diamond.setAttribute("points", "100,0 200,50 100,100 0,50");
  diamond.setAttribute("data-flow-shape", "diamond");
  const ellipse = new FakeNode("round", "ellipse");
  ellipse.setAttribute("cx", "150");
  ellipse.setAttribute("cy", "80");
  ellipse.setAttribute("rx", "40");
  ellipse.setAttribute("ry", "20");
  editor.selected = [diamond, ellipse];
  editor.commit = () => {};
  let editing = null;
  editor.startTextEdit = (label) => { editing = label; };

  editor.setTool("text");

  const texts = nodes.get("content").childNodes.filter((el) => el.tagName === "TEXT");
  assert.equal(editor.tool, "select");
  assert.equal(texts.length, 2);
  assert.equal(Number(texts[0].getAttribute("x")), 100);
  assert.equal(Number(texts[0].getAttribute("y")), 50);
  assert.equal(Number(texts[1].getAttribute("x")), 150);
  assert.equal(Number(texts[1].getAttribute("y")), 80);
  assert.equal(editing, texts[1]);
});

test("the line-text command inserts editable text at the selected line midpoint", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L200,0");
  connector.setAttribute("fill", "none");
  connector.setAttribute("marker-end", "url(#arrow)");
  editor.selected = [connector];
  let editing = null;
  editor.commit = () => {};
  editor.startTextEdit = (label) => { editing = label; };

  editor.addConnectorTextFromToolbar();

  assert.ok(editing);
  assert.equal(editing.textContent, "文字");
  assert.equal(editing.getAttribute("data-line-position"), "0.5");
  assert.equal(editing.getAttribute("data-line-offset"), "0");
  assert.equal(Number(editing.getAttribute("x")), 100);
  assert.equal(Number(editing.getAttribute("y")), 0);
});

test("the line style menu applies dash, width, no-stroke and arrow presets", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M0,0 L200,0");
  connector.setAttribute("fill", "none");
  connector.setAttribute("stroke", "#b85f2a");
  editor.selected = [connector];
  editor.commit = () => {};
  editor.refreshHits = () => {};
  editor.redrawOverlay = () => {};
  editor.closeToolbarMenus = () => {};

  editor.applyLineStylePreset("dashed", 3.5);
  assert.equal(connector.getAttribute("stroke-dasharray"), "10 6");
  assert.equal(connector.getAttribute("stroke-width"), "3.5");
  assert.equal(editor.currentLineStyleKey(connector), "dashed");

  editor.applyConnectorArrowEnds("end");
  assert.equal(connector.getAttribute("marker-end"), "url(#arrow)");
  assert.equal(editor.markerPlacement(connector), "end");

  editor.applyConnectorArrowEnds("none");
  assert.equal(connector.getAttribute("marker-end"), "none");
  assert.equal(editor.markerPlacement(connector), "none");

  editor.applyNoStroke();
  assert.equal(connector.getAttribute("stroke"), "none");
});

test("connector properties update stroke, line style, corners and arrow ends", () => {
  const { editor, nodes } = loadEditor();
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("stroke", "#b85f2a");
  connector.setAttribute("marker-end", "url(#arrow)");
  editor.selected = [connector];

  nodes.get("prop-stroke").value = "#2468ac";
  editor.applyProps("prop-stroke");
  assert.equal(connector.getAttribute("stroke"), "#2468ac");
  assert.equal(connector.style.stroke, "#2468ac");

  nodes.get("prop-line-style").value = "dashdot";
  editor.applyProps("prop-line-style");
  assert.equal(connector.getAttribute("stroke-dasharray"), "10 5 1 5");

  nodes.get("prop-line-join").value = "round";
  editor.applyProps("prop-line-join");
  assert.equal(connector.getAttribute("stroke-linejoin"), "round");

  nodes.get("prop-arrow-ends").value = "both";
  editor.applyProps("prop-arrow-ends");
  assert.equal(connector.getAttribute("marker-start"), "url(#arrow)");
  assert.equal(connector.getAttribute("marker-end"), "url(#arrow)");
  clearTimeout(editor._propTimer);
});

test("hit overlays stay invisible after a stroke color change", () => {
  const { editor, nodes } = loadEditor();
  const connector = new FakeNode("fat-hit-line", "path");
  connector.setAttribute("d", "M40,20 L40,220");
  connector.setAttribute("fill", "none");
  connector.setAttribute("stroke", "#b85f2a");
  connector.setAttribute("stroke-width", "3");
  connector.setAttribute("mask", "url(#line-label-cutout-line-abc)");
  connector.style.stroke = "#50301b";
  connector.style.strokeWidth = "3";
  connector.closest = () => null;
  connector.cloneNode = () => {
    const copy = new FakeNode("", "path");
    copy.setAttribute("d", connector.getAttribute("d"));
    copy.setAttribute("fill", connector.getAttribute("fill"));
    copy.setAttribute("stroke", connector.getAttribute("stroke"));
    copy.setAttribute("stroke-width", connector.getAttribute("stroke-width"));
    copy.setAttribute("mask", connector.getAttribute("mask"));
    copy.style.stroke = connector.style.stroke;
    copy.style.strokeWidth = connector.style.strokeWidth;
    return copy;
  };
  connector.insertAdjacentElement = (_position, child) => {
    connector._hit = child;
    return child;
  };
  stubContent(nodes, [connector]);

  editor.refreshHits();

  const hit = connector._hit;
  assert.ok(hit);
  assert.equal(hit.getAttribute("class"), "svg-ed-hit");
  assert.equal(hit.getAttribute("stroke-width"), "14");
  assert.match(String(hit.getAttribute("stroke")), /rgba\(0,\s*0,\s*0/i);
  assert.notEqual(String(hit.style.stroke || "").toLowerCase(), "#50301b");
  assert.equal(hit.getAttribute("mask"), null);
  assert.equal(connector.getAttribute("mask"), "url(#line-label-cutout-line-abc)");
  assert.equal(connector.getAttribute("stroke-width"), "3");
});

test("property eyedroppers apply sampled color to fill and stroke", () => {
  const { editor, nodes } = loadEditor();
  const shape = new FakeNode("box", "rect");
  shape.setAttribute("fill", "#ffffff");
  shape.setAttribute("stroke", "#b85f2a");
  shape.getBBox = () => ({ x: 0, y: 0, width: 80, height: 40 });
  editor.selected = [shape];
  nodes.get("prop-fill-none").checked = true;

  editor.applyEyedropperColor("#4A90E2", "fill");
  assert.match(String(nodes.get("prop-fill").value), /#4a90e2/i);
  assert.equal(nodes.get("prop-fill-none").checked, false);
  assert.match(String(shape.getAttribute("fill")), /#4a90e2/i);

  editor.applyEyedropperColor("#C65911", "stroke");
  assert.match(String(nodes.get("prop-stroke").value), /#c65911/i);
  assert.match(String(shape.getAttribute("stroke")), /#c65911/i);
  clearTimeout(editor._propTimer);
});

test("property font size stepper grows and shrinks selected text", () => {
  const { editor, nodes } = loadEditor();
  const text = new FakeNode("caption", "text");
  text.setAttribute("font-size", "18");
  text.style.fontSize = "18px";
  editor.selected = [text];
  editor.commit = () => {};
  editor.refreshHits = () => {};
  editor.redrawOverlay = () => {};
  nodes.get("prop-fs").value = "18";
  nodes.get("prop-fs").disabled = false;

  editor.nudgePropFontSize(1);
  assert.equal(text.getAttribute("font-size"), "19");
  assert.equal(text.style.fontSize, "19px");

  editor.nudgePropFontSize(-1);
  assert.equal(text.getAttribute("font-size"), "18");
  clearTimeout(editor._propTimer);
});

test("holding a size stepper repeats the change until released", () => {
  const { editor, nodes } = loadEditor();
  const button = nodes.get("top-font-increase");
  button.disabled = false;
  let count = 0;
  editor.startHoldRepeat(button, () => {
    count += 1;
  });
  assert.equal(count, 1);
  assert.ok(editor._holdRepeat);
  editor.stopHoldRepeat();
  assert.equal(editor._holdRepeat, null);
  assert.equal(count, 1);
});

test("property stroke width stepper grows and shrinks selected lines", () => {
  const { editor, nodes } = loadEditor();
  const connector = new FakeNode("stroke-line", "path");
  connector.setAttribute("stroke-width", "3");
  connector.getBBox = () => ({ x: 0, y: 0, width: 80, height: 40 });
  editor.selected = [connector];
  editor.commit = () => {};
  editor.refreshHits = () => {};
  editor.redrawOverlay = () => {};
  nodes.get("prop-sw").value = "3";
  nodes.get("prop-sw").disabled = false;

  editor.nudgePropStrokeWidth(0.2);
  assert.equal(connector.getAttribute("stroke-width"), "3.2");
  editor.nudgePropStrokeWidth(-0.2);
  assert.equal(connector.getAttribute("stroke-width"), "3");
  clearTimeout(editor._propTimer);
});

test("recent colors keep the latest unique swatches at the front", () => {
  const { editor, nodes } = loadEditor();
  editor.rememberColor("#4A90E2");
  editor.rememberColor("#C65911");
  editor.rememberColor("#4A90E2");
  assert.match(String(editor.recentColors[0]), /#4a90e2/i);
  assert.match(String(editor.recentColors[1]), /#c65911/i);
  assert.equal(editor.recentColors.length, 2);
  assert.equal(nodes.get("color-recent").childNodes.length, 2);
  assert.equal(nodes.get("color-recent-section").classList.contains("hidden"), false);
});

test("fill and stroke color menus apply palette colors to the selected shape", () => {
  const { editor, nodes } = loadEditor();
  const shape = new FakeNode("box", "rect");
  shape.setAttribute("fill", "#ffffff");
  shape.setAttribute("stroke", "#b85f2a");
  shape.getBBox = () => ({ x: 0, y: 0, width: 80, height: 40 });
  editor.selected = [shape];

  editor.applySolidColor("#70ad47", "fill");
  assert.match(String(shape.getAttribute("fill")), /#70ad47/i);
  assert.equal(nodes.get("prop-fill-none").checked, false);

  editor.applySolidColor("#2e75b6", "stroke");
  assert.match(String(shape.getAttribute("stroke")), /#2e75b6/i);
  clearTimeout(editor._propTimer);
});

test("more fill presets populate and the color dialog confirms a solid color", () => {
  const { editor, nodes } = loadEditor();
  assert.ok(nodes.get("color-more-fills-grid").childNodes.length >= 80);
  assert.ok(nodes.get("color-dialog-standard-grid").childNodes.length >= 120);
  assert.ok(nodes.get("color-dialog-gray-row").childNodes.length >= 16);

  const shape = new FakeNode("dialog-box", "rect");
  shape.setAttribute("fill", "#ffffff");
  shape.getBBox = () => ({ x: 0, y: 0, width: 80, height: 40 });
  editor.selected = [shape];
  editor.colorMenuTarget = "fill";
  editor.colorDialogNext = "#C53030";
  editor.confirmColorDialog();
  assert.match(String(shape.getAttribute("fill")), /#c53030/i);

  editor.colorMenuVisible = true;
  editor.onKeyDown({
    key: "m",
    preventDefault() {},
    target: {},
  });
  assert.equal(editor.colorDialogVisible, true);
  editor.closeColorDialog();
  assert.equal(editor.colorDialogVisible, false);
  clearTimeout(editor._propTimer);
});

test("property line style control shows a dash preview for the current value", () => {
  const { editor, nodes } = loadEditor();
  const preview = new FakeNode("prop-line-style-line", "line");
  nodes.set("prop-line-style-line", preview);
  nodes.get("prop-line-style").value = "dashed";
  nodes.get("prop-stroke").value = "#334455";

  editor.syncPropLineStylePreview();

  assert.equal(preview.getAttribute("stroke-dasharray"), "10 6");
  assert.equal(preview.getAttribute("stroke"), "#334455");
});

test("connector labels stay centered on the line and can be projected by dragging", () => {
  const { editor } = loadEditor();
  const connector = new FakeNode("labeled-connector", "path");
  connector.setAttribute("d", "M0,0 L100,0 L100,100");
  const label = new FakeNode("line-label", "text");
  label.setAttribute("data-line-position", "0.75");
  label.setAttribute("data-line-offset", "10");

  const point = editor.pointAlongConnector(connector, 0.75);
  assert.equal(point.x, 100);
  assert.equal(point.y, 50);

  const projected = editor.projectPointToConnector(connector, { x: 94, y: 30 });
  assert.ok(Math.abs(projected.ratio - 0.65) < 0.0001);
  assert.equal(projected.x, 100);
  assert.equal(projected.y, 30);

  const positioned = editor.updateConnectorLabel(connector, label);
  assert.equal(positioned.labelX, 100);
  assert.equal(positioned.labelY, 50);
  assert.equal(Number(label.getAttribute("x")), 100);
  assert.equal(Number(label.getAttribute("y")), 50);
  assert.equal(label.getAttribute("data-line-offset"), "0");

  label.setAttribute("data-line-position", "0");
  const atStart = editor.updateConnectorLabel(connector, label);
  assert.equal(atStart.position, 0);
  assert.equal(atStart.x, 0);
  assert.equal(atStart.y, 0);
});

test("connector labels punch a rectangular hole instead of a white halo", () => {
  const { editor, nodes } = loadEditor();
  const content = nodes.get("content");
  const connector = new FakeNode("labeled-line", "path");
  connector.setAttribute("d", "M40,20 L40,220");
  connector.setAttribute("data-line-id", "line-abc");
  connector.setAttribute("stroke-width", "6");
  const label = new FakeNode("line-label", "text");
  label.setAttribute("data-line-label-for", "line-abc");
  label.setAttribute("data-line-position", "0.5");
  label.setAttribute("stroke", "#ffffff");
  label.setAttribute("stroke-width", "4");
  label.style.fontSize = "18px";
  label.style.stroke = "#ffffff";
  label.style.paintOrder = "stroke";
  label.textContent = "文字";
  label.getBBox = () => ({ x: 22, y: 110, width: 36, height: 20 });
  content.appendChild(connector);
  content.appendChild(label);

  editor.updateConnectorLabel(connector, label);

  assert.equal(label.getAttribute("stroke"), null);
  assert.equal(label.style.stroke, undefined);
  assert.equal(connector.getAttribute("mask"), "url(#line-label-cutout-line-abc)");
  const defs = content.childNodes.find((node) => node.tagName === "DEFS");
  assert.ok(defs);
  const mask = defs.childNodes.find((node) => node.getAttribute("data-line-label-mask") === "line-abc");
  assert.ok(mask);
  assert.equal(mask.getAttribute("maskUnits"), "userSpaceOnUse");
  const hole = mask.childNodes.find((node) => node.tagName === "RECT" && node.getAttribute("fill") === "#000000");
  assert.ok(hole);
  assert.equal(Number(hole.getAttribute("x")), 16);
  assert.equal(Number(hole.getAttribute("y")), 105.5);
  assert.equal(Number(hole.getAttribute("width")), 48);
  assert.equal(Number(hole.getAttribute("height")), 29);

  editor.updateConnectorLabel(connector, label);
  assert.equal(defs.childNodes.filter((node) => node.tagName === "MASK").length, 1);

  editor.removeConnectorLabelCutout(connector);
  assert.equal(connector.getAttribute("mask"), null);
  assert.equal(defs.childNodes.filter((node) => node.tagName === "MASK").length, 0);
});

test("text editor overlay follows canvas zoom instead of staying at the old screen box", () => {
  const { editor, nodes } = loadEditor();
  const text = new FakeNode("title-text", "text");
  text.textContent = "④ 出清与结算";
  text.style.fontSize = "22px";
  text.setAttribute("text-anchor", "middle");
  text.getScreenCTM = () => ({ a: 1.2, b: 0 });
  text.getBoundingClientRect = () => ({ left: 220, top: 90, width: 140, height: 26 });
  nodes.get("viewport").getBoundingClientRect = () => ({ left: 40, top: 20, width: 900, height: 600 });
  const input = nodes.get("text-input");
  input.hidden = false;
  editor.editingText = text;

  editor.syncTextEditorOverlay();
  assert.equal(input.style.fontSize, "26.4px");
  assert.equal(input.style.left, "171px");
  assert.equal(input.style.top, "65px");

  text.getScreenCTM = () => ({ a: 2.4, b: 0 });
  text.getBoundingClientRect = () => ({ left: 300, top: 140, width: 280, height: 52 });
  editor.applyView();
  assert.equal(input.style.fontSize, "52.8px");
  assert.equal(input.style.left, "251px");
  assert.equal(input.style.top, "115px");
  assert.equal(Number.parseFloat(input.style.width) >= 298, true);
});

test("rerouting the reported right-side case makes the arrowhead point left", () => {
  const { editor } = loadEditor();
  editor.view.w = 1000;
  const connector = new FakeNode("connector", "path");
  connector.setAttribute("d", "M439,0 L439,181 L349,181 L349,225");
  editor.enforceEndpointApproach(connector, { x: 349, y: 235, side: "右" }, false);
  const points = editor.connectorPoints(connector);
  const previous = points.at(-2);
  const end = points.at(-1);
  assert.equal(end.x, 349);
  assert.equal(end.y, 235);
  assert.equal(previous.y, end.y);
  assert.ok(previous.x > end.x);
});

test("canvas scrollbar metrics track zoom and map thumb movement to viewBox", () => {
  const { editor, nodes } = loadEditor();
  editor.docBox = { x: 0, y: 0, w: 1800, h: 820 };
  editor.view = { x: 0, y: 0, w: 900, h: 410 };
  const metrics = editor.scrollMetrics("x");
  assert.ok(metrics.range > 0);
  assert.ok(metrics.sizeRatio > 0 && metrics.sizeRatio < 1);

  editor.view.x = metrics.min;
  editor.updateScrollbars();
  assert.equal(nodes.get("canvas-scroll-thumb-x").style.left, "0px");

  editor.scrollDrag = {
    axis: "x",
    startClient: 0,
    startView: metrics.min,
    min: metrics.min,
    max: metrics.max,
    range: metrics.range,
    travel: 500,
    thumb: nodes.get("canvas-scroll-thumb-x"),
  };
  editor.moveScrollbar({ clientX: 250, preventDefault() {} });
  assert.ok(Math.abs(editor.view.x - (metrics.min + metrics.range / 2)) < 0.001);
  editor.endScrollbarDrag();
  assert.equal(editor.scrollDrag, null);
});

test("top bar ruler button toggles canvas rulers that follow zoom and pan", () => {
  const { editor, nodes } = loadEditor();
  editor.docBox = { x: 0, y: 0, w: 1800, h: 820 };
  editor.syncCanvasSizeButton();
  assert.match(nodes.get("btn-canvas-size").title, /1800/);
  assert.match(nodes.get("btn-canvas-size").title, /820/);
  assert.equal(editor.rulersVisible, false);
  assert.equal(nodes.get("workspace").classList.contains("rulers-on"), false);

  assert.equal(editor.setRulersVisible(true, false, false), true);
  assert.equal(nodes.get("workspace").classList.contains("rulers-on"), true);
  assert.equal(nodes.get("btn-canvas-size").getAttribute("aria-pressed"), "true");
  assert.ok(nodes.get("ruler-h").childNodes.length > 1);
  assert.ok(nodes.get("ruler-v").childNodes.length > 1);

  const marks = editor.rulerMarks(0, 1000, 1000);
  assert.equal(marks.major, 100);
  const zero = marks.ticks.find((tick) => tick.label === "0");
  const hundred = marks.ticks.find((tick) => tick.label === "100");
  assert.equal(zero && Math.round(zero.px), 0);
  assert.equal(hundred && Math.round(hundred.px), 100);
  assert.ok(marks.ticks.some((tick) => tick.kind === "mid" && Math.round(tick.px) === 50));

  const panned = editor.rulerMarks(200, 1000, 1000);
  assert.equal(panned.ticks.find((tick) => tick.label === "0"), undefined);
  const twoHundred = panned.ticks.find((tick) => tick.label === "200");
  assert.equal(twoHundred && Math.round(twoHundred.px), 0);

  editor.view = { x: 0, y: 0, w: 100, h: 60 };
  editor.updateRulers();
  const zoomed = editor.rulerMarks(0, 100, 1000);
  assert.equal(zoomed.major, 10);
  const ten = zoomed.ticks.find((tick) => tick.label === "10");
  assert.equal(ten && Math.round(ten.px), 100);

  editor.setRulersVisible(false, false, false);
  assert.equal(nodes.get("workspace").classList.contains("rulers-on"), false);
  assert.equal(nodes.get("ruler-h").childNodes.length, 0);
});

test("property sidebar can collapse and expand without losing its toggle", () => {
  const { editor, nodes } = loadEditor();
  assert.equal(editor.togglePropsPanel(true, false), true);
  assert.equal(nodes.get("app").classList.contains("props-collapsed"), true);
  assert.equal(nodes.get("btn-props-toggle").textContent, "‹");
  assert.equal(nodes.get("btn-props-toggle").getAttribute("aria-expanded"), "false");

  assert.equal(editor.togglePropsPanel(false, false), false);
  assert.equal(nodes.get("app").classList.contains("props-collapsed"), false);
  assert.equal(nodes.get("btn-props-toggle").textContent, "›");
});

test("property panel groups stroke controls for a path and hides unused text fields", () => {
  const { editor, nodes } = loadEditor();
  const path = new FakeNode("line", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#2468ac");
  path.setAttribute("stroke-width", "3");
  editor.selected = [path];
  editor.syncTextToolbar = () => {};
  editor.syncLineStyleMenu = () => {};
  editor.syncPropLineStylePreview = () => {};
  editor.connectorFromLabelSelection = () => null;
  editor.updateProps();
  assert.equal(nodes.get("prop-group-stroke").classList.contains("hidden"), false);
  assert.equal(nodes.get("prop-group-fill").classList.contains("hidden"), true);
  assert.equal(nodes.get("prop-group-text").classList.contains("hidden"), true);
  assert.equal(nodes.get("prop-group-position").classList.contains("hidden"), true);
});

test("property panel can set shape and text size by width and height", () => {
  const { editor, nodes } = loadEditor();
  editor.syncTextToolbar = () => {};
  editor.syncLineStyleMenu = () => {};
  editor.syncPropLineStylePreview = () => {};
  editor.syncPropColorButtons = () => {};
  editor.connectorFromLabelSelection = () => null;
  editor.reflowGluedConnectors = () => {};
  editor.redrawOverlay = () => {};
  editor.refreshHits = () => {};
  editor.syncConnectorLabels = () => {};
  editor.syncTextEditorOverlay = () => {};

  const rect = new FakeNode("box", "rect");
  rect.setAttribute("x", 10);
  rect.setAttribute("y", 20);
  rect.setAttribute("width", 80);
  rect.setAttribute("height", 40);
  editor.selected = [rect];
  editor.updateProps();
  assert.equal(nodes.get("prop-w").value, "80");
  assert.equal(nodes.get("prop-h").value, "40");
  assert.equal(nodes.get("prop-w-field").classList.contains("hidden"), false);
  nodes.get("prop-w").value = "120";
  editor.applyProps("prop-w");
  assert.equal(Number(rect.getAttribute("width")), 120);
  assert.equal(Number(rect.getAttribute("height")), 40);
  nodes.get("prop-h").value = "60";
  editor.applyProps("prop-h");
  assert.equal(Number(rect.getAttribute("height")), 60);
  assert.equal(Number(rect.getAttribute("width")), 120);

  const diamond = editor.createFlowShapeElement("diamond");
  editor.updateFlowShapeGeometry(diamond, "diamond", 10, 20, 100, 50);
  editor.selected = [diamond];
  editor.updateProps();
  assert.equal(nodes.get("prop-w").value, "100");
  assert.equal(nodes.get("prop-h").value, "50");
  nodes.get("prop-w").value = "160";
  editor.applyProps("prop-w");
  assert.equal(Number(diamond.getAttribute("data-shape-width")), 160);
  assert.equal(Number(diamond.getAttribute("data-shape-height")), 50);

  const text = new FakeNode("caption", "text");
  text.style.fontSize = "20px";
  text.setAttribute("font-size", "20");
  text.setAttribute("x", "40");
  text.setAttribute("y", "80");
  text.getBBox = () => ({ x: 10, y: 20, width: 80, height: 24 });
  editor.selected = [text];
  editor.updateProps();
  assert.equal(nodes.get("prop-w").value, "80");
  nodes.get("prop-w").value = "160";
  editor.applyProps("prop-w");
  assert.equal(Number(text.getAttribute("font-size")), 40);
  assert.equal(nodes.get("prop-square-field").classList.contains("hidden"), true);
  clearTimeout(editor._propTimer);
});

test("moving and resizing update position and size fields live", () => {
  const { editor, nodes } = loadEditor();
  editor.syncTextToolbar = () => {};
  editor.syncLineStyleMenu = () => {};
  editor.syncPropLineStylePreview = () => {};
  editor.syncPropColorButtons = () => {};
  editor.connectorFromLabelSelection = () => null;
  editor.reflowGluedConnectors = () => {};
  editor.redrawOverlay = () => {};
  editor.refreshHits = () => {};
  editor.syncConnectorLabels = () => {};
  editor.syncTextEditorOverlay = () => {};

  const rect = new FakeNode("box", "rect");
  rect.setAttribute("x", 10);
  rect.setAttribute("y", 20);
  rect.setAttribute("width", 80);
  rect.setAttribute("height", 40);
  editor.selected = [rect];
  editor.updateProps();
  editor.moveSet([rect], 15, 5);
  editor.syncPositionSizeProps();
  assert.equal(nodes.get("prop-x").value, "25");
  assert.equal(nodes.get("prop-y").value, "25");
  rect.setAttribute("width", 120);
  rect.setAttribute("height", 55);
  editor.syncPositionSizeProps();
  assert.equal(nodes.get("prop-w").value, "120");
  assert.equal(nodes.get("prop-h").value, "55");
  clearTimeout(editor._propTimer);
});

test("square buttons force equal width and height from the chosen side", () => {
  const { editor, nodes } = loadEditor();
  editor.syncTextToolbar = () => {};
  editor.syncLineStyleMenu = () => {};
  editor.syncPropLineStylePreview = () => {};
  editor.syncPropColorButtons = () => {};
  editor.connectorFromLabelSelection = () => null;
  editor.reflowGluedConnectors = () => {};
  editor.redrawOverlay = () => {};
  editor.refreshHits = () => {};
  editor.syncConnectorLabels = () => {};
  editor.syncTextEditorOverlay = () => {};

  const rect = new FakeNode("box", "rect");
  rect.setAttribute("x", 10);
  rect.setAttribute("y", 20);
  rect.setAttribute("width", 80);
  rect.setAttribute("height", 40);
  editor.selected = [rect];
  editor.updateProps();
  assert.equal(nodes.get("prop-square-field").classList.contains("hidden"), false);
  editor.makeSelectedSquare("w");
  assert.equal(Number(rect.getAttribute("width")), 80);
  assert.equal(Number(rect.getAttribute("height")), 80);
  assert.equal(nodes.get("prop-w").value, "80");
  assert.equal(nodes.get("prop-h").value, "80");

  rect.setAttribute("width", 80);
  rect.setAttribute("height", 40);
  editor.makeSelectedSquare("h");
  assert.equal(Number(rect.getAttribute("width")), 40);
  assert.equal(Number(rect.getAttribute("height")), 40);

  const diamond = editor.createFlowShapeElement("diamond");
  editor.updateFlowShapeGeometry(diamond, "diamond", 10, 20, 100, 50);
  editor.selected = [diamond];
  editor.makeSelectedSquare("w");
  assert.equal(Number(diamond.getAttribute("data-shape-width")), 100);
  assert.equal(Number(diamond.getAttribute("data-shape-height")), 100);
  clearTimeout(editor._propTimer);
});

test("editor preferences remember grid, snapping, guides, export settings and arrow mode", () => {
  const key = "svg-manual-editor.preferences.v1";
  const first = loadEditor();
  first.editor.setGridVisible(true, false);
  first.editor.setRulersVisible(true, false, false);
  first.nodes.get("snap-toggle").checked = true;
  first.nodes.get("smart-toggle").checked = false;
  first.nodes.get("export-format").value = "webp";
  first.nodes.get("export-scale").value = "4";
  first.nodes.get("export-background").value = "white";
  first.editor.arrowMode = "vertical";
  first.editor.togglePropsPanel(true, false);
  first.editor.rememberColor("#4A90E2");
  first.editor.rememberColor("#C65911");
  first.editor.persistPreferences();

  const saved = first.storage.get(key);
  assert.ok(saved);
  const second = loadEditor({ storage: { [key]: saved } });
  assert.equal(second.nodes.get("paper-grid").getAttribute("visibility"), "visible");
  assert.equal(second.nodes.get("workspace").classList.contains("rulers-on"), true);
  assert.equal(second.nodes.get("snap-toggle").checked, true);
  assert.equal(second.nodes.get("smart-toggle").checked, false);
  assert.equal(second.nodes.get("export-format").value, "webp");
  assert.equal(second.nodes.get("export-scale").value, "4");
  assert.equal(second.nodes.get("export-background").value, "white");
  assert.equal(second.editor.arrowMode, "vertical");
  assert.equal(second.nodes.get("app").classList.contains("props-collapsed"), true);
  assert.match(String(second.editor.recentColors[0]), /#c65911/i);
  assert.match(String(second.editor.recentColors[1]), /#4a90e2/i);
});

test("recent symbols stay visible on every category tab", () => {
  const { editor, nodes } = loadEditor();
  const tabs = nodes.get("symbol-tabs");
  const recentSection = nodes.get("symbol-recent-section");
  const tabLabels = tabs.childNodes.map((tab) => tab.textContent);
  assert.deepEqual(tabLabels, ["希腊字母", "数学符号", "数学序号", "上下标", "其他符号"]);
  assert.equal(recentSection.classList.contains("is-empty"), true);
  editor.rememberSymbol("α");
  assert.equal(recentSection.classList.contains("is-empty"), false);
  assert.equal(nodes.get("symbol-recent").childNodes[0].textContent, "α");
  editor.setSymbolTab("mark");
  assert.equal(nodes.get("symbol-recent").childNodes[0].textContent, "α");
  clearTimeout(editor._propTimer);
});

test("special symbols insert into selected text and remember recent picks", () => {
  const key = "svg-manual-editor.preferences.v1";
  const first = loadEditor();
  const text = new FakeNode("title", "text");
  text.textContent = "步骤";
  first.editor.selected = [text];
  first.editor.syncLineStyleMenu = () => {};
  first.editor.syncPropLineStylePreview = () => {};
  first.editor.redrawOverlay = () => {};
  first.editor.refreshHits = () => {};
  first.editor.updateProps = () => {};
  first.editor.syncConnectorLabels = () => {};

  assert.equal(first.editor.insertSpecialSymbol("\u2460"), true);
  assert.equal(text.textContent, "\u6b65\u9aa4\u2460");
  assert.equal(first.editor.recentSymbols[0], "\u2460");
  assert.equal(first.editor.recentSymbols.length, 1);

  first.editor.insertSpecialSymbol("\u03b1");
  first.editor.insertSpecialSymbol("\u2460");
  assert.equal(first.editor.recentSymbols.slice(0, 3).join(" "), "\u2460 \u03b1");

  const input = first.nodes.get("text-input");
  input.hidden = false;
  input.value = "\u80fd\u529b";
  input.selectionStart = 0;
  input.selectionEnd = 0;
  first.editor.editingText = text;
  assert.equal(first.editor.insertSpecialSymbol("\u03a3"), true);
  assert.equal(input.value, "\u03a3\u80fd\u529b");
  assert.equal(first.editor.recentSymbols[0], "\u03a3");

  const second = loadEditor({ storage: { [key]: first.storage.get(key) } });
  assert.equal(second.editor.recentSymbols.slice(0, 3).join(" "), "\u03a3 \u2460 \u03b1");
  clearTimeout(first.editor._propTimer);
});

test("recent symbols survive a Cursor restart and are not wiped by older preferences", () => {
  const key = "svg-manual-editor.preferences.v1";
  const first = loadEditor();
  first.editor.rememberSymbol("α");
  first.editor.rememberSymbol("Σ");
  const saved = JSON.parse(first.storage.get(key));
  assert.equal(saved.recentSymbols.slice(0, 2).join(" "), "Σ α");
  assert.ok(first.vscodeApi.state);
  assert.equal(first.vscodeApi.state.recentSymbols.slice(0, 2).join(" "), "Σ α");

  const restarted = loadEditor();
  assert.equal(restarted.editor.recentSymbols.length, 0);
  restarted.editor.applyPreferences(saved);
  assert.equal(restarted.editor.recentSymbols.slice(0, 2).join(" "), "Σ α");
  assert.equal(restarted.nodes.get("symbol-recent").childNodes[0].textContent, "Σ");
  assert.equal(restarted.nodes.get("symbol-recent-section").classList.contains("is-empty"), false);

  const fromState = loadEditor({ vscodeState: first.vscodeApi.state });
  assert.equal(fromState.editor.recentSymbols.slice(0, 2).join(" "), "Σ α");

  restarted.editor.rememberSymbol("β");
  restarted.editor.applyPreferences({ gridVisible: true });
  assert.equal(restarted.editor.recentSymbols[0], "β");
  clearTimeout(first.editor._propTimer);
  clearTimeout(restarted.editor._propTimer);
  clearTimeout(fromState.editor._propTimer);
});

test("high-resolution export dimensions use the SVG document size", () => {
  const { editor } = loadEditor();
  editor.docBox = { x: 0, y: 0, w: 1800, h: 820 };
  assert.deepEqual(JSON.parse(JSON.stringify(editor.exportDimensions(4))), {
    width: 7200,
    height: 3280,
    valid: true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(editor.exportDimensions(8))), {
    width: 14400,
    height: 6560,
    valid: true,
  });
  editor.docBox = { x: 0, y: 0, w: 10000, h: 10000 };
  assert.equal(editor.exportDimensions(4).valid, false);
});

test("raster export stamps the target pixel size onto the SVG before drawing", () => {
  const { editor } = loadEditor();
  const svg = new FakeNode("export-root", "svg");
  svg.setAttribute("width", "1800");
  svg.setAttribute("height", "660");
  editor.applyRasterExportSize(svg, { pixelWidth: 7200, pixelHeight: 2640 });
  assert.equal(svg.getAttribute("width"), "7200");
  assert.equal(svg.getAttribute("height"), "2640");
  assert.equal(svg.getAttribute("text-rendering"), "geometricPrecision");
  assert.equal(svg.getAttribute("shape-rendering"), "geometricPrecision");
  assert.equal(svg.style.width, "7200px");
  assert.equal(svg.style.height, "2640px");
});

test("eyedropper formats rgb samples as hex", () => {
  const { editor } = loadEditor();
  assert.equal(editor.hexFromRgb(233, 221, 183), "#E9DDB7");
  assert.equal(editor.hexFromRgb(0, 0, 0), "#000000");
  assert.equal(editor.hexFromRgb(255, 255, 255), "#FFFFFF");
});

test("escape cancels the eyedropper without changing the tool", () => {
  const { editor } = loadEditor();
  editor.tool = "select";
  editor.eyedropper = { ctx: {} };
  editor.onKeyDown({
    key: "Escape",
    preventDefault() {},
    target: {},
  });
  assert.equal(editor.eyedropper, null);
  assert.equal(editor.tool, "select");
});

test("eyedropper click outside the canvas cancels picking", () => {
  const { editor } = loadEditor();
  editor.eyedropper = { left: 100, top: 100, width: 400, height: 300, ctx: {} };
  editor.handleEyedropperPointerDown({ button: 0, clientX: 10, clientY: 10 });
  assert.equal(editor.eyedropper, null);
});

test("eyedropper loupe sits to the top-right of the dropper cursor", () => {
  const { editor, nodes } = loadEditor();
  editor.eyedropper = { left: 0, top: 0, width: 800, height: 600 };
  editor.positionEyedropperUi({ clientX: 400, clientY: 300 });
  assert.equal(nodes.get("eyedropper-cursor").style.left, "397.4px");
  assert.equal(nodes.get("eyedropper-cursor").style.top, "270.8px");
  assert.equal(nodes.get("eyedropper-loupe").style.left, "414px");
  assert.equal(nodes.get("eyedropper-loupe").style.top, "134px");
});

test("eyedropper samples through the live canvas transform, not the viewport rect", () => {
  const { editor } = loadEditor();
  const samples = [];
  editor.eyedropper = {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    bitmapWidth: 1800,
    bitmapHeight: 820,
    docX: 0,
    docY: 0,
    scaleX: 1,
    scaleY: 1,
    screenScale: 1,
    ctx: {
      getImageData(x, y) {
        samples.push([x, y]);
        return { data: [18, 52, 86, 255] };
      },
    },
  };
  editor.eyedropperBitmapPoint = () => ({ x: 640.7, y: 120.2 });
  const sample = editor.sampleEyedropperFromEvent({ clientX: 400, clientY: 300 });
  assert.deepEqual(samples[0], [640, 120]);
  assert.equal(sample.hex, "#123456");
});

test("eyedropper reports no color outside the document bitmap", () => {
  const { editor } = loadEditor();
  editor.eyedropper = {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    bitmapWidth: 100,
    bitmapHeight: 100,
    ctx: { getImageData() { throw new Error("should not sample"); } },
  };
  editor.eyedropperBitmapPoint = () => ({ x: -3, y: 40 });
  assert.equal(editor.sampleEyedropperFromEvent({ clientX: 10, clientY: 10 }), null);
});

test("eyedropper wheel zooms the canvas instead of swallowing", () => {
  const { editor } = loadEditor();
  let zoomed = false;
  editor.eyedropper = { ctx: {}, left: 0, top: 0, width: 800, height: 600 };
  editor.onWheel = () => {
    zoomed = true;
  };
  editor.refreshEyedropperAfterViewChange = () => {};
  editor.onEyedropperWheel({
    clientX: 400,
    clientY: 300,
    deltaY: -120,
    preventDefault() {},
  });
  assert.equal(zoomed, true);
  assert.ok(editor.eyedropper);
});
