// score_kinetic.mjs: the score for the kinetic-type reel (v3.1, 84 s: Microsoft → UW Surgery → Enterprise RAG → trace).
// v3.1: transition whooshes removed (listener fatigue); transitions are carried by in-key swells and tonal cues. Synthesized from scratch (no samples) and locked to
// kinetic/cues.js. 120 BPM, A minor-ish, electronic: 808-style kick, clap/snare, hats, a saw-ish bass, a pluck
// arpeggio and a riser; every cut and slam gets an impact / whoosh / glitch / blip.
//   node music/score_kinetic.mjs  → music/kinetic.wav (then EQ + loudnorm → assets/kinetic.m4a, see CLAUDE.md)
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const C = require('../kinetic/cues.js'), S = C.S, Hh = C.hits;
const SR = 44100, DUR = C.dur + 1, N = Math.ceil(SR * DUR), BEAT = .5, TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), sendL = new Float32Array(N), sendR = new Float32Array(N);
const duck = new Float32Array(N).fill(1);   // sidechain: kick ducks the music bus
const musL = new Float32Array(N), musR = new Float32Array(N);
let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function put(t0, len, gen, { gain = 1, pan = 0, rev = 0, bus = 'drum' } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  const BL = bus === 'mus' ? musL : L, BR = bus === 'mus' ? musR : R;
  // float rounding can make the first sample's local time -1e-16, and pow() of a negative is NaN: clamp it
  for (let i = i0; i < i1; i++) { const v = gen(Math.max(0, (i - t0 * SR) / SR)); BL[i] += v * gl; BR[i] += v * gr; sendL[i] += v * gl * rev; sendR[i] += v * gr * rev; }
}
function noise(t0, len, env, filt, o = {}) {
  let lp = 0, bp = 0;
  put(t0, len, tt => { const n = rnd() * 2 - 1, [fc, q0] = filt(tt), q = Math.max(q0, .45), f = Math.min(.85, 2 * Math.sin(Math.PI * Math.min(fc, SR / 7) / SR)); lp += f * bp; const hp = n - lp - q * bp; bp += f * hp; return env(tt) * (o.hp ? hp : o.lp ? lp : bp); }, o);   // f/q clamped: the SVF blows up near f = 1
}
// ---------- drums ----------
const kick = (t, v = 1) => {
  put(t, .55, tt => v * Math.sin(TAU * (48 * tt + 110 * (1 - Math.exp(-tt * 32)) / 32)) * Math.exp(-tt * 6.5) * (tt < .003 ? tt / .003 : 1), { gain: .95 });
  noise(t, .02, tt => v * .5 * Math.exp(-tt * 300), () => [3000, .5], { gain: .5 });
  const i0 = Math.floor(t * SR); for (let i = 0; i < SR * .3 && i0 + i < N; i++) duck[i0 + i] = Math.min(duck[i0 + i], 1 - .65 * Math.exp(-i / SR * 11));
};
const clap = (t, v = 1) => { for (let k = 0; k < 3; k++) noise(t + k * .012, .25, tt => v * (k === 2 ? .8 * Math.exp(-tt * 14) : .6 * Math.exp(-tt * 70)), () => [1400, .5], { gain: .75, rev: .25 }); put(t, .12, tt => v * .25 * Math.sin(TAU * 190 * tt) * Math.exp(-tt * 30), { gain: .6 }); };
const hat = (t, v = 1, open = false) => noise(t, open ? .3 : .06, tt => v * .45 * Math.exp(-tt * (open ? 12 : 70)), () => [9000, .6], { gain: .5, pan: .25, hp: true });
const tick = (t, v = 1) => put(t, .03, tt => v * .3 * Math.sin(TAU * 2600 * tt) * Math.exp(-tt * 180), { gain: .5, pan: -.3 });
// ---------- fx ----------
const impact = (t, v = 1) => { kick(t, v); noise(t, 1.4, tt => v * .9 * Math.exp(-tt * 3.2), tt => [1800 * Math.exp(-tt * 2) + 200, .7], { gain: .7, rev: .6, lp: true }); put(t, 1.6, tt => v * .5 * Math.sin(TAU * (38 * tt + 30 * (1 - Math.exp(-tt * 8)) / 8)) * Math.exp(-tt * 2.2), { gain: .8 }); };
const whoosh = (t, len, v = 1, up = true, pan = 0) => noise(t, len, tt => v * Math.pow(Math.sin(Math.PI * Math.min(1, tt / len)), 2), tt => [up ? 300 * Math.pow(25, tt / len) : 7000 * Math.pow(1 / 25, tt / len), .35], { gain: .7, pan, rev: .4 });
const riser = (t, len, v = 1) => { noise(t, len, tt => v * .35 * Math.pow(tt / len, 2.2), tt => [400 * Math.pow(12, tt / len), .6], { gain: .55, rev: .5, lp: true }); put(t, len, tt => v * .12 * Math.sin(TAU * (220 * tt + 440 * tt * tt / len)) * Math.pow(tt / len, 2), { gain: .6, rev: .4, bus: 'mus' }); };
const glitch = (t, len, v = 1) => { for (let k = 0; k < Math.floor(len / .035); k++) { const tt = t + k * .035, f = 300 + 3000 * rnd(); put(tt, .03, x => v * .22 * Math.sign(Math.sin(TAU * f * x)) * (rnd() < .5 ? 1 : .3), { gain: .6, pan: rnd() * 2 - 1 }); } };
const blip = (t, m = 93, v = 1, pan = 0) => put(t, .14, tt => v * .28 * Math.sin(TAU * mtof(m) * tt) * Math.exp(-tt * 28), { gain: .7, pan, rev: .35, bus: 'mus' });
const stab = (t, notes, v = 1) => notes.forEach((m, i) => put(t, .7, tt => v * .12 * (Math.sin(TAU * mtof(m) * tt) + .5 * Math.sin(TAU * mtof(m) * 2.001 * tt) + .25 * Math.sin(TAU * mtof(m) * 3 * tt)) * Math.exp(-tt * 5), { gain: .8, pan: (i - 1) * .4, rev: .45, bus: 'mus' }));
const odo = (t, len, v = 1) => { for (let k = 0; k < len / .045; k++) tick(t + k * .045 * (1 + k * .02), v * (.5 + .5 * rnd())); };
// ---------- synths ----------
const bass = (t, m, len, v = 1) => { let ph = 0; put(t, len + .05, tt => { ph += mtof(m) / SR; const saw = 2 * (ph % 1) - 1, sq = (ph % 1) < .5 ? 1 : -1, env = Math.min(1, tt / .005) * (tt < len ? 1 : Math.exp(-(tt - len) * 60)); return v * .32 * env * (Math.tanh(1.8 * (saw * .6 + sq * .25 + Math.sin(TAU * ph * .5) * .8))); }, { gain: .75, bus: 'mus' }); };
const pluck = (t, m, v = 1, pan = 0) => put(t, .5, tt => v * .16 * (Math.sin(TAU * mtof(m) * tt) + .35 * Math.sin(TAU * mtof(m) * 2 * tt) * Math.exp(-tt * 12) + .15 * Math.sin(TAU * mtof(m) * 3.01 * tt) * Math.exp(-tt * 20)) * Math.exp(-tt * 9), { gain: .8, pan, rev: .3, bus: 'mus' });
const pad = (t, notes, len, v = 1) => notes.forEach((m, i) => { const d = [1, 1.004, .996]; put(t, len + .8, tt => { let s = 0; for (const k of d) for (let h = 1; h <= 4; h++) s += Math.sin(TAU * mtof(m) * k * h * tt + h) / (h * h); return v * .025 * s * Math.min(1, tt / .4) * (tt > len ? Math.exp(-(tt - len) * 4) : 1); }, { gain: .8, pan: (i - 1) * .5, rev: .6, bus: 'mus' }); });

