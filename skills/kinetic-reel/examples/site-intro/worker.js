// worker.js: static assets are served by Cloudflare directly (wrangler.jsonc "assets"). Only /assets/reel/* (the intro reel on index.html) runs
// through this Worker (assets.run_worker_first), to add HTTP Range support for the video: Workers static
// assets answer a Range request with the whole file (200), which breaks seeking, and Safari/iOS won't play an MP4
// without 206 Partial Content. The slice is streamed when the asset declares its length; otherwise it is read once.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/assets/reel/')) return env.ASSETS.fetch(request);

    // ask the asset store for the whole file (no Range), then cut the requested slice out of the stream
    const res = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
    if (!res.ok || !res.body) return res;
    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.delete('Content-Encoding');

    const range = request.headers.get('Range');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let size = Number(res.headers.get('Content-Length')) || 0;
    if (!m) { if (size) headers.set('Content-Length', String(size)); return new Response(request.method === 'HEAD' ? null : res.body, { status: 200, headers }); }
    // the asset response may not declare its length (chunked): then read it once and slice the buffer
    let buf = null;
    if (!size) { buf = await res.arrayBuffer(); size = buf.byteLength; }

    let start, end;
    if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }   // suffix range: last N bytes
    else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (!(start <= end) || start >= size) {
      if (!buf) res.body.cancel();
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    if (request.method === 'HEAD') { if (!buf) res.body.cancel(); return new Response(null, { status: 206, headers }); }
    if (buf) return new Response(buf.slice(start, end + 1), { status: 206, headers });

    let pos = 0;
    const slice = new TransformStream({
      transform(chunk, ctrl) {
        const cs = pos, ce = pos + chunk.byteLength; pos = ce;
        if (ce <= start || cs > end) return;
        ctrl.enqueue(chunk.subarray(Math.max(0, start - cs), Math.min(chunk.byteLength, end + 1 - cs)));
      },
    });
    return new Response(res.body.pipeThrough(slice), { status: 206, headers });
  },
};
