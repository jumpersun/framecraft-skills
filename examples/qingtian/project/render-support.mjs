// Local render inputs are fingerprinted so a resumed job cannot silently reuse an older edit.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const FRAME = /^f\d{5,}\.jpg$/;
const INPUTS = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ttf', '.otf', '.glsl', '.vert', '.frag']);
const manifestPath = dir => join(dir, 'render.json');
export function readRenderState(dir) {
  return existsSync(manifestPath(dir)) ? JSON.parse(readFileSync(manifestPath(dir), 'utf8')) : null;
}
export function fingerprint(dir, settings) {
  const root = process.cwd(), frames = resolve(dir), hash = createHash('sha256');
  hash.update(JSON.stringify(settings));
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(folder, entry.name);
      if (entry.name.startsWith('.') || ['node_modules', 'out', 'outputs'].includes(entry.name) || resolve(file) === frames) continue;
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && INPUTS.has(extname(entry.name))) {
        hash.update(relative(root, file)); hash.update('\0'); hash.update(readFileSync(file)); hash.update('\0');
      }
    }
  }
  visit(root);
  return hash.digest('hex');
}
export function prepareRenderState(dir, settings, audio) {
  mkdirSync(dir, { recursive: true });
  const previous = readRenderState(dir), signature = fingerprint(dir, settings);
  if (!previous || previous.signature !== signature) {
    // Only generated JPEG frames are invalidated; user assets and other files stay untouched.
    for (const file of readdirSync(dir)) if (FRAME.test(file)) unlinkSync(join(dir, file));
  }
  const state = { version: 1, settings, signature, audio: audio || '' };
  writeFileSync(manifestPath(dir) + '.tmp', JSON.stringify(state, null, 2));
  renameSync(manifestPath(dir) + '.tmp', manifestPath(dir));
  return state;
}
export function encodingState(dir, fps) {
  const state = readRenderState(dir);
  if (!state || state.version !== 1) throw new Error('Missing render metadata; run --frames first.');
  if (fps !== undefined && Number(fps) !== state.settings.fps) throw new Error('FPS differs from rendered frames; render again with the requested --fps.');
  if (fingerprint(dir, state.settings) !== state.signature) throw new Error('Render inputs changed; run --frames again before encoding.');
  for (let i = 0; i < state.settings.count; i++) {
    const file = join(dir, `f${String(i).padStart(5, '0')}.jpg`);
    if (!existsSync(file) || statSync(file).size < 1000) throw new Error(`Missing or incomplete frame ${i}; run --frames to finish the full timeline.`);
  }
  return state;
}
export function waitForProcess(child, label) {
  return new Promise((ok, bad) => {
    child.once('error', bad);
    child.once('close', (code, signal) => code === 0 ? ok() : bad(new Error(`${label} failed (${signal || code})`)));
  });
}
