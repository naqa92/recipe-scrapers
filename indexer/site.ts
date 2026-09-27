// HTTP client for one site: identified robot, 1 request/s (index guardrails of D9).
import { gunzipSync } from "node:zlib";

export const BOT = "StewyBot";
export const BOT_HEADERS = {
  "User-Agent": `${BOT}/0.1 (+https://naqastudio.xyz)`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export type Fetched = { status: number; url: string; headers: Headers; bytes: Uint8Array; text: () => string };
export type FetchError = { error: string };
export const isError = (r: Fetched | FetchError): r is FetchError => "error" in r;

export class Site {
  private last = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly host: string,
    private headers: Record<string, string> = BOT_HEADERS,
    private intervalMs = 1000,
    private timeoutMs = 15_000,
  ) {}

  /** Runs fn serialized with the site's other requests, spaced by intervalMs. */
  slot<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      const wait = this.intervalMs - (Date.now() - this.last);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      try {
        return await fn();
      } finally {
        this.last = Date.now();
      }
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  get(url: string, headers?: Record<string, string>): Promise<Fetched | FetchError> {
    return this.slot(async () => {
      try {
        const res = await fetch(url, { headers: headers ?? this.headers, redirect: "follow", signal: AbortSignal.timeout(this.timeoutMs) });
        const bytes = new Uint8Array(await res.arrayBuffer());
        return {
          status: res.status,
          url: res.url || url,
          headers: res.headers,
          bytes,
          text: () => new TextDecoder("utf-8").decode(bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes),
        };
      } catch (e) {
        return { error: e instanceof Error ? (e.name === "TimeoutError" ? "Timeout" : `${e.name}: ${(e.cause as Error)?.message ?? e.message}`) : String(e) };
      }
    });
  }
}
