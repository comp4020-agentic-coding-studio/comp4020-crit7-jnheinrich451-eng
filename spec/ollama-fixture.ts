import { createServer } from "node:http";
/** HTTP fixture only. Production has no fake-model switch or test endpoint. */
export function ollamaFixture(expectedHost?: string) {
  return createServer(async (request, response) => {
    if (expectedHost && request.headers.host !== expectedHost) { response.writeHead(403); response.end(); return; }
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/api/tags") { response.end(JSON.stringify({ models: [{ name: "llama3.2:3b", digest: "a".repeat(64) }] })); return; }
    let body = ""; for await (const chunk of request) body += chunk;
    const prompt = JSON.parse(JSON.parse(body).prompt), preferences = prompt.studentPreferences as string;
    if (preferences.includes("outage")) { response.writeHead(503); response.end("{}"); return; }
    if (preferences.includes("delayed")) await new Promise(resolve => setTimeout(resolve, 400));
    response.end(JSON.stringify({ done: true, done_reason: "stop", response: JSON.stringify({
      first: preferences.includes("malformed") ? "COMP9999:0" : "COMP8539:1", second: "NONE", third: "NONE",
    }) }));
  });
}
