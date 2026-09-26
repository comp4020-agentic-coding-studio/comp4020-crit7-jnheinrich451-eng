import { expect, it } from "vitest";
import { createServer } from "node:http";
import { createServer as httpsServer } from "node:https";
import { connect, type AddressInfo, type Socket } from "node:net";
import { getCACertificates, setDefaultCACertificates } from "node:tls";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchOllama } from "../src/lib/ollama-transport";

it("routes only adviser traffic through the proxy and rejects conflicting plaintext authorities", async () => {
  const seen: { url?: string; host?: string }[] = [];
  const proxy = createServer((request, response) => {
    seen.push({ url: request.url, host: request.headers.host });
    response.end('{"models":[]}');
  });
  await new Promise<void>(resolve => proxy.listen(0, "127.0.0.1", resolve));
  const proxyUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
  try {
    const response = await fetchOllama("http://private.invalid/api/tags", {}, proxyUrl);
    expect(await response.json()).toEqual({ models: [] });
    expect(seen).toEqual([{ url: "http://private.invalid/api/tags", host: "private.invalid" }]);
    await expect(fetchOllama("http://private.invalid/api/tags", { headers: { Host: "localhost:11434" } }, proxyUrl)).rejects.toThrow();
    // Ordinary fetch must remain direct, even after an adviser proxy request.
    await expect(fetch("http://private.invalid/api/tags")).rejects.toThrow();
    expect(seen).toHaveLength(1);
  } finally { proxy.closeAllConnections(); await new Promise<void>(resolve => proxy.close(() => resolve())); }
});

it("tunnels HTTPS to the URL hostname, verifies its certificate, and aborts stalled proxied bodies", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ollama-proxy-"));
  const key = join(dir, "key.pem"), cert = join(dir, "cert.pem");
  // Ephemeral test identity, never a committed or deployed private key.
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key,
    "-out", cert, "-days", "1", "-subj", "/CN=ollama.test", "-addext", "subjectAltName=DNS:ollama.test"], { stdio: "ignore" });
  const roots = getCACertificates();
  const seen: string[] = [], sockets = new Set<Socket>();
  let receivedHost: string | undefined, stalledClosed = false;
  const upstream = httpsServer({ key: readFileSync(key), cert: readFileSync(cert) }, (request, response) => {
    receivedHost = request.headers.host;
    if (request.url === "/stall") {
      response.writeHead(200); response.write("{"); response.on("close", () => { stalledClosed = true; });
    } else if (request.url === "/redirect") { response.writeHead(302, { Location: "/tags" }); response.end(); }
    else response.end('{"models":[]}');
  });
  const proxy = createServer();
  proxy.on("connect", (request, client, head) => {
    seen.push(request.url!);
    const remote = connect((upstream.address() as AddressInfo).port, "127.0.0.1", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      remote.write(head); remote.pipe(client); client.pipe(remote);
    });
    for (const socket of [client, remote]) {
      sockets.add(socket as Socket); socket.on("close", () => sockets.delete(socket as Socket)); socket.on("error", () => {});
    }
    client.on("close", () => remote.destroy()); remote.on("close", () => client.destroy());
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  await new Promise<void>(resolve => proxy.listen(0, "127.0.0.1", resolve));
  const proxyUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
  const options = { headers: { Host: "localhost:11434" } };
  try {
    await expect(fetchOllama("https://ollama.test/tags", options, proxyUrl)).rejects.toThrow();
    setDefaultCACertificates([...roots, readFileSync(cert, "utf8")]);
    expect(await (await fetchOllama("https://ollama.test/tags", options, proxyUrl)).json()).toEqual({ models: [] });
    expect(receivedHost).toBe("localhost:11434"); expect(seen.at(-1)).toBe("ollama.test:443");
    await expect(fetchOllama("https://wrong.test/tags", options, proxyUrl)).rejects.toThrow();
    const count = seen.length;
    expect((await fetchOllama("https://ollama.test/redirect", options, proxyUrl)).status).toBe(302);
    expect(seen).toHaveLength(count + 1);
    const stalled = await fetchOllama("https://ollama.test/stall", { ...options, signal: AbortSignal.timeout(200) }, proxyUrl);
    await expect(stalled.text()).rejects.toThrow();
    await expect.poll(() => stalledClosed).toBe(true);
  } finally {
    setDefaultCACertificates(roots);
    for (const socket of sockets) socket.destroy();
    upstream.closeAllConnections(); proxy.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => upstream.close(() => resolve())), new Promise<void>(resolve => proxy.close(() => resolve()))]);
    rmSync(dir, { recursive: true, force: true });
  }
});
