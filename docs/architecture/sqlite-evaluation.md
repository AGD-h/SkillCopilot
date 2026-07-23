# SkillCopilot SQLite Evaluation (Phase 5)

Date: 2026-07-23
Status: Accepted

Scope: Written architecture evaluation only. No SQLite dependency, schema, migration, or database file was introduced.

---

## 1. Current Data Model

SkillCopilot is a local-first desktop app. Authoritative product data lives in workspace and user files; the app reads them on demand through Tauri commands and keeps results in React memory for the current session.

| Data | Authority | Access path | Persistence |
| --- | --- | --- | --- |
| Workspace status | `HANDOFF.md`, `AGENTS.md`, `git status --short --branch` | `read_workspace_status` → Dashboard | Disk + Git; no app write-back |
| Skills | Local `SKILL.md` files under workspace and user skill roots | `scan_local_skills` → Skills page | Disk only; in-memory scan result |
| Agents | `AGENTS.md`, each `.cursor/rules/**/*.mdc`, `.github/copilot-instructions.md` | `scan_agent_configs` → Agents page | Disk only; one source file = one Agent |
| UI locale | User preference | `localStorage` key `skillcopilot.locale` | Browser/WebView localStorage |
| Workspace binding | Currently hardcoded | `WORKSPACE_ROOT_PATH = E:\SkillCopilot` | Not persisted; Settings picker not implemented |

Supporting details:

- Frontend types mirror Rust camelCase envelopes (`WorkspaceStatus`, `SkillScanResult`, `AgentScanResult`) without opaque JSON.
- Skills and Agents scan on first page mount or manual refresh; leaving a page and returning does not rescan while the page stays mounted.
- Locale switching does not rewrite source names, roles, paths, warnings, or prompt bodies.
- There is no relational overlay for tags, notes, favorites, history snapshots, or multi-workspace indexes.

---

## 2. Current Data Scale

Observed against the primary development workspace and scanner caps:

| Metric | Current value |
| --- | --- |
| Real Skills on this machine | 13 |
| Real Agents in this workspace | 3 |
| Skill valid-unique cap | 500 |
| Agent valid-unique cap | 200 |
| Skill scan depth | 8 |
| Cursor Agent rule depth | 6 |
| Per-file read bound | 1 MiB |
| Warning retention | true count kept; at most 100 warning strings returned |
| Workspace count in app | 1 fixed path |

Workload characteristics:

- Scans are read-only, bounded, and intentionally small for MVP.
- Search is in-memory substring filtering over already-loaded lists.
- Prompt/body copy returns the exact UTF-8 source text already held in memory.
- There is no measured evidence that current scan or search latency requires an indexed store.

---

## 3. Problems SQLite Could Solve

SQLite would become useful if SkillCopilot later needs durable, queryable app-owned state beyond the source files:

1. **Multi-workspace indexes** — fast switching across many bound repositories with cached summaries.
2. **History / versions** — snapshots of HANDOFF, Skill, or Agent content over time.
3. **User tags, notes, favorites** — relational overlays that are not present in source files.
4. **Complex queries** — joins, facets, ranking, or saved filters across workspaces and resource types.
5. **Large-scale full-text search** — searching hundreds or thousands of bodies without loading every file into memory each session.

None of these capabilities are required by the current MVP acceptance criteria.

---

## 4. Costs of Introducing SQLite Now

Introducing SQLite before those needs appear would create ongoing product and engineering cost:

1. **Schema and migrations** — versioned tables, upgrade paths, and empty-database bootstrapping for a product that still changes rapidly.
2. **Source-vs-cache consistency** — files remain authoritative, so every scan must invalidate or reconcile a DB cache; users will notice stale indexes first.
3. **Stale index risk** — edits made outside SkillCopilot (Cursor, editors, git checkout) would silently diverge from cached rows unless watchers or aggressive rescans exist.
4. **Backup, corruption, and permissions** — extra DB files, lock contention, recovery stories, and Windows permission failures that pure file reads do not have.
5. **Windows / future macOS packaging** — native crate linkage, CI matrix, and installer surface for a dependency the app does not yet need.
6. **Test and upgrade cost** — migration tests, fixture DBs, and dual-path fallbacks increase the verification burden for every scan change.