// ---------- arrangement (bars of 2 s) ----------
const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Am F C G
const ROOT = [33, 29, 36, 31];
const barOf = t => Math.floor(t / 2);
const inMs = t => t >= S.ms0 && t < S.sg1, inSg = t => t >= S.sg1 && t < S.rg0, inRg = t => t >= S.rg0 && t < S.trace;
// intro: pad + riser, the dot blips on the beat, impact at the mark
pad(0, [57, 64, 69], 3.6, .8); riser(.5, 3.4, .9);
for (let b = 4; b < 8; b++) blip(b * BEAT, 81 + (b % 2) * 7, .8);
impact(Hh.mark, .9);   // the intro riser (tonal, mostly noise-free) is the only sweep left in the reel
// the groove. Microsoft: 16th hats, busy bass. Surgery: half-time, sustained bass, soft. RAG: straight groove.
for (let t = 4; t < Hh.glitchEnd; t += BEAT) {
  const b = Math.round(t / BEAT), beatIn = b % 4, ch = barOf(t) % 4;
  if (t >= S.needs && t < S.evid) { if (beatIn === 0) kick(t, .5); continue; }                   // breath on "needs"
  if (t >= Hh.tapeGlitch && t < S.sg1) { hat(t, 1); hat(t + .25, .8); continue; }                 // drop under the recap glitch
  if (t >= Hh.thyWords[2] + .7 && t < S.rg0) continue;                                             // silence under the strips
  if (inSg(t)) {
    if (beatIn === 0) kick(t, .75); if (beatIn === 2) clap(t, .4);
    hat(t, .35); hat(t + .25, .5);
    if (beatIn === 0) { const f = mtof(ROOT[ch] + 12); put(t, 1.95, tt => .3 * Math.sin(TAU * f * tt) * Math.min(1, tt / .02) * Math.exp(-tt * 1.6), { gain: .8, bus: 'mus' }); pad(t, CH[ch].map(m => m + 12), 1.9, .9); }   // soft decaying sub, not a drone
    continue;
  }
  kick(t, beatIn === 0 ? 1 : .85);
  if (beatIn === 1 || beatIn === 3) clap(t, .75);
  const sub = inMs(t) || t >= S.trace ? 4 : 2;
  for (let e = 0; e < sub; e++) hat(t + e * BEAT / sub, e % 2 ? .9 : .45, e === sub - 1 && beatIn === 3);
  if (t >= S.name) { bass(t, ROOT[ch] + 12, BEAT * .45, .9); bass(t + BEAT / 2, ROOT[ch] + (beatIn === 3 ? 19 : 12), BEAT * .4, .75); if (inMs(t) && beatIn % 2) bass(t + BEAT * .75, ROOT[ch] + 24, BEAT * .2, .5); }
  if (t >= S.ms0) for (let s2 = 0; s2 < 4; s2++) { const n = CH[ch][(b * 4 + s2) % 3] + 12 + (s2 === 3 ? 12 : 0); pluck(t + s2 * BEAT / 4, n, inRg(t) ? .42 : .5, s2 % 2 ? .35 : -.35); }
  if (beatIn === 0 && t >= S.name) pad(t, CH[ch].map(m => m + 12), 1.9, .7);
}
// ---- transition sound design (v3.1): no noise whooshes. Transitions are carried by the music: a reversed-pad swell
// into each chapter, and small in-key tonal cues (never the same one twice in a row) for the cuts inside a chapter.
// About half of the in-chapter transitions get no cue at all: the downbeat + the next shot's own sounds carry them.
const swell = (tEnd, notes, len = 1.6, v = 1) => notes.forEach((m, i) => put(tEnd - len, len + .06, tt => {   // reverse pad: grows, then stops dead on the cut
  const q = tt / len, env = q < 1 ? Math.pow(q, 2.6) : Math.max(0, 1 - (tt - len) / .06); let s = 0;
  for (let h = 1; h <= 3; h++) s += Math.sin(TAU * mtof(m) * h * tt + h) / (h * h);
  return v * .07 * s * env;
}, { gain: .8, pan: (i / Math.max(1, notes.length - 1) - .5) * .6, rev: .35, bus: 'mus' }));
const bloom = (t, notes, v = 1) => notes.forEach((m, i) => put(t + i * .03, 1.6, tt => v * .06 * (Math.sin(TAU * mtof(m) * tt) + .3 * Math.sin(TAU * mtof(m) * 2.01 * tt)) * Math.min(1, tt / .08) * Math.exp(-tt * 2.4), { gain: .8, pan: (i - 1) * .4, rev: .6, bus: 'mus' }));
const glide = (t, len, m0, m1, v = 1) => { let ph = 0; put(t, len + .15, tt => { const q = Math.min(1, tt / len), f = mtof(lerpN(m0, m1, q * q * (3 - 2 * q))); ph += f / SR; const tri = 1 - 4 * Math.abs((ph % 1) - .5); return v * .07 * tri * Math.sin(Math.PI * Math.min(1, tt / (len + .15))); }, { gain: .8, rev: .45, bus: 'mus' }); };
const harp = (t, span, notes, v = 1, dir = 1) => notes.forEach((m, i) => pluck(t + (dir > 0 ? i : notes.length - 1 - i) * span / notes.length, m, .32 * v, -.6 + 1.2 * i / Math.max(1, notes.length - 1)));
const hatRoll = (t, n = 4, v = .6) => { for (let k = 0; k < n; k++) hat(t - (n - k) * .0625, v * (.4 + .6 * k / n)); };
const lerpN = (a, b, k) => a + (b - a) * k;
const softImpact = (t, v = 1) => { kick(t, v); put(t, 1.2, tt => v * .4 * Math.sin(TAU * (40 * tt + 24 * (1 - Math.exp(-tt * 8)) / 8)) * Math.exp(-tt * 2.6), { gain: .8 }); };   // no noise tail
const AM = [57, 64, 69, 72], FM = [53, 60, 65, 69], CM = [52, 60, 67, 72], GM = [55, 62, 67, 71];

