import { configure, Instance, getBundle } from './runtime.js?v=30';
import { VOICE } from './voice.js?v=30';
import { Pose, SKELETON } from './pose.js?v=30';

// ---------- assets ----------
const BLOB = {
  'd4e0d6a9c5438353a8c7453e43064964': 'assets/camara-bracos.jpg',
  '59af2a552397c7d7627e6cb3caa54dd6': 'assets/camara-de-pe.jpg',
  '9c09ecf2ecc1abff8b6651354e836fd7': 'assets/exercicio-demo.png',
  'b626aed8978b838a2df9629b529f0ae7': 'assets/profissional.jpg',
  '4fea790a2b6f45f7ea30e37bf09b04f7': 'assets/logo-therapease.svg',
  'ea9a09c2b00f711868d2fff9d3ca1c4c': 'assets/camara-deitado.jpg'
};
const CAMERA_IMGS = ['assets/camara-bracos.jpg', 'assets/camara-de-pe.jpg', 'assets/camara-deitado.jpg'];
const H_VARIANT = { E01: 'E01H', E02: 'E02H', E03: 'E03H', E04: 'E04H', E05: 'E05H', E06: 'E06H', E07: 'E07H', E08: 'E08H', E16: 'E16H', E20: 'E20H' };

// ---------- session state shared between screens ----------
window.TE = { series: [], lastReps: null };

configure({
  base: 'screens/',
  hooks: {
    patchSource(name, src) {
      src = src.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => BLOB[id] || m);
      src = src.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/g, ''); // fontes locais (pasta fonts)
      if (/^E06/.test(name)) {
        src = src.replace("'gggggyryyyyyyyy'", "(window.TE.lastReps || 'gggggyryyyyyyyy')");
        src = src.replace("const col = { g: '#00e156', r: '#ff3b30', y: 'rgba(255,226,4,0.9)' }", "const col = { g: '#00e156', r: '#ff3b30', y: 'rgba(255,226,4,0.9)', o: 'rgba(255,255,255,0.18)' }");
      }
      if (/^E1[45]/.test(name) && window.TE && window.TE.series.length) {
        // o mesmo círculo das séries mostra o resultado real das séries do último exercício feito
        const st = (window.TE.series.join('') + 'pppp').slice(0, 4);
        src = src.replace(/states="[a-zA-Z]{4}" countdown="0" big=/, `states="${st}" countdown="0" big=`);
      }
      if (/^E07/.test(name)) {
        src = src.replace("'gggggyryyyyyyyy'", "(window.TE.lastReps || 'gggggyryyyyyyyy')");
        src = src.replace('states="Ycpp"', 'states="{{wheelStates}}"');
        src = src.replace('return { dots', "return { wheelStates: (window.TE.series.length ? window.TE.series[window.TE.series.length - 1].toUpperCase() : 'Y') + 'cpp', dots");
        src = src.replace("const col = { g: '#00e156', r: '#ff3b30', y: 'rgba(255,226,4,0.9)' }", "const col = { g: '#00e156', r: '#ff3b30', y: 'rgba(255,226,4,0.9)', o: 'rgba(255,255,255,0.18)' }");
      }
      return src;
    },
    skipElement(node) {
      const st = node.getAttribute && node.getAttribute('style') || '';
      return /width: 152px; height: 5px; border-radius: 100px/.test(st); // desenho do indicador de início do iPhone
    },
    replaceComponent(name, props, host) {
      if (name === 'CmpStatusBar') { const d = document.createElement('div'); d.style.cssText = 'width:440px;height:53px'; host.appendChild(d); return true; }
      return false;
    }
  }
});

// ---------- stage & scaling ----------
const stage = document.getElementById('stage');
let boards = {};
let current = null; // { name, inst, wrap, controller }

