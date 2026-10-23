# FulfillmentHub Workshop Run-of-Show & Live Demo Cheat Sheet (Day 2)
**Audience:** Software Engineers & Engineering Leadership
**Sample Application:** `FulfillmentHub` (React 18 + Express + SQLite Retail Order & Inventory Portal)
**Repository Strategy:** 2 Timestamped Git Commits (`day2-start` for Part 1 bare harness; `day2-harness-upgrade` for Part 2 `.agents/` upgrades).

---

## 0. The Two Timestamped Git Commits & Block Pacing Map

### Why Two Commits Make the Demo Bulletproof
1. **Commit #1 — `day2-start` (Bare Harness for Part 1 / Steps 1–7):**
   - Contains the working `FulfillmentHub` app, seeded SQLite database (`ORD-1001`..`ORD-1006`), `PRD.md`, and a minimal `GEMINI.md`.
   - **Crucially:** `.agents/` is **empty** on this commit! That guarantees the Innocent Prompt in Step 2 genuinely fails (no hidden rules or `Stop` hooks firing prematurely).
2. **Commit #2 — `day2-harness-upgrade` (Engineered Harness for Part 2 / Step 8):**
   - Contains the completed `spec/bulk-order-cancellation.md`, the implemented Bulk Cancel endpoint & tests, and all pre-configured `.agents/` files (`mcp_config.json`, `rules/sqlite-safety.md`, `hooks.json`, `hooks/verify.sh`, `skills/inventory-audit/SKILL.md`, and `agents/*.md`).

---

### High-Cohesion Block Flow (Zero Alt-Tab Whiplash)

| Block | Mode | Slides / Steps Covered | Duration | Git State |
| :--- | :--- | :--- | :--- | :--- |
| **Slide Block 1** | 📊 **Slides** | **Slides 8–9:** Context Engineering & Innocent Prompt Setup | 3 mins | — |
| **IDE Block 1** | 💻 **Live IDE** | **Steps 1–2:** Tour `FulfillmentHub` $\rightarrow$ Run Innocent Prompt $\rightarrow$ Inspect 3 Bugs $\rightarrow$ `git checkout -- .` | 5 mins | `day2-start` |
| **Slide Block 2** | 📊 **Slides** | **Slides 10–13 (Uninterrupted):** Shifting Left $\rightarrow$ Concentric SDD Model $\rightarrow$ The Elephant $\rightarrow$ The Goldfish | 8 mins | — |
| **IDE Block 2** | 💻 **Live IDE** | **Steps 3–7 (Continuous Flight):** `/context` & `/compress` $\rightarrow$ `/grill-me` Elephant $\rightarrow$ Write `spec/bulk-order-cancellation.md` $\rightarrow$ Critic Goldfish (New Window + Ad-hoc `"As a subagent..."`) $\rightarrow$ Builder Goldfish on **Flash ⚡** | 15 mins | `day2-start` |
| **Slide Block 3** | 📊 **Slides** | **Slides 14–15:** `.agents/` Architecture & Upgrading the Harness (5 Frustrations $\rightarrow$ 5 Upgrades) | 4 mins | — |
| **IDE Block 3** | 💻 **Live IDE** | **Step 8 (8.1–8.5):** **8.1** MCP (GitHub Issue PRD) $\rightarrow$ **8.2** Rules $\rightarrow$ **8.3** Hooks $\rightarrow$ **8.4** Skills $\rightarrow$ **8.5** Custom `agent.md` Subagents | 35 mins | `day2-harness-upgrade` |
| **Slide Block 4** | 📊 **Slides** | **Slides 16–17:** Anti-Bloat Decision Matrix $\rightarrow$ Day 3 Multi-Agent Swarms $\rightarrow$ Live Q&A | 20 mins | — |

---

## 💻 IDE Block 1 (After Slide 9): Steps 1 & 2

### Step 1: Introduce `FulfillmentHub` & Set the Groundwork
```bash
git clone <workshop-repo-url>
cd fulfillmenthub
git checkout day2-start
npm run dev
```