// ---- intro hits
bloom(3.55, [69, 76, 81], .8); stab(Hh.answer, [69, 72, 76], .9);
blip(S.needs + .05, 88, .8); blip(S.needs + .3, 93, .6);
softImpact(Hh.evidSlam, 1); stab(Hh.evidSlam, [57, 60, 64, 69], 1);
glitch(Hh.glitchOut1, .25, .6);
softImpact(Hh.name, .8); stab(Hh.nameFill, [69, 72, 76, 81], .8); blip(Hh.nameFill, 100, .7);
Hh.idx.forEach((t, i) => { stab(t, [[69, 76], [67, 72], [64, 69]][i], .6); for (let k = 0; k < 6; k++) tick(t + .2 + k * .05, .5); });
// ---- 01 Microsoft
swell(S.ms0, AM, 1.5, 1.1); impact(S.ms0, 1.1); stab(S.ms0, [57, 64, 69, 72], 1);
for (let i = 0; i < 9; i++) tick(Hh.msWord + i * .03, .8);
stab(Hh.msFive, [64, 69, 72, 76], .8); blip(Hh.msFive, 100, .7);
bloom(S.m1a, [76, 81, 88], .9);                                              // iris out of the "05"
for (let j = 0; j < 24; j++) tick(Hh.tiles + j * .035, .7);
stab(Hh.route, [69, 72, 76, 81], .9); blip(Hh.route, 105, .8, .4);
for (let c = 0; c < 32; c++) blip(Hh.scan + c * 1.5 / 32, 84 + (c % 8) * 2, .35, -.6 + 1.2 * c / 32);   // zoom into T07: the scan carries it
stab(Hh.scan + 1.5, [69, 72, 76], .7);
hatRoll(S.m1c, 4, .6);                                                       // the lime wipe
for (let k = 0; k < 40; k++) tick(Hh.type + k * .031, .55);
for (let i = 0; i < 3; i++) put(Hh.mask + .06 * (i + 1), .12, tt => .2 * Math.sign(Math.sin(TAU * 110 * tt)) * Math.exp(-tt * 20), { gain: .6, pan: .3, bus: 'mus' });
blip(Hh.mask, 96, .8, .3);
Hh.tags.forEach((t, i) => blip(t, 88 + i * 3, .6, -.3 + i * .2));
glide(S.m1d, .5, 69, 81, .9);                                                // zoom through the allowed token
odo(Hh.flip, 1, .9); stab(Hh.flip + 1, [72, 76, 79, 84], 1);
Hh.nodes.forEach((t, i) => blip(t, 81 + i * 4, .7, -.4 + i * .4));          // push up: no cue
Hh.hops.forEach((t, i) => blip(t, [84, 88, 84, 88, 93][i], .8, [-.5, 0, -.5, 0, .5][i]));
stab(Hh.stats2, [69, 72, 76], .8); blip(Hh.stats2 + .15, 96, .5); blip(Hh.stats2 + .3, 100, .5);
bloom(S.m3, [72, 79, 84], .8);                                               // iris out of ANSWER
Hh.rounds.forEach((t, i) => { const r = [0, 2, 3][i]; pluck(t, 69 + r, .6, -.4); pluck(t + .12, 76 + r, .5, -.2); pluck(t + .5, 76 + r, .5, .2); pluck(t + .62, 69 + r, .45, .4); stab(t, [[64, 69], [66, 71], [67, 72, 76]][i], .5); });
for (let i = 0; i < 12; i++) blip(Hh.rules + i * .125, 84 + i, .45, .5);
stab(Hh.stats3, [69, 72, 76, 81], .8);
harp(S.m4, .5, [69, 72, 76, 79, 81, 84, 88, 91, 93, 96, 100, 103], .9, 1);  // the slats
for (let i = 0; i < 8; i++) tick(Hh.stages + i * .08, .9);
for (let i = 0; i < 18; i++) { const t0 = Hh.flow + i * .25, drop = t0 + (100 + 3 * 220 + 90 - 80) / 720; if (i % 3 === 2) put(drop, .25, tt => .18 * Math.sin(TAU * (300 - 600 * tt) * tt) * Math.exp(-tt * 10), { gain: .6, pan: -.1, bus: 'mus' }); }
stab(Hh.card, [67, 71, 74], .7); for (let j = 0; j < 6; j++) blip(Hh.card + .7 + j * .12, 88 + j * 2, .5, .4);
stab(Hh.stats4, [69, 72, 76, 81], .8);
softImpact(S.m5 + .3, .8); Hh.rows.forEach((t, i) => { blip(t, 86 + i * 3, .7, -.3); blip(t + .1, 98, .4, .3); });   // zoom into the card: the slam carries it
for (let k = 0; k < 48; k++) tick(Hh.tests + k * 2 / 48, .7);
stab(Hh.tests + 2, [72, 76, 79, 84], .9); stab(Hh.stats5, [69, 72, 76], .7);
for (let i = 0; i < 16; i++) tick(S.msEnd + i * .035, .7); stab(Hh.tapes + .3, [69, 72, 76], .7);   // the grid dissolve
swell(S.sg1, FM, 2, 1); glitch(Hh.tapeGlitch + .2, S.sg1 - Hh.tapeGlitch - .2, .45);
// ---- 02 UW–Madison Surgery
impact(S.sg1, .8); pad(S.sg1, [45, 57, 64, 69, 72], 3.6, 1.1);
for (let i = 0; i < 16; i++) put(Hh.form + i * .1, 1.2, tt => .05 * Math.sin(TAU * mtof(93 + (i % 5) * 2) * tt) * Math.exp(-tt * 3) * Math.min(1, tt / .02), { gain: .8, pan: Math.sin(i) * .6, rev: .7, bus: 'mus' });
stab(Hh.sgTitle, [57, 64, 69], .8); stab(Hh.sgTitle + .2, [60, 64, 72], .7); blip(Hh.sgRole, 96, .8); for (let k = 0; k < 5; k++) tick(Hh.sgMeta + k * .06, .5);
Hh.sgStages.forEach((t, i) => blip(t, 84 + i * 2, .5, -.5 + i * .2));      // push: no cue
glitch(Hh.slice, .2, .4); [81, 79, 76, 72, 69].forEach((m, i) => pluck(Hh.embed + i * .1, m, .45, .3 - i * .15)); blip(Hh.query, 88, .7, -.5);
for (let i = 0; i < 3; i++) put(Hh.pick + i * .08, 1.5, tt => .12 * (Math.sin(TAU * mtof([88, 93, 96][i]) * tt) + .4 * Math.sin(TAU * mtof([88, 93, 96][i]) * 2.76 * tt)) * Math.exp(-tt * 3), { gain: .7, pan: .3, rev: .6, bus: 'mus' });
glide(S.sg3, .55, 64, 76, .8);                                               // zoom through GROUNDED ANSWER
Hh.sentences.forEach(t => { for (let k = 0; k < 7; k++) tick(t + k * .04, .45); });
Hh.threads.forEach((t, i) => { pluck(t, [76, 79, 84, 79][i], .8, .2); pluck(t + .12, [81, 84, 88, 84][i], .5, .4); });
harp(S.sg4, .45, [100, 96, 93, 88, 84, 81, 76, 72, 69, 64], .8, 1);         // the slats, falling this time
const gx = [560, 860, 1160, 1460];
Hh.packets.forEach((p0, i) => gx.forEach((x, g) => { const tg = p0 + (x - 220) / 1480 * 1.7; if (i === 1 && g > 1) return; if (i === 1 && g === 1) { put(tg, .35, tt => .22 * Math.sign(Math.sin(TAU * 98 * tt)) * Math.exp(-tt * 8), { gain: .6, bus: 'mus' }); blip(tg + .6, 64, .7); } else blip(tg, 88 + g * 3, .45, -.4 + g * .25); }));
bloom(S.sg5, [69, 76, 81], .9); pad(S.sg5, [57, 64, 69, 72], 1.6, 1.1);    // iris out of the defer box
Hh.thyWords.forEach((t, i) => stab(t, [[69, 72], [71, 74], [72, 76, 81]][i], .8));
swell(S.rg0, AM, 1.2, 1); glitch(Hh.thyWords[2] + .7, S.rg0 - Hh.thyWords[2] - .7, .45);
// ---- 03 Enterprise RAG
impact(S.rg0, .9); stab(S.rg0, [57, 60, 64, 69], .8); for (let i = 0; i < 10; i++) tick(Hh.ragWord + i * .025, .7); for (let i = 0; i < 4; i++) tick(Hh.ragWord + .2 + i * .04, .7);
blip(Hh.ragMeta, 93, .6); blip(Hh.ragMeta + .15, 96, .6);
for (let j = 0; j < 14; j++) tick(Hh.lists + j * .04, .6);                 // push: no cue
for (let j = 0; j < 7; j++) blip(Hh.fuse + j * .08 + .4, 81 + j * 2, .5, .4);
stab(Hh.funnel + .3, [69, 72, 76], .6); stab(Hh.rgStats, [72, 76, 79], .8);
for (let i = 0; i < 3; i++) blip(Hh.lanes + i * .1, 84 + i * 4, .6, .3);  // zoom through the top fused doc: the lanes carry it
for (let i = 0; i < 6; i++) tick(Hh.stream + i * .32, .8);
put(Hh.fallback - .3, .3, tt => .2 * Math.sign(Math.sin(TAU * 130 * tt)) * Math.exp(-tt * 9), { gain: .6, pan: -.2, bus: 'mus' }); blip(Hh.fallback, 100, .7);
stab(Hh.route, [69, 72, 76, 81], .8);
hatRoll(S.rg3, 4, .6); for (let i = 0; i < 5; i++) blip(Hh.tree + i * .08, 84 + i * 2, .5); for (let i = 0; i < 4; i++) tick(Hh.check + i * .1, .9);
put(Hh.attack, .4, tt => .2 * Math.sign(Math.sin(TAU * 73 * tt)) * Math.exp(-tt * 5), { gain: .6, bus: 'mus' }); softImpact(Hh.block, .9); stab(Hh.sqlStats, [69, 72, 76], .7);
for (let i = 0; i < 20; i++) tick(S.rg4 + i * .03, .6); for (let i = 0; i < 4; i++) stab(Hh.board + .2 + i * .18, [[69, 72], [72, 76], [76, 79], [79, 84]][i], .6);
// ---- finale: the trace, the name
for (let i = 0; i < 15; i++) tick(Hh.traceRows + i * .07, .7);              // push: no cue
stab(Hh.traceOk, [69, 72, 76, 81], 1); blip(Hh.traceOk, 105, .8); swell(S.end, AM.concat([76]), 1.2, 1.1);
impact(S.end, 1.1); stab(S.end, [57, 60, 64, 69], 1); pad(S.end, [45, 57, 64, 69, 72], 4.3, 1.2);
stab(Hh.endMark, [69, 72, 76, 81], .8);
glitch(Hh.glitchEnd, 1, .7);
softImpact(Hh.endDot, .9); put(Hh.endDot, 1.4, tt => .25 * Math.sin(TAU * 1760 * tt) * Math.exp(-tt * 4), { gain: .6, rev: .8, bus: 'mus' });

