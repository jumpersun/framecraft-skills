# Example: a reel as a site's entry page

How the Work Reel ’26 ships on its portfolio: the reel plays full-screen, then the end screen offers
"Enter the site" and "Watch again".

| File | What it does |
|---|---|
| `index.html` | The page: `<video>`, skip + sound pills, the end screen, the exit iris |
| `css/intro-reel.css` | The reel's look in CSS: ink / cream / lime, Anton + JetBrains Mono, HUD corners, beat-timed motion |
| `js/intro-reel.js` | Autoplay with sound, then muted, then a "start" screen. It also handles skip / Esc / M, replay, the magnetic CTAs, a 2D dot-field background and the iris exit |
| `worker.js` | A Cloudflare Worker that answers Range requests with 206. Workers static assets return the whole file, which breaks seeking and Safari playback. Route only the video path through it with `assets.run_worker_first` |

To adapt it, change the video paths in `intro-reel.js` (`v.src`), the name, role and links in `index.html`, and
`HOME` in `intro-reel.js`. Self-host Anton and JetBrains Mono (both SIL OFL, from Google Fonts) under `fonts/`,
or change the `@font-face` rules. Encode two sizes (for example 1600×900 at ~1.3 Mbps and 960×540 at ~0.6 Mbps)
and pass `-movflags +faststart`.
