// kinetic/cues.js: the timeline of the kinetic-type reel (shared by the page and music/score_kinetic.mjs).
// v3: 84 s, 120 BPM (a beat is 0.5 s, a bar 2 s). Order of emphasis: 01 Microsoft (30 s) → 02 UW–Madison Surgery
// (18 s) → 03 Enterprise RAG (14 s). The whole reel is framed as one agent trace (segmented progress bar, trace finale).
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);
  const S = { boot: 0, every: 4, needs: 6, evid: 7, name: 8, index: 10,
              ms0: 12, m1a: 14, m1b: 16, m1c: 18, m1d: 20, m2: 23, m3: 27, m4: 31, m5: 36, msEnd: 40,
              sg1: 42, sg2: 46, sg3: 50, sg4: 54, sg5: 58,
              rg0: 60, rg1: 62, rg2: 66, rg3: 69, rg4: 72,
              trace: 74, end: 78 };
  return {
    bpm: 120, fps: 30, dur: 84, B, S,
    // chapters for the segmented progress bar / the trace finale
    CH: [['INTRO', 0, 12], ['01 MICROSOFT', 12, 42], ['02 UW SURGERY', 42, 60], ['03 ENTERPRISE RAG', 60, 74], ['TRACE', 74, 84]],
    hits: {
      dot: 2, mark: 3, answer: 5, evidSlam: 7, glitchOut1: 7.75, name: 8, nameFill: 8.5,
      idx: [10.25, 10.75, 11.25],
      msWord: 12, msSub: 12.5, msFive: 13,
      tiles: 14.25, route: 15.25,
      scan: 16.25,
      type: 18.1, mask: 18.75, tags: [19, 19.25, 19.5, 19.75],
      flip: 20.25, lat: 21.5,
      nodes: [23, 23.25, 23.5], hops: [24, 24.5, 25, 25.5, 26], stats2: 25.5,
      rounds: [27.5, 28.5, 29.5], rules: 28, stats3: 30,
      stages: 31, flow: 31.5, card: 33.5, stats4: 34.5,
      rows: [36.5, 37, 37.5, 38], tests: 36.75, stats5: 39,
      tapes: 40, tapeGlitch: 41.5,
      // 02 surgery
      form: 42, sgTitle: 42.5, sgRole: 43.5, sgMeta: 44.25,
      sgStages: [46, 46.25, 46.5, 46.75, 47, 47.25], slice: 47.5, embed: 48.25, query: 49, pick: 49.25,
      sentences: [50.25, 50.5, 50.75, 51], threads: [51.5, 52, 52.5, 53],
      gates: 54, packets: [54.6, 55.35, 56.1],
      thyWords: [58, 58.4, 58.8],
      // 03 rag
      ragWord: 60, ragMeta: 60.75,
      lists: 62.25, fuse: 63.25, funnel: 64.5, rgStats: 65.25,
      lanes: 66, stream: 66.4, fallback: 67.5, route: 68.25,
      tree: 69, check: 69.6, attack: 70.25, block: 70.75, sqlStats: 71.25,
      board: 72,
      // finale
      traceRows: 74.25, traceOk: 76.75,
      endLetters: 78, endMark: 78.5, glitchEnd: 82.5, endDot: 83.5,
    },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
