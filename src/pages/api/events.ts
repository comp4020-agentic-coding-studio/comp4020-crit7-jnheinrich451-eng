import type { APIRoute } from "astro";
import { bus, type Change } from "../../lib/events";

// Server-sent events: a long-lived response the browser reads with
// `new EventSource("/api/events")`. Each application change goes out as one
// `data:` line; an open timeline or queue that it concerns re-renders from
// the database. The pages work without it — this is only how a second tab
// finds out without a manual reload.
export const GET: APIRoute = () => {
  let onChange: (change: Change) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onChange = (change) => {
        controller.enqueue(`data: ${JSON.stringify(change)}\n\n`);
      };
      bus.on("change", onChange);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("change", onChange);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
