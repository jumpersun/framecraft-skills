// reel.js: "Work Reel ’26", the kinetic-type cut. Every frame is a pure function of t (frames render in parallel).
// Layers per frame:  WebGL backgrounds (particle terrain, liquid marble, chrome knot) → 2D canvas (type, HUD, shapes)
// → WebGL post pass (RGB split, slice glitch, grain, vignette, flash) → #out. The render.mjs contract: window.ready,
// renderAt(t), renderSheet(...), gpuInfo(), globals DUR + PROJECT.
import * as THREE from '../../site/vendor/three/three.module.js';

const W = 1920, H = 1080, C = KCUE, S = C.S, Hh = C.hits, FPS = C.fps, BEAT = 60 / C.bpm;
window.DUR = C.dur; window.PROJECT = { audio: 'assets/kinetic.m4a' };
const K = { ink: '#0E0F0E', ink2: '#171917', cream: '#F1EEE6', lime: '#DDF53D', blue: '#2F3CFF', red: '#E8412F', grey: '#8B908A', mid: '#5E625D' };
const F = { cond: '"Anton"', wide: '"Archivo Black"', serif: '"Instrument Serif"', mono: '"JetBrains Mono"', zh: '"Noto Sans SC"' };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const backOut = x => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const beatPulse = (t, k = 7) => Math.exp(-((t / BEAT) % 1) * k);
const TAU = Math.PI * 2;

// ---------- canvases ----------
const out = document.getElementById('out');
const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
let ctx = c2.getContext('2d');   // swapped to an offscreen buffer while a transition renders its two scenes
const mainCtx = ctx;
const mkBuf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bufA = mkBuf(), bufB = mkBuf(), bufT = mkBuf();   // outgoing scene · incoming scene · text-mask scratch
let TRANS = false;                                       // true while a scene renders inside a transition
const RECT = {};                                         // rects scenes register for zoom-through transitions
const glA = document.createElement('canvas'); glA.width = W; glA.height = H;
const RA = new THREE.WebGLRenderer({ canvas: glA, antialias: true, alpha: true, preserveDrawingBuffer: true });
RA.setPixelRatio(1); RA.setSize(W, H, false);
const RP = new THREE.WebGLRenderer({ canvas: out, antialias: false, preserveDrawingBuffer: true });
RP.setPixelRatio(1); RP.setSize(W, H, false); RP.outputColorSpace = THREE.LinearSRGBColorSpace;

