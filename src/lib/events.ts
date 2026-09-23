import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here, and an
// application change is broadcast to all of them. This only works because
// the app runs on exactly one machine (see fly.toml) — a second machine would
// have its own bus and clients would miss events.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

/** What the stream carries: which application changed, and who it concerns,
 *  so an open page can tell whether it's looking at something stale. */
export interface Change {
  applicationId: number;
  convenorId: number;
  studentId: number;
}