async function loadBoards() {
  try { const bd = await getBundle(); const c = bd ? bd.canvas : await (await fetch('screens/canvas.json?v=30')).json(); for (const [f, b] of Object.entries(c.boards)) boards[f.replace('.dc.html', '')] = b; } catch (e) {}
}
function isLandscape() { return window.innerWidth > window.innerHeight; }
const codeOf = n => n.split('-')[0];
const byCode = c => Object.keys(boards).find(k => codeOf(k) === c) || c;
function variantFor(name) {
  const c = codeOf(name);
  if (isLandscape() && H_VARIANT[c]) return byCode(H_VARIANT[c]);
  const base = c.replace(/H$/, '');
  if (!isLandscape() && c.endsWith('H') && H_VARIANT[base] === c) return byCode(base);
  return name;
}
// Margens de segurança do iPhone (barra de estado / Dynamic Island e indicador de início)
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
document.body.appendChild(probe);
const safe = () => { const cs = getComputedStyle(probe); return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }; };
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// O viewport real é o próprio #stage (position: fixed; height: 100dvh): medimos a caixa em vez de o deduzir de innerHeight/screen.
// iOS (modo ecrã principal, barra de estado "black-translucent"): em algumas versões o viewport de layout fica
// mais curto do que o ecrã pela altura da área segura de cima; os elementos fixos são cortados nesse limite e por baixo
// aparece o fundo da página (o retângulo claro no fundo). Correção: o documento passa a medir 100% + a área segura de cima,
// o que devolve ao viewport a altura total do ecrã. Aplicada só quando o problema é detetado.
let DEFICIT = 0;
function screenFull(vw, vh) { return vw > vh ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height); }
function viewportSize() {
  const r = stage.getBoundingClientRect();
  const vw = r.width || window.innerWidth, vh = r.height || window.innerHeight;
  DEFICIT = 0;
  if (standalone() && screen && screen.height) {
    const full = screenFull(vw, vh);
    if (full - vh > 1 && full - vh < 120) {
      DEFICIT = full - vh;
      if (!document.documentElement.classList.contains('vp-fix')) { document.documentElement.classList.add('vp-fix'); requestAnimationFrame(() => requestAnimationFrame(layout)); }
    }
  }
  return { vw, vh };
}
// diagnóstico: 4 toques rápidos no topo do ecrã mostram as medidas do viewport
let dbgTaps = [];
document.addEventListener('pointerdown', e => {
  if (e.clientY > 70) return; const t = Date.now(); dbgTaps = dbgTaps.filter(x => t - x < 1500); dbgTaps.push(t);
  if (dbgTaps.length >= 4) { dbgTaps = []; const cs = getComputedStyle(probe); toast(`v17 · inner ${innerWidth}×${innerHeight} · ecrã ${screen.width}×${screen.height} · stage ${Math.round(stage.getBoundingClientRect().height)} · safe ${cs.paddingTop}/${cs.paddingBottom} · falta ${DEFICIT} · fix ${document.documentElement.classList.contains('vp-fix')} · standalone ${standalone()}`); }
}, true);
// Mede até onde vai o conteúdo real do ecrã (em px do desenho), para o scroll acabar exatamente onde o conteúdo acaba.
function measureContent(root) {
  const R = root.getBoundingClientRect(); const k = R.width / root.offsetWidth || 1; const H = root.offsetHeight;
  let maxB = 0;
  const walk = el => {
    for (const c of el.children) {
      const st = getComputedStyle(c);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      const r = c.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const bt = (r.bottom - R.top) / k, tp = (r.top - R.top) / k;
        const fullHeight = st.position === 'absolute' && Math.abs(bt - H) < 1.5 && tp < H * 0.5; // camadas de fundo / sobreposições do ecrã inteiro
        if (!fullHeight) maxB = Math.max(maxB, bt);
      }
      if (st.overflow === 'visible' || st.display === 'contents') walk(c);
    }
  };
  walk(root);
  return maxB;
}
function layout() {
  if (!current) return;
  const b = boards[current.name] || {};
  const w = b.w || 440, h = b.h || 956;
  const { vw, vh } = viewportSize();
  const sa = safe();
  const landscapeDesign = w > h;
  const inner = current.wrap.firstElementChild;
  const root = inner.firstElementChild;
  const bar = document.getElementById('fixed-bar');
  if (landscapeDesign || !current.light) {
    // Ecrãs de ecrã inteiro (câmara, exercício, horizontais): o desenho inteiro cabe no ecrã, proporções mantidas, sem scroll.
    // Ecrã inteiro: o desenho cabe todo, e o fundo do ecrã (root) estica até ao limite inferior do viewport — nunca fica uma faixa por baixo.
    const s = Math.min(vw / w, vh / h);
    inner.style.transform = `scale(${s})`;
    // O ecrã (root) passa a ter exatamente o tamanho do viewport em px do desenho: o fundo e a câmara chegam aos quatro limites.
    const Hd = Math.max(h, vh / s), Wd = Math.max(w, vw / s);
    if (root) { root.style.height = Hd + 'px'; root.style.width = Wd + 'px'; }
    current.wrap.style.width = Wd * s + 'px'; current.wrap.style.height = Hd * s + 'px';
    current.wrap.style.margin = '0';
    stage.style.overflowY = 'hidden'; stage.scrollTop = 0;
    return;
  }
  // Ecrãs de conteúdo: proporções do desenho (largura do ecrã = 440 px do desenho), sem margens extra.
  const s = vw / w;
  inner.style.transform = `scale(${s})`;
  const fixedH = [...bar.children].reduce((t, c) => t + (parseFloat(c.dataset.h) || 0), 0); // px do desenho
  const bottomLine = Math.max(sa.bottom, 8); // linha da área segura inferior do iPhone
  if (fixedH) {
    // a pílula do menu fica logo acima do indicador de início (≈20 pt do fundo num iPhone com Face ID), sem margem extra
    bar.style.bottom = `calc(max(8px, env(safe-area-inset-bottom) - 14px) - ${4 * s}px)`;
    bar.style.height = fixedH * s + 'px';
    for (const c of bar.children) { c.style.transform = `scale(${s})`; c.style.height = (parseFloat(c.dataset.h) * s) + 'px'; }
  }
  const visD = vh / s;
  const need = current.contentB + (fixedH ? 16 + fixedH + bottomLine / s : Math.max(8, sa.bottom / s - 8));
  const Hd = Math.max(visD, need);
  if (root) root.style.height = Hd + 'px';
  current.wrap.style.width = vw + 'px'; current.wrap.style.height = Hd * s + 'px'; current.wrap.style.margin = '0';
  stage.style.overflowY = Hd > visD + 0.5 ? 'auto' : 'hidden';
  const top = document.getElementById('fixed-top');
  if (top.firstElementChild) { top.style.height = (parseFloat(top.firstElementChild.dataset.h) * s) + 'px'; top.firstElementChild.style.transform = `scale(${s})`; }
  const scrim = document.getElementById('status-scrim');
  if (scrim) scrim.style.height = (sa.top + 10) + 'px';
}
window.addEventListener('resize', () => {
  layout();
  if (current) { const v = variantFor(current.name); if (v !== current.name) go(v, { replace: true }); }
});