1. **Show Browser (`http://localhost:5173`):** Walk through the **FulfillmentHub** portal.
2. **Point out the 6 seeded orders in `server/src/db.ts`:**
   - `ORD-1001` (Alice Smith — *Cashmere Crewneck Sweater*, Qty: `1`, Status: **`PENDING`**)
   - `ORD-1002` (Bob Jones — *Selvedge Denim Jacket*, Qty: `2`, Status: **`PROCESSING`**)
   - `ORD-1003` (Charlie Brown — *Leather Chelsea Boots*, Qty: `1`, Status: **`SHIPPED`** 🚚 — *Already on the FedEx truck!*)
   - `ORD-1004` (Diana Prince — *Linen Blazer*, Qty: `1`, Status: **`PENDING`**)
   - `ORD-1005` (Evan Wright — *Silk Evening Scarf*, Qty: `2`, Status: **`CANCELLED`** ❌ — *Already cancelled & restocked earlier!*)
   - `ORD-1006` (Fiona Gallagher — *Silk Evening Scarf*, Qty: `1`, Status: **`PENDING`**)
3. **State the Goal (`PRD.md`):** We need to build **Phase 2: Bulk Order Cancellation with Inventory Restock** (`POST /api/orders/bulk-cancel`).

---

### Step 2: The "Innocent Prompt" Trap & Clean Revert

#### 2.1 Paste the Innocent One-Shot Prompt
```text
Add a POST /api/orders/bulk-cancel endpoint to server/src/routes/orders.ts and a "Cancel Selected" button in the UI that cancels an array of orderIds and restocks their quantities back into the inventory table.
```

#### 2.2 Point Out the 3 Silent Disasters in the Diff
1. 💥 **Cancels `ORD-1003` (`SHIPPED`):** Cancels boots already on the delivery truck and creates phantom inventory.
2. 💥 **Double-Restocks `ORD-1005` (`CANCELLED`):** No idempotency check—retrying a batch manufactures silk scarves out of thin air ($2 \rightarrow 4 \rightarrow 6$).
3. 💥 **Partial Mutation Corruption:** Loops over IDs without an atomic rollback boundary if item #3 fails.

#### 2.3 Revert the Slop Immediately
```bash
git checkout -- . && git clean -fd
```
*(Now switch to **Slide Block 2: Slides 10, 11, 12, and 13** and teach the complete Shifting Left + Elephant & Goldfish model uninterrupted!)*

---

## 💻 IDE Block 2 (After Slide 13): Steps 3 through 7 (One Continuous SDD Flight)

### Step 3: Quick Peek at `/context` and `/compress`
*Before starting the Elephant session, demystify the two context hygiene commands in 45 seconds:*
```text
/context
```
```text
/compress
```
*Talk track:* "`/context` lets you audit your token budget at any time, and `/compress` (or `/compact`) summarizes earlier turns if a debugging session gets long. We rarely need `/compress` when we follow the **Elephant & Goldfish** pattern, because we externalize our state into a crisp Markdown spec in Git and start our builders in a fresh window."

---

### Step 4: Start a `/grill-me` Elephant Session (Intent & Evaluation Criteria)
*Action: Ensure model picker is set to **Gemini Pro (Frontier Thinking)**.*

```text
/grill-me Read @PRD.md and @server/src/db.ts. We need to design Phase 2: Bulk Order Cancellation with inventory restock (POST /api/orders/bulk-cancel).

Hard Rule: Do NOT write any implementation code yet.

Help me lock in:
1. A crisp Problem Statement & explicit Non-Goals
2. Pass/Fail Evaluation Criteria (our verification guardrails)
3. A rough Napkin Architecture

Ask me the top 3 architectural and edge-case questions we must resolve first.
```

---

### Step 5: Compile & Output the Official Spec to `spec/bulk-order-cancellation.md`
*Action: Answer the Elephant's questions in the same window. (Note: We intentionally leave out `CANCELLED` retry idempotency here so the adversarial Critic Goldfish catches it in Step 6!):*

```text
Here are our architectural decisions:
1. All-or-Nothing Atomicity: Wrap the entire batch in a single SQLite db.transaction(). If ANY order ID in the request does not exist (404) or has status 'SHIPPED' (409 Conflict), abort and roll back the entire batch with zero database mutations.
2. Inventory Restock: For valid cancellable orders ('PENDING' or 'PROCESSING'), set status = 'CANCELLED' and increment inventory.stock_count by the order's quantity.
3. Structured Error Contract: Return { error: string, code: string, failedOrderId?: string } on failure, and 200 OK { cancelledIds: string[], restockedCount: number } on success.
4. Non-Goals: Do not integrate external payment gateway refunds or email notifications in Phase 2.

Compile these decisions into a clean, formal specification file at spec/bulk-order-cancellation.md containing:
1. Problem Statement & Non-Goals
2. Evaluation Rubric (Pass/Fail Test Cases)
3. Technical Implementation Plan (API Contract, Transaction Logic, and Atomic Execution Tasks)

Do NOT write application code—only write spec/bulk-order-cancellation.md.
```

