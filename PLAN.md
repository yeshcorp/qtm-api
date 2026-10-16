# Make qtm-api agent-friendly

This program makes the next change to `yeshcorp/qtm-api` hard to get wrong from a single file. HTTP paths stay. Enforcement is a parser, a route wrapper, tests, a check script, and CI. The short prose table lands last, after those exist.

PRs in order are `qtm-ci`, `qtm-parse`, `qtm-route`, and `qtm-qty`. `qtm-qty` is the only PR that changes a status code.

Captain lands the stack. Execution waits for an explicit go, and for a yes on the quantity rule.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `pstack/skills/poteto-mode/playbooks/autopilot-stack.md`. Owners stop at stack-ready and do not merge. The operator lands the stack from `qtm-ci` upward. `qtm-qty` is review-gated and stops for the operator before it is appended.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-full.md`
  - [ ] `git show origin/main:pstack/skills/swarm/SKILL.md`
  - [ ] `git show origin/main:.cursor/skills/verify-qtm-api/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:pstack/skills/correct/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/create-verification-skill/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/principle-prove-it-works/SKILL.md`
- [ ] When `git show origin/main:pstack/skills/swarm/SKILL.md` exits 128, read that path from `cursor/plugins` commit `2f8377461fd533f5af782e1fd643783b1067b847` instead. This repo does not contain `pstack/`.
- [ ] Before `qtm-ci` is on trunk, read `.cursor/skills/verify-qtm-api/SKILL.md` from the `qtm-ci` branch tip.
- [ ] On the operator's go, arm the audit tick as `/loop 1h` with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent is the base, because the execution playbook stacks.
  - [ ] `qtm-ci` branches from `main`.
  - [ ] `qtm-parse` after `qtm-ci`.
  - [ ] `qtm-route` after `qtm-parse`.
  - [ ] `qtm-qty` after `qtm-route`.
- [ ] Hold the file boundaries. `qtm-ci` touches `.github/workflows/ci.yml`, `.cursor/skills/verify-qtm-api/`, and `scripts/check-agent-rules.mjs` only. `qtm-parse` touches `lib/airtable-client.ts`, `lib/inventory.ts`, `lib/mpc.ts`, `lib/types.ts`, `lib/parse.ts`, `tests/lib/`, and rule additions in `scripts/check-agent-rules.mjs`. `qtm-route` touches `lib/route.ts`, `api/**` except `api/index.ts`, `tests/handlers/`, and rule additions in `scripts/check-agent-rules.mjs`. `qtm-qty` touches quantity parsing in `lib/parse.ts`, `api/inventory/add.ts`, `api/inventory/remove.ts`, `api/removal-log.ts`, and the tests for those handlers. `AGENTS.md` is created only in `qtm-qty`.
- [ ] Do not edit `api/index.ts`, `vercel.json`, `package.json` engines, or the open draft branches `cursor/deploy-readiness-09f2` and `cursor/readme-local-dev-e17a`.
- [ ] Hold the review gate. `qtm-qty` changes an interaction. It waits for the operator's review in chat with screenshots and a video before it is appended.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`. If `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, per **Opening a PR**. Use the run's built-in PR tool when it has one, else `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `pstack/skills/poteto-mode/references/bugbot-triage.md`.
- [ ] Rebase onto current trunk before the code-ready report and babysit. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with trunk, or on a CI failure that comes from a change on trunk.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head. Run each full swarm per `pstack/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. Two or more audit lanes, each with its own focus, that read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner, including a defect that a lane filed as a note. A new head gets a fresh verdict, except for results that stay valid under the patch-id rule in `playbooks/shipping.md`.
- [ ] The root appends each clean PR to the base-branch stack and the operator lands it bottom-up. Owners do not merge. A child keeps its patch id when the parent is rewritten, per `playbooks/shipping.md`.

### Boot recipe, for every live lane

Each live lane runs on its own cloud VM at the PR head. Drive through `.cursor/skills/verify-qtm-api`. Do not call `vercel dev`. Do not send a real `AIRTABLE_PAT`.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Install with `npm ci`. Start the verification server from the skill. Wait until doctor prints ready.
- [ ] Send HTTP only with the skill's curl commands. Read status, the `access-control-allow-origin` header, and the JSON body. Do not print env values.
- [ ] Save every transcript to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.txt` and return the paths with the report.

## Add CI and the verification skill (qtm-ci)

**Depends on.** None.

**Files.**

- [ ] Create `.github/workflows/ci.yml`.
- [ ] Create `.cursor/skills/verify-qtm-api/SKILL.md`.
- [ ] Create `.cursor/skills/verify-qtm-api/features/README.md` and one feature file each for recent, add, remove, lookup, and search.
- [ ] Create `.cursor/skills/verify-qtm-api/scripts/serve.ts`.
- [ ] Create `scripts/check-agent-rules.mjs` with an empty rule list that exits 0.

**Build.**

- [ ] Workflow runs `npm test`, `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, and `node scripts/check-agent-rules.mjs` on push and pull request.
- [ ] `serve.ts` listens on `127.0.0.1` and an ephemeral port, mocks only non-loopback `fetch`, and mounts the existing handlers. Doctor curls `GET /api/inventory/recent` and requires status 200 plus origin `*`.
- [ ] Skill sections are Launch, Doctor, Drive, Evidence, and Cleanup. Evidence stays under `/tmp/verify-qtm-api/<run-id>/` after cleanup. Feature files use the four headings `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-qtm-api`, and `Gotchas`.

**You see.**

- [ ] `npm test` still prints `Tests:       78 passed`.
- [ ] A curl with no auth header against the local server returns status 200 and a JSON object with a `records` array.
- [ ] `npx vercel dev --listen 3999` is not part of Launch. The skill text does not contain that command.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm test` and both `tsc` commands. Pass when all three exit 0 and the test count is 78.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run `npm test` and `GET /api/inventory/recent` on trunk and on head. Trunk has no workflow and no skill. Save `qtm-ci-lane-1.txt`. Pass when both sides print 78 passed, both recent calls return 200, and only head has `.github/workflows/ci.yml`.
- [ ] Lane 2. Doctor against a port this run did not start. Save `qtm-ci-lane-2.txt`. Pass when doctor exits non-zero.
- [ ] Lane 3. `GET /api/inventory/recent` with an empty header set. Save `qtm-ci-lane-3.txt`. Pass when status is 200, the body has `records`, and `access-control-allow-origin` is `*`.
- [ ] Lane 4. `POST /api/inventory/add` with quantity `1.5` and no auth header. Save `qtm-ci-lane-4.txt`. Pass when status is 400 and the mocked write count is 0.
- [ ] Lane 5. `POST /api/inventory/remove` with `quantityToRemove` `1.5` and no auth header. Save `qtm-ci-lane-5.txt`. Pass when status is not 400. This locks today's behavior for `qtm-qty`.
- [ ] Lane 6. `POST /api/inventory/add` with `expirationDate` `""` and quantity `2`. Save `qtm-ci-lane-6.txt`. Pass when status is 201.
- [ ] Lane 7. `GET /api/mpc/search?name=milk` with no auth header. Save `qtm-ci-lane-7.txt`. Pass when status is 200 and the body has `records`. This route has no Jest file on trunk.
- [ ] Lane 8. Cleanup, then test the port and the evidence file. Save `qtm-ci-lane-8.txt`. Pass when the port refuses connections and the lane 3 transcript is still on disk.
- [ ] Lane 9. Read the skill Launch section and run `npx vercel dev --listen 3999` only as a negative check in a side shell. Save `qtm-ci-lane-9.txt`. Pass when Launch does not mention `vercel dev`, and the side shell prints that no credentials were found. Redact any token text before saving.
- [ ] Lane 10. Open `.github/workflows/ci.yml`. Save `qtm-ci-lane-10.txt`. Pass when the file names `npm test`, `tsc --noEmit`, and `tsconfig.test.json`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Median milliseconds for five local `GET /api/inventory/recent` calls with mocked Airtable, plus one `npm test` wall time. The user-visible end state is the recent JSON response.
- [ ] Probe. Interleave five head calls and five trunk calls through the same mock. Run `npm test` once per side. Record median, min, and max.
- [ ] Baseline. Record the trunk median of 2 ms first, from the 2026-10-16 prototype, n=5, min 1, max 23. Jest on trunk was 2.151 s, n=1, 78 tests.
- [ ] Rule. Fail if the head median exceeds 100 ms. Do not fail on a ratio. A 2 ms loopback median is timer noise, not Airtable time. Also fail if head `npm test` exceeds 15 s.

**Review gate.** None. qtm-ci is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The root appends `qtm-ci` onto `main` in the stack. The operator lands it. The owner does not merge.

## Parse Airtable responses in one function (qtm-parse)

**Depends on.** `qtm-ci`.

**Files.**

- [ ] Create `lib/parse.ts`.
- [ ] Edit `lib/airtable-client.ts`, `lib/inventory.ts`, `lib/mpc.ts`, and `lib/types.ts`.
- [ ] Edit `scripts/check-agent-rules.mjs` to reject `as any` in `api/` and `lib/`.
- [ ] Create `tests/lib/parse.test.ts`.

**Build.**

- [ ] `parseAirtablePage` is the only function that reads a page body. `airtableFetch` returns `unknown`. Delete the three `as any` sites in `lib/airtable-client.ts` and `lib/inventory.ts`.
- [ ] Brand `MpcId` and `InventoryRowId` at the parse. `searchByName` returns `MpcRecord[]`, the same alias as `lookupByBarcode`, not a second inline object type.
- [ ] Map a missing expiration to `null` inside the lot type. Keep today's HTTP JSON for recent, including an empty string when the feed date is missing.
- [ ] Run the new check on a stash of trunk `lib/inventory.ts` and keep the failing output in the PR. The merged tree exits 0.

**You see.**

- [ ] `rg "as any" api lib` prints no matches.
- [ ] `GET /api/inventory/recent` and `GET /api/inventory/lots` return the same JSON as trunk for the skill's fixture page.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `tests/lib/parse.test.ts` covers a page of records, a missing date, and a non-object body. Run `npx jest tests/lib/parse.test.ts`. Pass when the non-object body throws a typed error and does not throw a cast error.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. `GET /api/inventory/recent` on the same fixture page. Save `qtm-parse-lane-1.txt`. Pass when status and body match trunk.
- [ ] Lane 2. `GET /api/inventory/lots` for one linked id and one location. Save `qtm-parse-lane-2.txt`. Pass when the lot ids and quantities match trunk.
- [ ] Lane 3. `GET /api/mpc/lookup` for a barcode stored as `{ "text": "<barcode>" }`. Save `qtm-parse-lane-3.txt`. Pass when the record id matches trunk.
- [ ] Lane 4. `GET /api/mpc/search?name=milk`. Save `qtm-parse-lane-4.txt`. Pass when each hit has the same keys as an `MpcRecord` from lookup.
- [ ] Lane 5. `POST /api/inventory/add` with quantity `2` and a blank expiration. Save `qtm-parse-lane-5.txt`. Pass when status is 201, matching trunk.
- [ ] Lane 6. `POST /api/inventory/add` with quantity `1.5`. Save `qtm-parse-lane-6.txt`. Pass when status is 400, matching trunk.
- [ ] Lane 7. `POST /api/inventory/remove` with `quantityToRemove` `1.5`. Save `qtm-parse-lane-7.txt`. Pass when status is not 400, matching trunk.
- [ ] Lane 8. Run `node scripts/check-agent-rules.mjs` on head, and again with `lib/inventory.ts` reverted to trunk. Save `qtm-parse-lane-8.txt`. Pass when head exits 0 and the reverted file exits 1.
- [ ] Lane 9. `POST /api/mpc` create and `PATCH /api/mpc/<id>/purchase-from`. Save `qtm-parse-lane-9.txt`. Pass when create returns 201 and patch returns 200, matching trunk.
- [ ] Lane 10. `POST /api/removal-log` with the fixture body. Save `qtm-parse-lane-10.txt`. Pass when status is 201, matching trunk.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Same local recent median and `npm test` wall time as `qtm-ci`. Parsing the fixture page is the added work. The end state is the recent JSON body.
- [ ] Probe. Interleave five trunk calls and five head calls. Run `npm test` once per side.
- [ ] Baseline. Record the trunk median of 2 ms first.
- [ ] Rule. Fail if the head median exceeds 100 ms or `npm test` exceeds 15 s. Do not publish a ratio against the 2 ms baseline.

**Review gate.** None. qtm-parse is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current `qtm-ci` after the verdict, patch-id unchanged.
- [ ] The root appends `qtm-parse` onto `qtm-ci`. The operator lands it. The owner does not merge.

## Send every handler through one wrapper (qtm-route)

**Depends on.** `qtm-parse`.

**Files.**

- [ ] Create `lib/route.ts`.
- [ ] Edit the nine handlers under `api/` except `api/index.ts`.
- [ ] Edit `tests/handlers/inventory.test.ts`, `tests/handlers/mpc.test.ts`, and `tests/handlers/removal-log.test.ts` so they stop mocking `applyCors` away.
- [ ] Add the raw-handler rule to `scripts/check-agent-rules.mjs`.

**Build.**

- [ ] `defineRoute` owns CORS, the method check, the 405 body, the 502 body, and a single `authorize` function that returns allow. Handlers pass a method, a parser, and a domain call.
- [ ] Delete both handwritten shells. The early-return shell and the block shell are not left behind as examples.
- [ ] `authorize` stays allow. Do not read a client secret and do not change CORS.
- [ ] The check fails when a file under `api/` contains `export default async function handler` and does not call `defineRoute`.

**You see.**

- [ ] All nine routes still return today's status codes for the fixture calls in the live lanes.
- [ ] `access-control-allow-origin` is still `*` when `ALLOWED_ORIGIN` is unset.
- [ ] A throwaway file that copies the old shell fails `node scripts/check-agent-rules.mjs`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add a handler test that `GET /api/inventory/recent` sets `access-control-allow-origin` to `*`. Run `npx jest tests/handlers`. Pass when that assertion fails if `applyCors` is removed.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. `GET /api/inventory/recent` with no auth header. Save `qtm-route-lane-1.txt`. Pass when status, CORS header, and body match trunk.
- [ ] Lane 2. `OPTIONS` on `/api/inventory/add`. Save `qtm-route-lane-2.txt`. Pass when status is 204.
- [ ] Lane 3. `PUT` on `/api/inventory/add`. Save `qtm-route-lane-3.txt`. Pass when status is 405.
- [ ] Lane 4. `POST /api/inventory/add` quantity `1.5`. Save `qtm-route-lane-4.txt`. Pass when status is 400.
- [ ] Lane 5. `POST /api/inventory/remove` quantity `1.5`. Save `qtm-route-lane-5.txt`. Pass when status is not 400.
- [ ] Lane 6. `GET /api/mpc/lookup` and `GET /api/mpc/search`. Save `qtm-route-lane-6.txt`. Pass when both return 200.
- [ ] Lane 7. `POST /api/mpc` and `PATCH /api/mpc/<id>/purchase-from`. Save `qtm-route-lane-7.txt`. Pass when statuses are 201 and 200.
- [ ] Lane 8. `POST /api/removal-log` with a missing `reason`. Save `qtm-route-lane-8.txt`. Pass when status is 400.
- [ ] Lane 9. Copy `api/inventory/recent.ts` from trunk into a temp file under `api/` and run the check. Save `qtm-route-lane-9.txt`. Pass when the check exits 1, then delete the temp file and pass when the check exits 0.
- [ ] Lane 10. Unset `ALLOWED_ORIGIN` and read the CORS header from recent. Save `qtm-route-lane-10.txt`. Pass when the header is `*`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Same local recent median. The wrapper is the added work. The end state is the recent response.
- [ ] Probe. Interleave five trunk calls and five head calls.
- [ ] Baseline. Record the trunk median of 2 ms first.
- [ ] Rule. Fail if the head median exceeds 100 ms. Do not use a ratio against 2 ms.

**Review gate.** None. qtm-route is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current `qtm-parse` after the verdict, patch-id unchanged.
- [ ] The root appends `qtm-route` onto `qtm-parse`. The operator lands it. The owner does not merge.

## Reject non-integers in one quantity parser (qtm-qty)

**Depends on.** `qtm-route`.

**Files.**

- [ ] Edit `lib/parse.ts` so `parsePositiveInt` is the only quantity gate.
- [ ] Edit `api/inventory/add.ts`, `api/inventory/remove.ts`, and `api/removal-log.ts` so they call that function.
- [ ] Edit `tests/handlers/inventory.test.ts` and `tests/handlers/removal-log.test.ts`.
- [ ] Delete the lib test that expects `removeInventoryFEFO` of `0` to succeed with no write.
- [ ] Create `AGENTS.md` with the rule table in Appendix I and no other rules.

**Build.**

- [ ] `parsePositiveInt` accepts only an integer greater than zero. `1.5`, `0`, negatives, and numeric strings return a 400 before any Airtable call.
- [ ] Add, remove, and removal-log all use it. Do not leave a second comparison in a handler.
- [ ] Leave blank expiration as 201. Do not add a date-format check.
- [ ] Leave `authorize` as allow. Leave the default CORS origin as `*`.

**You see.**

- [ ] `POST /api/inventory/remove` with `quantityToRemove` `1.5` returns 400 and performs no mocked write.
- [ ] `POST /api/inventory/add` with quantity `2` and `expirationDate` `""` still returns 201.
- [ ] `POST /api/inventory/remove` with `quantityToRemove` `1` still reaches the mocked inventory write.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `tests/handlers/inventory.test.ts` gains a case for `quantityToRemove` `1.5` expecting 400, and keeps the case for `0`. Run `npx jest tests/handlers/inventory.test.ts tests/handlers/removal-log.test.ts`. Pass when `1.5` and `0` are 400 on all three write routes.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.7-xhigh-fast` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. `POST /api/inventory/remove` with `quantityToRemove` `1.5`. Trunk accepts it and returns a non-400 status. Head returns 400. Save `qtm-qty-lane-1.txt`. Pass when that split is the only body change in the transcript.
- [ ] Lane 2. `POST /api/inventory/add` with quantity `1.5`. Save `qtm-qty-lane-2.txt`. Pass when both trunk and head return 400 and zero writes.
- [ ] Lane 3. `POST /api/inventory/add` with quantity `2` and a blank expiration. Save `qtm-qty-lane-3.txt`. Pass when both sides return 201.
- [ ] Lane 4. `POST /api/inventory/remove` with `quantityToRemove` `1` on a fixture lot of quantity 5. Save `qtm-qty-lane-4.txt`. Pass when head returns 200 and one mocked PATCH.
- [ ] Lane 5. Call that same remove twice. Save `qtm-qty-lane-5.txt`. Pass when the mock shows two PATCH calls. This lane records the unchanged retry behavior. It does not treat two writes as a pass of an idempotency goal.
- [ ] Lane 6. `POST /api/removal-log` with `quantityRemoved` `1.5`. Save `qtm-qty-lane-6.txt`. Pass when status is 400 and the write count is 0.
- [ ] Lane 7. `POST /api/removal-log` with `quantityRemoved` `1` and both id arrays non-empty. Save `qtm-qty-lane-7.txt`. Pass when status is 201.
- [ ] Lane 8. `GET /api/inventory/recent` with no auth header. Save `qtm-qty-lane-8.txt`. Pass when status is 200 and the CORS header is `*`.
- [ ] Lane 9. `GET /api/mpc/search?name=milk`. Save `qtm-qty-lane-9.txt`. Pass when status is 200.
- [ ] Lane 10. `POST /api/inventory/add` with quantity `"2"` as a string. Save `qtm-qty-lane-10.txt`. Pass when status is 400.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Median milliseconds for the remove call with quantity `1`, plus the recent median. The user-visible end state is the 400 on `1.5` and the 200 on `1`.
- [ ] Probe. Interleave five trunk remove calls and five head remove calls on the fixture lot. Trunk still performs the write. Head performs the write only for the integer call.
- [ ] Baseline. Record the trunk recent median of 2 ms first. Time the integer remove on trunk in the same probe and record it before judging head.
- [ ] Rule. Fail if the head recent median exceeds 100 ms. Fail if the head integer-remove median exceeds 100 ms. Do not ratio the 400 path against the trunk write path. They are different work.

**Review gate.** The operator reviews before merge.

- [ ] Copy the lane 1 transcript into `/opt/cursor/artifacts/qtm-qty-review-remove-float.txt` and take a screenshot of that terminal.
- [ ] Record a 30 to 60 second video of lane 1 and lane 4 on a lane VM. Save it as `/opt/cursor/artifacts/qtm-qty-review.mp4`.
- [ ] Post the screenshot and the video in chat. Stop at merge-ready. Wait for the operator.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Operator accepted the screenshot and the video.
- [ ] Rebased onto current `qtm-route` after the verdict, patch-id unchanged.
- [ ] The root appends `qtm-qty` onto `qtm-route`. The operator lands it. The owner does not merge.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the stack root, the stack tip, one verdict line per PR, and anything left out.

## Appendix A. Prototype evidence

Prototypes lived in `/tmp/qtm-prototypes` and were not committed. The false HTTP run is recorded because the first observation was wrong.

`npx tsc --noEmit` on `/workspace` exited 0. `npx tsc -p tsconfig.test.json --noEmit` exited 0. `npx jest --ci` printed `Test Suites: 6 passed` and `Tests:       78 passed` in 2.151 s. Node was `v22.14.0`. There is no `.github/` directory.

`npx tsc -p /tmp/qtm-prototypes/tsconfig.include-tests.json --noEmit` exited with 8 `TS2835` errors, all on dynamic `import()` lines in handler tests. That is the failure `0563eb2` split away. `npm run typecheck` does not see it, because `tsconfig.json` includes only `api` and `lib`.

`/tmp/qtm-prototypes/drive-handlers.ts` called the real handlers with a dummy env string and a mocked `fetch`. No inbound auth header was set.

- Add with quantity `1.5` returned 400 and 0 fetches. CORS on the fake response was `*`.
- Remove with `quantityToRemove` `1.5` returned 422, body insufficient inventory, and 1 fetch. The handler did not reject the float. The 422 came from an empty mocked table.
- Add with `expirationDate` `""` returned 201 and 2 fetches.
- Add with the expiration field omitted returned 201 and 2 fetches.
- Recent with no auth header returned 200 and `{ "records": [] }`.
- `applyCors` with `ALLOWED_ORIGIN` unset set the origin header to `*`.

`/tmp/qtm-prototypes/brand-probe.ts` ran `parsePositiveInt`. Integer `1` was accepted. `1.5`, `0`, `-3`, and `"2"` were rejected with status 400.

`/tmp/qtm-prototypes/type-drift.ts` compiled `Equal<Hit, MpcRecord>` as true, so `searchByName`'s hit matches `MpcRecord` today. `Equal<Hit, MpcRecord & { barcode: string }>` failed with `Type 'true' is not assignable to type 'false'`. Nothing in the repo forces that alias, so a later field can drift while `tsc --noEmit` stays green.

`/tmp/qtm-prototypes/http-recent.ts` first mocked every `fetch`, including the loopback client. The printed 200 body was the mock, not the server. Stderr showed no request. After loopback used the real `fetch`, the server returned status 200, CORS `*`, and a wrapped body whose inner JSON was `{ "records": [] }`. Five samples were min 1 ms, median 2 ms, max 23 ms. The number is loopback plus a mock. It is not Airtable latency.

`/tmp/qtm-prototypes/retry-remove.ts` called `removeInventoryFEFO` twice while the mock always returned quantity 5. Both calls returned `totalRemoved` 1. The mock recorded two PATCH writes to the same lot URL. The mock did not decrement stored quantity, so this does not measure a 5 to 3 drop. It does show the second call is not collapsed.

A check that exits 1 on `as any` found `lib/airtable-client.ts:65`, `lib/inventory.ts:51`, and `lib/inventory.ts:62`. A check that exits 1 on a raw default handler found 9 files. `api/index.ts` is a comment, not one of them.

`timeout 20 npx vercel dev --listen 3999` printed `No existing credentials found` and did not listen. No deploy was attempted.

A strict scan for `pat` plus 14 alphanumerics, excluding the `patch` false positive, found 0 hits in the worktree and 0 added lines in history. Placeholders `your_pat_here` and the Jest fixture stayed. No secret value was printed or copied into this plan.

Garbage date strings were not probed. This program does not add a date-format rule.

## Appendix B. Alternatives rejected

A Zod schema was not prototyped. The repo has no schema dependency, and `parsePositiveInt` already rejected the bad samples. Adding a library is a later choice, not this program.

Fusing `POST /api/inventory/remove` and `POST /api/removal-log` into one command was rejected for this program. The app repo is missing, so callers cannot be moved in the same change.

Turning auth on, or changing the CORS default away from `*`, was rejected for this program. Both change the client contract, and the client repo was not found.

`vercel dev` as the verification launch was rejected after it exited for missing credentials.

Autopilot-full was not selected. The PRs share a stack, and merge authority was withheld. The operator can switch to full only by granting merge.

Editing the open drafts `cursor/deploy-readiness-09f2` and `cursor/readme-local-dev-e17a` was rejected. They are docs and deploy config. This program does not deploy.

## Appendix C. Risks

`git show origin/main:pstack/skills/swarm/SKILL.md` exits 128 in this repo. Owners who treat that as a stop will stall. The arm step points them at `cursor/plugins` commit `2f8377461fd533f5af782e1fd643783b1067b847`.

`qtm-parse` can change JSON if the new parser is stricter than today's `as` coercions. The live lanes compare fixture bodies to trunk. A mismatch fails the lane. Do not quiet it by editing the fixture.

`qtm-qty` changes remove of `1.5` from a non-400 response to 400. The app may send floats. That is why the PR is review-gated.

The verification server must keep mocking non-loopback `fetch`. A real `AIRTABLE_PAT` in the environment would make add and remove write inventory. Doctor fails closed if a real network call is attempted. The prototype's first HTTP run is the warning. A mocked global `fetch` can fake a pass.

Retry still writes twice. Lane 5 of `qtm-qty` records it and does not fix it.

PR #1 and PR #2 are open drafts. This stack does not merge them and does not touch `api/index.ts`.

## Appendix D. Links and reading list

pstack was read from a sparse clone of `https://github.com/cursor/plugins` at `2f8377461fd533f5af782e1fd643783b1067b847`, directory `pstack/`. The files were `docs/guide/04-design.md`, `docs/guide/06-verify-and-ship.md`, `docs/guide/07-overnight.md`, `docs/guide/08-principles.md`, `skills/correct/SKILL.md`, `skills/architect/SKILL.md`, `skills/architect/references/design-red-flags.md`, `skills/create-verification-skill/SKILL.md`, `skills/create-verification-skill/references/feature-map-example/README.md`, `skills/figure-it-out/SKILL.md`, `skills/recall/SKILL.md`, `skills/technical-writing/SKILL.md`, `skills/unslop/SKILL.md`, `skills/typescript-best-practices/SKILL.md`, `skills/poteto-mode/playbooks/multi-phase-plan.md`, `skills/poteto-mode/playbooks/prototype.md`, `skills/poteto-mode/playbooks/autopilot-stack.md`, `skills/poteto-mode/scripts/check-plan.mjs`, and the principle skills for encode-lessons-in-structure, type-system-discipline, model-the-domain, boundary-discipline, prove-it-works, test-behavior-not-implementation, minimize-reader-load, subtract-before-you-add, guard-the-context-window, and make-operations-idempotent.

`/correct` ordered the fixes. Architecture and types come before the check script. The check script comes before `AGENTS.md`. `/architect` screened the shape against shallow modules, two ways, importable internals, and hand-synced types. `/create-verification-skill` fixed the skill outline. The HTTP drive was prototyped because `vercel dev` could not start.

Recall found no chat transcripts for this workspace. Shared record was `git` history plus `gh` on `yeshcorp/qtm-api`. No issue tracker entries exist. PR #1 and PR #2 have no human review comments. The only issue comments are Vercel bot deploy notes.

Owners run `/how` before editing `lib/inventory.ts` and `/interrogate` on `qtm-qty` only. The decision trail follows `pstack/skills/show-me-your-work/SKILL.md` and stays local unless the operator asks to commit it.

## Appendix E. History and review

`main` has 24 commits, from `47ef929` on 2026-05-31 through `213147c` on 2026-06-07. Authors on the commits are `TheUpstateSound` and `yeshcorp`. `213147c` is co-authored by Claude. PR #1 and PR #2 were opened by Cursor agents and are still drafts. There is no review thread to quote.

The May 31 sequence is an agent executing `docs/superpowers/plans/2026-05-31-vercel-airtable-proxy.md`, then repairing the result in follow-up commits. That plan told the agent to set `vercel.json` runtime `nodejs20.x` and `tsconfig` module `commonjs`. Later commits undid both.

`yeshcorp` repos visible to this token are `qtm-api` and `yesh-corp-assets`. No iOS or React Native repo is in that org. The client that calls these routes was not read. The old plan names `EXPO_PUBLIC_AIRTABLE_PAT` as a variable in that missing app. The scan of this repo found no token.

## Appendix F. Pitfall counts

A class counts when it happened twice. Counts below are commits or current files, each with a SHA.

Boundary checks were added after the handler compiled. 4 commits. `95f2d12` made quantity a number. `aca929d` rejected zero and, only on add, non-integers. `23442e0` required a positive `quantityRemoved` and non-empty arrays. `ca2b3fe` checked the id param and that `purchaseFrom` is a string.

Tool config was flipped until the tool stopped failing. 4 commits. `9f27c7b` moved `commonjs` to `ES2020` and `bundler`. `91ec88c` says commonjs in the message and sets `node16` in the diff. `0563eb2` added `tsconfig.test.json` after node16 extension errors. `5d765e3` deleted the invalid `nodejs20.x` runtime. `vercel.json` on main is `{}`.

Airtable JSON stayed behind casts. 3 commits tried to tighten types and left the hole. `c6b50f0` still returns `json as T`. `3a3141b` switched PATCH to `unknown`. `02a1441` says type safety and still left `as any` in `fetchInventoryLots`. Main still has 3 `as any` sites.

Two handler shells were copied. 9 handlers. Block style is in `8b9e5c0` and `36c2e0e`. Early-return style is in `445db2b` and `4a9eb1d`. The raw-handler check fails on all 9.

Commit text does not match the diff. 2 commits. `91ec88c` claims commonjs and sets `node16`. `aca929d` claims float rejection. The remove diff only changes `< 0` to `<= 0`. The prototype showed `1.5` still reaches Airtable.

Related, not in the top five. `4a9eb1d` added `GET /api/mpc/search` with no test file. Three handler test files mock `applyCors` and the lib, so they stay green when CORS or the Airtable parse breaks. `8ef7fea` added JSDoc for dates. `213147c` then allowed a blank expiration without changing `NewInventoryData`. `8ef7fea` and `aca929d` document CORS, and the default is still `*`.

## Appendix G. Types, invariants, and boundaries

`lib/parse.ts` is the only module that turns `unknown` into domain values. `lib/route.ts` is the only module that turns a domain result into status, CORS, and the error JSON. `lib/inventory.ts` and `lib/mpc.ts` keep FEFO, barcode matching, and the Airtable field ids. They accept already-parsed ids and quantities.

Invariants the program locks.

- A quantity that crosses HTTP is a positive integer, or the response is 400 and Airtable is not called.
- A blank, missing, or null expiration is stored as no date. The add route still returns 201. Recent may still show an empty string, because that is today's feed JSON.
- `MpcId` and `InventoryRowId` are distinct brands. A lot id cannot be passed where an MPC id is required without a parse.
- `searchByName` and `lookupByBarcode` share `MpcRecord`.
- `authorize` is the only auth hook, and it returns allow until Captain changes it.
- `applyCors` is the only writer of `access-control-allow-origin`.

Invariants the program does not change.

- Unauthenticated calls keep working.
- Unset `ALLOWED_ORIGIN` keeps sending `*`.
- Remove and removal-log stay two routes.
- A repeated remove still issues another write.
- `api/index.ts` stays a placeholder.

## Appendix H. Lint, tests, and CI

CI is the first PR because `npm test` and both `tsc` projects are already green, and nothing runs them on a pull request. PR #1's body says 81 tests. PR #2's body says 78. Main is 78. A workflow makes the count checkable.

The check script is the lint. It fails on `as any` after `qtm-parse`, and on a raw handler after `qtm-route`. Both failures were produced on today's tree. Do not add ESLint until a rule needs more than that script. There is no ESLint config now.

New handler tests assert status, CORS, and whether a mocked Airtable write happened. They stop mocking `applyCors`. They do not assert private call order inside `lib/`.

`npm run typecheck` stays `tsc --noEmit` for `api` and `lib`. CI also runs `tsc -p tsconfig.test.json --noEmit`, which passes today and fails if tests are folded back into the `node16` config.

## Appendix I. Prose rules and the verification skill

`AGENTS.md` is one table, written in `qtm-qty` only.

| Mistake the history shows | What fails the build |
| Hand-written quantity checks | `parsePositiveInt` plus handler tests for `1.5` and `0` |
| `as any` on Airtable JSON | `node scripts/check-agent-rules.mjs` |
| A new file that copies a handler shell | the same script |
| Typecheck that ignores tests | CI step `tsc -p tsconfig.test.json --noEmit` |
| Proof that needs `vercel dev` or a real PAT | `.cursor/skills/verify-qtm-api` |

The skill name is `verify-qtm-api`. Callers reach the API over HTTP on a local server. There is no web UI and no CLI.

Launch runs `npm ci` if `node_modules` is missing, then `npx tsx .cursor/skills/verify-qtm-api/scripts/serve.ts`. The process listens on `127.0.0.1` and port `0` unless `VERIFY_PORT` is set. Ready means doctor succeeded, not merely that the process exists.

Doctor is read-only. It checks that the pid is the one this run spawned, that `GET /api/inventory/recent` returns 200 JSON, and that no outbound fetch except loopback occurred. It exits non-zero otherwise.

Drive uses curl against the routes in the feature map. The first five feature files are recent, add, remove, lookup, and search. The map README lists lots, create, purchase-from, and removal-log as not yet seeded, so a proof of one route is not a proof of those four.

Evidence is the curl command, status, response headers, body, and the mocked write log, under `/tmp/verify-qtm-api/<run-id>/`. Cleanup kills the spawned pid and deletes the scratch server state. It does not delete that evidence directory.

`/maintain-verification-skill` is how the map stays honest after the skill lands. The prototype already drove recent once. The other features are not yet driven end to end by a committed skill, because this plan does not add that skill. `qtm-ci` does, and its lanes drive the rest.

## Appendix J. Effort and Captain decisions

The repo is nine handlers, five lib modules, and six Jest files. The stack is four PRs. `qtm-ci` adds files and does not change responses. `qtm-parse` replaces casts in the lib. `qtm-route` rewrites the nine handlers onto one wrapper without a status change. `qtm-qty` is the behavior change, limited to quantity gates.

Captain decides these. The program does not guess past them.

- Say go before any owner starts. Pick autopilot-stack, already named here, or grant merge and switch to autopilot-full.
- Accept or reject the positive-integer rule before `qtm-qty` is appended. The recommendation is to accept it. Today's remove path allows `1.5`.
- Leave auth off and CORS default `*` for this stack, or say otherwise in writing. The client repo is missing, so this program will not invent a scheme.
- Leave blank expirations valid. `213147c` did that on purpose.
- Leave remove and removal-log as two calls, and leave retries non-idempotent, until the app repo is available to migrate.
- Do not treat this stack as a production deploy, a secret rotation, or a merge of PR #1 or PR #2.

## Appendix K. Access and redaction

Read in full were the local checkout of `main` at `213147c5a9c47c0cc1481be8a1085ddd6fb29da4`, all 24 commits, PR #1, and PR #2.

Not available. The iOS or React Native app. It is not in `yeshcorp`. Other orgs were not searched. Human review comments. There are none. Chat transcripts for recall. There are none in this workspace. Vercel credentials. `vercel dev` could not start. A live Airtable base. The prototype mocked `fetch` and did not use a real token.

No secret value is in this file. The scan found no committed Airtable PAT. Do not rotate one from this plan.
