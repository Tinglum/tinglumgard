/**
 * Tinglumgard Cron Dispatcher — Cloudflare Worker
 *
 * Replaces all 16 GitHub Actions scheduled workflows with a single Cloudflare
 * Cron Trigger (`* /5 * * * *`), using 1 of the 5 free-tier Cron Triggers and
 * ~288 invocations/day (0.3% of the 100,000/day free quota).
 */

const DEFAULT_BASE_URL = "https://xn--tinglumgrd-85a.no";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_CONCURRENCY = 4;
const MAX_SNIPPET_BYTES = 512;

/**
 * @typedef {Object} CronStep
 * @property {string} label
 * @property {"GET" | "POST"} method
 * @property {string} path
 * @property {boolean} queryToken
 * @property {boolean} [publicRoute]
 * @property {boolean} [continueOnError]
 */

/**
 * @typedef {Object} CronJob
 * @property {string} name
 * @property {string} schedule
 * @property {(utc: { minute: number; hour: number; dayOfWeek: number }) => boolean} matches
 * @property {CronStep[]} steps
 */

/** @type {CronJob[]} */
const JOBS = [
  {
    name: "email-dispatch",
    schedule: "*/5 * * * *",
    matches: () => true,
    steps: [
      {
        label: "email-flow-reconcile",
        method: "POST",
        path: "/api/cron/email-flow-reconcile",
        queryToken: true,
        continueOnError: true,
      },
      {
        label: "email-flow-runner",
        method: "POST",
        path: "/api/cron/email-flow-runner",
        queryToken: true,
        continueOnError: true,
      },
      {
        label: "email-dispatch",
        method: "POST",
        path: "/api/cron/email-dispatch",
        queryToken: true,
      },
    ],
  },
  {
    name: "reconcile-payments",
    schedule: "*/5 * * * *",
    matches: () => true,
    steps: [
      {
        label: "reconcile-payments",
        method: "POST",
        path: "/api/cron/reconcile-payments",
        queryToken: true,
      },
    ],
  },
  {
    name: "egg-waitlist",
    schedule: "*/5 * * * *",
    matches: () => true,
    steps: [
      {
        label: "egg-waitlist",
        method: "POST",
        path: "/api/cron/egg-waitlist",
        queryToken: true,
      },
    ],
  },
  {
    name: "todotwo-keep-warm",
    schedule: "*/10 5-20 * * *",
    matches: ({ minute, hour }) => hour >= 5 && hour <= 20 && minute % 10 === 0,
    steps: [
      {
        label: "todotwo-keep-warm",
        method: "GET",
        path: "/todotwo/login",
        queryToken: false,
        publicRoute: true,
        continueOnError: true,
      },
    ],
  },
  {
    name: "todotwo-notifications",
    schedule: "*/15 * * * *",
    matches: ({ minute }) => minute % 15 === 0,
    steps: [
      {
        label: "todotwo-notifications",
        method: "POST",
        path: "/api/cron/todotwo-notifications",
        queryToken: false,
      },
    ],
  },
  {
    name: "egg-remainders",
    schedule: "0 * * * *",
    matches: ({ minute }) => minute === 0,
    steps: [
      {
        label: "egg-remainders",
        method: "GET",
        path: "/api/cron/egg-remainders",
        queryToken: true,
      },
    ],
  },
  {
    name: "fasting-reminders",
    schedule: "0 * * * *",
    matches: ({ minute }) => minute === 0,
    steps: [
      {
        label: "fasting-reminders",
        method: "GET",
        path: "/api/cron/fasting-reminders",
        queryToken: true,
      },
    ],
  },
  {
    name: "todotwo-overdue-escalation",
    schedule: "0 */3 * * *",
    matches: ({ minute, hour }) => minute === 0 && hour % 3 === 0,
    steps: [
      {
        label: "todotwo-overdue-escalation",
        method: "POST",
        path: "/api/cron/todotwo-overdue-escalation",
        queryToken: false,
      },
    ],
  },
  {
    name: "eggs-forecast-sync",
    schedule: "0 1 * * *",
    matches: ({ minute, hour }) => hour === 1 && minute === 0,
    steps: [
      {
        label: "eggs-forecast-sync",
        method: "POST",
        path: "/api/cron/eggs-forecast-sync",
        queryToken: true,
      },
    ],
  },
  {
    name: "todotwo-generate-occurrences",
    schedule: "0 4 * * *",
    matches: ({ minute, hour }) => hour === 4 && minute === 0,
    steps: [
      {
        label: "todotwo-generate-occurrences",
        method: "POST",
        path: "/api/cron/todotwo-generate-occurrences",
        queryToken: false,
      },
    ],
  },
  {
    name: "todotwo-onboarding-ramp",
    schedule: "0 4 * * *",
    matches: ({ minute, hour }) => hour === 4 && minute === 0,
    steps: [
      {
        label: "todotwo-onboarding-ramp",
        method: "POST",
        path: "/api/cron/todotwo-onboarding-ramp",
        queryToken: false,
      },
    ],
  },
  {
    name: "todotwo-auto-assign",
    schedule: "0 5 * * *",
    matches: ({ minute, hour }) => hour === 5 && minute === 0,
    steps: [
      {
        label: "todotwo-auto-assign",
        method: "POST",
        path: "/api/cron/todotwo-auto-assign",
        queryToken: false,
      },
    ],
  },
  {
    name: "confirmation-email-audit",
    schedule: "30 6 * * *",
    matches: ({ minute, hour }) => hour === 6 && minute === 30,
    steps: [
      {
        label: "confirmation-email-audit",
        method: "GET",
        path: "/api/cron/confirmation-email-audit",
        queryToken: true,
      },
    ],
  },
  {
    name: "egg-wishlist-proposal",
    schedule: "0 6,7 * * 1",
    matches: ({ minute, hour, dayOfWeek }) =>
      dayOfWeek === 1 && (hour === 6 || hour === 7) && minute === 0,
    steps: [
      {
        label: "egg-wishlist-proposal",
        method: "POST",
        path: "/api/cron/egg-wishlist-proposal",
        queryToken: true,
      },
    ],
  },
  {
    name: "pig-lifecycle",
    schedule: "30 8 * * *",
    matches: ({ minute, hour }) => hour === 8 && minute === 30,
    steps: [
      {
        label: "pig-lifecycle",
        method: "GET",
        path: "/api/cron/pig-lifecycle",
        queryToken: true,
      },
    ],
  },
  {
    name: "eggs-daily-summary",
    schedule: "15 17 * * *",
    matches: ({ minute, hour }) => hour === 17 && minute === 15,
    steps: [
      {
        label: "eggs-daily-summary",
        method: "POST",
        path: "/api/cron/eggs-daily-summary",
        queryToken: true,
      },
    ],
  },
  {
    name: "todotwo-daily-digest",
    schedule: "0 18 * * *",
    matches: ({ minute, hour }) => hour === 18 && minute === 0,
    steps: [
      {
        label: "todotwo-daily-digest",
        method: "POST",
        path: "/api/cron/todotwo-daily-digest",
        queryToken: false,
      },
    ],
  },
];

