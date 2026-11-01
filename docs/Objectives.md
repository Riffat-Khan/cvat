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
| **What is measured** | Server-side time to compute the per-class counts for one task and build the response — from a `perf_counter()` mark at the top of the count view to a mark just before it returns, logged in milliseconds. Auth, network and the browser are outside the marks. |
| **How** | Hit the endpoint for the known task 5 times with `curl` on a warm stack; read the 5 logged millisecond values from the server log. Discard the first (cold) request before the 5 counted runs. |
| **Target** | Median of 5 runs at or below **150 ms**. |
| **Conditions** | Warm stack (not the first request after a cold start), the single task with the recorded image count, nothing else running, measured server-side. |
| **Not included** | The WebSocket path, the first request after a cold start, and the auth / OPA round-trip. |

**Why 150 ms:** the count is a single aggregate over an indexed FK join, so it
should stay well under a page's worth of latency on this laptop. 150 ms is tight
enough that a bad query plan or an N+1 would miss it, not so tight that it's free.

## Result (filled at item 6)

- **Image count in the task:** _<record it>_
- **Raw output (5 runs, pasted from the log):**
  ```
  <paste the 5 ms values here>
  ```
- **Median:** _<ms>_  **Spread (min–max):** _<ms>_
- **Target met?** _<yes / no — if missed, the reason>_
