(() => {
  const NS = "http://www.w3.org/2000/svg";
  const vscode =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

  const $ = (id) => document.getElementById(id);
  const canvas = $("canvas");
  const content = $("content");
  const overlay = $("overlay");
  const workspace = $("workspace");
  const viewport = $("viewport");
  const paper = $("paper");
  const paperGrid = $("paper-grid");
  const textInput = $("text-input");
  const scrollX = $("canvas-scroll-x");
  const scrollY = $("canvas-scroll-y");
  const scrollThumbX = $("canvas-scroll-thumb-x");
  const scrollThumbY = $("canvas-scroll-thumb-y");

  const GRAPHIC_TAGS = new Set([
    "rect",
    "circle",
    "ellipse",
    "line",
    "path",
    "polyline",
    "polygon",
    "text",
    "image",
  ]);
  const CONNECTABLE_TAGS = new Set(["rect", "circle", "ellipse", "polygon", "image"]);
  const TEXT_DRAG_THRESHOLD = 6;
  const HANDLE_RADIUS = 5;
  const GLUE_SIDES = new Set(["上", "右", "下", "左"]);
  const GLUE_ATTRS = {
    start: { id: "data-start-glue", side: "data-start-glue-side" },
    end: { id: "data-end-glue", side: "data-end-glue-side" },
  };
  const LINE_STYLE_DASHES = {
    solid: "",
    dashed: "10 6",
    dotted: "1 6",
    dashdot: "10 5 1 5",
  };
  const LINE_STYLE_LABELS = {
    solid: "实线",
    dashed: "虚线",
    dotted: "点线",
    dashdot: "点划线",
  };
  const LINE_STYLE_WEIGHTS = [1.5, 2.5, 3.5, 4.5];
  const STROKE_TAGS = new Set(["line", "path", "polyline", "polygon", "rect", "circle", "ellipse"]);
  const TEXT_STYLE_BUTTONS = [
    ["bold", "top-bold", "prop-bold"],
    ["italic", "top-italic", "prop-italic"],
    ["underline", "top-underline", "prop-underline"],
  ];
  const TEXT_ALIGN_BUTTONS = [
    ["start", "top-align-left", "prop-align-left"],
    ["middle", "top-align-center", "prop-align-center"],
    ["end", "top-align-right", "prop-align-right"],
    ["justify", "top-align-justify", "prop-align-justify"],
  ];
  const TEXT_LINE_SPACING_IDS = ["top-line-spacing", "prop-line-spacing"];
  const FLOW_SHAPE_LABELS = {
    rect: "矩形",
    rounded: "圆角矩形",
    ellipse: "圆形/椭圆",
    diamond: "判断菱形",
    parallelogram: "输入/输出",
    terminator: "开始/结束",
  };
  const TEXT_THEME_COLOR_COLUMNS = [
    ["#ffffff", "#f2f2f2", "#d9d9d9", "#bfbfbf", "#a6a6a6", "#7f7f7f"],
    ["#000000", "#808080", "#595959", "#404040", "#262626", "#0d0d0d"],
    ["#44546a", "#d6dce4", "#adb9ca", "#8497b0", "#323f4f", "#222a35"],
    ["#4472c4", "#d9e2f3", "#b4c6e7", "#8faadc", "#2f5597", "#203864"],
    ["#ed7d31", "#fce4d6", "#f8cbad", "#f4b183", "#c65911", "#833c0c"],
    ["#a5a5a5", "#ededed", "#dbdbdb", "#c9c9c9", "#7b7b7b", "#525252"],
    ["#ffc000", "#fff2cc", "#ffe699", "#ffd966", "#bf9000", "#806000"],
    ["#70ad47", "#e2f0d9", "#c6e0b4", "#a9d18e", "#548235", "#375623"],
    ["#5b9bd5", "#ddebf7", "#bdd7ee", "#9dc3e6", "#2e75b6", "#1f4e78"],
    ["#c55a11", "#f4b183", "#ed7d31", "#c65911", "#843c0c", "#572a06"],
  ];
  const TEXT_STANDARD_COLORS = [
    "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050",
    "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0",
  ];
  const TEXT_GRADIENT_COLORS = [
    ["#ffffff", "#000000"], ["#d9e8fb", "#2f6db2"], ["#fbd7d5", "#c94b4b"],
    ["#e4f2cc", "#76a83f"], ["#e9def4", "#78559b"], ["#d8f1f4", "#329bb0"],
    ["#fff0db", "#ed7d31"], ["#ffffff", "#ff3b30"], ["#ffffff", "#4472c4"],
    ["#fff59d", "#ffc000"], ["#d7f5ff", "#00a6d6"], ["#d5fae9", "#33c98a"],
    ["#5b9bd5", "#273c75"], ["#ff6b81", "#6c5ce7"],
  ];
  const RECENT_COLOR_LIMIT = 10;
  const RECENT_SYMBOL_LIMIT = 16;
  const RULER_SIZE = 24;
  const SPECIAL_SYMBOLS = [
    {
      id: "greek",
      label: "希腊字母",
      groups: [
        { title: "小写", chars: "αβγδεζηθικλμνξοπρστυφχψω" },
        { title: "大写", chars: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ" },
        { title: "变体", chars: "ϵϑϰϖϱϕϝ" },
      ],
    },
    {
      id: "math",
      label: "数学符号",
      groups: [
        { title: "运算", chars: "±×÷∓⋅∗∘∝" },
        { title: "关系", chars: "≠≈≡≤≥≪≫∼≃≅" },
        { title: "微积分", chars: "∞∂∇∆∑∏∫∮√∛∜" },
        { title: "集合", chars: "∈∉⊂⊃⊆⊇∪∩∅∀∃¬∧∨" },
        { title: "几何", chars: "∠⊥∥°′″△□" },
        { title: "箭头", chars: "←→↑↓↔⇒⇔↦" },
      ],
    },
    {
      id: "number",
      label: "数学序号",
      groups: [
        { title: "带圈数字", chars: "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳" },
        { title: "括号数字", chars: "⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇" },
        { title: "罗马数字", chars: "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ" },
        { title: "小写罗马", chars: "ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ" },
      ],
    },
    {
      id: "script",
      label: "上下标",
      groups: [
        { title: "上标", chars: "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿ" },
        { title: "下标", chars: "₀₁₂₃₄₅₆₇₈₉₊₋" },
        { title: "分数", chars: "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞" },
      ],
    },
    {
      id: "mark",
      label: "其他符号",
      groups: [
        { title: "标记", chars: "•·…※§¶†‡★☆✓✔✕✖" },
        { title: "单位", chars: "©®™℃℉‰‱µ" },
      ],
    },
  ];
  const PREFERENCES_KEY = "svg-manual-editor.preferences.v1";
  const EYEDROPPER_MAG = 13;
  const EYEDROPPER_CELL = 11;

  function clientToSvg(evt) {
    const pt = canvas.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(canvas.getScreenCTM().inverse());
  }

  function parseColor(value) {
    if (!value || value === "none" || value === "transparent") return null;
    const ctx = parseColor._ctx || (parseColor._ctx = document.createElement("canvas").getContext("2d"));
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    const computed = ctx.fillStyle;
    if (!computed || computed === "#000" && value !== "black" && value !== "#000" && value !== "#000000") {
      const m = String(value).match(/^#([0-9a-f]{3,8})$/i);
      if (m) {
        let h = m[1];
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        return "#" + h.slice(0, 6);
      }
    }
    if (computed.startsWith("rgb")) {
      const n = computed.match(/\d+/g).map(Number);
      return (
        "#" +
        n
          .slice(0, 3)
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")
      );
    }
    if (computed.startsWith("#")) return computed.slice(0, 7);
    return "#333333";
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  function hslToRgb(h, s, l) {
    h = ((Number(h) % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, Number(s) || 0));
    l = Math.max(0, Math.min(1, Number(l) || 0));
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  function hsvToRgb(h, s, v) {
    h = ((Number(h) % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, Number(s) || 0));
    v = Math.max(0, Math.min(1, Number(v) || 0));
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function rgbToHsv(r, g, b) {
    r = (Number(r) || 0) / 255;
    g = (Number(g) || 0) / 255;
    b = (Number(b) || 0) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }

  function hexToRgb(value) {
    const color = parseColor(value);
    if (!color) return [0, 0, 0];
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }

  function linearGradientVector(angle) {
    const rad = (((Number(angle) || 135) - 90) * Math.PI) / 180;
    const x = Math.cos(rad);
    const y = Math.sin(rad);
    return {
      x1: 50 - x * 50,
      y1: 50 - y * 50,
      x2: 50 + x * 50,
      y2: 50 + y * 50,
    };
  }

  function contrastInk(hex) {
    const [r, g, b] = hexToRgb(hex);
    return r * 0.299 + g * 0.587 + b * 0.114 > 160 ? "#1f2937" : "#ffffff";
  }

  function moreFillGradientPresets() {
    const families = [
      ["#fff5f5", "#fc8181", "#e53e3e", "#9b2c2c"],
      ["#fffaf0", "#f6ad55", "#dd6b20", "#9c4221"],
      ["#fffff0", "#f6e05e", "#d69e2e", "#975a16"],
      ["#f0fff4", "#68d391", "#38a169", "#276749"],
      ["#e6fffa", "#4fd1c5", "#319795", "#234e52"],
      ["#ebf8ff", "#63b3ed", "#3182ce", "#2a4365"],
      ["#faf5ff", "#b794f4", "#6b46c1", "#44337a"],
    ];
    const variants = [
      (stops) => ({ colors: ["#ffffff", stops[1]], angle: 135 }),
      (stops) => ({ colors: ["#ffffff", stops[2]], angle: 135 }),
      (stops) => ({ colors: [stops[0], stops[1]], angle: 90 }),
      (stops) => ({ colors: [stops[1], stops[2]], angle: 135 }),
      (stops) => ({ colors: [stops[1], stops[3]], angle: 135 }),
      (stops) => ({ colors: [stops[2], stops[3]], angle: 180 }),
      (stops) => ({ colors: [stops[0], stops[1], stops[3]], angle: 135 }),
      (stops) => ({ colors: [stops[3], stops[1]], angle: 45 }),
    ];
    const presets = [];
    variants.forEach((variant) => {
      families.forEach((stops) => presets.push(variant(stops)));
    });
    [
      { colors: ["#ff6b6b", "#feca57", "#1dd1a1", "#54a0ff"], angle: 90 },
      { colors: ["#f6d365", "#fda085", "#f093fb"], angle: 135 },
      { colors: ["#a1c4fd", "#c2e9fb", "#d4fc79"], angle: 90 },
      { colors: ["#ff9ff3", "#feca57", "#48dbfb"], angle: 135 },
      { colors: ["#84fab0", "#8fd3f4", "#a18cd1"], angle: 90 },
      { colors: ["#ee9ca7", "#ffdde1", "#a8edea"], angle: 135 },
      { colors: ["#ffffff", "#667eea", "#764ba2"], angle: 135 },
      { colors: ["#ffecd2", "#fcb69f"], angle: 180 },
      { colors: ["#ff9a9e", "#fecfef"], angle: 90 },
      { colors: ["#a8edea", "#fed6e3"], angle: 135 },
      { colors: ["#d4fc79", "#96e6a1"], angle: 135 },
      { colors: ["#a18cd1", "#fbc2eb"], angle: 135 },
      { colors: ["#2b5876", "#4e4376"], angle: 135 },
      { colors: ["#0f2027", "#203a43", "#2c5364"], angle: 180 },
      { colors: ["#f6d365", "#fda085"], angle: 90 },
      { colors: ["#a1c4fd", "#c2e9fb"], angle: 180 },
      { colors: ["#ee9ca7", "#ffdde1"], angle: 45 },
      { colors: ["#cfd9df", "#e2ebf0"], angle: 135 },
      { colors: ["#f5f7fa", "#c3cfe2"], angle: 180 },
      { colors: ["#e0c3fc", "#8ec5fc"], angle: 135 },
      { colors: ["#f093fb", "#f5576c"], angle: 90 },
      { colors: ["#ffffff", "#fc8181", "#9b2c2c"], angle: 0, kind: "radial" },
      { colors: ["#ffffff", "#f6e05e", "#975a16"], angle: 0, kind: "radial" },
      { colors: ["#ffffff", "#68d391", "#276749"], angle: 0, kind: "radial" },
      { colors: ["#ffffff", "#63b3ed", "#2a4365"], angle: 0, kind: "radial" },
      { colors: ["#ffffff", "#b794f4", "#44337a"], angle: 0, kind: "radial" },
      { colors: ["#fff5f5", "#f6ad55", "#e53e3e"], angle: 0, kind: "radial" },
      { colors: ["#ebf8ff", "#4fd1c5", "#3182ce"], angle: 0, kind: "radial" },
    ].forEach((preset) => presets.push(preset));
    return presets;
  }

  function standardDialogCells() {
    const radius = 7;
    const size = radius * 2 + 1;
    const cells = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.hypot(dx, dy);
        if (dist > radius + 0.12) continue;
        let color = "#000000";
        if (dist >= 0.55) {
          const hue = (((Math.atan2(dx, -dy) * 180) / Math.PI) + 420) % 360;
          const t = Math.min(1, dist / radius);
          color = rgbToHex(...hslToRgb(hue, 0.94 - 0.32 * t, 0.11 + 0.72 * t));
        }
        cells.push({ color, column: x + 1, row: y + 1 });
      }
    }
    return cells;
  }

  function prettySvg(svgEl) {
    const raw = new XMLSerializer().serializeToString(svgEl);
    const padded = raw.replace(/></g, ">\n<");
    const lines = padded.split("\n");
    let depth = 0;
    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("</")) depth = Math.max(0, depth - 1);
        const out = "  ".repeat(depth) + trimmed;
        if (
          trimmed.startsWith("<") &&
          !trimmed.startsWith("</") &&
          !trimmed.startsWith("<?") &&
          !trimmed.startsWith("<!") &&
          !trimmed.endsWith("/>") &&
          !trimmed.includes("</")
        ) {
          depth += 1;
        }
        return out;
      })
      .filter(Boolean)
      .join("\n") + "\n";
  }

  const PATH_RE = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;

  function parsePathD(d) {
    const parts = [];
    String(d || "").replace(PATH_RE, (_, cmd, args) => {
      const nums = args
        .trim()
        .split(/[\s,]+/)
        .filter((x) => x.length)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      parts.push({ cmd, nums });
    });
    return parts;
  }

  function serializePath(parts) {
    return parts
      .map((p) => (p.nums.length ? p.cmd + p.nums.join(" ") : p.cmd))
      .join("");
  }

  function pathToAbsolute(d) {
    const parts = parsePathD(d);
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    const out = [];
    for (const p of parts) {
      const c = p.cmd;
      const n = p.nums.slice();
      const rel = c === c.toLowerCase() && c.toLowerCase() !== "z";
      const k = c.toUpperCase();
      if (k === "Z") {
        out.push({ cmd: "Z", nums: [] });
        x = sx;
        y = sy;
        continue;
      }
      if (k === "M" || k === "L" || k === "T") {
        const nums = [];
        for (let i = 0; i < n.length; i += 2) {
          x = rel ? x + n[i] : n[i];
          y = rel ? y + n[i + 1] : n[i + 1];
          nums.push(x, y);
          if (k === "M" && i === 0) {
            sx = x;
            sy = y;
          }
        }
        out.push({ cmd: k === "M" && out.length ? "L" : k, nums });
        if (k === "M") out[out.length - 1].cmd = "M";
        continue;
      }
      if (k === "H") {
        const nums = [];
        for (const v of n) {
          x = rel ? x + v : v;
          nums.push(x);
        }
        out.push({ cmd: "H", nums });
        continue;
      }
      if (k === "V") {
        const nums = [];
        for (const v of n) {
          y = rel ? y + v : v;
          nums.push(y);
        }
        out.push({ cmd: "V", nums });
        continue;
      }
      if (k === "C") {
        const nums = [];
        for (let i = 0; i < n.length; i += 6) {
          const pts = n.slice(i, i + 6);
          if (rel) {
            pts[0] += x;
            pts[1] += y;
            pts[2] += x;
            pts[3] += y;
            pts[4] += x;
            pts[5] += y;
          }
          x = pts[4];
          y = pts[5];
          nums.push(...pts);
        }
        out.push({ cmd: "C", nums });
        continue;
      }
      if (k === "S" || k === "Q") {
        const step = k === "Q" ? 4 : 4;
        const nums = [];
        for (let i = 0; i < n.length; i += step) {
          const pts = n.slice(i, i + step);
          if (rel) {
            for (let j = 0; j < pts.length; j += 2) {
              pts[j] += x;
              pts[j + 1] += y;
            }
          }
          x = pts[pts.length - 2];
          y = pts[pts.length - 1];
          nums.push(...pts);
        }
        out.push({ cmd: k, nums });
        continue;
      }
      if (k === "A") {
        const nums = [];
        for (let i = 0; i < n.length; i += 7) {
          const pts = n.slice(i, i + 7);
          if (rel) {
            pts[5] += x;
            pts[6] += y;
          }
          x = pts[5];
          y = pts[6];
          nums.push(...pts);
        }
        out.push({ cmd: "A", nums });
        continue;
      }
      out.push({ cmd: k, nums: n });
    }
    return serializePath(out);
  }

  function pathVertices(d) {
    const parts = parsePathD(pathToAbsolute(d));
    const verts = [];
    let x = 0;
    let y = 0;
    parts.forEach((p, partIndex) => {
      const k = p.cmd;
      if (k === "M" || k === "L" || k === "T") {
        for (let i = 0; i < p.nums.length; i += 2) {
          x = p.nums[i];
          y = p.nums[i + 1];
          verts.push({ x, y, partIndex, offset: i, kind: "xy" });
        }
      } else if (k === "H") {
        p.nums.forEach((v, i) => {
          x = v;
          verts.push({ x, y, partIndex, offset: i, kind: "h" });
        });
      } else if (k === "V") {
        p.nums.forEach((v, i) => {
          y = v;
          verts.push({ x, y, partIndex, offset: i, kind: "v" });
        });
      } else if (k === "C") {
        for (let i = 0; i < p.nums.length; i += 6) {
          verts.push({
            x: p.nums[i + 4],
            y: p.nums[i + 5],
            partIndex,
            offset: i + 4,
            kind: "xy",
          });
          x = p.nums[i + 4];
          y = p.nums[i + 5];
        }
      } else if (k === "Q" || k === "S") {
        const step = 4;
        for (let i = 0; i < p.nums.length; i += step) {
          x = p.nums[i + 2];
          y = p.nums[i + 3];
          verts.push({ x, y, partIndex, offset: i + 2, kind: "xy" });
        }
      } else if (k === "A") {
        for (let i = 0; i < p.nums.length; i += 7) {
          x = p.nums[i + 5];
          y = p.nums[i + 6];
          verts.push({ x, y, partIndex, offset: i + 5, kind: "xy" });
        }
      }
    });
    return { parts, verts };
  }

  function setPathVertex(el, vertex, x, y) {
    const abs = pathToAbsolute(el.getAttribute("d") || "");
    const parts = parsePathD(abs);
    const p = parts[vertex.partIndex];
    if (!p) return;
    if (vertex.kind === "h") p.nums[vertex.offset] = x;
    else if (vertex.kind === "v") p.nums[vertex.offset] = y;
    else {
      p.nums[vertex.offset] = x;
      p.nums[vertex.offset + 1] = y;
    }
    el.setAttribute("d", serializePath(parts));
  }

  function translatePath(d, dx, dy) {
    const parts = parsePathD(pathToAbsolute(d));
    for (const p of parts) {
      const k = p.cmd;
      if (k === "H") p.nums = p.nums.map((v) => v + dx);
      else if (k === "V") p.nums = p.nums.map((v) => v + dy);
      else if (k === "A") {
        for (let i = 0; i < p.nums.length; i += 7) {
          p.nums[i + 5] += dx;
          p.nums[i + 6] += dy;
        }
      } else {
        for (let i = 0; i < p.nums.length; i += 2) {
          p.nums[i] += dx;
          p.nums[i + 1] += dy;
        }
      }
    }
    return serializePath(parts);
  }

  function num(el, attr, fallback = 0) {
    const v = parseFloat(el.getAttribute(attr));
    return Number.isFinite(v) ? v : fallback;
  }

  function tagOf(el) {
    return String((el && el.tagName) || "").toLowerCase();
  }

  function parseSvgLength(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text || text.toLowerCase() === "nan" || /%/.test(text)) return NaN;
    const n = parseFloat(text);
    return Number.isFinite(n) ? n : NaN;
  }

  function parseViewBox(value) {
    const nums = String(value || "")
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) return null;
    if (!(nums[2] > 0) || !(nums[3] > 0)) return null;
    return nums;
  }

  function formatCanvasSize(value, fallback = 800) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return String(fallback);
    return String(Math.round(n * 1000) / 1000);
  }

  function isHitClone(el) {
    return Boolean(el && el.classList && el.classList.contains("svg-ed-hit"));
  }

  function elementChildren(el) {
    if (!el) return [];
    if (el.children) return [...el.children];
    return [...(el.childNodes || [])].filter((child) => child && child.tagName);
  }

  function isLayerGroup(el) {
    if (tagOf(el) !== "g") return false;
    if (el.getAttribute && el.getAttribute("data-layer")) return true;
    if (el.getAttribute && el.getAttribute("inkscape:groupmode") === "layer") return true;
    return /^layer[-_]/i.test(String((el.getAttribute && el.getAttribute("id")) || ""));
  }

  function isLockedBackdrop(el, docBox) {
    if (!el || tagOf(el) !== "rect") return false;
    if (el.closest && el.closest("defs")) return false;
    const id = String((el.getAttribute && el.getAttribute("id")) || "").toLowerCase();
    if (id === "artboard-bg" || id === "artboard" || id === "canvas-bg" || id === "paper-bg") return true;
    if (!docBox) return false;
    const x = num(el, "x");
    const y = num(el, "y");
    const w = num(el, "width");
    const h = num(el, "height");
    if (!(w > 0) || !(h > 0)) return false;
    return (
      Math.abs(x - docBox.x) <= 1 &&
      Math.abs(y - docBox.y) <= 1 &&
      Math.abs(w - docBox.w) <= 1 &&
      Math.abs(h - docBox.h) <= 1
    );
  }

  function isComponentGroup(el) {
    if (tagOf(el) !== "g") return false;
    if (isLayerGroup(el)) return false;
    if (el.closest && el.closest("defs")) return false;
    if (el.getAttribute && el.getAttribute("data-object")) return true;
    const kids = elementChildren(el).filter((child) => !isHitClone(child));
    const hasGraphic = kids.some((child) => GRAPHIC_TAGS.has(tagOf(child)) && tagOf(child) !== "text");
    const hasText = kids.some((child) => tagOf(child) === "text");
    return hasGraphic && hasText;
  }

  function isActiveMarkerValue(value) {
    return Boolean(value && value !== "none");
  }

  function hasArrowMarker(el) {
    if (
      isActiveMarkerValue(el.getAttribute("marker-start")) ||
      isActiveMarkerValue(el.getAttribute("marker-end"))
    ) {
      return true;
    }
    try {
      const style = getComputedStyle(el);
      return [style.markerStart, style.markerEnd].some((value) => isActiveMarkerValue(value));
    } catch (_) {
      return false;
    }
  }

  function isConnectableShape(el) {
    const tag = el.tagName.toLowerCase();
    if (CONNECTABLE_TAGS.has(tag)) return true;
    if (tag !== "path" || hasArrowMarker(el)) return false;
    const fill = el.getAttribute("fill") || el.style.fill || getComputedStyle(el).fill;
    return Boolean(fill && fill !== "none" && fill !== "transparent");
  }

  function isConnectorElement(el) {
    if (!el || !el.tagName) return false;
    return new Set(["line", "path", "polyline"]).has(el.tagName.toLowerCase());
  }

  function isLineLikeConnector(el) {
    if (!isConnectorElement(el)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "line" || tag === "polyline" || hasArrowMarker(el)) return true;
    let fill = el.getAttribute("fill") || el.style.fill;
    if (!fill) {
      try {
        fill = getComputedStyle(el).fill;
      } catch (_) {
        fill = "none";
      }
    }
    return !fill || fill === "none" || fill === "transparent";
  }

  function snapshotEl(el) {
    const tag = el.tagName.toLowerCase();
    const attrs = {};
    for (const a of el.attributes) attrs[a.name] = a.value;
    return { tag, attrs, html: el.innerHTML };
  }

  function restoreEl(el, snap) {
    [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    Object.entries(snap.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (snap.html !== el.innerHTML) el.innerHTML = snap.html;
  }

  function moveBy(el, dx, dy) {
    const tag = el.tagName.toLowerCase();
    if (el.hasAttribute("data-flow-shape")) {
      el.setAttribute("data-shape-x", num(el, "data-shape-x") + dx);
      el.setAttribute("data-shape-y", num(el, "data-shape-y") + dy);
    }
    if (tag === "text" || tag === "tspan") {
      el.setAttribute("x", num(el, "x") + dx);
      el.setAttribute("y", num(el, "y") + dy);
      el.querySelectorAll("tspan").forEach((t) => {
        if (t.hasAttribute("x")) t.setAttribute("x", num(t, "x") + dx);
        if (t.hasAttribute("y")) t.setAttribute("y", num(t, "y") + dy);
      });
      return;
    }
    if (tag === "g") {
      elementChildren(el).forEach((child) => moveBy(child, dx, dy));
      return;
    }
    if (tag === "rect" || tag === "image") {
      el.setAttribute("x", num(el, "x") + dx);
      el.setAttribute("y", num(el, "y") + dy);
      return;
    }
    if (tag === "circle" || tag === "ellipse") {
      el.setAttribute("cx", num(el, "cx") + dx);
      el.setAttribute("cy", num(el, "cy") + dy);
      return;
    }
    if (tag === "line") {
      el.setAttribute("x1", num(el, "x1") + dx);
      el.setAttribute("y1", num(el, "y1") + dy);
      el.setAttribute("x2", num(el, "x2") + dx);
      el.setAttribute("y2", num(el, "y2") + dy);
      return;
    }
    if (tag === "path") {
      el.setAttribute("d", translatePath(el.getAttribute("d") || "", dx, dy));
      return;
    }
    if (tag === "polyline" || tag === "polygon") {
      const pts = (el.getAttribute("points") || "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      for (let i = 0; i + 1 < pts.length; i += 2) {
        pts[i] += dx;
        pts[i + 1] += dy;
      }
      el.setAttribute("points", pts.join(" "));
    }
  }

  function isEditable(el, docBox) {
    if (!el || !el.tagName || el === content) return false;
    if (el.closest && el.closest("defs")) return false;
    if (el.classList && el.classList.contains("svg-ed-hit")) return false;
    if (isLockedBackdrop(el, docBox)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "tspan") return el.closest("text");
    return GRAPHIC_TAGS.has(tag);
  }

  function graphicFromTarget(el, docBox) {
    if (!el) return null;
    if (el.classList && el.classList.contains("svg-ed-hit")) {
      const id = el.getAttribute("data-ed-for");
      return id ? content.querySelector(`[data-ed-id="${id}"]`) : null;
    }
    const text = el.closest && el.closest("text");
    if (text && content.contains(text) && isEditable(text, docBox)) return text;
    let cur = el;
    while (cur && cur !== content) {
      if (isEditable(cur, docBox)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  function uid() {
    return "e" + Math.random().toString(36).slice(2, 9);
  }

  class History {
    constructor() {
      this.stack = [];
      this.index = -1;
    }
    push(text) {
      if (this.stack[this.index] === text) return;
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push(text);
      if (this.stack.length > 80) this.stack.shift();
      this.index = this.stack.length - 1;
    }
    undo() {
      if (this.index <= 0) return null;
      this.index -= 1;
      return this.stack[this.index];
    }
    redo() {
      if (this.index >= this.stack.length - 1) return null;
      this.index += 1;
      return this.stack[this.index];
    }
  }

  class Editor {
    constructor() {
      this.tool = "select";
      this.selected = [];
      this.view = { x: 0, y: 0, w: 1800, h: 820 };
      this.docBox = { x: 0, y: 0, w: 1800, h: 820 };
      this.originalAttrs = [];
      this.history = new History();
      this.drag = null;
      this.scrollDrag = null;
      this.space = false;
      this.editingText = null;
      this.polyPoints = [];
      this.polyConnectionAnchors = [];
      this.polyEndpointTargets = [];
      this.polyStartAnchor = null;
      this.polyEndAnchor = null;
      this.connectionAnchorsVisible = false;
      this.overlayHandlePoints = [];
      this.shapeKind = "rect";
      this.arrowMode = "free";
      this.fileName = "figure.svg";
      this.dirty = false;
      this.syncTimer = null;
      this.exportClickTimer = null;
      this.lastHostText = null;
      this.eyedropper = null;
      this.eyedropperApply = "text";
      this.colorMenuTarget = "text";
      this.recentColors = [];
      this.recentSymbols = [];
      this.rulersVisible = false;
      this.symbolTab = "greek";
      this.symbolMenuVisible = false;
      this.colorDialogCurrent = "#000000";
      this.colorDialogNext = "#000000";
      this.colorDialogHsv = { h: 0, s: 0, v: 0 };
      this.colorDialogVisible = false;
      this.colorMenuVisible = false;
      this.moreFillsVisible = false;
      this._moreFillsTimer = null;
      this._eyedropperPointer = null;
      this._eyedropperSnapTimer = null;
      this._eyedropperSnapToken = 0;
      this._holdRepeat = null;
      this.bind();
    }

    bind() {
      this.buildTextColorPalette();
      this.buildSymbolPalette();
      document.querySelectorAll(".tool[data-tool]").forEach((btn) => {
        btn.addEventListener("click", () => this.setTool(btn.dataset.tool));
      });
      $("btn-shape").addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = $("shape-menu");
        const willOpen = menu.classList.contains("hidden");
        this.closeToolbarMenus();
        if (willOpen) {
          menu.classList.remove("hidden");
          $("btn-shape").setAttribute("aria-expanded", "true");
        }
      });
      document.querySelectorAll("[data-shape]").forEach((button) => {
        button.addEventListener("click", () => {
          this.shapeKind = button.dataset.shape;
          document.querySelectorAll("[data-shape]").forEach((item) =>
            item.classList.toggle("active", item === button)
          );
          this.setTool("shape");
        });
      });
      $("btn-arrow").addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = $("arrow-menu");
        const willOpen = menu.classList.contains("hidden");
        this.closeToolbarMenus();
        if (willOpen) {
          menu.classList.remove("hidden");
          $("btn-arrow").setAttribute("aria-expanded", "true");
        }
      });
      document.querySelectorAll("[data-arrow-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          this.arrowMode = button.dataset.arrowMode;
          document.querySelectorAll("[data-arrow-mode]").forEach((item) =>
            item.classList.toggle("active", item === button)
          );
          this.persistPreferences();
          this.setTool("arrow");
        });
      });
      $("btn-add-node").addEventListener("click", () => this.addConnectorNode());
      this.buildLineStyleMenu();
      this.buildPropLineStyleMenu();
      $("btn-line-style").addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = $("line-style-menu");
        const willOpen = menu.classList.contains("hidden");
        this.closeToolbarMenus();
        if (willOpen) {
          menu.classList.remove("hidden");
          $("btn-line-style").setAttribute("aria-expanded", "true");
          this.syncLineStyleMenu();
        }
      });
      $("btn-line-none").addEventListener("click", () => this.applyNoStroke());
      document.querySelectorAll("[data-arrow-ends]").forEach((button) => {
        button.addEventListener("click", () => this.applyConnectorArrowEnds(button.dataset.arrowEnds));
      });
      $("btn-line-text").addEventListener("click", () => this.addConnectorTextFromToolbar());
      $("prop-line-style-btn").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ($("prop-line-style-btn").disabled) return;
        const menu = $("prop-line-style-menu");
        const willOpen = menu.classList.contains("hidden");
        this.closeToolbarMenus();
        if (willOpen) {
          menu.classList.remove("hidden");
          $("prop-line-style-btn").setAttribute("aria-expanded", "true");
          this.positionPropLineStyleMenu();
        }
      });
      if (typeof document.addEventListener === "function") {
        document.addEventListener("pointerdown", (e) => {
          const combo = e.target && e.target.closest ? e.target.closest(".line-style-combo") : null;
          if (!combo) this.closePropLineStyleMenu();
        });
      }
      $("btn-delete").addEventListener("click", () => this.deleteSelected());
      $("btn-undo").addEventListener("click", () => this.undo());
      $("btn-redo").addEventListener("click", () => this.redo());
      $("btn-save").addEventListener("click", () => this.save());
      $("btn-export").addEventListener("click", (e) => {
        if (e.detail > 1) return;
        if (e.detail === 0) {
          this.toggleExportMenu();
          return;
        }
        clearTimeout(this.exportClickTimer);
        this.exportClickTimer = setTimeout(() => {
          this.exportClickTimer = null;
          this.toggleExportMenu();
        }, 240);
      });
      $("btn-export").addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(this.exportClickTimer);
        this.exportClickTimer = null;
        $("export-menu").classList.add("hidden");
        $("btn-export").setAttribute("aria-expanded", "false");
        this.exportSelectedFormat({ direct: true }).catch((error) => {
          this.status("快速导出失败：" + (error && error.message ? error.message : "未知错误"));
        });
      });
      ["export-format", "export-scale", "export-background"].forEach((id) =>
        $(id).addEventListener("change", () => this.updateExportMenu(true))
      );
      $("btn-export-go").addEventListener("click", () => {
        this.exportSelectedFormat().catch((error) => {
          this.status("导出失败：" + (error && error.message ? error.message : "未知错误"));
        });
      });
      $("btn-fit").addEventListener("click", () => this.fit());
      $("btn-canvas-size").addEventListener("click", () => this.toggleRulers());
      $("btn-grid").addEventListener("click", () => this.toggleGrid());
      $("snap-toggle").addEventListener("change", () => {
        this.persistPreferences();
        this.status($("snap-toggle").checked ? "已开启网格吸附" : "已关闭网格吸附");
      });
      $("btn-props-toggle").addEventListener("click", () => this.togglePropsPanel());
      $("btn-line-label-add").addEventListener("click", () => this.insertConnectorLabel());
      $("btn-line-label-remove").addEventListener("click", () => this.removeConnectorLabel());
      $("prop-line-label").addEventListener("input", () => this.updateConnectorLabelText());
      $("prop-line-label-position").addEventListener("input", () => this.setConnectorLabelPosition());
      $("btn-front").addEventListener("click", () => this.order("front"));
      $("btn-back").addEventListener("click", () => this.order("back"));
      $("smart-toggle").addEventListener("change", () => {
        if (!$("smart-toggle").checked) this.redrawOverlay();
        this.persistPreferences();
        this.status($("smart-toggle").checked ? "已开启智能对齐与等距吸附" : "已关闭智能参考线");
      });
      $("btn-text-color").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleColorMenu("text");
      });
      $("btn-prop-fill").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleColorMenu("fill");
      });
      $("btn-prop-stroke").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleColorMenu("stroke");
      });
      $("text-color-menu").addEventListener("click", (e) => {
        const colorButton = e.target.closest("[data-text-color]");
        if (colorButton) {
          this.applySolidColor(colorButton.dataset.textColor, this.colorMenuTarget || "text");
          return;
        }
        const gradientButton = e.target.closest("[data-text-gradient]");
        if (gradientButton) this.applyGradientSwatch(gradientButton);
      });
      $("top-text-color").addEventListener("input", () =>
        this.applySolidColor($("top-text-color").value, "text", { remember: false })
      );
      $("top-text-color").addEventListener("change", () =>
        this.applySolidColor($("top-text-color").value, "text")
      );
      $("prop-fill").addEventListener("change", () => this.rememberColor($("prop-fill").value));
      $("prop-stroke").addEventListener("change", () => this.rememberColor($("prop-stroke").value));
      $("text-color-more").addEventListener("click", (e) => {
        e.stopPropagation();
        this.showMoreFills(true);
      });
      $("text-color-more").addEventListener("pointerenter", () => this.showMoreFills(true));
      $("text-color-more").addEventListener("pointerleave", () => this.scheduleHideMoreFills());
      const moreFills = $("color-more-fills");
      if (moreFills) {
        moreFills.addEventListener("pointerenter", () => this.cancelHideMoreFills());
        moreFills.addEventListener("pointerleave", () => this.scheduleHideMoreFills());
        moreFills.addEventListener("click", (e) => {
          this.applyGradientSwatch(e.target.closest("[data-text-gradient]"));
        });
      }
      $("color-more-settings").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openColorDialog("custom");
      });
      $("text-color-custom").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openColorDialog("standard");
      });
      $("text-color-eyedropper").addEventListener("click", (e) => {
        e.stopPropagation();
        this.pickColor(this.colorMenuTarget || "text");
      });
      $("color-dialog-close").addEventListener("click", () => this.closeColorDialog());
      $("color-dialog-cancel").addEventListener("click", () => this.closeColorDialog());
      $("color-dialog-ok").addEventListener("click", () => this.confirmColorDialog());
      $("color-dialog-layer").addEventListener("pointerdown", (e) => {
        if (e.target === $("color-dialog-layer")) this.closeColorDialog();
      });
      document.querySelectorAll("[data-color-tab]").forEach((tab) => {
        tab.addEventListener("click", () => this.setColorDialogTab(tab.dataset.colorTab));
      });
      $("color-dialog-standard-grid").addEventListener("click", (e) => {
        const swatch = e.target.closest("[data-dialog-color]");
        if (swatch) this.setColorDialogNext(swatch.dataset.dialogColor);
      });
      $("color-dialog-standard-grid").addEventListener("dblclick", (e) => {
        const swatch = e.target.closest("[data-dialog-color]");
        if (!swatch) return;
        this.setColorDialogNext(swatch.dataset.dialogColor);
        this.confirmColorDialog();
      });
      $("color-dialog-gray-row").addEventListener("click", (e) => {
        const swatch = e.target.closest("[data-dialog-color]");
        if (swatch) this.setColorDialogNext(swatch.dataset.dialogColor);
      });
      $("color-dialog-recent").addEventListener("click", (e) => {
        const swatch = e.target.closest("[data-text-color]");
        if (swatch) this.setColorDialogNext(swatch.dataset.textColor);
      });
      $("color-sv-canvas").addEventListener("pointerdown", (e) => this.handleSvPointer(e));
      $("color-sv-canvas").addEventListener("pointermove", (e) => {
        if (e.buttons) this.handleSvPointer(e);
      });
      $("color-hue-slider").addEventListener("input", () => {
        this.colorDialogHsv.h = parseFloat($("color-hue-slider").value) || 0;
        this.syncColorDialogFromHsv();
      });
      ["r", "g", "b"].forEach((channel) => {
        $(`color-input-${channel}`).addEventListener("input", () => this.syncColorDialogFromRgb());
      });
      $("color-input-hex").addEventListener("change", () => {
        const color = parseColor($("color-input-hex").value);
        if (color) this.setColorDialogNext(color);
      });
      [
        ["h", 360],
        ["s", 100],
        ["l", 100],
      ].forEach(([channel]) => {
        const range = $(`color-input-${channel}`);
        const numeric = $(`color-input-${channel}-num`);
        const sync = () => this.syncColorDialogFromHsl();
        range.addEventListener("input", () => {
          numeric.value = range.value;
          sync();
        });
        numeric.addEventListener("input", () => {
          range.value = numeric.value;
          sync();
        });
      });
      const eyedropperLayer = $("eyedropper-layer");
      if (eyedropperLayer) {
        eyedropperLayer.addEventListener("pointerdown", (e) => {
          if (!this.eyedropper) return;
          e.preventDefault();
          e.stopPropagation();
          this.handleEyedropperPointerDown(e);
        });
        eyedropperLayer.addEventListener("contextmenu", (e) => {
          if (!this.eyedropper) return;
          e.preventDefault();
        });
        eyedropperLayer.addEventListener(
          "wheel",
          (e) => {
            if (!this.eyedropper) return;
            e.preventDefault();
            this.onEyedropperWheel(e);
          },
          { passive: false }
        );
      }
      $("top-font-family").addEventListener("change", () => {
        const family = $("top-font-family").value;
        if (family) this.applyTextFormat("font-family", family);
      });
      $("top-font-size").addEventListener("input", () => {
        const size = parseFloat($("top-font-size").value);
        if (Number.isFinite(size) && size > 0) this.applyTextFormat("font-size", size);
      });
      this.bindHoldRepeat("top-font-decrease", () => this.applyTextFormat("font-size-step", -1));
      this.bindHoldRepeat("top-font-increase", () => this.applyTextFormat("font-size-step", 1));
      this.bindHoldRepeat("prop-fs-decrease", () => this.nudgePropFontSize(-1));
      this.bindHoldRepeat("prop-fs-increase", () => this.nudgePropFontSize(1));
      this.bindHoldRepeat("prop-sw-decrease", () => this.nudgePropStrokeWidth(-0.2));
      this.bindHoldRepeat("prop-sw-increase", () => this.nudgePropStrokeWidth(0.2));
      TEXT_STYLE_BUTTONS.forEach(([action, ...ids]) => {
        ids.forEach((id) => $(id).addEventListener("click", () => this.applyTextFormat(action)));
      });
      TEXT_ALIGN_BUTTONS.forEach(([anchor, ...ids]) => {
        ids.forEach((id) => $(id).addEventListener("click", () => this.applyTextFormat("align", anchor)));
      });
      TEXT_LINE_SPACING_IDS.forEach((id) => {
        $(id).addEventListener("change", () => {
          const spacing = parseFloat($(id).value);
          if (Number.isFinite(spacing) && spacing > 0) this.applyTextFormat("line-spacing", spacing);
        });
      });
      $("btn-symbol").addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSymbolMenu();
      });
      const symbolWrap = $("symbol-wrap");
      if (symbolWrap) {
        symbolWrap.addEventListener("mousedown", (e) => {
          if (this.editingText) e.preventDefault();
          e.stopPropagation();
        });
      }
      const symbolMenu = $("symbol-menu");
      if (symbolMenu) {
        symbolMenu.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        symbolMenu.addEventListener("click", (e) => this.onSymbolMenuClick(e));
      }
      $("file-input")?.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) this.openFile(file);
        e.target.value = "";
      });

      viewport.addEventListener("pointerdown", (e) => this.onPointerDown(e));
      viewport.addEventListener("selectstart", (e) => {
        if (e.target === textInput || textInput.contains(e.target)) return;
        e.preventDefault();
      });
      viewport.addEventListener("dragstart", (e) => {
        if (e.target !== textInput) e.preventDefault();
      });
      window.addEventListener("pointermove", (e) => this.onPointerMove(e));
      window.addEventListener("pointerup", (e) => this.onPointerUp(e));
      scrollX.addEventListener("pointerdown", (e) => this.startScrollbarDrag(e, "x"));
      scrollY.addEventListener("pointerdown", (e) => this.startScrollbarDrag(e, "y"));
      window.addEventListener("resize", () => {
        this.updateScrollbars();
        this.updateRulers();
        if (!$("text-color-menu").classList.contains("hidden")) this.positionColorMenu();
        if (this.symbolMenuVisible) this.positionSymbolMenu();
      });
      window.addEventListener("pointerdown", (e) => {
        if (this.isColorMenuEvent(e.target) || this.isSymbolMenuEvent(e.target)) return;
        this.closeTextColorMenu();
        this.closeSymbolMenu();
      });
      if (typeof ResizeObserver === "function") {
        this._resizeObserver = new ResizeObserver(() => {
          this.updateScrollbars();
          this.updateRulers();
        });
        this._resizeObserver.observe(viewport);
      }
      viewport.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          this.onWheel(e);
        },
        { passive: false }
      );
      viewport.addEventListener("dblclick", (e) => this.onDblClick(e));

      viewport.addEventListener("dragover", (e) => e.preventDefault());
      viewport.addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && /svg/i.test(file.name + file.type)) this.openFile(file);
      });

      window.addEventListener("keydown", (e) => this.onKeyDown(e));
      window.addEventListener("pointerup", () => this.stopHoldRepeat());
      window.addEventListener("blur", () => this.stopHoldRepeat());
      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
          this.space = false;
          viewport.classList.remove("space", "down");
        }
      });

      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.commitTextEdit();
        }
        if (e.key === "Escape") this.cancelTextEdit();
        e.stopPropagation();
      });
      textInput.addEventListener("blur", (e) => {
        if (this.isSymbolMenuEvent(e.relatedTarget) || this.symbolMenuVisible) return;
        this.commitTextEdit();
      });
      textInput.addEventListener("input", () => this.resizeTextInput());

      [
        "prop-text",
        "prop-fill",
        "prop-fill-none",
        "prop-stroke",
        "prop-sw",
        "prop-line-style",
        "prop-line-join",
        "prop-arrow-ends",
        "prop-fs",
        "prop-ff",
        "prop-x",
        "prop-y",
        "prop-w",
        "prop-h",
      ].forEach((id) => {
        const node = $(id);
        const ev = node.type === "checkbox" || node.tagName === "SELECT" ? "change" : "input";
        node.addEventListener(ev, () => this.applyProps(id));
      });
      $("prop-square-from-w").addEventListener("click", () => this.makeSelectedSquare("w"));
      $("prop-square-from-h").addEventListener("click", () => this.makeSelectedSquare("h"));

      window.addEventListener("message", (e) => {
        let msg = e.data;
        if (typeof msg === "string") {
          try {
            msg = JSON.parse(msg);
          } catch (_) {
            return;
          }
        }
        if (msg && msg.type === "export-result") {
          this.status(
            msg.ok
              ? (msg.quick ? "已快速导出到当前文件夹：" : "已导出 ") + (msg.fileName || "图片")
              : msg.canceled
                ? "已取消导出"
                : "导出失败"
          );
          return;
        }
        if (msg && msg.type === "preferences" && msg.value && typeof msg.value === "object") {
          this.applyPreferences(msg.value);
          return;
        }
        if (msg && msg.type === "load" && typeof msg.text === "string") {
          this.fileName = msg.fileName || this.fileName;
          this.loadString(msg.text, { record: true, fromHost: true });
        }
      });

      this.restorePreferences();
      this.applyView();
      this.syncTextToolbar();
      this.history.push(this.serialize());
      const boot = readBootPayload();
      if (boot && typeof boot.text === "string" && boot.text.trim()) {
        this.fileName = boot.fileName || this.fileName;
        this.loadString(boot.text, { record: true, fromHost: true });
      }
      if (vscode) {
        vscode.postMessage({ type: "ready" });
      }
    }

    setTool(tool) {
      this.commitTextEdit();
      this.polyPoints = [];
      this.polyConnectionAnchors = [];
      this.polyEndpointTargets = [];
      this.polyStartAnchor = null;
      this.polyEndAnchor = null;
      this.connectionAnchorsVisible = false;
      this.clearPreview();
      viewport.style.cursor = "";
      this.closeTextColorMenu();
      this.closeToolbarMenus();
      this.closeSymbolMenu();
      let placedInShape = false;
      if (tool === "text") {
        placedInShape = this.createTextInSelectedShapes();
        if (placedInShape) tool = "select";
      }
      this.tool = tool;
      document.querySelectorAll(".tool[data-tool]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tool === tool);
      });
      $("btn-shape").classList.toggle("active", tool === "shape");
      $("btn-arrow").classList.toggle("active", tool === "arrow");
      viewport.classList.toggle("panning", tool === "pan");
      const arrowModeLabel = {
        vertical: "垂直直线",
        horizontal: "水平直线",
        free: "倾斜直线",
      }[this.arrowMode] || "倾斜直线";
      if (placedInShape) {
        this.status("已在图形内部添加文字，可直接输入");
      } else {
        this.status(
          {
            select: "选择工具：单击选中，拖动移动；拉大小时按住 Ctrl 等比例缩放",
            pan: "平移画布，或按住空格拖动",
            text: "点击画布放置文字，随后可直接输入；选中图形后再点文字，会在图形内部居中添加",
            shape: `拖动绘制${FLOW_SHAPE_LABELS[this.shapeKind] || "图形"}，按住 Shift 约束为等宽高`,
            arrow: `拖动创建${arrowModeLabel}箭头；需要转向时，选中线后点击“增加节点”`,
            polyline: "依次单击添加折点，移动鼠标只预览，双击或 Enter 结束，Esc 取消",
          }[tool] || ""
        );
      }
    }

    closeToolbarMenus() {
      $("shape-menu").classList.add("hidden");
      $("btn-shape").setAttribute("aria-expanded", "false");
      $("arrow-menu").classList.add("hidden");
      $("btn-arrow").setAttribute("aria-expanded", "false");
      $("line-style-menu").classList.add("hidden");
      $("btn-line-style").setAttribute("aria-expanded", "false");
      this.closePropLineStyleMenu();
    }

    closePropLineStyleMenu() {
      const menu = $("prop-line-style-menu");
      const button = $("prop-line-style-btn");
      if (menu) menu.classList.add("hidden");
      if (button) button.setAttribute("aria-expanded", "false");
    }

    status(text) {
      $("status-text").textContent = text;
    }

    defaultPreferences() {
      return {
        gridVisible: false,
        rulersVisible: false,
        snapToGrid: false,
        smartGuides: true,
        exportFormat: "png",
        exportScale: "2",
        exportBackground: "transparent",
        propsCollapsed: false,
        arrowMode: "free",
        recentColors: [],
        recentSymbols: [],
      };
    }

    normalizePreferences(value, base = this.defaultPreferences()) {
      const input = value && typeof value === "object" ? value : {};
      const next = { ...base };
      ["gridVisible", "rulersVisible", "snapToGrid", "smartGuides", "propsCollapsed"].forEach((key) => {
        if (typeof input[key] === "boolean") next[key] = input[key];
      });
      if (["png", "jpeg", "webp", "svg"].includes(input.exportFormat)) {
        next.exportFormat = input.exportFormat;
      }
      if (["1", "2", "4", "8"].includes(String(input.exportScale))) {
        next.exportScale = String(input.exportScale);
      }
      if (["transparent", "white"].includes(input.exportBackground)) {
        next.exportBackground = input.exportBackground;
      }
      if (["vertical", "horizontal", "free"].includes(input.arrowMode)) {
        next.arrowMode = input.arrowMode;
      }
      next.recentColors = this.mergeRecentValues(
        input.recentColors,
        next.recentColors,
        (list) => this.normalizeRecentColors(list)
      );
      next.recentSymbols = this.mergeRecentValues(
        input.recentSymbols,
        next.recentSymbols,
        (list) => this.normalizeRecentSymbols(list)
      );
      if (next.exportFormat === "jpeg") next.exportBackground = "white";
      return next;
    }

    mergeRecentValues(incoming, fallback, normalize) {
      if (!Array.isArray(incoming)) return normalize(fallback);
      const next = normalize(incoming);
      if (next.length) return next;
      const kept = normalize(fallback);
      return kept.length ? kept : next;
    }

    normalizeRecentSymbols(list) {
      const seen = new Set();
      const symbols = [];
      (Array.isArray(list) ? list : []).forEach((value) => {
        const symbol = String(value || "");
        if (!symbol || [...symbol].length > 2) return;
        if (seen.has(symbol)) return;
        seen.add(symbol);
        symbols.push(symbol);
      });
      return symbols.slice(0, RECENT_SYMBOL_LIMIT);
    }

    normalizeRecentColors(list) {
      const seen = new Set();
      const colors = [];
      (Array.isArray(list) ? list : []).forEach((value) => {
        const color = parseColor(value);
        if (!color) return;
        const key = color.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        colors.push(color);
      });
      return colors.slice(0, RECENT_COLOR_LIMIT);
    }

    currentPreferences() {
      return this.normalizePreferences({
        gridVisible: paperGrid.getAttribute("visibility") === "visible",
        rulersVisible: this.rulersVisible,
        snapToGrid: $("snap-toggle").checked,
        smartGuides: $("smart-toggle").checked,
        exportFormat: $("export-format").value,
        exportScale: $("export-scale").value,
        exportBackground: $("export-background").value,
        propsCollapsed: $("app").classList.contains("props-collapsed"),
        arrowMode: this.arrowMode,
        recentColors: this.recentColors,
        recentSymbols: this.recentSymbols,
      });
    }

    persistPreferences() {
      const value = this.currentPreferences();
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
          localStorage.removeItem("svg-editor-props-collapsed");
        }
      } catch (_) {
        // The extension host copy below remains the durable fallback.
      }
      try {
        if (vscode && typeof vscode.setState === "function") vscode.setState(value);
      } catch (_) {
        /* ignore */
      }
      if (vscode) vscode.postMessage({ type: "preferences", value });
      return value;
    }

    restorePreferences() {
      let stored = null;
      let webviewState = null;
      let legacyCollapsed = false;
      try {
        if (typeof localStorage !== "undefined") {
          const raw = localStorage.getItem(PREFERENCES_KEY);
          if (raw) stored = JSON.parse(raw);
          legacyCollapsed = localStorage.getItem("svg-editor-props-collapsed") === "1";
        }
      } catch (_) {
        stored = null;
      }
      try {
        if (vscode && typeof vscode.getState === "function") webviewState = vscode.getState();
      } catch (_) {
        webviewState = null;
      }
      const fallback = stored || webviewState ? null : { propsCollapsed: legacyCollapsed };
      const value = [stored, webviewState, fallback]
        .filter((source) => source && typeof source === "object")
        .reduce((base, source) => this.normalizePreferences(source, base), this.defaultPreferences());
      this.applyPreferences(value);
    }

    applyPreferences(value) {
      const preferences = this.normalizePreferences(value, this.currentPreferences());
      this.setGridVisible(preferences.gridVisible, false, false);
      this.setRulersVisible(preferences.rulersVisible, false, false);
      $("snap-toggle").checked = preferences.snapToGrid;
      $("smart-toggle").checked = preferences.smartGuides;
      $("export-format").value = preferences.exportFormat;
      $("export-scale").value = preferences.exportScale;
      $("export-background").value = preferences.exportBackground;
      this.arrowMode = preferences.arrowMode;
      this.recentColors = preferences.recentColors || [];
      this.recentSymbols = preferences.recentSymbols || [];
      this.renderRecentColors();
      this.renderRecentSymbols();
      document.querySelectorAll("[data-arrow-mode]").forEach((button) =>
        button.classList.toggle("active", button.dataset.arrowMode === this.arrowMode)
      );
      this.togglePropsPanel(preferences.propsCollapsed, false, false);
      this.updateExportMenu(false);
      return preferences;
    }

    togglePropsPanel(collapsed = null, announce = true, persist = true) {
      const app = $("app");
      const button = $("btn-props-toggle");
      const next = collapsed === null
        ? !app.classList.contains("props-collapsed")
        : Boolean(collapsed);
      app.classList.toggle("props-collapsed", next);
      button.textContent = next ? "‹" : "›";
      button.setAttribute("aria-expanded", next ? "false" : "true");
      button.setAttribute("title", next ? "展开属性栏" : "收起属性栏");
      if (persist) this.persistPreferences();
      this.updateScrollbars();
      this.redrawOverlay();
      if (announce) this.status(next ? "已收起属性栏" : "已展开属性栏");
      return next;
    }

    snap(v) {
      if (!$("snap-toggle").checked) return v;
      return Math.round(v / 10) * 10;
    }

    setGridVisible(visible, announce = true, persist = true) {
      visible = Boolean(visible);
      paperGrid.setAttribute("visibility", visible ? "visible" : "hidden");
      const button = $("btn-grid");
      button.classList.toggle("active", visible);
      button.setAttribute("aria-pressed", String(visible));
      if (persist) this.persistPreferences();
      if (announce) this.status(visible ? "已显示网格线" : "已隐藏网格线");
      return visible;
    }

    toggleGrid() {
      return this.setGridVisible(paperGrid.getAttribute("visibility") !== "visible");
    }

    scrollMetrics(axis) {
      const horizontal = axis === "x";
      const viewStart = horizontal ? this.view.x : this.view.y;
      const viewSize = horizontal ? this.view.w : this.view.h;
      const docStart = horizontal ? this.docBox.x : this.docBox.y;
      const docSize = horizontal ? this.docBox.w : this.docBox.h;
      const padding = Math.max(40, Math.min(viewSize * 0.15, docSize * 0.35));
      const worldStart = docStart - padding;
      const worldSize = docSize + padding * 2;
      const range = Math.max(0, worldSize - viewSize);
      const min = range > 0 ? worldStart : docStart + docSize / 2 - viewSize / 2;
      const max = min + range;
      const position = range > 0 ? Math.max(0, Math.min(1, (viewStart - min) / range)) : 0;
      return {
        min,
        max,
        range,
        position,
        sizeRatio: range > 0 ? Math.min(1, viewSize / worldSize) : 1,
      };
    }

    updateScrollbars() {
      const update = (axis, bar, thumb) => {
        const metrics = this.scrollMetrics(axis);
        const trackLength = axis === "x" ? bar.clientWidth : bar.clientHeight;
        if (!trackLength) return;
        const thumbLength = Math.min(trackLength, Math.max(34, trackLength * metrics.sizeRatio));
        const travel = Math.max(0, trackLength - thumbLength);
        const offset = metrics.position * travel;
        if (axis === "x") {
          thumb.style.left = offset + "px";
          thumb.style.width = thumbLength + "px";
        } else {
          thumb.style.top = offset + "px";
          thumb.style.height = thumbLength + "px";
        }
        thumb.classList.toggle("disabled", metrics.range <= 0 || travel <= 0);
      };
      update("x", scrollX, scrollThumbX);
      update("y", scrollY, scrollThumbY);
      this.syncTextEditorOverlay();
    }

    startScrollbarDrag(e, axis) {
      e.preventDefault();
      e.stopPropagation();
      const horizontal = axis === "x";
      const bar = horizontal ? scrollX : scrollY;
      const thumb = horizontal ? scrollThumbX : scrollThumbY;
      let metrics = this.scrollMetrics(axis);
      if (metrics.range <= 0) return;

      const barBox = bar.getBoundingClientRect();
      const thumbBox = thumb.getBoundingClientRect();
      const trackLength = horizontal ? barBox.width : barBox.height;
      const thumbLength = horizontal ? thumbBox.width : thumbBox.height;
      const travel = Math.max(0, trackLength - thumbLength);
      if (!travel) return;

      if (e.target !== thumb) {
        const pointer = horizontal ? e.clientX - barBox.left : e.clientY - barBox.top;
        const ratio = Math.max(0, Math.min(1, (pointer - thumbLength / 2) / travel));
        if (horizontal) this.view.x = metrics.min + ratio * metrics.range;
        else this.view.y = metrics.min + ratio * metrics.range;
        this.applyView();
        metrics = this.scrollMetrics(axis);
      }

      this.scrollDrag = {
        axis,
        startClient: horizontal ? e.clientX : e.clientY,
        startView: horizontal ? this.view.x : this.view.y,
        min: metrics.min,
        max: metrics.max,
        range: metrics.range,
        travel,
        thumb,
      };
      thumb.classList.add("dragging");
    }

    moveScrollbar(e) {
      const drag = this.scrollDrag;
      if (!drag) return;
      e.preventDefault();
      const client = drag.axis === "x" ? e.clientX : e.clientY;
      const next = drag.startView + ((client - drag.startClient) / drag.travel) * drag.range;
      if (drag.axis === "x") this.view.x = Math.max(drag.min, Math.min(drag.max, next));
      else this.view.y = Math.max(drag.min, Math.min(drag.max, next));
      this.applyView();
    }

    endScrollbarDrag() {
      if (!this.scrollDrag) return;
      this.scrollDrag.thumb.classList.remove("dragging");
      this.scrollDrag = null;
    }

    applyView() {
      const { x, y, w, h } = this.view;
      canvas.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
      paper.setAttribute("x", this.docBox.x);
      paper.setAttribute("y", this.docBox.y);
      paper.setAttribute("width", this.docBox.w);
      paper.setAttribute("height", this.docBox.h);
      paperGrid.setAttribute("x", this.docBox.x);
      paperGrid.setAttribute("y", this.docBox.y);
      paperGrid.setAttribute("width", this.docBox.w);
      paperGrid.setAttribute("height", this.docBox.h);
      const zoom = this.docBox.w / w;
      $("zoom-text").textContent = Math.round(zoom * 100) + "%";
      this.syncCanvasSizeButton();
      this.updateRulers();
      this.updateScrollbars();
      this.syncTextEditorOverlay();
    }

    fit() {
      const pad = 24;
      this.view = {
        x: this.docBox.x - pad,
        y: this.docBox.y - pad,
        w: this.docBox.w + pad * 2,
        h: this.docBox.h + pad * 2,
      };
      this.applyView();
    }

    canvasSizeLabel(value) {
      return String(Math.round(Number(value) * 10) / 10);
    }

    formatRulerLabel(value) {
      const n = Math.abs(value) < 1e-9 ? 0 : value;
      if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
      return String(Math.round(n * 100) / 100);
    }

    rulerStep(pxPerUnit) {
      const raw = 70 / Math.max(pxPerUnit, 1e-6);
      const pow = Math.pow(10, Math.floor(Math.log10(raw)));
      const n = raw / pow;
      const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
      return nice * pow;
    }

    rulerMarks(viewStart, viewSize, lengthPx) {
      const size = Number(viewSize);
      const length = Math.max(1, Number(lengthPx) || 1);
      if (!Number.isFinite(viewStart) || !Number.isFinite(size) || size <= 0) {
        return { major: 100, minor: 10, ticks: [] };
      }
      const pxPerUnit = length / size;
      const major = this.rulerStep(pxPerUnit);
      const pow = Math.pow(10, Math.floor(Math.log10(major) + 1e-12));
      const lead = Math.round(major / pow);
      const minor = lead === 5 ? major / 5 : major / 10;
      const mid = major / 2;
      const first = Math.floor(viewStart / minor) * minor;
      const last = viewStart + size;
      const ticks = [];
      for (let i = 0; i < 480; i += 1) {
        const world = Number((first + i * minor).toFixed(10));
        if (world > last + minor * 0.5) break;
        const px = (world - viewStart) * pxPerUnit;
        if (px < -1 || px > length + 1) continue;
        const near = (value, step) => Math.abs(value / step - Math.round(value / step)) < 1e-6;
        let kind = "minor";
        let label = "";
        if (near(world, major)) {
          kind = "major";
          label = this.formatRulerLabel(world);
        } else if (near(world, mid)) {
          kind = "mid";
        }
        ticks.push({ value: world, px, kind, label });
      }
      return { major, minor, ticks };
    }

    syncCanvasSizeButton() {
      const width = this.canvasSizeLabel(this.docBox.w);
      const height = this.canvasSizeLabel(this.docBox.h);
      const button = $("btn-canvas-size");
      if (button) {
        button.title = this.rulersVisible
          ? `隐藏标尺（画布 ${width} × ${height}）`
          : `显示标尺（画布 ${width} × ${height}）`;
      }
    }

    setRulersVisible(visible, announce = true, persist = true) {
      this.rulersVisible = Boolean(visible);
      if (workspace) workspace.classList.toggle("rulers-on", this.rulersVisible);
      const button = $("btn-canvas-size");
      if (button) {
        button.classList.toggle("active", this.rulersVisible);
        button.setAttribute("aria-pressed", String(this.rulersVisible));
      }
      this.syncCanvasSizeButton();
      this.updateRulers();
      if (persist) this.persistPreferences();
      if (announce) this.status(this.rulersVisible ? "已显示标尺" : "已隐藏标尺");
      return this.rulersVisible;
    }

    toggleRulers() {
      return this.setRulersVisible(!this.rulersVisible);
    }

    updateRulers() {
      const h = $("ruler-h");
      const v = $("ruler-v");
      if (!h || !v) return;
      if (!this.rulersVisible) {
        if (typeof h.replaceChildren === "function") h.replaceChildren();
        if (typeof v.replaceChildren === "function") v.replaceChildren();
        return;
      }
      const width = Math.max(1, canvas.clientWidth || (viewport && viewport.clientWidth) || 1);
      const height = Math.max(1, canvas.clientHeight || (viewport && viewport.clientHeight) || 1);
      this.renderRuler(h, "h", this.view.x, this.view.w, width);
      this.renderRuler(v, "v", this.view.y, this.view.h, height);
    }

    renderRuler(svg, axis, start, size, lengthPx) {
      if (!svg || typeof document.createElementNS !== "function") return;
      const horizontal = axis === "h";
      const length = Math.max(1, lengthPx);
      svg.setAttribute(
        "viewBox",
        horizontal ? `0 0 ${length} ${RULER_SIZE}` : `0 0 ${RULER_SIZE} ${length}`
      );
      const kids = [];
      const paperStart = horizontal ? this.docBox.x : this.docBox.y;
      const paperSize = horizontal ? this.docBox.w : this.docBox.h;
      const p1 = ((paperStart - start) / size) * length;
      const p2 = ((paperStart + paperSize - start) / size) * length;
      const lo = Math.min(p1, p2);
      const hi = Math.max(p1, p2);
      const band = document.createElementNS(NS, "rect");
      band.setAttribute("fill", "#ece9e2");
      if (horizontal) {
        band.setAttribute("x", String(lo));
        band.setAttribute("y", "0");
        band.setAttribute("width", String(Math.max(0, hi - lo)));
        band.setAttribute("height", String(RULER_SIZE));
      } else {
        band.setAttribute("x", "0");
        band.setAttribute("y", String(lo));
        band.setAttribute("width", String(RULER_SIZE));
        band.setAttribute("height", String(Math.max(0, hi - lo)));
      }
      kids.push(band);
      const marks = this.rulerMarks(start, size, length);
      marks.ticks.forEach((mark) => {
        const tickLen = mark.kind === "major" ? 12 : mark.kind === "mid" ? 8 : 4;
        const line = document.createElementNS(NS, "line");
        line.setAttribute("stroke", "#1f1f1f");
        line.setAttribute("stroke-width", mark.kind === "major" ? "1.1" : "1");
        if (horizontal) {
          line.setAttribute("x1", String(mark.px));
          line.setAttribute("x2", String(mark.px));
          line.setAttribute("y1", String(RULER_SIZE));
          line.setAttribute("y2", String(RULER_SIZE - tickLen));
        } else {
          line.setAttribute("x1", String(RULER_SIZE));
          line.setAttribute("x2", String(RULER_SIZE - tickLen));
          line.setAttribute("y1", String(mark.px));
          line.setAttribute("y2", String(mark.px));
        }
        kids.push(line);
        if (!mark.label) return;
        const text = document.createElementNS(NS, "text");
        text.setAttribute("fill", "#1f1f1f");
        text.setAttribute("font-size", "9");
        text.setAttribute("font-family", "Segoe UI, Microsoft YaHei, sans-serif");
        text.textContent = mark.label;
        if (horizontal) {
          text.setAttribute("x", String(mark.px + 3));
          text.setAttribute("y", "10");
        } else {
          const y = mark.px - 3;
          text.setAttribute("x", "9");
          text.setAttribute("y", String(y));
          text.setAttribute("transform", `rotate(-90 9 ${y})`);
        }
        kids.push(text);
      });
      svg.replaceChildren(...kids);
    }

    onWheel(e) {
      const p = clientToSvg(e);
      const factor = e.deltaY < 0 ? 0.91 : 1.1;
      const nw = Math.min(8000, Math.max(80, this.view.w * factor));
      const nh = (nw / this.view.w) * this.view.h;
      this.view = {
        x: p.x - ((p.x - this.view.x) * nw) / this.view.w,
        y: p.y - ((p.y - this.view.y) * nh) / this.view.h,
        w: nw,
        h: nh,
      };
      this.applyView();
    }

    openFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.fileName = file.name;
        this.loadString(String(reader.result || ""), { record: true });
      };
      reader.readAsText(file);
    }

    loadString(text, { record = false, fromHost = false } = {}) {
      // The boot payload and the host's ready response can contain the same
      // document. Avoid parsing and rebuilding a potentially large SVG twice.
      if (fromHost && text === this.lastHostText) return;
      if (fromHost) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }

      const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = parsed.documentElement;
      if (!svg || svg.tagName.toLowerCase() !== "svg" || parsed.querySelector("parsererror")) {
        this.status("无法解析 SVG 文件");
        return;
      }
      const parsedBox = this.parseDocumentBox(svg);
      this.docBox = { x: parsedBox.x, y: parsedBox.y, w: parsedBox.w, h: parsedBox.h };
      this.originalAttrs = [...svg.attributes]
        .map((a) => [a.name, a.value])
        .filter(([name, value]) => {
          if (name === "width" || name === "height") return Number.isFinite(parseSvgLength(value));
          if (name === "viewBox") return Boolean(parseViewBox(value));
          return true;
        });

      // Import a stable snapshot of the source children. The old loop tested
      // svg.firstChild but only cloned it, so svg.firstChild never changed and
      // the webview appended nodes forever until Cursor became unresponsive.
      const fragment = document.createDocumentFragment();
      for (const child of svg.childNodes) {
        fragment.appendChild(document.importNode(child, true));
      }
      content.replaceChildren(fragment);

      this.ensureArrowMarker();
      this.tagElements();
      this.upgradeLegacyArrowLines();
      this.upgradeLegacyConnectorNodes();
      this.normalizeControlledConnectorRoutes();
      this.upgradeLegacyOrthogonalConnectors();
      this.inferConnectorGlue();
      this.syncConnectorLabels();
      this.refreshHits();
      this.selected = [];
      this.redrawOverlay();
      this.fit();
      $("file-name").textContent = this.fileName;
      this.updateProps();
      if (record) {
        this.history.stack = [];
        this.history.index = -1;
        this.history.push(this.serialize());
      }
      this.dirty = false;
      if (fromHost) this.lastHostText = text;
      this.status(fromHost ? "已加载当前 SVG" : "已打开 " + this.fileName);
    }

    tagElements() {
      content.querySelectorAll("*").forEach((el) => {
        if (GRAPHIC_TAGS.has(el.tagName.toLowerCase()) && !el.closest("defs")) {
          if (!el.getAttribute("data-ed-id")) el.setAttribute("data-ed-id", uid());
        }
      });
    }

    upgradeLegacyArrowLines() {
      const lines = [...content.querySelectorAll("line")].filter(hasArrowMarker);
      if (!lines.length) return;
      const anchors = this.collectConnectionAnchors(lines);
      lines.forEach((line) => {
        const start = this.snapEndpoint(
          num(line, "x1"),
          num(line, "y1"),
          anchors,
          false
        );
        const end = this.snapEndpoint(
          num(line, "x2"),
          num(line, "y2"),
          anchors,
          false
        );
        const path = document.createElementNS(NS, "path");
        [...line.attributes].forEach((attribute) => {
          if (!["x1", "y1", "x2", "y2"].includes(attribute.name)) {
            path.setAttribute(attribute.name, attribute.value);
          }
        });
        const points = this.straightArrowPoints(
          { x: start.x, y: start.y },
          { x: end.x, y: end.y },
          "free"
        );
        path.setAttribute(
          "d",
          points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")
        );
        path.setAttribute("fill", path.getAttribute("fill") || "none");
        path.setAttribute("data-routing", "manual");
        path.setAttribute("data-arrow-mode", "free");
        line.replaceWith(path);
      });
    }

    upgradeLegacyConnectorNodes() {
      content
        .querySelectorAll('path[data-routing="manual"][data-arrow-mode="manual"]')
        .forEach((connector) => this.upgradeLegacyConnectorNode(connector));
    }

    upgradeLegacyConnectorNode(connector) {
      if (connector.hasAttribute("data-route-controls")) return false;
      const points = this.connectorPoints(connector);
      if (points.length !== 3) return false;
      const start = points[0];
      const legacyNode = points[1];
      const end = points[2];
      const vertical = Math.abs(start.x - end.x) <= 0.5;
      const horizontal = Math.abs(start.y - end.y) <= 0.5;
      if (!vertical && !horizontal) return false;
      const insertion = this.insertConnectorNodePoints([start, end]);
      if (!insertion) return false;
      const control = insertion.controls[0];
      if (vertical) {
        insertion.points[control.startIndex].x = legacyNode.x;
        insertion.points[control.endIndex].x = legacyNode.x;
      } else {
        insertion.points[control.startIndex].y = legacyNode.y;
        insertion.points[control.endIndex].y = legacyNode.y;
      }
      const axis = vertical ? "vertical" : "horizontal";
      this.writeConnectorPoints(connector, insertion.points);
      connector.setAttribute("data-route-controls", JSON.stringify(insertion.controls));
      connector.setAttribute("data-start-axis", axis);
      connector.setAttribute("data-end-axis", axis);
      connector.setAttribute("data-routing", "controlled-orthogonal");
      return true;
    }

    normalizeControlledConnectorRoutes() {
      content
        .querySelectorAll('path[data-routing="controlled-orthogonal"]')
        .forEach((connector) => this.normalizeControlledConnectorRoute(connector));
    }

    normalizeControlledConnectorRoute(connector) {
      const controls = this.connectorRouteControls(connector);
      const points = this.connectorPoints(connector);
      if (controls.length !== 1 || points.length !== 6) return false;
      const control = controls[0];
      if (control.startIndex !== 2 || control.endIndex !== 3) return false;
      const start = points[0];
      const end = points[5];
      let nextPoints;
      let nextControl;
      if (control.axis === "vertical" && Math.abs(start.x - end.x) > 0.5) {
        const bridgeY = points[1].y;
        nextPoints = [
          start,
          { x: start.x, y: bridgeY },
          { x: end.x, y: bridgeY },
          end,
        ];
        nextControl = { axis: "horizontal", startIndex: 1, endIndex: 2 };
      } else if (control.axis === "horizontal" && Math.abs(start.y - end.y) > 0.5) {
        const bridgeX = points[1].x;
        nextPoints = [
          start,
          { x: bridgeX, y: start.y },
          { x: bridgeX, y: end.y },
          end,
        ];
        nextControl = { axis: "vertical", startIndex: 1, endIndex: 2 };
      } else {
        return false;
      }
      this.writeConnectorPoints(connector, nextPoints);
      connector.setAttribute("data-route-controls", JSON.stringify([nextControl]));
      return true;
    }

    upgradeLegacyOrthogonalConnectors() {
      content
        .querySelectorAll('path[data-routing="manual"][data-arrow-mode="manual"]')
        .forEach((connector) => this.upgradeLegacyOrthogonalConnector(connector));
    }

    upgradeLegacyOrthogonalConnector(connector) {
      if (connector.hasAttribute("data-route-controls")) return false;
      const points = this.connectorPoints(connector);
      if (points.length < 2) return false;
      const orthogonal = points.slice(0, -1).every((point, index) => {
        const next = points[index + 1];
        return Math.abs(point.x - next.x) <= 0.001 || Math.abs(point.y - next.y) <= 0.001;
      });
      if (!orthogonal) return false;
      connector.setAttribute("data-routing", "orthogonal");
      return true;
    }

    refreshHits() {
      content.querySelectorAll(".svg-ed-hit").forEach((n) => n.remove());
      content.querySelectorAll("line, path, polyline, polygon").forEach((el) => {
        if ((el.closest && el.closest("defs")) || (el.classList && el.classList.contains("svg-ed-hit"))) return;
        const hit = el.cloneNode(false);
        hit.setAttribute("class", "svg-ed-hit");
        hit.setAttribute("fill", "none");
        hit.setAttribute("stroke", "rgba(0,0,0,0.001)");
        hit.setAttribute("stroke-width", "14");
        hit.setAttribute("stroke-dasharray", "none");
        hit.setAttribute("stroke-opacity", "0.001");
        hit.removeAttribute("marker-end");
        hit.removeAttribute("marker-start");
        hit.removeAttribute("marker-mid");
        hit.removeAttribute("filter");
        hit.removeAttribute("mask");
        hit.removeAttribute("data-glue-id");
        if (hit.style) {
          hit.style.fill = "none";
          hit.style.stroke = "rgba(0,0,0,0.001)";
          hit.style.strokeWidth = "14";
          hit.style.strokeDasharray = "none";
          hit.style.strokeOpacity = "0.001";
          hit.style.filter = "none";
          hit.style.opacity = "1";
          hit.style.markerStart = "none";
          hit.style.markerMid = "none";
          hit.style.markerEnd = "none";
        }
        hit.setAttribute("data-ed-for", el.getAttribute("data-ed-id") || "");
        hit.setAttribute("pointer-events", "stroke");
        if (typeof el.insertAdjacentElement === "function") {
          el.insertAdjacentElement("afterend", hit);
        }
      });
    }

    ensureArrowMarker() {
      let defs = content.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS(NS, "defs");
        content.insertBefore(defs, content.firstChild);
      }
      let marker = content.querySelector("marker#arrow");
      if (!marker) {
        marker = document.createElementNS(NS, "marker");
        marker.setAttribute("id", "arrow");
        marker.setAttribute("markerWidth", "7");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "6");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto-start-reverse");
        marker.setAttribute("markerUnits", "strokeWidth");
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M0,0 L7,3.5 L0,7 z");
        marker.appendChild(p);
        defs.appendChild(marker);
      }
      marker.setAttribute("orient", "auto-start-reverse");
      this.makeMarkerFollowStroke(marker);
      return marker;
    }

    makeMarkerFollowStroke(marker) {
      marker.querySelectorAll("path, polygon, polyline, circle, ellipse").forEach((shape) => {
        const fill = shape.getAttribute("fill");
        const stroke = shape.getAttribute("stroke");
        if (fill !== "none") {
          shape.setAttribute("fill", "context-stroke");
          shape.style.fill = "context-stroke";
        }
        if (stroke && stroke !== "none") {
          shape.setAttribute("stroke", "context-stroke");
          shape.style.stroke = "context-stroke";
        }
      });
    }

    markerFromReference(reference) {
      const match = String(reference || "").match(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/);
      if (!match) return null;
      return [...content.querySelectorAll("marker")].find((marker) => marker.id === match[1]) || null;
    }

    syncConnectorMarkers(el) {
      ["marker-start", "marker-end"].forEach((attribute) => {
        const inline = el.getAttribute(attribute);
        let reference = inline;
        if (!reference || reference === "none") {
          try {
            const computed = getComputedStyle(el);
            reference = attribute === "marker-start" ? computed.markerStart : computed.markerEnd;
          } catch (_) {
            reference = "";
          }
        }
        const marker = this.markerFromReference(reference);
        if (marker) this.makeMarkerFollowStroke(marker);
      });
    }

    markerPlacement(el) {
      const style = getComputedStyle(el);
      const start = el.getAttribute("marker-start") || style.markerStart;
      const end = el.getAttribute("marker-end") || style.markerEnd;
      const hasStart = Boolean(start && start !== "none");
      const hasEnd = Boolean(end && end !== "none");
      if (hasStart && hasEnd) return "both";
      if (hasStart) return "start";
      if (hasEnd) return "end";
      return "none";
    }

    setMarkerPlacement(el, placement) {
      this.ensureArrowMarker();
      if (placement === "none") this.resetArrowheadRotation(el);
      let startReference = el.getAttribute("marker-start");
      let endReference = el.getAttribute("marker-end");
      try {
        const style = getComputedStyle(el);
        if (!isActiveMarkerValue(startReference)) startReference = style.markerStart;
        if (!isActiveMarkerValue(endReference)) endReference = style.markerEnd;
      } catch (_) {
        // Presentation attributes are enough when computed styles are unavailable.
      }
      const reference =
        (isActiveMarkerValue(endReference) && endReference) ||
        (isActiveMarkerValue(startReference) && startReference) ||
        "url(#arrow)";
      const apply = (attribute, enabled) => {
        const cssProperty = attribute === "marker-start" ? "markerStart" : "markerEnd";
        if (enabled) {
          el.setAttribute(attribute, reference);
          el.style[cssProperty] = reference;
        } else {
          // Inline none beats class-based marker-end rules in the SVG stylesheet.
          el.setAttribute(attribute, "none");
          el.style[cssProperty] = "none";
        }
      };
      apply("marker-start", placement === "start" || placement === "both");
      apply("marker-end", placement === "end" || placement === "both");
      this.syncConnectorMarkers(el);
    }

    parseDocumentBox(svg) {
      const viewBox = parseViewBox(svg && svg.getAttribute && svg.getAttribute("viewBox"));
      const width = parseSvgLength(svg && svg.getAttribute && svg.getAttribute("width"));
      const height = parseSvgLength(svg && svg.getAttribute && svg.getAttribute("height"));
      if (viewBox) {
        return { x: viewBox[0], y: viewBox[1], w: viewBox[2], h: viewBox[3], width, height };
      }
      return {
        x: 0,
        y: 0,
        w: width > 0 ? width : 800,
        h: height > 0 ? height : 600,
        width,
        height,
      };
    }

    writeRootSize(svg, options = {}) {
      const pixelWidth = Math.round(Number(options.pixelWidth));
      const pixelHeight = Math.round(Number(options.pixelHeight));
      if (
        Number.isFinite(pixelWidth) &&
        Number.isFinite(pixelHeight) &&
        pixelWidth > 0 &&
        pixelHeight > 0
      ) {
        this.applyRasterExportSize(svg, { pixelWidth, pixelHeight });
        return;
      }
      const orig = Object.fromEntries(this.originalAttrs || []);
      const width = Number.isFinite(parseSvgLength(orig.width))
        ? orig.width
        : formatCanvasSize(this.docBox && this.docBox.w, 800);
      const height = Number.isFinite(parseSvgLength(orig.height))
        ? orig.height
        : formatCanvasSize(this.docBox && this.docBox.h, 600);
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
    }

    serialize(options = {}) {
      const svg = document.createElementNS(NS, "svg");
      const seen = new Set();
      for (const [k, v] of this.originalAttrs) {
        if (k === "width" || k === "height" || k === "viewBox") continue;
        svg.setAttribute(k, v);
        seen.add(k);
      }
      if (!seen.has("xmlns")) svg.setAttribute("xmlns", NS);
      const box = this.docBox || { x: 0, y: 0, w: 800, h: 600 };
      const x = Number.isFinite(box.x) ? box.x : 0;
      const y = Number.isFinite(box.y) ? box.y : 0;
      const w = Number.isFinite(box.w) && box.w > 0 ? box.w : 800;
      const h = Number.isFinite(box.h) && box.h > 0 ? box.h : 600;
      svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
      this.writeRootSize(svg, options);
      for (const child of content.childNodes) {
        if (child.nodeType !== 1) {
          svg.appendChild(child.cloneNode(true));
          continue;
        }
        if (child.classList.contains("svg-ed-hit")) continue;
        const clone = child.cloneNode(true);
        clone.querySelectorAll(".svg-ed-hit").forEach((n) => n.remove());
        clone.querySelectorAll("[data-ed-id]").forEach((n) => n.removeAttribute("data-ed-id"));
        clone.removeAttribute("data-ed-id");
        const editing = [];
        if (clone.hasAttribute && clone.hasAttribute("data-text-editing")) editing.push(clone);
        if (typeof clone.querySelectorAll === "function") {
          clone.querySelectorAll("[data-text-editing]").forEach((node) => editing.push(node));
        }
        editing.forEach((node) => {
          node.removeAttribute("data-text-editing");
          if (node.style) {
            if (typeof node.style.removeProperty === "function") node.style.removeProperty("opacity");
            else node.style.opacity = "";
          }
        });
        svg.appendChild(clone);
      }
      return prettySvg(svg);
    }

    applyRasterExportSize(svg, options = {}) {
      const width = Math.round(Number(options.pixelWidth));
      const height = Math.round(Number(options.pixelHeight));
      if (
        !svg ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return svg;
      }
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("text-rendering", "geometricPrecision");
      svg.setAttribute("shape-rendering", "geometricPrecision");
      if (svg.style) {
        svg.style.width = width + "px";
        svg.style.height = height + "px";
      }
      return svg;
    }

    pruneUnusedArrowheadMarkers() {
      const generated = [...content.querySelectorAll("marker")].filter((marker) =>
        /^arrowhead-(start|end)-/.test(marker.id || "")
      );
      if (!generated.length) return;
      const used = new Set();
      const collect = (value) => {
        String(value || "").replace(/#([^"')\s]+)/g, (_, id) => used.add(id));
      };
      content.querySelectorAll("*").forEach((el) => {
        if (el.closest("marker")) return;
        ["marker-start", "marker-mid", "marker-end", "style"].forEach((attribute) =>
          collect(el.getAttribute(attribute))
        );
        ["data-arrowhead-marker-start", "data-arrowhead-marker-end"].forEach((attribute) => {
          const id = el.getAttribute(attribute);
          if (id) used.add(id);
        });
      });
      generated.forEach((marker) => {
        if (!used.has(marker.id)) marker.remove();
      });
    }

    commit(label) {
      this.pruneUnusedArrowheadMarkers();
      this.pruneDanglingGlue();
      this.syncJustifiedText();
      this.syncConnectorLabels();
      this.refreshHits();
      this.redrawOverlay();
      this.updateProps();
      const text = this.serialize();
      this.history.push(text);
      this.dirty = true;
      this.queueSync(text);
      if (label) this.status(label);
    }

    queueSync(text) {
      if (!vscode) return;
      clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => {
        this.syncTimer = null;
        vscode.postMessage({ type: "edit", text });
      }, 200);
    }

    restoreFrom(text) {
      this.loadString(text, { record: false });
      this.queueSync(text);
    }

    undo() {
      const text = this.history.undo();
      if (text) this.restoreFrom(text);
    }

    redo() {
      const text = this.history.redo();
      if (text) this.restoreFrom(text);
    }

    save() {
      const text = this.serialize();
      if (vscode) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
        vscode.postMessage({ type: "save", text });
        this.status("已保存 SVG");
        return;
      }
      this.download();
    }

    download() {
      const blob = new Blob([this.serialize()], { type: "image/svg+xml" });
      const fileName = (this.fileName || "edited.svg").replace(/\.[^.]+$/, "") + ".svg";
      return this.deliverExport(blob, fileName);
    }

    buildTextColorPalette() {
      const theme = $("text-color-theme");
      for (let row = 0; row < 6; row += 1) {
        TEXT_THEME_COLOR_COLUMNS.forEach((column) => this.appendColorSwatch(theme, column[row]));
      }
      TEXT_STANDARD_COLORS.forEach((color) => this.appendColorSwatch($("text-color-standard"), color));
      TEXT_GRADIENT_COLORS.forEach(([from, to]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "color-swatch";
        button.dataset.textGradient = `${from}|${to}`;
        button.title = `渐变 ${from} → ${to}`;
        button.setAttribute("aria-label", button.title);
        button.style.background = `linear-gradient(135deg, ${from}, ${to})`;
        $("text-color-gradients").appendChild(button);
      });
      this.renderRecentColors();
      this.buildMoreFillGradients();
      this.buildColorDialogPalettes();
    }

    appendColorSwatch(container, color) {
      if (!container) return null;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.dataset.textColor = color;
      button.title = color;
      button.setAttribute("aria-label", color);
      button.style.background = color;
      container.appendChild(button);
      return button;
    }

    renderRecentColors() {
      const host = $("color-recent");
      const section = $("color-recent-section");
      if (!host) return;
      if (typeof host.replaceChildren === "function") host.replaceChildren();
      else host.childNodes = [];
      (this.recentColors || []).forEach((color) => this.appendColorSwatch(host, color));
      if (section && section.classList) {
        section.classList.toggle("hidden", !(this.recentColors && this.recentColors.length));
      }
    }

    rememberColor(value) {
      const colors = this.normalizeRecentColors([value, ...(this.recentColors || [])]);
      const unchanged =
        colors.length === (this.recentColors || []).length &&
        colors.every((color, index) => color === this.recentColors[index]);
      this.recentColors = colors;
      this.renderRecentColors();
      if (!unchanged) this.persistPreferences();
      return colors;
    }

    createSymbolButton(symbol) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "symbol-btn";
      button.setAttribute("data-symbol", symbol);
      button.setAttribute("title", symbol);
      button.setAttribute("aria-label", "插入 " + symbol);
      button.textContent = symbol;
      return button;
    }

    buildSymbolPalette() {
      const tabs = $("symbol-tabs");
      const panels = $("symbol-panels");
      if (!tabs || !panels) return;
      if (typeof tabs.replaceChildren === "function") tabs.replaceChildren();
      else tabs.childNodes = [];
      if (typeof panels.replaceChildren === "function") panels.replaceChildren();
      else panels.childNodes = [];
      SPECIAL_SYMBOLS.forEach((group, index) => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "symbol-tab" + (index === 0 ? " active" : "");
        tab.setAttribute("data-symbol-tab", group.id);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
        tab.textContent = group.label;
        tabs.appendChild(tab);
        const panel = document.createElement("div");
        panel.className = "symbol-panel" + (index === 0 ? "" : " hidden");
        panel.setAttribute("data-symbol-panel", group.id);
        group.groups.forEach((section) => {
          const title = document.createElement("div");
          title.className = "color-section-title";
          title.textContent = section.title;
          panel.appendChild(title);
          const grid = document.createElement("div");
          grid.className = "symbol-grid";
          [...section.chars].forEach((char) => grid.appendChild(this.createSymbolButton(char)));
          panel.appendChild(grid);
        });
        panels.appendChild(panel);
      });
      this.symbolTab = SPECIAL_SYMBOLS[0] ? SPECIAL_SYMBOLS[0].id : "greek";
      this.renderRecentSymbols();
    }

    setSymbolTab(id) {
      const next = SPECIAL_SYMBOLS.some((group) => group.id === id) ? id : this.symbolTab;
      this.symbolTab = next;
      const menu = $("symbol-menu");
      const tabs = menu && menu.querySelectorAll ? menu.querySelectorAll("[data-symbol-tab]") : [];
      const panels = menu && menu.querySelectorAll ? menu.querySelectorAll("[data-symbol-panel]") : [];
      [...tabs].forEach((tab) => {
        const active = tab.getAttribute("data-symbol-tab") === next;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      [...panels].forEach((panel) => {
        panel.classList.toggle("hidden", panel.getAttribute("data-symbol-panel") !== next);
      });
    }

    renderRecentSymbols() {
      const host = $("symbol-recent");
      const section = $("symbol-recent-section");
      if (!host) return;
      if (typeof host.replaceChildren === "function") host.replaceChildren();
      else host.childNodes = [];
      (this.recentSymbols || []).forEach((symbol) => host.appendChild(this.createSymbolButton(symbol)));
      if (section && section.classList) {
        section.classList.toggle("is-empty", !(this.recentSymbols && this.recentSymbols.length));
      }
    }

    rememberSymbol(value) {
      const symbols = this.normalizeRecentSymbols([value, ...(this.recentSymbols || [])]);
      const unchanged =
        symbols.length === (this.recentSymbols || []).length &&
        symbols.every((symbol, index) => symbol === this.recentSymbols[index]);
      this.recentSymbols = symbols;
      this.renderRecentSymbols();
      if (!unchanged) this.persistPreferences();
      return symbols;
    }

    isSymbolMenuEvent(target) {
      const wrap = $("symbol-wrap");
      return Boolean(wrap && target && typeof wrap.contains === "function" && wrap.contains(target));
    }

    positionSymbolMenu() {
      const menu = $("symbol-menu");
      const button = $("btn-symbol");
      if (!menu || !button || typeof button.getBoundingClientRect !== "function") return;
      const anchor = button.getBoundingClientRect();
      const menuBox = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth || 1200;
      const viewportHeight = window.innerHeight || 800;
      const width = menuBox.width || 360;
      const height = menuBox.height || 320;
      const left = Math.max(8, Math.min(anchor.left, viewportWidth - width - 8));
      let top = anchor.bottom + 4;
      if (top + height > viewportHeight - 8) top = Math.max(8, anchor.top - height - 4);
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }

    toggleSymbolMenu(force) {
      const button = $("btn-symbol");
      const menu = $("symbol-menu");
      if (!button || !menu || button.disabled) return false;
      const open = force === undefined ? menu.classList.contains("hidden") : Boolean(force);
      menu.classList.toggle("hidden", !open);
      this.symbolMenuVisible = open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        $("export-menu").classList.add("hidden");
        $("btn-export").setAttribute("aria-expanded", "false");
        this.closeToolbarMenus();
        this.closeTextColorMenu();
        this.positionSymbolMenu();
      }
      return open;
    }

    closeSymbolMenu() {
      const menu = $("symbol-menu");
      const button = $("btn-symbol");
      if (menu) menu.classList.add("hidden");
      if (button) button.setAttribute("aria-expanded", "false");
      this.symbolMenuVisible = false;
    }

    onSymbolMenuClick(e) {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      const tab = target.closest("[data-symbol-tab]");
      if (tab) {
        this.setSymbolTab(tab.getAttribute("data-symbol-tab"));
        return;
      }
      const button = target.closest("[data-symbol]");
      if (button) this.insertSpecialSymbol(button.getAttribute("data-symbol"));
    }

    insertSpecialSymbol(value) {
      const symbol = String(value || "");
      if (!symbol || [...symbol].length > 2) return false;
      this.rememberSymbol(symbol);
      if (this.editingText && textInput && !textInput.hidden) {
        const current = String(textInput.value || "");
        const start = Number.isInteger(textInput.selectionStart) ? textInput.selectionStart : current.length;
        const end = Number.isInteger(textInput.selectionEnd) ? textInput.selectionEnd : start;
        textInput.value = current.slice(0, start) + symbol + current.slice(end);
        const caret = start + symbol.length;
        if (typeof textInput.setSelectionRange === "function") {
          try {
            textInput.setSelectionRange(caret, caret);
          } catch (_) {
            /* ignore */
          }
        }
        this.resizeTextInput();
        if (typeof textInput.focus === "function") textInput.focus();
        this.status("已插入 " + symbol);
        return true;
      }
      const targets = this.selectedTextElements();
      if (!targets.length) {
        this.status("请先选中文字，或双击进入编辑后再插入符号");
        return false;
      }
      targets.forEach((el) => {
        this.writeTextElementContent(el, this.textElementPlainText(el) + symbol);
      });
      this.syncConnectorLabels();
      this.redrawOverlay();
      this.updateProps();
      this.status("已插入 " + symbol);
      clearTimeout(this._propTimer);
      this._propTimer = setTimeout(() => this.commit("已插入符号 " + symbol), 250);
      return true;
    }

    colorMenuButton(target) {
      if (target === "fill") return $("btn-prop-fill");
      if (target === "stroke") return $("btn-prop-stroke");
      return $("btn-text-color");
    }

    nativeColorInput(target) {
      if (target === "fill") return $("prop-fill");
      if (target === "stroke") return $("prop-stroke");
      return $("top-text-color");
    }

    isColorMenuEvent(target) {
      const nodes = ["text-color-menu", "color-more-fills", "color-dialog", "text-color-wrap", "btn-prop-fill", "btn-prop-stroke"];
      return nodes.some((id) => {
        const el = $(id);
        return el && typeof el.contains === "function" && el.contains(target);
      });
    }

    positionColorMenu(button) {
      const menu = $("text-color-menu");
      const anchorButton = button || this.colorMenuButton(this.colorMenuTarget);
      if (!anchorButton || !menu || typeof anchorButton.getBoundingClientRect !== "function") return;
      const anchor = anchorButton.getBoundingClientRect();
      const menuBox = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth || 1200;
      const viewportHeight = window.innerHeight || 800;
      const left = Math.max(8, Math.min(anchor.left, viewportWidth - (menuBox.width || 214) - 8));
      let top = anchor.bottom + 4;
      if (top + (menuBox.height || 320) > viewportHeight - 8) {
        top = Math.max(8, anchor.top - (menuBox.height || 320) - 4);
      }
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }

    positionTextColorMenu() {
      this.positionColorMenu($("btn-text-color"));
    }

    toggleTextColorMenu(force) {
      return this.toggleColorMenu("text", force);
    }

    toggleColorMenu(target, force) {
      const nextTarget = target || "text";
      const button = this.colorMenuButton(nextTarget);
      if (nextTarget === "text" && button && button.disabled) return;
      const menu = $("text-color-menu");
      if (!menu) return;
      const switching = this.colorMenuTarget !== nextTarget && !menu.classList.contains("hidden");
      const open =
        force === undefined
          ? menu.classList.contains("hidden") || switching
          : Boolean(force);
      this.colorMenuTarget = nextTarget;
      this.eyedropperApply = nextTarget;
      menu.classList.toggle("hidden", !open);
      this.colorMenuVisible = open;
      ["text", "fill", "stroke"].forEach((kind) => {
        const opener = this.colorMenuButton(kind);
        if (opener) opener.setAttribute("aria-expanded", open && kind === nextTarget ? "true" : "false");
      });
      if (open) {
        $("export-menu").classList.add("hidden");
        $("btn-export").setAttribute("aria-expanded", "false");
        this.closeToolbarMenus();
        this.closeSymbolMenu();
        this.positionColorMenu(button);
        this.syncColorMenuChrome(nextTarget);
        this.closeMoreFills();
      } else {
        this.closeMoreFills();
      }
    }

    syncColorMenuChrome(target) {
      const label = $("text-color-custom-label");
      if (!label) return;
      label.textContent =
        target === "fill" ? "其他填充颜色(M)…" : target === "stroke" ? "其他线条颜色(M)…" : "其他字体颜色(M)…";
    }

    closeTextColorMenu() {
      const menu = $("text-color-menu");
      if (menu) menu.classList.add("hidden");
      this.colorMenuVisible = false;
      ["text", "fill", "stroke"].forEach((kind) => {
        const opener = this.colorMenuButton(kind);
        if (opener) opener.setAttribute("aria-expanded", "false");
      });
      this.closeMoreFills();
    }

    openMoreColors() {
      this.openColorDialog("standard");
    }

    currentMenuColor() {
      const native = this.nativeColorInput(this.colorMenuTarget || "text");
      return parseColor(native && native.value) || "#000000";
    }

    applyGradientSwatch(button) {
      if (!button) return;
      const parts = String(button.dataset.textGradient || "").split("|").filter(Boolean);
      if (parts.length < 2) return;
      this.applyPaintGradient(parts[0], parts[parts.length - 1], this.colorMenuTarget || "text", {
        stops: parts,
        angle: button.dataset.gradientAngle,
        kind: button.dataset.gradientKind,
      });
    }

    buildMoreFillGradients() {
      const host = $("color-more-fills-grid");
      if (!host) return;
      moreFillGradientPresets().forEach((preset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "color-swatch";
        const kind = preset.kind === "radial" ? "radial" : "linear";
        button.dataset.textGradient = preset.colors.join("|");
        button.dataset.gradientAngle = String(preset.angle || 135);
        button.dataset.gradientKind = kind;
        button.title = preset.colors.join(" → ");
        button.setAttribute("aria-label", button.title);
        button.style.background =
          kind === "radial"
            ? `radial-gradient(circle at 50% 42%, ${preset.colors.join(", ")})`
            : `linear-gradient(${preset.angle}deg, ${preset.colors.join(", ")})`;
        host.appendChild(button);
      });
    }

    buildColorDialogPalettes() {
      const chromatic = $("color-dialog-standard-grid");
      const gray = $("color-dialog-gray-row");
      if (chromatic) {
        standardDialogCells().forEach((cell) => {
          const button = this.appendDialogSwatch(chromatic, cell.color);
          if (button && button.style) {
            button.style.gridColumn = String(cell.column);
            button.style.gridRow = String(cell.row);
          }
        });
      }
      if (gray) {
        this.appendDialogSwatch(gray, "#ffffff", "color-dialog-swatch-end");
        for (let i = 1; i <= 15; i += 1) {
          const value = Math.round(255 - (i * 255) / 16);
          this.appendDialogSwatch(gray, rgbToHex(value, value, value));
        }
        this.appendDialogSwatch(gray, "#000000", "color-dialog-swatch-end");
      }
    }

    appendDialogSwatch(container, color, extraClass) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = extraClass ? `color-dialog-swatch ${extraClass}` : "color-dialog-swatch";
      button.dataset.dialogColor = color;
      button.title = color;
      button.style.background = color;
      container.appendChild(button);
      return button;
    }

    showMoreFills(force) {
      this.cancelHideMoreFills();
      const panel = $("color-more-fills");
      const menu = $("text-color-menu");
      if (!panel || !menu || menu.classList.contains("hidden")) return;
      panel.classList.remove("hidden");
      this.moreFillsVisible = true;
      $("text-color-more").classList.add("active-submenu");
      this.positionMoreFills();
      if (force) panel.focus && panel.focus();
    }

    closeMoreFills() {
      this.cancelHideMoreFills();
      const panel = $("color-more-fills");
      if (panel) panel.classList.add("hidden");
      this.moreFillsVisible = false;
      const more = $("text-color-more");
      if (more && more.classList) more.classList.remove("active-submenu");
    }

    scheduleHideMoreFills() {
      this.cancelHideMoreFills();
      this._moreFillsTimer = setTimeout(() => this.closeMoreFills(), 180);
    }

    cancelHideMoreFills() {
      if (this._moreFillsTimer) {
        clearTimeout(this._moreFillsTimer);
        this._moreFillsTimer = null;
      }
    }

    positionMoreFills() {
      const panel = $("color-more-fills");
      const menu = $("text-color-menu");
      const button = $("text-color-more");
      if (!panel || !menu || !button || typeof button.getBoundingClientRect !== "function") return;
      const menuBox = menu.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      const vw = window.innerWidth || 1200;
      const vh = window.innerHeight || 800;
      const width = panel.offsetWidth || 228;
      const height = panel.offsetHeight || 360;
      let left = menuBox.right + 4;
      if (left + width > vw - 8) left = Math.max(8, menuBox.left - width - 4);
      let top = buttonBox.top;
      if (top + height > vh - 8) top = Math.max(8, vh - height - 8);
      panel.style.left = left + "px";
      panel.style.top = top + "px";
    }

    colorDialogOpen() {
      return this.colorDialogVisible === true;
    }

    openColorDialog(tab) {
      this.closeMoreFills();
      this.closeTextColorMenu();
      const current = this.currentMenuColor();
      this.colorDialogCurrent = current;
      this.setColorDialogNext(current);
      this.colorDialogVisible = true;
      const layer = $("color-dialog-layer");
      if (layer) {
        layer.classList.remove("hidden");
        layer.setAttribute("aria-hidden", "false");
      }
      this.setColorDialogTab(tab || "standard");
      this.renderDialogRecentColors();
    }

    closeColorDialog() {
      this.colorDialogVisible = false;
      const layer = $("color-dialog-layer");
      if (layer) {
        layer.classList.add("hidden");
        layer.setAttribute("aria-hidden", "true");
      }
    }

    confirmColorDialog() {
      const color = parseColor(this.colorDialogNext);
      this.closeColorDialog();
      if (color) this.applySolidColor(color, this.colorMenuTarget || "text");
    }

    setColorDialogTab(tab) {
      const next = ["standard", "custom", "advanced"].includes(tab) ? tab : "standard";
      document.querySelectorAll("[data-color-tab]").forEach((button) => {
        const active = button.dataset.colorTab === next;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      ["standard", "custom", "advanced"].forEach((name) => {
        const pane = $(`color-tab-${name}`);
        if (pane && pane.classList) pane.classList.toggle("hidden", name !== next);
      });
      if (next === "custom") this.paintSvCanvas();
      if (next === "advanced") this.syncAdvancedInputs();
    }

    setColorDialogNext(value) {
      const color = parseColor(value);
      if (!color) return;
      this.colorDialogNext = color;
      const rgb = hexToRgb(color);
      this.colorDialogHsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      ["color-dialog-new", "color-dialog-current"].forEach((id, index) => {
        const el = $(id);
        const paint = index ? this.colorDialogCurrent : color;
        if (el && el.style) {
          el.style.background = paint;
          el.style.color = contrastInk(paint);
        }
      });
      document.querySelectorAll("[data-dialog-color]").forEach((swatch) => {
        if (swatch.classList) {
          swatch.classList.toggle("selected", String(swatch.dataset.dialogColor).toLowerCase() === color.toLowerCase());
        }
      });
      const r = $("color-input-r");
      const g = $("color-input-g");
      const b = $("color-input-b");
      if (r) r.value = rgb[0];
      if (g) g.value = rgb[1];
      if (b) b.value = rgb[2];
      const hex = $("color-input-hex");
      if (hex) hex.value = color.toUpperCase();
      const hue = $("color-hue-slider");
      if (hue) hue.value = String(Math.round(this.colorDialogHsv.h));
      this.syncAdvancedInputs();
      this.paintSvCanvas();
    }

    syncColorDialogFromHsv() {
      const { h, s, v } = this.colorDialogHsv;
      this.setColorDialogNext(rgbToHex(...hsvToRgb(h, s, v)));
    }

    syncColorDialogFromRgb() {
      const r = parseInt($("color-input-r") && $("color-input-r").value, 10);
      const g = parseInt($("color-input-g") && $("color-input-g").value, 10);
      const b = parseInt($("color-input-b") && $("color-input-b").value, 10);
      if (![r, g, b].every((n) => Number.isFinite(n))) return;
      this.setColorDialogNext(rgbToHex(r, g, b));
    }

    syncColorDialogFromHsl() {
      const h = parseFloat($("color-input-h") && $("color-input-h").value);
      const s = parseFloat($("color-input-s") && $("color-input-s").value) / 100;
      const l = parseFloat($("color-input-l") && $("color-input-l").value) / 100;
      if (![h, s, l].every((n) => Number.isFinite(n))) return;
      this.setColorDialogNext(rgbToHex(...hslToRgb(h, s, l)));
    }

    syncAdvancedInputs() {
      const rgb = hexToRgb(this.colorDialogNext || "#000000");
      const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
      const max = Math.max(rgb[0], rgb[1], rgb[2]) / 255;
      const min = Math.min(rgb[0], rgb[1], rgb[2]) / 255;
      const l = (max + min) / 2;
      const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1) || 1);
      const setPair = (channel, value) => {
        const range = $(`color-input-${channel}`);
        const numeric = $(`color-input-${channel}-num`);
        if (range) range.value = String(Math.round(value));
        if (numeric) numeric.value = String(Math.round(value));
      };
      setPair("h", hsv.h);
      setPair("s", s * 100);
      setPair("l", l * 100);
    }

    handleSvPointer(event) {
      const canvasEl = $("color-sv-canvas");
      if (!canvasEl || typeof canvasEl.getBoundingClientRect !== "function") return;
      const box = canvasEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - box.left) / (box.width || 1)));
      const y = Math.max(0, Math.min(1, (event.clientY - box.top) / (box.height || 1)));
      this.colorDialogHsv.s = x;
      this.colorDialogHsv.v = 1 - y;
      this.syncColorDialogFromHsv();
    }

    paintSvCanvas() {
      const canvasEl = $("color-sv-canvas");
      const ctx = canvasEl && typeof canvasEl.getContext === "function" ? canvasEl.getContext("2d") : null;
      if (!ctx || typeof ctx.fillRect !== "function") return;
      const width = canvasEl.width || 220;
      const height = canvasEl.height || 150;
      const hue = this.colorDialogHsv && this.colorDialogHsv.h;
      for (let x = 0; x < width; x += 1) {
        const s = x / (width - 1);
        const [r, g, b] = hsvToRgb(hue, s, 1);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, 0, 1, height);
      }
      const fade = ctx.createLinearGradient(0, 0, 0, height);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "#000");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, height);
      const s = this.colorDialogHsv.s;
      const v = this.colorDialogHsv.v;
      const cx = s * (width - 1);
      const cy = (1 - v) * (height - 1);
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    renderDialogRecentColors() {
      const host = $("color-dialog-recent");
      if (!host) return;
      if (typeof host.replaceChildren === "function") host.replaceChildren();
      (this.recentColors || []).forEach((color) => this.appendColorSwatch(host, color));
    }

    selectTextColor(value) {
      this.applySolidColor(value, "text");
    }

    applySolidColor(value, target, options = {}) {
      const color = parseColor(value);
      if (!color) return;
      const remember = options.remember !== false;
      if (target === "fill") {
        $("prop-fill").value = color;
        if ($("prop-fill-none")) $("prop-fill-none").checked = false;
        this.applyProps("prop-fill");
        this.syncPropColorButtons();
      } else if (target === "stroke") {
        $("prop-stroke").value = color;
        this.applyProps("prop-stroke");
        this.syncPropLineStylePreview();
        this.syncPropColorButtons();
      } else {
        $("top-text-color").value = color;
        this.applyTextFormat("color", color);
      }
      this.closeTextColorMenu();
      if (remember) this.rememberColor(color);
    }

    hexFromRgb(r, g, b) {
      return rgbToHex(r, g, b);
    }

    pickTextColor() {
      return this.pickColor("text");
    }

    async pickColor(target) {
      this.closeTextColorMenu();
      this.eyedropperApply = target || this.colorMenuTarget || "text";
      if (await this.startEyedropper()) return;
      const EyeDropperClass = window.EyeDropper;
      if (typeof EyeDropperClass === "function") {
        try {
          const result = await new EyeDropperClass().open();
          if (result && result.sRGBHex) this.applyEyedropperColor(result.sRGBHex, this.eyedropperApply);
          return;
        } catch (error) {
          if (error && error.name === "AbortError") return;
        }
      }
      const native = this.nativeColorInput(this.eyedropperApply);
      if (native && typeof native.click === "function") native.click();
      this.status("当前环境不支持屏幕取色，已打开更多颜色");
    }

    applyEyedropperColor(value, target) {
      this.applySolidColor(value, target || this.eyedropperApply || "text");
      const color = parseColor(value);
      if (color) this.status("已取色 " + String(color).toUpperCase());
    }

    syncPropColorButtons() {
      const fillNone = Boolean($("prop-fill-none") && $("prop-fill-none").checked);
      const fill = ($("prop-fill") && $("prop-fill").value) || "#ffffff";
      const stroke = ($("prop-stroke") && $("prop-stroke").value) || "#b85f2a";
      const fillSwatch = $("prop-fill-indicator");
      const strokeSwatch = $("prop-stroke-indicator");
      if (fillSwatch) {
        if (fillSwatch.classList) fillSwatch.classList.toggle("is-none", fillNone);
        if (fillSwatch.style) fillSwatch.style.background = fillNone ? "" : fill;
      }
      if (strokeSwatch && strokeSwatch.style) strokeSwatch.style.background = stroke;
    }

    viewportClientRect() {
      if (viewport && typeof viewport.getBoundingClientRect === "function") {
        return viewport.getBoundingClientRect();
      }
      return {
        left: 0,
        top: 0,
        width: (viewport && viewport.clientWidth) || 1,
        height: (viewport && viewport.clientHeight) || 1,
      };
    }

    async startEyedropper() {
      if (this.eyedropper) this.cancelEyedropper();
      try {
        const source = await this.snapshotEyedropperSource();
        this.eyedropper = source;
        const layer = $("eyedropper-layer");
        if (layer) {
          layer.classList.remove("hidden");
          layer.setAttribute("aria-hidden", "false");
        }
        ["eyedropper-loupe", "eyedropper-cursor"].forEach((id) => {
          const el = $(id);
          if (el && el.style) el.style.visibility = "hidden";
        });
        if (viewport && viewport.classList) viewport.classList.add("eyedropping");
        this.status("单击画布取色，Esc 取消");
        return true;
      } catch (_) {
        this.cancelEyedropper();
        return false;
      }
    }

    cancelEyedropper() {
      this.eyedropper = null;
      this._eyedropperPointer = null;
      this._eyedropperSnapToken += 1;
      if (this._eyedropperSnapTimer) {
        clearTimeout(this._eyedropperSnapTimer);
        this._eyedropperSnapTimer = null;
      }
      const layer = $("eyedropper-layer");
      if (layer) {
        layer.classList.add("hidden");
        layer.setAttribute("aria-hidden", "true");
      }
      ["eyedropper-loupe", "eyedropper-cursor"].forEach((id) => {
        const el = $(id);
        if (el && el.style) el.style.visibility = "hidden";
      });
      if (viewport && viewport.classList) viewport.classList.remove("eyedropping");
    }

    finishEyedropper(hex) {
      const target = this.eyedropperApply || "text";
      this.cancelEyedropper();
      this.applyEyedropperColor(hex, target);
    }

    async snapshotEyedropperSource() {
      if (typeof Image !== "function" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("no raster");
      }
      const ctm = typeof canvas.getScreenCTM === "function" ? canvas.getScreenCTM() : null;
      if (!ctm || !ctm.a) throw new Error("无法读取画布变换");
      const rect = this.viewportClientRect();
      const dpr = Math.max(1, Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1));
      const maxSide = 4096;
      const maxPixels = 2e7;
      let scale = Math.max(0.15, ctm.a * dpr);
      scale = Math.min(scale, maxSide / this.docBox.w, maxSide / this.docBox.h);
      if (this.docBox.w * this.docBox.h * scale * scale > maxPixels) {
        scale = Math.sqrt(maxPixels / (this.docBox.w * this.docBox.h));
      }
      const width = Math.max(1, Math.round(this.docBox.w * scale));
      const height = Math.max(1, Math.round(this.docBox.h * scale));
      const svgBlob = new Blob([this.serialize()], { type: "image/svg+xml;charset=utf-8" });
      const sourceUrl = URL.createObjectURL(svgBlob);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("无法渲染取色快照"));
          img.src = sourceUrl;
        });
        const canvasEl = document.createElement("canvas");
        canvasEl.width = width;
        canvasEl.height = height;
        const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
        if (!ctx || typeof ctx.drawImage !== "function" || typeof ctx.getImageData !== "function") {
          throw new Error("无法创建取色画布");
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, width, height);
        ctx.getImageData(0, 0, 1, 1);
        return {
          canvas: canvasEl,
          ctx,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          bitmapWidth: width,
          bitmapHeight: height,
          docX: this.docBox.x,
          docY: this.docBox.y,
          scaleX: width / this.docBox.w,
          scaleY: height / this.docBox.h,
          screenScale: ctm.a,
        };
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    }

    eyedropperOverCanvas(event) {
      const source = this.eyedropper;
      if (!source) return false;
      return (
        event.clientX >= source.left &&
        event.clientX <= source.left + source.width &&
        event.clientY >= source.top &&
        event.clientY <= source.top + source.height
      );
    }

    eyedropperBitmapPoint(event) {
      const source = this.eyedropper;
      if (!source) return null;
      const user = clientToSvg({ clientX: event.clientX, clientY: event.clientY });
      return {
        x: (user.x - source.docX) * source.scaleX,
        y: (user.y - source.docY) * source.scaleY,
      };
    }

    sampleEyedropperFromEvent(event) {
      const source = this.eyedropper;
      if (!source || !source.ctx || typeof source.ctx.getImageData !== "function") return null;
      if (!this.eyedropperOverCanvas(event)) return null;
      const point = this.eyedropperBitmapPoint(event);
      if (!point) return null;
      const px = Math.floor(point.x);
      const py = Math.floor(point.y);
      if (px < 0 || py < 0 || px >= source.bitmapWidth || py >= source.bitmapHeight) return null;
      try {
        const data = source.ctx.getImageData(px, py, 1, 1).data;
        const r = data[0];
        const g = data[1];
        const b = data[2];
        return { r, g, b, hex: rgbToHex(r, g, b) };
      } catch (_) {
        return null;
      }
    }

    handleEyedropperPointerDown(event) {
      if (!this.eyedropper) return;
      if (event.button !== 0) {
        this.cancelEyedropper();
        this.status("已取消取色");
        return;
      }
      if (!this.eyedropperOverCanvas(event)) {
        this.cancelEyedropper();
        this.status("已取消取色");
        return;
      }
      const sample = this.sampleEyedropperFromEvent(event);
      if (sample && sample.hex) this.finishEyedropper(sample.hex);
    }

    onEyedropperWheel(event) {
      if (!this.eyedropper) return;
      this.onWheel(event);
      this.refreshEyedropperAfterViewChange(event);
    }

    refreshEyedropperAfterViewChange(event) {
      if (!this.eyedropper) return;
      this._eyedropperPointer = event;
      const ctm = typeof canvas.getScreenCTM === "function" ? canvas.getScreenCTM() : null;
      if (ctm && Number.isFinite(ctm.a) && ctm.a) this.eyedropper.screenScale = ctm.a;
      this.updateEyedropperLoupe(event);
      const token = (this._eyedropperSnapToken += 1);
      if (this._eyedropperSnapTimer) clearTimeout(this._eyedropperSnapTimer);
      this._eyedropperSnapTimer = setTimeout(() => {
        this.resnapshotEyedropper(token);
      }, 80);
    }

    async resnapshotEyedropper(token) {
      if (!this.eyedropper || token !== this._eyedropperSnapToken) return;
      try {
        const source = await this.snapshotEyedropperSource();
        if (!this.eyedropper || token !== this._eyedropperSnapToken) return;
        this.eyedropper = source;
        if (this._eyedropperPointer) this.updateEyedropperLoupe(this._eyedropperPointer);
      } catch (_) {}
    }

    updateEyedropperLoupe(event) {
      if (!this.eyedropper) return;
      this._eyedropperPointer = event;
      this.positionEyedropperUi(event);
      const sample = this.sampleEyedropperFromEvent(event);
      this.paintEyedropperLoupe(sample, event);
    }

    positionEyedropperUi(event) {
      const cursor = $("eyedropper-cursor");
      const loupe = $("eyedropper-loupe");
      const tipX = 2.6;
      const tipY = 29.2;
      if (cursor && cursor.style) {
        cursor.style.left = event.clientX - tipX + "px";
        cursor.style.top = event.clientY - tipY + "px";
        cursor.style.visibility = "visible";
      }
      if (!loupe || !loupe.style) return;
      const ring = 158;
      const chip = 48;
      const gap = 14;
      const vw = (typeof window !== "undefined" && window.innerWidth) || 1920;
      const vh = (typeof window !== "undefined" && window.innerHeight) || 1080;
      let left = event.clientX + gap;
      let top = event.clientY - ring - 8;
      if (left + ring > vw - 8) left = event.clientX - gap - ring;
      if (left < 8) left = 8;
      if (top < 8) top = event.clientY + gap;
      if (top + ring + chip > vh - 8 && event.clientY - ring - chip - 8 >= 8) {
        top = event.clientY - ring - chip - 8;
      }
      if (top < 8) top = 8;
      loupe.style.left = left + "px";
      loupe.style.top = top + "px";
      loupe.style.visibility = "visible";
      if (loupe.classList) {
        if (top + ring + chip > vh - 8) loupe.classList.add("flip");
        else loupe.classList.remove("flip");
      }
    }

    paintEyedropperLoupe(sample, event) {
      const hexEl = $("eyedropper-hex");
      const rgbEl = $("eyedropper-rgb");
      const swatch = $("eyedropper-swatch");
      const ring = $("eyedropper-ring");
      const cursorFill = $("eyedropper-cursor-fill");
      const over = event ? this.eyedropperOverCanvas(event) : Boolean(sample);
      const preview = over && sample ? sample.hex : "#cbd5e1";
      if (!over || !sample) {
        if (hexEl) hexEl.textContent = "移到画布";
        if (rgbEl) rgbEl.textContent = "单击取色 · Esc 取消";
        if (swatch && swatch.style) swatch.style.background = "#ffffff";
        if (ring && ring.style) ring.style.background = preview;
      } else {
        if (hexEl) hexEl.textContent = sample.hex;
        if (rgbEl) rgbEl.textContent = `RGB ${sample.r}, ${sample.g}, ${sample.b}`;
        if (swatch && swatch.style) swatch.style.background = sample.hex;
        if (ring && ring.style) ring.style.background = sample.hex;
      }
      if (cursorFill && typeof cursorFill.setAttribute === "function") {
        cursorFill.setAttribute("fill", over && sample ? sample.hex : "#ffffff");
      }

      const glass = $("eyedropper-glass");
      const ctx = glass && typeof glass.getContext === "function" ? glass.getContext("2d") : null;
      if (!ctx || typeof ctx.fillRect !== "function") return;
      const size = EYEDROPPER_MAG * EYEDROPPER_CELL;
      const half = (EYEDROPPER_MAG - 1) / 2;
      const source = this.eyedropper;
      const cells = [];
      const center =
        over && source && source.ctx && typeof source.ctx.getImageData === "function" && event
          ? this.eyedropperBitmapPoint(event)
          : null;
      if (center && source) {
        const ctm = typeof canvas.getScreenCTM === "function" ? canvas.getScreenCTM() : null;
        const screenScale = (ctm && ctm.a) || source.screenScale || 1;
        const step = Math.max(source.scaleX / screenScale, 0.05);
        const originX = center.x - half * step;
        const originY = center.y - half * step;
        const sx = Math.max(0, Math.floor(originX));
        const sy = Math.max(0, Math.floor(originY));
        const sw = Math.max(0, Math.min(source.bitmapWidth, Math.ceil(originX + EYEDROPPER_MAG * step)) - sx);
        const sh = Math.max(0, Math.min(source.bitmapHeight, Math.ceil(originY + EYEDROPPER_MAG * step)) - sy);
        let img = null;
        if (sw > 0 && sh > 0) {
          try {
            img = source.ctx.getImageData(sx, sy, sw, sh);
          } catch (_) {
            img = null;
          }
        }
        for (let row = 0; row < EYEDROPPER_MAG; row += 1) {
          const line = [];
          for (let col = 0; col < EYEDROPPER_MAG; col += 1) {
            const px = Math.floor(originX + col * step);
            const py = Math.floor(originY + row * step);
            if (!img || px < sx || py < sy || px >= sx + sw || py >= sy + sh) {
              line.push([255, 255, 255]);
              continue;
            }
            const i = ((py - sy) * sw + (px - sx)) * 4;
            line.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
          }
          cells.push(line);
        }
      }
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      for (let row = 0; row < EYEDROPPER_MAG; row += 1) {
        for (let col = 0; col < EYEDROPPER_MAG; col += 1) {
          const rgb = cells[row] ? cells[row][col] : [255, 255, 255];
          ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          ctx.fillRect(col * EYEDROPPER_CELL, row * EYEDROPPER_CELL, EYEDROPPER_CELL, EYEDROPPER_CELL);
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < EYEDROPPER_MAG; i += 1) {
        ctx.moveTo(i * EYEDROPPER_CELL + 0.5, 0);
        ctx.lineTo(i * EYEDROPPER_CELL + 0.5, size);
        ctx.moveTo(0, i * EYEDROPPER_CELL + 0.5);
        ctx.lineTo(size, i * EYEDROPPER_CELL + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(15,23,42,0.14)";
      ctx.stroke();
      const cx = half * EYEDROPPER_CELL;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, cx + 1, EYEDROPPER_CELL - 2, EYEDROPPER_CELL - 2);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 0.5, cx + 0.5, EYEDROPPER_CELL - 1, EYEDROPPER_CELL - 1);
      ctx.restore();
    }

    applyTextGradient(from, to) {
      this.applyPaintGradient(from, to, "text");
    }

    applyPaintGradient(from, to, target, options = {}) {
      const start = parseColor(from);
      const end = parseColor(to);
      if (!start || !end) return;
      const kind = target || "text";
      const fillTags = new Set(["rect", "circle", "ellipse", "polygon", "text"]);
      const strokeTags = STROKE_TAGS;
      const targets =
        kind === "stroke"
          ? this.selected.filter((el) => strokeTags.has(el.tagName.toLowerCase()))
          : kind === "fill"
            ? this.selected.filter((el) => fillTags.has(el.tagName.toLowerCase()))
            : this.selectedTextElements();
      if (!targets.length) return;
      let defs = content.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS(NS, "defs");
        content.insertBefore(defs, content.firstChild);
      }
      const prefix = kind === "stroke" ? "stroke-gradient-" : kind === "fill" ? "fill-gradient-" : "text-gradient-";
      const id = prefix + uid();
      const angle = Number(options.angle);
      const vector = linearGradientVector(Number.isFinite(angle) ? angle : 135);
      const rawStops = Array.isArray(options.stops) && options.stops.length >= 2 ? options.stops : [start, end];
      const stopColors = rawStops.map((value) => parseColor(value)).filter(Boolean);
      if (stopColors.length < 2) return;
      const radial = options.kind === "radial";
      const gradient = document.createElementNS(NS, radial ? "radialGradient" : "linearGradient");
      gradient.setAttribute("id", id);
      if (radial) {
        gradient.setAttribute("cx", "50%");
        gradient.setAttribute("cy", "42%");
        gradient.setAttribute("r", "72%");
      } else {
        gradient.setAttribute("x1", vector.x1 + "%");
        gradient.setAttribute("y1", vector.y1 + "%");
        gradient.setAttribute("x2", vector.x2 + "%");
        gradient.setAttribute("y2", vector.y2 + "%");
      }
      gradient.setAttribute(
        kind === "stroke" ? "data-editor-stroke-gradient" : "data-editor-text-gradient",
        "true"
      );
      stopColors.forEach((color, index) => {
        const stop = document.createElementNS(NS, "stop");
        stop.setAttribute("offset", `${(index / (stopColors.length - 1)) * 100}%`);
        stop.setAttribute("stop-color", color);
        gradient.appendChild(stop);
      });
      defs.appendChild(gradient);
      const preview = radial
        ? `radial-gradient(circle at 50% 42%, ${stopColors.join(", ")})`
        : `linear-gradient(${Number.isFinite(angle) ? angle : 135}deg, ${stopColors.join(", ")})`;
      const attr = kind === "stroke" ? "stroke" : "fill";
      targets.forEach((el) => {
        el.setAttribute(attr, `url(#${id})`);
        if (el.style && el.style.removeProperty) el.style.removeProperty(attr);
        if (kind === "text" || kind === "fill") {
          el.setAttribute("data-text-color-preview", start);
          el.setAttribute("data-text-gradient-preview", preview);
        }
      });
      if (kind === "fill" && $("prop-fill-none")) $("prop-fill-none").checked = false;
      if (kind === "fill") $("prop-fill").value = start;
      if (kind === "stroke") $("prop-stroke").value = start;
      this.closeTextColorMenu();
      stopColors.forEach((color) => this.rememberColor(color));
      this.redrawOverlay();
      this.refreshHits();
      this.updateProps();
      clearTimeout(this._propTimer);
      this._propTimer = setTimeout(
        () => this.commit(kind === "stroke" ? "已修改描边渐变颜色" : kind === "fill" ? "已修改填充渐变颜色" : "已修改文字渐变颜色"),
        250
      );
    }

    toggleExportMenu() {
      const menu = $("export-menu");
      const open = menu.classList.contains("hidden");
      menu.classList.toggle("hidden", !open);
      $("btn-export").setAttribute("aria-expanded", open ? "true" : "false");
      this.updateExportMenu();
    }

    updateExportMenu(persist = false) {
      const format = $("export-format").value || "png";
      const isSvg = format === "svg";
      const isJpeg = format === "jpeg";
      $("export-scale").disabled = isSvg;
      $("export-background").disabled = isSvg || isJpeg;
      if (isJpeg) $("export-background").value = "white";
      const scale = parseFloat($("export-scale").value) || 1;
      const dimensions = this.exportDimensions(scale);
      $("export-size").textContent = isSvg
        ? `矢量图 ${Math.round(this.docBox.w)} × ${Math.round(this.docBox.h)}`
        : `${dimensions.width} × ${dimensions.height} px`;
      if (persist) this.persistPreferences();
    }

    exportDimensions(scale) {
      const factor = Math.max(1, Number(scale) || 1);
      const width = Math.max(1, Math.round(this.docBox.w * factor));
      const height = Math.max(1, Math.round(this.docBox.h * factor));
      const maxSide = 16384;
      const maxPixels = 100000000;
      return {
        width,
        height,
        valid: width <= maxSide && height <= maxSide && width * height <= maxPixels,
      };
    }

    async loadExportImage(url) {
      const image = new Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("无法渲染 SVG"));
      });
      image.src = url;
      if (typeof image.decode === "function") {
        try {
          await image.decode();
          return image;
        } catch (_) {
          throw new Error("无法渲染 SVG");
        }
      }
      return loaded;
    }

    async exportSelectedFormat(options = {}) {
      const direct = options.direct === true;
      const format = $("export-format").value || "png";
      const scale = parseFloat($("export-scale").value) || 1;
      const baseName = (this.fileName || "edited.svg").replace(/\.[^.]+$/, "");
      if (format === "svg") {
        await this.deliverExport(
          new Blob([this.serialize()], { type: "image/svg+xml;charset=utf-8" }),
          baseName + ".svg",
          { direct }
        );
        $("export-menu").classList.add("hidden");
        $("btn-export").setAttribute("aria-expanded", "false");
        return;
      }

      const dimensions = this.exportDimensions(scale);
      if (!dimensions.valid) {
        throw new Error(`导出尺寸 ${dimensions.width}×${dimensions.height} 过大，请降低清晰度`);
      }
      const svgBlob = new Blob(
        [this.serialize({ pixelWidth: dimensions.width, pixelHeight: dimensions.height })],
        { type: "image/svg+xml;charset=utf-8" }
      );
      const sourceUrl = URL.createObjectURL(svgBlob);
      try {
        const image = await this.loadExportImage(sourceUrl);
        const raster = document.createElement("canvas");
        raster.width = dimensions.width;
        raster.height = dimensions.height;
        const context = raster.getContext("2d", { alpha: true, colorSpace: "srgb" }) || raster.getContext("2d");
        if (!context) throw new Error("无法创建高清画布");
        const background = format === "jpeg" ? "white" : $("export-background").value;
        if (background === "white") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, dimensions.width, dimensions.height);
        }
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
        const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
        const blob = await new Promise((resolve, reject) =>
          raster.toBlob(
            (result) => result ? resolve(result) : reject(new Error("图片编码失败")),
            mime,
            format === "png" ? undefined : 0.95
          )
        );
        const suffix = scale > 1 ? `@${scale}x` : "";
        await this.deliverExport(
          blob,
          `${baseName}${suffix}.${format === "jpeg" ? "jpg" : format}`,
          { direct }
        );
        $("export-menu").classList.add("hidden");
        $("btn-export").setAttribute("aria-expanded", "false");
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    }

    async deliverExport(blob, fileName, options = {}) {
      if (vscode) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("无法读取导出文件"));
          reader.readAsDataURL(blob);
        });
        vscode.postMessage({
          type: "export-file",
          fileName,
          mime: blob.type,
          base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
          direct: options.direct === true,
        });
        this.status(options.direct === true ? "正在快速导出到当前文件夹…" : "请选择导出位置…");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
      this.status("已导出 " + fileName);
    }

    componentGroupOf(el) {
      let cur = el && el.parentNode;
      while (cur && cur !== content) {
        if (isComponentGroup(cur)) return cur;
        cur = cur.parentNode;
      }
      return null;
    }

    graphicsIn(root, out = []) {
      elementChildren(root).forEach((child) => {
        if (isHitClone(child)) return;
        const tag = tagOf(child);
        if (GRAPHIC_TAGS.has(tag)) out.push(child);
        if (tag === "g") this.graphicsIn(child, out);
      });
      return out;
    }

    collectTexts() {
      const listed =
        typeof content.querySelectorAll === "function" ? [...content.querySelectorAll("text")] : [];
      if (listed.length) return listed;
      return this.graphicsIn(content).filter((el) => tagOf(el) === "text");
    }

    ownerLinkedGraphics(el) {
      if (!el || !el.getAttribute) return [];
      const members = new Set();
      const add = (node) => {
        if (node) members.add(node);
      };
      add(el);
      const ownId = el.getAttribute("id");
      const ownerId = el.getAttribute("data-parent-shape") || el.getAttribute("data-owner");
      this.collectTexts().forEach((text) => {
        const parentShape = text.getAttribute("data-parent-shape");
        const owner = text.getAttribute("data-owner");
        if (ownId && (parentShape === ownId || owner === ownId)) add(text);
        if (ownerId && (text === el || parentShape === ownerId || owner === ownerId || text.getAttribute("id") === ownerId)) {
          add(text);
        }
      });
      if (ownerId) {
        this.graphicsIn(content).forEach((node) => {
          if (node.getAttribute && node.getAttribute("id") === ownerId) add(node);
        });
      }
      return [...members];
    }

    componentMembers(el) {
      const group = this.componentGroupOf(el);
      if (group) {
        return this.graphicsIn(group).filter((node) => !node.hasAttribute || !node.hasAttribute("data-line-label-for"));
      }
      const linked = this.ownerLinkedGraphics(el);
      return linked.length > 1 ? linked : [];
    }

    expandSelection(el) {
      if (!el || isLockedBackdrop(el, this.docBox)) return [];
      const members = this.componentMembers(el).filter((node) => !isLockedBackdrop(node, this.docBox));
      return members.length ? members : [el];
    }

    boxFromElement(el) {
      const box = this.elementBox(el);
      if (box) return box;
      const tag = tagOf(el);
      if (tag === "rect" || tag === "image") {
        const x = num(el, "x");
        const y = num(el, "y");
        const w = num(el, "width");
        const h = num(el, "height");
        if (w > 0 && h > 0) {
          return { el, tag, left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
        }
      }
      if (tag === "text") {
        const x = num(el, "x");
        const y = num(el, "y");
        if (Number.isFinite(x) && Number.isFinite(y)) {
          return { el, tag, left: x, top: y - 8, right: x + 8, bottom: y + 8, width: 8, height: 16, cx: x, cy: y };
        }
      }
      return null;
    }

    nestedOccupants(el) {
      const group = this.componentGroupOf(el);
      if (!group || (group.getAttribute && group.getAttribute("data-object")) !== "section") return [];
      const shape = this.componentMembers(group).find((node) => tagOf(node) === "rect") || el;
      const box = this.boxFromElement(shape);
      if (!box || box.width < 40 || box.height < 40) return [];
      const own = new Set(this.componentMembers(group));
      const found = [];
      this.graphicsIn(content).forEach((node) => {
        if (!node || own.has(node) || isLockedBackdrop(node, this.docBox) || isHitClone(node)) return;
        if (this.componentGroupOf(node) === group) return;
        const inner = this.boxFromElement(node);
        if (!inner) return;
        if (inner.cx >= box.left && inner.cx <= box.right && inner.cy >= box.top && inner.cy <= box.bottom) {
          found.push(node);
        }
      });
      return found;
    }

    collectMoveItems(els) {
      const movers = new Set();
      const add = (node) => {
        if (node && !isLockedBackdrop(node, this.docBox)) movers.add(node);
      };
      (els || []).forEach((el) => {
        this.expandSelection(el).forEach(add);
        if (isConnectableShape(el)) this.containedText(el).forEach(add);
        if (isConnectorElement(el)) {
          const label = this.connectorLabelFor(el);
          if (label) add(label);
        }
        this.nestedOccupants(el).forEach((item) => this.expandSelection(item).forEach(add));
      });
      return [...movers];
    }

    reorderNode(el) {
      return this.componentGroupOf(el) || el;
    }

    containedText(rect) {
      const grouped = this.componentMembers(rect).filter(
        (el) => tagOf(el) === "text" && el !== rect && !(el.hasAttribute && el.hasAttribute("data-line-label-for"))
      );
      if (grouped.length) return grouped;
      try {
        const rb = rect.getBBox();
        return this.collectTexts().filter((t) => {
          if (t.closest && t.closest("defs")) return false;
          if (t.hasAttribute("data-line-label-for")) return false;
          const b = t.getBBox();
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          return cx >= rb.x && cx <= rb.x + rb.width && cy >= rb.y && cy <= rb.y + rb.height;
        });
      } catch (_) {
        return [];
      }
    }

    moveSet(els, dx, dy) {
      const unique = [...new Set(els)];
      unique.forEach((el) => moveBy(el, dx, dy));
    }

    elementBox(el) {
      try {
        const b = el.getBBox();
        const values = [b.x, b.y, b.width, b.height];
        if (values.some((value) => !Number.isFinite(value))) return null;
        return {
          el,
          tag: el.tagName.toLowerCase(),
          left: b.x,
          top: b.y,
          right: b.x + b.width,
          bottom: b.y + b.height,
          width: b.width,
          height: b.height,
          cx: b.x + b.width / 2,
          cy: b.y + b.height / 2,
        };
      } catch (_) {
        return null;
      }
    }

    shapeCenter(el) {
      const box = this.elementBox(el);
      if (box) return { x: box.cx, y: box.cy };
      if (el.hasAttribute("data-shape-width") && el.hasAttribute("data-shape-height")) {
        const width = num(el, "data-shape-width");
        const height = num(el, "data-shape-height");
        if (width > 0 && height > 0) {
          return {
            x: num(el, "data-shape-x") + width / 2,
            y: num(el, "data-shape-y") + height / 2,
          };
        }
      }
      const tag = el.tagName.toLowerCase();
      if (tag === "rect" || tag === "image") {
        const width = num(el, "width");
        const height = num(el, "height");
        if (width > 0 && height > 0) {
          return { x: num(el, "x") + width / 2, y: num(el, "y") + height / 2 };
        }
      }
      if (tag === "circle" || tag === "ellipse") {
        return { x: num(el, "cx"), y: num(el, "cy") };
      }
      if (tag === "polygon") {
        const pts = (el.getAttribute("points") || "")
          .trim()
          .split(/[\s,]+/)
          .map(Number)
          .filter((value) => Number.isFinite(value));
        if (pts.length >= 4) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (let i = 0; i + 1 < pts.length; i += 2) {
            minX = Math.min(minX, pts[i]);
            maxX = Math.max(maxX, pts[i]);
            minY = Math.min(minY, pts[i + 1]);
            maxY = Math.max(maxY, pts[i + 1]);
          }
          return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
      }
      return null;
    }

    boundsOf(els) {
      const boxes = els.map((el) => this.elementBox(el)).filter(Boolean);
      if (!boxes.length) return null;
      const left = Math.min(...boxes.map((box) => box.left));
      const top = Math.min(...boxes.map((box) => box.top));
      const right = Math.max(...boxes.map((box) => box.right));
      const bottom = Math.max(...boxes.map((box) => box.bottom));
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        cx: (left + right) / 2,
        cy: (top + bottom) / 2,
      };
    }

    collectSmartTargets(excludedEls) {
      const excluded = new Set(excludedEls);
      return [...content.querySelectorAll("[data-ed-id]")]
        .filter((el) => {
          if (excluded.has(el) || el.closest("defs")) return false;
          if (el.classList.contains("svg-ed-hit")) return false;
          if (isLockedBackdrop(el, this.docBox)) return false;
          return GRAPHIC_TAGS.has(el.tagName.toLowerCase());
        })
        .slice(0, 500)
        .map((el) => this.elementBox(el))
        .filter(Boolean);
    }

    collectResizeTargets(excludedEl) {
      return [...content.querySelectorAll("[data-ed-id]")]
        .filter((el) => {
          if (el === excludedEl || el.closest("defs")) return false;
          if (isLockedBackdrop(el, this.docBox)) return false;
          return isConnectableShape(el);
        })
        .slice(0, 500)
        .map((el) => this.elementBox(el))
        .filter(Boolean);
    }

    shapeConnectionAnchors(el) {
      const box = this.elementBox(el);
      if (!box) return [];
      if (el.getAttribute("data-flow-shape") === "parallelogram") {
        const skew = Math.min(box.width * 0.2, box.height * 0.55);
        return [
          { x: box.cx, y: box.top, side: "上", el },
          { x: box.right - skew / 2, y: box.cy, side: "右", el },
          { x: box.cx, y: box.bottom, side: "下", el },
          { x: box.left + skew / 2, y: box.cy, side: "左", el },
        ];
      }
      return [
        { x: box.cx, y: box.top, side: "上", el },
        { x: box.right, y: box.cy, side: "右", el },
        { x: box.cx, y: box.bottom, side: "下", el },
        { x: box.left, y: box.cy, side: "左", el },
      ];
    }

    collectConnectionAnchors(excludedEls = []) {
      const excluded = new Set(excludedEls);
      return [...content.querySelectorAll("[data-ed-id]")]
        .filter((el) => {
          if (excluded.has(el) || el.closest("defs")) return false;
          return isConnectableShape(el);
        })
        .slice(0, 500)
        .flatMap((el) => this.shapeConnectionAnchors(el));
    }

    glueId(el) {
      let id = el.getAttribute("data-glue-id");
      if (!id) {
        id = uid();
        el.setAttribute("data-glue-id", id);
      }
      return id;
    }

    shapeByGlueId(id) {
      if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
      return (
        [...content.querySelectorAll(`[data-glue-id="${id}"]`)].find(
          (el) => !el.classList.contains("svg-ed-hit")
        ) || null
      );
    }

    setConnectorGlue(el, atStart, anchor) {
      const attrs = GLUE_ATTRS[atStart ? "start" : "end"];
      if (anchor && anchor.el && GLUE_SIDES.has(anchor.side)) {
        el.setAttribute(attrs.id, this.glueId(anchor.el));
        el.setAttribute(attrs.side, anchor.side);
        return true;
      }
      el.removeAttribute(attrs.id);
      el.removeAttribute(attrs.side);
      return false;
    }

    connectorGlue(el, atStart) {
      const attrs = GLUE_ATTRS[atStart ? "start" : "end"];
      const side = el.getAttribute(attrs.side);
      if (!GLUE_SIDES.has(side)) return null;
      const shape = this.shapeByGlueId(el.getAttribute(attrs.id));
      if (!shape) return null;
      const anchor = this.shapeConnectionAnchors(shape).find((item) => item.side === side);
      return anchor ? { shape, side, x: anchor.x, y: anchor.y, el: shape } : null;
    }

    gluedConnectors() {
      return [...content.querySelectorAll("[data-start-glue], [data-end-glue]")].filter(
        (el) => !el.classList.contains("svg-ed-hit") && isLineLikeConnector(el)
      );
    }

    // Endpoints saved earlier carry no glue attributes. An endpoint sitting
    // exactly on a shape side midpoint can only have got there by snapping, so
    // adopt it as glue and existing diagrams gain the behaviour on open.
    inferConnectorGlue() {
      const anchors = this.collectConnectionAnchors();
      if (!anchors.length) return 0;
      let adopted = 0;
      [...content.querySelectorAll("line, path, polyline")].forEach((el) => {
        if (el.closest("defs") || el.classList.contains("svg-ed-hit")) return;
        if (!isLineLikeConnector(el)) return;
        const points = this.connectorPoints(el);
        if (points.length < 2) return;
        [true, false].forEach((atStart) => {
          if (el.hasAttribute(GLUE_ATTRS[atStart ? "start" : "end"].id)) return;
          const point = atStart ? points[0] : points[points.length - 1];
          const anchor = anchors.find(
            (item) =>
              item.el !== el &&
              Math.abs(item.x - point.x) <= 0.5 &&
              Math.abs(item.y - point.y) <= 0.5
          );
          if (anchor && this.setConnectorGlue(el, atStart, anchor)) adopted += 1;
        });
      });
      return adopted;
    }

    reflowGluedConnectors(changedEls = []) {
      const changed = new Set(changedEls);
      if (!changed.size) return [];
      const rerouted = [];
      this.gluedConnectors().forEach((el) => {
        const next = this.applyConnectorGlue(el, changed);
        if (next) rerouted.push(next);
      });
      if (rerouted.length) this.syncConnectorLabels();
      return rerouted;
    }

    // Re-anchors a connector on the shape sides it is glued to. Only the ends
    // whose shape actually changed move, so bends the user placed by hand stay
    // where they are.
    applyConnectorGlue(el, changed = null) {
      const startGlue = this.connectorGlue(el, true);
      const endGlue = this.connectorGlue(el, false);
      // A connector that travelled itself has to re-anchor both ends, otherwise
      // the end whose shape stayed put would be left behind.
      const affected = (glue) =>
        Boolean(glue) && (!changed || changed.has(glue.shape) || changed.has(el));
      const moveStart = affected(startGlue);
      const moveEnd = affected(endGlue);
      if (!moveStart && !moveEnd) return null;

      const points = this.connectorPoints(el);
      if (points.length < 2) return null;
      const before = points.length;
      const first = points[0];
      const last = points[points.length - 1];
      const moved = (glue, point) =>
        Math.abs(glue.x - point.x) > 0.001 || Math.abs(glue.y - point.y) > 0.001;
      if (!(moveStart && moved(startGlue, first)) && !(moveEnd && moved(endGlue, last))) {
        return null;
      }

      if (moveStart && moveEnd) {
        const dx = startGlue.x - first.x;
        const dy = startGlue.y - first.y;
        const rigid =
          Math.abs(endGlue.x - last.x - dx) <= 0.001 &&
          Math.abs(endGlue.y - last.y - dy) <= 0.001;
        if (rigid) {
          // Both shapes travelled together, so the whole route can ride along
          // and every hand-placed bend survives untouched.
          this.writeConnectorPoints(
            el,
            points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
          );
          return el;
        }
        this.writeConnectorPoints(
          el,
          this.autoConnectorPoints(startGlue, endGlue, startGlue, endGlue)
        );
        this.resetConnectorRouting(el, before);
        return el;
      }

      const target = moveStart ? startGlue : endGlue;
      const straight =
        el.tagName.toLowerCase() === "line" ||
        points.length === 2;
      if (straight) {
        // The free end is not attached to anything, so dragging the glued end
        // along is less surprising than inventing an elbow.
        const next = points.map((point) => ({ ...point }));
        next[moveStart ? 0 : next.length - 1] = { x: target.x, y: target.y };
        this.writeConnectorPoints(el, next);
        return el;
      }

      const model = this.createOrthogonalModel(el, moveStart ? 0 : points.length - 1);
      if (!model) return null;
      this.applyOrthogonalDrag(model, target.x, target.y);
      this.resetConnectorRouting(el, before);
      return el;
    }

    resetConnectorRouting(el, previousPointCount) {
      if (this.connectorPoints(el).length === previousPointCount) return;
      // Route control indices address specific vertices, so they cannot survive
      // a reroute that changes how many vertices there are.
      el.removeAttribute("data-route-controls");
      el.removeAttribute("data-start-axis");
      el.removeAttribute("data-end-axis");
      el.setAttribute("data-routing", "orthogonal");
      el.setAttribute("data-arrow-mode", "manual");
    }

    pruneDanglingGlue() {
      this.gluedConnectors().forEach((el) => {
        [true, false].forEach((atStart) => {
          const attrs = GLUE_ATTRS[atStart ? "start" : "end"];
          if (!el.hasAttribute(attrs.id)) return;
          if (this.shapeByGlueId(el.getAttribute(attrs.id))) return;
          el.removeAttribute(attrs.id);
          el.removeAttribute(attrs.side);
        });
      });
    }

    collectArrowEndpoints(excludedEls = []) {
      const excluded = new Set(excludedEls);
      return [...content.querySelectorAll("line, path, polyline")]
        .filter((el) => {
          if (excluded.has(el) || el.closest("defs") || el.classList.contains("svg-ed-hit")) return false;
          return hasArrowMarker(el);
        })
        .flatMap((el) => {
          const points = this.connectorPoints(el);
          if (points.length < 2) return [];
          return [
            { ...points[0], el, end: "start" },
            { ...points[points.length - 1], el, end: "end" },
          ];
        });
    }

    snapEndpoint(x, y, anchors, bypass = false) {
      if (bypass || !$("smart-toggle").checked || !anchors.length) {
        return { x, y, anchor: null };
      }
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const threshold = Math.max(4, 20 * scale);
      let best = null;
      anchors.forEach((anchor) => {
        const distance = Math.hypot(anchor.x - x, anchor.y - y);
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = { anchor, distance };
        }
      });
      return best
        ? { x: best.anchor.x, y: best.anchor.y, anchor: best.anchor }
        : { x, y, anchor: null };
    }

    snapToArrowEndpoints(x, y, endpoints = [], bypass = false) {
      if (bypass || !$("smart-toggle").checked || !endpoints.length) {
        return { x, y, guides: [], snappedX: false, snappedY: false };
      }
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const threshold = Math.max(2, 10 * scale);
      let bestX = null;
      let bestY = null;
      endpoints.forEach((endpoint) => {
        const dx = endpoint.x - x;
        const dy = endpoint.y - y;
        if (Math.abs(dx) <= threshold && (!bestX || Math.abs(dx) < Math.abs(bestX.delta))) {
          bestX = { delta: dx, endpoint };
        }
        if (Math.abs(dy) <= threshold && (!bestY || Math.abs(dy) < Math.abs(bestY.delta))) {
          bestY = { delta: dy, endpoint };
        }
      });
      const snappedX = Boolean(bestX);
      const snappedY = Boolean(bestY);
      const nextX = snappedX ? x + bestX.delta : x;
      const nextY = snappedY ? y + bestY.delta : y;
      const guides = [];
      if (bestX) {
        guides.push({
          kind: "align",
          axis: "x",
          value: nextX,
          start: Math.min(y, bestX.endpoint.y) - 10 * scale,
          end: Math.max(y, bestX.endpoint.y) + 10 * scale,
          label: "端点同列",
          endpoint: true,
        });
      }
      if (bestY) {
        guides.push({
          kind: "align",
          axis: "y",
          value: nextY,
          start: Math.min(x, bestY.endpoint.x) - 10 * scale,
          end: Math.max(x, bestY.endpoint.x) + 10 * scale,
          label: "端点等高",
          endpoint: true,
        });
      }
      return { x: nextX, y: nextY, guides, snappedX, snappedY };
    }

    snapConnectorEndpoint(x, y, anchors = [], endpoints = [], bypass = false) {
      const shape = this.snapEndpoint(x, y, anchors, bypass);
      if (shape.anchor) return { ...shape, guides: [], snappedX: true, snappedY: true };
      const aligned = this.snapToArrowEndpoints(shape.x, shape.y, endpoints, bypass);
      return { ...aligned, anchor: null };
    }

    snapNewArrowAxis(start, endpoint, startAnchor = null, bypass = false) {
      if (bypass || endpoint.anchor || (endpoint.guides || []).length) return endpoint;
      const dx = endpoint.x - start.x;
      const dy = endpoint.y - start.y;
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const corridor = Math.max(4, 18 * scale);
      const horizontalStart = !startAnchor || startAnchor.side === "左" || startAnchor.side === "右";
      const verticalStart = !startAnchor || startAnchor.side === "上" || startAnchor.side === "下";
      if (horizontalStart && Math.abs(dy) <= Math.max(corridor, Math.abs(dx) * 0.14)) {
        return { ...endpoint, y: start.y, axisLocked: "horizontal" };
      }
      if (verticalStart && Math.abs(dx) <= Math.max(corridor, Math.abs(dy) * 0.14)) {
        return { ...endpoint, x: start.x, axisLocked: "vertical" };
      }
      return endpoint;
    }

    constrainStraightArrowEndpoint(start, endpoint, mode = this.arrowMode) {
      if (mode !== "horizontal" && mode !== "vertical") return endpoint;
      const horizontal = mode === "horizontal";
      const next = {
        ...endpoint,
        x: horizontal ? endpoint.x : start.x,
        y: horizontal ? start.y : endpoint.y,
        axisLocked: mode,
      };
      const anchorCompatible = !endpoint.anchor || (
        horizontal
          ? Math.abs(endpoint.anchor.y - start.y) <= 0.001
          : Math.abs(endpoint.anchor.x - start.x) <= 0.001
      );
      if (!anchorCompatible) next.anchor = null;
      next.guides = (endpoint.guides || []).filter((guide) =>
        horizontal ? guide.axis === "x" : guide.axis === "y"
      );
      return next;
    }

    straightArrowPoints(start, endpoint, mode = this.arrowMode) {
      const constrained = this.constrainStraightArrowEndpoint(start, endpoint, mode);
      return [
        { x: start.x, y: start.y },
        { x: constrained.x, y: constrained.y },
      ];
    }

    constrainExistingStraightEndpoint(el, atStart, x, y) {
      const mode = el.getAttribute("data-arrow-mode");
      const points = this.connectorPoints(el);
      if (points.length !== 2 || (mode !== "horizontal" && mode !== "vertical")) {
        return { x, y };
      }
      const other = atStart ? points[points.length - 1] : points[0];
      return mode === "horizontal" ? { x, y: other.y } : { x: other.x, y };
    }

    connectorPoints(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === "line") {
        return [
          { x: num(el, "x1"), y: num(el, "y1") },
          { x: num(el, "x2"), y: num(el, "y2") },
        ];
      }
      if (tag === "path") {
        return pathVertices(el.getAttribute("d") || "").verts.map((point) => ({
          x: point.x,
          y: point.y,
        }));
      }
      if (tag === "polyline") {
        const values = (el.getAttribute("points") || "")
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number);
        const points = [];
        for (let i = 0; i + 1 < values.length; i += 2) {
          if (Number.isFinite(values[i]) && Number.isFinite(values[i + 1])) {
            points.push({ x: values[i], y: values[i + 1] });
          }
        }
        return points;
      }
      return [];
    }

    pointAlongConnector(el, position = 0.5) {
      const ratio = Math.max(0, Math.min(1, Number(position) || 0));
      const curvedPath =
        el.tagName.toLowerCase() === "path" && /[CQAST]/i.test(el.getAttribute("d") || "");
      if (curvedPath && typeof el.getTotalLength === "function" && typeof el.getPointAtLength === "function") {
        try {
          const total = el.getTotalLength();
          const length = total * ratio;
          const point = el.getPointAtLength(length);
          const before = el.getPointAtLength(Math.max(0, length - 0.5));
          const after = el.getPointAtLength(Math.min(total, length + 0.5));
          return { x: point.x, y: point.y, dx: after.x - before.x, dy: after.y - before.y, ratio };
        } catch (_) {
          /* fall back to parsed vertices */
        }
      }

      const points = this.connectorPoints(el);
      if (!points.length) return null;
      if (points.length === 1) return { ...points[0], dx: 1, dy: 0, ratio };
      const segments = points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        return { point, next, length: Math.hypot(next.x - point.x, next.y - point.y) };
      });
      const total = segments.reduce((sum, segment) => sum + segment.length, 0);
      if (!total) return { ...points[0], dx: 1, dy: 0, ratio };
      let remaining = total * ratio;
      for (const segment of segments) {
        if (remaining <= segment.length || segment === segments[segments.length - 1]) {
          const local = segment.length ? Math.max(0, Math.min(1, remaining / segment.length)) : 0;
          return {
            x: segment.point.x + (segment.next.x - segment.point.x) * local,
            y: segment.point.y + (segment.next.y - segment.point.y) * local,
            dx: segment.next.x - segment.point.x,
            dy: segment.next.y - segment.point.y,
            ratio,
          };
        }
        remaining -= segment.length;
      }
      return null;
    }

    projectPointToConnector(el, point) {
      const curvedPath =
        el.tagName.toLowerCase() === "path" && /[CQAST]/i.test(el.getAttribute("d") || "");
      if (curvedPath && typeof el.getTotalLength === "function" && typeof el.getPointAtLength === "function") {
        try {
          const total = el.getTotalLength();
          const steps = Math.max(24, Math.min(400, Math.ceil(total / 8)));
          const samples = [];
          for (let index = 0; index <= steps; index += 1) {
            const length = (total * index) / steps;
            const sample = el.getPointAtLength(length);
            samples.push({ x: sample.x, y: sample.y, length });
          }
          return this.projectPointToSegments(samples, point, total, "length");
        } catch (_) {
          /* fall back to parsed vertices */
        }
      }
      return this.projectPointToSegments(this.connectorPoints(el), point);
    }

    projectPointToSegments(points, point, totalHint = 0, lengthKey = "") {
      if (points.length < 2) return null;
      const lengths = points.slice(0, -1).map((start, index) =>
        lengthKey
          ? Math.max(0, points[index + 1][lengthKey] - start[lengthKey])
          : Math.hypot(points[index + 1].x - start.x, points[index + 1].y - start.y)
      );
      const total = totalHint || lengths.reduce((sum, length) => sum + length, 0);
      let traveled = 0;
      let best = null;
      points.slice(0, -1).forEach((start, index) => {
        const end = points[index + 1];
        const vx = end.x - start.x;
        const vy = end.y - start.y;
        const squared = vx * vx + vy * vy;
        const local = squared
          ? Math.max(0, Math.min(1, ((point.x - start.x) * vx + (point.y - start.y) * vy) / squared))
          : 0;
        const x = start.x + vx * local;
        const y = start.y + vy * local;
        const distance = Math.hypot(point.x - x, point.y - y);
        const along = traveled + lengths[index] * local;
        if (!best || distance < best.distance) {
          best = { x, y, distance, ratio: total ? along / total : 0 };
        }
        traveled += lengths[index];
      });
      return best;
    }

    connectorLabelFor(connector) {
      if (!connector) return null;
      const id = connector.getAttribute("data-line-id");
      return id ? content.querySelector(`text[data-line-label-for="${id}"]`) : null;
    }

    connectorForLabel(label) {
      if (!label) return null;
      const id = label.getAttribute("data-line-label-for");
      return id ? content.querySelector(`[data-line-id="${id}"]`) : null;
    }

    connectorFromLabelSelection() {
      if (this.selected.length !== 1) return null;
      const selected = this.selected[0];
      if (isLineLikeConnector(selected)) return selected;
      if (selected.tagName.toLowerCase() === "text" && selected.hasAttribute("data-line-label-for")) {
        return this.connectorForLabel(selected);
      }
      return null;
    }

    updateConnectorLabel(connector, label = this.connectorLabelFor(connector)) {
      if (!connector || !label) return null;
      const storedPosition = parseFloat(label.getAttribute("data-line-position"));
      const position = Math.max(0, Math.min(1, Number.isFinite(storedPosition) ? storedPosition : 0.5));
      const point = this.pointAlongConnector(connector, position);
      if (!point) return null;
      const tangentLength = Math.hypot(point.dx, point.dy) || 1;
      let nx = -point.dy / tangentLength;
      let ny = point.dx / tangentLength;
      if (Math.abs(point.dx) >= Math.abs(point.dy)) {
        if (ny > 0) {
          nx *= -1;
          ny *= -1;
        }
      } else if (nx < 0) {
        nx *= -1;
        ny *= -1;
      }
      // Line labels are centered directly on the connector. The previous
      // default offset of 10 pushed vertical-line text visibly to one side.
      const distance = 0;
      label.setAttribute("data-line-offset", "0");
      label.setAttribute("x", point.x + nx * distance);
      label.setAttribute("y", point.y + ny * distance);
      label.setAttribute("data-line-position", position);
      this.syncConnectorLabelCutout(connector, label);
      return { x: point.x, y: point.y, labelX: point.x + nx * distance, labelY: point.y + ny * distance, position };
    }

    clearConnectorLabelHalo(label) {
      if (!label) return;
      label.removeAttribute("stroke");
      label.removeAttribute("stroke-width");
      label.removeAttribute("stroke-linejoin");
      if (label.style) {
        if (typeof label.style.removeProperty === "function") {
          label.style.removeProperty("stroke");
          label.style.removeProperty("stroke-width");
          label.style.removeProperty("stroke-linejoin");
          label.style.removeProperty("paint-order");
        } else {
          label.style.stroke = "";
          label.style.strokeWidth = "";
          label.style.paintOrder = "";
        }
      }
    }

    contentDefs() {
      const found = content.querySelector && content.querySelector("defs");
      if (found) return found;
      if (!content.childNodes) return null;
      return (
        [...content.childNodes].find(
          (node) => node.tagName && String(node.tagName).toLowerCase() === "defs"
        ) || null
      );
    }

    ensureContentDefs() {
      let defs = this.contentDefs();
      if (defs) return defs;
      defs = document.createElementNS(NS, "defs");
      if (typeof content.insertBefore === "function") content.insertBefore(defs, content.firstChild);
      else content.appendChild(defs);
      return defs;
    }

    connectorLabelCutoutMask(connector, defs = this.contentDefs()) {
      const id = connector && connector.getAttribute("data-line-id");
      if (!id || !defs || !defs.childNodes) return null;
      return (
        [...defs.childNodes].find(
          (node) => node.getAttribute && node.getAttribute("data-line-label-mask") === id
        ) || null
      );
    }

    removeConnectorLabelCutout(connector) {
      if (!connector) return;
      connector.removeAttribute("mask");
      const mask = this.connectorLabelCutoutMask(connector);
      if (!mask) return;
      if (typeof mask.remove === "function") mask.remove();
      else if (mask.parentNode && typeof mask.parentNode.removeChild === "function") {
        mask.parentNode.removeChild(mask);
      } else if (mask.parentNode && Array.isArray(mask.parentNode.childNodes)) {
        mask.parentNode.childNodes = mask.parentNode.childNodes.filter((node) => node !== mask);
      }
    }

    connectorLabelHole(label, connector) {
      if (!label || typeof label.getBBox !== "function") return null;
      let box;
      try {
        box = label.getBBox();
      } catch (_) {
        return null;
      }
      if (!box || !(box.width > 0) || !(box.height > 0)) return null;
      const fontSize =
        parseFloat((label.style && label.style.fontSize) || label.getAttribute("font-size")) || 18;
      const strokeWidth = parseFloat(
        (connector && (connector.getAttribute("stroke-width") || (connector.style && connector.style.strokeWidth))) || 3
      ) || 3;
      const padX = Math.max(6, strokeWidth, fontSize * 0.2);
      const padY = Math.max(4, strokeWidth * 0.75, fontSize * 0.15);
      const hole = document.createElementNS(NS, "rect");
      hole.setAttribute("x", String(box.x - padX));
      hole.setAttribute("y", String(box.y - padY));
      hole.setAttribute("width", String(box.width + padX * 2));
      hole.setAttribute("height", String(box.height + padY * 2));
      hole.setAttribute("rx", "2");
      hole.setAttribute("fill", "#000000");
      return hole;
    }

    syncConnectorLabelCutout(connector, label) {
      this.clearConnectorLabelHalo(label);
      if (!connector || !label) return;
      const lineId = connector.getAttribute("data-line-id");
      if (!lineId) return;
      const hole = this.connectorLabelHole(label, connector);
      if (!hole) return;
      const defs = this.ensureContentDefs();
      const maskId = "line-label-cutout-" + lineId;
      const pad = 40;
      const maskX = String(this.docBox.x - pad);
      const maskY = String(this.docBox.y - pad);
      const maskW = String(this.docBox.w + pad * 2);
      const maskH = String(this.docBox.h + pad * 2);
      let mask = this.connectorLabelCutoutMask(connector, defs);
      if (!mask) {
        mask = document.createElementNS(NS, "mask");
        mask.setAttribute("id", maskId);
        mask.setAttribute("data-line-label-mask", lineId);
        defs.appendChild(mask);
      }
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      mask.setAttribute("x", maskX);
      mask.setAttribute("y", maskY);
      mask.setAttribute("width", maskW);
      mask.setAttribute("height", maskH);
      const cover = document.createElementNS(NS, "rect");
      cover.setAttribute("x", maskX);
      cover.setAttribute("y", maskY);
      cover.setAttribute("width", maskW);
      cover.setAttribute("height", maskH);
      cover.setAttribute("fill", "#ffffff");
      if (typeof mask.replaceChildren === "function") mask.replaceChildren(cover, hole);
      else {
        mask.childNodes = [];
        mask.appendChild(cover);
        mask.appendChild(hole);
      }
      connector.setAttribute("mask", `url(#${maskId})`);
    }

    syncConnectorLabels(connector = null) {
      if (connector) {
        this.updateConnectorLabel(connector);
        return;
      }
      content.querySelectorAll("text[data-line-label-for]").forEach((label) => {
        const owner = this.connectorForLabel(label);
        if (owner) this.updateConnectorLabel(owner, label);
      });
    }

    createConnectorLabel(connector, text = "文字") {
      let label = this.connectorLabelFor(connector);
      if (label) {
        label.textContent = text || "文字";
        this.updateConnectorLabel(connector, label);
        return label;
      }
      if (!connector.getAttribute("data-line-id")) connector.setAttribute("data-line-id", "line-" + uid());
      label = document.createElementNS(NS, "text");
      label.setAttribute("data-ed-id", uid());
      label.setAttribute("data-line-label-for", connector.getAttribute("data-line-id"));
      label.setAttribute("data-line-position", "0.5");
      label.setAttribute("data-line-offset", "0");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.setAttribute("fill", "#333333");
      label.style.fontFamily = "SimSun, Songti SC, serif";
      label.style.fontSize = "18px";
      label.textContent = text || "文字";
      content.appendChild(label);
      this.updateConnectorLabel(connector, label);
      return label;
    }

    insertConnectorLabel() {
      const connector = this.connectorFromLabelSelection();
      if (!connector) return;
      clearTimeout(this._lineLabelTimer);
      const label = this.createConnectorLabel(connector, $("prop-line-label").value.trim() || "文字");
      this.select([label], false);
      this.commit("已插入线条文字");
    }

    addConnectorTextFromToolbar() {
      const connector = this.connectorFromLabelSelection();
      if (!connector) {
        this.status("请先选中一条直线、箭头或折线");
        return;
      }
      const existing = this.connectorLabelFor(connector);
      const label = existing || this.createConnectorLabel(connector, "文字");
      label.setAttribute("data-line-position", "0.5");
      this.updateConnectorLabel(connector, label);
      this.select([label], false);
      if (!existing) this.commit("已在线条中间插入文字");
      this.startTextEdit(label);
    }

    updateConnectorLabelText() {
      const connector = this.connectorFromLabelSelection();
      const label = this.connectorLabelFor(connector);
      if (!label) return;
      label.textContent = $("prop-line-label").value;
      this.syncConnectorLabelCutout(connector, label);
      this.redrawOverlay();
      clearTimeout(this._lineLabelTimer);
      this._lineLabelTimer = setTimeout(() => this.commit("已修改线条文字"), 250);
    }

    setConnectorLabelPosition() {
      const connector = this.connectorFromLabelSelection();
      const label = this.connectorLabelFor(connector);
      if (!label) return;
      const percent = Math.max(0, Math.min(100, parseFloat($("prop-line-label-position").value) || 0));
      label.setAttribute("data-line-position", percent / 100);
      $("prop-line-label-position-value").textContent = Math.round(percent) + "%";
      this.updateConnectorLabel(connector, label);
      this.redrawOverlay();
      clearTimeout(this._lineLabelTimer);
      this._lineLabelTimer = setTimeout(() => this.commit("已调整线条文字位置"), 250);
    }

    removeConnectorLabel() {
      const connector = this.connectorFromLabelSelection();
      const label = this.connectorLabelFor(connector);
      if (!label) return;
      clearTimeout(this._lineLabelTimer);
      this.removeConnectorLabelCutout(connector);
      label.remove();
      this.select(connector && connector.isConnected ? [connector] : [], false);
      this.commit("已删除线条文字");
    }

    writeConnectorPoints(el, points) {
      const tag = el.tagName.toLowerCase();
      if (tag === "path") {
        el.setAttribute(
          "d",
          points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")
        );
        return;
      }
      if (tag === "line") {
        // A <line> only has room for two coordinates; anything with bends must
        // be converted to a path before it gets here.
        const first = points[0];
        const last = points[points.length - 1];
        if (!first || !last) return;
        el.setAttribute("x1", first.x);
        el.setAttribute("y1", first.y);
        el.setAttribute("x2", last.x);
        el.setAttribute("y2", last.y);
        return;
      }
      el.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
    }

    connectorMarkerReference(el, attribute) {
      let reference = el.getAttribute(attribute);
      if (!reference || reference === "none") {
        try {
          const style = getComputedStyle(el);
          reference = attribute === "marker-start" ? style.markerStart : style.markerEnd;
        } catch (_) {
          reference = "";
        }
      }
      return reference && reference !== "none" ? reference : "";
    }

    setConnectorMarkerReference(el, attribute, reference) {
      const cssProperty = attribute === "marker-start" ? "markerStart" : "markerEnd";
      if (reference) {
        el.setAttribute(attribute, reference);
        el.style[cssProperty] = reference;
      } else {
        el.removeAttribute(attribute);
        if (el.style.removeProperty) el.style.removeProperty(attribute);
        else el.style[cssProperty] = "";
      }
    }

    installRotatedArrowMarker(el, attribute, baseReference, angle) {
      let baseMarker = this.markerFromReference(baseReference);
      if (!baseMarker) {
        baseMarker = this.ensureArrowMarker();
        baseReference = "url(#" + baseMarker.id + ")";
      }
      let defs = content.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS(NS, "defs");
        content.insertBefore(defs, content.firstChild);
      }
      const suffix = attribute === "marker-start" ? "start" : "end";
      const markerIdAttribute = `data-arrowhead-marker-${suffix}`;
      const markerId = el.getAttribute(markerIdAttribute) || `arrowhead-${suffix}-${uid()}`;
      const previous = [...content.querySelectorAll("marker")].find((marker) => marker.id === markerId);
      if (previous) previous.remove();
      const marker = baseMarker.cloneNode(false);
      marker.setAttribute("id", markerId);
      marker.setAttribute("orient", "auto-start-reverse");
      marker.setAttribute("overflow", "visible");
      marker.style.overflow = "visible";
      const refX = parseFloat(baseMarker.getAttribute("refX")) || 0;
      const refY = parseFloat(baseMarker.getAttribute("refY")) || 0;
      const group = document.createElementNS(NS, "g");
      group.setAttribute("transform", `rotate(${angle} ${refX} ${refY})`);
      [...baseMarker.childNodes].forEach((child) => group.appendChild(child.cloneNode(true)));
      marker.appendChild(group);
      this.makeMarkerFollowStroke(marker);
      defs.appendChild(marker);
      el.setAttribute(markerIdAttribute, markerId);
      this.setConnectorMarkerReference(el, attribute, `url(#${markerId})`);
      return baseReference;
    }

    restoreArrowheadMarker(el, attribute) {
      const suffix = attribute === "marker-start" ? "start" : "end";
      const baseAttribute = `data-arrowhead-base-${suffix}`;
      const angleAttribute = `data-arrowhead-rotation-${suffix}`;
      const markerIdAttribute = `data-arrowhead-marker-${suffix}`;
      const baseReference = el.getAttribute(baseAttribute);
      const markerId = el.getAttribute(markerIdAttribute);
      if (baseReference) this.setConnectorMarkerReference(el, attribute, baseReference);
      if (markerId) {
        const marker = [...content.querySelectorAll("marker")].find((item) => item.id === markerId);
        if (marker) marker.remove();
      }
      el.removeAttribute(baseAttribute);
      el.removeAttribute(angleAttribute);
      el.removeAttribute(markerIdAttribute);
    }

    resetArrowheadRotation(el, attribute = null) {
      const attributes = attribute ? [attribute] : ["marker-start", "marker-end"];
      attributes.forEach((markerAttribute) => {
        const suffix = markerAttribute === "marker-start" ? "start" : "end";
        if (el.hasAttribute(`data-arrowhead-rotation-${suffix}`)) {
          this.restoreArrowheadMarker(el, markerAttribute);
        }
      });
      this.syncConnectorMarkers(el);
    }

    rotateArrowheadClockwise(el) {
      if (!el || !isLineLikeConnector(el) || !hasArrowMarker(el)) return false;
      const endReference = this.connectorMarkerReference(el, "marker-end");
      const attribute = endReference ? "marker-end" : "marker-start";
      const currentReference = endReference || this.connectorMarkerReference(el, attribute);
      if (!currentReference) return false;
      const suffix = attribute === "marker-start" ? "start" : "end";
      const baseAttribute = `data-arrowhead-base-${suffix}`;
      const angleAttribute = `data-arrowhead-rotation-${suffix}`;
      const baseReference = el.getAttribute(baseAttribute) || currentReference;
      if (!el.hasAttribute(baseAttribute)) el.setAttribute(baseAttribute, baseReference);
      const angle = ((parseFloat(el.getAttribute(angleAttribute)) || 0) + 90) % 360;
      if (angle === 0) {
        this.restoreArrowheadMarker(el, attribute);
      } else {
        el.setAttribute(angleAttribute, String(angle));
        this.installRotatedArrowMarker(el, attribute, baseReference, angle);
      }
      this.syncConnectorMarkers(el);
      this.commit("箭头头部已顺时针旋转 90°");
      return angle;
    }

    convertLineConnectorToPath(el) {
      if (!el || !["line", "polyline"].includes(el.tagName.toLowerCase())) return el;
      const sourceTag = el.tagName.toLowerCase();
      const points = this.connectorPoints(el);
      const path = document.createElementNS(NS, "path");
      [...el.attributes].forEach((attribute) => {
        if (!["x1", "y1", "x2", "y2", "points"].includes(attribute.name)) {
          path.setAttribute(attribute.name, attribute.value);
        }
      });
      path.setAttribute(
        "d",
        points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")
      );
      path.setAttribute("fill", path.getAttribute("fill") || "none");
      el.replaceWith(path);
      this.selected = this.selected.map((item) => item === el ? path : item);
      if (sourceTag === "polyline") this.syncConnectorLabels(path);
      return path;
    }

    connectorRouteControls(el) {
      try {
        const value = JSON.parse(el.getAttribute("data-route-controls") || "[]");
        return Array.isArray(value)
          ? value.filter((control) =>
              control &&
              (control.axis === "vertical" || control.axis === "horizontal") &&
              Number.isInteger(control.startIndex) &&
              Number.isInteger(control.endIndex)
            )
          : [];
      } catch (_) {
        return [];
      }
    }

    connectorRouteSnapTargets(el) {
      const points = this.connectorPoints(el);
      const targets = [];
      if (points.length >= 2) {
        targets.push(
          { ...points[0], priority: 0, source: "own-endpoint" },
          { ...points[points.length - 1], priority: 0, source: "own-endpoint" }
        );
      }
      this.collectConnectionAnchors([el]).forEach((anchor) => {
        targets.push({ ...anchor, priority: 1, source: "shape-anchor" });
      });
      this.collectArrowEndpoints([el]).forEach((endpoint) => {
        targets.push({ ...endpoint, priority: 2, source: "arrow-endpoint" });
      });
      const unique = new Map();
      targets.forEach((target) => {
        const key = `${Math.round(target.x * 1000)},${Math.round(target.y * 1000)}`;
        const previous = unique.get(key);
        if (!previous || target.priority < previous.priority) unique.set(key, target);
      });
      return [...unique.values()];
    }

    snapConnectorRouteControl(el, controlIndex, x, y, targets = [], bypass = false) {
      const controls = this.connectorRouteControls(el);
      const control = controls[controlIndex];
      const points = this.connectorPoints(el);
      if (
        bypass ||
        !$('smart-toggle').checked ||
        !control ||
        !points[control.startIndex] ||
        !points[control.endIndex] ||
        !targets.length
      ) {
        return { x, y, guides: [], snapped: false };
      }
      const horizontal = control.axis === "horizontal";
      const movingValue = horizontal ? y : x;
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const threshold = Math.max(4, 16 * scale);
      let best = null;
      targets.forEach((target) => {
        const targetValue = horizontal ? target.y : target.x;
        const delta = targetValue - movingValue;
        const priority = Number.isFinite(target.priority) ? target.priority : 2;
        if (
          Math.abs(delta) <= threshold &&
          (
            !best ||
            priority < best.priority ||
            (priority === best.priority && Math.abs(delta) < Math.abs(best.delta))
          )
        ) {
          best = { target, targetValue, delta, priority };
        }
      });
      if (!best) return { x, y, guides: [], snapped: false };
      const first = points[control.startIndex];
      const second = points[control.endIndex];
      const crossValues = horizontal
        ? [first.x, second.x, best.target.x]
        : [first.y, second.y, best.target.y];
      return {
        x: horizontal ? x : best.targetValue,
        y: horizontal ? best.targetValue : y,
        snapped: true,
        guides: [{
          kind: "align",
          axis: horizontal ? "y" : "x",
          value: best.targetValue,
          start: Math.min(...crossValues) - 10 * scale,
          end: Math.max(...crossValues) + 10 * scale,
          label: horizontal ? "折线与连接点等高" : "折线与连接点同列",
          endpoint: true,
        }],
      };
    }

    insertConnectorNodePoints(points, controls = []) {
      if (!Array.isArray(points) || points.length < 2) return null;
      const controlledSegments = new Set(controls.map((control) => control.startIndex));
      let segmentIndex = -1;
      let longest = -1;
      points.slice(0, -1).forEach((point, index) => {
        if (controlledSegments.has(index)) return;
        const next = points[index + 1];
        const length = Math.hypot(next.x - point.x, next.y - point.y);
        if (length > longest) {
          longest = length;
          segmentIndex = index;
        }
      });
      if (segmentIndex < 0 || longest <= 0.001) return null;
      const start = points[segmentIndex];
      const end = points[segmentIndex + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const verticalDominant = Math.abs(dy) >= Math.abs(dx);
      const diagonal = Math.abs(dx) > 0.001 && Math.abs(dy) > 0.001;
      if (diagonal) {
        const nextPoints = points.map((point) => ({ x: point.x, y: point.y }));
        const bridge = verticalDominant
          ? [
              { x: start.x, y: start.y + dy / 3 },
              { x: end.x, y: start.y + dy / 3 },
            ]
          : [
              { x: start.x + dx / 3, y: start.y },
              { x: start.x + dx / 3, y: end.y },
            ];
        nextPoints.splice(segmentIndex + 1, 0, ...bridge);
        const nextControls = controls.map((control) => ({
          ...control,
          startIndex: control.startIndex > segmentIndex ? control.startIndex + 2 : control.startIndex,
          endIndex: control.endIndex > segmentIndex ? control.endIndex + 2 : control.endIndex,
        }));
        const control = {
          axis: verticalDominant ? "horizontal" : "vertical",
          startIndex: segmentIndex + 1,
          endIndex: segmentIndex + 2,
        };
        nextControls.push(control);
        return {
          points: nextPoints,
          controls: nextControls,
          controlIndex: nextControls.length - 1,
          node: {
            x: (bridge[0].x + bridge[1].x) / 2,
            y: (bridge[0].y + bridge[1].y) / 2,
          },
        };
      }
      const first = {
        x: start.x + dx / 3,
        y: start.y + dy / 3,
      };
      const second = {
        x: start.x + (dx * 2) / 3,
        y: start.y + (dy * 2) / 3,
      };
      const axis = verticalDominant
        ? "vertical"
        : "horizontal";
      const nextPoints = points.map((point) => ({ x: point.x, y: point.y }));
      nextPoints.splice(
        segmentIndex + 1,
        0,
        first,
        { ...first },
        second,
        { ...second }
      );
      const nextControls = controls.map((control) => ({
        ...control,
        startIndex: control.startIndex > segmentIndex ? control.startIndex + 4 : control.startIndex,
        endIndex: control.endIndex > segmentIndex ? control.endIndex + 4 : control.endIndex,
      }));
      const control = {
        axis,
        startIndex: segmentIndex + 2,
        endIndex: segmentIndex + 3,
      };
      nextControls.push(control);
      return {
        points: nextPoints,
        controls: nextControls,
        controlIndex: nextControls.length - 1,
        node: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      };
    }

    selectedStrokeElements() {
      return this.selected.filter((el) => STROKE_TAGS.has(el.tagName.toLowerCase()));
    }

    currentLineStyleKey(el) {
      if (!el) return "solid";
      let dash = "";
      try {
        dash = String(el.getAttribute("stroke-dasharray") || getComputedStyle(el).strokeDasharray || "");
      } catch (_) {
        dash = String(el.getAttribute("stroke-dasharray") || "");
      }
      dash = dash.trim().replace(/,/g, " ").replace(/\s+/g, " ");
      if (!dash || dash === "none") return "solid";
      const known = Object.entries(LINE_STYLE_DASHES).find(([, value]) => value === dash);
      return known ? known[0] : "dashed";
    }

    applyStrokeDash(el, styleKey) {
      const dash = LINE_STYLE_DASHES[styleKey] || "";
      if (dash) {
        el.setAttribute("stroke-dasharray", dash);
        el.style.strokeDasharray = dash;
      } else {
        el.removeAttribute("stroke-dasharray");
        if (el.style.removeProperty) el.style.removeProperty("stroke-dasharray");
        else el.style.strokeDasharray = "";
      }
      if (styleKey === "dotted") {
        el.setAttribute("stroke-linecap", "round");
        el.style.strokeLinecap = "round";
      }
    }

    applyStrokeWidth(el, width) {
      const value = Number(width);
      if (!Number.isFinite(value) || value < 0) return;
      el.setAttribute("stroke-width", value);
      el.style.strokeWidth = String(value);
    }

    ensureVisibleStroke(el) {
      let stroke = el.getAttribute("stroke") || el.style.stroke;
      if (!stroke) {
        try {
          stroke = getComputedStyle(el).stroke;
        } catch (_) {
          stroke = "";
        }
      }
      if (!stroke || stroke === "none") {
        el.setAttribute("stroke", "#b85f2a");
        el.style.stroke = "#b85f2a";
      }
    }

    buildLineStyleMenu() {
      const grid = $("line-style-grid");
      if (!grid) return;
      grid.replaceChildren();
      Object.keys(LINE_STYLE_DASHES).forEach((styleKey) => {
        LINE_STYLE_WEIGHTS.forEach((weight) => {
          const button = document.createElement("button");
          button.type = "button";
          button.setAttribute("role", "menuitem");
          button.dataset.lineStyle = styleKey;
          button.dataset.lineWidth = String(weight);
          button.title = `${LINE_STYLE_LABELS[styleKey]} · 线宽 ${weight}`;
          const svg = document.createElementNS(NS, "svg");
          svg.setAttribute("viewBox", "0 0 72 18");
          svg.setAttribute("aria-hidden", "true");
          const line = document.createElementNS(NS, "line");
          line.setAttribute("x1", "4");
          line.setAttribute("y1", "9");
          line.setAttribute("x2", "68");
          line.setAttribute("y2", "9");
          line.setAttribute("stroke", "#2c4a6e");
          line.setAttribute("stroke-width", String(weight));
          line.setAttribute("fill", "none");
          if (LINE_STYLE_DASHES[styleKey]) {
            line.setAttribute("stroke-dasharray", LINE_STYLE_DASHES[styleKey]);
          }
          if (styleKey === "dotted") line.setAttribute("stroke-linecap", "round");
          svg.appendChild(line);
          button.appendChild(svg);
          button.addEventListener("click", () => this.applyLineStylePreset(styleKey, weight));
          grid.appendChild(button);
        });
      });
    }

    paintLineStylePreview(line, styleKey, color = "#2c4a6e", width = 2.2) {
      if (!line) return;
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", String(width));
      const dash = LINE_STYLE_DASHES[styleKey] || "";
      if (dash) line.setAttribute("stroke-dasharray", dash);
      else line.removeAttribute("stroke-dasharray");
      if (styleKey === "dotted") line.setAttribute("stroke-linecap", "round");
      else line.removeAttribute("stroke-linecap");
    }

    buildPropLineStyleMenu() {
      const menu = $("prop-line-style-menu");
      if (!menu) return;
      menu.replaceChildren();
      Object.keys(LINE_STYLE_DASHES).forEach((styleKey) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "option");
        button.dataset.lineStyle = styleKey;
        button.title = LINE_STYLE_LABELS[styleKey];
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 88 18");
        svg.setAttribute("aria-hidden", "true");
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", "6");
        line.setAttribute("y1", "9");
        line.setAttribute("x2", "82");
        line.setAttribute("y2", "9");
        line.setAttribute("fill", "none");
        this.paintLineStylePreview(line, styleKey);
        svg.appendChild(line);
        button.appendChild(svg);
        const caption = document.createElement("span");
        caption.textContent = LINE_STYLE_LABELS[styleKey];
        button.appendChild(caption);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          $("prop-line-style").value = styleKey;
          $("prop-line-style").dispatchEvent(new Event("change"));
          this.closePropLineStyleMenu();
        });
        menu.appendChild(button);
      });
    }

    syncPropLineStylePreview() {
      const select = $("prop-line-style");
      const button = $("prop-line-style-btn");
      const menu = $("prop-line-style-menu");
      if (!select || !button) return;
      button.disabled = Boolean(select.disabled);
      const styleKey = select.value || "solid";
      const color = ($("prop-stroke") && $("prop-stroke").value) || "#2c4a6e";
      this.paintLineStylePreview($("prop-line-style-line"), styleKey, color);
      if (!menu) return;
      [...(menu.querySelectorAll("[data-line-style]") || [])].forEach((item) => {
        const active = item.dataset.lineStyle === styleKey;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    positionPropLineStyleMenu() {
      const button = $("prop-line-style-btn");
      const menu = $("prop-line-style-menu");
      if (!button || !menu || typeof button.getBoundingClientRect !== "function") return;
      const rect = button.getBoundingClientRect();
      const menuHeight = menu.offsetHeight || 148;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight + 8 ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 2;
      menu.style.left = rect.left + "px";
      menu.style.width = rect.width + "px";
      menu.style.top = top + "px";
    }

    applyLineStylePreset(styleKey, width) {
      const targets = this.selectedStrokeElements();
      if (!targets.length) {
        this.status("请先选中线条或带描边的图形");
        this.closeToolbarMenus();
        return;
      }
      targets.forEach((el) => {
        this.ensureVisibleStroke(el);
        this.applyStrokeDash(el, styleKey);
        this.applyStrokeWidth(el, width);
      });
      this.closeToolbarMenus();
      this.refreshHits();
      this.redrawOverlay();
      this.updateProps();
      this.commit("已应用线条样式");
    }

    applyNoStroke() {
      const targets = this.selectedStrokeElements();
      if (!targets.length) {
        this.status("请先选中线条或带描边的图形");
        this.closeToolbarMenus();
        return;
      }
      targets.forEach((el) => {
        el.setAttribute("stroke", "none");
        el.style.stroke = "none";
      });
      this.closeToolbarMenus();
      this.refreshHits();
      this.redrawOverlay();
      this.updateProps();
      this.commit("已设为无线条");
    }

    applyConnectorArrowEnds(placement) {
      const connectors = this.selectedLineConnectors();
      if (!connectors.length) {
        this.status("请先选中一条直线、箭头或折线");
        this.closeToolbarMenus();
        return;
      }
      connectors.forEach((el) => this.setMarkerPlacement(el, placement));
      this.closeToolbarMenus();
      this.refreshHits();
      this.redrawOverlay();
      this.updateProps();
      this.commit(placement === "none" ? "已切换为普通线条" : "已切换为带箭头线条");
    }

    selectedLineConnectors() {
      const connectors = [];
      this.selected.forEach((el) => {
        if (isLineLikeConnector(el)) {
          connectors.push(el);
          return;
        }
        if (el.tagName.toLowerCase() === "text" && el.hasAttribute("data-line-label-for")) {
          const connector = this.connectorForLabel(el);
          if (connector) connectors.push(connector);
        }
      });
      return [...new Set(connectors)];
    }

    syncLineStyleMenu() {
      const noneButton = $("btn-line-none");
      const targets = this.selectedStrokeElements();
      const sample = targets[0];
      const stroke = sample && (sample.getAttribute("stroke") || sample.style.stroke);
      const noStroke = Boolean(sample) && (!stroke || stroke === "none");
      if (noneButton) noneButton.classList.toggle("active", noStroke && targets.length > 0);
      const styleKey = sample && !noStroke ? this.currentLineStyleKey(sample) : "";
      const width = sample ? parseFloat(sample.getAttribute("stroke-width") || sample.style.strokeWidth) : NaN;
      document.querySelectorAll("#line-style-grid [data-line-style]").forEach((button) => {
        const sameStyle = button.dataset.lineStyle === styleKey;
        const sameWidth = Math.abs(Number(button.dataset.lineWidth) - width) < 0.05;
        button.classList.toggle("active", Boolean(sample) && !noStroke && sameStyle && sameWidth);
      });
      const connectors = this.selectedLineConnectors();
      const placement = connectors.length ? this.markerPlacement(connectors[0]) : "";
      const samePlacement =
        connectors.length > 0 &&
        connectors.every((el) => this.markerPlacement(el) === placement);
      document.querySelectorAll("[data-arrow-ends]").forEach((button) => {
        button.classList.toggle("active", samePlacement && button.dataset.arrowEnds === placement);
      });
    }

    addConnectorNode() {
      let connector = this.connectorFromLabelSelection();
      if (!connector) {
        this.status("请先选中一条直线、箭头或折线");
        return;
      }
      if (
        connector.tagName.toLowerCase() === "path" &&
        /[CQAST]/i.test(connector.getAttribute("d") || "")
      ) {
        this.status("曲线路径暂不支持增加折点");
        return;
      }
      connector = this.convertLineConnectorToPath(connector);
      const currentPoints = this.connectorPoints(connector);
      const currentControls = this.connectorRouteControls(connector);
      const insertion = this.insertConnectorNodePoints(currentPoints, currentControls);
      if (!insertion) {
        this.status("当前线条长度不足，无法增加节点");
        return;
      }
      if (!connector.hasAttribute("data-start-axis")) {
        const first = currentPoints[0];
        const next = currentPoints[1];
        const previous = currentPoints[currentPoints.length - 2];
        const last = currentPoints[currentPoints.length - 1];
        connector.setAttribute(
          "data-start-axis",
          Math.abs(next.y - first.y) >= Math.abs(next.x - first.x) ? "vertical" : "horizontal"
        );
        connector.setAttribute(
          "data-end-axis",
          Math.abs(last.y - previous.y) >= Math.abs(last.x - previous.x) ? "vertical" : "horizontal"
        );
      }
      this.writeConnectorPoints(connector, insertion.points);
      connector.setAttribute("data-route-controls", JSON.stringify(insertion.controls));
      connector.setAttribute("data-routing", "controlled-orthogonal");
      connector.setAttribute("data-arrow-mode", "manual");
      this.syncConnectorLabels(connector);
      this.select([connector], false);
      this.refreshHits();
      this.commit("已增加正交控制节点，拖动时保持水平/垂直转向");
    }

    moveConnectorRouteControl(el, controlIndex, x, y) {
      const controls = this.connectorRouteControls(el);
      const control = controls[controlIndex];
      const points = this.connectorPoints(el);
      if (
        !control ||
        !points[control.startIndex] ||
        !points[control.endIndex]
      ) return null;
      if (control.axis === "vertical") {
        points[control.startIndex].x = x;
        points[control.endIndex].x = x;
      } else {
        points[control.startIndex].y = y;
        points[control.endIndex].y = y;
      }
      this.writeConnectorPoints(el, points);
      return {
        x: (points[control.startIndex].x + points[control.endIndex].x) / 2,
        y: (points[control.startIndex].y + points[control.endIndex].y) / 2,
      };
    }

    moveControlledConnectorEndpoint(el, atStart, x, y) {
      const points = this.connectorPoints(el);
      if (points.length < 2) return null;
      const endpointIndex = atStart ? 0 : points.length - 1;
      const neighborIndex = atStart ? 1 : points.length - 2;
      const axis = el.getAttribute(atStart ? "data-start-axis" : "data-end-axis");
      points[endpointIndex] = { x, y };
      if (axis === "vertical") points[neighborIndex].x = x;
      if (axis === "horizontal") points[neighborIndex].y = y;
      this.writeConnectorPoints(el, points);
      this.normalizeControlledConnectorRoute(el);
      const updated = this.connectorPoints(el);
      return updated[atStart ? 0 : updated.length - 1];
    }

    sameConnectorPoint(a, b, tolerance = 0.001) {
      return Boolean(
        a &&
        b &&
        Math.abs(a.x - b.x) <= tolerance &&
        Math.abs(a.y - b.y) <= tolerance
      );
    }

    simplifyOrthogonalPoints(points) {
      const clean = [];
      points.forEach((point) => {
        const last = clean[clean.length - 1];
        if (this.sameConnectorPoint(last, point)) return;
        clean.push({ x: point.x, y: point.y });
        while (clean.length >= 3) {
          const a = clean[clean.length - 3];
          const b = clean[clean.length - 2];
          const c = clean[clean.length - 1];
          const vertical = Math.abs(a.x - b.x) <= 0.001 && Math.abs(b.x - c.x) <= 0.001;
          const horizontal = Math.abs(a.y - b.y) <= 0.001 && Math.abs(b.y - c.y) <= 0.001;
          if (vertical || horizontal) {
            // A connector never needs to travel along an axis and immediately
            // retrace it. Those zero-area U-turns can hide on a shape border
            // and make an otherwise vertical arrowhead appear horizontal.
            clean.splice(clean.length - 2, 1);
            if (this.sameConnectorPoint(clean[clean.length - 2], clean[clean.length - 1])) {
              clean.pop();
            }
          } else {
            break;
          }
        }
      });
      return clean;
    }

    appendOrthogonalPoint(points, point) {
      if (!points.length) return [{ x: point.x, y: point.y }];
      const result = points.map((item) => ({ ...item }));
      const last = result[result.length - 1];
      if (last.x === point.x || last.y === point.y) {
        result.push({ x: point.x, y: point.y });
        return this.simplifyOrthogonalPoints(result);
      }

      let horizontalFirst;
      if (result.length >= 2) {
        const previous = result[result.length - 2];
        const previousWasHorizontal = previous.y === last.y;
        horizontalFirst = !previousWasHorizontal;
      } else {
        horizontalFirst = Math.abs(point.x - last.x) >= Math.abs(point.y - last.y);
      }
      result.push(
        horizontalFirst
          ? { x: point.x, y: last.y }
          : { x: last.x, y: point.y },
        { x: point.x, y: point.y }
      );
      return this.simplifyOrthogonalPoints(result);
    }

    anchorApproachPoint(anchor) {
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const distance = Math.max(16, 24 * scale);
      if (anchor.side === "右") return { x: anchor.x + distance, y: anchor.y };
      if (anchor.side === "左") return { x: anchor.x - distance, y: anchor.y };
      if (anchor.side === "上") return { x: anchor.x, y: anchor.y - distance };
      return { x: anchor.x, y: anchor.y + distance };
    }

    anchorAxis(anchor) {
      return anchor && (anchor.side === "上" || anchor.side === "下") ? "vertical" : "horizontal";
    }

    anchorFacesPoint(anchor, point) {
      if (!anchor || !point) return false;
      if (anchor.side === "上") return point.y < anchor.y;
      if (anchor.side === "下") return point.y > anchor.y;
      if (anchor.side === "左") return point.x < anchor.x;
      return point.x > anchor.x;
    }

    isNearStraightAxis(start, end, axis) {
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const cross = axis === "vertical" ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y);
      const primary = axis === "vertical" ? Math.abs(end.y - start.y) : Math.abs(end.x - start.x);
      const screenCorridor = Math.max(4, 18 * scale);
      const proportionalCorridor = Math.max(4 * scale, primary * 0.1);
      return primary > 0 && cross <= Math.min(screenCorridor, proportionalCorridor);
    }

    preferredStraightConnector(start, end, startAnchor = null, endAnchor = null) {
      const anchored = [
        startAnchor && { anchor: startAnchor, other: end },
        endAnchor && { anchor: endAnchor, other: start },
      ].filter(Boolean);
      if (!anchored.length) return null;
      for (const axis of ["vertical", "horizontal"]) {
        if (
          anchored.every(
            ({ anchor, other }) => this.anchorAxis(anchor) === axis && this.anchorFacesPoint(anchor, other)
          ) &&
          this.isNearStraightAxis(start, end, axis)
        ) {
          return [{ x: start.x, y: start.y }, { x: end.x, y: end.y }];
        }
      }
      return null;
    }

    appendAnchoredEndpoint(points, anchor) {
      const endpoint = { x: anchor.x, y: anchor.y };
      const approach = this.anchorApproachPoint(anchor);
      const base = this.simplifyOrthogonalPoints(points);
      while (base.length > 1 && this.sameConnectorPoint(base[base.length - 1], endpoint)) {
        base.pop();
      }
      const last = base[base.length - 1];
      const alreadyApproachesCorrectly =
        last &&
        this.anchorFacesPoint(anchor, last) &&
        (this.anchorAxis(anchor) === "vertical"
          ? Math.abs(last.x - endpoint.x) <= 0.001
          : Math.abs(last.y - endpoint.y) <= 0.001);
      if (alreadyApproachesCorrectly) {
        return this.simplifyOrthogonalPoints([...base, endpoint]);
      }

      const routed = this.appendOrthogonalPoint(base, approach);
      // Do not simplify across the final approach segment: keeping this last
      // segment explicit guarantees that the marker points into the selected
      // side of the shape even when the previous route crossed that edge.
      return [...routed, endpoint].filter(
        (point, index, items) => index === 0 || !this.sameConnectorPoint(items[index - 1], point)
      );
    }

    autoConnectorPoints(start, end, startAnchor = null, endAnchor = null) {
      const straight = this.preferredStraightConnector(start, end, startAnchor, endAnchor);
      if (straight) return straight;
      let points = [{ x: start.x, y: start.y }];
      if (startAnchor) {
        points.push(this.anchorApproachPoint(startAnchor));
        points = this.simplifyOrthogonalPoints(points);
      }
      points = endAnchor
        ? this.appendAnchoredEndpoint(points, endAnchor)
        : this.appendOrthogonalPoint(points, end);
      return this.simplifyOrthogonalPoints(points);
    }

    straightenSnappedConnector(el, anchor, atStart = false) {
      const points = this.connectorPoints(el);
      if (points.length < 2 || !anchor) return null;
      const other = atStart ? points[points.length - 1] : points[0];
      const endpoint = { x: anchor.x, y: anchor.y };
      const axis = this.anchorAxis(anchor);
      if (!this.anchorFacesPoint(anchor, other) || !this.isNearStraightAxis(other, endpoint, axis)) {
        return null;
      }
      this.writeConnectorPoints(el, atStart ? [endpoint, other] : [other, endpoint]);
      return endpoint;
    }

    enforceEndpointApproach(el, anchor, atStart = false) {
      let points = this.connectorPoints(el);
      if (points.length < 2) return null;
      if (atStart) points.reverse();
      const base = points.slice(0, -1);
      // Rebuild the final corner instead of keeping a bend that approached the
      // old endpoint from the wrong side (the source of downward arrowheads on
      // a right-side connection).
      if (base.length > 1) base.pop();
      points = this.appendAnchoredEndpoint(base, anchor);
      if (atStart) points.reverse();
      this.writeConnectorPoints(el, points);
      return atStart ? points[0] : points[points.length - 1];
    }

    snapOrthogonalConnectorToAnchor(el, anchor, atStart = false, originalPoints = null) {
      if (!anchor) return null;
      const current = this.connectorPoints(el);
      const baseline =
        Array.isArray(originalPoints) && originalPoints.length >= 2 ? originalPoints : current;
      if (baseline.length < 2) return null;
      // Connecting to a shape must never insert vertices. If this drag already
      // grew the route, fall back to the geometry from pointer-down.
      const source = current.length > baseline.length ? baseline : current;
      const next = source.map((point) => ({ x: point.x, y: point.y }));
      const index = atStart ? 0 : next.length - 1;
      next[index] = { x: anchor.x, y: anchor.y };
      this.writeConnectorPoints(el, next);
      this.resetArrowheadRotation(el, atStart ? "marker-start" : "marker-end");
      return next[index];
    }

    createOrthogonalModel(el, draggedIndex) {
      const points = this.connectorPoints(el);
      if (points.length < 2) return null;
      const dragIndex = draggedIndex;
      const orientations = points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        return Math.abs(next.x - point.x) >= Math.abs(next.y - point.y) ? "h" : "v";
      });

      const buildGroups = (axis) => {
        const parent = points.map((_, index) => index);
        const find = (index) => {
          while (parent[index] !== index) {
            parent[index] = parent[parent[index]];
            index = parent[index];
          }
          return index;
        };
        const union = (a, b) => {
          const ra = find(a);
          const rb = find(b);
          if (ra !== rb) parent[rb] = ra;
        };
        orientations.forEach((orientation, index) => {
          if ((axis === "x" && orientation === "v") || (axis === "y" && orientation === "h")) {
            union(index, index + 1);
          }
        });
        const groups = new Map();
        points.forEach((_, index) => {
          const root = find(index);
          if (!groups.has(root)) groups.set(root, []);
          groups.get(root).push(index);
        });
        return [...groups.values()];
      };

      return {
        el,
        points: points.map((point) => ({ ...point })),
        dragIndex,
        xGroups: buildGroups("x"),
        yGroups: buildGroups("y"),
      };
    }

    applyOrthogonalDrag(model, x, y) {
      const points = model.points.map((point) => ({ ...point }));
      const lastIndex = points.length - 1;
      const applyGroups = (groups, axis, requested) => {
        groups.forEach((members) => {
          const fixedEndpoint = members.find(
            (index) => (index === 0 || index === lastIndex) && index !== model.dragIndex
          );
          let value;
          if (fixedEndpoint !== undefined) value = model.points[fixedEndpoint][axis];
          else if (members.includes(model.dragIndex)) value = requested;
          else value = model.points[members[0]][axis];
          members.forEach((index) => {
            points[index][axis] = value;
          });
        });
      };
      applyGroups(model.xGroups, "x", x);
      applyGroups(model.yGroups, "y", y);
      this.writeConnectorPoints(model.el, this.simplifyOrthogonalPoints(points));
      return points[model.dragIndex];
    }

    rangesNear(a1, a2, b1, b2, padding) {
      return a1 <= b2 + padding && b1 <= a2 + padding;
    }

    horizontalSpacingCandidates(moving, targets, threshold, scale) {
      const candidates = [];
      const row = targets.filter((target) =>
        this.rangesNear(moving.top, moving.bottom, target.top, target.bottom, threshold * 2)
      );
      const left = row
        .filter((target) => target.right <= moving.left + threshold)
        .sort((a, b) => b.right - a.right);
      const right = row
        .filter((target) => target.left >= moving.right - threshold)
        .sort((a, b) => a.left - b.left);

      const makeCandidate = (targetLeft, boxes, segments, distance) => {
        const delta = targetLeft - moving.left;
        if (Math.abs(delta) > threshold || distance < 0) return;
        const cross = Math.min(moving.top, ...boxes.map((box) => box.top)) - 12 * scale;
        candidates.push({
          delta,
          priority: 0,
          guides: segments.map(([start, end]) => ({
            kind: "gap",
            axis: "x",
            start,
            end,
            cross,
            distance,
          })),
        });
      };

      if (left[0] && right[0]) {
        const targetLeft = (left[0].right + right[0].left - moving.width) / 2;
        const distance = targetLeft - left[0].right;
        makeCandidate(
          targetLeft,
          [left[0], right[0]],
          [
            [left[0].right, targetLeft],
            [targetLeft + moving.width, right[0].left],
          ],
          distance
        );
      }

      if (left[0]) {
        const far = left.slice(1).find((target) => target.right <= left[0].left);
        if (far) {
          const distance = left[0].left - far.right;
          const targetLeft = left[0].right + distance;
          makeCandidate(
            targetLeft,
            [far, left[0]],
            [
              [far.right, left[0].left],
              [left[0].right, targetLeft],
            ],
            distance
          );
        }
      }

      if (right[0]) {
        const far = right.slice(1).find((target) => target.left >= right[0].right);
        if (far) {
          const distance = far.left - right[0].right;
          const targetLeft = right[0].left - distance - moving.width;
          makeCandidate(
            targetLeft,
            [right[0], far],
            [
              [targetLeft + moving.width, right[0].left],
              [right[0].right, far.left],
            ],
            distance
          );
        }
      }
      return candidates;
    }

    verticalSpacingCandidates(moving, targets, threshold, scale) {
      const candidates = [];
      const column = targets.filter((target) =>
        this.rangesNear(moving.left, moving.right, target.left, target.right, threshold * 2)
      );
      const above = column
        .filter((target) => target.bottom <= moving.top + threshold)
        .sort((a, b) => b.bottom - a.bottom);
      const below = column
        .filter((target) => target.top >= moving.bottom - threshold)
        .sort((a, b) => a.top - b.top);

      const makeCandidate = (targetTop, boxes, segments, distance) => {
        const delta = targetTop - moving.top;
        if (Math.abs(delta) > threshold || distance < 0) return;
        const cross = Math.min(moving.left, ...boxes.map((box) => box.left)) - 12 * scale;
        candidates.push({
          delta,
          priority: 0,
          guides: segments.map(([start, end]) => ({
            kind: "gap",
            axis: "y",
            start,
            end,
            cross,
            distance,
          })),
        });
      };

      if (above[0] && below[0]) {
        const targetTop = (above[0].bottom + below[0].top - moving.height) / 2;
        const distance = targetTop - above[0].bottom;
        makeCandidate(
          targetTop,
          [above[0], below[0]],
          [
            [above[0].bottom, targetTop],
            [targetTop + moving.height, below[0].top],
          ],
          distance
        );
      }

      if (above[0]) {
        const far = above.slice(1).find((target) => target.bottom <= above[0].top);
        if (far) {
          const distance = above[0].top - far.bottom;
          const targetTop = above[0].bottom + distance;
          makeCandidate(
            targetTop,
            [far, above[0]],
            [
              [far.bottom, above[0].top],
              [above[0].bottom, targetTop],
            ],
            distance
          );
        }
      }

      if (below[0]) {
        const far = below.slice(1).find((target) => target.top >= below[0].bottom);
        if (far) {
          const distance = far.top - below[0].bottom;
          const targetTop = below[0].top - distance - moving.height;
          makeCandidate(
            targetTop,
            [below[0], far],
            [
              [targetTop + moving.height, below[0].top],
              [below[0].bottom, far.top],
            ],
            distance
          );
        }
      }
      return candidates;
    }

    smartSnap(items, targets, spacingTags, bypass) {
      if (bypass || !$("smart-toggle").checked || !targets.length) {
        return { dx: 0, dy: 0, guides: [] };
      }
      const moving = this.boundsOf(items);
      if (!moving) return { dx: 0, dy: 0, guides: [] };
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const threshold = Math.max(2, 7 * scale);
      let bestAlignX = null;
      let bestAlignY = null;
      const movingX = [moving.left, moving.cx, moving.right];
      const movingY = [moving.top, moving.cy, moving.bottom];

      targets.forEach((target) => {
        const targetX = [target.left, target.cx, target.right];
        const targetY = [target.top, target.cy, target.bottom];
        movingX.forEach((from) => {
          targetX.forEach((to) => {
            const delta = to - from;
            if (
              Math.abs(delta) <= threshold &&
              (!bestAlignX || Math.abs(delta) < Math.abs(bestAlignX.delta))
            ) {
              bestAlignX = {
                delta,
                priority: 1,
                guides: [{
                  kind: "align",
                  axis: "x",
                  value: to,
                  start: Math.min(moving.top, target.top) - 6 * scale,
                  end: Math.max(moving.bottom, target.bottom) + 6 * scale,
                }],
              };
            }
          });
        });
        movingY.forEach((from) => {
          targetY.forEach((to) => {
            const delta = to - from;
            if (
              Math.abs(delta) <= threshold &&
              (!bestAlignY || Math.abs(delta) < Math.abs(bestAlignY.delta))
            ) {
              bestAlignY = {
                delta,
                priority: 1,
                guides: [{
                  kind: "align",
                  axis: "y",
                  value: to,
                  start: Math.min(moving.left, target.left) - 6 * scale,
                  end: Math.max(moving.right, target.right) + 6 * scale,
                }],
              };
            }
          });
        });
      });

      const spacingTargets = spacingTags.size
        ? targets.filter((target) => spacingTags.has(target.tag))
        : targets;
      const xCandidates = bestAlignX ? [bestAlignX] : [];
      const yCandidates = bestAlignY ? [bestAlignY] : [];
      xCandidates.push(...this.horizontalSpacingCandidates(moving, spacingTargets, threshold, scale));
      yCandidates.push(...this.verticalSpacingCandidates(moving, spacingTargets, threshold, scale));

      const score = (candidate) =>
        Math.abs(candidate.delta) - (candidate.priority === 0 ? 2 * scale : 0);
      const choose = (candidates) =>
        candidates.sort((a, b) => score(a) - score(b) || a.priority - b.priority)[0] || null;
      const bestX = choose(xCandidates);
      const bestY = choose(yCandidates);
      return {
        dx: bestX ? bestX.delta : 0,
        dy: bestY ? bestY.delta : 0,
        guides: [...(bestX ? bestX.guides : []), ...(bestY ? bestY.guides : [])],
      };
    }

    drawSmartGuides(guides) {
      if (!guides.length) return;
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const addLine = (x1, y1, x2, y2, extraClass = "") => {
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("class", `smart-guide ${extraClass}`.trim());
        overlay.appendChild(line);
      };

      guides.forEach((guide) => {
        if (guide.kind === "align") {
          const extraClass = guide.endpoint ? "endpoint-align" : "";
          if (guide.axis === "x") addLine(guide.value, guide.start, guide.value, guide.end, extraClass);
          else addLine(guide.start, guide.value, guide.end, guide.value, extraClass);
          if (guide.label) {
            const label = document.createElementNS(NS, "text");
            label.setAttribute("class", `smart-guide-label${guide.endpoint ? " endpoint" : ""}`);
            label.setAttribute("font-size", 11 * scale);
            label.setAttribute("x", guide.axis === "x" ? guide.value + 7 * scale : (guide.start + guide.end) / 2);
            label.setAttribute("y", guide.axis === "x" ? (guide.start + guide.end) / 2 : guide.value - 7 * scale);
            label.setAttribute("text-anchor", guide.axis === "x" ? "start" : "middle");
            label.textContent = guide.label;
            overlay.appendChild(label);
          }
          return;
        }

        if (guide.kind === "size") {
          const tick = 4 * scale;
          if (guide.matchLine) {
            addLine(
              guide.matchLine.x1,
              guide.matchLine.y1,
              guide.matchLine.x2,
              guide.matchLine.y2,
              "size-match"
            );
          }
          guide.segments.forEach((segment) => {
            if (guide.axis === "x") {
              addLine(segment.start, segment.cross, segment.end, segment.cross, "size");
              addLine(segment.start, segment.cross - tick, segment.start, segment.cross + tick, "size");
              addLine(segment.end, segment.cross - tick, segment.end, segment.cross + tick, "size");
            } else {
              addLine(segment.cross, segment.start, segment.cross, segment.end, "size");
              addLine(segment.cross - tick, segment.start, segment.cross + tick, segment.start, "size");
              addLine(segment.cross - tick, segment.end, segment.cross + tick, segment.end, "size");
            }
          });
          const moving = guide.segments[0];
          const label = document.createElementNS(NS, "text");
          label.setAttribute("class", "smart-guide-label size");
          label.setAttribute("font-size", 11 * scale);
          label.setAttribute(
            "x",
            guide.axis === "x" ? (moving.start + moving.end) / 2 : moving.cross - 8 * scale
          );
          label.setAttribute(
            "y",
            guide.axis === "x" ? moving.cross - 8 * scale : (moving.start + moving.end) / 2
          );
          label.setAttribute("text-anchor", guide.axis === "x" ? "middle" : "end");
          label.textContent = guide.label;
          overlay.appendChild(label);
          return;
        }

        if (guide.kind === "dimension") {
          const tick = 4 * scale;
          if (guide.axis === "x") {
            addLine(guide.start, guide.cross, guide.end, guide.cross, "dimension");
            addLine(guide.start, guide.cross - tick, guide.start, guide.cross + tick, "dimension");
            addLine(guide.end, guide.cross - tick, guide.end, guide.cross + tick, "dimension");
          } else {
            addLine(guide.cross, guide.start, guide.cross, guide.end, "dimension");
            addLine(guide.cross - tick, guide.start, guide.cross + tick, guide.start, "dimension");
            addLine(guide.cross - tick, guide.end, guide.cross + tick, guide.end, "dimension");
          }
          const label = document.createElementNS(NS, "text");
          label.setAttribute("class", "smart-guide-label dimension");
          label.setAttribute("font-size", 11 * scale);
          label.setAttribute(
            "x",
            guide.axis === "x"
              ? (guide.start + guide.end) / 2
              : guide.align === "start"
                ? guide.cross + 8 * scale
                : guide.cross - 8 * scale
          );
          label.setAttribute(
            "y",
            guide.axis === "x" ? guide.cross - 8 * scale : (guide.start + guide.end) / 2
          );
          label.setAttribute(
            "text-anchor",
            guide.axis === "x" ? "middle" : guide.align === "start" ? "start" : "end"
          );
          label.textContent = guide.label;
          overlay.appendChild(label);
          return;
        }

        const tick = 4 * scale;
        if (guide.axis === "x") {
          addLine(guide.start, guide.cross, guide.end, guide.cross, "distance");
          addLine(guide.start, guide.cross - tick, guide.start, guide.cross + tick, "distance");
          addLine(guide.end, guide.cross - tick, guide.end, guide.cross + tick, "distance");
        } else {
          addLine(guide.cross, guide.start, guide.cross, guide.end, "distance");
          addLine(guide.cross - tick, guide.start, guide.cross + tick, guide.start, "distance");
          addLine(guide.cross - tick, guide.end, guide.cross + tick, guide.end, "distance");
        }
        const label = document.createElementNS(NS, "text");
        label.setAttribute("class", "smart-guide-label");
        label.setAttribute("font-size", 11 * scale);
        label.setAttribute("x", guide.axis === "x" ? (guide.start + guide.end) / 2 : guide.cross - 8 * scale);
        label.setAttribute("y", guide.axis === "x" ? guide.cross - 8 * scale : (guide.start + guide.end) / 2);
        label.setAttribute("text-anchor", guide.axis === "x" ? "middle" : "end");
        label.textContent = String(Math.round(guide.distance * 10) / 10);
        overlay.appendChild(label);
      });
    }

    drawConnectionAnchor(anchor, candidate = false) {
      if (!anchor) return;
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", anchor.x);
      ring.setAttribute("cy", anchor.y);
      ring.setAttribute("r", (candidate ? 4 : 6) * scale);
      ring.setAttribute(
        "class",
        candidate ? "connection-anchor connection-anchor-candidate" : "connection-anchor"
      );
      overlay.appendChild(ring);
      if (candidate) return;
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", anchor.x);
      dot.setAttribute("cy", anchor.y);
      dot.setAttribute("r", 2 * scale);
      dot.setAttribute("class", "connection-anchor connection-anchor-dot");
      overlay.appendChild(dot);
    }

    drawAllConnectionAnchors() {
      if (!this.connectionAnchorsVisible) return;
      this.collectConnectionAnchors().forEach((anchor) =>
        this.drawConnectionAnchor(anchor, true)
      );
    }

    createFlowShapeElement(kind) {
      const tag = kind === "ellipse"
        ? "ellipse"
        : kind === "diamond" || kind === "parallelogram"
          ? "polygon"
          : "rect";
      const el = document.createElementNS(NS, tag);
      const fills = {
        rect: "#d8e8c8",
        rounded: "#f3d5b5",
        ellipse: "#d7e7f3",
        diamond: "#f7e2a8",
        parallelogram: "#e6dcf2",
        terminator: "#cfe8df",
      };
      el.setAttribute("data-flow-shape", kind);
      el.setAttribute("fill", fills[kind] || fills.rect);
      el.setAttribute("stroke", "#c88b61");
      el.setAttribute("stroke-width", "1.8");
      el.setAttribute("stroke-linejoin", "round");
      el.setAttribute("data-ed-id", uid());
      return el;
    }

    updateFlowShapeGeometry(el, kind, x, y, width, height) {
      const w = Math.max(8, width);
      const h = Math.max(8, height);
      el.setAttribute("data-flow-shape", kind);
      el.setAttribute("data-shape-x", x);
      el.setAttribute("data-shape-y", y);
      el.setAttribute("data-shape-width", w);
      el.setAttribute("data-shape-height", h);
      const tag = el.tagName.toLowerCase();
      if (tag === "ellipse") {
        el.setAttribute("cx", x + w / 2);
        el.setAttribute("cy", y + h / 2);
        el.setAttribute("rx", w / 2);
        el.setAttribute("ry", h / 2);
      } else if (tag === "polygon") {
        const points = kind === "diamond"
          ? [
              [x + w / 2, y],
              [x + w, y + h / 2],
              [x + w / 2, y + h],
              [x, y + h / 2],
            ]
          : (() => {
              const skew = Math.min(w * 0.2, h * 0.55);
              return [
                [x + skew, y],
                [x + w, y],
                [x + w - skew, y + h],
                [x, y + h],
              ];
            })();
        el.setAttribute("points", points.map((point) => point.join(",")).join(" "));
      } else {
        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("width", w);
        el.setAttribute("height", h);
        const radius = kind === "terminator"
          ? h / 2
          : kind === "rounded"
            ? Math.min(14, w / 4, h / 4)
            : 0;
        el.setAttribute("rx", radius);
        el.setAttribute("ry", radius);
      }
    }

    isBoxResizeKind(kind) {
      return kind === "rect" || kind === "shape" || kind === "text";
    }

    addBoxResizeHandles(el, box, kind) {
      const points = [
        [box.left, box.top, "nw"],
        [box.cx, box.top, "n"],
        [box.right, box.top, "ne"],
        [box.right, box.cy, "e"],
        [box.right, box.bottom, "se"],
        [box.cx, box.bottom, "s"],
        [box.left, box.bottom, "sw"],
        [box.left, box.cy, "w"],
      ];
      points.forEach(([x, y, pos]) => this.addHandle(x, y, { kind, el, pos }));
    }

    resizeCursor(pos) {
      if (pos === "n" || pos === "s") return "ns-resize";
      if (pos === "e" || pos === "w") return "ew-resize";
      if (pos === "nw" || pos === "se") return "nwse-resize";
      if (pos === "ne" || pos === "sw") return "nesw-resize";
      return "move";
    }

    select(els, additive) {
      const next = els.filter(Boolean);
      if (additive) {
        next.forEach((el) => {
          const i = this.selected.indexOf(el);
          if (i >= 0) this.selected.splice(i, 1);
          else this.selected.push(el);
        });
      } else {
        this.selected = next;
      }
      this.redrawOverlay();
      this.updateProps();
    }

    redrawOverlay() {
      overlay.replaceChildren();
      this.overlayHandlePoints = [];
      const rotatable = [];
      this.selected.forEach((el) => {
        if (!el.isConnected) return;
        let selectionBox = null;
        try {
          const b = el.getBBox();
          selectionBox = { x: b.x, y: b.y, width: b.width, height: b.height };
          const box = document.createElementNS(NS, "rect");
          box.setAttribute("x", b.x - 2);
          box.setAttribute("y", b.y - 2);
          box.setAttribute("width", b.width + 4);
          box.setAttribute("height", b.height + 4);
          box.setAttribute("class", "sel-box");
          overlay.appendChild(box);
        } catch (_) {
          /* ignore */
        }
        const tag = el.tagName.toLowerCase();
        if (el.hasAttribute("data-flow-shape")) {
          const shapeBox = this.elementBox(el);
          if (shapeBox) this.addBoxResizeHandles(el, shapeBox, "shape");
        } else if (tag === "line") {
          this.addHandle(num(el, "x1"), num(el, "y1"), { kind: "line", el, end: 1, endpoint: true });
          this.addHandle(num(el, "x2"), num(el, "y2"), { kind: "line", el, end: 2, endpoint: true });
        } else if (tag === "path") {
          const vertices = pathVertices(el.getAttribute("d") || "").verts;
          const connector = hasArrowMarker(el);
          const controls = this.connectorRouteControls(el);
          if (controls.length && vertices.length >= 2) {
            [0, vertices.length - 1].forEach((i) => {
              const v = vertices[i];
              this.addHandle(v.x, v.y, {
                kind: "path",
                el,
                index: i,
                vertexIndex: i,
                vertex: v,
                atStart: i === 0,
                atEnd: i === vertices.length - 1,
                endpoint: isLineLikeConnector(el),
              });
            });
            const points = this.connectorPoints(el);
            controls.forEach((control, controlIndex) => {
              const start = points[control.startIndex];
              const end = points[control.endIndex];
              if (!start || !end) return;
              this.addHandle((start.x + end.x) / 2, (start.y + end.y) / 2, {
                kind: "route-control",
                el,
                controlIndex,
                axis: control.axis,
              });
            });
          } else {
            vertices.forEach((v, i) => {
              this.addHandle(v.x, v.y, {
                kind: "path",
                el,
                index: i,
                vertexIndex: i,
                vertex: v,
                orthogonal: connector && el.getAttribute("data-routing") === "orthogonal",
                atStart: i === 0,
                atEnd: i === vertices.length - 1,
                endpoint: connector && (i === 0 || i === vertices.length - 1),
              });
            });
          }
        } else if (tag === "polyline" || tag === "polygon") {
          const pts = (el.getAttribute("points") || "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
          const connector = tag === "polyline" && hasArrowMarker(el);
          for (let i = 0; i + 1 < pts.length; i += 2) {
            this.addHandle(pts[i], pts[i + 1], {
              kind: "poly",
              el,
              index: i,
              vertexIndex: i / 2,
              orthogonal: connector && el.getAttribute("data-routing") === "orthogonal",
              atStart: i === 0,
              atEnd: i === pts.length - 2,
              endpoint: connector && (i === 0 || i === pts.length - 2),
            });
          }
        } else if (tag === "rect") {
          const rectBox = this.elementBox(el);
          if (rectBox) this.addBoxResizeHandles(el, rectBox, "rect");
        } else if (tag === "text" && !el.hasAttribute("data-line-label-for")) {
          const groupedWithShape = this.componentMembers(el).some(
            (item) => item !== el && isConnectableShape(item) && this.selected.includes(item)
          );
          if (!groupedWithShape) {
            const textBox = this.elementBox(el);
            if (textBox) this.addBoxResizeHandles(el, textBox, "text");
          }
        }
        if (selectionBox && hasArrowMarker(el)) {
          rotatable.push({ el, box: selectionBox });
        }
      });
      // The rotate buttons go last so they can be pushed away from every vertex
      // handle that is already on the overlay.
      rotatable.forEach(({ el, box }) => this.addConnectorRotateHandle(el, box));
      this.drawAllConnectionAnchors();
    }

    connectorRotateHandlePosition(box, radius) {
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const gap = 16 * scale;
      const clearance = radius + HANDLE_RADIUS + 4 * scale;
      const minX = this.view.x + radius + 2 * scale;
      const maxX = this.view.x + this.view.w - radius - 2 * scale;
      const minY = this.view.y + radius + 2 * scale;
      const maxY = this.view.y + this.view.h - radius - 2 * scale;
      const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));
      const right = box.x + box.width + gap;
      const left = box.x - gap;
      const above = box.y - gap;
      const below = box.y + box.height + gap;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const candidates = [
        { x: right, y: above },
        { x: right, y: centerY },
        { x: right, y: below },
        { x: centerX, y: below },
        { x: left, y: below },
        { x: left, y: centerY },
        { x: left, y: above },
        { x: centerX, y: above },
      ];
      let fallback = null;
      for (const candidate of candidates) {
        const point = {
          x: clamp(candidate.x, minX, maxX),
          y: clamp(candidate.y, minY, maxY),
        };
        const distance = this.overlayHandlePoints.reduce(
          (closest, handle) =>
            Math.min(closest, Math.hypot(point.x - handle.x, point.y - handle.y)),
          Infinity
        );
        if (distance >= clearance) return point;
        if (!fallback || distance > fallback.distance) fallback = { ...point, distance };
      }
      return fallback ? { x: fallback.x, y: fallback.y } : { x: minX, y: minY };
    }

    addConnectorRotateHandle(el, box) {
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const radius = 10 * scale;
      // Pressing this button rotates immediately, so it must never come to rest
      // on a vertex handle or it swallows endpoint and bend drags.
      const { x, y } = this.connectorRotateHandlePosition(box, radius);
      this.overlayHandlePoints.push({ x, y });
      const data = { kind: "rotate", el };
      const group = document.createElementNS(NS, "g");
      group.setAttribute("class", "connector-rotate-handle");
      group.setAttribute("role", "button");
      group.setAttribute("aria-label", "顺时针旋转箭头头部90度");
      group._ed = data;
      const circle = document.createElementNS(NS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", radius);
      circle.setAttribute("class", "connector-rotate-bg");
      circle._ed = data;
      const icon = document.createElementNS(NS, "text");
      icon.setAttribute("x", x);
      icon.setAttribute("y", y + 0.5 * scale);
      icon.setAttribute("class", "connector-rotate-icon");
      icon.setAttribute("font-size", 16 * scale);
      icon.setAttribute("text-anchor", "middle");
      icon.setAttribute("dominant-baseline", "central");
      icon.textContent = "↻";
      icon._ed = data;
      const title = document.createElementNS(NS, "title");
      title.textContent = "顺时针旋转箭头头部 90°";
      group.appendChild(title);
      group.appendChild(circle);
      group.appendChild(icon);
      overlay.appendChild(group);
    }

    addHandle(x, y, data) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", HANDLE_RADIUS);
      const preview = data.kind === "preview";
      const resize = this.isBoxResizeKind(data.kind);
      const routeControl = data.kind === "route-control";
      c.setAttribute(
        "class",
        preview
          ? "handle vertex preview-handle"
          : resize
            ? `handle vertex resize-handle resize-${data.pos}`
            : routeControl
              ? `handle vertex route-control route-control-${data.axis}`
              : "handle vertex"
      );
      if (preview) {
        // Preview dots are visual feedback only. Previously they accumulated on
        // every pointermove and intercepted the next click, producing the trail
        // of circles and the apparently random polyline shown in the report.
        c.setAttribute("pointer-events", "none");
      } else {
        c._ed = data;
        this.overlayHandlePoints.push({ x, y });
      }
      overlay.appendChild(c);
    }

    clearPreview() {
      overlay
        .querySelectorAll(
          ".preview-line, .preview-handle, .marquee, .connection-anchor, .smart-guide, .smart-guide-label"
        )
        .forEach((n) => n.remove());
    }

    hitHandle(target) {
      return target && target._ed ? target : null;
    }

    clearNativeSelection() {
      const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    }

    dragThresholdPassed(drag, event, threshold = TEXT_DRAG_THRESHOLD) {
      if (!drag.pending) return true;
      const start = drag.clientStart || { x: event.clientX, y: event.clientY };
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < threshold) return false;
      drag.pending = false;
      return true;
    }

    onPointerDown(e) {
      if (this.eyedropper) {
        this.handleEyedropperPointerDown(e);
        return;
      }
      if (e.button !== 0) return;
      if (e.target === textInput || textInput.contains(e.target)) return;
      this.clearNativeSelection();
      this.closeTextColorMenu();
      $("export-menu").classList.add("hidden");
      $("btn-export").setAttribute("aria-expanded", "false");
      this.closeToolbarMenus();
      this.closeSymbolMenu();
      if (this.editingText) this.commitTextEdit();
      const p = clientToSvg(e);
      const handle = this.hitHandle(e.target);
      const pan = this.tool === "pan" || this.space || e.button === 1;
      if (pan) {
        this.drag = { type: "pan", x: e.clientX, y: e.clientY, view: { ...this.view } };
        viewport.classList.add("down");
        return;
      }

      if (handle) {
        const data = handle._ed;
        if (data.kind === "rotate") {
          e.preventDefault();
          e.stopPropagation();
          this.rotateArrowheadClockwise(data.el);
          return;
        }
        this.drag = {
          type: "handle",
          data,
          start: p,
          anchors: data.endpoint ? this.collectConnectionAnchors([data.el]) : [],
          endpointTargets: data.endpoint ? this.collectArrowEndpoints([data.el]) : [],
          resizeTargets: this.isBoxResizeKind(data.kind)
            ? this.collectResizeTargets(data.el)
            : [],
          resizeOrigin: this.isBoxResizeKind(data.kind)
            ? this.resizeOriginBox(data.el)
            : null,
          routeTargets: data.kind === "route-control"
            ? this.connectorRouteSnapTargets(data.el)
            : [],
          originalConnectorPoints:
            data.endpoint && data.el && isConnectorElement(data.el)
              ? this.connectorPoints(data.el).map((point) => ({ x: point.x, y: point.y }))
              : null,
          orthogonalModel: data.orthogonal
            ? this.createOrthogonalModel(data.el, data.vertexIndex)
            : null,
        };
        if (this.isBoxResizeKind(data.kind)) {
          viewport.style.cursor = this.resizeCursor(data.pos);
        } else if (data.kind === "route-control") {
          viewport.style.cursor = data.axis === "vertical" ? "ew-resize" : "ns-resize";
        }
        this.connectionAnchorsVisible = true;
        this.redrawOverlay();
        this._before = this.serialize();
        return;
      }

      if (this.tool === "text") {
        this.createText(p);
        return;
      }
      if (this.tool === "shape") {
        this.drag = { type: "create-shape", start: p, kind: this.shapeKind, el: null };
        this.connectionAnchorsVisible = true;
        this.redrawOverlay();
        this._before = this.serialize();
        return;
      }
      if (this.tool === "arrow") {
        const anchors = this.collectConnectionAnchors();
        const endpointTargets = this.collectArrowEndpoints();
        const start = this.snapConnectorEndpoint(
          this.snap(p.x),
          this.snap(p.y),
          anchors,
          endpointTargets,
          e.altKey
        );
        this.drag = {
          type: "create-arrow",
          start: { x: start.x, y: start.y },
          startAnchor: start.anchor,
          mode: this.arrowMode,
          anchors,
          endpointTargets,
          el: null,
        };
        this.connectionAnchorsVisible = true;
        this.redrawOverlay();
        this._before = this.serialize();
        return;
      }
      if (this.tool === "polyline") {
        this.addPolyPoint(p, e.altKey);
        return;
      }

      const el = graphicFromTarget(e.target, this.docBox);
      if (el) {
        if (
          this.tool === "select" &&
          !e.shiftKey &&
          el.tagName.toLowerCase() === "text" &&
          el.hasAttribute("data-line-label-for")
        ) {
          const connector = this.connectorForLabel(el);
          if (connector) {
            this.select([el], false);
            this.drag = {
              type: "connector-label",
              label: el,
              connector,
              pending: true,
              moved: false,
              clientStart: { x: e.clientX, y: e.clientY },
            };
            this._before = this.serialize();
            return;
          }
        }
        const groupSelection = this.expandSelection(el);
        const alreadySelected = groupSelection.some((item) => this.selected.includes(item));
        if (!alreadySelected && !e.shiftKey) this.select(groupSelection, false);
        else if (e.shiftKey) this.select(groupSelection, true);
        const movers = new Set(this.collectMoveItems(this.selected));
        const textClick = el.tagName.toLowerCase() === "text";
        this.drag = {
          type: "move",
          start: p,
          last: p,
          clientStart: { x: e.clientX, y: e.clientY },
          pending: textClick,
          textClick,
          moved: false,
          items: [...movers],
          snapItems: [...this.selected],
          targets: this.collectSmartTargets(movers),
          spacingTags: new Set(this.selected.map((item) => item.tagName.toLowerCase())),
        };
        this.connectionAnchorsVisible = !textClick;
        this.redrawOverlay();
        this._before = this.serialize();
        return;
      }

      if (!e.shiftKey) this.select([], false);
      this.drag = { type: "marquee", start: p };
    }

    onPointerMove(e) {
      if (this.eyedropper) {
        this.updateEyedropperLoupe(e);
        return;
      }
      if (this.scrollDrag) {
        this.moveScrollbar(e);
        return;
      }
      if (!this.drag) {
        if (this.tool === "polyline" && this.polyPoints.length) {
          const cursor = clientToSvg(e);
          const snapped = this.snapConnectorEndpoint(
            this.snap(cursor.x),
            this.snap(cursor.y),
            this.polyConnectionAnchors,
            this.polyEndpointTargets,
            e.altKey
          );
          this.drawPolyPreview(
            { x: snapped.x, y: snapped.y },
            snapped.anchor,
            snapped.guides || []
          );
        }
        return;
      }
      const p = clientToSvg(e);
      const d = this.drag;
      if (d.type === "pan") {
        const ctm = canvas.getScreenCTM();
        const sx = this.view.w / (ctm.a * canvas.clientWidth || this.view.w);
        const dx = (d.x - e.clientX) * (this.view.w / viewport.clientWidth);
        const dy = (d.y - e.clientY) * (this.view.h / viewport.clientHeight);
        this.view = { ...d.view, x: d.view.x + dx, y: d.view.y + dy };
        this.applyView();
        return;
      }
      if (d.type === "connector-label") {
        if (!this.dragThresholdPassed(d, e)) return;
        viewport.classList.add("line-label-dragging");
        const projected = this.projectPointToConnector(d.connector, p);
        if (projected) {
          const previous = parseFloat(d.label.getAttribute("data-line-position"));
          d.label.setAttribute("data-line-position", projected.ratio);
          if (!Number.isFinite(previous) || Math.abs(previous - projected.ratio) > 0.0001) d.moved = true;
          this.updateConnectorLabel(d.connector, d.label);
          $("prop-line-label-position").value = String(Math.round(projected.ratio * 100));
          $("prop-line-label-position-value").textContent = Math.round(projected.ratio * 100) + "%";
          this.redrawOverlay();
        }
        return;
      }
      if (d.type === "move") {
        if (!this.dragThresholdPassed(d, e)) return;
        if (d.textClick && !this.connectionAnchorsVisible) {
          this.connectionAnchorsVisible = true;
          this.redrawOverlay();
        }
        const dx = this.snap(p.x) - this.snap(d.last.x);
        const dy = this.snap(p.y) - this.snap(d.last.y);
        if (dx || dy) {
          d.moved = true;
          this.moveSet(d.items, dx, dy);
          const smart = this.smartSnap(d.snapItems, d.targets, d.spacingTags, e.altKey);
          if (smart.dx || smart.dy) this.moveSet(d.items, smart.dx, smart.dy);
          this.reflowGluedConnectors(d.items);
          this.syncConnectorLabels();
          // Include the magnetic correction in the drag origin. This lets the
          // pointer naturally break away once it travels beyond the threshold.
          d.last = {
            x: d.last.x + dx + smart.dx,
            y: d.last.y + dy + smart.dy,
          };
          this.redrawOverlay();
          this.drawSmartGuides(smart.guides);
          this.syncPositionSizeProps();
        }
        return;
      }
      if (d.type === "handle") {
        let x = this.snap(p.x);
        let y = this.snap(p.y);
        const data = d.data;
        let resizeGuides = [];
        let routeGuides = [];
        const endpoint = data.endpoint
          ? this.snapConnectorEndpoint(x, y, d.anchors, d.endpointTargets, e.altKey)
          : { x, y, anchor: null, guides: [] };
        x = endpoint.x;
        y = endpoint.y;
        if (data.endpoint && (data.atStart || data.atEnd) && !d.orthogonalModel) {
          const constrained = this.constrainExistingStraightEndpoint(data.el, data.atStart, x, y);
          x = constrained.x;
          y = constrained.y;
          if (
            endpoint.anchor &&
            Math.hypot(x - endpoint.anchor.x, y - endpoint.anchor.y) > 0.01
          ) {
            endpoint.anchor = null;
          }
        }
        if (
          data.endpoint &&
          endpoint.anchor &&
          (data.atStart || data.atEnd) &&
          data.kind !== "line" &&
          data.kind !== "route-control"
        ) {
          this.snapOrthogonalConnectorToAnchor(
            data.el,
            endpoint.anchor,
            data.atStart,
            d.originalConnectorPoints
          );
          if (data.kind === "path" && data.vertex) {
            const verts = pathVertices(data.el.getAttribute("d") || "").verts;
            const fresh = verts[data.atStart ? 0 : verts.length - 1] || verts[data.index];
            if (fresh) {
              data.vertex = fresh;
              data.index = data.atStart ? 0 : verts.length - 1;
              data.vertexIndex = data.index;
            }
          }
        } else if (d.orthogonalModel) {
          const actual = this.applyOrthogonalDrag(d.orthogonalModel, x, y);
          if (
            endpoint.anchor &&
            actual &&
            Math.hypot(actual.x - endpoint.anchor.x, actual.y - endpoint.anchor.y) > 0.01
          ) {
            endpoint.anchor = null;
          }
        } else if (data.kind === "route-control") {
          const routeSnap = this.snapConnectorRouteControl(
            data.el,
            data.controlIndex,
            x,
            y,
            d.routeTargets,
            e.altKey
          );
          x = routeSnap.x;
          y = routeSnap.y;
          routeGuides = routeSnap.guides;
          this.moveConnectorRouteControl(data.el, data.controlIndex, x, y);
        } else if (data.kind === "line") {
          data.el.setAttribute("x" + data.end, x);
          data.el.setAttribute("y" + data.end, y);
        } else if (data.kind === "path") {
          if (
            data.endpoint &&
            this.connectorRouteControls(data.el).length
          ) {
            this.moveControlledConnectorEndpoint(data.el, data.atStart, x, y);
          } else {
            setPathVertex(data.el, data.vertex, x, y);
            const fresh = pathVertices(data.el.getAttribute("d") || "").verts[data.index];
            if (fresh) data.vertex = fresh;
          }
        } else if (data.kind === "poly") {
          const pts = (data.el.getAttribute("points") || "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
          pts[data.index] = x;
          pts[data.index + 1] = y;
          data.el.setAttribute("points", pts.join(" "));
        } else if (data.kind === "rect") {
          resizeGuides = this.resizeRect(
            data.el,
            data.pos,
            x,
            y,
            d.resizeTargets,
            e.altKey,
            e.ctrlKey || e.metaKey ? d.resizeOrigin : null
          );
        } else if (data.kind === "shape") {
          resizeGuides = this.resizeFlowShape(
            data.el,
            data.pos,
            x,
            y,
            d.resizeTargets,
            e.altKey,
            e.ctrlKey || e.metaKey ? d.resizeOrigin : null
          );
        } else if (data.kind === "text") {
          resizeGuides = this.resizeText(
            data.el,
            data.pos,
            x,
            y,
            d.resizeTargets,
            e.altKey,
            d.resizeOrigin
          );
        }
        if (data.endpoint) d.endpointAnchor = endpoint.anchor || null;
        if (data.kind === "rect" || data.kind === "shape") {
          this.reflowGluedConnectors([data.el]);
        }
        if (isConnectorElement(data.el)) this.syncConnectorLabels(data.el);
        this.redrawOverlay();
        this.drawSmartGuides([
          ...resizeGuides,
          ...routeGuides,
          ...(endpoint.guides || []),
          ...(this.isBoxResizeKind(data.kind) ? this.boxDimensionGuides(this.elementBox(data.el)) : []),
        ]);
        this.drawConnectionAnchor(endpoint.anchor);
        this.syncPositionSizeProps();
        return;
      }
      if (d.type === "create-shape") {
        let endX = p.x;
        let endY = p.y;
        if (e.shiftKey) {
          const size = Math.max(Math.abs(endX - d.start.x), Math.abs(endY - d.start.y));
          endX = d.start.x + Math.sign(endX - d.start.x || 1) * size;
          endY = d.start.y + Math.sign(endY - d.start.y || 1) * size;
        }
        const x = this.snap(Math.min(d.start.x, endX));
        const y = this.snap(Math.min(d.start.y, endY));
        const w = Math.max(8, this.snap(Math.abs(endX - d.start.x)));
        const h = Math.max(8, this.snap(Math.abs(endY - d.start.y)));
        if (!d.el) {
          d.el = this.createFlowShapeElement(d.kind);
          content.appendChild(d.el);
        }
        this.updateFlowShapeGeometry(d.el, d.kind, x, y, w, h);
        this.select([d.el], false);
        this.drawSmartGuides(this.boxDimensionGuides({
          left: x,
          top: y,
          right: x + w,
          bottom: y + h,
          width: w,
          height: h,
        }));
        this.syncPositionSizeProps();
        return;
      }
      if (d.type === "create-arrow") {
        if (!d.el) {
          this.ensureArrowMarker();
          d.el = document.createElementNS(NS, "path");
          d.el.setAttribute("stroke", "#b85f2a");
          d.el.setAttribute("stroke-width", "3");
          d.el.setAttribute("fill", "none");
          d.el.setAttribute("marker-end", "url(#arrow)");
          d.el.setAttribute("data-routing", "manual");
          d.el.setAttribute("data-arrow-mode", d.mode || "free");
          d.el.setAttribute("data-ed-id", uid());
          content.appendChild(d.el);
        }
        let endpoint = this.snapConnectorEndpoint(
          this.snap(p.x),
          this.snap(p.y),
          d.anchors,
          d.endpointTargets,
          e.altKey
        );
        endpoint = this.constrainStraightArrowEndpoint(d.start, endpoint, d.mode);
        d.endAnchor = endpoint.anchor || null;
        const points = this.straightArrowPoints(d.start, endpoint, d.mode);
        d.el.setAttribute(
          "d",
          points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")
        );
        this.select([d.el], false);
        this.drawSmartGuides(endpoint.guides || []);
        this.drawConnectionAnchor(d.startAnchor);
        this.drawConnectionAnchor(endpoint.anchor);
        return;
      }
      if (d.type === "marquee") {
        this.clearPreview();
        const x = Math.min(d.start.x, p.x);
        const y = Math.min(d.start.y, p.y);
        const w = Math.abs(p.x - d.start.x);
        const h = Math.abs(p.y - d.start.y);
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("class", "marquee");
        r.setAttribute("x", x);
        r.setAttribute("y", y);
        r.setAttribute("width", w);
        r.setAttribute("height", h);
        overlay.appendChild(r);
        d.rect = { x, y, w, h };
      }
    }

    onPointerUp(e) {
      if (this.scrollDrag) {
        this.endScrollbarDrag();
        return;
      }
      if (!this.drag) return;
      const d = this.drag;
      this.drag = null;
      viewport.classList.remove("down");
      viewport.classList.remove("line-label-dragging");
      viewport.style.cursor = "";
      if (d.type === "pan") return;
      this.connectionAnchorsVisible = false;
      if ((d.type === "connector-label" || d.textClick) && !d.moved) {
        this.redrawOverlay();
        this.updateProps();
        return;
      }
      if (d.type === "marquee") {
        this.clearPreview();
        if (d.rect && d.rect.w > 4 && d.rect.h > 4) {
          const hits = [...content.querySelectorAll("*")].filter((el) => {
            if (!GRAPHIC_TAGS.has(el.tagName.toLowerCase()) || el.closest("defs")) return false;
            if (isLockedBackdrop(el, this.docBox)) return false;
            try {
              const b = el.getBBox();
              const cx = b.x + b.width / 2;
              const cy = b.y + b.height / 2;
              return (
                cx >= d.rect.x &&
                cx <= d.rect.x + d.rect.w &&
                cy >= d.rect.y &&
                cy <= d.rect.y + d.rect.h
              );
            } catch (_) {
              return false;
            }
          });
          this.select(hits, e.shiftKey);
        }
        return;
      }
      this.recordDragGlue(d);
      if (
        d.type === "move" ||
        d.type === "handle" ||
        d.type === "create-shape" ||
        d.type === "create-arrow" ||
        d.type === "connector-label"
      ) {
        this.commit(d.type === "connector-label" ? "已调整线条文字位置" : "已更新图形");
        if (this.tool === "shape" || this.tool === "arrow") this.setTool("select");
      }
    }

    // Turns the anchor an endpoint was released on into persistent glue, so the
    // connector keeps following that shape side afterwards.
    recordDragGlue(drag) {
      if (drag.type === "create-arrow" && drag.el) {
        this.setConnectorGlue(drag.el, true, drag.startAnchor);
        this.setConnectorGlue(drag.el, false, drag.endAnchor);
        return;
      }
      if (drag.type !== "handle" || !("endpointAnchor" in drag)) return;
      const data = drag.data;
      if (!data || !data.endpoint || !isConnectorElement(data.el)) return;
      const atStart = data.kind === "line" ? data.end === 1 : Boolean(data.atStart);
      this.setConnectorGlue(data.el, atStart, drag.endpointAnchor);
    }

    boxDimensionGuides(box) {
      if (!box) return [];
      const width = Number(box.width);
      const height = Number(box.height);
      if (!(width > 0) || !(height > 0)) return [];
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const gap = 16 * scale;
      const round = (value) => Math.round(value * 10) / 10;
      let widthCross = box.bottom + gap;
      let heightCross = box.left - gap;
      let heightAlign = "end";
      if (heightCross < this.view.x + 28 * scale) {
        heightCross = box.right + gap;
        heightAlign = "start";
      }
      if (widthCross > this.view.y + this.view.h - 18 * scale) {
        widthCross = box.top - gap;
      }
      return [
        {
          kind: "dimension",
          axis: "x",
          label: `宽 ${round(width)}`,
          start: box.left,
          end: box.right,
          cross: widthCross,
        },
        {
          kind: "dimension",
          axis: "y",
          label: `高 ${round(height)}`,
          start: box.top,
          end: box.bottom,
          cross: heightCross,
          align: heightAlign,
        },
      ];
    }

    resizeOriginBox(el) {
      const box = this.elementBox(el);
      if (!box || !(box.width > 0) || !(box.height > 0)) return null;
      const origin = { x: box.left, y: box.top, w: box.width, h: box.height };
      if (el.tagName && el.tagName.toLowerCase() === "text") {
        origin.fontSize = this.textFormatState(el).fontSize;
        origin.textX = parseFloat(el.getAttribute("x"));
        origin.textY = parseFloat(el.getAttribute("y"));
        const textLength = parseFloat(el.getAttribute("textLength"));
        if (Number.isFinite(textLength)) origin.textLength = textLength;
        origin.tspans = this.lineTspans(el).map((span) => {
          const item = {
            x: parseFloat(span.getAttribute("x")),
            y: parseFloat(span.getAttribute("y")),
          };
          const spanLength = parseFloat(span.getAttribute("textLength"));
          if (Number.isFinite(spanLength)) item.textLength = spanLength;
          return item;
        });
      }
      return origin;
    }

    constrainResizeAspect(pos, origin, rx, ry, rw, rh) {
      if (!origin || !(origin.w > 0) || !(origin.h > 0)) return { rx, ry, rw, rh };
      const minSize = 8;
      const origR = origin.x + origin.w;
      const origB = origin.y + origin.h;
      const fromW = pos.includes("e") || pos.includes("w");
      const fromH = pos.includes("n") || pos.includes("s");
      let scale = fromW && fromH
        ? Math.max(rw / origin.w, rh / origin.h)
        : fromW
          ? rw / origin.w
          : rh / origin.h;
      scale = Math.max(scale, minSize / origin.w, minSize / origin.h);
      rw = origin.w * scale;
      rh = origin.h * scale;
      if (pos.includes("w")) rx = origR - rw;
      else if (pos.includes("e")) rx = origin.x;
      else rx = origin.x + (origin.w - rw) / 2;
      if (pos.includes("n")) ry = origB - rh;
      else if (pos.includes("s")) ry = origin.y;
      else ry = origin.y + (origin.h - rh) / 2;
      return { rx, ry, rw, rh };
    }

    scaleAffiliatedFromBox(anchor, from, to) {
      if (!anchor || !from || !to) return;
      if (!(from.w > 0) || !(from.h > 0)) return;
      const sx = to.w / from.w;
      const sy = to.h / from.h;
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
      if (Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9 && Math.abs(to.x - from.x) < 1e-9 && Math.abs(to.y - from.y) < 1e-9) {
        return;
      }
      const fontScale = (Math.abs(sx) + Math.abs(sy)) / 2;
      this.componentMembers(anchor).forEach((el) => {
        if (el === anchor || tagOf(el) !== "text") return;
        const map = (node) => {
          if (node.hasAttribute("x")) node.setAttribute("x", to.x + (num(node, "x") - from.x) * sx);
          if (node.hasAttribute("y")) node.setAttribute("y", to.y + (num(node, "y") - from.y) * sy);
        };
        map(el);
        elementChildren(el).forEach((child) => {
          if (tagOf(child) === "tspan") map(child);
        });
        const fontSize = parseFloat((el.style && el.style.fontSize) || (el.getAttribute && el.getAttribute("font-size")));
        if (Number.isFinite(fontSize) && fontSize > 0) {
          const next = Math.min(120, Math.max(1, Math.round(fontSize * fontScale * 10) / 10));
          el.setAttribute("font-size", String(next));
          if (el.style) el.style.fontSize = next + "px";
        }
      });
    }

    resizeRect(el, pos, x, y, targets = [], bypass = false, origin = null) {
      let rx = num(el, "x");
      let ry = num(el, "y");
      let rw = num(el, "width");
      let rh = num(el, "height");
      const fromBox = { x: rx, y: ry, w: rw, h: rh };
      const r = rx + rw;
      const b = ry + rh;
      if (pos.includes("w")) {
        rx = Math.min(x, r - 8);
        rw = r - rx;
      }
      if (pos.includes("e")) rw = Math.max(8, x - rx);
      if (pos.includes("n")) {
        ry = Math.min(y, b - 8);
        rh = b - ry;
      }
      if (pos.includes("s")) rh = Math.max(8, y - ry);
      if (origin) {
        const locked = this.constrainResizeAspect(pos, origin, rx, ry, rw, rh);
        rx = locked.rx;
        ry = locked.ry;
        rw = locked.rw;
        rh = locked.rh;
      }

      const guides = [];
      const scale = this.view.w / Math.max(1, viewport.clientWidth);
      const threshold = Math.max(2, 8 * scale);
      const smartEnabled = $("smart-toggle").checked && !bypass && !origin;
      let widthMatch = null;
      let heightMatch = null;
      if (smartEnabled && (pos.includes("w") || pos.includes("e"))) {
        widthMatch = targets
          .map((target) => ({ target, difference: Math.abs(target.width - rw) }))
          .filter((candidate) => candidate.difference <= threshold)
          .sort((a, b) => a.difference - b.difference)[0] || null;
        if (widthMatch) {
          rw = widthMatch.target.width;
          if (pos.includes("w")) rx = r - rw;
        }
      }
      if (smartEnabled && (pos.includes("n") || pos.includes("s"))) {
        heightMatch = targets
          .map((target) => ({ target, difference: Math.abs(target.height - rh) }))
          .filter((candidate) => candidate.difference <= threshold)
          .sort((a, b) => a.difference - b.difference)[0] || null;
        if (heightMatch) {
          rh = heightMatch.target.height;
          if (pos.includes("n")) ry = b - rh;
        }
      }

      el.setAttribute("x", rx);
      el.setAttribute("y", ry);
      el.setAttribute("width", rw);
      el.setAttribute("height", rh);
      this.scaleAffiliatedFromBox(el, fromBox, { x: rx, y: ry, w: rw, h: rh });
      if (widthMatch) {
        const target = widthMatch.target;
        const edgeX = pos.includes("w") ? rx : rx + rw;
        guides.push({
          kind: "size",
          axis: "x",
          label: `同宽 ${Math.round(rw * 10) / 10}`,
          matchLine: {
            x1: edgeX,
            y1: Math.min(ry, target.top) - 8 * scale,
            x2: edgeX,
            y2: Math.max(ry + rh, target.bottom) + 8 * scale,
          },
          segments: [
            { start: rx, end: rx + rw, cross: ry - 12 * scale },
            { start: target.left, end: target.right, cross: target.top - 12 * scale },
          ],
        });
      }
      if (heightMatch) {
        const target = heightMatch.target;
        const edgeY = pos.includes("n") ? ry : ry + rh;
        guides.push({
          kind: "size",
          axis: "y",
          label: `同高 ${Math.round(rh * 10) / 10}`,
          matchLine: {
            x1: Math.min(rx, target.left) - 8 * scale,
            y1: edgeY,
            x2: Math.max(rx + rw, target.right) + 8 * scale,
            y2: edgeY,
          },
          segments: [
            { start: ry, end: ry + rh, cross: rx + rw + 12 * scale },
            { start: target.top, end: target.bottom, cross: target.right + 12 * scale },
          ],
        });
      }
      return guides;
    }

    resizeFlowShape(el, pos, x, y, targets = [], bypass = false, origin = null) {
      const box = this.elementBox(el);
      if (!box) return [];
      const proxy = document.createElementNS(NS, "rect");
      proxy.setAttribute("x", box.left);
      proxy.setAttribute("y", box.top);
      proxy.setAttribute("width", box.width);
      proxy.setAttribute("height", box.height);
      const guides = this.resizeRect(proxy, pos, x, y, targets, bypass, origin);
      const to = {
        x: num(proxy, "x"),
        y: num(proxy, "y"),
        w: num(proxy, "width"),
        h: num(proxy, "height"),
      };
      this.updateFlowShapeGeometry(
        el,
        el.getAttribute("data-flow-shape") || "rect",
        to.x,
        to.y,
        to.w,
        to.h
      );
      this.scaleAffiliatedFromBox(el, { x: box.left, y: box.top, w: box.width, h: box.height }, to);
      return guides;
    }

    resizeText(el, pos, x, y, targets = [], bypass = false, origin = null) {
      const start = origin || this.resizeOriginBox(el);
      if (!start || !(start.w > 0) || !(start.h > 0)) return [];
      const proxy = document.createElementNS(NS, "rect");
      proxy.setAttribute("x", start.x);
      proxy.setAttribute("y", start.y);
      proxy.setAttribute("width", start.w);
      proxy.setAttribute("height", start.h);
      const guides = this.resizeRect(proxy, pos, x, y, targets, bypass, start);
      const fontSize = Number(start.fontSize) || this.textFormatState(el).fontSize || 16;
      if (!(fontSize > 0)) return guides;
      const scale = num(proxy, "width") / start.w;
      const nextSize = Math.min(120, Math.max(1, Math.round(fontSize * scale * 10) / 10));
      const used = nextSize / fontSize;
      const box = this.constrainResizeAspect(pos, start, start.x, start.y, start.w * used, start.h * used);
      el.setAttribute("font-size", nextSize);
      el.style.fontSize = nextSize + "px";
      const applyPoint = (node, ox, oy) => {
        if (!node) return;
        if (Number.isFinite(ox)) node.setAttribute("x", box.rx + (ox - start.x) * used);
        if (Number.isFinite(oy)) node.setAttribute("y", box.ry + (oy - start.y) * used);
      };
      applyPoint(el, start.textX, start.textY);
      const spans = this.lineTspans(el);
      (start.tspans || []).forEach((point, index) => {
        const span = spans[index];
        if (!span) return;
        applyPoint(span, point.x, point.y);
        if (Number.isFinite(point.textLength)) {
          span.setAttribute("textLength", point.textLength * used);
        }
      });
      if (Number.isFinite(start.textLength)) {
        el.setAttribute("textLength", start.textLength * used);
      }
      if (this.selected.includes(el)) this.syncTextToolbar();
      return guides;
    }

    createTextElement(p, options = {}) {
      const t = document.createElementNS(NS, "text");
      const x = options.snap === false ? p.x : this.snap(p.x);
      const y = options.snap === false ? p.y : this.snap(p.y);
      t.setAttribute("x", x);
      t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      if (options.verticalCenter) t.setAttribute("dominant-baseline", "central");
      t.setAttribute("class", "label");
      t.style.fontFamily = "SimSun, Songti SC, serif";
      t.style.fontSize = "23px";
      t.style.fill = "#333";
      t.textContent = options.text || "文字";
      t.setAttribute("data-ed-id", uid());
      const host = options.after;
      const parent = host && host.parentNode;
      if (parent && typeof parent.insertBefore === "function") {
        parent.insertBefore(t, host.nextSibling || null);
      } else {
        content.appendChild(t);
      }
      return t;
    }

    createText(p) {
      const t = this.createTextElement(p);
      this.select([t], false);
      this.commit("已添加文字");
      this.setTool("select");
      this.startTextEdit(t);
    }

    selectedConnectableShapes() {
      return this.selected.filter((el) => el && el.tagName && isConnectableShape(el));
    }

    createTextInSelectedShapes() {
      const shapes = this.selectedConnectableShapes();
      if (!shapes.length) return false;
      const created = [];
      shapes.forEach((shape) => {
        const center = this.shapeCenter(shape);
        if (!center) return;
        created.push(
          this.createTextElement(center, {
            snap: false,
            verticalCenter: true,
            after: shape,
          })
        );
      });
      if (!created.length) return false;
      const last = created[created.length - 1];
      this.select([last], false);
      this.commit("已在图形内部添加文字");
      this.startTextEdit(last);
      return true;
    }

    addPolyPoint(p, bypass = false) {
      if (!this.polyPoints.length) {
        this.polyConnectionAnchors = this.collectConnectionAnchors();
        this.polyEndpointTargets = this.collectArrowEndpoints();
        this.connectionAnchorsVisible = true;
      }
      const endpoint = this.snapConnectorEndpoint(
        this.snap(p.x),
        this.snap(p.y),
        this.polyConnectionAnchors,
        this.polyEndpointTargets,
        bypass
      );
      const pt = { x: endpoint.x, y: endpoint.y };
      this.polyEndAnchor = endpoint.anchor || null;
      if (!this.polyPoints.length) {
        this.polyPoints = [pt];
        this.polyStartAnchor = endpoint.anchor || null;
      } else {
        this.polyPoints = this.appendOrthogonalPoint(this.polyPoints, pt);
      }
      this.drawPolyPreview(null, endpoint.anchor, endpoint.guides || []);
      this.status(
        "已确认 " + this.polyPoints.length + " 个正交点；继续单击，双击/Enter 结束，Esc 取消"
      );
    }

    drawPolyPreview(cursor, activeAnchor = null, guides = []) {
      this.clearPreview();
      if (!this.polyPoints.length) return;
      const pts = cursor
        ? this.appendOrthogonalPoint(this.polyPoints, cursor)
        : this.polyPoints.map((point) => ({ ...point }));
      const path = document.createElementNS(NS, "path");
      path.setAttribute("class", "preview-line");
      path.setAttribute(
        "d",
        pts.map((q, i) => (i ? `L${q.x},${q.y}` : `M${q.x},${q.y}`)).join(" ")
      );
      overlay.appendChild(path);
      pts.forEach((q) => this.addHandle(q.x, q.y, { kind: "preview" }));
      this.drawAllConnectionAnchors();
      this.drawConnectionAnchor(activeAnchor);
      this.drawSmartGuides(guides);
    }

    finishPolyline() {
      if (this.polyPoints.length < 2) {
        this.polyPoints = [];
        this.polyConnectionAnchors = [];
        this.polyEndpointTargets = [];
        this.polyStartAnchor = null;
        this.polyEndAnchor = null;
        this.clearPreview();
        return;
      }
      this.ensureArrowMarker();
      const path = document.createElementNS(NS, "path");
      path.setAttribute(
        "d",
        this.polyPoints.map((q, i) => (i ? `L${q.x},${q.y}` : `M${q.x},${q.y}`)).join(" ")
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#c97945");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("marker-end", "url(#arrow)");
      path.setAttribute("data-routing", "orthogonal");
      path.setAttribute("data-arrow-mode", "manual");
      path.setAttribute("data-ed-id", uid());
      this.setConnectorGlue(path, true, this.polyStartAnchor);
      this.setConnectorGlue(path, false, this.polyEndAnchor);
      content.appendChild(path);
      this.polyPoints = [];
      this.polyConnectionAnchors = [];
      this.polyEndpointTargets = [];
      this.polyStartAnchor = null;
      this.polyEndAnchor = null;
      this.connectionAnchorsVisible = false;
      this.clearPreview();
      this.select([path], false);
      this.commit("已添加折线箭头");
      this.setTool("select");
    }

    onDblClick(e) {
      if (this.tool === "polyline") {
        this.finishPolyline();
        return;
      }
      const el = graphicFromTarget(e.target, this.docBox);
      if (el && el.tagName.toLowerCase() === "text") {
        this.startTextEdit(el);
      } else if (isLineLikeConnector(el)) {
        const existing = this.connectorLabelFor(el);
        const label = existing || this.createConnectorLabel(el, "文字");
        this.select([label], false);
        if (!existing) this.commit("已插入线条文字");
        this.startTextEdit(label);
      }
    }

    startTextEdit(el) {
      this.editingText = el;
      if (el.setAttribute) el.setAttribute("data-text-editing", "1");
      if (el.style) el.style.opacity = "0";
      const textStyle = getComputedStyle(el);
      textInput.hidden = false;
      textInput.value = this.textElementPlainText(el);
      textInput.style.color = parseColor(
        el.getAttribute("data-text-color-preview") || el.getAttribute("fill") || textStyle.fill
      ) || "#222222";
      textInput.style.textAlign =
        (el.getAttribute("text-anchor") || textStyle.textAnchor) === "middle"
          ? "center"
          : (el.getAttribute("text-anchor") || textStyle.textAnchor) === "end"
            ? "right"
            : "left";
      this.syncTextEditorOverlay();
      if (typeof textInput.focus === "function") textInput.focus();
      if (typeof textInput.select === "function") textInput.select();
    }

    textEditMetrics(el, screenBox) {
      const computed = getComputedStyle(el);
      const sourceFontSize = parseFloat(el.style.fontSize || el.getAttribute("font-size") || computed.fontSize) || 20;
      let scale = 0;
      try {
        const matrix = typeof el.getScreenCTM === "function" ? el.getScreenCTM() : null;
        if (matrix) scale = Math.hypot(matrix.a, matrix.b);
      } catch (_) {
        scale = 0;
      }
      if (!Number.isFinite(scale) || scale <= 0) {
        scale = viewport.clientWidth && this.view.w ? viewport.clientWidth / this.view.w : 1;
      }
      const fontSize = Math.max(8, sourceFontSize * scale);
      const padX = 18;
      const padY = 10;
      return {
        fontSize,
        padX,
        padY,
        width: Math.max(80, Math.ceil((screenBox.width || fontSize) + padX)),
        height: Math.max(32, Math.ceil(Math.max((screenBox.height || fontSize) + padY, fontSize * 1.35 + padY))),
      };
    }

    syncTextEditorOverlay() {
      const el = this.editingText;
      if (!el || !textInput || textInput.hidden) return;
      if (typeof el.getBoundingClientRect !== "function" || typeof viewport.getBoundingClientRect !== "function") {
        return;
      }
      const box = el.getBoundingClientRect();
      const host = viewport.getBoundingClientRect();
      if (!box || !host) return;
      const metrics = this.textEditMetrics(el, box);
      const textStyle = getComputedStyle(el);
      const selectionStart = textInput.selectionStart;
      const selectionEnd = textInput.selectionEnd;
      textInput.style.left = Math.max(0, box.left - host.left - metrics.padX / 2) + "px";
      textInput.style.top = Math.max(0, box.top - host.top - metrics.padY / 2) + "px";
      textInput.style.width = metrics.width + "px";
      textInput.style.height = metrics.height + "px";
      textInput.style.fontSize = metrics.fontSize + "px";
      if (textStyle) {
        textInput.style.fontFamily = textStyle.fontFamily;
        textInput.style.fontWeight = textStyle.fontWeight;
        textInput.style.fontStyle = textStyle.fontStyle;
        textInput.style.letterSpacing = textStyle.letterSpacing;
      }
      this._textEditBase = { width: metrics.width, height: metrics.height };
      this.syncTextEditorLineHeight();
      this.resizeTextInput();
      if (
        typeof textInput.setSelectionRange === "function" &&
        Number.isInteger(selectionStart) &&
        Number.isInteger(selectionEnd)
      ) {
        try {
          textInput.setSelectionRange(selectionStart, selectionEnd);
        } catch (_) {
          /* ignore */
        }
      }
    }

    clearTextEditingState(el) {
      if (!el) return;
      el.removeAttribute("data-text-editing");
      if (el.style) {
        if (typeof el.style.removeProperty === "function") el.style.removeProperty("opacity");
        else el.style.opacity = "";
      }
    }

    resizeTextInput() {
      if (!this.editingText || textInput.hidden) return;
      const base = this._textEditBase || { width: 80, height: 32 };
      textInput.style.width = base.width + "px";
      textInput.style.height = base.height + "px";
      const scrollWidth = Number(textInput.scrollWidth) || 0;
      const scrollHeight = Number(textInput.scrollHeight) || 0;
      if (scrollWidth > base.width) textInput.style.width = Math.ceil(scrollWidth + 6) + "px";
      if (scrollHeight > base.height) textInput.style.height = Math.ceil(scrollHeight + 6) + "px";
    }

    commitTextEdit() {
      if (!this.editingText) {
        textInput.hidden = true;
        return;
      }
      const el = this.editingText;
      this.editingText = null;
      this._textEditBase = null;
      textInput.hidden = true;
      this.clearTextEditingState(el);
      this.writeTextElementContent(el, textInput.value);
      this.commit("已修改文字");
    }

    cancelTextEdit() {
      const el = this.editingText;
      this.editingText = null;
      this._textEditBase = null;
      textInput.hidden = true;
      this.clearTextEditingState(el);
    }

    deleteSelected() {
      if (!this.selected.length) return;
      const targets = [];
      const seen = new Set();
      this.selected.forEach((el) => {
        const node = this.reorderNode(el);
        if (!node || seen.has(node)) return;
        seen.add(node);
        targets.push(node);
      });
      targets.forEach((node) => {
        const members = tagOf(node) === "g" ? this.graphicsIn(node) : [node];
        members.forEach((el) => {
          if (isConnectorElement(el)) {
            const label = this.connectorLabelFor(el);
            this.removeConnectorLabelCutout(el);
            if (label) label.remove();
          } else if (el.hasAttribute && el.hasAttribute("data-line-label-for")) {
            this.removeConnectorLabelCutout(this.connectorForLabel(el));
          }
        });
        node.remove();
      });
      this.selected = [];
      this.commit("已删除");
    }

    order(dir) {
      const nodes = [];
      const seen = new Set();
      this.selected.forEach((el) => {
        const node = this.reorderNode(el);
        if (!node || seen.has(node)) return;
        seen.add(node);
        nodes.push(node);
      });
      nodes.forEach((el) => {
        const parent = el.parentNode || content;
        if (dir === "front") {
          parent.appendChild(el);
          return;
        }
        const defs = elementChildren(parent).find((child) => tagOf(child) === "defs");
        const first = elementChildren(parent)[0] || parent.firstChild || null;
        parent.insertBefore(el, defs && defs.nextSibling ? defs.nextSibling : first);
      });
      this.commit(dir === "front" ? "已置于顶层" : "已置于底层");
    }

    onKeyDown(e) {
      if (this.editingText) return;
      if (this.colorDialogOpen()) {
        if (e.key === "Escape") {
          e.preventDefault();
          this.closeColorDialog();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          this.confirmColorDialog();
          return;
        }
      }
      const tag = ((e.target && e.target.tagName) || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if (typing && !e.ctrlKey && !e.metaKey) return;
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = String(e.key || "").toLowerCase();
        if ((this.colorMenuVisible || this.moreFillsVisible) && ["m", "o", "e"].includes(key)) {
          e.preventDefault();
          if (key === "m") this.openColorDialog("standard");
          else if (key === "o") this.openColorDialog("custom");
          else this.pickColor(this.colorMenuTarget || "text");
          return;
        }
      }
      if (e.code === "Space" && !this.space) {
        this.space = true;
        viewport.classList.add("space");
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.save();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        this.deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        if (this.colorDialogOpen()) {
          e.preventDefault();
          this.closeColorDialog();
          return;
        }
        if (this.eyedropper) {
          e.preventDefault();
          this.cancelEyedropper();
          this.status("已取消取色");
          return;
        }
        if (this.symbolMenuVisible) {
          e.preventDefault();
          this.closeSymbolMenu();
          return;
        }
        this.polyPoints = [];
        this.polyConnectionAnchors = [];
        this.polyEndpointTargets = [];
        this.polyStartAnchor = null;
        this.polyEndAnchor = null;
        this.clearPreview();
        this.select([], false);
        this.setTool("select");
        return;
      }
      if (e.key === "Enter" && this.tool === "polyline") {
        this.finishPolyline();
        return;
      }
      if (
        (e.key === "Enter" || e.key === "F2") &&
        this.selected.length === 1 &&
        this.selected[0].tagName.toLowerCase() === "text"
      ) {
        e.preventDefault();
        this.startTextEdit(this.selected[0]);
        return;
      }
      if (e.key === "v" || e.key === "V") this.setTool("select");
      if (e.key === "h" || e.key === "H") this.setTool("pan");
      if (e.key === "t" || e.key === "T") this.setTool("text");
      if (e.key === "r" || e.key === "R") this.setTool("shape");
      if (e.key === "a" || e.key === "A") this.setTool("arrow");
      if (e.key === "p" || e.key === "P") this.setTool("polyline");
      if (this.selected.length && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const movers = new Set(this.collectMoveItems(this.selected));
        this.moveSet([...movers], dx, dy);
        this.reflowGluedConnectors([...movers]);
        this.syncConnectorLabels();
        this.commit("已微调位置");
      }
    }

    selectedTextElements() {
      const text = new Set();
      this.selected.forEach((el) => {
        if (!el || !el.tagName) return;
        if (el.tagName.toLowerCase() === "text") {
          text.add(el);
        } else if (isConnectableShape(el)) {
          this.containedText(el).forEach((item) => text.add(item));
        }
      });
      return [...text];
    }

    fontFamilyChoice(value) {
      const family = String(value || "").toLowerCase();
      if (family.includes("simsun") || family.includes("songti")) return "SimSun, Songti SC, serif";
      if (family.includes("microsoft yahei") || family.includes("pingfang")) {
        return "Microsoft YaHei, PingFang SC, sans-serif";
      }
      if (family.includes("times new roman") || /^times[,\s]/.test(family)) {
        return "Times New Roman, Times, serif";
      }
      if (family.includes("arial") || family.includes("helvetica")) return "Arial, Helvetica, sans-serif";
      if (family.includes("kaiti") || family.includes("stkaiti")) return "KaiTi, STKaiti, serif";
      return "";
    }

    textFormatState(el) {
      const computed = getComputedStyle(el);
      const fontSize = parseFloat(el.style.fontSize || el.getAttribute("font-size") || computed.fontSize) || 16;
      const fontWeight = String(
        el.style.fontWeight || el.getAttribute("font-weight") || computed.fontWeight || "normal"
      ).toLowerCase();
      const numericWeight = parseInt(fontWeight, 10);
      const fontStyle = String(
        el.style.fontStyle || el.getAttribute("font-style") || computed.fontStyle || "normal"
      ).toLowerCase();
      const decoration = String(
        el.style.textDecoration || el.getAttribute("text-decoration") || computed.textDecoration || "none"
      ).toLowerCase();
      const storedLineSpacing = parseFloat(el.getAttribute("data-line-spacing"));
      return {
        color: parseColor(
          el.getAttribute("data-text-color-preview") || el.getAttribute("fill") || el.style.fill || computed.fill
        ) || "#333333",
        gradient: el.getAttribute("data-text-gradient-preview") || "",
        fontFamily: this.fontFamilyChoice(
          el.style.fontFamily || el.getAttribute("font-family") || computed.fontFamily || ""
        ),
        fontSize,
        bold: fontWeight === "bold" || fontWeight === "bolder" || (Number.isFinite(numericWeight) && numericWeight >= 600),
        italic: fontStyle === "italic" || fontStyle === "oblique",
        underline: decoration.includes("underline"),
        align: el.getAttribute("data-text-justify") === "true"
          ? "justify"
          : el.getAttribute("text-anchor") || computed.textAnchor || "start",
        lineSpacing: Number.isFinite(storedLineSpacing) && storedLineSpacing > 0 ? storedLineSpacing : 1,
      };
    }

    lineTspans(el) {
      const queried = el && typeof el.querySelectorAll === "function" ? [...el.querySelectorAll("tspan")] : [];
      const nested = queried.length
        ? queried
        : [...((el && el.childNodes) || [])].filter((node) => String(node.tagName || "").toLowerCase() === "tspan");
      const lineSpans = nested.filter(
        (span) =>
          span &&
          typeof span.hasAttribute === "function" &&
          (span.hasAttribute("x") || span.hasAttribute("y") || span.hasAttribute("dy"))
      );
      return lineSpans.length >= 2 ? lineSpans : [];
    }

    textElementPlainText(el) {
      if (!el) return "";
      const lines = this.lineTspans(el);
      if (lines.length) return lines.map((span) => span.textContent || "").join("\n");
      return String(el.textContent || "");
    }

    writeTextElementContent(el, value) {
      if (!el) return;
      const lines = String(value == null ? "" : value)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");
      const x = parseFloat(el.getAttribute("x"));
      const y = parseFloat(el.getAttribute("y"));
      const fontSize = this.textFormatState(el).fontSize || 16;
      const stored = parseFloat(el.getAttribute("data-line-spacing"));
      const spacing = Number.isFinite(stored) && stored > 0 ? stored : 1;
      const anchor = el.getAttribute("text-anchor") || "";
      if (typeof el.replaceChildren === "function") el.replaceChildren();
      else if (Array.isArray(el.childNodes)) el.childNodes = [];
      if (lines.length <= 1) {
        el.textContent = lines[0] || "";
        return;
      }
      el.textContent = "";
      if (Array.isArray(el.childNodes)) el.childNodes = [];
      const baseX = Number.isFinite(x) ? x : 0;
      const baseY = Number.isFinite(y) ? y : 0;
      lines.forEach((line, index) => {
        const span = document.createElementNS(NS, "tspan");
        span.setAttribute("x", baseX);
        span.setAttribute("y", baseY + index * fontSize * spacing);
        span.textContent = line;
        if (anchor) {
          span.setAttribute("text-anchor", anchor);
          if (span.style) span.style.textAnchor = anchor;
        }
        el.appendChild(span);
      });
    }

    syncTextEditorLineHeight() {
      if (!this.editingText || !textInput || textInput.hidden) return;
      const spacing = parseFloat(this.editingText.getAttribute("data-line-spacing"));
      textInput.style.lineHeight = Number.isFinite(spacing) && spacing > 0 ? String(spacing) : "1.2";
    }

    textBaseline(el) {
      const y = parseFloat(el.getAttribute("y"));
      if (Number.isFinite(y)) return y;
      const firstLine = this.lineTspans(el)[0];
      if (firstLine) {
        const lineY = parseFloat(firstLine.getAttribute("y"));
        if (Number.isFinite(lineY)) return lineY;
      }
      const box = this.elementBox(el);
      return box ? box.bottom : 0;
    }

    textLineSpacingGroups(targets) {
      const groups = new Map();
      const standalone = {};
      targets.forEach((el) => {
        const spans = this.lineTspans(el);
        if (spans.length >= 2) {
          groups.set(el, { kind: "tspan", parent: el, items: spans });
          return;
        }
        const area = this.textAlignmentBox(el);
        const key = area && area.contained && area.box.el ? area.box.el : standalone;
        if (!groups.has(key)) groups.set(key, { kind: "elements", items: [] });
        groups.get(key).items.push(el);
      });
      return [...groups.values()];
    }

    canAdjustLineSpacing(targets) {
      return (targets || []).some((el) => el && !el.hasAttribute("data-line-label-for"));
    }

    applyTextLineSpacing(targets, multiplier) {
      const spacing = Math.max(0.5, Math.min(5, Number(multiplier) || 1));
      (targets || []).forEach((el) => {
        if (!el || (el.hasAttribute && el.hasAttribute("data-line-label-for"))) return;
        el.setAttribute("data-line-spacing", spacing);
      });
      this.textLineSpacingGroups(targets).forEach((group) => {
        if (group.kind === "tspan") {
          const state = this.textFormatState(group.parent);
          const parentY = parseFloat(group.parent.getAttribute("y"));
          const firstY = parseFloat(group.items[0].getAttribute("y"));
          const firstDy = parseFloat(group.items[0].getAttribute("dy"));
          const baseY = Number.isFinite(firstY)
            ? firstY
            : (Number.isFinite(parentY) ? parentY : 0) + (Number.isFinite(firstDy) ? firstDy : 0);
          group.items.forEach((span, index) => {
            span.setAttribute("y", baseY + index * state.fontSize * spacing);
            span.removeAttribute("dy");
          });
          group.parent.setAttribute("data-line-spacing", spacing);
          return;
        }
        if (group.items.length < 2) return;
        const lines = [...group.items].sort((a, b) => this.textBaseline(a) - this.textBaseline(b));
        const baseY = this.textBaseline(lines[0]);
        const fontSize = Math.max(...lines.map((line) => this.textFormatState(line).fontSize));
        lines.forEach((line, index) => {
          line.setAttribute("y", baseY + index * fontSize * spacing);
          line.setAttribute("data-line-spacing", spacing);
        });
      });
      this.syncTextEditorLineHeight();
      this.resizeTextInput();
    }

    syncTextToolbar() {
      const targets = this.selectedTextElements();
      const enabled = targets.length > 0 || Boolean(this.editingText);
      const controlIds = [
        "top-text-color",
        "btn-text-color",
        "top-font-family",
        "top-font-size",
        "top-font-decrease",
        "top-font-increase",
        ...TEXT_STYLE_BUTTONS.flatMap((row) => row.slice(1)),
        ...TEXT_ALIGN_BUTTONS.flatMap((row) => row.slice(1)),
        ...TEXT_LINE_SPACING_IDS,
        "btn-symbol",
      ];
      controlIds.forEach((id) => {
        $(id).disabled = !enabled;
      });
      $("text-formatbar").classList.toggle("has-text", enabled);
      const styleIds = TEXT_STYLE_BUTTONS.flatMap((row) => row.slice(1));
      const alignIds = TEXT_ALIGN_BUTTONS.flatMap((row) => row.slice(1));
      if (!enabled) {
        this.closeTextColorMenu();
        $("top-font-size").value = "";
        $("top-font-family").value = "";
        TEXT_LINE_SPACING_IDS.forEach((id) => {
          $(id).value = "1";
        });
        [...styleIds, ...alignIds].forEach((id) => {
          $(id).classList.remove("active");
          $(id).setAttribute("aria-pressed", "false");
        });
        return;
      }

      const states = targets.map((el) => this.textFormatState(el));
      const hasLineLabel = targets.some((el) => el.hasAttribute("data-line-label-for"));
      alignIds.forEach((id) => {
        $(id).disabled = hasLineLabel;
      });
      const spacingDisabled = hasLineLabel || !this.canAdjustLineSpacing(targets);
      TEXT_LINE_SPACING_IDS.forEach((id) => {
        $(id).disabled = spacingDisabled;
      });
      const uniform = (key) => states.every((state) => state[key] === states[0][key]);
      $("top-text-color").value = states[0].color;
      $("top-text-color").classList.toggle("mixed", !uniform("color"));
      $("text-color-indicator").style.background = uniform("gradient") && states[0].gradient
        ? states[0].gradient
        : uniform("color")
          ? states[0].color
          : "linear-gradient(135deg, #ffffff 0 44%, #6d7782 45% 55%, #ffffff 56% 100%)";
      $("top-font-family").value = uniform("fontFamily") ? states[0].fontFamily : "";
      $("top-font-size").value = uniform("fontSize") ? String(Math.round(states[0].fontSize * 10) / 10) : "";
      $("top-font-size").placeholder = uniform("fontSize") ? "字号" : "多种";
      TEXT_LINE_SPACING_IDS.forEach((id) => {
        $(id).value = uniform("lineSpacing") ? String(states[0].lineSpacing) : "";
      });

      const pressed = {
        bold: states.every((state) => state.bold),
        italic: states.every((state) => state.italic),
        underline: states.every((state) => state.underline),
        start: states.every((state) => state.align === "start"),
        middle: states.every((state) => state.align === "middle"),
        end: states.every((state) => state.align === "end"),
        justify: states.every((state) => state.align === "justify"),
      };
      TEXT_STYLE_BUTTONS.forEach(([key, ...ids]) => {
        ids.forEach((id) => {
          $(id).classList.toggle("active", pressed[key]);
          $(id).setAttribute("aria-pressed", pressed[key] ? "true" : "false");
        });
      });
      TEXT_ALIGN_BUTTONS.forEach(([anchor, ...ids]) => {
        ids.forEach((id) => {
          $(id).classList.toggle("active", pressed[anchor]);
          $(id).setAttribute("aria-pressed", pressed[anchor] ? "true" : "false");
        });
      });
    }

    textAlignmentBox(el) {
      const textBox = this.elementBox(el);
      if (!textBox) return null;
      const containers = [...content.querySelectorAll("[data-ed-id]")]
        .filter((candidate) => candidate !== el && isConnectableShape(candidate))
        .map((candidate) => this.elementBox(candidate))
        .filter(
          (box) =>
            box &&
            textBox.cx >= box.left &&
            textBox.cx <= box.right &&
            textBox.cy >= box.top &&
            textBox.cy <= box.bottom
        )
        .sort((a, b) => a.width * a.height - b.width * b.height);
      return containers.length ? { box: containers[0], contained: true } : { box: textBox, contained: false };
    }

    clearTextJustification(el) {
      el.removeAttribute("data-text-justify");
      el.removeAttribute("textLength");
      el.removeAttribute("lengthAdjust");
      el.querySelectorAll("tspan").forEach((span) => {
        span.removeAttribute("textLength");
        span.removeAttribute("lengthAdjust");
      });
    }

    justifyTextElement(el) {
      const area = this.textAlignmentBox(el);
      this.clearTextJustification(el);
      if (!area) return;
      const inset = area.contained ? Math.min(12, Math.max(4, area.box.width * 0.04)) : 0;
      const x = area.box.left + inset;
      const width = Math.max(1, area.box.width - inset * 2);
      el.setAttribute("data-text-justify", "true");
      el.setAttribute("text-anchor", "start");
      el.setAttribute("x", x);
      el.style.textAnchor = "start";
      const spans = [...el.querySelectorAll("tspan")];
      spans.forEach((span) => {
        span.setAttribute("text-anchor", "start");
        span.style.textAnchor = "start";
      });
      const lines = this.lineTspans(el);
      if (lines.length) {
        lines.forEach((line) => {
          line.setAttribute("x", x);
          line.setAttribute("textLength", width);
          line.setAttribute("lengthAdjust", "spacing");
        });
      } else {
        el.setAttribute("textLength", width);
        el.setAttribute("lengthAdjust", "spacing");
      }
    }

    syncJustifiedText() {
      content.querySelectorAll('text[data-text-justify="true"]').forEach((el) => this.justifyTextElement(el));
    }

    alignTextElement(el, anchor) {
      const area = this.textAlignmentBox(el);
      this.clearTextJustification(el);
      el.setAttribute("text-anchor", anchor);
      el.style.textAnchor = anchor;
      const spans = [...el.querySelectorAll("tspan")];
      spans.forEach((span) => {
        span.setAttribute("text-anchor", anchor);
        span.style.textAnchor = anchor;
      });
      if (!area) return;
      const inset = area.contained ? Math.min(12, Math.max(4, area.box.width * 0.04)) : 0;
      const x = anchor === "start" ? area.box.left + inset : anchor === "end" ? area.box.right - inset : area.box.cx;
      el.setAttribute("x", x);
      spans.filter((span) => span.hasAttribute("x")).forEach((span) => span.setAttribute("x", x));
    }

    bindHoldRepeat(id, action) {
      const button = $(id);
      if (!button || typeof button.addEventListener !== "function") return;
      button.addEventListener("pointerdown", (e) => {
        if (e.button && e.button !== 0) return;
        if (button.disabled) return;
        if (typeof e.preventDefault === "function") e.preventDefault();
        if (typeof button.setPointerCapture === "function" && e.pointerId != null) {
          try {
            button.setPointerCapture(e.pointerId);
          } catch (_) {
            /* ignore */
          }
        }
        this.startHoldRepeat(button, action);
      });
      button.addEventListener("pointerup", () => this.stopHoldRepeat());
      button.addEventListener("pointercancel", () => this.stopHoldRepeat());
      button.addEventListener("lostpointercapture", () => this.stopHoldRepeat());
    }

    startHoldRepeat(button, action) {
      this.stopHoldRepeat();
      if (!button || button.disabled || typeof action !== "function") return;
      action();
      let interval = 90;
      const tick = () => {
        if (!this._holdRepeat || (this._holdRepeat.button && this._holdRepeat.button.disabled)) {
          this.stopHoldRepeat();
          return;
        }
        action();
        interval = Math.max(28, Math.round(interval * 0.86));
        this._holdRepeat.timer = setTimeout(tick, interval);
      };
      this._holdRepeat = {
        button,
        action,
        timer: setTimeout(tick, 380),
      };
    }

    stopHoldRepeat() {
      if (!this._holdRepeat) return;
      clearTimeout(this._holdRepeat.timer);
      this._holdRepeat = null;
    }

    nudgePropFontSize(delta) {
      const input = $("prop-fs");
      if (!input || input.disabled) return;
      const current = parseFloat(input.value);
      const next = Math.min(120, Math.max(8, (Number.isFinite(current) ? current : 18) + Number(delta || 0)));
      input.value = String(next);
      this.applyTextFormat("font-size", next);
    }

    nudgePropStrokeWidth(delta) {
      const input = $("prop-sw");
      if (!input || input.disabled) return;
      const current = parseFloat(input.value);
      const next = Math.min(40, Math.max(0, Math.round(((Number.isFinite(current) ? current : 1) + Number(delta || 0)) * 10) / 10));
      input.value = String(next);
      this.applyProps("prop-sw");
    }

    applyTextFormat(action, value) {
      const targets = this.selectedTextElements();
      if (!targets.length) return;
      const states = targets.map((el) => this.textFormatState(el));
      const toggleValue =
        action === "bold"
          ? !states.every((state) => state.bold)
          : action === "italic"
            ? !states.every((state) => state.italic)
            : action === "underline"
              ? !states.every((state) => state.underline)
              : false;

      if (action === "line-spacing") {
        this.applyTextLineSpacing(targets, value);
      } else targets.forEach((el, index) => {
        if (action === "color") {
          el.setAttribute("fill", value);
          el.style.fill = value;
          el.removeAttribute("data-text-color-preview");
          el.removeAttribute("data-text-gradient-preview");
        } else if (action === "font-family") {
          el.setAttribute("font-family", value);
          el.style.fontFamily = value;
        } else if (action === "font-size") {
          const size = Math.min(120, Math.max(1, Number(value)));
          if (Number.isFinite(size)) {
            el.setAttribute("font-size", size);
            el.style.fontSize = size + "px";
          }
        } else if (action === "font-size-step") {
          const size = Math.min(120, Math.max(1, states[index].fontSize + Number(value || 0)));
          el.setAttribute("font-size", size);
          el.style.fontSize = size + "px";
        } else if (action === "bold") {
          const weight = toggleValue ? "700" : "normal";
          el.setAttribute("font-weight", weight);
          el.style.fontWeight = weight;
        } else if (action === "italic") {
          const style = toggleValue ? "italic" : "normal";
          el.setAttribute("font-style", style);
          el.style.fontStyle = style;
        } else if (action === "underline") {
          const decoration = toggleValue ? "underline" : "none";
          el.setAttribute("text-decoration", decoration);
          el.style.textDecoration = decoration;
        } else if (action === "align" && !el.hasAttribute("data-line-label-for")) {
          if (value === "justify") this.justifyTextElement(el);
          else this.alignTextElement(el, value);
        }
      });

      this.syncConnectorLabels();
      this.redrawOverlay();
      this.syncTextEditorOverlay();
      this.refreshHits();
      this.updateProps();
      clearTimeout(this._propTimer);
      this._propTimer = setTimeout(() => this.commit("已修改文字格式"), 250);
    }

    togglePropGroup(id, visible) {
      const node = $(id);
      if (node && node.classList) node.classList.toggle("hidden", !visible);
    }

    updateProps() {
      this.syncTextToolbar();
      this.syncLineStyleMenu();
      const box = $("prop-fields");
      const summary = $("sel-summary");
      if (!this.selected.length) {
        box.classList.add("hidden");
        this.togglePropGroup("connector-label-fields", false);
        summary.textContent = "未选中对象";
        return;
      }
      box.classList.remove("hidden");
      const el = this.selected[0];
      const tag = el.tagName.toLowerCase();
      const flowShape = el.getAttribute("data-flow-shape");
      summary.textContent =
        this.selected.length > 1
          ? `已选中 ${this.selected.length} 个对象`
          : `已选中 <${flowShape ? FLOW_SHAPE_LABELS[flowShape] : tag}>`;
      const cs = getComputedStyle(el);
      const fillAttr = el.getAttribute("fill") || cs.fill;
      const strokeAttr = el.getAttribute("stroke") || cs.stroke;
      const fill = /^url\(/i.test(String(fillAttr || ""))
        ? el.getAttribute("data-text-color-preview") || fillAttr
        : fillAttr;
      const stroke = /^url\(/i.test(String(strokeAttr || ""))
        ? el.getAttribute("data-text-color-preview") || strokeAttr
        : strokeAttr;
      $("prop-fill-none").checked = fill === "none";
      const fc = parseColor(fill) || "#ffffff";
      const sc = parseColor(stroke) || "#b85f2a";
      $("prop-fill").value = fc;
      $("prop-stroke").value = sc;
      this.syncPropColorButtons();
      $("prop-sw").value = parseFloat(el.getAttribute("stroke-width") || cs.strokeWidth) || 0;
      const fillTags = new Set(["rect", "circle", "ellipse", "polygon", "text"]);
      const strokeTags = STROKE_TAGS;
      const canStroke = strokeTags.has(tag);
      $("prop-sw").disabled = !canStroke;
      $("prop-sw-decrease").disabled = !canStroke;
      $("prop-sw-increase").disabled = !canStroke;
      const connectorTags = new Set(["line", "path", "polyline"]);
      const knownStyle = this.currentLineStyleKey(el);
      $("prop-line-style").value = knownStyle;
      $("prop-line-style").disabled = !strokeTags.has(tag);
      this.syncPropLineStylePreview();
      $("prop-line-join").value = el.getAttribute("stroke-linejoin") || cs.strokeLinejoin || "miter";
      $("prop-line-join").disabled = !strokeTags.has(tag);
      $("prop-arrow-ends").value = connectorTags.has(tag) ? this.markerPlacement(el) : "none";
      $("prop-arrow-ends").disabled = !connectorTags.has(tag);
      this.togglePropGroup("prop-arrow-ends-wrap", connectorTags.has(tag));

      const labelConnector = this.connectorFromLabelSelection();
      const lineLabel = this.connectorLabelFor(labelConnector);
      this.togglePropGroup("connector-label-fields", Boolean(labelConnector));
      if (labelConnector) {
        const storedPosition = lineLabel ? parseFloat(lineLabel.getAttribute("data-line-position")) : NaN;
        const percent = lineLabel
          ? Math.round((Number.isFinite(storedPosition) ? storedPosition : 0.5) * 100)
          : 50;
        $("prop-line-label").value = lineLabel ? lineLabel.textContent || "" : "";
        $("prop-line-label-position").value = String(percent);
        $("prop-line-label-position").disabled = !lineLabel;
        $("prop-line-label-position-value").textContent = percent + "%";
        $("btn-line-label-add").textContent = lineLabel ? "更新文字" : "插入文字";
        $("btn-line-label-remove").disabled = !lineLabel;
      }

      const textEl = this.selected.find((item) => item.tagName.toLowerCase() === "text");
      $("prop-fs").disabled = !textEl;
      $("prop-fs-decrease").disabled = !textEl;
      $("prop-fs-increase").disabled = !textEl;
      $("prop-ff").disabled = !textEl;
      if (textEl) {
        const textStyle = getComputedStyle(textEl);
        $("prop-fs").value = parseFloat(textEl.style.fontSize || textStyle.fontSize) || 23;
        $("prop-ff").value = this.fontFamilyChoice(
          textEl.style.fontFamily || textEl.getAttribute("font-family") || textStyle.fontFamily || ""
        );
      }

      $("prop-text").value = tag === "text" ? this.textElementPlainText(el) : "";
      $("prop-text").disabled = tag !== "text" || this.selected.length > 1;
      this.togglePropGroup(
        "prop-text-wrap",
        tag === "text" && this.selected.length === 1 && !el.hasAttribute("data-line-label-for")
      );

      const positionable = new Set(["rect", "text", "image", "circle", "ellipse", "line"]);
      const positionDisabled = this.selected.length > 1 || (!positionable.has(tag) && !flowShape);
      this.syncPositionSizeProps();
      this.togglePropGroup("prop-group-fill", fillTags.has(tag));
      this.togglePropGroup("prop-group-stroke", canStroke);
      this.togglePropGroup("prop-group-text", Boolean(textEl));
      this.togglePropGroup("prop-group-position", !positionDisabled);
    }

    syncPositionSizeProps() {
      const xNode = $("prop-x");
      const yNode = $("prop-y");
      const wNode = $("prop-w");
      const hNode = $("prop-h");
      if (!xNode || !yNode || !wNode || !hNode) return;
      const active = typeof document !== "undefined" && document.activeElement;
      if (
        active &&
        (active.id === "prop-x" || active.id === "prop-y" || active.id === "prop-w" || active.id === "prop-h")
      ) {
        return;
      }
      if (!this.selected.length) return;
      const el = this.selected[0];
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      const flowShape = el.getAttribute && el.getAttribute("data-flow-shape");
      const positionable = new Set(["rect", "text", "image", "circle", "ellipse", "line"]);
      const positionDisabled = this.selected.length > 1 || (!positionable.has(tag) && !flowShape);
      xNode.disabled = positionDisabled;
      yNode.disabled = positionDisabled;
      if (positionDisabled) {
        wNode.disabled = true;
        hNode.disabled = true;
        $("prop-square-from-w").disabled = true;
        $("prop-square-from-h").disabled = true;
        this.togglePropGroup("prop-w-field", false);
        this.togglePropGroup("prop-h-field", false);
        this.togglePropGroup("prop-square-field", false);
        return;
      }
      const xAttr = tag === "circle" || tag === "ellipse" ? "cx" : tag === "line" ? "x1" : "x";
      const yAttr = tag === "circle" || tag === "ellipse" ? "cy" : tag === "line" ? "y1" : "y";
      const positionBox = flowShape ? this.elementBox(el) : null;
      const round = (value) => String(Math.round(Number(value) * 10) / 10);
      const xValue = positionBox
        ? positionBox.left
        : flowShape && el.hasAttribute("data-shape-x")
          ? num(el, "data-shape-x")
          : num(el, xAttr);
      const yValue = positionBox
        ? positionBox.top
        : flowShape && el.hasAttribute("data-shape-y")
          ? num(el, "data-shape-y")
          : num(el, yAttr);
      xNode.value = round(xValue);
      yNode.value = round(yValue);
      const size = this.currentSize(el);
      const sizeDisabled =
        this.selected.length > 1 ||
        !size ||
        tag === "line" ||
        (el.hasAttribute && el.hasAttribute("data-line-label-for"));
      wNode.disabled = sizeDisabled;
      hNode.disabled = sizeDisabled;
      wNode.value = size && !sizeDisabled ? round(size.w) : "";
      hNode.value = size && !sizeDisabled ? round(size.h) : "";
      this.togglePropGroup("prop-w-field", !sizeDisabled);
      this.togglePropGroup("prop-h-field", !sizeDisabled);
      const squareDisabled = sizeDisabled || !this.canForceEqualSize(el);
      $("prop-square-from-w").disabled = squareDisabled;
      $("prop-square-from-h").disabled = squareDisabled;
      this.togglePropGroup("prop-square-field", !squareDisabled);
    }

    canForceEqualSize(el) {
      if (!el || !el.tagName) return false;
      if (el.hasAttribute && el.hasAttribute("data-line-label-for")) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "text" || tag === "line") return false;
      return Boolean(el.getAttribute && el.getAttribute("data-flow-shape")) ||
        tag === "rect" ||
        tag === "image" ||
        tag === "ellipse" ||
        tag === "circle";
    }

    currentSize(el) {
      if (!el) return null;
      const tag = el.tagName.toLowerCase();
      const box = this.elementBox(el);
      if (box && box.width > 0 && box.height > 0) {
        return { x: box.left, y: box.top, w: box.width, h: box.height };
      }
      if (el.hasAttribute("data-shape-width") && el.hasAttribute("data-shape-height")) {
        const w = num(el, "data-shape-width");
        const h = num(el, "data-shape-height");
        if (w > 0 && h > 0) {
          return { x: num(el, "data-shape-x"), y: num(el, "data-shape-y"), w, h };
        }
      }
      if (tag === "rect" || tag === "image") {
        const w = num(el, "width");
        const h = num(el, "height");
        if (w > 0 && h > 0) return { x: num(el, "x"), y: num(el, "y"), w, h };
      }
      if (tag === "ellipse") {
        const w = num(el, "rx") * 2;
        const h = num(el, "ry") * 2;
        if (w > 0 && h > 0) {
          return { x: num(el, "cx") - w / 2, y: num(el, "cy") - h / 2, w, h };
        }
      }
      if (tag === "circle") {
        const r = num(el, "r");
        if (r > 0) {
          return { x: num(el, "cx") - r, y: num(el, "cy") - r, w: r * 2, h: r * 2 };
        }
      }
      return null;
    }

    applySelectedSize(changedId) {
      const el = this.selected[0];
      if (!el || el.hasAttribute("data-line-label-for")) return;
      const tag = el.tagName.toLowerCase();
      const current = this.currentSize(el);
      const typed = parseFloat($(changedId).value);
      if (!current || !Number.isFinite(typed) || typed <= 0) return;
      let width = changedId === "prop-w" ? typed : current.w;
      let height = changedId === "prop-h" ? typed : current.h;
      if (tag === "circle" && !el.hasAttribute("data-flow-shape")) {
        width = typed;
        height = typed;
      }
      this.setElementSize(el, Math.max(1, width), Math.max(1, height), changedId === "prop-h" ? "h" : "w");
    }

    makeSelectedSquare(axis) {
      if (this.selected.length !== 1) return;
      const el = this.selected[0];
      if (!this.canForceEqualSize(el)) return;
      const current = this.currentSize(el);
      if (!current) return;
      const size = Math.max(1, axis === "h" ? current.h : current.w);
      this.setElementSize(el, size, size, axis);
      this.syncConnectorLabels();
      this.redrawOverlay();
      this.syncTextEditorOverlay();
      this.refreshHits();
      this.syncPositionSizeProps();
      clearTimeout(this._propTimer);
      this._propTimer = setTimeout(() => this.commit("已等高等宽"), 250);
    }

    setElementSize(el, width, height, scaleAxis = "w") {
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      const current = this.currentSize(el);
      width = Math.max(1, width);
      height = Math.max(1, height);

      if (el.hasAttribute("data-flow-shape")) {
        const x = current ? current.x : num(el, "data-shape-x");
        const y = current ? current.y : num(el, "data-shape-y");
        this.updateFlowShapeGeometry(
          el,
          el.getAttribute("data-flow-shape") || "rect",
          x,
          y,
          width,
          height
        );
        this.scaleAffiliatedFromBox(el, current, { x, y, w: width, h: height });
        this.reflowGluedConnectors([el]);
        return;
      }
      if (tag === "text") {
        const origin = this.resizeOriginBox(el) || (current && {
          x: current.x,
          y: current.y,
          w: current.w,
          h: current.h,
          fontSize: this.textFormatState(el).fontSize,
          textX: parseFloat(el.getAttribute("x")),
          textY: parseFloat(el.getAttribute("y")),
          tspans: this.lineTspans(el).map((span) => ({
            x: parseFloat(span.getAttribute("x")),
            y: parseFloat(span.getAttribute("y")),
          })),
        });
        if (!origin || !(origin.w > 0) || !(origin.h > 0)) return;
        const scale = scaleAxis === "h" ? height / origin.h : width / origin.w;
        this.resizeText(
          el,
          "se",
          origin.x + origin.w * scale,
          origin.y + origin.h * scale,
          [],
          true,
          origin
        );
        return;
      }
      if (tag === "rect" || tag === "image") {
        el.setAttribute("width", width);
        el.setAttribute("height", height);
        if (current) {
          this.scaleAffiliatedFromBox(el, current, { x: current.x, y: current.y, w: width, h: height });
        }
        if (tag === "rect") this.reflowGluedConnectors([el]);
        return;
      }
      if (tag === "ellipse") {
        el.setAttribute("rx", width / 2);
        el.setAttribute("ry", height / 2);
        return;
      }
      if (tag === "circle") {
        el.setAttribute("r", width / 2);
      }
    }

    applyProps(changedId) {
      if (!this.selected.length || !changedId) return;
      const strokeTags = STROKE_TAGS;
      const fillTags = new Set(["rect", "circle", "ellipse", "polygon", "text"]);
      const connectorTags = new Set(["line", "path", "polyline"]);

      this.selected.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (changedId === "prop-text" && !$("prop-text").disabled && tag === "text") {
          this.writeTextElementContent(el, $("prop-text").value);
        } else if (changedId === "prop-fill-none" && fillTags.has(tag)) {
          const fill = $("prop-fill-none").checked ? "none" : $("prop-fill").value;
          el.setAttribute("fill", fill);
          el.style.fill = fill;
        } else if (changedId === "prop-fill" && fillTags.has(tag) && !$("prop-fill-none").checked) {
          el.setAttribute("fill", $("prop-fill").value);
          el.style.fill = $("prop-fill").value;
        } else if (changedId === "prop-stroke" && strokeTags.has(tag)) {
          el.setAttribute("stroke", $("prop-stroke").value);
          el.style.stroke = $("prop-stroke").value;
          if (connectorTags.has(tag)) this.syncConnectorMarkers(el);
        } else if (changedId === "prop-sw" && strokeTags.has(tag)) {
          const width = parseFloat($("prop-sw").value);
          if (Number.isFinite(width) && width >= 0) {
            el.setAttribute("stroke-width", width);
            el.style.strokeWidth = String(width);
          }
        } else if (changedId === "prop-line-style" && strokeTags.has(tag)) {
          this.applyStrokeDash(el, $("prop-line-style").value);
        } else if (changedId === "prop-line-join" && strokeTags.has(tag)) {
          const join = $("prop-line-join").value;
          el.setAttribute("stroke-linejoin", join);
          el.style.strokeLinejoin = join;
        } else if (changedId === "prop-arrow-ends" && connectorTags.has(tag)) {
          this.setMarkerPlacement(el, $("prop-arrow-ends").value);
        } else if (changedId === "prop-fs" && tag === "text") {
          const size = parseFloat($("prop-fs").value);
          if (Number.isFinite(size) && size > 0) el.style.fontSize = size + "px";
        } else if (changedId === "prop-ff" && tag === "text") {
          el.style.fontFamily = $("prop-ff").value;
        } else if ((changedId === "prop-x" || changedId === "prop-y") && this.selected.length === 1) {
          const value = parseFloat($(changedId).value);
          if (!Number.isFinite(value)) return;
          const changeX = changedId === "prop-x";

          if (el.hasAttribute("data-flow-shape")) {
            const shapeBox = this.elementBox(el);
            if (!shapeBox) return;
            const dx = changeX ? value - shapeBox.left : 0;
            const dy = changeX ? 0 : value - shapeBox.top;
            const childText = this.containedText(el);
            moveBy(el, dx, dy);
            childText.forEach((t) => moveBy(t, dx, dy));
          } else if (tag === "rect" || tag === "text" || tag === "image") {
            const dx = changeX ? value - num(el, "x") : 0;
            const dy = changeX ? 0 : value - num(el, "y");
            const childText = tag === "rect" ? this.containedText(el) : [];
            moveBy(el, dx, dy);
            childText.forEach((t) => moveBy(t, dx, dy));
          } else if (tag === "circle" || tag === "ellipse") {
            el.setAttribute(changeX ? "cx" : "cy", value);
          } else if (tag === "line") {
            const dx = changeX ? value - num(el, "x1") : 0;
            const dy = changeX ? 0 : value - num(el, "y1");
            moveBy(el, dx, dy);
          }
        } else if ((changedId === "prop-w" || changedId === "prop-h") && this.selected.length === 1) {
          this.applySelectedSize(changedId);
        }
      });
      this.syncConnectorLabels();
      this.redrawOverlay();
      this.syncTextEditorOverlay();
      this.refreshHits();
      this.syncTextToolbar();
      this.syncPropColorButtons();
      this.syncPropLineStylePreview();
      clearTimeout(this._propTimer);
      this._propTimer = setTimeout(() => this.commit("已改属性"), 250);
    }
  }

  function readBootPayload() {
    const raw = window.__SVG_BOOT__;
    if (!raw || typeof raw !== "string") return null;
    try {
      const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch (_) {
      return null;
    }
  }

  const editor = new Editor();
  window.svgManualEditor = editor;

  if (!vscode) {
    fetch("../figure1_structured_v3.svg")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        editor.fileName = "figure1_structured_v3.svg";
        editor.loadString(text, { record: true });
      })
      .catch(() => editor.status("打开 SVG，或把文件拖到画布上"));
  }
})();
