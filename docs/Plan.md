# Plan — Annotation Analytics

**Base commit:** `c9114bc86d10d4d9e0c5da255d479ba05774142f`
**Branch:** `dev-test01`
**Backend:** a new Django app named `test` (`cvat/apps/test`).

## Goal

Add per-class annotation counts to CVAT: an endpoint that counts annotations by
class for a task, and a page that shows those counts as a graph. Then auth, one
speed target, one extra grouping, and — if time is left — live updates over
WebSocket.

## What I worked out from the code before starting

- A drawn box is a `LabeledShape` row (`cvat/apps/engine/models.py`), with a FK to
  `job` and a FK to `label`. The class name is `Label.name`.
- Task → Segment → Job → LabeledShape, so a task's counts are one ORM query:
  `LabeledShape.objects.filter(job__segment__task_id=TID).values("label__name").annotate(count=Count("id"))`.
- Auth is centralised: `PolicyEnforcer` (`cvat/apps/iam/permissions.py`) reads
  `iam_permission_class` and asks OPA. I'll set `iam_permission_class = TaskPermission`
  and call `check_object_permissions()` rather than write new auth.
- CVAT has **no** WebSocket backend (`cvat/asgi.py` is plain Django ASGI). Live
  updates (items 8–9) need Django Channels + Daphne. Redis is already running.
  This is the main risk, so it comes last.

## Order of work and rough time (of 8 h)

Setup (Docker + COCO import) runs on its own and doesn't count.

| # | Work | Est. |
|---|------|------|
| 0 | Setup: superuser, create task, upload val2017 images + COCO annotations; record image count | 0.5 h |
| — | Plan, Objectives, Definition of Done — committed first | 0.25 h |
| 1 | `test` app: count endpoint, read from DB | 1.5 h |
| 2–3 | Page that calls it + the counts as a graph | 1.5 h |
| 4 | Empty-data and failed-request states — **floor complete** | 0.5 h |
| 5 | Reuse CVAT login; refuse no-login and no-task-access; show both | 0.75 h |
| 6 | One speed objective: set target, 5 runs, save raw output | 0.5 h |
| 7 | One extra grouping beyond plain count (by shape type), with a reason | 0.5 h |
| 8 | Live graph over WebSocket (Channels + Daphne) — **stretch** | 1.25 h |
| 9 | Recover when the connection drops and comes back — **stretch** | 0.5 h |
| 10 | Decision record (appended at the end) | 0.25 h |

## Already decided to skip / defer

- **Items 8–9 are stretch.** If items 1–7 aren't solid and honest by ~6 h, I stop
  and don't start the WebSocket work. A broken half-WebSocket is worse than a clean
  static graph.
- Counting `LabeledTrack` / `LabeledImage`: the COCO import produces shapes, so I
  count shapes first and note the limitation rather than handle every annotation type.
- No new test infrastructure beyond what proves the counts are correct.

<!-- Decision record (item 10) is appended here at the end, only if I reach it. -->