// ---------- mix: sidechain music bus, reverb, glue, master ----------
function verb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491].map(d => ({ b: new Float32Array(d + spread), i: 0, s: 0 })), aps = [556, 441, 341].map(d => ({ b: new Float32Array(d + spread), i: 0 }));
  const o = new Float32Array(N);
  for (let n = 0; n < N; n++) { const x = inp[n] * .02; let y = 0; for (const c of combs) { const v = c.b[c.i]; c.s = v * .7 + c.s * .3; c.b[c.i] = x + c.s * .82; c.i = (c.i + 1) % c.b.length; y += v; } for (const a of aps) { const v = a.b[a.i]; a.b[a.i] = y + v * .5; a.i = (a.i + 1) % a.b.length; y = v - y; } o[n] = y; }
  return o;
}
const wl = verb(sendL, 0), wr = verb(sendR, 23);
const oL = new Float32Array(N), oR = new Float32Array(N); let peak = 0;
for (let n = 0; n < N; n++) {
  let l = L[n] + musL[n] * duck[n] + wl[n] * 4, r = R[n] + musR[n] * duck[n] + wr[n] * 4;
  l = Math.tanh(l * 1.2) / 1.2 * 1.1; r = Math.tanh(r * 1.2) / 1.2 * 1.1;
  oL[n] = l; oR[n] = r; peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const g = .9 / peak, fadeOut = Math.floor((C.dur - .2) * SR);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, n / (.02 * SR)) * (n > fadeOut ? Math.max(0, 1 - (n - fadeOut) / (1.2 * SR)) : 1);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oL[n] * g * f)) * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oR[n] * g * f)) * 32767), 46 + n * 4);
}
writeFileSync(new URL('./kinetic.wav', import.meta.url), buf);
console.log(`kinetic.wav: ${DUR} s, peak ${peak.toFixed(2)} → normalized`);
