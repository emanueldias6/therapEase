// Loading → Login: animação construída com as próprias peças do logótipo TherapEase (assets/logo-therapease.svg).
// 1) As duas "mãos" (arcos das extremidades do logótipo) aparecem no centro e rodam como uma roda de carregamento.
// 2) Surge o "T" (com a cabeça) no centro. 3) As restantes letras nascem do centro e abrem para a esquerda e para a direita.
// 4) As mãos voltam às extremidades. 5) O logótipo sobe para a posição do login. 6) As opções de login aparecem.
const SVGNS = 'http://www.w3.org/2000/svg';
const ease = 'cubic-bezier(.45,0,.2,1)';

function fitCircle(pts) {
  // ajuste de circunferência por mínimos quadrados (Kasa)
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = pts.length;
  for (const [x, y] of pts) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], B = [sxz, syz, sz];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A); const col = i => A.map((r, k) => r.map((v, j) => (j === i ? B[k] : v)));
  const a = det(col(0)) / D, b = det(col(1)) / D; return { x: a / 2, y: b / 2 };
}

export async function runSplash({ vw, vh, target, onReveal }) {
  const txt = await (await fetch('assets/logo-therapease.svg')).text();
  const svg = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.style.overflow = 'visible';
  const top = svg.firstElementChild; // grupo principal
  const [lettersG, handR, handL, dot] = [...top.children];
  const wrap = el => { const g = document.createElementNS(SVGNS, 'g'); el.replaceWith(g); g.appendChild(el); return g; };
  const letters = [...lettersG.children].map(wrap);
  const dotW = wrap(dot), handLW = wrap(handL), handRW = wrap(handR);

  const ov = document.createElement('div');
  ov.id = 'splash';
  ov.style.cssText = 'position:fixed;inset:0;z-index:30;background:#f5fcfb;overflow:hidden';
  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:${target.left}px;top:${target.top}px;width:${target.width}px;height:${target.height}px;transform-origin:50% 50%`;
  box.appendChild(svg); ov.appendChild(box); document.body.appendChild(ov);

  // geometria (coordenadas do logótipo 250×75)
  const tx = parseFloat(lettersG.getAttribute('transform').split(' ')[4]) || 15.38;
  const C = { x: 125, y: 37.5 };
  const centers = letters.map(g => { const b = g.getBBox(); return tx + b.x + b.width / 2; });
  const handCenter = (w, inner) => {
    const p = inner.querySelector('path'); const m = (inner.getAttribute('transform') || 'matrix(1 0 0 1 0 0)').match(/[-\d.]+/g).map(Number);
    const L = p.getTotalLength(); const pts = [];
    for (let i = 0; i < 80; i++) { const q = p.getPointAtLength(L * i / 80); pts.push([q.x + m[4], q.y + m[5]]); }
    return fitCircle(pts);
  };
  const cL = handCenter(handLW, handL), cR = handCenter(handRW, handR);
  for (const g of [...letters, dotW, handLW, handRW]) { g.style.transformBox = 'view-box'; }
  handLW.style.transformOrigin = `${cL.x}px ${cL.y}px`; handRW.style.transformOrigin = `${cR.x}px ${cR.y}px`;
  const tCenter = centers[0];
  letters.forEach(g => (g.style.opacity = 0)); dotW.style.opacity = 0;

  // posição inicial do conjunto: centro do ecrã
  const dx0 = vw / 2 - (target.left + target.width / 2), dy0 = vh / 2 - (target.top + target.height / 2);
  const Z = 1.5; // ligeiramente maior durante o carregamento
  box.style.transform = `translate(${dx0}px, ${dy0}px) scale(${Z})`;

  const T_IN = 0, SPIN = 1900, T_SHOW = 1500, EXPAND = 2150, EXP_D = 950, RISE = 3250, RISE_D = 750, REVEAL = 3750;
  // Roda de carregamento = asset "Loading wheel" do Figma (dois arcos, 12 posições de 30°), à volta do "T".
  const WHEEL = ['M78.2653 41.8537C77.5072 41.8618 76.7616 41.4858 76.3372 40.8015C68.9617 28.9516 56.1997 21.9675 42.1886 22.1252C30.4007 22.2531 19.3659 27.5443 11.918 36.6294C11.588 37.0276 11.7054 37.4235 11.799 37.6211C11.8927 37.8188 12.1308 38.1502 12.6516 38.143C12.9274 38.1375 13.1861 38.0221 13.3519 37.8132C15.3158 35.4178 18.489 31.9024 23.3712 29.0398C29.0943 25.6879 35.9325 23.9477 43.688 23.8578C44.9243 23.8436 45.9331 24.8263 45.9474 26.0535C45.9616 27.2808 44.9718 28.2823 43.7355 28.2964C28.5036 28.4665 21.0799 35.4078 16.8196 40.6087C15.8144 41.84 14.3118 42.5579 12.6982 42.574C10.5792 42.5954 8.68871 41.4345 7.76957 39.5408C6.85472 37.6506 7.11081 35.4601 8.44942 33.8263C16.7401 23.7145 29.0196 17.8285 42.1411 17.6866C49.8736 17.5994 57.505 19.5337 64.2081 23.2777C70.7071 26.9104 76.2201 32.1626 80.1382 38.4682C80.788 39.5085 80.4609 40.8764 79.413 41.5215C79.0577 41.7411 78.6581 41.85 78.2653 41.8537Z',
    'M9.63513 78.6021C10.3861 78.6009 11.1176 78.9838 11.5371 79.6696C18.7135 91.5179 31.2952 98.5995 45.2015 98.6126C56.9006 98.6253 67.9137 93.5095 75.4196 84.5809C75.7504 84.1885 75.6422 83.7965 75.5474 83.5984C75.4527 83.4002 75.2227 83.0687 74.7066 83.0683C74.4294 83.0698 74.1776 83.1837 74.007 83.3862C72.0297 85.74 68.8406 89.1872 63.9591 91.973C58.2416 95.2301 51.4326 96.878 43.7323 96.8723C42.5075 96.8732 41.5141 95.8862 41.5167 94.6662C41.5192 93.4462 42.5099 92.4641 43.7389 92.4667C58.8546 92.4803 66.3122 85.6819 70.6005 80.57C71.6173 79.3639 73.1152 78.6697 74.7138 78.6703C76.8132 78.6726 78.6747 79.8469 79.5682 81.7412C80.4577 83.632 80.1745 85.806 78.8275 87.4122C70.4795 97.3481 58.2202 103.044 45.1997 103.029C37.5224 103.021 29.9701 101.011 23.3637 97.2146C16.9565 93.5349 11.5537 88.2525 7.73908 81.9506C7.11048 80.9086 7.44753 79.5521 8.49719 78.928C8.85543 78.7129 9.25093 78.613 9.63997 78.6132L9.63513 78.6021Z'];
  const wOuter = document.createElementNS(SVGNS, 'g'); wOuter.setAttribute('transform', `translate(${C.x} ${C.y}) scale(0.68)`);
  const wFade = document.createElementNS(SVGNS, 'g'); const wSpin = document.createElementNS(SVGNS, 'g'); const wIn = document.createElementNS(SVGNS, 'g');
  wIn.setAttribute('transform', 'translate(-43.8 -60.4)');
  for (const d of WHEEL) { const pth = document.createElementNS(SVGNS, 'path'); pth.setAttribute('d', d); pth.setAttribute('fill', '#1E5C66'); wIn.appendChild(pth); }
  wSpin.appendChild(wIn); wFade.appendChild(wSpin); wOuter.appendChild(wFade); svg.appendChild(wOuter);
  let step = 0; const spinT = setInterval(() => { step = (step + 1) % 12; wSpin.setAttribute('transform', `rotate(${step * 30})`); }, 100);
  wFade.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: EXPAND + 300, fill: 'forwards' });
  setTimeout(() => clearInterval(spinT), EXPAND + 400);
  // as "mãos" do logótipo só aparecem quando as letras abrem: saem do centro (onde estava a roda) para as extremidades
  const hand = (el, c) => {
    const d = `${C.x - c.x}px, ${C.y - c.y}px`;
    const k = EXPAND / (EXPAND + EXP_D);
    el.animate([
      { transform: `translate(${d}) rotate(360deg) scale(.7)`, opacity: 0, offset: 0 },
      { transform: `translate(${d}) rotate(360deg) scale(.7)`, opacity: 0, offset: k, easing: ease },
      { transform: 'translate(0px, 0px) rotate(720deg) scale(1)', opacity: 1, offset: 1 }
    ], { duration: EXPAND + EXP_D, fill: 'forwards', easing: 'linear' });
  };
  hand(handLW, cL); hand(handRW, cR);
  // "T" (com a cabeça) no centro
  const tDx = C.x - tCenter;
  for (const el of [letters[0], dotW]) {
    el.animate([
      { transform: `translate(${tDx}px, 0px) scale(.4)`, opacity: 0, offset: 0 },
      { transform: `translate(${tDx}px, 0px) scale(1)`, opacity: 1, offset: 450 / (EXPAND - T_SHOW + EXP_D) },
      { transform: `translate(${tDx}px, 0px) scale(1)`, opacity: 1, offset: (EXPAND - T_SHOW) / (EXPAND - T_SHOW + EXP_D), easing: ease },
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 1 }
    ], { duration: EXPAND - T_SHOW + EXP_D, delay: T_SHOW, fill: 'forwards' });
    el.style.transformOrigin = el === dotW ? `${tCenter}px 40px` : `${tCenter - tx}px ${40 - 26.04}px`;
  }
  // restantes letras: nascem do centro e abrem para os dois lados ao mesmo tempo
  letters.slice(1).forEach((g, i) => {
    const d = C.x - centers[i + 1];
    g.style.transformOrigin = `${centers[i + 1] - tx}px 19px`;
    g.animate([
      { transform: `translate(${d}px, 0px) scale(.3)`, opacity: 0 },
      { transform: `translate(${d * 0.35}px, 0px) scale(.9)`, opacity: 1, offset: 0.45 },
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 }
    ], { duration: EXP_D, delay: EXPAND, fill: 'forwards', easing: ease });
  });
  // o logótipo sobe para a posição final do login
  box.animate([
    { transform: `translate(${dx0}px, ${dy0}px) scale(${Z})` },
    { transform: 'translate(0px, 0px) scale(1)' }
  ], { duration: RISE_D, delay: RISE, fill: 'forwards', easing: ease });
  await new Promise(r => setTimeout(r, REVEAL));
  onReveal && onReveal();
  ov.style.transition = 'background-color .5s'; ov.style.backgroundColor = 'rgba(245,252,251,0)';
  await new Promise(r => setTimeout(r, 650));
  ov.remove();
}
