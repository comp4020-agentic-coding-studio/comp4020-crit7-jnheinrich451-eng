import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { isIP } from "node:net";

/** Node fetch can discard Host. Use native HTTP only for an explicit proxy override.
 * TLS still verifies the URL hostname; redirects are never followed. */
export async function fetchOllama(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Host")) return fetch(url, init);
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Invalid endpoint");
  if (init.body != null && typeof init.body !== "string") throw new Error("Expected JSON body");
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  return new Promise((resolve, reject) => {
    const request = (target.protocol === "https:" ? httpsRequest : httpRequest)(target, {
      method: init.method ?? "GET", headers: Object.fromEntries(headers), signal: init.signal ?? undefined,
      // Native HTTPS otherwise derives SNI from Host, which names the proxy's
      // upstream, not the machine whose certificate we must verify.
      ...(target.protocol === "https:" ? { servername: isIP(hostname) ? "" : hostname } : {}),
    }, response => {
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
    request.on("error", reject);
    request.end(init.body ?? undefined);
  });
}