---

### Step 6: The Adversarial Critic Goldfish (New Window $\rightarrow$ Then Ad-Hoc Subagent Prompt)

#### 6A. Method 1: Manual Fresh Conversation Window (`+ New Chat`)
*Action: Open a brand-new conversation tab (**Gemini Pro**) to show zero conversational memory:*

```text
You are a skeptical Principal Backend Engineer and Adversarial Spec Critic. You have zero prior context on how this feature was designed.

Read @spec/bulk-order-cancellation.md and compare it against our database schema and seeded data in @server/src/db.ts.

1. In 2 sentences, summarize the batch rollback and inventory restock rules in your own words.
2. Stress-test this spec against @server/src/db.ts: identify any unhandled order status transitions, idempotency traps, or data corruption bugs that could occur in production.
3. Propose the exact Markdown patch to spec/bulk-order-cancellation.md to close the gap.
```

#### 6B. Method 2: Ad-Hoc Subagent Invocation via Prompt (No Tab Switching!)
*Action: Go back to the Elephant window and show that you don't even have to open a second tab—you can tell Antigravity to spawn an isolated subagent on the fly with `"As a subagent..."`:*

```text
As a subagent:

You are a skeptical Principal Backend Engineer and adversarial reviewer. You have zero prior context on how this specification was created.

Read @spec/bulk-order-cancellation.md and audit it against @server/src/db.ts:
1. Verify how the spec handles all 4 seeded order statuses in db.ts ('PENDING', 'PROCESSING', 'SHIPPED', and 'CANCELLED' on ORD-1005).
2. Identify any idempotency or double-restocking bug if a client retries a batch containing an already-'CANCELLED' order.
3. Return the exact Evaluation Rubric bullet and Technical Plan rule we must add to spec/bulk-order-cancellation.md before coding.
```

*Apply the 10-second patch to `spec/bulk-order-cancellation.md`:*
```text
Apply the subagent's findings to @spec/bulk-order-cancellation.md: treat already-'CANCELLED' orders in a batch as an idempotent no-op (200 OK, delta = 0 inventory restock) and add a Pass/Fail test case for ORD-1005 in the Evaluation Rubric.
```
*Talk track:* "Notice how powerful `As a subagent:` is—it spun up a clean-room Goldfish automatically! The only catch? We had to type out that whole 'You are a skeptical Principal Engineer...' prompt by hand. In Part 2 (Step 8.5), we'll codify that into a permanent `agent.md` file."

---

### Step 7: Implementation Builder Goldfish ("Switching" to Gemini Flash ⚡)
*Action: Open a fresh window (or spawn a builder) and switch the Model Picker to **Gemini Flash ⚡**.*

```text
Read @spec/bulk-order-cancellation.md. Implement the specification following strict TDD:

1. First, create server/tests/bulk-cancel.test.ts asserting every Pass/Fail test case in Section 2 (Evaluation Rubric)—including atomic rollback when ORD-1003 ('SHIPPED') is in the batch, valid restock on 'PENDING'/'PROCESSING', and idempotent 0-delta restock when ORD-1005 ('CANCELLED') is included.
2. Next, implement POST /api/orders/bulk-cancel in server/src/routes/orders.ts using an atomic SQLite db.transaction().
3. Run npm run test:fast and verify 100% of unit tests pass.
```

*(Now switch to **Slide Block 3: Slides 14 & 15** to introduce `.agents/` and the 5 Harness Upgrades!)*

---

## 💻 IDE Block 3 (After Slide 15): Step 8 — "Upgrading the Harness" (8.1–8.5)

### Switch to Timestamped Commit #2 (`day2-harness-upgrade`)
```bash
git checkout day2-harness-upgrade
```

---

### 8.1) MCP — Pulling the PRD Live from a GitHub Issue (vs. Context Bloat)
*Solves the SDLC starting point: "In the real world, our PRD lives in a GitHub Issue or Jira ticket—not a static file."*

