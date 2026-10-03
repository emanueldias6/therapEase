// Háptico: Android usa navigator.vibrate; no iPhone (Safari 18+) usa o truque do <input switch>,
// que dispara o motor háptico ao alternar. Numa app nativa: UIImpactFeedbackGenerator
// (.light no toque, .medium na ação principal) e UINotificationFeedbackGenerator (.success).
const PRESSABLE = 'a[href],button,[role="button"],[role="radio"]';
let label = null;
function iosTick() {
  if (!label) {
    label = document.createElement('label');
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', '');
    label.appendChild(i); document.body.appendChild(label);
  }
  label.click();
}
export function haptic(kind = 'light') {
  try {
    if (navigator.vibrate) { navigator.vibrate(kind === 'medium' ? 18 : kind === 'success' ? [12, 60, 18] : 10); return; }
    iosTick(); if (kind === 'success') setTimeout(iosTick, 90);
  } catch (e) {}
}
document.addEventListener('pointerdown', e => {
  const el = e.target.closest && e.target.closest(PRESSABLE);
  if (!el || /\(avança/.test(el.getAttribute('aria-label') || '')) return;
  const main = /background:\s*(#1e5c66|rgb\(30, 92, 102\))/i.test(el.getAttribute('style') || '');
  haptic(main ? 'medium' : 'light');
}, { capture: true, passive: true });
