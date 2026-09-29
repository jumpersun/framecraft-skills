import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { Writable, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { prepareRenderState, encodingState, waitForProcess } from '../template/render-support.mjs';

function workspace(fn) {
  const before = process.cwd(), root = mkdtempSync(join(tmpdir(), 'video-render-test-'));
  process.chdir(root);
  try { return fn(root); }
  finally { process.chdir(before); rmSync(root, { recursive: true, force: true }); }
}
const settings = { fps: 24, count: 2, page: 'studio.html', loop: '' };
const frame = i => `out/frames/f${String(i).padStart(5, '0')}.jpg`;
function complete() { for (let i = 0; i < settings.count; i++) writeFileSync(frame(i), Buffer.alloc(1200)); }

test('unchanged inputs resume; a scene edit invalidates generated frames only', () => workspace(() => {
  writeFileSync('scene.js', 'v1');
  prepareRenderState('out/frames', settings, 'assets/song.mp3'); complete();
  writeFileSync('out/frames/keep.txt', 'user note');
  prepareRenderState('out/frames', settings, 'assets/song.mp3');
  assert(existsSync(frame(0)));
  writeFileSync('scene.js', 'v2');
  prepareRenderState('out/frames', settings, 'assets/song.mp3');
  assert(!existsSync(frame(0)));
  assert(existsSync('out/frames/keep.txt'));
}));

test('encoding rejects missing metadata, incomplete frames, FPS mismatch and changed input', () => workspace(() => {
  assert.throws(() => encodingState('out/frames'), /metadata/);
  writeFileSync('scene.js', 'v1'); prepareRenderState('out/frames', settings, 'song.mp3');
  assert.throws(() => encodingState('out/frames'), /incomplete frame/);
  complete();
  assert.equal(encodingState('out/frames').audio, 'song.mp3');
  assert.throws(() => encodingState('out/frames', 30), /FPS differs/);
  writeFileSync('scene.js', 'v2');
  assert.throws(() => encodingState('out/frames'), /inputs changed/);
}));

test('audio-only updates preserve visual cache; changing FPS invalidates it', () => workspace(() => {
  mkdirSync('assets'); writeFileSync('assets/score.m4a', 'old audio');
  prepareRenderState('out/frames', settings, 'assets/score.m4a'); complete();
  writeFileSync('assets/score.m4a', 'new audio');
  assert.equal(encodingState('out/frames').settings.count, 2);
  prepareRenderState('out/frames', { ...settings, fps: 30 }, 'assets/score.m4a');
  assert(!existsSync(frame(0)));
}));

test('process failures and spawn errors reject; successful exit resolves', async () => {
  const bad = new EventEmitter(), badResult = waitForProcess(bad, 'ffmpeg');
  bad.emit('close', 7); await assert.rejects(badResult, /failed \(7\)/);
  const missing = new EventEmitter(), missingResult = waitForProcess(missing, 'ffmpeg');
  missing.emit('error', new Error('ENOENT')); await assert.rejects(missingResult, /ENOENT/);
  const good = new EventEmitter(), goodResult = waitForProcess(good, 'ffmpeg');
  good.emit('close', 0); await goodResult;
});

async function runRenderer(flags, exitCode = 0) {
  const source = readFileSync(new URL('../template/render.mjs', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const logs = [], commands = []; let closed = false, rendered = 0, prepared;
  const page = {
    on() {}, async goto() {}, async waitForFunction() {}, async close() {},
    async evaluate(fn) {
      const code = fn.toString();
      if (code.includes('window.LOOP ?')) return .1;
      if (code.includes('PROJECT.audio')) return 'assets/configured-song.m4a';
      if (code.includes('window.renderAt')) { rendered++; return 'data:image/jpeg;base64,YQ=='; }
      throw new Error('Unexpected page evaluation');
    },
  };
  const values = {
    puppeteer: { launch: async () => ({ newPage: async () => page, close: async () => { closed = true; } }) },
    spawn(command, args) {
      commands.push({ command, args });
      const child = new EventEmitter(); child.exitCode = null;
      const finish = () => setImmediate(() => { child.exitCode = exitCode; child.emit('close', exitCode); });
      child.stdin = new Writable({ write(data, enc, cb) { cb(); }, final(cb) { cb(); finish(); } });
      child.kill = () => { child.exitCode = -1; };
      if (flags.includes('--encode')) finish();
      return child;
    },
    mkdirSync() {}, writeFileSync() {}, existsSync: p => !flags.includes('--encode') && String(p).includes('Google Chrome.app'),
    statSync: () => ({ size: 2000 }), renameSync() {}, readdirSync: () => [], dirname: () => 'out', resolve: p => '/test/' + p,
    pathToFileURL, homedir: () => '/no-browser-cache', Readable, pipeline,
    prepareRenderState: (dir, settings, audio) => { prepared = { settings, audio }; },
    encodingState: () => ({ settings: { fps: 24, count: 2 }, audio: 'assets/configured-song.m4a' }), waitForProcess,
    process: { argv: ['node', 'render.mjs', ...flags], env: {}, platform: 'darwin', exit(code) { throw { exit: code }; } },
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) }, Buffer,
  };
  let error;
  try { await new AsyncFunction(...Object.keys(values), source)(...Object.values(values)); }
  catch (e) { if (e.exit !== 0) error = e; }
  return { logs, commands, closed, error, rendered, prepared };
}

test('real renderer control flow reports ffmpeg failure and closes Chrome', async () => {
  const result = await runRenderer(['--clip', '--fps=24'], 7);
  assert.match(result.error.message, /failed \(7\)/);
  assert(!result.logs.some(line => line.startsWith('wrote ')));
  assert(result.closed);
});

test('real encode branch inherits audio and FPS, limits frame count and requires no Chrome', async () => {
  const result = await runRenderer(['--encode']);
  assert.equal(result.error, undefined);
  const args = result.commands[0].args;
  assert(args.includes('assets/configured-song.m4a'));
  assert.equal(args[args.indexOf('-framerate') + 1], '24');
  assert.equal(args[args.indexOf('-frames:v') + 1], '2');
});

test('a fractional frame duration produces all frames required by the manifest', async () => {
  const result = await runRenderer(['--frames', '--fps=24']);
  assert.equal(result.error, undefined);
  assert.equal(result.prepared.settings.count, 3);
  assert.equal(result.rendered, 3);
  assert.equal(result.prepared.audio, 'assets/configured-song.m4a');
  assert(result.closed);
});
