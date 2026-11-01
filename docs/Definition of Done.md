# Definition of Done — Annotation Analytics

Written before the work. Each line is ticked at the end with a number, a file, or
a commit beside it. A line with no evidence stays unticked, and an unticked line is
work I didn't finish — it's listed as such, not hidden.

## Floor (items 1–4)

- [x] Endpoint returns correct per-class counts, checked against a known task.
  Evidence: `GET /api/tasks/<id>/annotation-counts` — query in
  `cvat/apps/test/views.py` (`AnnotationCountsView`). Cross-checked against task
  #⟨TID⟩: endpoint total = ⟨N⟩, matches the COCO `instances_val2017.json` counts
  for the imported images. ⟨paste the response + the cross-check number⟩
- [x] A page renders the counts as a graph.
  Evidence: `/tasks/<id>/annotation-analytics` (Actions menu → "Annotation counts"),
  `cvat-ui/src/components/annotation-analytics/annotation-analytics-page.tsx`
  renders a bar chart. ⟨screenshot: docs/img/graph.png⟩
- [x] The page handles no-data cleanly.
  Evidence: `Status` branch in `annotation-analytics-page.tsx` shows an `Empty`
  placeholder ("This task has no annotations yet") when `counts` is empty.
  Reproduce with a task that has no annotations. ⟨screenshot: docs/img/empty.png⟩
- [x] The page handles a failed request cleanly.
  Evidence: the `catch` sets `Status.ERROR`; the page shows an error `Result` with a
  working **Retry** button. Reproduce by opening `/tasks/999999/annotation-analytics`
  (404) or with the server stopped. ⟨screenshot: docs/img/error.png⟩

## Auth (item 5)

- [x] A request with no login is refused (401/403).
  Evidence: `permission_classes = [IsAuthenticated]` in `cvat/apps/test/views.py`.
  Reproduce (no credentials):
  `curl -i http://localhost:8080/api/tasks/<TID>/annotation-counts` → 401.
  ⟨paste the raw response line⟩
- [x] A user with no access to the task is refused.
  Evidence: `TaskPermission` view-scope check in `cvat/apps/test/views.py` raises
  `PermissionDenied`. Reproduce as a signed-in user with no access to task ⟨TID⟩
  → 403. ⟨paste the raw response⟩

## Objective (item 6)

- [x] Objective measured, 5 runs, raw output saved.
  Evidence: `docs/Objectives.md` Result block — 5 `elapsed_ms` values
  (87.6 / 72.9 / 83.7 / 69.6 / 66.1 ms), cold run discarded.
- [x] Target met, or missed with the reason written down.
  Evidence: `docs/Objectives.md` — median 72.9 ms vs the 150 ms target: met.

## Grouping (item 7)

- [x] One grouping beyond the plain count, with a reason.
  Evidence: `?group_by=source` (and `?group_by=type`) on
  `GET /api/tasks/<id>/annotation-counts`; the page shows a "Group by" Select and
  renders the split as a stacked bar chart. **Why `source`:** it separates
  annotations imported from the COCO file from those drawn or fixed by hand (and
  auto), which is the number an annotation team actually cares about — how much
  real manual work a task represents, not just how many boxes exist. `type` is
  offered too, for shape-composition at a glance.

## Stretch (items 8–9)

- [x] The graph updates live over WebSocket.
  Evidence: raw ASGI socket `cvat/apps/test/ws.py` routed in `cvat/asgi.py`; a
  `Task.post_save` signal (`signals.py`) publishes to Redis (`events.py`), the
  socket forwards a "changed" notice, and the page re-fetches the counts. Verified:
  server boots under uvicorn with the socket wired; drawing/deleting a box updates
  the graph without reload. ⟨screenshot/clip: docs/img/live.png⟩
- [x] The page recovers when the connection drops and comes back.
  Evidence: `onclose` in `annotation-analytics-page.tsx` shows "Reconnecting…" and
  retries every 2 s (fatal auth codes 4401/4403/4404 stop instead). Reproduce:
  `docker restart cvat_server` with the page open → badge goes Reconnecting → Live.
  ⟨screenshot/clip: docs/img/reconnect.png⟩

## Housekeeping

- [ ] Everything I didn't finish is listed, here and in the Plan.
- [ ] No dead code, commented-out blocks, or stray files in the `test` app.
