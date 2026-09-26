import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { isIP } from "node:net";
import { addAbortListener } from "node:events";

/** Node fetch can discard Host. Native HTTP also supports the private tailnet proxy.
 * TLS still verifies the URL hostname; redirects are never followed. */
export async function fetchOllama(url: string, init: RequestInit = {}, proxyUrl = process.env.OLLAMA_PROXY_URL): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Host") && !proxyUrl) return fetch(url, init);
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Invalid endpoint");
  if (init.body != null && typeof init.body !== "string") throw new Error("Expected JSON body");
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  // Deliberately scoped to Ollama: never proxy SMTP or unrelated application traffic.
  const agent = proxyUrl ? new (target.protocol === "https:" ? HttpsAgent : HttpAgent)({
    keepAlive: false, proxyEnv: { HTTP_PROXY: proxyUrl, HTTPS_PROXY: proxyUrl },
  }) : undefined;
  if (agent && init.signal) {
    // Node does not attach a proxied request's AbortSignal to the socket until
    // CONNECT/TLS completes. Track that initial socket so the SAME deadline
    // cancels a stalled proxy handshake as well as the eventual response body.
    const createConnection = agent.createConnection;
    agent.createConnection = function (options, callback) {
      const socket = createConnection.call(this, options, callback);
      if (socket) {
        const listener = addAbortListener(init.signal!, () => socket.destroy(new Error("Ollama request aborted")));
        socket.once("close", () => listener[Symbol.dispose]());
      }
      return socket;
    };
  }
  return new Promise((resolve, reject) => {
    const request = (target.protocol === "https:" ? httpsRequest : httpRequest)(target, {
      method: init.method ?? "GET", headers: Object.fromEntries(headers), signal: init.signal ?? undefined, agent,
      // Native HTTPS otherwise derives SNI from Host, which names the proxy's
      // upstream, not the machine whose certificate we must verify.
      ...(target.protocol === "https:" ? { servername: isIP(hostname) ? "" : hostname } : {}),
    }, response => {
      response.on("close", () => agent?.destroy());
      const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) responseHeaders.append(key, item);
      }
      const status = response.statusCode ?? 502;
      const noBody = init.method === "HEAD" || [204, 205, 304].includes(status);
      if (noBody) response.resume();
      resolve(new Response(noBody ? null : Readable.toWeb(response) as ReadableStream<Uint8Array>, {
        status, headers: responseHeaders,
      }));
    });
    request.on("error", error => { agent?.destroy(); reject(error); });
    request.end(init.body ?? undefined);
  });
}