// ---------- GL layer 1: particle terrain ----------
const terrain = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  const nx = 220, nz = 140, pos = new Float32Array(nx * nz * 3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const k = (i * nz + j) * 3; pos[k] = (i / (nx - 1) - .5) * 26; pos[k + 1] = 0; pos[k + 2] = -j / (nz - 1) * 30 + 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, amp: { value: 1 }, fade: { value: 1 }, tint: { value: new THREE.Color(K.cream) } },
    vertexShader: `uniform float time, amp; varying float vA;
      float wave(vec2 p, float t){ return sin(p.x*.5+t*.9)*.45 + sin(p.y*.38-t*.7)*.6 + sin((p.x+p.y)*.27+t*.5)*.7 + sin(length(p-vec2(3.,-9.))*.8-t*1.4)*.4; }
      void main(){ vec3 p = position; p.y = wave(p.xz, time)*amp; vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = 5.5 * (6.0 / -mv.z); float d = -mv.z; vA = clamp(1.0 - d/30.0, 0., 1.) * (.25 + .75*smoothstep(-1.2, 1.6, p.y)) * smoothstep(0.5, 3.5, d);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; uniform vec3 tint; varying float vA;
      void main(){ vec2 c = gl_PointCoord-.5; float r = dot(c,c); if (r>.25) discard; gl_FragColor = vec4(tint, vA*fade*(1.0-r*2.5)); }`,
  });
  scene.add(new THREE.Points(g, mat));
  return (t, o = {}) => {
    mat.uniforms.time.value = t; mat.uniforms.amp.value = o.amp ?? 1; mat.uniforms.fade.value = o.fade ?? 1;
    cam.position.set(Math.sin(t * .15) * 1.5, o.camY ?? 3.2, 5 - (o.push ?? 0)); cam.lookAt(0, -.4, -8); cam.rotation.z += o.roll ?? 0;
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 2: liquid marble (domain-warped fbm, banded) ----------
const liquid = (() => {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, strips: { value: 0 }, stripAmt: { value: 0 }, zoom: { value: 1.6 }, seed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float time, strips, stripAmt, zoom, seed; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec2 uv = vUv; vec2 p = (uv-.5)*vec2(res.x/res.y,1.)*zoom + seed;
        if (strips > 0.) { float s = floor(uv.x*strips); p.y += (h(vec2(s,3.))-.5)*stripAmt; p.x += (h(vec2(s,7.))-.5)*stripAmt*.25; }
        vec2 q = vec2(fbm(p + time*.06), fbm(p + vec2(5.2,1.3) - time*.05));
        vec2 r = vec2(fbm(p + 3.6*q + vec2(1.7,9.2) + time*.13), fbm(p + 3.6*q + vec2(8.3,2.8) - time*.11));
        float f = fbm(p + 3.8*r);
        float band = sin(f*22.0 + r.x*7.0)*.5+.5;
        vec3 blue = vec3(.19,.24,1.), red = vec3(.93,.33,.23), lil = vec3(.75,.68,.98), navy = vec3(.06,.07,.32), cream = vec3(.98,.9,.86);
        vec3 col = mix(blue, red, smoothstep(.38,.62,f));
        col = mix(col, lil, smoothstep(.62,.95,band)*.55);
        col = mix(col, navy, smoothstep(.55,.95,1.0-f)*.75);
        col = mix(col, cream, smoothstep(.93,1.,band)*smoothstep(.45,.7,f)*.5);
        gl_FragColor = vec4(col,1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.strips.value = o.strips || 0; u.stripAmt.value = o.stripAmt || 0; u.zoom.value = o.zoom ?? 1.6; u.seed.value = o.seed || 0;
    RA.setClearColor(0x000000, 1); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 3: chrome torus knot (matcap + inked outline) ----------
const knot = (() => {
  const mc = document.createElement('canvas'); mc.width = mc.height = 256; const m = mc.getContext('2d');
  m.fillStyle = '#202020'; m.fillRect(0, 0, 256, 256);
  let g = m.createRadialGradient(96, 84, 4, 128, 128, 132);
  [[0, '#ffffff'], [.18, '#f2f2f2'], [.38, '#b9b9b9'], [.55, '#5c5c5c'], [.7, '#262626'], [.84, '#9d9d9d'], [.93, '#e6e6e6'], [1, '#5a5a5a']].forEach(([s, c]) => g.addColorStop(s, c));
  m.fillStyle = g; m.beginPath(); m.arc(128, 128, 128, 0, TAU); m.fill();
  g = m.createLinearGradient(0, 120, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = g; m.fillRect(0, 120, 256, 50);
  const tex = new THREE.CanvasTexture(mc); tex.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9);
  const geo = new THREE.TorusKnotGeometry(1.25, .34, 360, 48, 2, 3);
  const body = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({ matcap: tex }));
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0e0f0e, side: THREE.BackSide })); hull.scale.setScalar(1.045);
  const grp = new THREE.Group(); grp.add(hull, body); scene.add(grp);
  return (t, o = {}) => {
    grp.rotation.set(t * .55 + (o.r0 || 0), t * .8, t * .25);
    grp.position.set(o.x ?? 1.9, o.y ?? 0, 0); grp.scale.setScalar(o.s ?? 1);
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 4: a particle cloud that condenses into a thyroid (two lobes + isthmus) ----------
// k = 0: a loose shell (dust / embedding space) · k = 1: the gland. Points 0–2 can be highlighted (retrieved chunks);
// cloud.project(i, t, o) gives a point's screen position for 2D overlays (same maths as the shader, minus the wobble).
const cloud = (() => {
  const n = 9000, A = new Float32Array(n * 3), Bp = new Float32Array(n * 3), R = new Float32Array(n), ID = new Float32Array(n);
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const inside = (x, y) => {
    for (const s of [-1, 1]) { const cx = s * .62, cy = .05, a = -s * .28, dx = x - cx, dy = y - cy, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); if ((u / .36) ** 2 + (v / .72) ** 2 < 1) return true; }
    return Math.abs(x) < .42 && y > -.42 && y < -.12;
  };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * TAU, r = 2.4 + rnd() * 1.3, q = Math.sqrt(1 - u * u);
    A.set([Math.cos(th) * q * r * 1.45, u * r * .8, Math.sin(th) * q * r], i * 3);
    let x, y; do { x = rnd() * 2.2 - 1.1; y = rnd() * 1.8 - .8; } while (!inside(x, y));
    Bp.set([x * 1.6, y * 1.6, (rnd() - .5) * .45], i * 3);
    R[i] = rnd(); ID[i] = i;
  }
  // move three front-and-centre shell points into slots 0–2 (the highlighted "retrieved chunks")
  let slot = 0;
  for (let i = 3; i < n && slot < 3; i++) {
    const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2];
    if (Math.abs(x) < 1.8 && Math.abs(y) < 1 && z > 1.2 && (slot === 0 || Math.hypot(x - A[0], y - A[1]) > .9) && (slot < 2 || Math.hypot(x - A[3], y - A[4]) > .9)) {
      for (const arr of [A, Bp]) for (let c = 0; c < 3; c++) { const tmp = arr[slot * 3 + c]; arr[slot * 3 + c] = arr[i * 3 + c]; arr[i * 3 + c] = tmp; }
      const tr = R[slot]; R[slot] = R[i]; R[i] = tr; slot++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(A.slice(), 3)); g.setAttribute('a', new THREE.BufferAttribute(A, 3));
  g.setAttribute('b', new THREE.BufferAttribute(Bp, 3)); g.setAttribute('r', new THREE.BufferAttribute(R, 1)); g.setAttribute('id', new THREE.BufferAttribute(ID, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, k: { value: 0 }, hi: { value: 0 }, size: { value: 4 }, fade: { value: 1 } },
    vertexShader: `attribute vec3 a; attribute vec3 b; attribute float r; attribute float id; uniform float time, k, hi, size; varying float vA; varying vec3 vC;
      void main(){
        float kk = clamp(k*1.4 - r*.4, 0., 1.); kk = kk*kk*(3.-2.*kk);
        vec3 wa = a + vec3(sin(time*.5+r*20.)*.08, cos(time*.4+r*13.)*.08, 0.);
        vec3 wb = b + vec3(sin(time*1.3+r*40.)*.015, cos(time*1.1+r*30.)*.015, 0.);
        vec4 mv = modelViewMatrix*vec4(mix(wa, wb, kk), 1.);
        float isHi = step(id, 2.5) * hi;
        gl_PointSize = size * (1. + 5.*isHi) * (7.0 / -mv.z);
        vA = (.3 + .45*kk) * (1. + 2.5*isHi);
        vC = mix(vec3(.95,.93,.9), vec3(.87,.96,.24), min(1., step(.86, r) + isHi));
        vC = mix(vC, vec3(.91,.25,.18), step(.965, r)*(1.-isHi));
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; varying float vA; varying vec3 vC;
      void main(){ vec2 c = gl_PointCoord-.5; float d = dot(c,c); if (d>.25) discard; gl_FragColor = vec4(vC, vA*fade*(1.-d*3.)); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9); scene.add(pts);
  const pose = (t, o) => { pts.rotation.set(.12 * Math.sin(t * .3), o.rot ?? t * .25, 0); pts.position.set(o.x ?? 0, o.y ?? 0, 0); pts.scale.setScalar(o.s ?? 1); pts.updateMatrixWorld(); };
  const fn = (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.k.value = o.k ?? 0; u.hi.value = o.hi ?? 0; u.fade.value = o.fade ?? 1; u.size.value = o.size ?? 4;
    pose(t, o); RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam); return glA;
  };
  const v = new THREE.Vector3();
  fn.project = (i, t, o = {}) => {
    let kk = clamp((o.k ?? 0) * 1.4 - R[i] * .4); kk = kk * kk * (3 - 2 * kk);
    pose(t, o); v.set(lerp(A[i * 3], Bp[i * 3], kk), lerp(A[i * 3 + 1], Bp[i * 3 + 1], kk), lerp(A[i * 3 + 2], Bp[i * 3 + 2], kk)).applyMatrix4(pts.matrixWorld).project(cam);
    return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H];
  };
  return fn;
})();

// ---------- post pass ----------
const post = (() => {
  const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.NoColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: tex }, split: { value: 0 }, slice: { value: 0 }, seed: { value: 0 }, grain: { value: .05 }, time: { value: 0 }, vign: { value: .5 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) }, res: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D tex; uniform float split, slice, seed, grain, time, vign, flash; uniform vec3 flashCol; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y*28.0 + h(vec2(seed,1.))*3.0), hb = h(vec2(band, seed));
        if (hb < slice) uv.x += (h(vec2(band, seed+2.)) - .5) * .16 * slice;
        vec2 d = vec2(split, split*.15);
        vec3 c = vec3(texture2D(tex, uv + d).r, texture2D(tex, uv).g, texture2D(tex, uv - d).b);
        c += (h(vUv*res + time*61.7) - .5) * grain;
        vec2 q = vUv - .5; c *= 1.0 - vign*dot(q,q)*.9;
        c = mix(c, flashCol, flash);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, fx) => {
    tex.needsUpdate = true;
    const u = mat.uniforms; u.split.value = fx.split; u.slice.value = fx.slice; u.seed.value = fx.seed; u.time.value = Math.floor(t * FPS);
    u.grain.value = fx.grain; u.vign.value = fx.vign; u.flash.value = fx.flash; u.flashCol.value.set(fx.flashCol);
    RP.render(scene, cam);
  };
})();

// ---------- 2D helpers ----------
let FX;
const font = (fam, size, weight = '') => `${weight} ${size}px ${fam}`.trim();
function txt(s, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha = o.a ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
  if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || K.cream; ctx.fillText(s, x, y); }
  ctx.restore();
}
// per-letter animation: fn(i, n) → { dx, dy, r, s, a }
function letters(s, x, y, o, fn) {
  ctx.save(); ctx.font = o.font; ctx.letterSpacing = (o.ls || 0) + 'px';
  const total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i]; if (ch === ' ') continue;
    const px = ctx.measureText(s.slice(0, i)).width, cw = ctx.measureText(ch).width, a = fn(i, n);
    if ((a.a ?? 1) <= 0.001) continue;
    ctx.save(); ctx.globalAlpha = a.a ?? 1; ctx.translate(x0 + px + cw / 2 + (a.dx || 0), y + (a.dy || 0)); ctx.rotate(a.r || 0); ctx.scale(a.s ?? 1, a.s ?? 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(ch, 0, 0); }
    if (o.fill !== null) { ctx.fillStyle = a.fill || o.fill || K.cream; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  }
  ctx.restore();
  return total;
}
const measure = (s, f, ls = 0) => { ctx.save(); ctx.font = f; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; };
const bg = col => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
function line(pts, col, lw = 2, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
function circle(x, y, r, o = {}) { if (!(r > .01)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.arc(x, y, r, o.a0 ?? 0, o.a1 ?? TAU); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// the Jelly mark: a dome and four tentacles. (x, y) = centre of the dome's base; r = dome radius; k = 0..1 build-in
function jelly(x, y, r, col, t, k = 1, rot = 0) {
  if (!(r > .01)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const dome = easeOut(seg(k, 0, .55));
  if (dome > 0) { ctx.beginPath(); ctx.arc(0, 0, r * dome, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
  const tk = seg(k, .35, 1);
  for (let i = 0; i < 4; i++) {
    const xi = (-0.6 + i * .4) * r, L = r * (1.05 + .25 * (i % 2)) * easeOut(seg(tk, i * .12, .6 + i * .12));
    if (L < 1) continue;
    ctx.lineWidth = r * .16; ctx.beginPath(); ctx.moveTo(xi, r * .12);
    for (let s = 1; s <= 8; s++) { const q = s / 8; ctx.lineTo(xi + Math.sin(t * 5 + i * 1.3 - q * 4) * r * .12 * q, r * .12 + L * q); }
    ctx.stroke();
  }
  ctx.restore();
}
function starburst(x, y, r, n, col, rot = 0, inner = .62) { if (!(r > .01)) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? r * inner : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function asterisk(x, y, r, col, lw = 5, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } ctx.restore(); }
function arrowNE(x, y, s, col, lw = 6) { line([[x, y + s], [x + s, y]], col, lw); line([[x + s * .35, y], [x + s, y], [x + s, y + s * .65]], col, lw); }
// HUD: corner brackets + micro-type in the four corners + a progress rule
function hud(t, o) {
  const dark = o.dark !== false, col = dark ? 'rgba(241,238,230,.85)' : 'rgba(14,15,14,.85)', dim = dark ? 'rgba(241,238,230,.45)' : 'rgba(14,15,14,.45)';
  const k = o.k ?? 1, m = 40, L = 26 * k;
  if (o.brackets !== false) for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) line([[cx, cy + sy * L], [cx, cy], [cx + sx * L, cy]], col, 2, k);
  const f = font(F.mono, 17, 500), a = clamp(k * 1.4 - .3);
  if (o.tl) txt(o.tl, m + 18, m + 30, { font: f, fill: col, ls: 2.5, a });
  if (o.tr) txt(o.tr, W - m - 18, m + 30, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.bl) txt(o.bl, m + 18, H - m - 18, { font: f, fill: col, ls: 2.5, a });
  if (o.br) txt(o.br, W - m - 18, H - m - 18, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.zh) txt(o.zh, o.zhRight ? W - m - 18 : m + 18, H - m - 52, { font: font(F.zh, 21, 500), fill: dim, ls: 3, align: o.zhRight ? 'right' : 'left', a });
  if (o.progress !== false) {   // the reel as a trace: one segment per chapter, filled as it plays
    const y = H - m + 10, x0 = m + 18, x1 = W - m - 18, X = s => lerp(x0, x1, s / C.dur);
    for (const [, a0, a1] of C.CH) {
      const xa = X(a0) + 3, xb = X(a1) - 3, on = t >= a0 && t < a1;
      line([[xa, y], [xb, y]], dim, 1, a * .6);
      if (t > a0) line([[xa, y], [Math.min(xb, X(t)), y]], col, on ? 3 : 2, a);
    }
  }
}
const tc = t => { const f = Math.floor(t * FPS), s = Math.floor(f / FPS), fr = f % FPS, p = n => String(n).padStart(2, '0'); return `TC 00:00:${p(s)}:${p(fr)}`; };
const sec = (i, name) => `■ ${String(i).padStart(2, '0')} / 03   ${name}`;
const glShot = (canvas, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(canvas, 0, 0, W, H); ctx.restore(); };
const count = (t, t0, t1, v0, v1) => Math.round(lerp(v0, v1, expoOut(seg(t, t0, t1))));

// ---------- scenes ----------
function sBoot(t) {
  bg(K.ink);
  glShot(terrain(t, { fade: ease(seg(t, .15, 1.6)) * (1 - .6 * seg(t, 3.2, 4)), amp: lerp(.2, 1.1, easeOut(seg(t, 0, 2.5))), push: t * .6 }));
  // the lime dot → Jelly mark
  const cx = W / 2, cy = H / 2 - 30;
  if (t > Hh.dot - .05) {
    const k = backOut(seg(t, Hh.dot, Hh.dot + .35)), p = beatPulse(t);
    if (t < Hh.mark) circle(cx, cy + 30, (14 + 10 * p) * k, { fill: K.lime });
    else { const r = 78 * backOut(seg(t, Hh.mark, Hh.mark + .4)); circle(cx, cy + 30, r * 1.9, { fill: 'rgba(221,245,61,.08)' }); jelly(cx, cy + 40, 70, K.lime, t, seg(t, Hh.mark, Hh.mark + .6)); }
  }
  txt('INITIALIZING', W / 2, H / 2 + 170, { font: font(F.mono, 18, 500), fill: 'rgba(241,238,230,.6)', ls: 8, align: 'center', a: seg(t, .6, 1) * (1 - seg(t, 2.8, 3.1)) });
  txt(String(count(t, .6, 3, 0, 100)).padStart(3, '0') + '%', W / 2, H / 2 + 210, { font: font(F.mono, 18, 700), fill: K.lime, ls: 4, align: 'center', a: seg(t, .6, 1) * (1 - seg(t, 2.8, 3.1)) });
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'BOOT'), br: '1920×1080 · 30 FPS · RENDERED IN CODE', zh: '作品集 · 2026', k: ease(seg(t, .15, .7)) });
  FX.flash = Math.max(0, 1 - Math.abs(t - 3.95) / .08) * .9 + (t > 3.9 ? seg(t, 3.9, 4) * .6 : 0);
}
function sEvery(t) {
  bg(K.ink);
  const lt = t - S.every, word = t < Hh.answer ? 'EVERY' : 'ANSWER', f = font(F.wide, 236);
  const flip = expoOut(seg(t, Hh.answer - .08, Hh.answer + .35)), scroll = (lt * 70) % 250;
  const rows = [-3, -2, -1, 1, 2, 3];
  for (const r of rows) {
    const y = H / 2 + 88 + r * 250 - scroll * (r < 0 ? -1 : 1) * .3 + (t < Hh.answer ? 0 : (1 - flip) * 250);
    txt(word, W / 2, y, { font: f, fill: null, stroke: 'rgba(241,238,230,.55)', lw: 2, align: 'center', a: 1 - Math.abs(r) * .22 });
  }
  const slam = t < Hh.answer ? backOut(seg(lt, 0, .35)) : backOut(seg(t, Hh.answer, Hh.answer + .3));
  ctx.save(); ctx.translate(W / 2, H / 2 + 88); ctx.scale(lerp(1.25, 1, slam), lerp(1.25, 1, slam));
  txt(word, 0, 0, { font: f, fill: K.cream, align: 'center', glow: 'rgba(241,238,230,.35)', glowR: 30 });
  ctx.restore();
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: '1920×1080 · 30 FPS · RENDERED IN CODE' });
  if (Math.abs(t - Hh.answer) < .1) { FX.split = .004 * (1 - Math.abs(t - Hh.answer) / .1); FX.slice = .3 * (1 - Math.abs(t - Hh.answer) / .1); FX.seed = 11; }
}
function sNeeds(t) {
  bg(K.cream); const lt = t - S.needs + .12;   // starts mid-motion: something is on screen from the cut frame
  circle(W / 2, H / 2, lerp(190, 128, expoOut(seg(lt, 0, .5))), { stroke: K.blue, lw: 2.5, a1: -Math.PI / 2 + TAU * expoOut(seg(lt, 0, .45)), a0: -Math.PI / 2 });
  circle(W / 2, H / 2 - 190, 7 * backOut(seg(lt, .15, .35)), { fill: K.red });
  ctx.save(); ctx.translate(W / 2, H / 2 + 36); const sc = lerp(1.35, 1, expoOut(seg(lt, 0, .4))); ctx.scale(sc, sc);
  txt('needs', 0, 0, { font: `italic 132px ${F.serif}`, fill: K.ink, align: 'center', a: seg(lt, 0, .12) });
  ctx.restore();
  hud(t, { dark: false, tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: 'EVERY ANSWER NEEDS —' });
}
function sEvid(t) {
  bg(K.blue); const lt = t - S.evid, f = font(F.wide, 250);
  const k = expoOut(seg(lt, 0, .28)), x = lerp(W * 1.3, W / 2, k);
  for (let i = 5; i >= 1; i--) txt('EVIDENCE', x + i * 70 * (1 - k) * 2.2, H / 2 + 90, { font: f, fill: K.cream, align: 'center', a: .12 * (1 - k) * (6 - i) });
  txt('EVIDENCE', x, H / 2 + 90, { font: f, fill: K.cream, align: 'center' });
  ctx.fillStyle = K.red; ctx.fillRect(1480, 250, 18, 64 * backOut(seg(lt, .2, .4)));
  txt('每个回答，都需要依据', W / 2, H / 2 + 200, { font: font(F.zh, 34, 500), fill: 'rgba(241,238,230,.85)', align: 'center', ls: 10, a: seg(lt, .3, .5) });
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'THESIS'), br: 'EVERY ANSWER NEEDS EVIDENCE.' });
  if (lt < .12) { FX.split = .006 * (1 - lt / .12); }
  if (t > Hh.glitchOut1) { const g = seg(t, Hh.glitchOut1, S.name); FX.slice = g; FX.split = .01 * g; FX.seed = Math.floor(t * FPS); }
}
function sName(t) {
  bg(K.ink); const lt = t - S.name;
  // a big dashed ring rotating
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * .12); ctx.setLineDash([2, 14]); circle(0, 0, 470, { stroke: 'rgba(241,238,230,.25)', lw: 2 }); ctx.restore();
  const f = font(F.wide, 172), fill = seg(t, Hh.nameFill - .05, Hh.nameFill + .1);
  const w = letters('ZHECHEN TU', W / 2, H / 2 + 60, { font: f, align: 'center', fill: null, stroke: K.cream, lw: 2.5 }, (i, n) => ({ a: seg(lt, i * .03, i * .03 + .1) }));
  if (fill > 0) txt('ZHECHEN TU', W / 2, H / 2 + 60, { font: f, fill: K.cream, align: 'center', a: fill, glow: 'rgba(241,238,230,.25)' });
  circle(W / 2 + w / 2 + 28, H / 2 + 44, 16 * backOut(seg(t, Hh.nameFill, Hh.nameFill + .3)), { fill: K.lime });
  txt('AI APPLICATION · AGENT ENGINEER', W / 2, H / 2 - 128, { font: font(F.mono, 22, 700), fill: 'rgba(241,238,230,.8)', ls: 7, align: 'center', a: seg(lt, .35, .55) });
  txt('every answer, with its source.', W / 2, H / 2 + 150, { font: `italic 50px ${F.serif}`, fill: K.cream, align: 'center', a: seg(lt, .7, .95) });
  txt('涂喆宸', W / 2, H / 2 + 222, { font: font(F.zh, 26, 500), fill: 'rgba(241,238,230,.55)', ls: 14, align: 'center', a: seg(lt, .9, 1.1) });
  hud(t, { tl: 'UW–MADISON CS ’27', tr: tc(t), bl: 'MICROSOFT CLOUD & AI ’26', br: 'UW SURGERY · CLINICAL AI' });
  if (lt < .3) { FX.split = .012 * (1 - lt / .3); FX.slice = .5 * (1 - lt / .3); FX.seed = Math.floor(t * FPS) + 3; }
}
function odometer(v0, v1, k, x, y, f, col) {   // digits roll from v0 to v1
  const s0 = String(v0), s1 = String(v1); ctx.save(); ctx.font = f;
  let xx = x; const hgt = parseFloat(f.match(/(\d+)px/)[1]) * .92;
  for (let i = 0; i < s1.length; i++) {
    const d0 = +s0[i], d1 = +s1[i], w = ctx.measureText(s1[i]).width, kk = expoOut(clamp(k * 1.2 - i * .15));
    ctx.save(); ctx.beginPath(); ctx.rect(xx - 10, y - hgt, w + 20, hgt * 1.12); ctx.clip();
    const steps = (d1 - d0 + 10) % 10 || 10, off = kk * steps;
    for (let j = -1; j <= steps + 1; j++) { const dy = (j - off) * hgt; if (Math.abs(dy) > hgt * 1.2) continue; ctx.fillStyle = col; ctx.fillText(String((d0 + j + 10) % 10), xx, y + dy); }
    ctx.restore(); xx += w;
  }
  ctx.restore(); return xx;
}
function tape(t, y, rot, col, fg, words, speed, dir, k) {
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(rot); ctx.translate(lerp(dir * W * 1.4, 0, expoOut(k)), 0);
  ctx.fillStyle = col; ctx.fillRect(-W * 1.5, -85, W * 3, 170);
  const f = font(F.cond, 128), unit = words.map(w => measure(w, f) + 170).reduce((a, b) => a + b, 0), off = ((t * speed) % unit + unit) % unit;
  let x = -W * 1.4 - off * dir;
  while (x < W * 1.5) for (const w of words) { txt(w, x, 50, { font: f, fill: fg }); const ww = measure(w, f); if (w !== '') { if (words.indexOf(w) % 2 === 0) asterisk(x + ww + 85, 0, 34, fg, 7, t); else arrowNE(x + ww + 55, -32, 62, fg, 8); } x += ww + 170; }
  ctx.restore();
}
function sEnd(t) {
  bg('#121412'); const lt = t - S.end;
  letters('ZHECHEN', 130, 560, { font: font(F.cond, 280), fill: K.cream }, i => { const k = seg(lt, i * .04, .4 + i * .04); return { dy: (1 - expoOut(k)) * 220, a: k > 0 ? 1 : 0 }; });
  letters('TU.', 130, 820, { font: font(F.cond, 280), fill: K.cream }, i => { const k = seg(lt, .25 + i * .05, .65 + i * .05); return { dy: (1 - expoOut(k)) * 220, a: k > 0 ? 1 : 0, fill: i === 2 ? K.lime : K.cream }; });
  const mk = seg(t, Hh.endMark, Hh.endMark + .8), p = beatPulse(t, 6);
  starburst(1470, 440, 150 * backOut(mk), 14, 'rgba(221,245,61,.14)', t * .3, .8);
  jelly(1470, 430, 118 * backOut(mk), K.lime, t, mk, .05 * Math.sin(t * 1.5));
  circle(1470, 430, (200 + 12 * p) * backOut(mk), { stroke: 'rgba(221,245,61,.35)', lw: 2 });
  // progress ring
  const pr = seg(lt, .8, 4.2); circle(1470, 800, 52, { stroke: 'rgba(241,238,230,.2)', lw: 3 }); circle(1470, 800, 52, { stroke: K.lime, lw: 3, a0: -Math.PI / 2, a1: -Math.PI / 2 + TAU * pr, a: seg(lt, .6, .9) });
  circle(1470 + Math.cos(-Math.PI / 2 + TAU * pr) * 52, 800 + Math.sin(-Math.PI / 2 + TAU * pr) * 52, 8, { fill: K.lime, a: seg(lt, .6, .9) });
  txt('AI APPLICATION & AGENT ENGINEER', 140, 900, { font: font(F.mono, 26, 700), fill: K.cream, ls: 6, a: seg(lt, .8, 1.1) });
  line([[140 + measure('AI APPLICATION & AGENT ENGINEER', font(F.mono, 26, 700), 6) + 24, 891], [140 + measure('AI APPLICATION & AGENT ENGINEER', font(F.mono, 26, 700), 6) + 24 + 120 * easeOut(seg(lt, 1, 1.5)), 891]], K.cream, 2);
  hud(t, { tl: 'SELECTED WORK — 2026', tr: 'ANSWERS WITH SOURCES.', bl: 'ztu29@wisc.edu', br: 'github.com/tuzhechen2005 ↗', brackets: false, k: seg(lt, .5, 1) });
  // outro: glitch, collapse to a dot, black
  if (t > Hh.glitchEnd) { const g = seg(t, Hh.glitchEnd, Hh.endDot); FX.slice = g; FX.split = .02 * g; FX.seed = Math.floor(t * FPS); }
  if (t > Hh.endDot) {
    const k = seg(t, Hh.endDot, Hh.endDot + .25);
    bg(K.ink); circle(W / 2, H / 2, lerp(60, 4, easeIn(k)) * (1 - seg(t, C.dur - .25, C.dur)), { fill: K.cream });
    FX.slice = 0; FX.split = 0;
  }
}

// ---------- v2 helpers ----------
function rrect(x, y, w, h, r, o = {}) { if (!(w > .5) || !(h > .5)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// a label chip, left edge at x, vertically centred on y; k = 0..1 wipe-in. Returns its width.
function chip(s, x, y, o = {}) {
  const f = o.font || font(F.mono, 18, 700), ls = o.ls ?? 2, w = measure(s, f, ls) + 28, h = o.h || 38, k = o.k ?? 1;
  if (k <= 0) return w;
  rrect(x, y - h / 2, w * easeOut(k), h, o.r ?? 0, { fill: o.bg || K.ink, stroke: o.line, lw: o.lw, a: o.a });
  if (k > .6) txt(s, x + 14, y + 6.5, { font: f, fill: o.fg || K.cream, ls, a: (o.a ?? 1) * seg(k, .6, 1) });
  return w;
}
function arrow(x0, y0, x1, y1, col, lw = 2, a = 1, head = 13) {
  if (a <= 0) return;
  line([[x0, y0], [x1, y1]], col, lw, a); const g = Math.atan2(y1 - y0, x1 - x0);
  line([[x1 - Math.cos(g - .45) * head, y1 - Math.sin(g - .45) * head], [x1, y1], [x1 - Math.cos(g + .45) * head, y1 - Math.sin(g + .45) * head]], col, lw, a);
}
// big number + small label under it
function stat(v, label, x, y, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  txt(v, x, y + (1 - easeOut(k)) * 24, { font: font(F.cond, o.size || 110), fill: o.col || K.cream, a: k, align: o.align });
  txt(label, x + (o.align === 'right' ? 0 : 4), y + (o.gap || 38), { font: font(F.mono, o.ls ? 16 : 17, 700), fill: o.sub || 'rgba(241,238,230,.7)', ls: 2.5, a: k, align: o.align });
}
const pad2 = n => String(n).padStart(2, '0');
// drop-in word: letters fall from above with overshoot
const dropWord = (s, x, y, f, t0, t, o = {}) => letters(s, x, y, { font: f, fill: o.fill || K.cream, align: o.align }, (i) => {
  const k = seg(t, t0 + i * (o.stag ?? .03), t0 + i * (o.stag ?? .03) + (o.dur ?? .32)); return { dy: (1 - expoOut(k)) * (o.fall ?? 220), a: k > 0 ? 1 : 0, fill: o.fillAt ? o.fillAt(i) : undefined };
});
const glitchIn = (lt, seed, d = .14, amt = .5) => { if (!TRANS && lt < d) { FX.slice = Math.max(FX.slice, amt * (1 - lt / d)); FX.split = Math.max(FX.split, .006 * (1 - lt / d)); FX.seed = seed; } };
const MSHUD = (t, o) => hud(t, { tr: tc(t), ...o });

// ---------- 01 MICROSOFT CLOUD & AI ----------
function sMs0(t) {
  bg(K.ink); const lt = t - S.ms0;
  glShot(terrain(t, { fade: .4, amp: .9, push: 2.5 + lt * .6, camY: 2.2 }));
  dropWord('MICROSOFT', 140, 520, font(F.cond, 300), Hh.msWord, t, { fall: 260 });
  txt('CLOUD & AI', 150, 655, { font: font(F.wide, 104), fill: null, stroke: K.lime, lw: 2.5, a: seg(t, Hh.msSub, Hh.msSub + .15) });
  const k = seg(t, Hh.msFive, Hh.msFive + .3);
  txt('05', 1460, 520, { font: font(F.cond, 300), fill: K.lime, a: k });
  txt('SYSTEMS', 1468, 575, { font: font(F.mono, 24, 700), fill: K.cream, ls: 8, a: k });
  txt('ONE SUMMER', 1468, 612, { font: font(F.mono, 24, 700), fill: 'rgba(241,238,230,.6)', ls: 8, a: seg(t, Hh.msFive + .2, Hh.msFive + .4) });
  txt('微软 · 云计算与人工智能事业部 · AI 应用开发工程师（实习）', 150, 745, { font: font(F.zh, 26, 500), fill: 'rgba(241,238,230,.6)', ls: 4, a: seg(lt, .7, 1) });
  const y = 840, x0 = 150, x1 = 1770, p = easeOut(seg(lt, .4, 1.9));
  line([[x0, y], [x1, y]], 'rgba(241,238,230,.25)', 1.5, seg(lt, .3, .5)); line([[x0, y], [lerp(x0, x1, p), y]], K.lime, 3, seg(lt, .3, .5));
  circle(lerp(x0, x1, p), y, 8, { fill: K.lime, a: seg(lt, .3, .5) });
  txt('2026.07', x0, y - 18, { font: font(F.mono, 18, 700), fill: K.cream, ls: 3, a: seg(lt, .4, .6) });
  txt('2026.09', x1, y - 18, { font: font(F.mono, 18, 700), fill: K.cream, ls: 3, align: 'right', a: seg(lt, 1.4, 1.7) });
  txt('AI APPLICATION ENGINEER · INTERN', (x0 + x1) / 2, y - 18, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.75)', ls: 4, align: 'center', a: seg(lt, .8, 1) });
  MSHUD(t, { tl: '01 / MICROSOFT CLOUD & AI', bl: sec(1, 'FOCUS'), br: 'AZURE · PHI-3 · SEMANTIC KERNEL · AUTOGEN' });
  glitchIn(lt, 61, .18, .7);
}
function sM1a(t) {
  bg(K.lime); const lt = t - S.m1a;
  [['CALL', 230, 390], ['THE RIGHT', 118, 530], ['TOOL.', 230, 760]].forEach(([w, s, y], li) => dropWord(w, 140, y, font(F.cond, s), S.m1a + li * .12, t, { fill: K.ink, fall: 120 }));
  const X0 = 1000, Y0 = 240, TS = 118, G = 16;
  const tp = j => [X0 + (j % 6) * (TS + G), Y0 + Math.floor(j / 6) * (TS + G)];
  const routed = 6, rk = seg(t, Hh.route, Hh.route + .2);
  // prompt chip → routed tool
  const pc = [1000, 870], [rx, ry] = tp(routed);
  if (rk > 0) { const e = easeOut(seg(t, Hh.route - .2, Hh.route + .15)); line([[pc[0] + 150, pc[1] - 20], [lerp(pc[0] + 150, rx + TS / 2, e), lerp(pc[1] - 20, ry + TS / 2, e)]], K.ink, 3); }
  for (let j = 0; j < 24; j++) {
    const k = seg(t, Hh.tiles + j * .035, Hh.tiles + j * .035 + .2); if (k <= 0) continue;
    const [x, y] = tp(j), on = j === routed && rk > 0, h = TS * easeOut(k);
    rrect(x, y + (TS - h) / 2, TS, h, 6, { fill: on ? K.cream : K.ink });
    if (k > .7) {
      txt('T' + pad2(j + 1), x + 12, y + 28, { font: font(F.mono, 17, 700), fill: on ? K.ink : 'rgba(241,238,230,.75)', ls: 1.5 });
      txt('{ }', x + TS / 2, y + TS / 2 + 26, { font: font(F.mono, 34, 700), fill: on ? K.blue : K.lime, align: 'center', a: .9 });
    }
  }
  if (rk > 0) { const [x, y] = tp(routed); rrect(x - 6, y - 6, TS + 12, TS + 12, 10, { stroke: K.ink, lw: 3, a: rk }); }
  chip('PROMPT · 中 / EN', pc[0], pc[1], { k: seg(t, Hh.route - .5, Hh.route - .25), bg: K.ink, fg: K.lime });
  txt('24 AZURE REST API TOOLS', X0, Y0 + 4 * (TS + G) + 20, { font: font(F.mono, 19, 700), fill: K.ink, ls: 3, a: seg(lt, .8, 1) });
  MSHUD(t, { dark: false, tl: '01.1 / TOOL-CALLING EVAL', bl: sec(1, 'TOOL CALLING'), br: 'LOCAL PHI-3 · AZURE RESOURCE MANAGEMENT', zh: '工具调用评测体系 · 320 条中英文测试指令', zhRight: true, brackets: false });
  glitchIn(lt, 71);
}
function sM1b(t) {
  bg(K.ink); const lt = t - S.m1b;
  dropWord('SIX WAYS TO', 140, 300, font(F.cond, 150), S.m1b, t, { fall: 140 });
  dropWord('BE WRONG.', 140, 450, font(F.cond, 150), S.m1b + .12, t, { fall: 140, fillAt: i => i >= 3 ? K.lime : K.cream });
  const dims = ['JSON VALIDITY', 'TOOL ROUTING', 'PARAM EXTRACTION', 'SCHEMA VALIDITY', 'FIELD F1', 'EXACT MATCH'];
  const cols = 64, cx0 = 620, cx1 = 1780, pitch = (cx1 - cx0) / (cols - 1), ry0 = 560, rp = 62;
  const p = seg(t, Hh.scan, Hh.scan + 1.5), head = p * cols;
  dims.forEach((d, r) => {
    const y = ry0 + r * rp, k = seg(lt, .15 + r * .05, .35 + r * .05);
    txt(d, 140, y + 7, { font: font(F.mono, 20, 700), fill: K.cream, ls: 2.5, a: k });
    for (let c = 0; c < cols; c++) {
      const x = cx0 + c * pitch, lit = c < head - r * .6, isHead = Math.abs(c - (head - r * .6)) < 1;
      circle(x, y, isHead ? 6.5 : 4.5, { fill: isHead ? K.lime : lit ? 'rgba(241,238,230,.85)' : 'rgba(241,238,230,.14)', a: k });
    }
  });
  if (p > 0 && p < 1) line([[cx0 + head * pitch, ry0 - 40], [cx0 + head * pitch, ry0 + 5 * rp + 30]], K.lime, 2, .6);
  const n = Math.round(1920 * p);
  txt(String(n).padStart(4, '0'), 1780, 430, { font: font(F.cond, 190), fill: K.lime, align: 'right' });
  txt('CHECKS · 320 PROMPTS × 6 DIMENSIONS', 1780, 478, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, align: 'right' });
  MSHUD(t, { tl: '01.2 / EVALUATION MATRIX', bl: sec(1, 'MEASURE FIRST'), br: 'EACH DOT = 5 PROMPTS', zh: '6 维评测矩阵', zhRight: true });
  glitchIn(lt, 81);
}
function sM1c(t) {
  bg(K.cream); const lt = t - S.m1c;
  dropWord('CONSTRAIN', 140, 360, font(F.cond, 170), S.m1c, t, { fill: K.ink, fall: 140 });
  dropWord('THE DECODER.', 140, 540, font(F.cond, 170), S.m1c + .12, t, { fill: K.ink, fall: 140, fillAt: i => i >= 4 ? K.blue : K.ink });
  txt('TARGET: PARAMETER HALLUCINATION', 146, 620, { font: font(F.mono, 20, 700), fill: K.ink, ls: 2.5, a: seg(lt, .4, .6) });
  txt('+ MULTI-TOOL CONFUSION', 146, 654, { font: font(F.mono, 20, 700), fill: K.mid, ls: 2.5, a: seg(lt, .5, .7) });
  // code panel: JSON typed under a schema; the next-token candidates, masked
  const px = 1010, py = 210, pw = 770, ph = 560;
  rrect(px, py, pw, ph, 14, { fill: K.ink, a: seg(lt, 0, .15) });
  for (let i = 0; i < 3; i++) circle(px + 28 + i * 22, py + 28, 6, { fill: ['#E8412F', '#DDF53D', '#8B908A'][i], a: seg(lt, .05, .2) });
  txt('guided_decoding.json', px + pw - 24, py + 34, { font: font(F.mono, 16, 500), fill: 'rgba(241,238,230,.45)', align: 'right', ls: 1 });
  const code = ['{', '  "tool": "T07",', '  "arguments": {', '    "param_1": "…",', '    "param_2": 3', '  }', '}'];
  const total = code.join('\n').length, shown = Math.floor(total * seg(t, Hh.type, Hh.type + 1.25));
  let used = 0, cur = [px + 40, py + 100];
  code.forEach((ln, i) => {
    const y = py + 100 + i * 44, n = clamp(shown - used, 0, ln.length); used += ln.length + 1;
    if (n <= 0) return;
    const s = ln.slice(0, n), f = font(F.mono, 27, 500);
    // simple syntax colours: keys cream, strings lime, numbers/punct grey
    ctx.save(); ctx.font = f; let x = px + 40;
    for (const part of s.split(/("[^"]*"?)/)) { if (!part) continue; ctx.fillStyle = /^"/.test(part) ? (part.endsWith(':') || /":?$/.test(part) && s.indexOf(part + ':') >= 0 ? K.cream : K.lime) : 'rgba(241,238,230,.6)'; ctx.fillText(part, x, y); x += ctx.measureText(part).width; }
    ctx.restore(); cur = [x2(px + 40, s, f), y];
  });
  function x2(x, s, f) { return x + measure(s, f); }
  if (Math.floor(t * 4) % 2 === 0 || shown < total) rrect(cur[0] + 4, cur[1] - 26, 14, 32, 1, { fill: K.lime });
  // candidates popover
  const mk = seg(t, Hh.mask, Hh.mask + .2);
  if (mk > 0) {
    const bx = px + 40, by = py + 420;
    txt('NEXT-TOKEN CANDIDATES · MASKED BY SCHEMA', bx, by - 14, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.55)', ls: 2, a: mk });
    const cands = [['"T07"', .62, true], ['"T7"', .21, false], ['"tool_7"', .1, false], ['}', .07, false]];
    cands.forEach(([s, pr, ok], i) => {
      const x = bx + i * 172, kk = seg(t, Hh.mask + i * .06, Hh.mask + i * .06 + .2);
      rrect(x, by, 160, 74, 6, { fill: ok ? 'rgba(221,245,61,.14)' : 'rgba(232,65,47,.12)', stroke: ok ? K.lime : 'rgba(232,65,47,.7)', lw: 1.5, a: kk });
      txt(s, x + 14, by + 32, { font: font(F.mono, 22, 700), fill: ok ? K.lime : 'rgba(241,238,230,.5)', a: kk });
      rrect(x + 14, by + 48, 132 * pr * easeOut(kk), 8, 2, { fill: ok ? K.lime : 'rgba(241,238,230,.35)', a: kk });
      if (!ok && kk > .5) line([[x + 10, by + 24], [x + 150, by + 24]], K.red, 3, seg(kk, .5, 1));
    });
  }
  const tags = [['OUTLINES GUIDED DECODING', K.ink, K.lime], ['FEW-SHOT CoT', K.ink, K.cream], ['NEGATIVE-SAMPLE ALIGNMENT', K.ink, K.cream], ['ABLATIONS: PROMPT · #TOOLS · PARAM LENGTH', K.blue, K.cream]];
  let tx = 140; tags.forEach(([s, b, f], i) => { tx += chip(s, tx, 870, { k: seg(t, Hh.tags[i], Hh.tags[i] + .2), bg: b, fg: f }) + 14; });
  MSHUD(t, { dark: false, tl: '01.3 / FIXES', bl: sec(1, 'STRUCTURED OUTPUT'), br: 'SCHEMATIC · NOT REAL TOOL NAMES', zh: '引导式解码 · 少样本思维链 · 负样本对齐 · 消融实验', brackets: false });
  glitchIn(lt, 91);
}
function sM1d(t) {
  bg(K.lime); const lt = t - S.m1d;
  glShot(knot(t, { x: 2.75, y: -1.25, s: .45 }));
  const f = font(F.cond, 400), k = seg(t, Hh.flip, Hh.flip + .9);
  const xEnd = odometer(61, 87, k, 150, 660, f, K.ink);
  txt('%', xEnd + 10, 660, { font: f, fill: K.ink });
  txt(k < .01 ? 'BEFORE' : k < 1 ? '→' : 'AFTER', 160, 210, { font: font(F.mono, 24, 700), fill: K.ink, ls: 8 });
  txt('PHI-3 COMPLETE-CALL ACCURACY', 160, 750, { font: font(F.mono, 25, 700), fill: K.ink, ls: 5 });
  txt('24 TOOLS · 320 ZH/EN PROMPTS · 6-DIM MATRIX', 160, 794, { font: font(F.mono, 19, 500), fill: 'rgba(14,15,14,.7)', ls: 3 });
  const lk = seg(t, Hh.lat, Hh.lat + .25), bx = 1080, bw = 600;
  txt('−28%', bx, 400, { font: font(F.cond, 200), fill: K.ink, a: lk });
  txt('AVG INFERENCE LATENCY', bx + 6, 450, { font: font(F.mono, 20, 700), fill: K.ink, ls: 3, a: lk });
  const sh = easeOut(seg(t, Hh.lat, Hh.lat + .7));
  txt('BEFORE', bx, 520, { font: font(F.mono, 15, 700), fill: 'rgba(14,15,14,.6)', ls: 2, a: lk }); rrect(bx, 532, bw, 20, 2, { fill: 'rgba(14,15,14,.25)', a: lk });
  txt('AFTER', bx, 590, { font: font(F.mono, 15, 700), fill: 'rgba(14,15,14,.6)', ls: 2, a: lk }); rrect(bx, 602, bw * lerp(1, .72, sh), 20, 2, { fill: K.ink, a: lk });
  MSHUD(t, { dark: false, tl: '01.4 / RESULT', bl: sec(1, 'EVALUATION'), br: 'INTERNAL EVAL SET', zh: '完整调用准确率 61% → 87% · 平均推理延迟 −28%', brackets: false });
}
function sM2(t) {
  bg(K.ink); const lt = t - S.m2;
  dropWord('REASON. ACT.', 140, 290, font(F.cond, 170), S.m2, t, { fall: 150 });
  const wR = measure('REASON. ACT. ', font(F.cond, 170));
  dropWord('CITE.', 140 + wR, 290, font(F.cond, 170), S.m2 + .25, t, { fall: 150, fill: K.lime });
  const N = [['RETRIEVE', 330], ['READ', 790], ['ANSWER', 1250]], ny = 580, nw = 290, nh = 110;
  N.forEach(([s, x], i) => {
    const k = seg(t, Hh.nodes[i], Hh.nodes[i] + .25), act = i === 2 && t > Hh.hops[4];
    rrect(x - nw / 2, ny - nh / 2, nw, nh, 55, { fill: act ? K.lime : K.ink2, stroke: act ? K.lime : 'rgba(241,238,230,.8)', lw: 2, a: k });
    txt(s, x, ny + 14, { font: font(F.cond, 50), fill: act ? K.ink : K.cream, align: 'center', a: k, ls: 2 });
    if (i < 2) arrow(x + nw / 2 + 10, ny, N[i + 1][1] - nw / 2 - 12, ny, 'rgba(241,238,230,.8)', 2.5, seg(t, Hh.nodes[i + 1], Hh.nodes[i + 1] + .2));
  });
  // loop: READ → RETRIEVE ("need more evidence")
  const lk = seg(t, Hh.nodes[2] + .3, Hh.nodes[2] + .6);
  if (lk > 0) { ctx.save(); ctx.globalAlpha = lk; ctx.strokeStyle = 'rgba(221,245,61,.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(790, ny - nh / 2 - 8); ctx.bezierCurveTo(740, 400, 380, 400, 330, ny - nh / 2 - 8); ctx.stroke(); ctx.restore(); arrow(345, ny - nh / 2 - 30, 330, ny - nh / 2 - 8, K.lime, 2.5, lk); txt('NEED MORE EVIDENCE', 560, 398, { font: font(F.mono, 16, 700), fill: K.lime, ls: 2, align: 'center', a: lk }); }
  // the token: RETRIEVE → READ → RETRIEVE → READ → ANSWER on the beat
  const path = [330, 790, 330, 790, 1250], hp = Hh.hops;
  if (t > hp[0] - .1) {
    let x = 330, y = ny;
    for (let i = 0; i < 4; i++) if (t >= hp[i]) { const k = ease(seg(t, hp[i], hp[i + 1] - .1)); x = lerp(path[i], path[i + 1], k); y = (i === 1) ? ny - nh / 2 - 8 - Math.sin(Math.PI * k) * 150 : ny; }
    const fa = 1 - seg(t, hp[4] - .15, hp[4]);
    circle(x, y, (14 + 6 * beatPulse(t)) * fa, { fill: K.lime }); circle(x, y, 30, { stroke: 'rgba(221,245,61,.4)', lw: 2, a: fa });
  }
  const guards = [['ARG VALIDATION', 560], ['DUP-CALL BLOCK', 1020], ['CITATION TRACE', 1250]];
  guards.forEach(([s, x], i) => { const w = measure(s, font(F.mono, 16, 700), 2) + 28; chip(s, x - w / 2, 700, { font: font(F.mono, 16, 700), k: seg(lt, 1.2 + i * .12, 1.4 + i * .12), bg: 'rgba(241,238,230,.1)', fg: K.cream, h: 34 }); });
  chip('BOUNDED RETRY', 180, 420, { font: font(F.mono, 16, 700), k: seg(lt, 1.6, 1.8), bg: 'rgba(221,245,61,.14)', fg: K.lime, h: 34 });
  [['85%', 'ANSWER ACCURACY'], ['92%', 'VALID CITATIONS'], ['95%', 'INVALID-OUTPUT RECOVERY']].forEach(([v, l], i) => stat(v, l, 1540, 470 + i * 150, { k: seg(t, Hh.stats2 + i * .15, Hh.stats2 + i * .15 + .25), size: 96, col: i === 1 ? K.lime : K.cream }));
  txt('SEMANTIC KERNEL · PHI-3 · LOCAL AZURE DOCS · 120 EVAL QUESTIONS', 140, 860, { font: font(F.mono, 19, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, a: seg(lt, .6, .9) });
  MSHUD(t, { tl: '01.5 / DOCUMENT REACT AGENT', bl: sec(1, 'AGENTS'), br: 'EXPLICIT STATE MACHINE', zh: '文档 ReAct 智能体 · 自主检索—文档读取—证据回答', zhRight: true });
  glitchIn(lt, 101);
}
function sM3(t) {
  bg(K.blue); const lt = t - S.m3;
  dropWord('PLAN. REVIEW.', 140, 290, font(F.cond, 170), S.m3, t, { fall: 150 });
  dropWord('REVISE.', 140 + measure('PLAN. REVIEW. ', font(F.cond, 170)), 290, font(F.cond, 170), S.m3 + .3, t, { fall: 150, fill: K.lime });
  const A = [520, 610], Bc = [1080, 610], R = 140, ck = backOut(seg(lt, .1, .5));
  circle(...A, R * ck, { fill: K.cream }); circle(...Bc, R * ck, { fill: K.ink });
  txt('PLANNER', A[0], A[1] + 16, { font: font(F.cond, 56), fill: K.blue, align: 'center', a: seg(lt, .3, .5) });
  txt('REVIEWER', Bc[0], Bc[1] + 16, { font: font(F.cond, 56), fill: K.cream, align: 'center', a: seg(lt, .3, .5) });
  // the round trip: an arc over (plan) and under (revise)
  const ak = seg(lt, .4, .7);
  if (ak > 0) {
    ctx.save(); ctx.globalAlpha = ak; ctx.strokeStyle = 'rgba(241,238,230,.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(A[0] + 60, A[1] - R); ctx.quadraticCurveTo(800, 380, Bc[0] - 60, Bc[1] - R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Bc[0] - 60, Bc[1] + R); ctx.quadraticCurveTo(800, 840, A[0] + 60, A[1] + R); ctx.stroke(); ctx.restore();
    arrow(Bc[0] - 90, Bc[1] - R - 16, Bc[0] - 60, Bc[1] - R, K.cream, 2.5, ak); arrow(A[0] + 90, A[1] + R + 16, A[0] + 60, A[1] + R, K.cream, 2.5, ak);
    txt('PLAN / RE-REVIEW', 800, 392, { font: font(F.mono, 16, 700), fill: K.cream, ls: 2, align: 'center', a: ak });
    txt('REVISE', 800, 838, { font: font(F.mono, 16, 700), fill: K.cream, ls: 2, align: 'center', a: ak });
  }
  // a packet makes one round trip per round
  const r0 = Hh.rounds[0];
  if (t > r0) {
    const ph = ((t - r0) % 1), top = ph < .5, q = ease(top ? ph * 2 : (ph - .5) * 2);
    const p0 = top ? [A[0] + 60, A[1] - R] : [Bc[0] - 60, Bc[1] + R], p1 = top ? [Bc[0] - 60, Bc[1] - R] : [A[0] + 60, A[1] + R], c = top ? [800, 380] : [800, 840];
    const x = (1 - q) * (1 - q) * p0[0] + 2 * (1 - q) * q * c[0] + q * q * p1[0], y = (1 - q) * (1 - q) * p0[1] + 2 * (1 - q) * q * c[1] + q * q * p1[1];
    rrect(x - 13, y - 13, 26, 26, 4, { fill: K.lime });
  }
  const rn = Hh.rounds.filter(r => t >= r).length;
  if (rn) { txt('ROUND ' + pad2(rn), 800, 625, { font: font(F.cond, 60), fill: K.lime, align: 'center' }); txt('BOUNDED', 800, 660, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.7)', ls: 4, align: 'center' }); }
  // 12 state-transition rules
  txt('12 STATE-TRANSITION RULES', 1400, 465, { font: font(F.mono, 17, 700), fill: K.cream, ls: 2.5, a: seg(lt, .8, 1) });
  for (let i = 0; i < 12; i++) {
    const x = 1400 + (i % 6) * 64, y = 490 + Math.floor(i / 6) * 64, on = t > Hh.rules + i * .125;
    rrect(x, y, 56, 52, 4, { fill: on ? K.lime : 'rgba(241,238,230,.12)', a: seg(lt, .8, 1) });
    txt('R' + pad2(i + 1), x + 28, y + 33, { font: font(F.mono, 16, 700), fill: on ? K.ink : 'rgba(241,238,230,.6)', align: 'center', a: seg(lt, .8, 1) });
  }
  txt('PYDANTIC DATA CONTRACTS', 1400, 650, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.7)', ls: 2.5, a: seg(lt, 1.2, 1.4) });
  stat('96%', 'STRUCTURED OUTPUT SUCCESS', 1400, 770, { k: seg(t, Hh.stats3, Hh.stats3 + .25), size: 92, col: K.lime, gap: 34 });
  stat('<60s', 'PER ARCHITECTURE PLAN', 1400, 900, { k: seg(t, Hh.stats3 + .15, Hh.stats3 + .4), size: 92, gap: 34 });
  txt('AUTOGEN · PHI-3 · VALIDATES RESOURCES, DEPENDENCIES & REVIEW ADOPTION', 140, 900, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.75)', ls: 2, a: seg(lt, 1, 1.3) });
  MSHUD(t, { tl: '01.6 / MULTI-AGENT ARCHITECTURE DESIGN', bl: sec(1, 'MULTI-AGENT'), br: 'AZURE ARCHITECTURE PLANS', zh: '多智能体 Azure 架构设计 · 规划—审查—修订—再审', zhRight: true });
  glitchIn(lt, 111);
}
function sM4(t) {
  bg(K.cream); const lt = t - S.m4;
  dropWord('INCIDENT', 140, 270, font(F.cond, 150), S.m4, t, { fill: K.ink, fall: 130 });
  const wi = measure('INCIDENT', font(F.cond, 150));
  arrow(140 + wi + 30, 222, 140 + wi + 30 + 150 * easeOut(seg(lt, .2, .45)), 222, K.ink, 12, 1, 36);
  dropWord('PLAN.', 140 + wi + 230, 270, font(F.cond, 150), S.m4 + .35, t, { fill: K.blue, fall: 130 });
  const st = ['STATUS FEEDS', 'RSS / ATOM', 'NORMALIZE', 'FINGERPRINT', 'LLM TRIAGE', 'SQLITE', 'REST API', 'DASHBOARD'];
  const sub = ['MICROSOFT PUBLIC', 'SAFE PARSING', 'SCHEMA', 'DEDUPE', 'SEVERITY · SCOPE', 'PERSIST', 'FASTAPI', '中文监控面板'];
  const bx = i => 100 + i * 220, by = 400, bw = 180, bh = 96;
  line([[100, by + bh / 2], [bx(7) + bw, by + bh / 2]], K.ink, 2, seg(lt, 0, .3));
  st.forEach((s, i) => {
    const k = seg(t, Hh.stages + i * .08, Hh.stages + i * .08 + .2), hot = i === 4, dd = i === 3;
    rrect(bx(i), by, bw, bh * easeOut(k), 8, { fill: hot ? K.lime : K.ink, stroke: dd ? K.red : null, lw: 3 });
    if (k > .7) { txt(s, bx(i) + bw / 2, by + 44, { font: font(F.mono, 17, 700), fill: hot ? K.ink : K.cream, ls: 1, align: 'center' }); txt(sub[i], bx(i) + bw / 2, by + 72, { font: i === 7 ? font(F.zh, 15, 500) : font(F.mono, 13, 700), fill: hot ? 'rgba(14,15,14,.7)' : 'rgba(241,238,230,.55)', ls: 1, align: 'center' }); }
  });
  // packets flow through; every 3rd is a duplicate and drops out at the fingerprint stage
  const dropX = bx(3) + bw / 2, v = 720;
  for (let i = 0; i < 18; i++) {
    const t0 = Hh.flow + i * .25; if (t < t0) continue;
    let x = 80 + (t - t0) * v, y = by + bh + 34, dup = i % 3 === 2, a = 1;
    if (dup && x > dropX) { const f = (t - (t0 + (dropX - 80) / v)); x = dropX + f * 40; y += 90 * f * f * 4; a = clamp(1 - f * 1.8); }
    if (x > bx(7) + bw) continue;
    rrect(x - 9, y - 9, 18, 18, 3, { fill: dup && x >= dropX ? K.red : K.ink, a });
  }
  txt('DUPLICATE → SKIPPED', dropX, by + bh + 120, { font: font(F.mono, 14, 700), fill: K.red, ls: 2, align: 'center', a: seg(lt, 1.6, 1.9) });
  // the assessment card
  const ck = seg(t, Hh.card, Hh.card + .3), cx = 1000, cy = 640, cw = 780, chh = 300;
  if (ck > 0) {
    line([[bx(4) + bw / 2, by + bh], [bx(4) + bw / 2, cy]], K.ink, 2, ck);
    rrect(cx, cy, cw, chh * easeOut(ck), 12, { fill: K.ink });
    if (ck > .8) {
      txt('INCIDENT ASSESSMENT · SCHEMA-VALIDATED', cx + 28, cy + 44, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.55)', ls: 2 });
      [['SEVERITY', .35], ['CONFIDENCE', .55], ['IMPACT SCOPE', .75]].forEach(([s, w], i) => { const kk = seg(t, Hh.card + .2 + i * .15, Hh.card + .5 + i * .15); txt(s, cx + 28, cy + 96 + i * 50, { font: font(F.mono, 18, 700), fill: K.cream, ls: 2 }); rrect(cx + 260, cy + 80 + i * 50, 440 * w * easeOut(kk), 22, 2, { fill: i === 0 ? K.lime : 'rgba(241,238,230,.75)' }); });
      txt('RESPONSE PLAN', cx + 28, cy + 262, { font: font(F.mono, 18, 700), fill: K.cream, ls: 2 });
      for (let j = 0; j < 6; j++) { const on = t > Hh.card + .7 + j * .12; rrect(cx + 260 + j * 76, cy + 240, 66, 34, 4, { fill: on ? K.lime : 'rgba(241,238,230,.15)' }); txt('§' + (j + 1), cx + 293 + j * 76, cy + 263, { font: font(F.mono, 16, 700), fill: on ? K.ink : 'rgba(241,238,230,.6)', align: 'center' }); }
    }
  }
  stat('98%', 'STRUCTURED OUTPUT VALID', 140, 790, { k: seg(t, Hh.stats4, Hh.stats4 + .25), size: 120, col: K.ink, sub: 'rgba(14,15,14,.7)' });
  stat('91%', 'TRIAGE ACCURACY', 520, 790, { k: seg(t, Hh.stats4 + .15, Hh.stats4 + .4), size: 120, col: K.blue, sub: 'rgba(14,15,14,.7)' });
  txt('200-EVENT EVAL · LLM + FASTAPI + SQLITE', 144, 880, { font: font(F.mono, 17, 700), fill: 'rgba(14,15,14,.6)', ls: 2.5, a: seg(t, Hh.stats4 + .3, Hh.stats4 + .5) });
  MSHUD(t, { dark: false, tl: '01.7 / INCIDENT RESPONSE AGENT', bl: sec(1, 'PIPELINES'), br: 'SEVERITY · CONFIDENCE · IMPACT · 6-PART PLAN', zh: '事件响应智能体', zhRight: true, brackets: false });
  glitchIn(lt, 121);
}
function sM5(t) {
  bg(K.ink); const lt = t - S.m5;
  dropWord('FAIL', 140, 390, font(F.cond, 260), S.m5, t, { fall: 200 });
  dropWord('SAFE.', 140, 640, font(F.cond, 260), S.m5 + .15, t, { fall: 200, fill: K.lime });
  // error map
  const ex = 760; txt('ERROR MAP', ex, 300, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, .2, .4) });
  ['TIMEOUT', 'RATE LIMIT', 'AUTH', 'INVALID OUTPUT'].forEach((s, i) => {
    const k = seg(t, Hh.rows[i], Hh.rows[i] + .2), y = 380 + i * 80;
    txt(s, ex, y, { font: font(F.cond, 50), fill: K.cream, a: k });
    arrow(ex + 345, y - 16, ex + 345 + 70 * easeOut(k), y - 16, K.lime, 2.5, k);
    if (k > .6) line([[ex + 440, y - 18], [ex + 450, y - 6], [ex + 470, y - 30]], K.lime, 4, seg(k, .6, 1));
  });
  let cx = ex; ['ERROR MAPPING', 'BOUNDED RETRY', 'SAFE DEGRADE'].forEach((s, i) => { cx += chip(s, cx, 700, { font: font(F.mono, 15, 700), k: seg(t, Hh.rows[3] + .3 + i * .12, Hh.rows[3] + .5 + i * .12), bg: 'rgba(221,245,61,.14)', fg: K.lime, h: 34 }) + 10; });
  // test runner: 329 python + 5 node
  const gx = 1320, gy = 300, cols = 23, pit = 20, N = 334, p = seg(t, Hh.tests, Hh.tests + 2), done = Math.floor(N * p);
  txt('TEST RUNNER', gx, gy - 24, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, .2, .4) });
  for (let i = 0; i < N; i++) { const x = gx + (i % cols) * pit, y = gy + Math.floor(i / cols) * pit; rrect(x, y, 15, 15, 2, { fill: i < done ? (i >= 329 ? K.cream : K.lime) : 'rgba(241,238,230,.12)', a: seg(lt, .2, .4) }); }
  const ty = gy + Math.ceil(N / cols) * pit + 70;
  txt(`${Math.min(done, 329)} + ${Math.max(0, done - 329)} / 334 PASSED`, gx, ty, { font: font(F.cond, 56), fill: done >= N ? K.lime : K.cream, a: seg(lt, .3, .5) });
  txt('PYTHON · NODE.JS · 100% PASS', gx, ty + 36, { font: font(F.mono, 16, 700), fill: 'rgba(241,238,230,.6)', ls: 2.5, a: seg(lt, .3, .5) });
  stat('97%', 'REQUEST RECOVERY', 140, 830, { k: seg(t, Hh.stats5, Hh.stats5 + .25), size: 110, col: K.lime });
  stat('−72%', 'REPEAT MODEL CALLS', 440, 830, { k: seg(t, Hh.stats5 + .15, Hh.stats5 + .4), size: 110 });
  txt('JSON SCHEMA + PYDANTIC DUAL VALIDATION · EVENT-ID CONSISTENCY · LOG REDACTION · SECRET ISOLATION', 144, 935, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.5)', ls: 1.5, a: seg(lt, 1, 1.3) });
  MSHUD(t, { tl: '01.8 / RELIABILITY & QA', bl: sec(1, 'RELIABILITY'), br: 'STABLE IDS + CONTENT FINGERPRINTS → SKIP UNCHANGED', zh: '可靠性与质量保障', zhRight: false, progress: true });
  glitchIn(lt, 131);
}
function sMsEnd(t) {
  bg(K.cream); const lt = t - S.msEnd, k = seg(t, Hh.tapes, Hh.tapes + .5);
  txt('01', 90, 590, { font: font(F.cond, 560), fill: K.lime, a: seg(lt, 0, .3) });
  txt('01', 90, 590, { font: font(F.cond, 560), fill: null, stroke: K.ink, lw: 3, a: seg(lt, 0, .3) });
  const fast = 1 + 3 * easeIn(seg(t, Hh.tapeGlitch, S.sg1));
  tape(t * fast, 470, -.13, K.ink, K.cream, ['EVAL-DRIVEN', 'SCHEMA-FIRST', 'FAIL-SAFE'], 260, -1, k);
  tape(t * fast, 640, .07, K.lime, K.ink, ['PHI-3', 'SEMANTIC KERNEL', 'AUTOGEN', 'FASTAPI'], 300, 1, seg(t, Hh.tapes + .15, Hh.tapes + .65));
  MSHUD(t, { dark: false, tl: '01 / MICROSOFT CLOUD & AI — RECAP', bl: 'EVERY CHANGE BACKED BY AN EVAL', br: 'FIVE SYSTEMS · ONE SUMMER', zh: '以评测驱动迭代，而不是凭感觉', brackets: false });
  if (t > Hh.tapeGlitch) { const g = seg(t, Hh.tapeGlitch, S.sg1); FX.slice = g * .9; FX.split = .012 * g; FX.seed = Math.floor(t * FPS); }
}

// ---------- 02 UW SURGERY · 03 PROJECTS ----------
// ---------- v3 helpers ----------
// Letters as windows onto a shader: draw() into a scratch buffer, keep only `src` inside what was drawn.
function texWindow(draw, src) {
  const saved = ctx, g = bufT.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  ctx = g; draw(); ctx = saved;
  g.globalCompositeOperation = 'source-in'; g.drawImage(src, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.drawImage(bufT, 0, 0);
}
function redacted(x, y, w, h, seed, col, a = 1) {   // a line of "text" as blocks (never real content)
  let xx = x; const end = x + w;
  for (let j = 0; xx < end - 10; j++) { const ww = Math.min(end - xx, 30 + 90 * hash(seed * 13 + j)); rrect(xx, y, ww, h, h / 2, { fill: col, a }); xx += ww + 10; }
}
const bez = (p0, c0, c1, p1, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * c0[0] + 3 * v * u * u * c1[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c0[1] + 3 * v * u * u * c1[1] + u * u * u * p1[1]]; };
function thread(p0, p1, k, col, lw = 2.5) {   // a cubic "citation thread", drawn up to k
  if (k <= 0) return; const c0 = [p0[0] + 160, p0[1]], c1 = [p1[0] - 160, p1[1]], pts = [];
  for (let i = 0; i <= 40 * k; i++) pts.push(bez(p0, c0, c1, p1, i / 40));
  if (pts.length > 1) line(pts, col, lw);
}
const DARK = '#0B0D0C';

// ---------- index ----------
function sIndex(t) {
  bg(K.ink); const lt = t - S.index;
  txt('CONTENTS', 140, 230, { font: font(F.mono, 20, 700), fill: 'rgba(241,238,230,.6)', ls: 8, a: seg(lt, 0, .2) });
  txt('目录 · 按重点排序', 140 + measure('CONTENTS', font(F.mono, 20, 700), 8) + 26, 230, { font: font(F.zh, 20, 500), fill: 'rgba(241,238,230,.45)', ls: 4, a: seg(lt, 0, .2) });
  const rows = [['01', 'MICROSOFT CLOUD & AI', 'AI APPLICATION ENGINEER · INTERN', '00:30', K.lime], ['02', 'UW–MADISON SURGERY', 'AI RESEARCHER · THYROID CANCER AI', '00:18', K.cream], ['03', 'ENTERPRISE RAG', 'INDEPENDENT PROJECT', '00:14', K.cream]];
  rows.forEach(([n, title, role, dur, col], i) => {
    const t0 = Hh.idx[i], k = seg(t, t0, t0 + .25), y = 400 + i * 190;
    txt(n, 140, y, { font: font(F.cond, 150), fill: col, a: k });
    dropWord(title, 340, y, font(F.cond, 110), t0 + .05, t, { fall: 90, stag: .015 });
    const tw = measure(title, font(F.cond, 110)), lx0 = 340 + tw + 30, lx1 = 1650, lk = easeOut(seg(t, t0 + .2, t0 + .5));
    if (lk > 0) { ctx.save(); ctx.setLineDash([2, 12]); line([[lx0, y - 16], [lerp(lx0, lx1, lk), y - 16]], 'rgba(241,238,230,.5)', 2); ctx.restore(); }
    txt(role, 1780, y - 58, { font: font(F.mono, 18, 700), fill: col === K.lime ? K.lime : 'rgba(241,238,230,.8)', ls: 2.5, align: 'right', a: seg(t, t0 + .3, t0 + .5) });
    txt(dur, 1780, y - 2, { font: font(F.cond, 46), fill: K.cream, align: 'right', a: seg(t, t0 + .3, t0 + .5) });
  });
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'INDEX'), br: 'IN ORDER OF EMPHASIS' });
}

// ---------- 02 UW–MADISON DEPARTMENT OF SURGERY ----------
function sSg1(t) {
  bg(DARK); const lt = t - S.sg1;
  glShot(cloud(t, { k: ease(seg(t, Hh.form, Hh.form + 1.6)), rot: .3 + .15 * Math.sin(t * .4), x: 2.35, y: .1 }));
  const liq = liquid(t, { zoom: 1.1, seed: 5 });
  texWindow(() => {
    dropWord('DEPARTMENT', 140, 470, font(F.cond, 190), Hh.sgTitle, t, { fall: 160, stag: .025 });
    dropWord('OF SURGERY.', 140, 660, font(F.cond, 190), Hh.sgTitle + .2, t, { fall: 160, stag: .025 });
  }, liq);
  txt('UW–MADISON', 146, 262, { font: font(F.mono, 24, 700), fill: K.cream, ls: 8, a: seg(lt, .1, .3) });
  const cw = chip('AI RESEARCHER', 140, 752, { k: seg(t, Hh.sgRole, Hh.sgRole + .25), bg: K.lime, fg: K.ink, font: font(F.mono, 22, 700), h: 48 });
  txt('THYROID CANCER AI SUPPORT SYSTEM', 140 + cw + 24, 760, { font: font(F.mono, 22, 700), fill: K.cream, ls: 3, a: seg(t, Hh.sgRole + .15, Hh.sgRole + .4) });
  txt('$69K FUNDED PROJECT · TWO FACULTY PIs · CLINICAL STAKEHOLDERS', 144, 840, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.75)', ls: 2.5, a: seg(t, Hh.sgMeta, Hh.sgMeta + .25) });
  txt('PIs: COURTNEY BALENTINE, MD, MPH · ALAN McMILLAN, PhD', 144, 876, { font: font(F.mono, 16, 500), fill: 'rgba(241,238,230,.5)', ls: 2, a: seg(t, Hh.sgMeta + .15, Hh.sgMeta + .4) });
  const k = seg(t, Hh.form + 1.4, Hh.form + 1.8);
  txt('THYROID', 1470, 880, { font: font(F.mono, 15, 700), fill: 'rgba(221,245,61,.7)', ls: 6, align: 'center', a: k });
  hud(t, { tl: '02 / UW–MADISON DEPARTMENT OF SURGERY', tr: tc(t), bl: sec(2, 'CLINICAL AI'), br: 'IN DEVELOPMENT', zh: '威斯康星大学麦迪逊分校外科系 · AI 研究员 · 甲状腺癌 AI 支持系统', zhRight: true });
  glitchIn(lt, 161, .16, .7);
}
function sSg2(t) {
  bg(DARK); const lt = t - S.sg2;
  const dk = ease(seg(t, S.sg2, S.sg2 + 1.4)), co = { k: 1 - dk, rot: .3 + (t - S.sg2) * .12, x: lerp(2.35, 1.6, dk), y: lerp(.1, -.35, dk), s: lerp(1, .52, dk), hi: seg(t, Hh.pick, Hh.pick + .2), size: lerp(4, 5, dk) };
  glShot(cloud(t, co));
  dropWord('RECORD', 140, 250, font(F.cond, 130), S.sg2, t, { fall: 110 });
  const wr = measure('RECORD', font(F.cond, 130));
  arrow(140 + wr + 26, 205, 140 + wr + 26 + 110 * easeOut(seg(lt, .15, .4)), 205, K.cream, 9, 1, 28);
  dropWord('EVIDENCE.', 140 + wr + 170, 250, font(F.cond, 130), S.sg2 + .3, t, { fall: 110, fill: K.lime });
  // pipeline chips
  const st = ['CLINICAL DOCS', 'PREPROCESS', 'RETRIEVE', 'ORCHESTRATE', 'GROUNDED ANSWER', 'END-TO-END EVAL'];
  let x = 140; st.forEach((s, i) => {
    const k = seg(t, Hh.sgStages[i], Hh.sgStages[i] + .2), hot = i === 4;
    const w = chip(s, x, 330, { k, bg: hot ? K.lime : 'rgba(241,238,230,.1)', fg: hot ? K.ink : K.cream, font: font(F.mono, 16, 700), h: 36 });
    if (hot) RECT.sg2answer = [x, 312, w, 36];
    if (i < 5) arrow(x + w + 6, 330, x + w + 30, 330, 'rgba(241,238,230,.6)', 2, k, 8);
    x += w + 38;
  });
  // a clinical document, sliced into chunks that fly into the embedding cloud
  const dx = 150, dy = 430, dw = 300, dh = 420, sk = seg(t, Hh.slice, Hh.slice + .35), ek = seg(t, Hh.embed, Hh.embed + .7);
  for (let c = 0; c < 6; c++) {
    const y0 = dy + c * dh / 6, gap = 14 * easeOut(sk), fly = easeIn(clamp(ek * 1.3 - c * .06));
    const dest = cloud.project(3 + c * 97, t, co);
    const cx = lerp(dx, dest[0] - dw / 2, fly), cy = lerp(y0 + c * gap, dest[1], fly), s = 1 - .96 * fly;
    ctx.save(); ctx.translate(cx + dw / 2, cy + dh / 12); ctx.scale(s, s); ctx.translate(-dw / 2, -dh / 12);
    rrect(0, 0, dw, dh / 6 - 2, 3, { fill: K.cream, a: 1 - .3 * fly });
    for (let l = 0; l < 2; l++) redacted(18, 18 + l * 26, dw - 36 - (l ? 60 : 0), 9, c * 3 + l, 'rgba(14,15,14,.45)');
    if (sk > .5) txt('C' + (c + 1), dw - 10, dh / 6 - 14, { font: font(F.mono, 14, 700), fill: K.blue, align: 'right' });
    ctx.restore();
  }
  txt('CLINICAL DOCUMENT → CHUNKS → EMBEDDINGS', dx, dy + dh + 50, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.55)', ls: 2, a: seg(lt, .8, 1.1) });
  // a query retrieves the top-k chunks
  const qk = seg(t, Hh.query, Hh.query + .25), qp = [lerp(-200, 150, easeOut(qk)), 960];
  if (qk > 0) {
    const w = chip('QUERY', qp[0], qp[1], { bg: K.lime, fg: K.ink, font: font(F.mono, 18, 700), h: 40 });
    const hk = seg(t, Hh.pick, Hh.pick + .3);
    for (let i = 0; i < 3; i++) { const p = cloud.project(i, t, co); thread([qp[0] + w, qp[1]], p, hk, K.lime, 2); circle(p[0], p[1], 16 * hk, { stroke: K.lime, lw: 2 }); }
    if (hk > .6) { const p = cloud.project(0, t, co); txt('TOP-K CHUNKS', p[0] + 26, p[1] - 22, { font: font(F.mono, 15, 700), fill: K.lime, ls: 2 }); }
  }
  hud(t, { tl: '02.1 / FROM RECORD TO EVIDENCE', tr: tc(t), bl: sec(2, 'GROUNDING'), br: 'SCHEMATIC · NO PATIENT DATA', zh: '临床文档预处理 · 检索 · 提示词编排 · 端到端评测', zhRight: true });
}
function sSg3(t) {
  bg(K.cream); const lt = t - S.sg3;
  dropWord('EVERY CLAIM,', 140, 250, font(F.cond, 140), S.sg3, t, { fill: K.ink, fall: 120 });
  dropWord('SOURCED.', 140 + measure('EVERY CLAIM, ', font(F.cond, 140)), 250, font(F.cond, 140), S.sg3 + .2, t, { fill: K.blue, fall: 120 });
  // the answer panel
  const px = 140, py = 380, pw = 820, ph = 480;
  rrect(px, py, pw, ph, 14, { fill: K.ink });
  txt('GROUNDED ANSWER', px + 32, py + 50, { font: font(F.mono, 16, 700), fill: 'rgba(241,238,230,.55)', ls: 3 });
  const widths = [600, 500, 640, 420], cites = [1, 2, 3, 2], srcY = [440, 590, 740];
  const badge = i => [px + 40 + widths[i] + 24, py + 130 + i * 90];
  widths.forEach((w, i) => {
    const k = seg(t, Hh.sentences[i], Hh.sentences[i] + .3), y = py + 116 + i * 90;
    ctx.save(); ctx.beginPath(); ctx.rect(px + 30, y - 10, (w + 20) * easeOut(k), 44); ctx.clip();
    redacted(px + 40, y, w, 14, 40 + i, 'rgba(241,238,230,.85)'); redacted(px + 40, y + 24, w * .55, 10, 60 + i, 'rgba(241,238,230,.35)');
    ctx.restore();
    const [bx, by] = badge(i), bk = seg(t, Hh.sentences[i] + .2, Hh.sentences[i] + .4);
    rrect(bx, by - 18, 44, 36, 6, { fill: K.lime, a: bk }); txt('[' + cites[i] + ']', bx + 22, by + 7, { font: font(F.mono, 17, 700), fill: K.ink, align: 'center', a: bk });
  });
  // the sources, and threads from each citation to its source
  srcY.forEach((y, j) => {
    const lit = Hh.threads.some((th, i) => cites[i] === j + 1 && t > th + .45);
    rrect(1180, y - 55, 600, 110, 10, { fill: lit ? K.lime : 'rgba(14,15,14,.06)', stroke: K.ink, lw: 2, a: seg(lt, .3 + j * .1, .5 + j * .1) });
    txt('SOURCE ' + (j + 1), 1206, y - 18, { font: font(F.mono, 16, 700), fill: K.ink, ls: 3, a: seg(lt, .3 + j * .1, .5 + j * .1) });
    redacted(1206, y + 6, 520, 10, 80 + j, 'rgba(14,15,14,.45)', seg(lt, .4, .6)); redacted(1206, y + 28, 380, 10, 90 + j, 'rgba(14,15,14,.3)', seg(lt, .4, .6));
  });
  Hh.threads.forEach((th, i) => { const [bx, by] = badge(i); thread([bx + 44, by], [1180, srcY[cites[i] - 1]], easeOut(seg(t, th, th + .45)), i % 2 ? K.blue : K.red, 3); });
  hud(t, { dark: false, tl: '02.2 / GROUNDED GENERATION', tr: tc(t), bl: sec(2, 'TRACEABILITY'), br: 'SCHEMATIC · NO PATIENT DATA', zh: '基于证据的回答生成 · 每一句都能追溯到出处', zhRight: true, brackets: false });
}
function sSg4(t) {
  bg(DARK); const lt = t - S.sg4;
  dropWord('FOUR GATES.', 140, 250, font(F.cond, 150), S.sg4, t, { fall: 120 });
  txt('SAFETY EVALUATION BEFORE ANY ANSWER SHIPS', 146, 300, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.6)', ls: 3, a: seg(lt, .2, .4) });
  const G = [['HALLUCINATION', 'RISK', 560], ['SOURCE', 'TRACEABILITY', 860], ['ANSWER', 'QUALITY', 1160], ['CLINICALLY', 'SENSITIVE CASES', 1460]];
  const lanes = [480, 580, 680], x0 = 220, x1 = 1700, dur = 1.7, failGate = 1;
  const flash = new Array(4).fill(0), red = new Array(4).fill(0);
  Hh.packets.forEach((p0, i) => { G.forEach(([, , gx], g) => { const tg = p0 + (gx - x0) / (x1 - x0) * dur; const f = Math.exp(-Math.max(0, t - tg) * 6) * (t >= tg ? 1 : 0); if (i === 1 && g === failGate) red[g] = Math.max(red[g], f); else if (!(i === 1 && g > failGate)) flash[g] = Math.max(flash[g], f); }); });
  G.forEach(([a, b, gx], g) => {
    const k = seg(t, Hh.gates + g * .15, Hh.gates + g * .15 + .3), h = 360 * easeOut(k);
    const glow = red[g] > .05 ? `rgba(232,65,47,${.12 + .3 * red[g]})` : `rgba(221,245,61,${.05 + .25 * flash[g]})`;
    rrect(gx - 55, 400, 110, h, 6, { fill: glow, a: k });
    rrect(gx - 55, 400, 110, h, 6, { stroke: red[g] > .05 ? K.red : flash[g] > .05 ? K.lime : 'rgba(241,238,230,.35)', lw: 2, a: k });
    for (let sl = 0; sl < 9; sl++) { const yy = 400 + ((sl / 9 + t * .6) % 1) * h; line([[gx - 45, yy], [gx + 45, yy]], 'rgba(241,238,230,.12)', 1, k); }
    txt(a, gx, 812, { font: font(F.mono, 15, 700), fill: K.cream, ls: 2, align: 'center', a: k }); txt(b, gx, 836, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.6)', ls: 2, align: 'center', a: k });
    // the verdict each answer got at this gate stays on screen
    Hh.packets.forEach((p0, i) => {
      const tg = p0 + (gx - x0) / (x1 - x0) * dur; if (t < tg || (i === 1 && g > failGate)) return;
      const y = lanes[i], x = gx + 70, fail = i === 1 && g === failGate, kk = seg(t, tg, tg + .15);
      if (fail) { line([[x - 9, y - 9], [x + 9, y + 9]], K.red, 4, kk); line([[x + 9, y - 9], [x - 9, y + 9]], K.red, 4, kk); }
      else line([[x - 10, y], [x - 3, y + 8], [x + 11, y - 9]], K.lime, 4, kk);
    });
  });
  // the defer box (lights when A2 lands in it)
  const boxK = seg(lt, .4, .7), fail = Hh.packets[1] + (G[failGate][2] - x0) / (x1 - x0) * dur, landed = t > fail + .6;
  rrect(1180, 880, 600, 64, 8, { fill: landed ? K.red : 'rgba(232,65,47,.12)', stroke: K.red, lw: 2, a: boxK });
  txt('ABSTAIN → DEFER TO CLINICIAN', 1480, 921, { font: font(F.mono, 19, 700), fill: landed ? K.cream : K.red, ls: 2, align: 'center', a: boxK });
  RECT.deferBox = [1180, 880, 600, 64];
  Hh.packets.forEach((p0, i) => {
    if (t < p0) return;
    let x = lerp(x0, x1, clamp((t - p0) / dur)), y = lanes[i], c = K.cream, fg = K.ink, a = 1;
    if (i === 1 && t > fail) { const f = seg(t, fail, fail + .6); x = lerp(G[failGate][2] + 30, 1440, easeInOut(f)); y = lerp(lanes[1], 912, easeIn(f)); c = K.red; fg = K.cream; a = 1 - seg(t, fail + .6, fail + .75); }
    if (i !== 1 && t > p0 + dur) { c = K.lime; }
    rrect(x - 52, y - 24, 104, 48, 24, { fill: c, a }); txt('ANS ' + (i + 1), x, y + 7, { font: font(F.mono, 18, 700), fill: fg, align: 'center', a });
    if (i !== 1 && t > p0 + dur) txt('SHIP', x + 66, y + 7, { font: font(F.mono, 16, 700), fill: K.lime, ls: 2 });
  });
  hud(t, { tl: '02.3 / SAFETY EVALUATION', tr: tc(t), bl: sec(2, 'SAFETY'), br: 'SCHEMATIC · 3 EXAMPLE ANSWERS', zh: '证据不足时拒答，交由医生判断' });
}
function sSg5(t) {
  const lt = t - S.sg5, st = seg(t, Hh.thyWords[2] + .7, S.rg0);
  glShot(liquid(t, { zoom: 1.5, seed: 9, strips: st > 0 ? 18 : 0, stripAmt: easeIn(st) * 2.5 }));
  const words = ['Cite it', '—', 'or abstain.'], f = `italic 124px ${F.serif}`;
  const total = measure(words.join(' '), f); let x = W / 2 - total / 2;
  words.forEach((wd, i) => { const k = seg(t, Hh.thyWords[i], Hh.thyWords[i] + .3); txt(wd, x, H / 2 + 20 + (1 - easeOut(k)) * 30, { font: f, fill: K.cream, a: k, glow: 'rgba(14,15,40,.35)', glowR: 20 }); x += measure(wd + ' ', f); });
  txt('IN DEVELOPMENT · PATIENT-FACING VALIDATION PLANNED, NOT YET DONE', W / 2, H / 2 + 110, { font: font(F.mono, 19, 700), fill: K.cream, ls: 2.5, align: 'center', a: seg(lt, .8, 1.1) });
  txt('引用来源，或者拒答', W / 2, H / 2 + 170, { font: font(F.zh, 28, 500), fill: 'rgba(241,238,230,.85)', ls: 12, align: 'center', a: seg(lt, 1, 1.3) });
  hud(t, { tl: '02 / UW–MADISON DEPARTMENT OF SURGERY', tr: 'AI RESEARCHER', bl: sec(2, 'PRINCIPLE'), br: 'NO CLINICAL EFFICACY CLAIMED' });
  if (st > 0) { FX.slice = Math.max(FX.slice, st * .6); FX.split = Math.max(FX.split, .01 * st); FX.seed = Math.floor(t * FPS); }
}

// ---------- 03 ENTERPRISE RAG ----------
function sRg0(t) {
  bg(K.cream); const lt = t - S.rg0;
  glShot(knot(t, { x: 2.35, y: .15, s: .75 * backOut(seg(lt, .1, .6)), r0: 1.2 }));
  dropWord('ENTERPRISE', 140, 430, font(F.cond, 220), Hh.ragWord, t, { fill: K.ink, fall: 180 });
  dropWord('RAG.', 140, 700, font(F.cond, 300), Hh.ragWord + .2, t, { fill: K.ink, fall: 200, fillAt: i => i === 3 ? K.red : K.ink });
  let x = 146; [['INDEPENDENT · 2025.05–09', K.ink, K.cream], ['MILVUS · BM25 · QWEN3 · RRF · TEXT-TO-SQL', K.lime, K.ink]].forEach(([s, b, f], i) => { x += chip(s, x, 800, { k: seg(t, Hh.ragMeta + i * .15, Hh.ragMeta + i * .15 + .25), bg: b, fg: f }) + 14; });
  hud(t, { dark: false, tl: '03 / ENTERPRISE RAG ASSISTANT', tr: tc(t), bl: sec(3, 'RETRIEVAL'), br: 'DOCUMENTS + STRUCTURED DATA', zh: '企业级 RAG 智能助手 · 独立开发', zhRight: true, brackets: false });
  glitchIn(lt, 171, .14, .6);
}
const BM25 = [17, 42, 8, 63, 25, 91, 30], DENSE = [42, 25, 77, 17, 55, 8, 12];
const FUSED = (() => { const sc = {}; BM25.forEach((d, r) => sc[d] = (sc[d] || 0) + 1 / (60 + r + 1)); DENSE.forEach((d, r) => sc[d] = (sc[d] || 0) + 1 / (60 + r + 1)); return Object.keys(sc).map(Number).sort((a, b) => sc[b] - sc[a]).slice(0, 7).map(d => [d, sc[d]]); })();
function sRg1(t) {
  bg(K.ink); const lt = t - S.rg1;
  dropWord('HYBRID RECALL.', 140, 220, font(F.cond, 120), S.rg1, t, { fall: 100, fillAt: i => i >= 7 ? K.lime : K.cream });
  let qx = 146; ['QUERY REWRITE / DECOMPOSE', 'HyDE'].forEach((s, i) => { qx += chip(s, qx, 285, { k: seg(t, Hh.lists - .25 + i * .12, Hh.lists + i * .12), bg: 'rgba(241,238,230,.1)', fg: K.cream, font: font(F.mono, 15, 700), h: 34 }) + 10; });
  const colX = { bm: 140, de: 560, fu: 1080 }, rowY = j => 400 + j * 62, iw = 360;
  const item = (d, x, y, k, o = {}) => { if (k <= 0) return; rrect(x, y - 24, iw * easeOut(k), 48, 6, { fill: o.bg || 'rgba(241,238,230,.08)', stroke: o.line, lw: 2 }); if (k > .6) { txt('D-' + String(d).padStart(3, '0'), x + 16, y + 8, { font: font(F.mono, 20, 700), fill: o.fg || K.cream, ls: 1.5 }); if (o.bar != null) rrect(x + 140, y - 5, 140 * o.bar, 10, 3, { fill: o.fg || K.cream, a: .7 }); if (o.rank) txt(o.rank, x + iw - 14, y + 8, { font: font(F.mono, 15, 700), fill: o.fg || 'rgba(241,238,230,.6)', align: 'right' }); } };
  txt('BM25 · SPARSE', colX.bm, 350, { font: font(F.mono, 16, 700), fill: 'rgba(241,238,230,.6)', ls: 3, a: seg(t, Hh.lists, Hh.lists + .2) });
  txt('QWEN3-EMBEDDING · DENSE', colX.de, 350, { font: font(F.mono, 16, 700), fill: 'rgba(241,238,230,.6)', ls: 3, a: seg(t, Hh.lists, Hh.lists + .2) });
  txt('RRF · FUSED', colX.fu, 350, { font: font(F.mono, 16, 700), fill: K.lime, ls: 3, a: seg(t, Hh.fuse, Hh.fuse + .2) });
  BM25.forEach((d, j) => item(d, colX.bm, rowY(j), seg(t, Hh.lists + j * .04, Hh.lists + j * .04 + .25), { bar: 1 - j * .12, rank: '#' + (j + 1) }));
  DENSE.forEach((d, j) => item(d, colX.de, rowY(j), seg(t, Hh.lists + .1 + j * .04, Hh.lists + .1 + j * .04 + .25), { bar: 1 - j * .11, rank: '#' + (j + 1) }));
  // fusion: each fused doc flies in from its best-ranked source slot
  FUSED.forEach(([d, sc], j) => {
    const rb = BM25.indexOf(d), rd = DENSE.indexOf(d), fromBm = rb >= 0 && (rd < 0 || rb <= rd), src = fromBm ? [colX.bm, rowY(rb)] : [colX.de, rowY(rd)];
    const k = seg(t, Hh.fuse + j * .08, Hh.fuse + j * .08 + .45), e = easeInOut(k);
    if (k <= 0) return;
    const x = lerp(src[0], colX.fu, e), y = lerp(src[1], rowY(j), e) - Math.sin(Math.PI * e) * 60;
    const both = rb >= 0 && rd >= 0;
    item(d, x, y, 1, { bg: both ? K.lime : K.cream, fg: K.ink, bar: sc / FUSED[0][1], rank: both ? 'BOTH' : '' });
    if (j === 0) RECT.fusedTop = [colX.fu, rowY(0) - 24, iw, 48];
  });
  // cascade rerank funnel
  const fk = seg(t, Hh.funnel, Hh.funnel + .35), fx = 1580, fy = 380, fw = 200, fh = 380;
  if (fk > 0) {
    ctx.save(); ctx.globalAlpha = fk; ctx.fillStyle = 'rgba(221,245,61,.14)'; ctx.strokeStyle = K.lime; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw * .66, fy + fh); ctx.lineTo(fx + fw * .34, fy + fh); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    txt('TOP-50', fx + fw / 2, fy - 14, { font: font(F.cond, 40), fill: K.cream, align: 'center', a: fk });
    txt('BI-ENCODER', fx + fw / 2, fy + 120, { font: font(F.mono, 13, 700), fill: K.cream, align: 'center', ls: 1, a: fk });
    txt('CROSS-ENCODER', fx + fw / 2, fy + 250, { font: font(F.mono, 12, 700), fill: K.lime, align: 'center', ls: .5, a: seg(fk, .5, 1) });
    txt('TOP-10', fx + fw / 2, fy + fh + 50, { font: font(F.cond, 40), fill: K.lime, align: 'center', a: seg(fk, .6, 1) });
    txt('QWEN3-RERANKER-4B', fx + fw / 2, fy + fh + 80, { font: font(F.mono, 13, 700), fill: 'rgba(221,245,61,.8)', align: 'center', ls: 1, a: seg(fk, .7, 1) });
    for (let i = 0; i < 8; i++) { const ph = ((t * 1.3 + i / 8) % 1), yy = fy + ph * fh, half = lerp(fw / 2, fw * .16, ph); if (ph * 8 % 1 < .5) circle(fx + fw / 2 + Math.sin(i * 2.3) * half * .6, yy, 4, { fill: K.lime, a: fk * (1 - ph * .5) }); }
  }
  [['+18%', 'RECALL@10 · COMPLEX'], ['+20%', 'TOP-5 RELEVANCE'], ['<120ms', 'END-TO-END RETRIEVAL']].forEach(([v, l], i) => stat(v, l, 140 + i * 380, 910, { k: seg(t, Hh.rgStats + i * .15, Hh.rgStats + i * .15 + .25), size: 84, col: i === 0 ? K.lime : K.cream, gap: 32 }));
  hud(t, { tl: '03.1 / HYBRID RETRIEVAL', tr: tc(t), bl: sec(3, 'RECALL'), br: 'RRF = Σ 1 / (60 + RANK) · SCHEMATIC IDS', zh: 'BM25 稀疏 + Qwen3 稠密多路召回 · RRF 融合 · 级联重排', zhRight: true, progress: true });
}
function sRg2(t) {
  bg(K.cream); const lt = t - S.rg2;
  dropWord('ROUTE.', 140, 290, font(F.cond, 200), S.rg2, t, { fill: K.ink, fall: 160 });
  const N = [760, 600], lanes = [['DOCUMENTS', 460], ['SQL', 600], ['HYBRID', 740]], lx = 1080, lx1 = 1720;
  lanes.forEach(([s, y], i) => {
    const k = seg(t, Hh.lanes + i * .1, Hh.lanes + i * .1 + .3);
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = K.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(N[0] + 110, N[1]); ctx.bezierCurveTo(960, N[1], 960, y, lx, y); ctx.lineTo(lx1, y); ctx.stroke(); ctx.restore();
    chip(s, lx1 - measure(s, font(F.mono, 18, 700), 2) - 28, y - 34, { k, bg: i === 1 ? K.blue : K.ink, fg: K.cream });
  });
  // the classifier node + its confidence gauge
  const nk = backOut(seg(t, Hh.lanes - .2, Hh.lanes + .2));
  circle(N[0], N[1], 110 * nk, { fill: K.ink });
  txt('INTENT', N[0], N[1] - 8, { font: font(F.cond, 44), fill: K.lime, align: 'center', a: seg(nk, .7, 1) });
  txt('DISTILBERT', N[0], N[1] + 26, { font: font(F.mono, 14, 700), fill: K.cream, align: 'center', ls: 2, a: seg(nk, .7, 1) });
  // queries stream in and out along the lanes; #3 is low-confidence and goes to the LLM fallback first
  const Q = [0, 2, 1, 0, 2, 1], fb = 3, fbBox = [N[0] - 150, 330, 300, 60];
  const fbk = seg(t, Hh.fallback - .3, Hh.fallback);
  rrect(...fbBox, 8, { fill: fbk > 0 && t < Hh.fallback + .6 ? K.lime : 'rgba(14,15,14,.06)', stroke: K.ink, lw: 2, a: seg(lt, .5, .8) });
  txt('LLM FALLBACK', N[0], 368, { font: font(F.mono, 18, 700), fill: K.ink, ls: 2, align: 'center', a: seg(lt, .5, .8) });
  txt('← LOW CONFIDENCE', fbBox[0] + fbBox[2] + 18, 368, { font: font(F.mono, 15, 700), fill: K.red, ls: 1.5, a: seg(t, Hh.fallback - .35, Hh.fallback - .15) * (1 - seg(t, Hh.fallback + .5, Hh.fallback + .7)) });
  Q.forEach((lane, i) => {
    const t0 = Hh.stream + i * .32; if (t < t0) return;
    const u = t - t0, inT = .45, outT = .6;
    let x, y;
    if (u < inT) { x = lerp(150, N[0] - 110, easeInOut(u / inT)); y = N[1] + (i % 2 ? 20 : -20) * (1 - u / inT); }
    else if (i === fb && u < inT + .9) { const f = (u - inT) / .9; x = N[0]; y = f < .5 ? lerp(N[1] - 110, 360, easeOut(f * 2)) : lerp(360, N[1] - 110, easeIn((f - .5) * 2)); }
    else { const f = clamp((u - inT - (i === fb ? .9 : 0)) / outT); if (f >= 1) return; const ly = lanes[lane][1], p = f < .45 ? bez([N[0] + 110, N[1]], [960, N[1]], [960, ly], [lx, ly], f / .45) : [lerp(lx, lx1 - 200, (f - .45) / .55), ly]; x = p[0]; y = p[1]; }
    rrect(x - 26, y - 14, 52, 28, 14, { fill: i === fb ? K.red : K.ink });
    txt('Q' + (i + 1), x, y + 6, { font: font(F.mono, 14, 700), fill: K.cream, align: 'center' });
  });
  // confidence gauge: the query at the node vs the threshold (bars only, no fake numbers)
  const gk = seg(t, Hh.stream + .3, Hh.stream + .6), gx = N[0] - 150, gy = 790, gw = 300;
  const atNode = Q.map((l, i) => Hh.stream + i * .32 + .45).filter(tt => t >= tt - .1).length - 1, conf = atNode === fb ? .38 : [.82, .91, .74, .38, .88, .79][Math.max(0, atNode)];
  rrect(gx, gy, gw, 12, 6, { fill: 'rgba(14,15,14,.12)', a: gk }); rrect(gx, gy, gw * conf, 12, 6, { fill: atNode === fb ? K.red : K.ink, a: gk });
  line([[gx + gw * .6, gy - 10], [gx + gw * .6, gy + 22]], K.ink, 2, gk);
  txt('CONFIDENCE', gx, gy - 16, { font: font(F.mono, 14, 700), fill: 'rgba(14,15,14,.6)', ls: 2, a: gk }); txt('THRESHOLD', gx + gw * .6, gy + 44, { font: font(F.mono, 12, 700), fill: 'rgba(14,15,14,.6)', ls: 1.5, align: 'center', a: gk });
  stat('93%', 'ROUTING ACCURACY · DOC / SQL / HYBRID', 140, 900, { k: seg(t, Hh.route, Hh.route + .25), size: 110, col: K.blue, sub: 'rgba(14,15,14,.7)', gap: 36 });
  hud(t, { dark: false, tl: '03.2 / INTENT ROUTING', tr: tc(t), bl: sec(3, 'ROUTING'), br: 'CONFIDENCE THRESHOLD + LLM FALLBACK', zh: '轻量意图分类器 · 文档 / SQL / 混合三路路由', zhRight: true, brackets: false });
}
function sRg3(t) {
  bg(K.ink); const lt = t - S.rg3;
  dropWord('READ-ONLY', 140, 280, font(F.cond, 170), S.rg3, t, { fall: 140 });
  dropWord('BY DESIGN.', 140, 440, font(F.cond, 170), S.rg3 + .15, t, { fall: 140, fill: K.lime });
  ['READ-ONLY CONNECTION', 'SCHEMA WHITELIST', 'SQL AST CHECK', 'TIMEOUT + ROW LIMIT', 'JWT + RBAC ACL PRE-FILTER'].forEach((s, i) => chip(s, 140, 540 + i * 52, { k: seg(t, Hh.tree + .3 + i * .1, Hh.tree + .5 + i * .1), bg: 'rgba(241,238,230,.1)', fg: K.cream, font: font(F.mono, 16, 700), h: 38 }));
  // a schematic SQL AST: SELECT → COLUMNS / FROM / WHERE / LIMIT
  const node = (s, x, y, k, o = {}) => { if (k <= 0) return; const w = measure(s, font(F.mono, 18, 700), 1) + 36; rrect(x - w / 2, y - 24, w, 48, 8, { fill: o.bg || K.ink2, stroke: o.line || 'rgba(241,238,230,.7)', lw: 2, a: k }); txt(s, x, y + 7, { font: font(F.mono, 18, 700), fill: o.fg || K.cream, align: 'center', ls: 1, a: k }); };
  const root = [1300, 330], kids = [['COLUMNS', 1020], ['FROM table_a', 1260], ['WHERE', 1500], ['LIMIT n', 1710]], ky = 470;
  const tk = seg(t, Hh.tree, Hh.tree + .3);
  kids.forEach(([s, x], i) => { const k = seg(t, Hh.tree + .1 + i * .08, Hh.tree + .35 + i * .08); line([[root[0], root[1] + 24], [x, ky - 24]], 'rgba(241,238,230,.5)', 2, k); node(s, x, ky, k); if (t > Hh.check + i * .1) line([[x - 12, ky - 44], [x - 4, ky - 36], [x + 12, ky - 54]], K.lime, 4); });
  node('SELECT', ...root, tk, { bg: K.cream, fg: K.ink, line: K.cream });
  // the attack: a DROP statement, rejected at the AST check
  const ak = seg(t, Hh.attack, Hh.attack + .25), sh = t > Hh.block && t < Hh.block + .4 ? Math.sin((t - Hh.block) * 80) * 10 * (1 - (t - Hh.block) / .4) : 0;
  if (ak > 0) {
    line([[1300, 640], [1300, 720]], 'rgba(232,65,47,.7)', 2, ak);
    node('DROP TABLE …', 1300 + sh, 620, ak, { bg: 'rgba(232,65,47,.15)', line: K.red, fg: K.red });
    txt('ADVERSARIAL SAMPLE', 1300, 572, { font: font(F.mono, 14, 700), fill: K.red, ls: 2, align: 'center', a: ak });
  }
  const bk = seg(t, Hh.block, Hh.block + .15);
  if (bk > 0) { ctx.save(); ctx.translate(1300, 700); ctx.rotate(-.12); ctx.scale(lerp(1.6, 1, easeOut(bk)), lerp(1.6, 1, easeOut(bk))); ctx.globalAlpha = bk; rrect(-150, -36, 300, 72, 6, { stroke: K.red, lw: 5 }); txt('BLOCKED', 0, 18, { font: font(F.cond, 60), fill: K.red, align: 'center' }); ctx.restore(); }
  [['100%', 'DANGEROUS STMTS BLOCKED · 200 ADVERSARIAL', K.lime], ['84%', 'SQL EXECUTION ACCURACY', K.cream], ['0', 'UNAUTHORIZED ACCESS · ACL TESTS', K.cream]].forEach(([v, l, c], i) => stat(v, l, [860, 1340, 1640][i], 900, { k: seg(t, Hh.sqlStats + i * .12, Hh.sqlStats + i * .12 + .25), size: 96, col: c, gap: 34 }));
  hud(t, { tl: '03.3 / TEXT-TO-SQL GUARDRAILS', tr: tc(t), bl: sec(3, 'SAFETY'), br: 'SCHEMATIC AST', zh: 'Text-to-SQL 强校验 · 只读连接 · AST 白名单 · 检索前权限过滤', zhRight: true });
}
function sRg4(t) {
  bg(K.lime); const lt = t - S.rg4;
  dropWord('UNDER LOAD.', 140, 230, font(F.cond, 130), S.rg4, t, { fill: K.ink, fall: 110 });
  const B = [['−30%', 'P95 LATENCY @ 200 CONCURRENT'], ['70%+', 'CACHE HIT · REDIS + SINGLE-FLIGHT'], ['92%', 'TRACEABLE ANSWERS'], ['−35%', 'CONTEXT TOKENS · SAME QUALITY']];
  B.forEach(([v, l], i) => {
    const k = seg(t, Hh.board + .2 + i * .18, Hh.board + .45 + i * .18), x = 140 + (i % 2) * 860, y = 470 + Math.floor(i / 2) * 290;
    line([[x, y - 170], [x + 760 * easeOut(k), y - 170]], K.ink, 2);
    txt(v, x, y + (1 - easeOut(k)) * 40, { font: font(F.cond, 190), fill: K.ink, a: k });
    txt(l, x + 6, y + 48, { font: font(F.mono, 20, 700), fill: 'rgba(14,15,14,.75)', ls: 3, a: k });
  });
  hud(t, { dark: false, tl: '03.4 / SYSTEMS', tr: tc(t), bl: sec(3, 'PERFORMANCE'), br: 'MILVUS HNSW · ASYNCIO · RAGAS-STYLE EVAL', zh: '高并发 · 缓存 · 可溯源评测', brackets: false });
}

// ---------- finale: the whole reel as a trace ----------
const SPANS = [
  [0, 'work_reel_26', 0, 84], [1, 'intro', 0, 12],
  [1, '01 microsoft_cloud_ai', 12, 42], [2, 'tool_calling_eval', 14, 23], [2, 'react_doc_agent', 23, 27], [2, 'multi_agent_design', 27, 31], [2, 'incident_agent', 31, 36], [2, 'reliability_qa', 36, 40],
  [1, '02 uw_surgery', 42, 60], [2, 'grounded_generation', 46, 54], [2, 'safety_gates', 54, 58],
  [1, '03 enterprise_rag', 60, 74], [2, 'hybrid_recall', 62, 66], [2, 'intent_routing', 66, 69], [2, 'sql_guardrails', 69, 72],
];
function sTrace(t) {
  bg(K.ink); const lt = t - S.trace;
  dropWord('TRACE.', 140, 215, font(F.cond, 130), S.trace, t, { fall: 110 });
  txt('run: zhechen-tu/work-reel-26', 146, 262, { font: font(F.mono, 18, 700), fill: 'rgba(241,238,230,.6)', ls: 2, a: seg(lt, .2, .4) });
  const okK = seg(t, Hh.traceOk, Hh.traceOk + .25);
  if (okK > 0) { circle(1560, 190, 10, { fill: K.lime, a: okK }); txt('STATUS OK', 1584, 199, { font: font(F.mono, 22, 700), fill: K.lime, ls: 3, a: okK }); txt('FIGURES FROM THE 2026.09 RÉSUMÉ', 1780, 244, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.6)', ls: 2, align: 'right', a: okK }); }
  const tx0 = 700, tx1 = 1640, X = s => lerp(tx0, tx1, s / C.dur), y0 = 318, rh = 40;
  for (let s = 0; s <= 84; s += 12) { txt(s + 's', X(s), y0 - 18, { font: font(F.mono, 13, 700), fill: 'rgba(241,238,230,.4)', align: 'center', a: seg(lt, .2, .4) }); line([[X(s), y0 - 8], [X(s), y0 + SPANS.length * rh]], 'rgba(241,238,230,.08)', 1, seg(lt, .2, .4)); }
  SPANS.forEach(([d, name, a0, a1], i) => {
    const k = seg(t, Hh.traceRows + i * .07, Hh.traceRows + i * .07 + .3), y = y0 + i * rh + rh / 2;
    const ms = name.startsWith('01') || (d === 2 && i >= 3 && i <= 7), col = d === 0 ? K.cream : ms ? K.lime : 'rgba(241,238,230,.75)';
    txt((d ? '└ '.padStart(d * 2 + 2, ' ') : '') + name, 140 + d * 28, y + 6, { font: font(F.mono, d === 2 ? 16 : 18, 700), fill: d === 2 ? 'rgba(241,238,230,.7)' : K.cream, a: k });
    rrect(X(a0), y - (d === 2 ? 8 : 12), (X(a1) - X(a0)) * easeOut(k), d === 2 ? 16 : 24, 3, { fill: col, a: k });
    txt((a1 - a0).toFixed(1) + 's', tx1 + 110, y + 6, { font: font(F.mono, 15, 700), fill: 'rgba(241,238,230,.6)', align: 'right', a: k });
    if (k > .8) txt('OK', 1780, y + 6, { font: font(F.mono, 15, 700), fill: K.lime, align: 'right' });
  });
  // playhead sweeps the waterfall
  const ph = X(C.dur * easeInOut(seg(lt, .3, 3.2)));
  line([[ph, y0 - 8], [ph, y0 + SPANS.length * rh]], K.lime, 2, seg(lt, .3, .5) * (1 - seg(lt, 3.3, 3.6)));
  hud(t, { tl: 'ZHECHEN TU — WORK REEL ’26', tr: tc(t), bl: sec(0, 'TRACE'), br: 'MICROSOFT 30s · SURGERY 18s · RAG 14s', zh: '整支短片即一次 Agent 运行的 trace', zhRight: true });
}
function sEnd2(t) {
  sEnd(t);
  const lt = t - S.end;
  if (t < Hh.endDot) txt('MICROSOFT CLOUD & AI ’26 · UW–MADISON SURGERY · UW–MADISON CS ’27', 140, 960, { font: font(F.mono, 17, 700), fill: 'rgba(241,238,230,.55)', ls: 3, a: seg(lt, 1.2, 1.5) });
}

// ---------- transitions (into a scene; A = outgoing scene frozen on its last frame, B = incoming, live) ----------
const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ioExpo = x => { x = clamp(x); return x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const trIris = (cx, cy, ring = K.lime) => (k, A, B, g) => {
  const e = easeIn(k) * .6 + ease(k) * .4, R = e * Math.hypot(W, H);
  g.drawImage(A, 0, 0); g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip(); g.drawImage(B, 0, 0); g.restore();
  g.save(); g.strokeStyle = ring; g.lineWidth = 2 + 10 * (1 - e); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.restore();
};
const trZoom = rect => (k, A, B, g) => {   // zoom into a UI element of A; B is seen through it, then fills the frame
  const [rx, ry, rw, rh] = typeof rect === 'function' ? rect() : rect, e = ioExpo(k), s1 = Math.max(W / rw, H / rh), s = Math.pow(s1, e);
  const cx = rx + rw / 2, cy = ry + rh / 2, px = lerp(cx, W / 2, e), py = lerp(cy, H / 2, e);
  g.save(); g.translate(px, py); g.scale(s, s); g.translate(-cx, -cy); g.drawImage(A, 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(px - rw / 2 * s, py - rh / 2 * s, rw * s, rh * s); g.clip(); g.globalAlpha = clamp(e * 2.2 - .2); g.drawImage(B, 0, 0); g.restore();
  FX.split = Math.max(FX.split, .008 * Math.sin(Math.PI * e));
};
const trPush = (dx, dy) => (k, A, B, g) => { const e = ioExpo(k); g.drawImage(A, -dx * W * e, -dy * H * e); g.drawImage(B, dx * W * (1 - e), dy * H * (1 - e)); FX.split = Math.max(FX.split, .012 * Math.sin(Math.PI * e)); };
const trWipe = (col = K.lime) => (k, A, B, g) => { const x = easeInOut(k) * (W + 40); g.drawImage(A, 0, 0); g.save(); g.beginPath(); g.rect(0, 0, x, H); g.clip(); g.drawImage(B, 0, 0); g.restore(); g.fillStyle = col; g.fillRect(x - 4, 0, 8, H); };
const trSlats = (n = 12) => (k, A, B, g) => { g.drawImage(A, 0, 0); const sw = W / n; for (let i = 0; i < n; i++) { const kk = easeInOut(seg(k, i * .035, i * .035 + .6)); if (kk <= 0) continue; g.save(); g.beginPath(); g.rect(i * sw, 0, sw * kk + 1, H); g.clip(); g.drawImage(B, 0, 0); g.restore(); } };
const trGrid = (cols = 16, rows = 9, col = K.lime) => (k, A, B, g) => {
  g.drawImage(A, 0, 0); const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = (c + r) / (cols + rows - 2), kk = seg(k, d * .6, d * .6 + .4); if (kk <= 0) continue;
    const x = c * cw, y = r * ch;
    if (kk < .5) { const s = kk * 2; g.fillStyle = col; g.fillRect(x + cw * (1 - s) / 2, y + ch * (1 - s) / 2, cw * s, ch * s); }
    else { g.save(); g.beginPath(); g.rect(x, y, cw + 1, ch + 1); g.clip(); g.drawImage(B, 0, 0); g.restore(); if (kk < 1) { g.globalAlpha = 2 - kk * 2; g.fillStyle = col; g.fillRect(x, y, cw + 1, ch + 1); g.globalAlpha = 1; } }
  }
};
const TR = {
  ms0: [.55, trZoom([130, 262, 150, 148])],
  m1a: [.5, trIris(1560, 440, K.ink)],
  m1b: [.55, trZoom([1000, 374, 118, 118])],
  m1c: [.45, trWipe(K.lime)],
  m1d: [.55, trZoom([1050, 630, 160, 74])],
  m2: [.45, trPush(0, 1)],
  m3: [.5, trIris(1250, 580, K.lime)],
  m4: [.5, trSlats(12)],
  m5: [.55, trZoom([1000, 640, 780, 300])],
  msEnd: [.6, trGrid(16, 9, K.lime)],
  sg2: [.45, trPush(1, 0)],
  sg3: [.55, trZoom(() => RECT.sg2answer || [900, 312, 220, 36])],
  sg4: [.5, trSlats(10)],
  sg5: [.5, trIris(1480, 912, K.red)],
  rg1: [.45, trPush(1, 0)],
  rg2: [.55, trZoom(() => RECT.fusedTop || [1080, 376, 360, 48])],
  rg3: [.5, trWipe(K.lime)],
  rg4: [.55, trGrid(16, 9, K.ink)],
  trace: [.45, trPush(0, 1)],
};

const SCENES = [[S.boot, sBoot, 'boot'], [S.every, sEvery, 'every'], [S.needs, sNeeds, 'needs'], [S.evid, sEvid, 'evid'], [S.name, sName, 'name'], [S.index, sIndex, 'index'],
  [S.ms0, sMs0, 'ms0'], [S.m1a, sM1a, 'm1a'], [S.m1b, sM1b, 'm1b'], [S.m1c, sM1c, 'm1c'], [S.m1d, sM1d, 'm1d'], [S.m2, sM2, 'm2'], [S.m3, sM3, 'm3'], [S.m4, sM4, 'm4'], [S.m5, sM5, 'm5'], [S.msEnd, sMsEnd, 'msEnd'],
  [S.sg1, sSg1, 'sg1'], [S.sg2, sSg2, 'sg2'], [S.sg3, sSg3, 'sg3'], [S.sg4, sSg4, 'sg4'], [S.sg5, sSg5, 'sg5'],
  [S.rg0, sRg0, 'rg0'], [S.rg1, sRg1, 'rg1'], [S.rg2, sRg2, 'rg2'], [S.rg3, sRg3, 'rg3'], [S.rg4, sRg4, 'rg4'],
  [S.trace, sTrace, 'trace'], [S.end, sEnd2, 'end']];
function renderInto(i, t, buf) {
  ctx = buf.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.clearRect(0, 0, W, H);
  SCENES[i][1](t); ctx = mainCtx;
}
function frame(t) {
  FX = { split: 0, slice: 0, seed: 0, grain: .05, vign: .28, flash: 0, flashCol: '#ffffff' };
  let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1][0]) i++;
  const [s0, fn, key] = SCENES[i], tr = TR[key];
  ctx = mainCtx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (tr && i > 0 && t < s0 + tr[0]) {
    TRANS = true;
    const keep = FX; FX = { ...keep }; renderInto(i - 1, s0 - 1 / FPS, bufA); FX = keep;   // the outgoing scene's own effects are dropped
    renderInto(i, t, bufB);
    TRANS = false;
    tr[1](seg(t, s0, s0 + tr[0]), bufA, bufB, mainCtx);
  } else {
    fn(t);
    if (!tr && s0 > 0 && t < s0 + 1 / FPS) FX.flash = Math.max(FX.flash, .08);   // a one-frame flash on hard cuts
  }
  post(t, FX);
}

// ---------- render contract ----------
const fontsReady = Promise.all([
  document.fonts.load('100px "Anton"'), document.fonts.load('100px "Archivo Black"'), document.fonts.load('italic 100px "Instrument Serif"'),
  document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"'),
  document.fonts.load('500 20px "Noto Sans SC"', '一三不与业个中临主习事于云交人代令以件企体作依保修做具再决准凭出分划判到前动助医单即发取句只召可合名员品响喆器回图均基处外多大威存学完实审宸密对导少尚工师平并床序应康延建开式引强录微思急性患意感成或手拒持指按据排接控推提支整文断斯方旗时星是智未本权条来板构架查校样档检次每测涂消混源溯滤点片状独率理生用由甲疏症癌白的监目矩短码研确示科稀程稠究立端答策算类系索红级统维缓编者而联能腺自英融行要规觉解计订设证评诊词试读调负质足路转软轻过运进连迟迪迭追逊部都重量链问阵限障集需靠面项预驱验高麦齐（），'),
  document.fonts.load('700 20px "Noto Sans SC"', '一三不与业个中临主习事于云交人代令以件企体作依保修做具再决准凭出分划判到前动助医单即发取句只召可合名员品响喆器回图均基处外多大威存学完实审宸密对导少尚工师平并床序应康延建开式引强录微思急性患意感成或手拒持指按据排接控推提支整文断斯方旗时星是智未本权条来板构架查校样档检次每测涂消混源溯滤点片状独率理生用由甲疏症癌白的监目矩短码研确示科稀程稠究立端答策算类系索红级统维缓编者而联能腺自英融行要规觉解计订设证评诊词试读调负质足路转软轻过运进连迟迪迭追逊部都重量链问阵限障集需靠面项预驱验高麦齐（），'),
]);
window.renderAt = async (t, type = 'image/png', q = .92) => { frame(t); return out.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); frame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(out, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = RA.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); };
fontsReady.then(() => {
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt');
    const go = () => { const t0 = performance.now(); frame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = new URLSearchParams(location.search).get('t') || 0; go();
  }
});