/**
 * Read at most `maxBytes` from a Response body without buffering unbounded data.
 * @param {Response} response
 * @param {number} maxBytes
 */
async function readBoundedSnippet(response, maxBytes = MAX_SNIPPET_BYTES) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - total;
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(slice);
      total += slice.byteLength;
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    // Ignore stream cancel/read errors after partial capture
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Execute a single HTTP step against the Tinglumgard app.
 * @param {string} baseUrl
 * @param {string} cronSecret
 * @param {CronStep} step
 */
async function executeStep(baseUrl, cronSecret, step) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url =
    !step.publicRoute && step.queryToken
      ? `${cleanBase}${step.path}?token=${encodeURIComponent(cronSecret)}`
      : `${cleanBase}${step.path}`;

  /** @type {Record<string, string>} */
  const headers = {
    "user-agent": "tinglumgard-cloudflare-cron/1.0",
  };
  if (!step.publicRoute) {
    headers["x-cron-secret"] = cronSecret;
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: step.method,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const snippet = await readBoundedSnippet(response);
    const durationMs = Date.now() - startedAt;
    const ok = response.status < 400;

    return {
      step: step.label,
      method: step.method,
      path: step.path,
      status: response.status,
      ok,
      durationMs,
      snippet,
    };
  } catch (err) {
    return {
      step: step.label,
      method: step.method,
      path: step.path,
      status: 0,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run all sequential steps of a single cron job.
 * @param {string} baseUrl
 * @param {string} cronSecret
 * @param {CronJob} job
 */
async function runJob(baseUrl, cronSecret, job) {
  const stepResults = [];
  let jobOk = true;

  for (const step of job.steps) {
    const res = await executeStep(baseUrl, cronSecret, step);
    stepResults.push(res);

    if (!res.ok) {
      if (step.continueOnError) {
        console.log(
          JSON.stringify({
            level: "warn",
            event: "cron_step_warning",
            job: job.name,
            ...res,
          })
        );
        continue;
      }
      jobOk = false;
      console.error(
        JSON.stringify({
          level: "error",
          event: "cron_step_failed",
          job: job.name,
          ...res,
        })
      );
      break;
    }
  }

  console.log(
    JSON.stringify({
      level: jobOk ? "info" : "error",
      event: "cron_job_finished",
      job: job.name,
      ok: jobOk,
      steps: stepResults.map(({ step, status, ok, durationMs }) => ({
        step,
        status,
        ok,
        durationMs,
      })),
    })
  );

  return { job: job.name, ok: jobOk, steps: stepResults };
}

/**
 * Run an array of items with bounded concurrency to stay within Workers'
 * 6 simultaneous outgoing connections limit.
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await worker(items[index]);
      }
    }
  );

  await Promise.all(runners);
  return results;
}

/**
 * Constant-time string comparison using SHA-256 + crypto.subtle.timingSafeEqual.
 * @param {string} a
 * @param {string} b
 */
async function timingSafeCompare(a, b) {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(hashA, hashB);
}

export default {
  /**
   * @param {ScheduledController} controller
   * @param {{ CRON_BASE_URL?: string; CRON_SECRET?: string }} env
   */
  async scheduled(controller, env) {
    const cronSecret = env.CRON_SECRET;
    if (!cronSecret) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "cron_missing_secret",
          message: "CRON_SECRET is not configured on this Worker",
        })
      );
      return;
    }

    const baseUrl = env.CRON_BASE_URL || DEFAULT_BASE_URL;
    const scheduledDate = new Date(controller.scheduledTime);
    const utc = {
      minute: scheduledDate.getUTCMinutes(),
      hour: scheduledDate.getUTCHours(),
      dayOfWeek: scheduledDate.getUTCDay(),
    };

    const dueJobs = JOBS.filter((job) => job.matches(utc));
    console.log(
      JSON.stringify({
        level: "info",
        event: "cron_tick_start",
        scheduledIso: scheduledDate.toISOString(),
        baseUrl,
        dueJobs: dueJobs.map((j) => j.name),
      })
    );

    const results = await runWithConcurrency(dueJobs, MAX_CONCURRENCY, (job) =>
      runJob(baseUrl, cronSecret, job)
    );

    const failed = results.filter((r) => !r.ok).map((r) => r.job);
    console.log(
      JSON.stringify({
        level: failed.length > 0 ? "error" : "info",
        event: "cron_tick_complete",
        scheduledIso: scheduledDate.toISOString(),
        total: results.length,
        failed,
      })
    );
  },

  /**
   * Manual health check & on-demand trigger (replaces GitHub workflow_dispatch).
   * @param {Request} request
   * @param {{ CRON_BASE_URL?: string; CRON_SECRET?: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        baseUrl: env.CRON_BASE_URL || DEFAULT_BASE_URL,
        secretConfigured: Boolean(env.CRON_SECRET),
        jobs: JOBS.map((j) => ({ name: j.name, schedule: j.schedule })),
      });
    }

    if (request.method === "POST" && url.pathname === "/run") {
      const cronSecret = env.CRON_SECRET;
      const provided = request.headers.get("x-cron-secret") || "";
      if (!cronSecret || !provided || !(await timingSafeCompare(provided, cronSecret))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const jobName = url.searchParams.get("job");
      const job = JOBS.find((j) => j.name === jobName);
      if (!job) {
        return Response.json(
          {
            error: "Unknown job",
            availableJobs: JOBS.map((j) => j.name),
          },
          { status: 400 }
        );
      }

      const baseUrl = env.CRON_BASE_URL || DEFAULT_BASE_URL;
      const result = await runJob(baseUrl, cronSecret, job);
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
