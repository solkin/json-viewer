import {
  parseJson,
  stringifyJson,
  jsonType,
  isLosslessNumber,
  reviveParsed,
} from "./src/json.js";
import { DocumentEditor } from "./src/editor.js";
import { JsonTree } from "./src/tree.js";
import { task } from "./src/tasks.js";

/**
 * JSON Editor & Viewer Application
 * Lightweight, fast JSON editing and viewing tool
 */
(function () {
  "use strict";

  // DOM Elements
  const elements = {
    // Shell
    railBtns: document.querySelectorAll(".rail-btn"),
    cmdbarDoc: document.getElementById("cmdbar-doc"),
    cmdbarCompare: document.getElementById("cmdbar-compare"),
    stageDoc: document.getElementById("stage-doc"),
    stageCompare: document.getElementById("stage-compare"),
    compareRow: document.getElementById("compare-row"),
    auxRead: document.getElementById("aux-read"),
    auxValidate: document.getElementById("aux-validate"),
    auxConvert: document.getElementById("aux-convert"),
    segs: document.querySelectorAll("#format-switch .seg"),
    toolGroups: document.querySelectorAll("#aux-convert .tool-group"),
    convPanels: document.querySelectorAll("#aux-convert .conv"),
    convInfos: document.querySelectorAll("#aux-convert .conv-info"),
    yamlInfoContent: document.getElementById("yaml-info-content"),
    sourceWrapBtn: document.getElementById("source-wrap-btn"),
    splitterDoc: document.getElementById("splitter-doc"),
    splitterCmp: document.getElementById("splitter-cmp"),
    splitterDiff: document.getElementById("splitter-diff"),
    // Status bar
    sbCursor: document.getElementById("sb-cursor"),
    sbLines: document.getElementById("sb-lines"),
    sbSize: document.getElementById("sb-size"),
    sbNodes: document.getElementById("sb-nodes"),
    sbMode: document.getElementById("sb-mode"),
    sbError: document.getElementById("sb-error"),
    statusbar: document.querySelector(".statusbar"),
    // Document
    editor: document.getElementById("json-editor"),
    editorScroll: document.getElementById("editor-scroll"),
    statusBadge: document.getElementById("status-badge"),
    formatBtn: document.getElementById("format-btn"),
    minifyBtn: document.getElementById("minify-btn"),
    copyBtn: document.getElementById("copy-btn"),
    clearBtn: document.getElementById("clear-btn"),
    treeContent: document.getElementById("tree-content"),
    detailsContent: document.getElementById("details-content"),
    expandAllBtn: document.getElementById("expand-all"),
    collapseAllBtn: document.getElementById("collapse-all"),
    schemaEditor: document.getElementById("schema-editor"),
    schemaInfoContent: document.getElementById("schema-info-content"),
    validationContent: document.getElementById("validation-content"),
    generateSchemaBtn: document.getElementById("generate-schema-btn"),
    uploadSchemaInput: document.getElementById("upload-schema"),
    validateBtn: document.getElementById("validate-btn"),
    copySchemaBtn: document.getElementById("copy-schema-btn"),
    downloadSchemaBtn: document.getElementById("download-schema-btn"),
    downloadJsonBtn: document.getElementById("download-json-btn"),
    uploadJsonInput: document.getElementById("upload-json"),
    bsonContent: document.getElementById("bson-content"),
    bsonInfoContent: document.getElementById("bson-info-content"),
    copyBsonBtn: document.getElementById("copy-bson"),
    downloadBsonBtn: document.getElementById("download-bson"),
    uploadBsonInput: document.getElementById("upload-bson"),
    msgpackContent: document.getElementById("msgpack-content"),
    msgpackInfoContent: document.getElementById("msgpack-info-content"),
    copyMsgpackBtn: document.getElementById("copy-msgpack"),
    downloadMsgpackBtn: document.getElementById("download-msgpack"),
    uploadMsgpackInput: document.getElementById("upload-msgpack"),
    cborContent: document.getElementById("cbor-content"),
    cborInfoContent: document.getElementById("cbor-info-content"),
    copyCborBtn: document.getElementById("copy-cbor"),
    downloadCborBtn: document.getElementById("download-cbor"),
    uploadCborInput: document.getElementById("upload-cbor"),
    compareRunBtn: document.getElementById("compare-run-btn"),
    compareSwapBtn: document.getElementById("compare-swap-btn"),
    compareFromEditorA: document.getElementById("compare-from-editor-a-btn"),
    compareFromEditorB: document.getElementById("compare-from-editor-b-btn"),
    compareCopyReportBtn: document.getElementById("compare-copy-report-btn"),
    compareJsonA: document.getElementById("compare-json-a"),
    compareJsonB: document.getElementById("compare-json-b"),
    compareScrollA: document.getElementById("compare-a-scroll"),
    compareScrollB: document.getElementById("compare-b-scroll"),
    compareErrorA: document.getElementById("compare-error-a"),
    compareErrorB: document.getElementById("compare-error-b"),
    compareResultsContent: document.getElementById("compare-results-content"),
    uploadCompareA: document.getElementById("upload-compare-a"),
    uploadCompareB: document.getElementById("upload-compare-b"),
    yamlCopyBtn: document.getElementById("yaml-copy-btn"),
    yamlDownloadBtn: document.getElementById("yaml-download-btn"),
    uploadYaml: document.getElementById("upload-yaml"),
    yamlYamlEditor: document.getElementById("yaml-yaml-editor"),
    yamlYamlScroll: document.getElementById("yaml-yaml-scroll"),
    yamlErrorYaml: document.getElementById("yaml-error-yaml"),
    toast: document.getElementById("toast"),
    bookmarkBtn: document.getElementById("bookmark-btn"),
    aboutBtn: document.getElementById("about-btn"),
    aboutModal: document.getElementById("about-modal"),
    aboutClose: document.getElementById("about-close"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
  };

  // State
  let currentJson = undefined;
  let documentRevision = 0;
  let parsedText = null;
  let parsedNodeCount = 0;
  let equivalentParse;
  let treeView;
  let jsonError = null;
  let errorLine = null;
  let selectedNode = null;
  let debounceTimer = null;
  let saveTimer = null;

  // LocalStorage keys
  const STORAGE_KEY = "json-viewer-content";
  const THEME_KEY = "json-viewer-theme";
  const COMPARE_MAX_DIFFS = 500;

  let lastCompareReportText = "";
  let compareErrorLineA = null;
  let compareErrorLineB = null;

  let yamlDebounce = null;
  let yamlYamlErrorLine = null;
  let yamlSyncing = false;

  // ============ Workspace modes & routing ============
  // The document (main editor) is the single source of truth. Modes are views
  // over it; only Compare works on its own pair of documents.
  const MODES = ["read", "validate", "convert", "compare"];
  const FORMATS = ["yaml", "bson", "msgpack", "cbor"];
  const MODE_LABELS = {
    read: "Read",
    validate: "Validate",
    convert: "Convert",
    compare: "Compare",
  };

  let currentMode = "read";
  let currentFormat = "yaml";
  let lastTreeSignature = null;
  let validatedSnapshot = null;

  function initModes() {
    elements.railBtns.forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.mode));
    });
    elements.segs.forEach((seg) => {
      seg.addEventListener("click", () =>
        navigate("convert", seg.dataset.format),
      );
    });
    window.addEventListener("hashchange", applyHash);
    applyHash();
  }

  function parseHash() {
    const parts = (window.location.hash || "")
      .replace(/^#\/?/, "")
      .split("/")
      .filter(Boolean);
    const mode = MODES.indexOf(parts[0]) >= 0 ? parts[0] : "read";
    let format = currentFormat;
    if (mode === "convert" && FORMATS.indexOf(parts[1]) >= 0) {
      format = parts[1];
    }
    return { mode: mode, format: format };
  }

  function applyHash() {
    const target = parseHash();
    setMode(target.mode, target.format);

    // Keep the URL honest when it named a route that does not exist, so it
    // never disagrees with the mode actually on screen.
    const canonical =
      target.mode === "convert"
        ? "#/convert/" + target.format
        : "#/" + target.mode;
    if (window.location.hash && window.location.hash !== canonical) {
      window.history.replaceState(null, "", canonical);
    }
  }

  function navigate(mode, format) {
    const hash =
      mode === "convert"
        ? "#/convert/" + (format || currentFormat)
        : "#/" + mode;
    if (window.location.hash === hash) {
      setMode(mode, format);
    } else {
      // hashchange drives setMode, so back/forward stay in sync
      window.location.hash = hash;
    }
  }

  function setMode(mode, format) {
    currentMode = mode;
    if (format) currentFormat = format;

    elements.railBtns.forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });

    const isCompare = mode === "compare";
    elements.stageDoc.hidden = isCompare;
    elements.stageCompare.hidden = !isCompare;
    elements.cmdbarDoc.hidden = isCompare;
    elements.cmdbarCompare.hidden = !isCompare;

    elements.auxRead.hidden = mode !== "read";
    elements.auxValidate.hidden = mode !== "validate";
    elements.auxConvert.hidden = mode !== "convert";

    if (mode === "convert") applyFormat(currentFormat);

    elements.sbMode.textContent = MODE_LABELS[mode];
    // Compare works on its own two documents, so the working document's
    // metrics would describe something that is not on screen.
    elements.statusbar.classList.toggle("doc-hidden", isCompare);

    if (isCompare) {
      refreshCompareEditor("a");
      refreshCompareEditor("b");
    } else {
      refreshActiveView();
    }
  }

  function applyFormat(format) {
    currentFormat = format;
    elements.segs.forEach((s) => {
      const on = s.dataset.format === format;
      s.classList.toggle("active", on);
      s.setAttribute("aria-selected", on ? "true" : "false");
    });
    elements.toolGroups.forEach((g) => {
      g.hidden = g.dataset.format !== format;
    });
    elements.convPanels.forEach((p) => {
      p.hidden = p.dataset.format !== format;
    });
    elements.convInfos.forEach((p) => {
      p.hidden = p.dataset.format !== format;
    });
  }

  // Re-render whatever the active mode shows. Called after every validation
  // pass, which is what makes the aux pane live rather than tab-gated.
  function refreshActiveView() {
    if (currentMode === "read") {
      refreshTreeView();
    } else if (currentMode === "validate") {
      refreshValidateView();
    } else if (currentMode === "convert") {
      refreshConvertView();
    }
  }

  function refreshTreeView() {
    if (jsonError) {
      lastTreeSignature = null;
      showViewerError(jsonError);
      return;
    }
    if (currentJson === undefined) {
      lastTreeSignature = null;
      showViewerEmpty();
      return;
    }
    if (lastTreeSignature === currentJson) return;
    lastTreeSignature = currentJson;
    renderTree(currentJson);
  }

  function refreshValidateView() {
    retireStaleVerdict();

    if (currentJson === undefined && !elements.schemaEditor.value.trim()) {
      if (jsonError) {
        showSchemaError(jsonError);
      } else {
        showSchemaEmpty();
      }
      return;
    }
    // Seed a schema the first time there is a document but no schema yet.
    if (!elements.schemaEditor.value.trim() && currentJson !== undefined) {
      renderSchema(currentJson);
    }
  }

  // A verdict only describes the document and schema it was run against.
  function retireStaleVerdict() {
    if (validatedSnapshot === null) return;
    const now =
      elements.editor.value + "\0" + elements.schemaEditor.value.trim();
    if (now === validatedSnapshot) return;
    validatedSnapshot = null;
    clearValidationResult();
  }

  function refreshConvertView() {
    if (currentFormat === "yaml") {
      syncYamlFromDocument();
      return;
    }
    const renderers = {
      bson: [renderBson, showBsonError, showBsonEmpty],
      msgpack: [renderMsgpack, showMsgpackError, showMsgpackEmpty],
      cbor: [renderCbor, showCborError, showCborEmpty],
    };
    const set = renderers[currentFormat];
    if (!set) return;
    if (jsonError) {
      set[1](jsonError);
    } else if (currentJson !== undefined) {
      set[0](currentJson);
    } else {
      set[2]();
    }
  }

  function showViewerError(error) {
    treeView.clear();
    elements.treeContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
    resetDetails();
  }

  function showViewerEmpty() {
    treeView.clear();
    elements.treeContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to view structure</p>
            </div>`;
    resetDetails();
  }

  function showSchemaError(error) {
    elements.schemaEditor.placeholder = `Invalid JSON: ${error}\n\nFix JSON errors to generate schema, or paste your own schema here.`;
    elements.schemaInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate schema</p>
            </div>`;
    elements.validationContent.innerHTML = `
            <div class="validation-result invalid">
                <span class="material-icons">error</span>
                <span>Invalid JSON in editor</span>
            </div>`;
  }

  function showSchemaEmpty() {
    elements.schemaEditor.placeholder =
      "Generate schema from JSON or paste your own...";
    elements.schemaInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Schema statistics will appear here</p>
            </div>`;
    elements.validationContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">pending</span>
                <p>Click Validate to check JSON against schema</p>
            </div>`;
  }

  // ============ JSON Editor ============
  function initEditor() {
    elements.editor.addEventListener("input", handleEditorInput);
    elements.editor.addEventListener("cursor", updateCursorStatus);

    // Click anywhere in scroll area focuses editor
    elements.editorScroll.addEventListener("click", () =>
      elements.editor.focus(),
    );

    elements.formatBtn.addEventListener("click", formatJson);
    elements.minifyBtn.addEventListener("click", minifyJson);
    elements.copyBtn.addEventListener("click", copyToClipboard);
    elements.clearBtn.addEventListener("click", clearEditor);
    elements.downloadJsonBtn.addEventListener("click", downloadJson);
    elements.uploadJsonInput.addEventListener("change", uploadJson);
  }

  // ============ Panes: splitters, drawers, wrap ============
  function initSplitters() {
    bindSplitter(
      elements.splitterDoc,
      elements.stageDoc,
      "x",
      "--source-w",
      "jv-split-doc",
    );
    bindSplitter(
      elements.splitterCmp,
      elements.compareRow,
      "x",
      "--cmp-w",
      "jv-split-cmp",
    );
    bindSplitter(
      elements.splitterDiff,
      elements.stageCompare,
      "y",
      "--cmp-h",
      "jv-split-diff",
    );
  }

  function bindSplitter(handle, container, axis, varName, storeKey) {
    if (!handle || !container) return;

    const MIN = 15;
    const MAX = 85;
    let dragging = false;

    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) container.style.setProperty(varName, saved);
    } catch (e) {
      /* storage unavailable */
    }

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      dragging = true;
      handle.classList.add("dragging");
      document.body.classList.add("resizing");
    });

    handle.addEventListener("dblclick", () => {
      setPercent(50);
    });

    // The handle is focusable, so it has to be operable from the keyboard too.
    handle.addEventListener("keydown", (e) => {
      const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
      const forward = axis === "x" ? "ArrowRight" : "ArrowDown";
      let next = null;

      if (e.key === back) next = currentPercent() - (e.shiftKey ? 10 : 2);
      else if (e.key === forward)
        next = currentPercent() + (e.shiftKey ? 10 : 2);
      else if (e.key === "Home") next = 50;
      else return;

      e.preventDefault();
      setPercent(next);
    });

    function currentPercent() {
      const raw = parseFloat(container.style.getPropertyValue(varName));
      return isNaN(raw) ? 50 : raw;
    }

    function setPercent(value) {
      const pct = Math.min(MAX, Math.max(MIN, value));
      const text = pct.toFixed(2) + "%";
      container.style.setProperty(varName, text);
      handle.setAttribute("aria-valuenow", Math.round(pct));
      persist(text);
    }

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = container.getBoundingClientRect();
      const raw =
        axis === "x"
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
      const pct = Math.min(MAX, Math.max(MIN, raw)).toFixed(2) + "%";
      container.style.setProperty(varName, pct);
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("dragging");
      document.body.classList.remove("resizing");
      persist(container.style.getPropertyValue(varName));
    });

    function persist(value) {
      try {
        localStorage.setItem(storeKey, value);
      } catch (e) {
        /* storage unavailable */
      }
    }
  }

  function initDrawers() {
    document.querySelectorAll(".drawer-head").forEach((head) => {
      const drawer = head.closest(".drawer");
      if (!drawer) return;
      const key = "jv-drawer-" + drawer.id;

      try {
        const stored = localStorage.getItem(key);
        if (stored === "1") drawer.classList.add("collapsed");
        else if (stored === "0") drawer.classList.remove("collapsed");
      } catch (e) {
        /* storage unavailable */
      }

      syncAria();
      head.addEventListener("click", () => {
        drawer.classList.toggle("collapsed");
        syncAria();
        try {
          localStorage.setItem(
            key,
            drawer.classList.contains("collapsed") ? "1" : "0",
          );
        } catch (e) {
          /* storage unavailable */
        }
      });

      function syncAria() {
        head.setAttribute(
          "aria-expanded",
          drawer.classList.contains("collapsed") ? "false" : "true",
        );
      }
    });
  }

  function initWrap() {
    const container = elements.editor.container;
    if (!container || !elements.sourceWrapBtn) return;

    let wrapped = false;
    try {
      wrapped = localStorage.getItem("jv-wrap") === "1";
    } catch (e) {
      /* storage unavailable */
    }

    apply();
    elements.sourceWrapBtn.addEventListener("click", () => {
      wrapped = !wrapped;
      apply();
      try {
        localStorage.setItem("jv-wrap", wrapped ? "1" : "0");
      } catch (e) {
        /* storage unavailable */
      }
    });

    function apply() {
      elements.editor.setWrapped(wrapped);
      elements.sourceWrapBtn.classList.toggle("active", wrapped);
      elements.sourceWrapBtn.title = wrapped
        ? "Word wrap: on"
        : "Word wrap: off";
    }
  }

  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Mode switching is bound to Alt+digit, not Ctrl/Cmd+digit: browsers
      // reserve Ctrl+1..8 (and Cmd+1..8 on macOS) for tab switching and do
      // not let a page cancel it. Ctrl is accepted too for the platforms
      // where it happens to be free.
      // Matched on e.code, because Option+3 on macOS reports e.key as '£'
      // and non-Latin layouts remap e.key as well.
      const modeIndex = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(
        e.code,
      );
      if (
        modeIndex >= 0 &&
        (e.altKey || e.ctrlKey) &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        navigate(MODES[modeIndex]);
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "F" || e.key === "f")
      ) {
        e.preventDefault();
        formatJson();
      }
    });
  }

  function handleEditorInput() {
    documentRevision++;
    if (equivalentParse && equivalentParse.text !== elements.editor.value)
      equivalentParse = undefined;
    currentJson = undefined;
    currentBsonData = currentMsgpackData = currentCborData = null;
    elements.editor.setError(null);
    setStatus("pending");
    clearValidationResult();
    updateCursorStatus();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(validateJson, 250);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 1000);
  }

  // ============ Status bar ============
  function updateStatusBar() {
    const value = elements.editor.value;
    const lineCount = value === "" ? 0 : elements.editor.lineCount;
    const byteCount = new TextEncoder().encode(value).length;

    elements.sbLines.textContent =
      lineCount + (lineCount === 1 ? " line" : " lines");
    elements.sbSize.textContent = formatBytes(byteCount);

    const nodeCount = currentJson === undefined ? 0 : parsedNodeCount;
    elements.sbNodes.textContent =
      nodeCount + (nodeCount === 1 ? " node" : " nodes");

    if (jsonError) {
      elements.sbError.hidden = false;
      elements.sbError.textContent = jsonError;
    } else {
      elements.sbError.hidden = true;
      elements.sbError.textContent = "";
    }
  }

  function updateCursorStatus() {
    const { line, column } = elements.editor.cursor;
    elements.sbCursor.textContent = "Ln " + line + ", Col " + column;
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, elements.editor.value);
    } catch (e) {
      // Silently fail if localStorage is not available or full
      console.warn("Failed to save to localStorage:", e);
    }
  }

  function loadFromStorage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to load from localStorage:", e);
      return null;
    }
  }

  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Silently fail
    }
  }

  function refreshCompareEditor(side) {
    const editor = side === "a" ? elements.compareJsonA : elements.compareJsonB;
    editor.setError(side === "a" ? compareErrorLineA : compareErrorLineB);
  }

  async function validateJson() {
    clearTimeout(debounceTimer);
    const value = elements.editor.value;
    if (parsedText === value && currentJson !== undefined) {
      refreshActiveView();
      return;
    }
    const revision = documentRevision;
    if (equivalentParse?.text === value) {
      currentJson = equivalentParse.value;
      parsedNodeCount = equivalentParse.count;
      equivalentParse = undefined;
      parsedText = value;
      jsonError = null;
      errorLine = null;
      setStatus("valid");
      updateStatusBar();
      refreshActiveView();
      return;
    }
    equivalentParse = undefined;
    if (!value.trim()) {
      currentJson = undefined;
      jsonError = null;
      errorLine = null;
      parsedNodeCount = 0;
      parsedText = value;
      elements.editor.setError(null);
      setStatus("empty");
      updateStatusBar();
      refreshActiveView();
      return;
    }
    try {
      const result = await task("parse", { text: value });
      if (revision !== documentRevision || value !== elements.editor.value)
        return;
      currentJson = reviveParsed(result.value, result.numbers);
      parsedNodeCount = result.count;
      jsonError = null;
      errorLine = null;
      setStatus("valid");
    } catch (e) {
      if (revision !== documentRevision || value !== elements.editor.value)
        return;
      currentJson = undefined;
      jsonError = e.message;
      errorLine = getErrorLine(e.message, value);
      setStatus("invalid", e.message);
    }
    parsedText = value;
    elements.editor.setError(errorLine);
    updateStatusBar();
    refreshActiveView();
  }

  function getErrorLine(errorMessage, code) {
    // Try to extract line number from different browser formats

    // Firefox: "at line X column Y"
    let match = errorMessage.match(/at line (\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Chrome/V8: "at position X" - need to convert position to line
    match = errorMessage.match(/at position (\d+)/i);
    if (match) {
      const position = parseInt(match[1], 10);
      return positionToLine(code, position);
    }

    // Chrome/V8: "Unexpected token X in JSON at position Y"
    match = errorMessage.match(/position (\d+)/i);
    if (match) {
      const position = parseInt(match[1], 10);
      return positionToLine(code, position);
    }

    // Safari: might use different format, try line number
    match = errorMessage.match(/line (\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  }

  function positionToLine(code, position) {
    if (position < 0 || position > code.length) return null;
    const textBefore = code.substring(0, position);
    return textBefore.split("\n").length;
  }

  function setStatus(status, message = "") {
    const badge = elements.statusBadge;
    const icon = badge.querySelector(".material-icons");
    const text = badge.querySelector(".status-text");

    badge.classList.remove("error");

    switch (status) {
      case "pending":
        icon.textContent = "hourglass_empty";
        text.textContent = "Checking JSON";
        break;
      case "valid":
        icon.textContent = "check_circle";
        text.textContent = "Valid JSON";
        break;
      case "invalid":
        badge.classList.add("error");
        icon.textContent = "error";
        text.textContent = "Invalid JSON";
        break;
      case "empty":
        icon.textContent = "remove_circle_outline";
        text.textContent = "Empty";
        break;
    }
  }

  async function formatJson() {
    await formatDocument(true);
  }
  async function formatDocument(pretty) {
    const text = elements.editor.value;
    try {
      const output = await task("format", { text, pretty });
      if (text !== elements.editor.value) return;
      if (parsedText === text && currentJson !== undefined)
        equivalentParse = {
          text: output,
          value: currentJson,
          count: parsedNodeCount,
        };
      elements.editor.value = output;
      handleEditorInput();
      showToast(pretty ? "JSON formatted" : "JSON minified", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function minifyJson() {
    await formatDocument(false);
  }

  function copyToClipboard() {
    if (!elements.editor.value.trim()) {
      showToast("Nothing to copy", "error");
      return;
    }

    navigator.clipboard
      .writeText(elements.editor.value)
      .then(() => {
        showToast("Copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function clearEditor() {
    elements.editor.value = "";
    handleEditorInput();
    currentJson = undefined;
    clearStorage();
    showToast("Editor cleared", "success");
  }

  function downloadJson() {
    if (!elements.editor.value.trim()) {
      showToast("Nothing to download", "error");
      return;
    }

    const blob = new Blob([elements.editor.value], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON downloaded", "success");
  }

  function uploadJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      elements.editor.value = content;
      handleEditorInput();
      showToast("JSON loaded from " + file.name, "success");
    };
    reader.onerror = function () {
      showToast("Failed to read file", "error");
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = "";
  }

  // ============ Tree Viewer ============
  function initTreeViewer() {
    elements.expandAllBtn.addEventListener("click", expandAll);
    elements.collapseAllBtn.addEventListener("click", collapseAll);
  }

  function renderTree(data) {
    treeView.set(data);
    resetDetails();
  }

  function getType(value) {
    return jsonType(value);
  }

  function formatValue(value, type) {
    switch (type) {
      case "string":
        return `"${value}"`;
      case "null":
        return "null";
      default:
        return isLosslessNumber(value) ? value.value : String(value);
    }
  }

  function selectNode(element, data, key, path, type) {
    // Remove previous selection
    if (selectedNode) {
      selectedNode.classList.remove("selected");
    }

    element.classList.add("selected");
    selectedNode = element;

    showDetails(data, key, path, type);
  }

  function showDetails(data, key, path, type) {
    let html = "";

    // Path
    html += `
            <div class="detail-section">
                <div class="detail-label">Path</div>
                <div class="detail-value path">${escapeHtml(path)}</div>
            </div>`;

    // Key
    if (path !== "$") {
      html += `
                <div class="detail-section">
                    <div class="detail-label">Key</div>
                    <div class="detail-value">${escapeHtml(String(key))}</div>
                </div>`;
    }

    // Type
    html += `
            <div class="detail-section">
                <div class="detail-label">Type</div>
                <span class="detail-type ${type}">${type}</span>
            </div>`;

    // Value / Stats
    if (type === "object") {
      const keys = Object.keys(data);
      html += `
                <div class="detail-section">
                    <div class="detail-label">Properties</div>
                    <div class="detail-stats">
                        <div class="detail-stat">
                            <span class="detail-stat-value">${keys.length}</span>
                            <span class="detail-stat-label">Keys</span>
                        </div>
                    </div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Keys List</div>
                    <div class="detail-value">${keys.length > 0 ? escapeHtml(keys.slice(0, 100).join(", ")) + (keys.length > 100 ? " …" : "") : "(empty)"}</div>
                </div>`;
    } else if (type === "array") {
      html += `
                <div class="detail-section">
                    <div class="detail-label">Length</div>
                    <div class="detail-stats">
                        <div class="detail-stat">
                            <span class="detail-stat-value">${data.length}</span>
                            <span class="detail-stat-label">Items</span>
                        </div>
                    </div>
                </div>`;
    } else {
      html += `
                <div class="detail-section">
                    <div class="detail-label">Value</div>
                    <div class="detail-value">${escapeHtml(type === "string" && data.length > 2048 ? formatValue(data.slice(0, 2048), type) + " … (truncated)" : formatValue(data, type))}</div>
                </div>`;

      if (type === "string") {
        html += `
                    <div class="detail-section">
                        <div class="detail-label">String Length</div>
                        <div class="detail-stats">
                            <div class="detail-stat">
                                <span class="detail-stat-value">${data.length}</span>
                                <span class="detail-stat-label">Characters</span>
                            </div>
                        </div>
                    </div>`;
      }
    }

    // Raw JSON preview for objects/arrays
    if (type === "object" || type === "array") {
      const preview = previewSubtree(data);
      const truncated =
        preview.length > 500 ? preview.substring(0, 500) + "..." : preview;
      html += `
                <div class="detail-section">
                    <div class="detail-label">Preview</div>
                    <div class="detail-value" style="white-space: pre-wrap; max-height: 200px; overflow: auto;">${escapeHtml(truncated)}</div>
                </div>`;
    }

    elements.detailsContent.innerHTML = html;
  }

  function resetDetails() {
    selectedNode = null;
    elements.detailsContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">touch_app</span>
                <p>Click on any element to view details</p>
            </div>`;
  }

  function expandAll() {
    treeView.expandAll();
  }

  function collapseAll() {
    treeView.collapseAll();
  }

  // ============ Schema Generator & Validator ============
  let schemaRevision = 0;
  let schemaStats = { types: {}, properties: 0, required: 0, depth: 0 };

  function initSchema() {
    elements.generateSchemaBtn.addEventListener(
      "click",
      generateAndDisplaySchema,
    );

    elements.uploadSchemaInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          elements.schemaEditor.value = event.target.result;
          updateSchemaStats();
          clearValidationResult();
          showToast("Schema loaded");
        };
        reader.readAsText(file);
        e.target.value = "";
      }
    });

    elements.validateBtn.addEventListener("click", validateJsonAgainstSchema);
    elements.copySchemaBtn.addEventListener("click", copySchema);
    elements.downloadSchemaBtn.addEventListener("click", downloadSchema);

    const updateStats = debounce(updateSchemaStats, 300);
    // Schema editor input handling
    elements.schemaEditor.addEventListener("input", () => {
      schemaRevision++;
      retireStaleVerdict();
      updateStats();
    });
  }

  function renderSchema(data) {
    if (data === undefined) {
      elements.schemaEditor.value = "";
      elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Schema statistics will appear here</p>
                </div>`;
      return;
    }

    generateAndDisplaySchema(data);
  }

  async function generateAndDisplaySchema() {
    const text = elements.editor.value,
      revision = schemaRevision,
      schemaBefore = elements.schemaEditor.value;
    try {
      const schema = await task("generate", { text });
      if (
        elements.editor.value !== text ||
        revision !== schemaRevision ||
        schemaBefore !== elements.schemaEditor.value
      )
        return;
      elements.schemaEditor.value = stringifyJson(schema, null, 2);
      updateSchemaStats();
      clearValidationResult();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function updateSchemaStats() {
    const schemaText = elements.schemaEditor.value.trim();
    if (!schemaText) {
      elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Schema statistics will appear here</p>
                </div>`;
      return;
    }

    try {
      const schema = parseJson(schemaText);
      schemaStats = { types: {}, properties: 0, required: 0, depth: 0 };
      analyzeSchemaStats(schema, 0);
      renderSchemaStats();
    } catch (e) {
      elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">error_outline</span>
                    <p>Invalid JSON in schema</p>
                </div>`;
    }
  }

  function analyzeSchemaStats(schema, depth) {
    if (!schema || typeof schema !== "object") return;

    schemaStats.depth = Math.max(schemaStats.depth, depth);

    if (schema.type) {
      schemaStats.types[schema.type] =
        (schemaStats.types[schema.type] || 0) + 1;
    }

    if (schema.properties) {
      const propKeys = Object.keys(schema.properties);
      schemaStats.properties += propKeys.length;
      propKeys.forEach((key) => {
        analyzeSchemaStats(schema.properties[key], depth + 1);
      });
    }

    if (schema.required && Array.isArray(schema.required)) {
      schemaStats.required += schema.required.length;
    }

    if (schema.items) {
      analyzeSchemaStats(schema.items, depth + 1);
    }

    if (schema.anyOf) {
      schema.anyOf.forEach((s) => analyzeSchemaStats(s, depth));
    }

    if (schema.oneOf) {
      schema.oneOf.forEach((s) => analyzeSchemaStats(s, depth));
    }

    if (schema.allOf) {
      schema.allOf.forEach((s) => analyzeSchemaStats(s, depth));
    }
  }

  function clearValidationResult() {
    validatedSnapshot = null;
    elements.validationContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">pending</span>
                <p>Click Validate to check JSON against schema</p>
            </div>`;
  }

  async function validateJsonAgainstSchema() {
    const schemaText = elements.schemaEditor.value.trim();
    const text = elements.editor.value;

    if (!schemaText) {
      showToast("No schema to validate against", "error");
      return;
    }

    // Remember what was judged, so the verdict can be retired once either
    // side changes. The source pane is visible next to this report now, so a
    // stale "valid" would be read as current.
    validatedSnapshot = elements.editor.value + "\0" + schemaText;

    let errors;
    try {
      errors = await task("schema", { text, schema: schemaText });
    } catch (e) {
      if (
        elements.editor.value === text &&
        elements.schemaEditor.value.trim() === schemaText
      ) {
        elements.validationContent.textContent =
          "Validation error: " + e.message;
      }
      return;
    }
    if (
      elements.editor.value !== text ||
      elements.schemaEditor.value.trim() !== schemaText
    )
      return;

    if (errors.length === 0) {
      elements.validationContent.innerHTML = `
                <div class="validation-result valid">
                    <span class="material-icons">check_circle</span>
                    <span>JSON is valid against schema</span>
                </div>`;
      showToast("Validation passed");
    } else {
      let html = `
                <div class="validation-result invalid">
                    <span class="material-icons">cancel</span>
                    <span>Validation failed (${errors.length} error${errors.length > 1 ? "s" : ""})</span>
                </div>
                <div class="validation-errors">`;

      errors.slice(0, 50).forEach((err) => {
        html += `
                    <div class="validation-error-item">
                        <span class="validation-error-path">${escapeHtml(err.path || "(root)")}</span>
                        <span class="validation-error-message">${escapeHtml(err.message)}</span>
                    </div>`;
      });

      if (errors.length > 50) {
        html += `<div class="validation-error-item">
                    <span class="validation-error-message">...and ${errors.length - 50} more errors</span>
                </div>`;
      }

      html += "</div>";
      elements.validationContent.innerHTML = html;
      showToast(`Validation failed: ${errors.length} error(s)`, "error");
    }
  }

  // Simple JSON Schema validator

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function renderSchemaStats() {
    let html = "";

    // Stats grid
    html += '<div class="schema-stat-grid">';
    html += `
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.properties}</div>
                <div class="stat-label">Properties</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.required}</div>
                <div class="stat-label">Required</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.depth}</div>
                <div class="stat-label">Max Depth</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${Object.keys(schemaStats.types).length}</div>
                <div class="stat-label">Type Count</div>
            </div>
        `;
    html += "</div>";

    // Type breakdown
    html +=
      '<div class="detail-section"><div class="detail-label">Types Used</div></div>';
    html += '<ul class="schema-type-list">';

    const typeOrder = [
      "object",
      "array",
      "string",
      "number",
      "boolean",
      "null",
    ];
    const sortedTypes = Object.entries(schemaStats.types).sort((a, b) => {
      return typeOrder.indexOf(a[0]) - typeOrder.indexOf(b[0]);
    });

    for (const [type, count] of sortedTypes) {
      html += `
                <li class="schema-type-item ${type}">
                    <span class="type-name">${type}</span>
                    <span class="type-count">${count} occurrence${count > 1 ? "s" : ""}</span>
                </li>`;
    }
    html += "</ul>";

    elements.schemaInfoContent.innerHTML = html;
  }

  function copySchema() {
    const schemaText = elements.schemaEditor.value.trim();
    if (!schemaText) {
      showToast("No schema to copy", "error");
      return;
    }

    navigator.clipboard
      .writeText(schemaText)
      .then(() => {
        showToast("Schema copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function downloadSchema() {
    const schemaText = elements.schemaEditor.value.trim();
    if (!schemaText) {
      showToast("No schema to download", "error");
      return;
    }

    const blob = new Blob([schemaText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Schema downloaded", "success");
  }

  // ============ BSON Converter ============
  let currentBsonData = null;

  function initBson() {
    elements.copyBsonBtn.addEventListener("click", copyBsonHex);
    elements.downloadBsonBtn.addEventListener("click", downloadBson);
    elements.uploadBsonInput.addEventListener("change", uploadBson);
  }

  async function renderBson(data) {
    const text = elements.editor.value;
    if (data === undefined) {
      showBsonEmpty();
      return;
    }

    try {
      const bytes = await task("encode", { format: "bson", text });
      if (text !== elements.editor.value) return;
      currentBsonData = bytes;
      const hexOutput = formatHexDump(currentBsonData.subarray(0, 4096));
      elements.bsonContent.innerHTML =
        `<pre class="bson-hex">${hexOutput}</pre>` +
        (bytes.length > 4096
          ? "<p>Preview: first 4096 bytes. Copy or Save exports the full file.</p>"
          : "");

      renderBsonStats(data);
    } catch (e) {
      if (text === elements.editor.value) showBsonError(e.message);
    }
  }

  function showBsonError(error) {
    elements.bsonContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
    elements.bsonInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate BSON</p>
            </div>`;
    currentBsonData = null;
  }

  function showBsonEmpty() {
    elements.bsonContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate BSON</p>
            </div>`;
    elements.bsonInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
    currentBsonData = null;
  }

  // Lightweight BSON encoder

  function formatHexDump(data) {
    const lines = [];
    const bytesPerLine = 16;

    for (let i = 0; i < data.length; i += bytesPerLine) {
      const offset = i.toString(16).padStart(8, "0");
      const chunk = data.slice(i, i + bytesPerLine);

      const hex = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const hexPadded = hex.padEnd(bytesPerLine * 3 - 1, " ");

      const ascii = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");

      lines.push(
        `<span class="offset">${offset}</span>  ` +
          `<span class="hex-byte">${hexPadded}</span>` +
          `<span class="ascii">${escapeHtml(ascii)}</span>`,
      );
    }

    return lines.join("\n");
  }

  function renderBsonStats(jsonData) {
    const jsonStr = stringifyJson(jsonData);
    const jsonSize = new TextEncoder().encode(jsonStr).length;
    const bsonSize = currentBsonData.length;
    const diff = jsonSize - bsonSize;
    const diffPercent = ((diff / jsonSize) * 100).toFixed(1);

    const maxSize = Math.max(jsonSize, bsonSize);
    const jsonWidth = ((jsonSize / maxSize) * 100).toFixed(0);
    const bsonWidth = ((bsonSize / maxSize) * 100).toFixed(0);

    let html = '<div class="size-comparison">';

    // JSON bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;

    // BSON bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">BSON</span>
                    <span class="value">${formatBytes(bsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill bson" style="width: ${bsonWidth}%"></div>
                </div>
            </div>`;

    // Difference
    const isSmaller = diff > 0;
    html += `
            <div class="size-diff">
                <div class="diff-value ${isSmaller ? "positive" : "negative"}">
                    ${isSmaller ? "-" : "+"}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)
                </div>
                <div class="diff-label">${isSmaller ? "BSON smaller" : "BSON larger"}</div>
            </div>`;

    html += "</div>";

    // Additional info
    html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    BSON includes type info for each value, making it self-describing but sometimes larger for simple data.
                </div>
            </div>`;

    elements.bsonInfoContent.innerHTML = html;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function copyBsonHex() {
    if (!currentBsonData) {
      showToast("No BSON data to copy", "error");
      return;
    }

    const hex = Array.from(currentBsonData)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        showToast("Hex copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function downloadBson() {
    if (!currentBsonData) {
      showToast("No BSON data to download", "error");
      return;
    }

    const blob = new Blob([currentBsonData], { type: "application/bson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.bson";
    a.click();
    URL.revokeObjectURL(url);
    showToast("BSON downloaded", "success");
  }

  function uploadBson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const buffer = e.target.result;
        const decoded = await task("decode", { format: "bson", bytes: buffer });

        // Update the JSON editor
        elements.editor.value = decoded;
        handleEditorInput();

        showToast("BSON loaded successfully", "success");
      } catch (err) {
        showToast("Failed to parse BSON: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    event.target.value = "";
  }

  // ============ MsgPack Converter ============
  let currentMsgpackData = null;

  function initMsgpack() {
    elements.copyMsgpackBtn.addEventListener("click", copyMsgpackHex);
    elements.downloadMsgpackBtn.addEventListener("click", downloadMsgpack);
    elements.uploadMsgpackInput.addEventListener("change", uploadMsgpack);
  }

  async function renderMsgpack(data) {
    const text = elements.editor.value;
    if (data === undefined) {
      showMsgpackEmpty();
      return;
    }

    try {
      const bytes = await task("encode", { format: "msgpack", text });
      if (text !== elements.editor.value) return;
      currentMsgpackData = bytes;
      const hexOutput = formatHexDump(currentMsgpackData.subarray(0, 4096));
      elements.msgpackContent.innerHTML =
        `<pre class="bson-hex">${hexOutput}</pre>` +
        (bytes.length > 4096
          ? "<p>Preview: first 4096 bytes. Copy or Save exports the full file.</p>"
          : "");

      renderMsgpackStats(data);
    } catch (e) {
      if (text === elements.editor.value) showMsgpackError(e.message);
    }
  }

  function showMsgpackError(error) {
    elements.msgpackContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
    elements.msgpackInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate MsgPack</p>
            </div>`;
    currentMsgpackData = null;
  }

  function showMsgpackEmpty() {
    elements.msgpackContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate MsgPack</p>
            </div>`;
    elements.msgpackInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
    currentMsgpackData = null;
  }

  // Lightweight MsgPack encoder

  function renderMsgpackStats(jsonData) {
    const jsonStr = stringifyJson(jsonData);
    const jsonSize = new TextEncoder().encode(jsonStr).length;
    const msgpackSize = currentMsgpackData.length;
    const diff = jsonSize - msgpackSize;
    const diffPercent = ((diff / jsonSize) * 100).toFixed(1);

    const maxSize = Math.max(jsonSize, msgpackSize);
    const jsonWidth = ((jsonSize / maxSize) * 100).toFixed(0);
    const msgpackWidth = ((msgpackSize / maxSize) * 100).toFixed(0);

    let html = '<div class="size-comparison">';

    // JSON bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;

    // MsgPack bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">MsgPack</span>
                    <span class="value">${formatBytes(msgpackSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill bson" style="width: ${msgpackWidth}%"></div>
                </div>
            </div>`;

    // Difference
    const isSmaller = diff > 0;
    html += `
            <div class="size-diff">
                <div class="diff-value ${isSmaller ? "positive" : "negative"}">
                    ${isSmaller ? "-" : "+"}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)
                </div>
                <div class="diff-label">${isSmaller ? "MsgPack smaller" : "MsgPack larger"}</div>
            </div>`;

    html += "</div>";

    // Additional info
    html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    MsgPack is highly optimized for size. Small integers use 1 byte, short strings have minimal overhead.
                </div>
            </div>`;

    elements.msgpackInfoContent.innerHTML = html;
  }

  function copyMsgpackHex() {
    if (!currentMsgpackData) {
      showToast("No MsgPack data to copy", "error");
      return;
    }

    const hex = Array.from(currentMsgpackData)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    navigator.clipboard
      .writeText(hex)
      .then(() => {
        showToast("Hex copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function downloadMsgpack() {
    if (!currentMsgpackData) {
      showToast("No MsgPack data to download", "error");
      return;
    }

    const blob = new Blob([currentMsgpackData], {
      type: "application/msgpack",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.msgpack";
    a.click();
    URL.revokeObjectURL(url);
    showToast("MsgPack downloaded", "success");
  }

  function uploadMsgpack(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const buffer = e.target.result;
        const decoded = await task("decode", {
          format: "msgpack",
          bytes: buffer,
        });

        // Update the JSON editor
        elements.editor.value = decoded;
        handleEditorInput();

        showToast("MsgPack loaded successfully", "success");
      } catch (err) {
        showToast("Failed to parse MsgPack: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    event.target.value = "";
  }

  // ============ CBOR Converter ============
  let currentCborData = null;

  function initCbor() {
    elements.copyCborBtn.addEventListener("click", copyCborHex);
    elements.downloadCborBtn.addEventListener("click", downloadCbor);
    elements.uploadCborInput.addEventListener("change", uploadCbor);
  }

  async function renderCbor(data) {
    const text = elements.editor.value;
    if (data === undefined) {
      showCborEmpty();
      return;
    }

    try {
      const bytes = await task("encode", { format: "cbor", text });
      if (text !== elements.editor.value) return;
      currentCborData = bytes;
      const hexOutput = formatHexDump(currentCborData.subarray(0, 4096));
      elements.cborContent.innerHTML =
        `<pre class="bson-hex">${hexOutput}</pre>` +
        (bytes.length > 4096
          ? "<p>Preview: first 4096 bytes. Copy or Save exports the full file.</p>"
          : "");

      renderCborStats(data);
    } catch (e) {
      if (text === elements.editor.value) showCborError(e.message);
    }
  }

  function showCborError(error) {
    elements.cborContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
    elements.cborInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate CBOR</p>
            </div>`;
    currentCborData = null;
  }

  function showCborEmpty() {
    elements.cborContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate CBOR</p>
            </div>`;
    elements.cborInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
    currentCborData = null;
  }

  // CBOR Encoder (RFC 8949)

  function renderCborStats(jsonData) {
    const jsonStr = stringifyJson(jsonData);
    const jsonSize = new TextEncoder().encode(jsonStr).length;
    const cborSize = currentCborData.length;
    const diff = jsonSize - cborSize;
    const diffPercent = ((diff / jsonSize) * 100).toFixed(1);

    const maxSize = Math.max(jsonSize, cborSize);
    const jsonWidth = ((jsonSize / maxSize) * 100).toFixed(0);
    const cborWidth = ((cborSize / maxSize) * 100).toFixed(0);

    let html = '<div class="size-comparison">';

    // JSON bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;

    // CBOR bar
    html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">CBOR</span>
                    <span class="value">${formatBytes(cborSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill cbor" style="width: ${cborWidth}%"></div>
                </div>
            </div>`;

    // Difference
    html += `
            <div class="size-diff">
                <div class="diff-value ${diff >= 0 ? "positive" : "negative"}">${diff >= 0 ? "-" : "+"}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)</div>
                <div class="diff-label">${diff >= 0 ? "Smaller" : "Larger"} than JSON</div>
            </div>`;

    html += "</div>";

    // Additional info
    html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    CBOR (RFC 8949) is designed for small code size and small message size. Used in IoT, WebAuthn, and COSE.
                </div>
            </div>`;

    elements.cborInfoContent.innerHTML = html;
  }

  function copyCborHex() {
    if (!currentCborData) {
      showToast("No CBOR data to copy", "error");
      return;
    }

    const hex = Array.from(currentCborData)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");

    navigator.clipboard
      .writeText(hex)
      .then(() => {
        showToast("CBOR hex copied to clipboard", "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function downloadCbor() {
    if (!currentCborData) {
      showToast("No CBOR data to download", "error");
      return;
    }

    const blob = new Blob([currentCborData], { type: "application/cbor" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.cbor";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CBOR downloaded", "success");
  }

  function uploadCbor(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const buffer = e.target.result;
        const decoded = await task("decode", { format: "cbor", bytes: buffer });

        // Update the JSON editor
        elements.editor.value = decoded;
        handleEditorInput();

        showToast("CBOR loaded successfully", "success");
      } catch (err) {
        showToast("Failed to parse CBOR: " + err.message, "error");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    event.target.value = "";
  }

  // ============ JSON Compare (semantic diff) ============
  function initCompare() {
    elements.compareRunBtn.addEventListener("click", runCompare);
    elements.compareSwapBtn.addEventListener("click", swapComparePanels);
    elements.compareFromEditorA.addEventListener("click", () => {
      lastCompareReportText = "";
      elements.compareResultsContent.textContent =
        "Run Compare to update the report";
      elements.compareJsonA.value = elements.editor.value;
      hideCompareParseError("a");
      hideCompareParseError("b");
    });
    elements.compareFromEditorB.addEventListener("click", () => {
      lastCompareReportText = "";
      elements.compareResultsContent.textContent =
        "Run Compare to update the report";
      elements.compareJsonB.value = elements.editor.value;
      hideCompareParseError("a");
      hideCompareParseError("b");
    });
    elements.compareCopyReportBtn.addEventListener("click", copyCompareReport);
    elements.uploadCompareA.addEventListener("change", (e) =>
      uploadCompareFile(e, "a"),
    );
    elements.uploadCompareB.addEventListener("change", (e) =>
      uploadCompareFile(e, "b"),
    );

    function onCompareInput(side) {
      lastCompareReportText = "";
      elements.compareResultsContent.textContent =
        "Run Compare to update the report";
      if (side === "a") {
        compareErrorLineA = null;
        elements.compareErrorA.hidden = true;
        elements.compareErrorA.textContent = "";
      } else {
        compareErrorLineB = null;
        elements.compareErrorB.hidden = true;
        elements.compareErrorB.textContent = "";
      }
      refreshCompareEditor(side);
    }
    elements.compareJsonA.addEventListener("input", () => onCompareInput("a"));
    elements.compareJsonB.addEventListener("input", () => onCompareInput("b"));

    elements.compareScrollA.addEventListener("click", () =>
      elements.compareJsonA.focus(),
    );
    elements.compareScrollB.addEventListener("click", () =>
      elements.compareJsonB.focus(),
    );

    refreshCompareEditor("a");
    refreshCompareEditor("b");
  }

  function hideCompareParseError(side) {
    const el = side === "a" ? elements.compareErrorA : elements.compareErrorB;
    el.hidden = true;
    el.textContent = "";
    if (side === "a") {
      compareErrorLineA = null;
    } else {
      compareErrorLineB = null;
    }
    refreshCompareEditor(side);
  }

  function showCompareParseError(side, message) {
    const el = side === "a" ? elements.compareErrorA : elements.compareErrorB;
    el.hidden = false;
    el.textContent = message;
  }

  function swapComparePanels() {
    lastCompareReportText = "";
    elements.compareResultsContent.textContent =
      "Run Compare to update the report";
    const a = elements.compareJsonA.value;
    elements.compareJsonA.value = elements.compareJsonB.value;
    elements.compareJsonB.value = a;
    const errA = elements.compareErrorA.textContent;
    const errB = elements.compareErrorB.textContent;
    const hiddenA = elements.compareErrorA.hidden;
    const hiddenB = elements.compareErrorB.hidden;
    elements.compareErrorA.textContent = errB;
    elements.compareErrorB.textContent = errA;
    elements.compareErrorA.hidden = hiddenB;
    elements.compareErrorB.hidden = hiddenA;
    const lineA = compareErrorLineA;
    compareErrorLineA = compareErrorLineB;
    compareErrorLineB = lineA;
    refreshCompareEditor("a");
    refreshCompareEditor("b");
  }

  function uploadCompareFile(event, side) {
    lastCompareReportText = "";
    elements.compareResultsContent.textContent =
      "Run Compare to update the report";
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (side === "a") {
        elements.compareJsonA.value = text;
        hideCompareParseError("a");
      } else {
        elements.compareJsonB.value = text;
        hideCompareParseError("b");
      }
      refreshCompareEditor(side);
      showToast("File loaded into " + (side === "a" ? "A" : "B"), "success");
    };
    reader.onerror = () => showToast("Failed to read file", "error");
    reader.readAsText(file);
    event.target.value = "";
  }

  function diffKindLabel(kind) {
    switch (kind) {
      case "value":
        return "Value differs";
      case "type":
        return "Type mismatch";
      case "length":
        return "Array length differs";
      case "only_left":
        return "Only in JSON A";
      case "only_right":
        return "Only in JSON B";
      default:
        return kind;
    }
  }

  function renderCompareDiffItem(d) {
    const label = diffKindLabel(d.kind);
    let meta = "";
    let valuesHtml = "";
    if (d.kind === "type") {
      meta = escapeHtml(d.leftType) + " vs " + escapeHtml(d.rightType);
      valuesHtml = `
                <div class="compare-diff-values">
                    <div>
                        <div class="compare-diff-side-label">JSON A</div>
                        <div class="compare-diff-side">${escapeHtml(d.leftPreview)}</div>
                    </div>
                    <div>
                        <div class="compare-diff-side-label">JSON B</div>
                        <div class="compare-diff-side">${escapeHtml(d.rightPreview)}</div>
                    </div>
                </div>`;
    } else if (d.kind === "value") {
      valuesHtml = `
                <div class="compare-diff-values">
                    <div>
                        <div class="compare-diff-side-label">JSON A</div>
                        <div class="compare-diff-side">${escapeHtml(d.leftPreview)}</div>
                    </div>
                    <div>
                        <div class="compare-diff-side-label">JSON B</div>
                        <div class="compare-diff-side">${escapeHtml(d.rightPreview)}</div>
                    </div>
                </div>`;
    } else if (d.kind === "length") {
      meta = "length " + d.left + " vs " + d.right;
    } else if (d.kind === "only_left") {
      valuesHtml = `
                <div class="compare-diff-values">
                    <div>
                        <div class="compare-diff-side-label">JSON A</div>
                        <div class="compare-diff-side">${escapeHtml(d.leftPreview)}</div>
                    </div>
                </div>`;
    } else if (d.kind === "only_right") {
      valuesHtml = `
                <div class="compare-diff-values">
                    <div>
                        <div class="compare-diff-side-label">JSON B</div>
                        <div class="compare-diff-side">${escapeHtml(d.rightPreview)}</div>
                    </div>
                </div>`;
    }
    return `
            <li class="compare-diff-item kind-${escapeHtml(d.kind)}">
                <div class="compare-diff-path">${escapeHtml(d.path)}</div>
                <div class="compare-diff-meta">${escapeHtml(label)}${meta ? " · " + meta : ""}</div>
                ${valuesHtml}
            </li>`;
  }

  function buildCompareReport(diffs, truncated) {
    const lines = [
      "JSON semantic comparison",
      "Semantically equal: " + (diffs.length === 0 ? "yes" : "no"),
    ];
    if (diffs.length) {
      lines.push(
        "Differences (" + diffs.length + (truncated ? "+" : "") + "):",
      );
      for (let i = 0; i < diffs.length; i++) {
        const d = diffs[i];
        lines.push("");
        lines.push(i + 1 + ". " + d.path + " — " + diffKindLabel(d.kind));
        if (d.kind === "type") {
          lines.push("   Types: " + d.leftType + " vs " + d.rightType);
          lines.push("   A: " + d.leftPreview);
          lines.push("   B: " + d.rightPreview);
        } else if (d.kind === "value") {
          lines.push("   A: " + d.leftPreview);
          lines.push("   B: " + d.rightPreview);
        } else if (d.kind === "length") {
          lines.push("   Lengths: " + d.left + " vs " + d.right);
        } else if (d.kind === "only_left") {
          lines.push("   A: " + d.leftPreview);
        } else if (d.kind === "only_right") {
          lines.push("   B: " + d.rightPreview);
        }
      }
    }
    if (truncated) {
      lines.push("");
      lines.push("(List truncated at " + COMPARE_MAX_DIFFS + " differences.)");
    }
    return lines.join("\n");
  }

  async function runCompare() {
    hideCompareParseError("a");
    hideCompareParseError("b");
    const textA = elements.compareJsonA.value.trim();
    const textB = elements.compareJsonB.value.trim();
    if (!textA && !textB) {
      elements.compareResultsContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Paste JSON in both panels or load files</p>
                </div>`;
      lastCompareReportText = "";
      return;
    }
    let diffs;
    try {
      diffs = await task("compare", { a: textA, b: textB });
    } catch (e) {
      if (
        textA !== elements.compareJsonA.value.trim() ||
        textB !== elements.compareJsonB.value.trim()
      )
        return;
      const side = e.message.startsWith("JSON A:")
        ? "a"
        : e.message.startsWith("JSON B:")
          ? "b"
          : null;
      if (side) {
        showCompareParseError(side, e.message);
        const line = getErrorLine(e.message, side === "a" ? textA : textB);
        if (side === "a") compareErrorLineA = line;
        else compareErrorLineB = line;
        refreshCompareEditor(side);
      }
      elements.compareResultsContent.textContent = e.message;
      lastCompareReportText = "";
      return;
    }
    if (
      textA !== elements.compareJsonA.value.trim() ||
      textB !== elements.compareJsonB.value.trim()
    )
      return;
    const truncated = diffs.length >= COMPARE_MAX_DIFFS;
    lastCompareReportText = buildCompareReport(diffs, truncated);
    if (diffs.length === 0) {
      elements.compareResultsContent.innerHTML = `
                <div class="compare-summary equal">
                    <span class="material-icons">check_circle</span>
                    <span>No differences — values are semantically equal (key order ignored).</span>
                </div>`;
      return;
    }
    let html = `
            <div class="compare-summary diff">
                <span class="material-icons">warning</span>
                <span><strong>${diffs.length}${truncated ? "+" : ""}</strong> difference${diffs.length === 1 ? "" : "s"} found</span>
            </div>
            <ul class="compare-diff-list">`;
    for (let i = 0; i < diffs.length; i++) {
      html += renderCompareDiffItem(diffs[i]);
    }
    html += "</ul>";
    if (truncated) {
      html += `<p class="compare-diff-truncated">List truncated at ${COMPARE_MAX_DIFFS} differences.</p>`;
    }
    elements.compareResultsContent.innerHTML = html;
  }

  function copyCompareReport() {
    if (!lastCompareReportText) {
      showToast("Run Compare first to generate a report", "error");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(lastCompareReportText)
        .then(() => {
          showToast("Report copied to clipboard", "success");
        })
        .catch(() => showToast("Could not copy", "error"));
    } else {
      showToast("Clipboard not available", "error");
    }
  }

  // ============ YAML <-> JSON ============
  // The YAML pane is a live two-way view of the document: the JSON side of the
  // old converter is now the main source editor, so nothing has to be copied
  // across by hand.
  function initYaml() {
    elements.yamlCopyBtn.addEventListener("click", copyYamlOutput);
    elements.yamlDownloadBtn.addEventListener("click", downloadYaml);
    elements.uploadYaml.addEventListener("change", uploadYamlFile);

    elements.yamlYamlEditor.addEventListener("input", onYamlInput);
    elements.yamlYamlScroll.addEventListener("click", () =>
      elements.yamlYamlEditor.focus(),
    );
  }

  function onYamlInput() {
    hideYamlError("yaml");
    clearTimeout(yamlDebounce);
    yamlDebounce = setTimeout(applyYamlToDocument, 300);
  }

  async function syncYamlFromDocument() {
    const text = elements.editor.value;
    const yamlBefore = elements.yamlYamlEditor.value;
    if (yamlSyncing) return;

    if (!elements.editor.value.trim()) {
      yamlSyncing = true;
      elements.yamlYamlEditor.value = "";
      yamlYamlErrorLine = null;
      hideYamlError("yaml");
      yamlSyncing = false;
      renderYamlStats(null);
      return;
    }

    if (jsonError) {
      showYamlError(
        "yaml",
        "Document is not valid JSON — fix it in the source pane",
      );
      renderYamlStats(null);
      return;
    }

    let out;
    try {
      out = await task("yamlEncode", { text });
      if (
        text !== elements.editor.value ||
        yamlBefore !== elements.yamlYamlEditor.value
      )
        return;
    } catch (err) {
      showYamlError("yaml", err.message || "Could not serialize to YAML");
      renderYamlStats(null);
      return;
    }

    yamlSyncing = true;
    elements.yamlYamlEditor.value = out;
    yamlYamlErrorLine = null;
    hideYamlError("yaml");
    yamlSyncing = false;
    renderYamlStats(out);
  }

  // YAML -> document
  async function applyYamlToDocument() {
    const sourceBefore = elements.editor.value;
    const text = elements.yamlYamlEditor.value;
    if (!text.trim()) return;

    let data;
    try {
      data = await task("yamlDecode", { text });
      if (
        text !== elements.yamlYamlEditor.value ||
        sourceBefore !== elements.editor.value
      )
        return;
    } catch (err) {
      if (
        text !== elements.yamlYamlEditor.value ||
        sourceBefore !== elements.editor.value
      )
        return;
      const msg = err.message || "Invalid YAML";
      const m = msg.match(/\(line (\d+)\)/);
      showYamlError("yaml", msg);
      yamlYamlErrorLine = m ? parseInt(m[1], 10) : null;
      elements.yamlYamlEditor.setError(yamlYamlErrorLine);
      return;
    }

    hideYamlError("yaml");
    yamlYamlErrorLine = null;

    yamlSyncing = true;
    elements.editor.value = data;
    documentRevision++;
    updateCursorStatus();
    await validateJson();
    saveToStorage();
    yamlSyncing = false;

    renderYamlStats(text);
  }

  function renderYamlStats(yamlText) {
    if (!elements.yamlInfoContent) return;

    if (!yamlText || currentJson === undefined) {
      elements.yamlInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">compare_arrows</span>
                    <p>Size statistics appear once the document converts</p>
                </div>`;
      return;
    }

    const encoder = new TextEncoder();
    const jsonSize = encoder.encode(stringifyJson(currentJson)).length;
    const yamlSize = encoder.encode(yamlText).length;
    const maxSize = Math.max(jsonSize, yamlSize, 1);
    const diff = jsonSize - yamlSize;
    const diffPercent =
      jsonSize > 0 ? Math.abs((diff / jsonSize) * 100).toFixed(1) : "0.0";
    const isSmaller = diff > 0;

    elements.yamlInfoContent.innerHTML = `
            <div class="size-comparison">
                <div class="size-bar-container">
                    <div class="size-bar-label">
                        <span class="label">JSON</span>
                        <span class="value">${formatBytes(jsonSize)}</span>
                    </div>
                    <div class="size-bar">
                        <div class="size-bar-fill json" style="width: ${((jsonSize / maxSize) * 100).toFixed(0)}%"></div>
                    </div>
                </div>
                <div class="size-bar-container">
                    <div class="size-bar-label">
                        <span class="label">YAML</span>
                        <span class="value">${formatBytes(yamlSize)}</span>
                    </div>
                    <div class="size-bar">
                        <div class="size-bar-fill yaml" style="width: ${((yamlSize / maxSize) * 100).toFixed(0)}%"></div>
                    </div>
                </div>
                <div class="size-diff">
                    <div class="diff-value ${isSmaller ? "positive" : "negative"}">
                        ${isSmaller ? "-" : "+"}${formatBytes(Math.abs(diff))} (${diffPercent}%)
                    </div>
                    <div class="diff-label">${isSmaller ? "YAML smaller" : "YAML larger"}</div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Format details</div>
                <div class="detail-value" style="font-size: 10px;">
                    YAML 1.2 core schema — block &amp; flow styles, anchors and merge keys are understood on input. Editing this pane rewrites the document.
                </div>
            </div>`;
  }

  function showYamlError(which, message) {
    elements.yamlErrorYaml.hidden = false;
    elements.yamlErrorYaml.textContent = message;
  }

  function hideYamlError() {
    elements.yamlYamlEditor.setError(null);
    elements.yamlErrorYaml.hidden = true;
    elements.yamlErrorYaml.textContent = "";
    yamlYamlErrorLine = null;
  }

  function copyYamlOutput() {
    const text = elements.yamlYamlEditor.value;
    if (!text.trim()) {
      showToast("Nothing to copy", "error");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("YAML copied to clipboard", "success"))
      .catch(() => showToast("Failed to copy", "error"));
  }

  function downloadYaml() {
    const text = elements.yamlYamlEditor.value;
    if (!text.trim()) {
      showToast("Nothing to download", "error");
      return;
    }
    const blob = new Blob([text], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.yaml";
    a.click();
    URL.revokeObjectURL(url);
    showToast("YAML downloaded", "success");
  }

  function uploadYamlFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      elements.yamlYamlEditor.value = e.target.result;
      hideYamlError("yaml");
      applyYamlToDocument();
      showToast("YAML loaded from " + file.name, "success");
    };
    reader.onerror = () => showToast("Failed to read file", "error");
    reader.readAsText(file);
    event.target.value = "";
  }

  // ============ Bookmark ============
  function initBookmark() {
    elements.bookmarkBtn.addEventListener("click", addBookmark);
  }

  function addBookmark() {
    const title = "JSON-Viewer.Ru — Online JSON Editor";
    const url = window.location.href;

    // Try different methods for different browsers
    if (window.sidebar && window.sidebar.addPanel) {
      // Firefox <23
      window.sidebar.addPanel(title, url, "");
    } else if (window.external && "AddFavorite" in window.external) {
      // IE
      window.external.AddFavorite(url, title);
    } else {
      // Modern browsers - show instruction
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const shortcut = isMac ? "Cmd+D" : "Ctrl+D";
      showToast(`Press ${shortcut} to bookmark this page`, "success");
    }
  }

  // ============ About Modal ============
  function initAbout() {
    elements.aboutBtn.addEventListener("click", openAbout);
    elements.aboutClose.addEventListener("click", closeAbout);
    elements.aboutModal.addEventListener("click", (e) => {
      if (e.target === elements.aboutModal) {
        closeAbout();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        elements.aboutModal.classList.contains("active")
      ) {
        closeAbout();
      }
    });
  }

  function openAbout() {
    elements.aboutModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeAbout() {
    elements.aboutModal.classList.remove("active");
    document.body.style.overflow = "";
  }

  // ============ Theme ============
  function initTheme() {
    elements.themeToggle.addEventListener("click", toggleTheme);

    // Load saved theme or detect system preference
    let savedTheme;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
    } catch {}

    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setTheme(prefersDark ? "dark" : "light");
    }

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only auto-switch if user hasn't manually set a theme
        if (!savedTheme) {
          setTheme(e.matches ? "dark" : "light");
        }
      });
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {}
  }

  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      elements.themeIcon.textContent = "light_mode";
    } else {
      document.documentElement.removeAttribute("data-theme");
      elements.themeIcon.textContent = "dark_mode";
    }
  }

  function previewSubtree(value, depth = 0) {
    if (depth > 3) return "…";
    if (typeof value === "string")
      return (
        stringifyJson(value.slice(0, 240)) + (value.length > 240 ? "…" : "")
      );
    if (!value || typeof value !== "object" || isLosslessNumber(value))
      return stringifyJson(value)?.slice(0, 240);
    const keys = Object.keys(value),
      array = Array.isArray(value);
    return (
      (array ? "[" : "{") +
      keys
        .slice(0, 6)
        .map(
          (k) =>
            (array ? "" : stringifyJson(k) + ": ") +
            previewSubtree(value[k], depth + 1),
        )
        .join(", ") +
      (keys.length > 6 ? ", …" : "") +
      (array ? "]" : "}")
    );
  }
  // ============ Utilities ============
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = "info") {
    const toast = elements.toast;
    const icon = toast.querySelector(".toast-icon");
    const msg = toast.querySelector(".toast-message");

    toast.className = "toast " + type;
    icon.textContent = type === "success" ? "check_circle" : "error";
    msg.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // ============ Initialize ============
  async function init() {
    for (const key of [
      "editor",
      "schemaEditor",
      "compareJsonA",
      "compareJsonB",
      "yamlYamlEditor",
    ])
      elements[key] = new DocumentEditor(elements[key]);
    treeView = new JsonTree(elements.treeContent, selectNode);
    initEditor();
    initTreeViewer();
    initSchema();
    initBson();
    initMsgpack();
    initCbor();
    initCompare();
    initYaml();
    initBookmark();
    initAbout();
    initTheme();
    initSplitters();
    initDrawers();
    initWrap();
    initShortcuts();

    // Try to load from localStorage first
    const savedContent = loadFromStorage();

    if (savedContent) {
      elements.editor.value = savedContent;
    } else {
      // Sample JSON for demo
      const sampleJson = {
        name: "JSON Editor",
        version: "1.0.0",
        features: ["syntax highlighting", "formatting", "tree view"],
        settings: {
          theme: "light",
          autoFormat: true,
          tabSize: 2,
        },
        enabled: true,
        count: 42,
        nullable: null,
      };
      elements.editor.value = stringifyJson(sampleJson, null, 2);
    }

    initModes();
    updateCursorStatus();
    await validateJson();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
