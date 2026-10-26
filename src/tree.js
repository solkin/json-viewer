import { jsonType, stringifyJson } from "./json.js";
const ROW_HEIGHT = 24,
  OVERSCAN = 8;
// Visible rows are indexed by subtree sizes. Closed branches are never traversed,
// and even Expand All creates only the DOM rows in the viewport.
export class JsonTree {
  constructor(host, onSelect) {
    this.host = host;
    this.onSelect = onSelect;
    this.active = false;
    this.expanded = new Set();
    this.collapsed = new Set();
    this.sizes = new WeakMap();
    host.classList.add("virtual-tree");
    host.addEventListener("scroll", () => this.schedule(), { passive: true });
    host.addEventListener("click", (event) => {
      const row = event.target.closest("[data-tree-row]");
      if (!row) return;
      const item = this.rendered[Number(row.dataset.treeRow)];
      if (!item) return;
      if (event.target.closest("[data-toggle]") && this.container(item.value)) {
        if (this.expandEverything) {
          if (this.collapsed.has(item.value)) this.collapsed.delete(item.value);
          else this.collapsed.add(item.value);
        } else if (this.expanded.has(item.value))
          this.expanded.delete(item.value);
        else this.expanded.add(item.value);
        this.sizes = new WeakMap();
        this.render();
      } else
        this.onSelect(
          row,
          item.value,
          item.key,
          item.path,
          jsonType(item.value),
        );
    });
    this.observer = new ResizeObserver(() => this.schedule());
    this.observer.observe(host);
  }
  container(value) {
    const t = jsonType(value);
    return t === "array" || t === "object";
  }
  isExpanded(value) {
    return this.expandEverything
      ? !this.collapsed.has(value)
      : this.expanded.has(value);
  }
  clear() {
    this.active = false;
    this.value = undefined;
    this.expanded.clear();
    this.collapsed.clear();
    this.sizes = new WeakMap();
  }
  set(value) {
    this.active = true;
    this.value = value;
    this.expanded = new Set(this.container(value) ? [value] : []);
    this.expandEverything = false;
    this.sizes = new WeakMap();
    this.host.scrollTop = 0;
    this.render();
  }
  expandAll() {
    this.collapsed.clear();
    this.expandEverything = true;
    this.sizes = new WeakMap();
    this.render();
  }
  collapseAll() {
    this.expandEverything = false;
    this.expanded.clear();
    this.sizes = new WeakMap();
    this.render();
  }
  size(value) {
    if (!this.container(value) || !this.isExpanded(value)) return 1;
    if (this.sizes.has(value)) return this.sizes.get(value);
    // Iterative post-order prevents call-stack overflows for deeply nested JSON.
    const stack = [{ value, done: false }];
    while (stack.length) {
      const frame = stack.pop(),
        v = frame.value;
      if (!this.container(v) || !this.isExpanded(v) || this.sizes.has(v))
        continue;
      if (!frame.done) {
        stack.push({ value: v, done: true });
        for (const key of Object.keys(v))
          if (this.container(v[key]) && this.isExpanded(v[key]))
            stack.push({ value: v[key], done: false });
      } else {
        let n = 1;
        for (const key of Object.keys(v)) n += this.sizes.get(v[key]) ?? 1;
        this.sizes.set(v, n);
      }
    }
    return this.sizes.get(value);
  }
  rows(from, to) {
    const result = [],
      stack = [{ value: this.value, key: "root", path: "$", depth: 0 }];
    let index = 0;
    while (stack.length && index < to) {
      const item = stack.pop(),
        size = this.size(item.value);
      if (index + size <= from) {
        index += size;
        continue;
      }
      if (index >= from) result.push(item);
      index++;
      if (this.container(item.value) && this.isExpanded(item.value)) {
        const keys = Object.keys(item.value);
        for (let i = keys.length - 1; i >= 0; i--) {
          const k = keys[i],
            array = Array.isArray(item.value);
          stack.push({
            value: item.value[k],
            key: array ? Number(k) : k,
            path:
              item.path +
              (array ? "[" + k + "]" : "[" + JSON.stringify(k) + "]"),
            depth: item.depth + 1,
          });
        }
      }
    }
    return result;
  }
  schedule() {
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = null;
      this.render();
    });
  }
  render() {
    if (!this.active) return;
    const total = this.size(this.value),
      from = Math.max(
        0,
        Math.floor(this.host.scrollTop / ROW_HEIGHT) - OVERSCAN,
      );
    const to = Math.min(
      total,
      from +
        Math.ceil((this.host.clientHeight || 400) / ROW_HEIGHT) +
        2 * OVERSCAN,
    );
    this.rendered = this.rows(from, to);
    const surface = document.createElement("div");
    surface.style.height = total * ROW_HEIGHT + "px";
    surface.style.position = "relative";
    const viewport = document.createElement("div");
    viewport.style.transform = `translateY(${from * ROW_HEIGHT}px)`;
    this.rendered.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "tree-item virtual-tree-row";
      row.dataset.treeRow = index;
      row.style.paddingLeft = Math.min(item.depth, 40) * 16 + "px";
      const expandable = this.container(item.value),
        toggle = document.createElement("button");
      toggle.className = "tree-toggle";
      toggle.dataset.toggle = "";
      toggle.textContent = expandable
        ? this.isExpanded(item.value)
          ? "▾"
          : "▸"
        : "";
      toggle.disabled = !expandable;
      toggle.setAttribute("aria-label", "Toggle " + item.key);
      row.append(toggle);
      const key = document.createElement("span");
      key.className = "tree-key";
      key.textContent =
        item.path === "$"
          ? "$"
          : typeof item.key === "number"
            ? "[" + item.key + "]"
            : JSON.stringify(item.key);
      row.append(key);
      const value = document.createElement("span");
      value.className = "tree-value " + jsonType(item.value);
      value.textContent = expandable
        ? (Array.isArray(item.value) ? "[" : "{") +
          Object.keys(item.value).length +
          " items" +
          (Array.isArray(item.value) ? "]" : "}")
        : typeof item.value === "string"
          ? JSON.stringify(item.value.slice(0, 240)) +
            (item.value.length > 240 ? "…" : "")
          : stringifyJson(item.value);
      row.append(value);
      viewport.append(row);
    });
    surface.append(viewport);
    this.host.replaceChildren(surface);
  }
}