#### Local File Location:
- **Global Config:** `~/.gemini/config/mcp_config.json` (or plugin `mcp_config.json`)
- **UI Inspection:** **Additional Options (`...`) > MCP Servers**

#### Exact JSON Configuration (`mcp_config.json`):
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_GITHUB_PAT>"
      }
    }
  }
}
```

#### Live Demo Prompt for 8.1:
```text
Fetch GitHub Issue #2 ("PRD: Phase 2 Bulk Order Cancellation & Atomic Inventory Restock") from our repository using the GitHub MCP server. Summarize the acceptance criteria and compare them against @spec/bulk-order-cancellation.md.
```

#### The Anti-Bloat Teaching Moment (Run `/context`):
- Run `/context` right after querying GitHub MCP.
- Point out: *"Pulling the PRD from a GitHub Issue via MCP means zero manual copy-pasting. **However**, look at `/context`: the GitHub MCP server injects 25+ tool schemas (`create_issue`, `merge_pull_request`, `create_branch`...) costing **~8,000 tokens on every single turn**! Enable MCP for systems you actively query (like GitHub Issues), and disable unused MCP servers so they don't eat 20% of your context window."*

---

### 8.2) Rules — Global Constitution (`GEMINI.md`) vs. Scoped Rules (`.agents/rules/`)
*Solves: "How does a zero-memory Goldfish automatically know our team's SQLite transaction and error-formatting standards?"*

#### File 8.2A (Global Repo Constitution): `./GEMINI.md`
- **Local File Path:** `./GEMINI.md` (at repository root)
- **Startup Token Cost:** **100% of turns** (keep `< 50` lines!).
```markdown
# FulfillmentHub — Repository Constitution

## Architecture & Stack
- **Backend (`server/`):** Node.js + TypeScript + Express (port 3001) + SQLite (`server/src/db.ts`).
- **Frontend (`client/`):** React 18 + Vite (port 5173) + Tailwind CSS.
- **Specs (`spec/`):** Durable feature specifications and evaluation rubrics.

## Mandatory Verification Commands
- Fast backend unit tests: `npm run test:fast`
- Full build & test check: `npm test`
```

#### File 8.2B (Scoped Backend Rule): `./.agents/rules/sqlite-safety.md`
- **Local File Path:** `./.agents/rules/sqlite-safety.md` (or `./_agents/rules/sqlite-safety.md`)
- **Startup Token Cost:** Only description loaded; full rule activates dynamically when modifying backend routes.
```markdown
---
trigger: model_decision
description: "Enforce atomic SQLite transactions (db.transaction()) and structured JSON error responses ({ error, code }) whenever creating or modifying backend route handlers or database mutations in server/src/."
---

# SQLite Mutation & Error Safety Rules

1. **Mandatory Atomic Transactions:** Any route handler that performs more than one SQL write (e.g., updating `orders.status` and modifying `inventory.stock_count` or inserting an audit record) MUST wrap all statements inside a single synchronous `db.transaction(() => { ... })()` block.
2. **Structured Error Contract:** Never return raw string errors. Always return HTTP `4xx`/`5xx` with `{ error: string, code: string }`.
```

#### Live Demo Prompt for 8.2 (Fresh Chat Window):
```text
In @server/src/routes/orders.ts, add a POST /api/orders/:id/return route that sets the order status to 'RETURNED' and increments inventory stock_count by the order quantity.
```
*(Show the room: We never mentioned `db.transaction()` or `{ error, code }` in the prompt, yet the Goldfish automatically followed `.agents/rules/sqlite-safety.md`!)*

---

### 8.3) Hooks — Deterministic Shell Gates & Autonomous Self-Repair
*Solves: "The Goldfish claims 'All tests pass!' when it actually broke an existing API contract."*

#### File 8.3A (Hook Config): `./.agents/hooks.json`
- **Local File Path:** `./.agents/hooks.json` (or `./_agents/hooks.json`)
- **Startup Token Cost:** **0 tokens!** Executes outside the LLM when the agent attempts to end its turn (`Stop` event).
```json
{
  "fast-test-gate": {
    "Stop": [
      {
        "type": "command",
        "command": "bash \"$(git rev-parse --show-toplevel)/.agents/hooks/verify.sh\"",
        "timeout": 15
      }
    ]
  }
}
```

#### File 8.3B (Verification Script): `./.agents/hooks/verify.sh`
- **Local File Path:** `./.agents/hooks/verify.sh` (`chmod +x .agents/hooks/verify.sh`)
```bash
#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Run fast Vitest suite (<500ms)
if OUTPUT=$(npm --prefix "$REPO_ROOT/server" run test:fast 2>&1); then
  # Passing gate outputs empty JSON -> allows agent to stop cleanly (0 tokens)
  echo '{}'
