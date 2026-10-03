// Deteção de pose (MediaPipe Pose Landmarker, no próprio dispositivo) e skeleton do asset fornecido.
const PATHS = ["M136.25 7C144.038 7 150.147 13.6845 149.448 21.4414L146.058 59.0364C145.601 64.112 141.346 68 136.25 68C131.154 68 126.899 64.112 126.442 59.0364L123.052 21.4414C122.353 13.6845 128.462 7 136.25 7Z", "M136.25 71C141.184 71 145.15 75.0644 145.029 79.9973L143.934 124.502C143.832 128.673 140.422 132 136.25 132C132.078 132 128.668 128.673 128.566 124.502L127.471 79.9973C127.35 75.0644 131.316 71 136.25 71Z", "M136.25 136C140.666 136 144.524 138.985 145.632 143.26L147.111 148.964C148.953 156.069 143.59 163 136.25 163C128.91 163 123.547 156.069 125.389 148.964L126.868 143.26C127.976 138.985 131.834 136 136.25 136Z", "M38.8263 18.0139C38.2425 8.24377 46.0085 0 55.796 0H93.704C103.492 0 111.257 8.24379 110.674 18.0139L107.627 69.0139C107.09 77.9929 99.652 85 90.6569 85H58.8431C49.848 85 42.4098 77.9929 41.8733 69.0139L38.8263 18.0139Z", "M42.75 109C42.75 99.6112 50.3612 92 59.75 92H89.75C99.1388 92 106.75 99.6112 106.75 109V136C106.75 145.389 99.1388 153 89.75 153H59.75C50.3612 153 42.75 145.389 42.75 136V109Z", "M30.75 177.002C30.75 167.614 38.3601 160.003 47.7483 160.002L51.7351 160.002C61.8749 160.001 69.7609 168.82 68.6308 178.896L60.223 253.869C59.3842 261.349 53.0592 267.004 45.5326 267.004C37.3684 267.004 30.75 260.386 30.75 252.221V177.002Z", "M31.2717 283.96C30.9868 276.338 37.088 270.003 44.7154 270.002C52.3689 270.001 58.4819 276.375 58.1603 284.022L54.6587 367.285C54.4303 372.718 49.9598 377.004 44.5228 377.004C39.0673 377.004 34.5887 372.69 34.3849 367.238L31.2717 283.96Z", "M118.75 177.002C118.75 167.614 111.14 160.003 101.752 160.002L97.7649 160.002C87.6251 160.001 79.7391 168.82 80.8692 178.896L89.277 253.869C90.1158 261.349 96.4408 267.004 103.967 267.004C112.132 267.004 118.75 260.386 118.75 252.221V177.002Z", "M118.228 283.96C118.513 276.338 112.412 270.003 104.785 270.002C97.1311 270.001 91.0181 276.375 91.3397 284.022L94.8413 367.285C95.0697 372.718 99.5402 377.004 104.977 377.004C110.433 377.004 114.911 372.69 115.115 367.238L118.228 283.96Z", "M13.25 11C5.46164 11 -0.647297 17.6845 0.0520957 25.4414L3.44181 63.0364C3.89944 68.112 8.1538 72 13.25 72C18.3462 72 22.6006 68.112 23.0582 63.0364L26.4479 25.4414C27.1473 17.6845 21.0384 11 13.25 11Z", "M13.25 75C8.31563 75 4.34994 79.0644 4.47124 83.9973L5.56563 128.502C5.66818 132.673 9.07837 136 13.25 136C17.4216 136 20.8318 132.673 20.9344 128.502L22.0288 83.9973C22.1501 79.0644 18.1844 75 13.25 75Z", "M13.25 140C8.83387 140 4.97607 142.985 3.86778 147.26L2.38895 152.964C0.546942 160.069 5.9102 167 13.25 167C20.5898 167 25.9531 160.069 24.111 152.964L22.6322 147.26C21.5239 142.985 17.6661 140 13.25 140Z"];
// Âncoras de cada zona no asset (topo, base) e os pontos do corpo a que se ligam.
// Ordem do asset: braço dir. (3), peito, bacia, coxa esq., perna esq., coxa dir., perna dir., braço esq. (3).
// Com a imagem espelhada, o lado direito do ecrã é o lado direito da pessoa.
const Z = [
  { A: [136.25, 12], B: [136.25, 63], p: [12, 14] },
  { A: [136.25, 76], B: [136.25, 127], p: [14, 16] },
  { A: [136.25, 140], B: [136.25, 160], p: [16, 20] },
  { A: [74.75, 6], B: [74.75, 150], torso: true },
  { A: [74.75, 6], B: [74.75, 150], torso: true },
  { A: [49.7, 166], B: [47, 262], p: [23, 25] },
  { A: [44.7, 276], B: [44.7, 372], p: [25, 27] },
  { A: [99.2, 166], B: [102, 262], p: [24, 26] },
  { A: [104.8, 276], B: [104.8, 372], p: [26, 28] },
  { A: [13.25, 16], B: [13.25, 67], p: [11, 13] },
  { A: [13.25, 80], B: [13.25, 131], p: [13, 15] },
  { A: [13.25, 144], B: [13.25, 164], p: [15, 19] }
];
function tf(P, Q, A, B) {
  const dx = Q.x - P.x, dy = Q.y - P.y, len = Math.hypot(dx, dy); const al = Math.hypot(B[0] - A[0], B[1] - A[1]);
  if (len < 2) return null;
  const s = len / al; const deg = Math.atan2(dy, dx) * 180 / Math.PI - Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
  return `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) rotate(${deg.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-A[0]} ${-A[1]})`;
}
export const SKELETON = {
  paths: PATHS,
  transforms(P) {
    const mid = (a, b) => { const X = P(a), Y = P(b); return { x: (X.x + Y.x) / 2, y: (X.y + Y.y) / 2, v: Math.min(X.v, Y.v) }; };
    return Z.map(z => {
      let a, b;
      if (z.torso) { a = mid(11, 12); b = mid(23, 24); } else { a = P(z.p[0]); b = P(z.p[1]); }
      if (a.v < 0.3 || b.v < 0.3) return null;
      return tf(a, b, z.A, z.B);
    });
  }
};

