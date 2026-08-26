const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const editorSource = fs.readFileSync(path.join(root, "editor", "editor.js"), "utf8");
const extensionSource = fs.readFileSync(path.join(root, "extension.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "editor", "index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "editor", "editor.css"), "utf8");

test("SVG loading cannot loop forever on an unchanged firstChild", () => {
  assert.doesNotMatch(editorSource, /while\s*\(\s*svg\.firstChild\s*\)/);
  assert.match(editorSource, /for\s*\(const child of svg\.childNodes\)/);
  assert.match(editorSource, /content\.replaceChildren\(fragment\)/);
});

test("the extension bypasses Cursor TextDocument retrieval with a self-managed custom document", () => {
  assert.doesNotMatch(extensionSource, /resolveCustomTextEditor|onDidChangeTextDocument|document\.getText\(\)/);
  assert.match(extensionSource, /openCustomDocument\(uri, openContext\)/);
  assert.match(extensionSource, /resolveCustomEditor\(document, webviewPanel\)/);
  assert.match(extensionSource, /vscode\.workspace\.fs\.readFile\(source\)/);
  assert.match(extensionSource, /fs\.watchFile\(/);
  assert.match(extensionSource, /scheduleWrite\(\)/);
  assert.doesNotMatch(editorSource, /setTimeout\s*\(\s*ping/);
  assert.match(editorSource, /vscode\.postMessage\(\{ type: "ready" \}\)/);
});

test("property controls update only the field that emitted the event", () => {
  assert.match(editorSource, /this\.applyProps\(id\)/);
  assert.match(editorSource, /applyProps\(changedId\)/);
  assert.match(editorSource, /changedId === "prop-fs" && tag === "text"/);
  assert.match(htmlSource, /id="prop-fs"/);
  assert.match(htmlSource, /id="prop-fs-decrease"/);
  assert.match(htmlSource, /id="prop-fs-increase"/);
  assert.match(cssSource, /\.prop-size-stepper/);
  assert.match(cssSource, /\.prop-size-btns/);
  assert.match(cssSource, /\.prop-color-swatch\.is-stroke/);
  assert.match(editorSource, /nudgePropFontSize\(/);
  assert.match(htmlSource, /id="prop-sw-decrease"/);
  assert.match(htmlSource, /id="prop-sw-increase"/);
  assert.match(cssSource, /\.format-size-btns/);
  assert.match(editorSource, /nudgePropStrokeWidth\(/);
  assert.match(editorSource, /this\.selected\.length === 1/);
  assert.doesNotMatch(editorSource, /node\.addEventListener\(ev, \(\) => this\.applyProps\(\)\)/);
});

test("top text toolbar exposes common formatting and alignment controls", () => {
  [
    "top-text-color",
    "btn-text-color",
    "text-color-menu",
    "text-color-theme",
    "text-color-standard",
    "text-color-gradients",
    "text-color-eyedropper",
    "color-recent",
    "top-font-family",
    "top-font-size",
    "top-font-decrease",
    "top-font-increase",
    "top-bold",
    "top-italic",
    "top-underline",
    "top-align-left",
    "top-align-center",
    "top-align-right",
    "top-align-justify",
    "top-line-spacing",
    "btn-symbol",
    "symbol-menu",
    "symbol-recent",
    "prop-bold",
    "prop-italic",
    "prop-underline",
    "prop-align-left",
    "prop-align-center",
    "prop-align-right",
    "prop-align-justify",
    "prop-line-spacing",
  ].forEach((id) => assert.match(htmlSource, new RegExp(`id="${id}"`)));
  assert.match(editorSource, /selectedTextElements\(\)/);
  assert.match(editorSource, /applyTextFormat\(action, value\)/);
  assert.match(editorSource, /syncTextToolbar\(\)/);
  assert.match(editorSource, /alignTextElement\(el, anchor\)/);
  assert.match(cssSource, /\.text-formatbar\s*\{/);
  assert.match(editorSource, /justifyTextElement\(el\)/);
  assert.match(editorSource, /textLength/);
  assert.match(editorSource, /lengthAdjust/);
  assert.match(editorSource, /applyTextLineSpacing\(targets, multiplier\)/);
  assert.match(editorSource, /insertSpecialSymbol\(/);
  assert.match(editorSource, /rememberSymbol\(/);
  assert.match(editorSource, /recentSymbols/);
  assert.match(cssSource, /\.symbol-menu\s*\{/);
  assert.match(cssSource, /\.symbol-tabs\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(cssSource, /\.symbol-grid\s*\{/);
  assert.match(cssSource, /\.symbol-recent-section\s*\{/);
  assert.match(editorSource, /label:\s*"其他符号"/);
  assert.match(editorSource, /textLineSpacingGroups\(targets\)/);
  assert.match(cssSource, /\.format-line-spacing\s*\{/);
  assert.match(cssSource, /\.text-color-menu\s*\{/);
  assert.match(editorSource, /buildTextColorPalette\(\)/);
  assert.match(editorSource, /applyTextGradient\(from, to\)/);
  assert.match(editorSource, /window\.EyeDropper/);
  assert.match(htmlSource, /id="eyedropper-layer"/);
  assert.match(htmlSource, /id="eyedropper-cursor"/);
  assert.match(htmlSource, /id="eyedropper-loupe"/);
  assert.match(htmlSource, /id="eyedropper-hex"/);
  assert.match(cssSource, /\.eyedropper-cursor\s*\{/);
  assert.match(cssSource, /\.eyedropper-loupe\s*\{/);
  assert.match(cssSource, /\.eyedropper-chip\s*\{/);
  assert.match(editorSource, /startEyedropper\(/);
  assert.match(editorSource, /positionEyedropperUi\(/);
  assert.match(editorSource, /onEyedropperWheel\(/);
  assert.match(editorSource, /单击画布取色/);
  assert.match(editorSource, /hexFromRgb\(/);
});

test("connector color, dash, corner and arrow placement controls are wired", () => {
  assert.match(htmlSource, /id="prop-line-style"/);
  assert.match(htmlSource, /id="prop-line-style-btn"/);
  assert.match(htmlSource, /id="prop-line-style-menu"/);
  assert.match(htmlSource, /id="prop-line-join"/);
  assert.match(cssSource, /\.line-style-combo-btn/);
  assert.match(editorSource, /buildPropLineStyleMenu\(/);
  assert.match(editorSource, /syncPropLineStylePreview\(/);
  assert.match(htmlSource, /id="prop-arrow-ends"/);
  assert.match(htmlSource, /id="btn-prop-fill"/);
  assert.match(htmlSource, /id="btn-prop-stroke"/);
  assert.match(htmlSource, /id="color-recent"/);
  assert.match(htmlSource, /id="color-more-fills"/);
  assert.match(htmlSource, /id="color-dialog"/);
  assert.match(htmlSource, /id="color-tab-standard"/);
  assert.match(htmlSource, /id="color-tab-custom"/);
  assert.match(htmlSource, /id="color-tab-advanced"/);
  assert.match(cssSource, /\.color-more-fills/);
  assert.match(cssSource, /\.color-dialog/);
  assert.match(editorSource, /openColorDialog\(/);
  assert.match(editorSource, /moreFillGradientPresets\(/);
  assert.match(editorSource, /standardDialogCells\(/);
  assert.match(htmlSource, /class="color-dialog-preview-split"/);
  assert.match(cssSource, /\.prop-color-btn/);
  assert.match(editorSource, /toggleColorMenu\(/);
  assert.match(editorSource, /rememberColor\(/);
  assert.match(editorSource, /applySolidColor\(/);
  assert.match(cssSource, /\.svg-ed-hit/);
  assert.match(editorSource, /makeMarkerFollowStroke\(/);
  assert.match(editorSource, /context-stroke/);
  assert.match(editorSource, /auto-start-reverse/);
  assert.match(editorSource, /changedId === "prop-line-style"/);
  assert.match(editorSource, /changedId === "prop-line-join"/);
  assert.match(editorSource, /changedId === "prop-arrow-ends"/);
  assert.match(editorSource, /this\.syncConnectorMarkers\(el\)/);
});

test("straight lines, arrows and polylines support movable text labels", () => {
  [
    "connector-label-fields",
    "prop-line-label",
    "btn-line-label-add",
    "btn-line-label-remove",
    "prop-line-label-position",
    "btn-line-text",
  ].forEach((id) => assert.match(htmlSource, new RegExp(`id="${id}"`)));
  assert.match(htmlSource, /id="prop-group-fill"/);
  assert.match(htmlSource, /id="prop-group-stroke"/);
  assert.match(htmlSource, /id="prop-group-text"/);
  assert.match(htmlSource, /id="prop-text-format"/);
  assert.match(cssSource, /\.prop-text-format/);
  assert.match(cssSource, /\.prop-btn-group/);
  assert.match(cssSource, /\.prop-line-spacing-field/);
  assert.match(htmlSource, /id="prop-group-position"/);
  assert.match(cssSource, /\.prop-grid/);
  assert.match(editorSource, /togglePropGroup\(/);
  assert.match(editorSource, /createConnectorLabel\(connector, text/);
  assert.match(editorSource, /pointAlongConnector\(el, position/);
  assert.match(editorSource, /projectPointToConnector\(el, point\)/);
  assert.match(editorSource, /type: "connector-label"/);
  assert.match(editorSource, /this\.syncConnectorLabels\(data\.el\)/);
  assert.match(editorSource, /data-line-label-for/);
  assert.match(editorSource, /data-line-id/);
  assert.match(editorSource, /addConnectorTextFromToolbar\(\)/);
  assert.match(editorSource, /label\.setAttribute\("data-line-offset", "0"\)/);
  assert.match(editorSource, /const distance = 0/);
  assert.match(editorSource, /syncConnectorLabelCutout\(/);
  assert.match(editorSource, /connectorLabelHole\(/);
  assert.match(editorSource, /data-line-label-mask/);
  assert.match(editorSource, /hit\.removeAttribute\("mask"\)/);
  assert.doesNotMatch(editorSource, /label\.setAttribute\("stroke", "#ffffff"\)/);
  assert.doesNotMatch(editorSource, /data-line-label-for", connector\.getAttribute\("data-ed-id"\)/);
  assert.match(cssSource, /#content text\[data-line-label-for\]/);
});

test("grid visibility and PPT-like smart spacing controls are wired", () => {
  assert.match(htmlSource, /id="btn-grid"/);
  assert.match(htmlSource, /id="smart-toggle"[^>]*checked/);
  assert.ok(htmlSource.indexOf('id="paper"') < htmlSource.indexOf('id="paper-grid"'));
  assert.match(editorSource, /horizontalSpacingCandidates\(/);
  assert.match(editorSource, /verticalSpacingCandidates\(/);
  assert.match(editorSource, /drawSmartGuides\(smart\.guides\)/);
  assert.match(editorSource, /e\.altKey/);
  assert.match(editorSource, /collectResizeTargets\(/);
  assert.match(editorSource, /label: `同宽 /);
  assert.match(editorSource, /label: `同高 /);
  assert.match(editorSource, /kind: "size"/);
  assert.match(editorSource, /guide\.matchLine/);
  assert.match(cssSource, /\.smart-guide\.size-match/);
  assert.match(editorSource, /resizeCursor\(pos\)/);
  assert.match(editorSource, /viewport\.style\.cursor = this\.resizeCursor\(data\.pos\)/);
  assert.match(cssSource, /\.handle\.resize-nw[\s\S]*cursor:\s*nwse-resize/);
  assert.match(editorSource, /PREFERENCES_KEY/);
  assert.match(editorSource, /persistPreferences\(\)/);
  assert.match(editorSource, /restorePreferences\(\)/);
  assert.match(editorSource, /mergeRecentValues\(/);
  assert.match(editorSource, /vscode\.setState/);
  assert.match(extensionSource, /globalState\.get\(PREFERENCES_KEY\)/);
  assert.match(extensionSource, /globalState\.update\(PREFERENCES_KEY/);
});

test("shape sidebar menu creates common flowchart shapes", () => {
  assert.match(htmlSource, /id="btn-shape"/);
  assert.match(htmlSource, /id="shape-menu"/);
  ["rect", "rounded", "ellipse", "diamond", "parallelogram", "terminator"].forEach((kind) => {
    assert.match(htmlSource, new RegExp(`data-shape="${kind}"`));
  });
  assert.doesNotMatch(htmlSource, /data-tool="rect"/);
  assert.match(editorSource, /createFlowShapeElement\(kind\)/);
  assert.match(editorSource, /updateFlowShapeGeometry\(/);
  assert.match(editorSource, /resizeFlowShape\(/);
  assert.match(editorSource, /data-flow-shape/);
});

test("arrow creation and endpoint handles use shape connection anchors", () => {
  assert.match(editorSource, /collectConnectionAnchors\(/);
  assert.match(editorSource, /snapEndpoint\(/);
  assert.match(editorSource, /endpoint: true/);
  assert.match(editorSource, /drawConnectionAnchor\(endpoint\.anchor\)/);
  assert.match(editorSource, /startAnchor: start\.anchor/);
  assert.match(editorSource, /drawAllConnectionAnchors\(\)/);
  assert.match(editorSource, /connectionAnchorsVisible = true/);
  assert.match(editorSource, /connectionAnchorsVisible = false/);
  assert.match(editorSource, /connection-anchor-candidate/);
});

test("arrow menu creates explicit straight-line modes and endpoints align with other arrows", () => {
  assert.match(htmlSource, /id="btn-arrow"/);
  assert.match(htmlSource, /id="arrow-menu"/);
  ["vertical", "horizontal", "free"].forEach((mode) => {
    assert.match(htmlSource, new RegExp(`data-arrow-mode="${mode}"`));
  });
  assert.match(editorSource, /collectArrowEndpoints\(/);
  assert.match(editorSource, /snapToArrowEndpoints\(/);
  assert.match(editorSource, /snapConnectorEndpoint\(/);
  assert.match(editorSource, /straightArrowPoints\(/);
  assert.match(editorSource, /constrainStraightArrowEndpoint\(/);
  assert.match(editorSource, /label: "端点等高"/);
  assert.match(editorSource, /label: "端点同列"/);
  assert.match(editorSource, /Math\.max\(4, 20 \* scale\)/);
  assert.match(cssSource, /\.smart-guide\.endpoint-align/);
  assert.match(cssSource, /\.smart-guide-label\.endpoint/);
});

test("arrows stay straight until an explicit orthogonal control node is added", () => {
  assert.match(htmlSource, /id="btn-add-node"/);
  assert.match(htmlSource, /id="btn-line-style"/);
  assert.match(htmlSource, /id="line-style-menu"/);
  assert.match(htmlSource, /预设线条/);
  assert.match(htmlSource, /无线条/);
  assert.match(cssSource, /\.line-style-menu/);
  assert.match(cssSource, /\.line-style-grid/);
  assert.match(editorSource, /applyLineStylePreset\(/);
  assert.match(editorSource, /applyConnectorArrowEnds\(/);
  assert.match(editorSource, /isActiveMarkerValue\(/);
  assert.match(editorSource, /insertConnectorNodePoints\(points, controls = \[\]\)/);
  assert.match(editorSource, /connectorRouteControls\(el\)/);
  assert.match(editorSource, /moveConnectorRouteControl\(/);
  assert.match(editorSource, /moveControlledConnectorEndpoint\(/);
  assert.match(editorSource, /addConnectorNode\(\)/);
  assert.match(editorSource, /data-routing", "manual"/);
  assert.match(editorSource, /data-routing", "controlled-orthogonal"/);
  assert.match(editorSource, /const points = this\.straightArrowPoints\(d\.start, endpoint, d\.mode\)/);
  assert.doesNotMatch(editorSource, /const points = this\.autoConnectorPoints\(/);
  assert.match(editorSource, /upgradeLegacyArrowLines\(\)/);
  assert.match(editorSource, /upgradeLegacyConnectorNodes\(\)/);
  assert.match(editorSource, /upgradeLegacyConnectorNode\(connector\)/);
  assert.match(editorSource, /normalizeControlledConnectorRoutes\(\)/);
  assert.match(editorSource, /normalizeControlledConnectorRoute\(connector\)/);
  assert.match(editorSource, /connectorRouteSnapTargets\(el\)/);
  assert.match(editorSource, /snapConnectorRouteControl\(/);
  assert.match(editorSource, /折线与连接点等高/);
  assert.match(editorSource, /折线与连接点同列/);
  assert.match(cssSource, /\.tool\s*\{[^}]*white-space:\s*nowrap[^}]*word-break:\s*keep-all/s);
  assert.match(editorSource, /content\.querySelectorAll\("line"\)\]\.filter\(hasArrowMarker\)/);
  assert.match(editorSource, /line\.replaceWith\(path\)/);
  assert.match(editorSource, /orthogonal: connector && el\.getAttribute\("data-routing"\) === "orthogonal"/);
  assert.match(editorSource, /constrainExistingStraightEndpoint\(/);
  assert.match(editorSource, /Connecting to a shape must never insert vertices/);
  assert.match(editorSource, /originalConnectorPoints/);
  assert.match(cssSource, /\.handle\.route-control/);
});

test("polyline preview replaces transient dots instead of leaving a pointer trail", () => {
  assert.match(editorSource, /\.preview-line, \.preview-handle, \.marquee, \.connection-anchor/);
  assert.match(editorSource, /data\.kind === "preview"/);
  assert.match(editorSource, /c\.setAttribute\("pointer-events", "none"\)/);
  assert.doesNotMatch(editorSource, /c\._ed = data;\s*overlay\.appendChild\(c\);/);
});

test("polyline endpoints snap and finished nodes remain orthogonal", () => {
  assert.match(editorSource, /polyEndpointTargets = this\.collectArrowEndpoints\(\)/);
  assert.match(editorSource, /this\.snapConnectorEndpoint\([\s\S]*?this\.polyConnectionAnchors,[\s\S]*?this\.polyEndpointTargets/);
  assert.match(editorSource, /path\.setAttribute\("data-routing", "orthogonal"\)/);
  assert.match(editorSource, /upgradeLegacyOrthogonalConnectors\(\)/);
  assert.match(editorSource, /upgradeLegacyOrthogonalConnector\(connector\)/);
  assert.match(editorSource, /orthogonal: connector && el\.getAttribute\("data-routing"\) === "orthogonal"/);
});

test("selected arrows expose a clockwise 90-degree rotate control", () => {
  assert.match(editorSource, /rotatable\.forEach\(\({ el, box }\) => this\.addConnectorRotateHandle\(el, box\)\)/);
  assert.match(editorSource, /connectorRotateHandlePosition\(box, radius\)/);
  assert.match(editorSource, /rotateArrowheadClockwise\(el\)/);
  assert.match(editorSource, /installRotatedArrowMarker\(/);
  assert.match(editorSource, /restoreArrowheadMarker\(/);
  assert.match(editorSource, /data\.kind === "rotate"/);
  assert.match(editorSource, /group\.setAttribute\("transform", `rotate\(\$\{angle\}/);
  assert.match(editorSource, /marker\.setAttribute\("overflow", "visible"\)/);
  assert.match(editorSource, /箭头头部已顺时针旋转 90°/);
  assert.match(editorSource, /snapOrthogonalConnectorToAnchor\(/);
  assert.match(editorSource, /resetArrowheadRotation\(el, atStart \? "marker-start" : "marker-end"\)/);
  assert.match(htmlSource, /只顺时针旋转箭头头部 90°/);
  assert.doesNotMatch(editorSource, /x: cx - \(point\.y - cy\)/);
  assert.match(cssSource, /\.connector-rotate-handle/);
  assert.match(cssSource, /\.connector-rotate-icon/);
});

test("endpoints glued to a shape side keep following it like Visio connectors", () => {
  assert.match(editorSource, /setConnectorGlue\(el, atStart, anchor\)/);
  assert.match(editorSource, /connectorGlue\(el, atStart\)/);
  assert.match(editorSource, /applyConnectorGlue\(el, changed = null\)/);
  assert.match(editorSource, /reflowGluedConnectors\(changedEls = \[\]\)/);
  assert.match(editorSource, /recordDragGlue\(drag\)/);
  assert.match(editorSource, /this\.recordDragGlue\(d\);/);
  assert.match(editorSource, /this\.reflowGluedConnectors\(d\.items\);/);
  assert.match(editorSource, /this\.reflowGluedConnectors\(\[\.\.\.movers\]\);/);
  assert.match(editorSource, /this\.reflowGluedConnectors\(\[data\.el\]\);/);
  assert.match(editorSource, /this\.pruneDanglingGlue\(\);/);
  assert.match(editorSource, /this\.inferConnectorGlue\(\);/);
  assert.match(editorSource, /inferConnectorGlue\(\)\s*\{/);
  // Hit clones must not duplicate the glue id or lookups can resolve to them.
  assert.match(editorSource, /hit\.removeAttribute\("data-glue-id"\)/);
  assert.match(editorSource, /tag === "line"[\s\S]{0,400}el\.setAttribute\("x1", first\.x\)/);
});

test("canvas connector dragging cannot trigger native SVG text selection", () => {
  assert.match(editorSource, /viewport\.addEventListener\("selectstart"/);
  assert.match(editorSource, /this\.clearNativeSelection\(\)/);
  assert.match(editorSource, /e\.target === textInput \|\| textInput\.contains\(e\.target\)/);
  assert.match(cssSource, /#viewport\s*\{[^}]*user-select:\s*none/s);
  assert.match(cssSource, /#text-input\s*\{[^}]*user-select:\s*text/s);
});

test("clicking text does not move it until the pointer passes a drag threshold", () => {
  assert.match(editorSource, /const TEXT_DRAG_THRESHOLD = 6/);
  assert.match(editorSource, /dragThresholdPassed\(drag, event/);
  assert.match(editorSource, /pending: textClick/);
  assert.match(editorSource, /\(d\.type === "connector-label" \|\| d\.textClick\) && !d\.moved/);
  assert.match(editorSource, /\(e\.key === "Enter" \|\| e\.key === "F2"\)/);
});

test("text editing overlay matches zoom and cannot show tiny scrollbars", () => {
  assert.match(htmlSource, /id="text-input"[^>]*rows="1"[^>]*wrap="off"/);
  assert.match(editorSource, /textEditMetrics\(el, screenBox\)/);
  assert.match(editorSource, /syncTextEditorOverlay\(\)/);
  assert.match(editorSource, /this\.syncTextEditorOverlay\(\)/);
  assert.match(editorSource, /Math\.hypot\(matrix\.a, matrix\.b\)/);
  assert.match(editorSource, /resizeTextInput\(\)/);
  assert.match(editorSource, /data-text-editing/);
  assert.match(cssSource, /#text-input\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /#text-input::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.match(cssSource, /#content \[data-text-editing\]/);
});

test("bottom and right canvas scrollbars are connected to viewBox navigation", () => {
  assert.match(htmlSource, /id="canvas-scroll-x"/);
  assert.match(htmlSource, /id="canvas-scroll-y"/);
  assert.match(htmlSource, /id="canvas-scroll-thumb-x"/);
  assert.match(htmlSource, /id="canvas-scroll-thumb-y"/);
  assert.match(editorSource, /scrollMetrics\(axis\)/);
  assert.match(editorSource, /moveScrollbar\(e\)/);
  assert.match(editorSource, /this\.updateScrollbars\(\)/);
});

test("right property sidebar has a persistent collapse control", () => {
  assert.match(htmlSource, /id="props-panel"/);
  assert.match(htmlSource, /id="btn-props-toggle"/);
  assert.match(cssSource, /#app\.props-collapsed\s*\{[^}]*grid-template-columns:\s*72px 1fr 38px/s);
  assert.match(editorSource, /togglePropsPanel\(/);
  assert.match(editorSource, /svg-editor-props-collapsed/);
});

test("high-resolution export supports SVG, PNG, JPEG and WebP in Cursor", () => {
  assert.match(htmlSource, /id="btn-export"/);
  assert.match(htmlSource, /id="export-menu"/);
  ["png", "jpeg", "webp", "svg"].forEach((format) => {
    assert.match(htmlSource, new RegExp(`<option value="${format}"`));
  });
  assert.doesNotMatch(htmlSource, /id="btn-export"[^>]*standalone-only/);
  assert.match(editorSource, /exportSelectedFormat\(/);
  assert.match(editorSource, /raster\.toBlob\(/);
  assert.match(editorSource, /applyRasterExportSize\(/);
  assert.match(editorSource, /loadExportImage\(/);
  assert.match(editorSource, /text-rendering", "geometricPrecision"/);
  assert.match(htmlSource, /value="8"/);
  assert.match(editorSource, /type: "export-file"/);
  assert.match(editorSource, /addEventListener\("dblclick"/);
  assert.match(editorSource, /exportSelectedFormat\(\{ direct: true \}\)/);
  assert.match(editorSource, /direct: options\.direct === true/);
  assert.match(extensionSource, /msg\.type === "export-file"/);
  assert.match(extensionSource, /const quick = msg\.direct === true/);
  assert.match(extensionSource, /targetName = path\.basename\(targetName, ext\) \+ "_export" \+ ext/);
  assert.match(extensionSource, /vscode\.window\.showSaveDialog\(/);
  assert.match(extensionSource, /vscode\.workspace\.fs\.writeFile\(/);
});
