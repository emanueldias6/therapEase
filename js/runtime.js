// Mini runtime for the canvas .dc.html screens (template holes, sc-for, sc-if, dc-import, state, events, lifecycle).
export class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(s) { Object.assign(this.state, typeof s === 'function' ? s(this.state, this.props) : s); if (this.__inst) this.__inst.schedule(); }
  forceUpdate() { if (this.__inst) this.__inst.schedule(); }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const files = {};
const injected = new Set();
let BASE = 'screens/';
let hooks = { patchSource: (name, src) => src, skipElement: () => false, replaceComponent: () => null, onInstance: () => {} };
export function configure(opts) { if (opts.base) BASE = opts.base; Object.assign(hooks, opts.hooks || {}); }

// Todos os ecrãs num só ficheiro (screens.json) — mais fácil de publicar; se não existir, lê a pasta screens/.
let bundlePromise = null;
export function getBundle() {
  if (!bundlePromise) bundlePromise = fetch('screens.json?v=30').then(r => r.ok ? r.json() : null).catch(() => null);
  return bundlePromise;
}
export async function loadFile(name) {
  if (files[name]) return files[name];
  const bundle = await getBundle();
  let raw = bundle && bundle.files[name];
  if (raw == null) { const res = await fetch(BASE + name + '.dc.html'); if (!res.ok) throw new Error('Ecrã não encontrado: ' + name); raw = await res.text(); }
  let src = hooks.patchSource(name, raw);
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const sc = doc.querySelector('script[data-dc-script]');
  let pdefs = {}; try { pdefs = JSON.parse(sc.getAttribute('data-props') || '{}'); } catch (e) {}
  const defaults = {}; for (const k in pdefs) if (k[0] !== '$' && pdefs[k] && 'default' in pdefs[k]) defaults[k] = pdefs[k].default;
  let Comp;
  try { Comp = new Function('DCLogic', sc.textContent + ';\nreturn Component;')(DCLogic); } catch (e) { console.error(name, e); Comp = class extends DCLogic { renderVals() { return {}; } }; }
  const x = doc.querySelector('x-dc');
  const helmet = x.querySelector('helmet');
  if (helmet && !injected.has(name)) {
    injected.add(name);
    for (const n of [...helmet.children]) {
      if (n.tagName === 'LINK') { const href = n.getAttribute('href'); if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) continue; }
      document.head.appendChild(document.importNode(n, true));
    }
  }
  if (helmet) helmet.remove();
  files[name] = { name, defaults, Comp, nodes: [...x.childNodes] };
  return files[name];
}

function get(scope, path) {
  path = path.trim();
  if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
  if (/^'.*'$/.test(path)) return path.slice(1, -1);
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
}
function interp(str, scope) {
  const whole = str.match(/^\s*\{\{([^}]+)\}\}\s*$/);
  if (whole) return get(scope, whole[1]);
  return str.replace(/\{\{([^}]+)\}\}/g, (m, p) => { const v = get(scope, p); return v == null ? '' : v; });
}
const camel = s => s.replace(/-([a-z])/g, (m, c) => c.toUpperCase());

export class Instance {
  constructor(name, props, host, parent) {
    this.name = name; this.propsIn = props || {}; this.host = host; this.parent = parent; this.children = []; this.pending = false; this.mounted = false;
  }
  async init() {
    this.file = await loadFile(this.name);
    this.props = Object.assign({}, this.file.defaults, this.propsIn);
    this.logic = new this.file.Comp(this.props); this.logic.props = this.props; if (!this.logic.state) this.logic.state = {};
    this.logic.__inst = this;
    await this.render();
    this.mounted = true;
    hooks.onInstance(this);
    try { this.logic.componentDidMount && this.logic.componentDidMount(); } catch (e) { console.error(e); }
    return this;
  }
  schedule() { if (this.pending) return; this.pending = true; queueMicrotask(async () => { this.pending = false; if (!this.destroyed) await this.render(); }); }
  async update(props) { Object.assign(this.propsIn, props); Object.assign(this.props, props); this.logic.props = this.props; await this.render(); }
  destroyChildren() { for (const c of this.children) c.destroy(); this.children = []; }
  destroy() { this.destroyed = true; this.destroyChildren(); try { this.logic && this.logic.componentWillUnmount && this.logic.componentWillUnmount(); } catch (e) {} }
  findAll(name, out = []) { for (const c of this.children) { if (c.name === name) out.push(c); c.findAll(name, out); } return out; }
  async render() {
    let vals = {};
    try { vals = this.logic.renderVals ? this.logic.renderVals() : {}; } catch (e) { console.error(this.name, e); }
    this.destroyChildren();
    const frag = document.createDocumentFragment();
    for (const n of this.file.nodes) await this.expand(n, vals, frag);
    this.host.replaceChildren(frag);
  }
  async expand(node, scope, parent) {
    if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-for') {
      const list = interp(node.getAttribute('list') || '', scope) || []; const as = node.getAttribute('as'); let i = 0;
      for (const it of list) { const s = Object.assign({}, scope, { [as]: it, $index: i++ }); for (const c of node.childNodes) await this.expand(c, s, parent); }
      return;
    }
    if (tag === 'sc-if') { if (interp(node.getAttribute('value') || '', scope)) for (const c of node.childNodes) await this.expand(c, scope, parent); return; }
    if (tag === 'dc-import') {
      const p = {}; for (const a of node.attributes) { if (a.name === 'name' || a.name.startsWith('hint-')) continue; p[camel(a.name)] = interp(a.value, scope); }
      const cname = node.getAttribute('name');
      const host = document.createElement('div'); host.style.display = 'contents'; host.dataset.cmp = cname; parent.appendChild(host);
      const repl = hooks.replaceComponent(cname, p, host);
      if (repl) return;
      const child = new Instance(cname, p, host, this); this.children.push(child); await child.init();
      return;
    }
    if (hooks.skipElement(node)) return;
    const isSvg = node.namespaceURI === SVG_NS;
    const el = isSvg ? document.createElementNS(SVG_NS, node.localName) : document.createElement(tag);
    for (const a of node.attributes) {
      const nm = a.name;
      if (/^on[a-z]+$/i.test(nm)) { const fn = interp(a.value, scope); if (typeof fn === 'function') el.addEventListener(nm.slice(2).toLowerCase(), fn); continue; }
      const v = interp(a.value, scope);
      if (v === false || v == null) continue;
      if (!isSvg && (nm === 'value' || nm === 'checked')) { el[nm] = nm === 'checked' ? !!v && v !== 'false' : v; if (nm === 'value') el.setAttribute('value', v); continue; }
      try { el.setAttribute(nm, v === true ? '' : v); } catch (e) {}
    }
    for (const c of node.childNodes) await this.expand(c, scope, el);
    parent.appendChild(el);
  }
}