let landmarker = null, loading = null, failed = null;
const subs = new Map(); let nextId = 1, running = false;
async function load() {
  if (landmarker) return landmarker;
  if (loading) return loading;
  loading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('../vendor/mediapipe/vision_bundle.mjs');
    const fileset = await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm', import.meta.url).href);
    let model = new URL('../models/pose_landmarker_lite.task', import.meta.url).href;
    try { const r = await fetch(model, { method: 'HEAD' }); if (!r.ok) throw 0; } catch (e) { model = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'; }
    const opts = d => ({ baseOptions: { modelAssetPath: model, delegate: d }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { landmarker = await PoseLandmarker.createFromOptions(fileset, opts('GPU')); }
    catch (e) { landmarker = await PoseLandmarker.createFromOptions(fileset, opts('CPU')); }
    return landmarker;
  })();
  return loading;
}
function loop() {
  if (!subs.size) { running = false; return; }
  running = true;
  if (landmarker) {
    const now = performance.now();
    for (const s of subs.values()) {
      const v = s.video;
      if (v.readyState < 2 || v.currentTime === s.lastT) continue;
      s.lastT = v.currentTime;
      let lm = null;
      try { const r = landmarker.detectForVideo(v, now); lm = r.landmarks && r.landmarks[0] ? r.landmarks[0] : null; } catch (e) { lm = null; }
      if (lm && s.prev) lm = lm.map((p, i) => { const q = s.prev[i]; const k = 0.55; return { x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k, z: p.z, visibility: p.visibility }; });
      s.prev = lm;
      try { s.cb(lm); } catch (e) { console.error(e); }
    }
  }
  requestAnimationFrame(loop);
}
export const Pose = {
  subscribe(video, cb, onError) {
    if (!video) return () => {};
    const id = nextId++; subs.set(id, { video, cb, lastT: -1, prev: null });
    load().catch(e => { failed = e; onError && onError('Deteção de movimento indisponível (precisa de internet na primeira utilização).'); });
    if (!running) requestAnimationFrame(loop);
    return () => subs.delete(id);
  },
  warmup() { return load(); },
  _emit(lm) { for (const s of subs.values()) try { s.cb(lm); } catch (e) { console.error(e); } } // só para testes
};
