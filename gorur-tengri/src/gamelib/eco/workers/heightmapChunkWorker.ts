export type HeightmapChunkWorkerRequest = {
    url: string;
};

export type HeightmapChunkWorkerResponse = {
    url: string;
    buffer: ArrayBuffer;
};

async function gunzipToArrayBuffer(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    //const res2 = res.clone();

    //const raw = await res.arrayBuffer();
    //console.log(url, "Raw Len", raw.byteLength)
    if (!res.ok) {
        // include status + url in thrown message so main thread sees it
        const txt = await res.text().catch(() => "<no body>");
        throw new Error(`Failed to fetch chunk: ${res.status} ${res.statusText} (${url}) - body: ${txt}`);
    }
    if (!res.body) throw new Error(`Fetch response has no body stream (needed for DecompressionStream). (${url})`);

    const ds = new DecompressionStream("gzip");
    const decompressed = res.body.pipeThrough(ds);
    // debug: log the stream object (may be large/opaque)
    console.log("decompressed stream:", decompressed);
    let writable = new WritableStream();
    const stuff = await new Response(decompressed).arrayBuffer();
    console.log("decompressed bytes:", stuff.byteLength);
    return stuff;
}

self.onmessage = async (ev: MessageEvent<HeightmapChunkWorkerRequest>) => {
     const { url } = ev.data;

    try {
        const buffer = await gunzipToArrayBuffer(url);

        // transfer the decompressed bytes back to main thread
        const msg: HeightmapChunkWorkerResponse = { url, buffer };
        self.postMessage(msg, { transfer: [buffer] });
    } catch (err: any) {
        self.postMessage({
            url,
            error: err?.message ?? String(err),
        }); 
    }
};