For the current single-workspace, on-demand scan model, these costs outweigh the benefits.

---

## 5. Decision Matrix

| Option | Fit for current MVP | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- | --- |
| Continue pure files + in-memory scan | High | Source remains authoritative; simplest consistency model; already implemented and verified | Weak for multi-workspace history/tags/FTS later | **Chosen for product data** |
| localStorage / small JSON config | High for preferences | Tiny, no native deps, good for locale and future workspace binding | Not suitable as Skill/Agent body index; easy to outgrow if overloaded | **Chosen for lightweight preferences** |
| SQLite | Low for current needs | Strong later for indexes, history, relational overlays, FTS | Schema/migration/stale-cache cost too high before real demand | **Deferred** |

Recommendation summary:

- Keep Skills, Agents, HANDOFF, AGENTS, and Git status as file/Git-backed reads.
- Keep locale (and similar UI preferences) in localStorage.
- When Workspace picker lands, persist the selected path with lightweight config (localStorage or a small JSON file), not a database.

---

## 6. Explicit Conclusion

**Current MVP does not introduce SQLite.**

1. Continue treating local source files and Git output as the authoritative product data.
2. Continue using localStorage for lightweight preferences such as locale.
3. Implement Workspace folder selection and persistence with lightweight storage; do not require SQLite for that feature.
4. Do not add a SQLite crate, npm package, migration framework, or `.db` file “just in case.”

This conclusion satisfies Phase 5’s required written decision and preserves the project constraint against premature database adoption.

---

## 7. Future Revisit Triggers

Re-open this evaluation only if one or more of the following become real, measured product needs:

1. Bound workspace count grows enough that cold multi-workspace scanning is a clear UX problem.
2. Users need historical snapshots or version queries of HANDOFF / Skill / Agent content.
3. User tags, notes, favorites, or other overlays create durable relational data that cannot stay in a small JSON file.
4. Scan or search performance fails measured targets after real usage, not speculative future caps.
5. The product needs complex filtering, full-text indexing, or transactional writes across multiple resources.

Until a trigger is met, keep the pure-file architecture.

---

## 8. Risks and Exit Strategy

### Risks of the chosen path

- Multi-workspace switching may feel slow if users later bind many large repositories without an index.
- Notes/tags cannot be stored richly until a later storage decision.
- Frontend in-memory search will not scale forever if body corpora grow far beyond current caps.

### Exit strategy if SQLite becomes necessary

1. Keep files authoritative; treat SQLite as a derived cache or overlay store, never the sole copy of Skill/Agent bodies.
2. Introduce the smallest schema that covers the triggering need only (for example workspace index, then overlays, then FTS).
3. Add explicit invalidation based on path + mtime (and preferably content hash) so outside edits cannot silently stale the UI.
4. Ship migrations and a “rebuild index” action before relying on the cache for acceptance criteria.
5. Preserve the current mock-fallback and partial-scan UX so DB failures do not white-screen the app.

---

## 9. ADR

### Status

Accepted — 2026-07-23

### Context

Phases 1–4 delivered a verified local-first Skill/Agent manager using Tauri read-only file/Git scans, in-memory UI state, and localStorage locale preference. The remaining MVP gap is Workspace folder selection/persistence. Phase 5 required a written decision on whether SQLite is needed before any database work.

### Decision

Do **not** introduce SQLite for the current MVP. Continue pure files + in-memory scanning for product data; use localStorage/small JSON for preferences and upcoming Workspace binding.

### Consequences

- No SQLite dependency, schema, migration, or database file is added now.
- Engineering effort stays on Workspace picker and other product gaps instead of cache invalidation.
- Source-file consistency remains simple and inspectable.
- Future SQLite adoption is allowed only when a revisit trigger above is met and a new ADR updates this conclusion.

### Revisit Triggers

See section 7. Any revisit must produce an updated written conclusion before a SQLite dependency is added.