else
  # Failing gate outputs {"decision": "continue", "reason": "..."} -> blocks stop & forces auto-repair!
  REASON=$(printf "❌ Deterministic Stop Hook Failed (npm run test:fast):\n%s\nFix the broken test contract before finishing your turn." "$OUTPUT" | tail -n 25 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  echo "{\"decision\": \"continue\", \"reason\": $REASON}"
fi
```

#### Live Demo Prompt for 8.3:
```text
In @server/src/routes/orders.ts, change the HTTP status code of POST /api/orders/bulk-cancel from 200 to 201. Do NOT run any tests yourself—just make that 1-line edit and stop.
```
*(Watch live: The agent makes the edit and tries to stop $\rightarrow$ the `Stop` hook intercepts termination, runs `verify.sh`, catches the `200 vs 201` test failure, injects `"decision": "continue"`, and forces the agent to revert the bug and pass the test suite before it is allowed to stop!)*

---

### 8.4) Skills — Progressive Disclosure for Team Runbooks (`SKILL.md`)
*Solves: "How do we give the agent a domain audit runbook for **~40 tokens** instead of a 5,000-token MCP server or a bloated `GEMINI.md`?"*

#### File 8.4 (Skill Definition): `./.agents/skills/inventory-audit/SKILL.md`
- **Local File Path:** `./.agents/skills/inventory-audit/SKILL.md` (or `./_agents/skills/inventory-audit/SKILL.md`)
- **Startup Token Cost:** **~40 tokens** (only `name` and `description` are loaded until triggered).
```markdown
---
name: inventory-audit
description: >-
  Use this skill when the user asks to audit inventory stock levels,
  investigate order-to-stock discrepancies, or verify allocation consistency
  for cancelled or pending orders in FulfillmentHub.
---

# FulfillmentHub Inventory & Order Discrepancy Audit Runbook

## Step 1: Run the Deterministic Audit Script
Execute the built-in Node SQLite audit command from the repository root:
```bash
npm --prefix server run audit
```

## Step 2: Reconciliation Rules
1. Cross-reference `orders` with `status = 'CANCELLED'` (such as `ORD-1005` for `SKU-5099`) against current `inventory.stock_count`.
2. Flag any SKU where `stock_count < 5` alongside active `PENDING` or `PROCESSING` orders (`ORD-1001`, `ORD-1002`, `ORD-1006`).
3. Output a Markdown reconciliation table with `SKU`, `Product`, `Current Stock`, `Pending Demand`, and `Status (OK / LOW STOCK / DISCREPANCY)`.
```

#### Live Demo Prompt for 8.4:
```text
Warehouse ops reported a possible stock discrepancy on Silk Evening Scarves (SKU-5099) after cancelled order ORD-1005 and pending order ORD-1006. Run an inventory audit for me.
```
*(Highlight: The agent dynamically reads `SKILL.md` on demand, runs the audit script, and formats the exact reconciliation table. Mention `/learn` for turning ad-hoc debugging wins into team skills!)*

---

### 8.5) Subagent Goldfish — Codifying `agent.md` (`@spec-critic` & `@flash-builder`)
*Solves: "In Step 6B we had to type `'As a subagent: You are a skeptical Principal Engineer...'` by hand. How do we codify specialized subagents with pinned models and locked tool allowlists for the whole team?"*

#### File 8.5A (Codified Critic Subagent): `./.agents/agents/spec-critic/agent.md`
- **Local File Path:** `./.agents/agents/spec-critic/agent.md` (or `./.agents/agents/spec-critic.md`)
- **Pinned Model:** `model: pro` | **Tools:** Read-only (`view_file`, `read_file`, `code_search`, `grep_search`)
```markdown
---
name: spec-critic
description: >-
  Skeptical Principal Engineer and Adversarial Spec Critic. Invoke this subagent
  to stress-test a specification in spec/*.md against the database schema and
  existing codebase before any implementation code is written.
model: pro
subagent: true
mainAgent: false
tools:
  - view_file
  - read_file
  - code_search
  - grep_search
---

# Adversarial Spec Critic Persona

You are a skeptical Principal Software Engineer with zero attachment to how a specification was drafted. Your sole job is to catch unhandled edge cases before code is written.

# Audit Protocol

1. Read the target specification file and compare it against `server/src/db.ts` and `server/src/routes/orders.ts`.
2. Check for:
   - Missing transaction boundaries (`db.transaction()`)
   - Unhandled order status transitions (`PENDING`, `PROCESSING`, `SHIPPED`, `CANCELLED`)
   - Idempotency & retry traps (double-restocking inventory)
   - Ambiguous HTTP status codes
3. Return a PASS/FAIL verdict and exact Markdown patches. Never write application code.
```

#### File 8.5B (Codified Builder Goldfish Subagent): `./.agents/agents/flash-builder/agent.md`
- **Local File Path:** `./.agents/agents/flash-builder/agent.md` (or `./.agents/agents/flash-builder.md`)
- **Pinned Model:** `model: flash` | **Tools:** Read/Write + Test Execution (`commandExecutionPolicy: auto`)
```markdown
---
name: flash-builder
description: >-
  Clean-room TDD Implementation Goldfish running on Gemini Flash. Invoke this
  subagent ONLY after a specification in spec/*.md has passed critique to
  generate unit tests, write implementation code, and verify green tests.
model: flash
subagent: true
mainAgent: false
commandExecutionPolicy: auto
tools:
  - view_file
  - read_file
  - replace_file_content
  - edit_file
  - write_to_file
  - write_file
  - run_command
---

# Builder Goldfish Execution Protocol

You are a stateless, high-velocity implementation engineer running on Gemini Flash. You execute approved specifications in `spec/*.md` with 100% test-driven fidelity.

# Mandatory Execution Order

1. Read the approved spec file and its Section 2 Evaluation Rubric.
2. Write or update the Vitest test suite in `server/tests/` covering every rubric item first.
3. Implement the minimal TypeScript code required to satisfy the spec and workspace rules.
4. Run `npm run test:fast` (and pass the `Stop` verification hook) before completing.
```

#### The Grand Finale Prompt for 8.5 (One-Click Orchestration):
```text
Run our codified SDD pipeline on @spec/bulk-order-cancellation.md:
1. Dispatch @spec-critic (running on Pro with read-only tools) to audit the spec.
2. If @spec-critic returns PASS, dispatch @flash-builder (running on Flash) to verify all rubric tests and implementation code pass our verification gate.
```

*(Now switch to **Slide Block 4: Slide 16 (The Anti-Bloat Decision Matrix) & Slide 17 (The Journey to Software Factories)** to wrap up and open Q&A!)*

---

## Appendix A: Master Pre-Workshop Repo Preparation Prompt

Paste this prompt into Antigravity inside your `FulfillmentHub` repository (with `@fulfillmenthub_workshop_cheat_sheet.md` attached) to bring your local repository to 100% demo readiness with both verified timestamped commits (`day2-start` and `day2-harness-upgrade`):

```text
Read @fulfillmenthub_workshop_cheat_sheet.md and audit this repository. Your goal is to bring this codebase to 100% "demo-ready" state with two clean, verified Git branches/tags: `day2-start` and `day2-harness-upgrade`.

Execute this in 3 phases:

### Phase 1: Build & Verify `day2-start` (The "Bare Harness" State for Steps 1–7)
1. **Stack & App Structure:**
   - Ensure we have a working `server/` (Express + TypeScript + `better-sqlite3` on port 3001) and `client/` (React 18 + Vite + Tailwind on port 5173), with root `package.json` scripts for `npm run dev`, `npm test`, and `npm run test:fast` (running Vitest in `<500ms`).
2. **Exact Seeded Data (`server/src/db.ts`):**
   - Ensure the SQLite schema has `orders` (`id`, `customer_name`, `sku`, `product_name`, `quantity`, `status`) and `inventory` (`sku`, `product_name`, `stock_count`).
   - Seed the exact 6 orders required by the walkthrough:
     - `ORD-1001`: Alice Smith — Cashmere Crewneck Sweater (`SKU-1001`), Qty: `1`, Status: `'PENDING'`
     - `ORD-1002`: Bob Jones — Selvedge Denim Jacket (`SKU-2040`), Qty: `2`, Status: `'PROCESSING'`
     - `ORD-1003`: Charlie Brown — Leather Chelsea Boots (`SKU-3010`), Qty: `1`, Status: `'SHIPPED'`
     - `ORD-1004`: Diana Prince — Linen Blazer (`SKU-4022`), Qty: `1`, Status: `'PENDING'`
     - `ORD-1005`: Evan Wright — Silk Evening Scarf (`SKU-5099`), Qty: `2`, Status: `'CANCELLED'`
     - `ORD-1006`: Fiona Gallagher — Silk Evening Scarf (`SKU-5099`), Qty: `1`, Status: `'PENDING'`
   - Seed `inventory` so `SKU-5099` (Silk Evening Scarf) has `stock_count: 3` (below the `< 5` low-stock threshold for the Step 8.4 audit skill).
3. **Deterministic Audit Script (`npm --prefix server run audit`):**
   - Add an `audit` script in `server/package.json` (`server/src/audit.ts`) that queries SQLite and prints current `inventory` stock counts, `PENDING`/`PROCESSING` demand, and `CANCELLED` orders so Step 8.4 works out of the box.
4. **Baseline Endpoints & Files:**
   - Implement `GET /api/orders`, `GET /api/inventory`, and single-order `POST /api/orders/:id/cancel` in `server/src/routes/orders.ts`—but do NOT implement `POST /api/orders/bulk-cancel` yet on `day2-start`.
   - Create `PRD.md` (describing Phase 1 as complete and Phase 2: Bulk Order Cancellation with Inventory Restock as the goal) and the <50-line `./GEMINI.md` from Section 8.2A of the cheat sheet.
   - **CRITICAL:** Ensure `.agents/` and `spec/` do NOT exist on `day2-start` so the Innocent Prompt in Step 2 genuinely fails without rules or hooks firing.
5. **Commit & Tag `day2-start`:**
   - Run `npm run test:fast` to verify existing baseline tests pass, then commit and create branch/tag `day2-start`.

---

### Phase 2: Build & Verify `day2-harness-upgrade` (The "Engineered Harness" State for Step 8)
1. Branch off `day2-start` into `day2-harness-upgrade`.
2. **Create the Approved Spec & Implementation (Result of Steps 5–7):**
   - Create `spec/bulk-order-cancellation.md` containing the Problem Statement & Non-Goals, Evaluation Rubric (including `ORD-1003` `'SHIPPED'` 409 rollback and `ORD-1005` `'CANCELLED'` idempotent 0-delta restock), and Technical Implementation Plan.
   - Implement `POST /api/orders/bulk-cancel` in `server/src/routes/orders.ts` using an atomic `db.transaction()`.
   - Create `server/tests/bulk-cancel.test.ts` covering all rubric cases and asserting HTTP `200` on `POST /api/orders/bulk-cancel` (so changing `200` -> `201` in Step 8.3 is guaranteed to fail `npm run test:fast`).
3. **Create All `.agents/` Harness Upgrades (Exact Paths & Contents from Section 8):**
   - `.agents/rules/sqlite-safety.md` (with `trigger: model_decision`)
   - `.agents/hooks.json` and executable `.agents/hooks/verify.sh` (`chmod +x`) outputting `{}` on pass and `{"decision": "continue", "reason": ...}` on failure
   - `.agents/skills/inventory-audit/SKILL.md`
   - `.agents/agents/spec-critic/agent.md` (`model: pro`, read-only tools)
   - `.agents/agents/flash-builder/agent.md` (`model: flash`, read/write/test tools)
   - `.agents/mcp_config.example.json` (template for the GitHub MCP server + body text for GitHub Issue #2: "PRD: Phase 2 Bulk Order Cancellation & Atomic Inventory Restock")

---

### Phase 3: Dry-Run Red Team Verification
1. Test `.agents/hooks/verify.sh` in two states:
   - Passing state: verify it outputs `{}` in `<1s`.
   - Failing state: temporarily change status `200` to `201` in `server/src/routes/orders.ts`, run `.agents/hooks/verify.sh`, verify it outputs valid JSON `{"decision": "continue", "reason": "..."}`, and revert back to `200`.
2. Test `npm --prefix server run audit` and confirm it outputs the `SKU-5099` (`ORD-1005` / `ORD-1006`) data cleanly.
3. Commit and tag `day2-harness-upgrade`, then checkout `day2-start` so the repository is parked at the exact starting line for the workshop.
```