export async function go(name, opts = {}) {
  if (codeOf(name) === 'Main') return splashToLogin();
  name = variantFor(name);
  if (current) { current.controller && current.controller.stop && current.controller.stop(); current.inst.destroy(); clearTimers(); }
  stopSpeech();
  document.querySelectorAll('.help-ov').forEach(e => e.remove());
  const wrap = document.createElement('div'); wrap.className = 'screen-wrap';
  const inner = document.createElement('div'); inner.className = 'screen-inner'; wrap.appendChild(inner);
  const inst = new Instance(name, {}, inner, null);
  current = { name, inst, wrap };
  await inst.init();
  stage.replaceChildren(wrap); stage.scrollTop = 0; inner.style.transform = 'scale(1)';
  const root = inner.querySelector(':scope > div');
  const bg = root ? root.style.background || '' : '';
  const light = !/11363c|17, 54, 60/i.test(bg);
  const solid = /f5fcfb|245, 252, 251/i.test(bg);
  const pageBg = !light ? '#11363c' : solid ? '#f5fcfb' : '#a6c1c3'; // cor do fundo do ecrã junto ao limite inferior
  document.body.style.background = pageBg; document.documentElement.style.background = pageBg;
  stage.style.background = !light ? '#11363c' : solid ? '#f5fcfb' : 'linear-gradient(160deg, #fafefd 0%, #d5e5e2 52%, #8eaeb2 100%)';
  const sc = solid ? '245,252,251' : '213,229,226';
  document.getElementById('status-scrim').style.background = `linear-gradient(180deg, rgba(${sc},0.96) 0%, rgba(${sc},0.85) 70%, rgba(${sc},0) 100%)`;
  current.light = light;
  // Zonas fixas: caixa de escrever (data-fixed="bottom") e menu inferior ficam fixos no fundo; cabeçalho data-fixed="top" fica fixo em cima.
  const fixedBar = document.getElementById('fixed-bar'); fixedBar.replaceChildren();
  const fixedTop = document.getElementById('fixed-top'); fixedTop.replaceChildren();
  if (light) {
    const moveTo = (el, zone, hD) => { const holder = document.createElement('div'); holder.dataset.h = hD; holder.style.cssText = `transform-origin:0 0;width:440px;position:relative`; const box = document.createElement('div'); box.style.cssText = `position:relative;width:440px;height:${hD}px`; holder.appendChild(box); box.appendChild(el); zone.appendChild(holder); };
    const sizeOf = el => { const r = el.getBoundingClientRect(); const k = root.getBoundingClientRect().width / root.offsetWidth || 1; return r.height / k; };
    for (const el of inner.querySelectorAll('[data-fixed="top"]')) {
      // o cabeçalho fixo leva consigo a zona da barra de estado (fundo opaco), para o conteúdo passar por baixo sem se misturar com as horas
      const k = root.getBoundingClientRect().width / root.offsetWidth || 1; const hD = (el.getBoundingClientRect().bottom - root.getBoundingClientRect().top) / k;
      moveTo(el, fixedTop, hD); el.parentElement.style.background = el.style.background || '#f5fcfb';
    }
    for (const el of inner.querySelectorAll('[data-fixed="bottom"]')) { const hD = sizeOf(el); el.style.position = 'relative'; el.style.top = '0'; el.style.left = '0'; el.style.bottom = 'auto'; moveTo(el, fixedBar, hD); }
    const barHost = inner.querySelector('[data-cmp="CmpBottomBar"]');
    if (barHost) moveTo(barHost, fixedBar, 75);
  }
  current.contentB = root ? measureContent(root) : 0;
  layout();
  const hash = '#/' + name;
  if (opts.replace) history.replaceState(null, '', hash); else if (location.hash !== hash) history.pushState(null, '', hash);
  if (root && root.querySelector('[data-scroll-end]')) stage.scrollTop = stage.scrollHeight; // conversas abrem na mensagem mais recente
  updateScrim();
  setupScreen(name, root, inst);
}
function updateScrim() { const sc = document.getElementById('status-scrim'); if (sc) sc.classList.toggle('on', !!(current && current.light && stage.scrollTop > 2 && !document.getElementById('fixed-top').firstElementChild)); }
stage.addEventListener('scroll', updateScrim, { passive: true });
window.addEventListener('popstate', () => { const n = location.hash.slice(2); if (n && (!current || n !== current.name)) go(n, { replace: true }); });
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (a.dataset.help) { e.preventDefault(); openHelp(a.dataset.help); return; }
  if (a.dataset.action === 'testar-som') { e.preventDefault(); speak('Está a ouvir bem? É assim que vai ouvir as indicações durante a sessão.'); return; }
  const m = href.match(/([A-Za-z0-9-]+)\.dc\.html$/);
  if (m) { e.preventDefault(); go(m[1]); }
});


