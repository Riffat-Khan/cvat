# Objectives — Annotation Analytics

One speed objective. The target and method are set here before the work. The raw
numbers go in the Result block at item 6, after measuring — not before.

## Machine every number below is measured on

- **CPU:** Intel Core i5-10310U @ 1.70 GHz
- **RAM:** 16 GB
- **OS:** Windows 11 Pro
- **CVAT commit:** `c9114bc86d10d4d9e0c5da255d479ba05774142f`
- **Stack:** local Docker Compose, the sample data below

## MO-1

| Field | Entry |
|-------|-------|
| **What is measured** | Server-side time to compute the per-class counts for one task and build the response — from a `perf_counter()` mark placed right after the access check to a mark right after the counts are built, logged in milliseconds as `elapsed_ms`. Auth, the task lookup, network and the browser are outside the marks. |
| **How** | Hit the endpoint for the known task 5 times with `curl` on a warm stack; read the 5 logged `elapsed_ms` values from the server log (`docker logs cvat_server`). Discard the first (cold) request before the 5 counted runs. |
| **Target** | Median of 5 runs at or below **150 ms**. |
| **Conditions** | Warm stack (not the first request after a cold start), the single task with the recorded image count, nothing else running, measured server-side. |
| **Not included** | The WebSocket path, the first request after a cold start, and the auth / OPA round-trip. |

**Why 150 ms:** the count is a single aggregate over an indexed FK join, so it
should stay well under a page's worth of latency on this laptop. 150 ms is tight
enough that a bad query plan or an N+1 would miss it, not so tight that it's free.

## Result (item 6)

Measured with the procedure above, on the machine listed at the top. All 6
requests returned HTTP 200; the first (cold) run is discarded, 5 runs counted.

- **Image count in the task:** ⟨record the number of images you uploaded⟩
- **Raw output — `elapsed_ms` per run (from the `annotation-counts` log line):**
  ```
  warm-up (discarded): 442.9
  run 1: 87.6
  run 2: 72.9
  run 3: 83.7
  run 4: 69.6
  run 5: 66.1
  ```
- **Median:** 72.9 ms   **Spread (min–max):** 66.1–87.6 ms
- **Target met?** Yes — 72.9 ms median is well inside the 150 ms target.
- **Note:** the cold warm-up run (442.9 ms) is ~5–6× slower than the warm runs
  (query plan and caches warming), which is exactly why MO-1 discards it and
  measures a warm stack.
