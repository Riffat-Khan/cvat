# Definition of Done — Annotation Analytics

Written before the work. Each line is ticked at the end with a number, a file, or
a commit beside it. A line with no evidence stays unticked, and an unticked line is
work I didn't finish — it's listed as such, not hidden.

## Floor (items 1–4)

- [ ] Endpoint returns correct per-class counts, checked against a known task.
  Evidence: _<count for task N, cross-checked against the COCO_ `instances_val2017.json` _totals>_
- [ ] A page renders the counts as a graph.
  Evidence: _<page path / screenshot>_
- [ ] The page handles no-data cleanly.
  Evidence: 
- [ ] The page handles a failed request cleanly.
  Evidence: 

## Auth (item 5)

- [ ] A request with no login is refused (401/403).
  Evidence: 
- [ ] A user with no access to the task is refused.
  Evidence: 

## Objective (item 6)

- [ ] Objective measured, 5 runs, raw output saved.
  Evidence: `docs/Objectives.md`
- [ ] Target met, or missed with the reason written down.
  Evidence: `docs/Objectives.md`

## Grouping (item 7)

- [ ] One grouping beyond the plain count, with a reason.
  Evidence: _<endpoint param + commit>_

## Stretch (items 8–9)

- [ ] The graph updates live over WebSocket.
  Evidence: _<commit / clip>_
- [ ] The page recovers when the connection drops and comes back.
  Evidence: _<commit / clip>_

## Housekeeping

- [ ] Everything I didn't finish is listed, here and in the Plan.
- [ ] No dead code, commented-out blocks, or stray files in the `test` app.