// ---------- pop-up de ajuda (botão «?» nos cartões com legenda) ----------
const RING = (c) => `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="${c}" stroke-width="5"/></svg>`;
const ICO = (d, c) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const LINE = (c, dash) => `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M1 10H19" stroke="${c}" stroke-width="${dash ? 2 : 3}" ${dash ? 'stroke-dasharray="3 3"' : ''} stroke-linecap="round"/></svg>`;
const HELP = {
  progresso: { t: 'Como ler o progresso semanal', rows: [
    [RING('#e38b4a'), 'Feito face ao previsto', 'O anel exterior enche-se com a parte da sessão que fez.'],
    [RING('#1e5c66'), 'Qualidade média', 'O anel interior mostra como correram os movimentos: quanto mais cheio, melhor.'],
    [RING('#98b7b1'), 'Dia sem sessão feita', 'Anel vazio: ainda não fez ou não estava prevista sessão.']] },
  calendario: { t: 'O que significam os símbolos', rows: [
    [ICO('M5 12l5 5l10 -10', '#0e5841'), 'Concluída', 'Fez a sessão toda.'],
    [ICO('M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18M12 3v18', '#8c4530'), 'Parcial', 'Fez só uma parte dos exercícios.'],
    [ICO('M10 4v16M14 4v16', '#a8543a'), 'Interrompida', 'Parou a sessão antes do fim.'],
    [ICO('M18 6l-12 12M6 6l12 12', '#b83300'), 'Perdida', 'A sessão estava prevista e não foi feita.'],
    [ICO('M12 7v5l3 3M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18', '#1e5c66'), 'Agendada', 'Sessão marcada para esse dia.']] },
  tendencias: { t: 'Como ler as tendências', rows: [
    [LINE('#587274', true), 'Média das 8 semanas anteriores', 'A linha tracejada é o ponto de comparação.'],
    [LINE('#1e5c66', false), 'Últimas 4 semanas', 'As barras escuras mostram as semanas mais recentes.'],
    ['<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#d8eee9;font-size:12px;font-weight:700;color:#1e5c66">A melhorar</span>', 'Estado', 'Compara as últimas 4 semanas com as 8 anteriores.']] }
};
function openHelp(key) {
  const h = HELP[key]; if (!h) return;
  const ov = document.createElement('div');
  ov.className = 'help-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', h.t);
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(17,54,60,0.55);display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif';
  ov.innerHTML = `<div style="width:min(377px,calc(100vw - 48px));box-sizing:border-box;border-radius:12px;background:#f5fcfb;padding:20px 28px;display:flex;flex-direction:column;gap:20px;box-shadow:0 12px 32px rgba(0,0,0,0.18)">
<h2 style="margin:0;font-size:28px;line-height:34px;font-weight:600;color:#1e5c66;text-align:center">${h.t}</h2>
<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">${h.rows.map(r => `<li style="display:flex;gap:12px;align-items:flex-start"><span style="flex-shrink:0;min-width:20px;padding-top:2px">${r[0]}</span><span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:17px;line-height:22px;color:#11363c">${r[1]}</b><span style="font-size:15px;line-height:20px;color:#1f5953">${r[2]}</span></span></li>`).join('')}</ul>
<button type="button" style="height:50px;border:0;border-radius:12px;background:#1e5c66;color:#fff;font-size:24px;font-weight:500;font-family:Nunito,sans-serif">Percebi</button></div>`;
  const close = () => { ov.remove(); stopSpeech(); };
  ov.querySelector('button').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov); speak(h.t + '. ' + h.rows.map(r => r[1] + ': ' + r[2]).join(' '));
  ov.querySelector('button').focus();
}

// ---------- loading → login ----------
import { runSplash } from './splash.js?v=30';
async function splashToLogin() {
  await go(byCode('A02'), { replace: true });
  const root = current.wrap.querySelector('.screen-inner > div');
  const logo = root.querySelector('img[alt="TherapEase"]');
  const others = [...root.children].filter(c => c !== logo && !c.contains(logo));
  logo.style.visibility = 'hidden';
  others.forEach(c => { c.style.opacity = '0'; c.style.transform = (c.style.transform || '') + ' translateY(14px)'; c.dataset.splash = '1'; });
  const r = logo.getBoundingClientRect();
  const { vw, vh } = viewportSize();
  await runSplash({ vw, vh, target: { left: r.left, top: r.top, width: r.width, height: r.height }, onReveal: () => {
    logo.style.visibility = 'visible';
    others.forEach((c, i) => { c.style.transition = `opacity .55s ${0.08 * i}s, transform .55s ${0.08 * i}s cubic-bezier(.2,.7,.2,1)`; c.style.opacity = '1'; c.style.transform = c.style.transform.replace(' translateY(14px)', ''); });
  } });
}

// ---------- timers ----------
let timers = [];
function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

// ---------- audio: voice + beep ----------
let audioCtx = null, unlocked = false, wakeLock = null;
function unlock() {
  if (unlocked) return; unlocked = true;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); loadGoalSound(); } catch (e) {}
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
  requestWakeLock();
}
async function requestWakeLock() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && unlocked) requestWakeLock(); });
document.addEventListener('pointerdown', unlock, { capture: true });
let ptVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  ptVoice = vs.find(v => /pt[-_]PT/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
}
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch (e) {}
export function speak(text) {
  if (!text || localStorageGet('te-voz') === 'off') return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-PT'; if (ptVoice) u.voice = ptVoice; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
}
function stopSpeech() { try { speechSynthesis.cancel(); } catch (e) {} }
// Som de objetivo atingido (assets/sons/objetivo.mp3): tocado uma vez por repetição, quando os membros ficam verdes.
let goalBuf = null;
function loadGoalSound() {
  if (goalBuf || !audioCtx) return;
  goalBuf = 'loading';
  fetch('assets/sons/objetivo.mp3').then(r => r.arrayBuffer()).then(a => new Promise((ok, ko) => audioCtx.decodeAudioData(a, ok, ko))).then(b => { goalBuf = b; }).catch(() => { goalBuf = null; });
}
function goalSound() {
  if (!audioCtx) return;
  if (!(goalBuf instanceof AudioBuffer)) { loadGoalSound(); return; }
  const src = audioCtx.createBufferSource(), g = audioCtx.createGain(); g.gain.value = 0.9;
  src.buffer = goalBuf; src.connect(g).connect(audioCtx.destination); src.start();
}
export function beep() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = 880; o.type = 'sine'; g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.3);
}
function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

// ---------- camera ----------
let stream = null;
async function getStream() {
  if (stream) return stream;
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  return stream;
}
function replaceCameraImages(root) {
  const vids = [];
  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (!CAMERA_IMGS.includes(src)) continue;
    const v = document.createElement('video');
    v.setAttribute('playsinline', ''); v.muted = true; v.autoplay = true;
    v.style.cssText = img.style.cssText + ';transform:scaleX(-1);background:#11363c';
    v.className = 'live-camera';
    img.replaceWith(v); vids.push(v);
  }
  if (vids.length) getStream().then(s => { for (const v of vids) { v.srcObject = s; v.play().catch(() => {}); } }).catch(err => toast('Sem acesso à câmara: ' + (err.message || err.name)));
  return vids;
}

// ---------- small dev toast ----------
function toast(msg) {
  let t = document.getElementById('dev-toast'); if (!t) { t = document.createElement('div'); t.id = 'dev-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 4000);
}

// ---------- per-screen behaviour ----------
const AUTO = [
  [/no fim da contagem/, 10000], [/automaticamente/, 4000], [/no fim da demonstração/, 5000],
  [/quando a leitura termina/, 5000], [/quando a calibração termina/, 8000], [/segue para a demonstração/, 2500], [/após a contagem/, 3000]
];
function tapLink(root) { return [...root.querySelectorAll('a[aria-label^="Continuar"]')][0] || null; }
function linkTarget(a) { const m = a && a.getAttribute('href').match(/([A-Za-z0-9-]+)\.dc\.html$/); return m ? m[1] : null; }

function setupScreen(name, root, inst) {
  if (codeOf(name) === 'C20') TE.justCalibrated = true;           // calibração acabou de ser concluída
  else if (codeOf(name) === 'C02') later(() => { TE.justCalibrated = false; }, 0); // o aviso só aparece nessa passagem
  const voice = VOICE[name];
  const vids = replaceCameraImages(root);
  const a = tapLink(root);
  const base = codeOf(name);
  const LIVE_EX = { E04: 0, E08: 1, E04H: 0, E08H: 1, E05: 0, E16: 0, E05H: 0, E16H: 0 };
  const POSITION = { C15: 'C', C16: 'C', C17: 'C', E18H: 'H', E19H: 'H' };
  if (base in LIVE_EX) { current.controller = exerciseController(base, root, inst, vids[0], a, LIVE_EX[base]); return; }
  if (base in POSITION) { current.controller = positionController(base, root, vids[0], a); if (voice) speak(voice[1]); return; }
  if (base === 'C19' || base === 'C23') { current.controller = trackOnlyController(root, vids[0]); }
  if (voice) later(() => speak(voice[1]), 300);
  if (a) { const lab = a.getAttribute('aria-label'); for (const [re, ms] of AUTO) if (re.test(lab)) { later(() => { const t = linkTarget(a); if (t) go(t); }, ms); break; } }
}

// ---------- live skeleton overlay ----------
function videoBox(v) { return { x: v.offsetLeft, y: v.offsetTop, w: v.offsetWidth || 440, h: v.offsetHeight || 783 }; }
function makeOverlay(root, v) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const W = parseFloat(root.style.width) || 440, H = parseFloat(root.style.height) || 956;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
  svg.setAttribute('aria-hidden', 'true');
  const paths = SKELETON.paths.map(d => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#ffffff'); p.setAttribute('fill-opacity', '0'); svg.appendChild(p); return p; });
  v.after(svg);
  return { svg, paths };
}
const ZCOL = { w: ['#ffffff', 0.2], g: ['#00E156', 0.9], o: ['#FF8A1F', 0.9] };
function drawSkeleton(ov, v, lm, zones) {
  if (!lm) { ov.paths.forEach(p => p.setAttribute('fill-opacity', '0')); return; }
  const box = videoBox(v); const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
  const sc = Math.max(box.w / vw, box.h / vh), dw = vw * sc, dh = vh * sc, ox = box.x + (box.w - dw) / 2, oy = box.y + (box.h - dh) / 2;
  const P = i => ({ x: ox + (1 - lm[i].x) * dw, y: oy + lm[i].y * dh, v: lm[i].visibility ?? 1 });
  const tr = SKELETON.transforms(P);
  tr.forEach((t, i) => {
    const p = ov.paths[i];
    if (!t) { p.setAttribute('fill-opacity', '0'); return; }
    const [c, o] = ZCOL[zones[i] || 'w'];
    p.setAttribute('transform', t); p.setAttribute('fill', c); p.setAttribute('fill-opacity', o);
  });
}

// ---------- geometry helpers ----------
function ang(ax, ay, bx, by) { const d = (Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) * 180 / Math.PI; return Math.abs(d); }
function pix(lm, i, v) { return { x: lm[i].x * (v.videoWidth || 1280), y: lm[i].y * (v.videoHeight || 720), vis: lm[i].visibility ?? 1 }; }

// ---------- exercise controller ----------
function exerciseController(name, root, inst, v, tap, seriesIdx) {
  const landscape = name.endsWith('H');
  if (tap) tap.remove();
  for (const n of inst.findAll(landscape ? 'CmpSkeletonH' : 'CmpSkeleton')) if (!(n.props && (n.props.demo === true || n.props.demo === 'true'))) n.host.style.display = 'none';
  const hud = inst.findAll(landscape ? 'CmpExerciseHudH' : 'CmpExerciseHud')[0];
  const dotsCmp = inst.findAll(landscape ? 'CmpRepDotsV' : 'CmpRepDots')[0];
  const prev = TE.series.slice(0, seriesIdx).join('');
  if (hud) hud.update({ states: (prev + 'wcpp').slice(0, 4), enter: 'true' }); // série atual ativa, a seguinte indicada como próxima (pisca)
  const TOTAL = 15; const reps = [];
  const setDots = () => dotsCmp && dotsCmp.update({ states: (reps.join('') + 'o'.repeat(TOTAL)).slice(0, TOTAL) });
  setDots();
  const ov = makeOverlay(root, v);
  const voice = VOICE[current.name];
  if (voice) later(() => speak(voice[1]), 900);
  let tooClose = false, closeSince = 0, goalHit = false, phase = 'down', maxA = 0, maxB = 0, flag = null, flagSince = 0, lastSpeak = 0, done = false;
  const zones = Array(12).fill('w');
  const finish = () => {
    if (done) return; done = true;
    const score = reps.reduce((s, r) => s + (r === 'g' ? 2 : r === 'y' ? 1 : 0), 0) / Math.max(1, reps.length);
    const letter = reps.length ? (score >= 1.5 ? 'g' : score >= 0.75 ? 'y' : 'r') : 'y';
    TE.series[seriesIdx] = letter; TE.series.length = seriesIdx + 1;
    TE.lastReps = (reps.join('') + 'o'.repeat(TOTAL)).slice(0, TOTAL);
    const next = { E04: 'E06', E05: 'E06', E16: 'E06', E04H: 'E06H', E05H: 'E06H', E16H: 'E06H', E08: 'E09', E08H: 'E14' }[name];
    go(byCode(next));
  };
  // toque duplo termina a série (atalho de teste)
  let lastTap = 0; const onTap = () => { const t = Date.now(); if (t - lastTap < 350) finish(); lastTap = t; };
  root.addEventListener('pointerdown', onTap);
  const stopPose = Pose.subscribe(v, lm => {
    if (done) return;
    if (!lm) { drawSkeleton(ov, v, lm, zones); return; }
    const now = performance.now();
    if (!landscape) {
      // Elevação de braços: ângulo braço–tronco em cada lado (0 = em baixo, 90 = à altura dos ombros)
      const side = (sh, el, hip) => { const S = pix(lm, sh, v), E = pix(lm, el, v), Hh = pix(lm, hip, v); return ang(E.x - S.x, E.y - S.y, Hh.x - S.x, Hh.y - S.y); };
      const aR = side(12, 14, 24), aL = side(11, 13, 23); // pessoa: direita / esquerda
      const GOAL = 80;
      zones.fill('w');
      // Demasiado perto da câmara: ombros muito largos no enquadramento ou pés fora da imagem
      const shW = Math.abs(lm[11].x - lm[12].x), feetOut = Math.max(lm[27].visibility ?? 1, lm[28].visibility ?? 1) < 0.35;
      const nowClose = shW > 0.34 || feetOut;
      if (nowClose) { closeSince = closeSince || now; } else { closeSince = 0; if (tooClose) { tooClose = false; lastSpeak = 0; } }
      if (closeSince && now - closeSince > 700) tooClose = true;
      if (tooClose) {
        zones.fill('o');
        if (now - lastSpeak > 5000) { lastSpeak = now; beep(); speak('Está demasiado perto. Afaste-se um pouco do telemóvel, até ver o corpo inteiro no ecrã.'); }
        drawSkeleton(ov, v, lm, zones); return; // não conta repetições enquanto a posição não for corrigida
      }
      if (aR >= GOAL) [0, 1, 2].forEach(i => zones[i] = 'g');
      if (aL >= GOAL) [9, 10, 11].forEach(i => zones[i] = 'g');
      if (aR >= GOAL && aL >= GOAL && !goalHit) { goalHit = true; goalSound(); }
      // correção localizada: um braço chegou ao objetivo e o outro ficou aquém
      const lag = aR >= GOAL && aL > 40 && aL < GOAL - 2 ? 'L' : aL >= GOAL && aR > 40 && aR < GOAL - 2 ? 'R' : null;
      if (lag) { if (flag !== lag) { flag = lag; flagSince = now; } } else if (flag && ((flag === 'L' && aL >= GOAL - 2) || (flag === 'R' && aR >= GOAL - 2) || Math.max(aL, aR) < 30)) flag = null;
      if (flag && now - flagSince > 900) {
        (flag === 'R' ? [0, 1, 2] : [9, 10, 11]).forEach(i => zones[i] = 'o');
        if (now - lastSpeak > 5000) { lastSpeak = now; beep(); speak(flag === 'R' ? 'Suba o braço direito um pouco mais, até onde for confortável.' : 'Suba o braço esquerdo um pouco mais, até onde for confortável.'); }
      }
      if (phase === 'down' && Math.min(aL, aR) >= 55) { phase = 'up'; maxA = 0; maxB = 0; }
      if (phase === 'up') { maxA = Math.max(maxA, aL); maxB = Math.max(maxB, aR); if (Math.max(aL, aR) < 30) { phase = 'down'; goalHit = false; const q = Math.min(maxA, maxB); reps.push(q >= 78 ? 'g' : q >= 62 ? 'y' : 'r'); setDots(); if (reps.length >= TOTAL) finish(); } }
    } else {
      // Quatro apoios, braço e perna opostos: extensão em relação ao tronco (180 = alinhado com o tronco)
      const mid = (a, b) => { const A = pix(lm, a, v), B = pix(lm, b, v); return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; };
      const Sm = mid(11, 12), Hm = mid(23, 24); const tx = Sm.x - Hm.x, ty = Sm.y - Hm.y;
      const armExt = (sh, wr) => { const S = pix(lm, sh, v), W = pix(lm, wr, v); return 180 - ang(tx, ty, W.x - S.x, W.y - S.y); };
      const legExt = (hip, an) => { const Hh = pix(lm, hip, v), A = pix(lm, an, v); return 180 - ang(-tx, -ty, A.x - Hh.x, A.y - Hh.y); };
      const aR = armExt(12, 16), aL = armExt(11, 15), lR = legExt(24, 28), lL = legExt(23, 27);
      const arm = Math.max(aR, aL), leg = Math.max(lR, lL), GOAL = 165;
      zones.fill('w');
      const armZ = aR >= aL ? [0, 1, 2] : [9, 10, 11], legZ = lR >= lL ? [7, 8] : [5, 6];
      if (arm >= GOAL) armZ.forEach(i => zones[i] = 'g');
      if (leg >= GOAL) legZ.forEach(i => zones[i] = 'g');
      if (arm >= GOAL && leg >= GOAL && !goalHit) { goalHit = true; goalSound(); }
      const lag = arm >= GOAL && leg > 120 && leg < GOAL - 3 ? 'leg' : leg >= GOAL && arm > 120 && arm < GOAL - 3 ? 'arm' : null;
      if (lag) { if (flag !== lag) { flag = lag; flagSince = now; } } else if (flag && (Math.min(arm, leg) >= GOAL - 3 || Math.max(arm, leg) < 125)) flag = null;
      if (flag && now - flagSince > 900) {
        (flag === 'leg' ? legZ : armZ).forEach(i => zones[i] = 'o');
        if (now - lastSpeak > 5000) { lastSpeak = now; beep(); speak(flag === 'leg' ? 'Suba a perna um pouco mais, até onde for confortável.' : 'Estique o braço um pouco mais, até onde for confortável.'); }
      }
      if (phase === 'down' && arm >= 150 && leg >= 150) { phase = 'up'; maxA = 0; maxB = 0; }
      if (phase === 'up') { maxA = Math.max(maxA, arm); maxB = Math.max(maxB, leg); if (arm < 125 && leg < 125) { phase = 'down'; goalHit = false; const q = Math.min(maxA, maxB); reps.push(q >= GOAL ? 'g' : q >= 152 ? 'y' : 'r'); setDots(); if (reps.length >= TOTAL) finish(); } }
    }
    drawSkeleton(ov, v, lm, zones);
  }, err => toast(err));
  return { stop() { stopPose(); root.removeEventListener('pointerdown', onTap); } };
}

// ---------- positioning controller (retângulo âmbar / verde) ----------
function positionController(name, root, v, tap) {
  const H = name.endsWith('H');
  const rect = H ? { x: 318, y: 64, w: 600, h: 300 } : { x: 125, y: 363, w: 190, h: 500 };
  if (tap) tap.style.pointerEvents = 'auto';
  const ov = makeOverlay(root, v);
  let insideSince = 0, outsideSince = performance.now(), moved = false;
  const target = linkTarget(tap);
  const stop = Pose.subscribe(v, lm => {
    drawSkeleton(ov, v, lm, Array(12).fill('w'));
    if (moved) return;
    const now = performance.now();
    let inside = false;
    if (lm) {
      const box = videoBox(v); const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
      const sc = Math.max(box.w / vw, box.h / vh), dw = vw * sc, dh = vh * sc, ox = box.x + (box.w - dw) / 2, oy = box.y + (box.h - dh) / 2;
      const keys = H ? [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28] : [0, 11, 12, 15, 16, 23, 24, 27, 28];
      const vis = keys.filter(i => (lm[i].visibility ?? 1) > 0.5);
      const pts = vis.map(i => ({ x: ox + (1 - lm[i].x) * dw, y: oy + lm[i].y * dh }));
      const needed = H ? vis.length >= 6 : [0, 27, 28].every(i => vis.includes(i)) || [0, 27].every(i => vis.includes(i));
      inside = needed && pts.every(p => p.x >= rect.x - 6 && p.x <= rect.x + rect.w + 6 && p.y >= rect.y - 6 && p.y <= rect.y + rect.h + 6);
    }
    if (inside) { outsideSince = 0; insideSince = insideSince || now; } else { insideSince = 0; outsideSince = outsideSince || now; }
    const go2 = n => { moved = true; go(n.includes('-') ? n : byCode(n)); };
    if (name === 'C15' && inside && now - insideSince > 600) go2('C17');
    else if (name === 'C15' && !inside && now - outsideSince > 3500) go2('C16');
    else if (name === 'C16' && inside && now - insideSince > 600) go2('C17');
    else if (name === 'C17' && !inside && now - outsideSince > 800) go2('C16');
    else if (name === 'C17' && inside && now - insideSince > 2000 && target) go2(target);
    else if (name === 'E18H' && inside && now - insideSince > 700) go2('E19H');
    else if (name === 'E19H' && !inside && now - outsideSince > 800) go2('E18H');
    else if (name === 'E19H' && inside && now - insideSince > 2500 && target) go2(target);
  }, err => toast(err));
  return { stop };
}

function trackOnlyController(root, v) {
  if (!v) return null;
  const ov = makeOverlay(root, v);
  const stop = Pose.subscribe(v, lm => drawSkeleton(ov, v, lm, Array(12).fill('w')), () => {});
  return { stop };
}

// ---------- start ----------
await loadBoards();
const start = location.hash.slice(2) || 'Main';
go(start, { replace: true });
if (!window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone && /iPhone|iPad/.test(navigator.userAgent)) {
  setTimeout(() => toast('Para ecrã inteiro: Partilhar → Adicionar ao ecrã principal'), 1500);
}
