# Sentimental.ai

**AI code reviews with memory.**
Tagline: *Every codebase has standards. Every team has habits. Sentimental.ai remembers both.*

Built for the **Vectorize Hindsight Hackathon**.

---

## The problem

Copilot forgets. Claude forgets. ChatGPT forgets.
Every PR starts from zero. Generic AI reviewers will never feel like a senior teammate, because they have no memory of the team.

## The solution

Sentimental.ai gives the reviewer **persistent organizational memory** powered by Hindsight:

- **Team standards** (e.g. *"validation belongs in the service layer"*) with a confidence score
- **Architecture conventions** per repo (repository pattern, retry budget, …)
- **Developer habits** (Rahul forgets audit logs, Sofia mutates DataFrames in place)
- **Review precedents** — every past comment, accepted or rejected

At review time the agent retrieves what's relevant, feeds it into Groq, and produces a review that **cites the memories it used**.

---

## How Hindsight works here

```
        PR submitted
              │
              ▼
   ┌──────────────────────┐
   │  Hindsight search    │  ← standards · architecture
   │  (top-k retrieval)   │     developer habits · precedents
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Prompt assembly     │  evidence-by-id, confidence-aware
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Groq (gpt-oss-120b) │  strict-JSON review with citations
   └──────────┬───────────┘
              │
              ▼
        Reviewer UI
              │  accept / reject
              ▼
   ┌──────────────────────┐
   │  Hindsight upsert    │  outcome stored, standards reinforced
   └──────────┬───────────┘
              │   when ≥ 3 accepts share a pattern
              ▼
   ┌──────────────────────┐
   │  Pattern extraction  │  Groq synthesises a new
   │  agent               │  team standard → Hindsight
   └──────────────────────┘
```

---

## Key surfaces

| Route          | What it shows                                                                |
| -------------- | ---------------------------------------------------------------------------- |
| `/review`      | Submit a PR → watch retrieval → memory-grounded review → accept/reject loop  |
| `/evolution`   | Same PR, three states of memory (0 / 10 / 50). Shows actual retrieved cards. |
| `/teams`       | Same PR, three teams. Memory changes behaviour live.                         |
| `/dashboard`   | Top learned team standards ranked by confidence.                             |
| `/memory`      | Inspector for every memory in the store.                                     |
| `/timeline`    | Real-time learning journey: accepts → patterns → standards.                  |
| `/about`       | Architecture, demo script, env vars.                                         |

## The learning loop

1. Reviewer generates comments grounded in retrieved memories.
2. Engineer hits ✓ Accept or ✗ Reject — outcome is upserted to Hindsight.
3. Matching standards have their confidence reinforced (+) or decayed (−).
4. When ≥ 3 accepted reviews share a code pattern with no existing standard, the **pattern extraction agent** uses Groq to synthesise a new standard and promotes it into Hindsight with a confidence score.
5. All beats appear in `/timeline`.

## Evidence, not vibes

Every comment carries:

```
Recommendation:  Move validation to the service layer.
Evidence:        std_0 (87%, 11 accepted reviews) · arch_1 · rev_24 · rev_38
Confidence:      87%
```

Generic AI reviewers say *"add validation"*. Sentimental.ai cites the standard, the supporting reviews, and the confidence.

---

## Stack

- **Frontend / SSR**: TanStack Start (React 19, Vite 7) on Cloudflare Workers
- **LLM**: Groq (`openai/gpt-oss-120b`) by default; falls back to Lovable AI Gateway (`google/gemini-3-flash-preview`)
- **Memory**: Hindsight REST (`/search`, `/upsert`); falls back to a Hindsight-compatible in-memory store seeded with 100 synthetic PRs across 3 teams
- **State**: TanStack Query + server functions

## Env vars

| Variable                  | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `GROQ_API_KEY`            | Use Groq for review + pattern extraction                 |
| `GROQ_MODEL` *(optional)* | Override the default `openai/gpt-oss-120b`               |
| `HINDSIGHT_API_KEY`       | Use a live Hindsight memory backend                      |
| `HINDSIGHT_BASE_URL`      | Base URL for Hindsight `POST /search`, `POST /upsert`    |
| `LOVABLE_API_KEY`         | Auto-provisioned fallback LLM (Lovable AI Gateway)       |

Without any of the above the app still runs end-to-end against the synthetic store and the Lovable AI fallback.

## Demo (≈ 2 min)

1. **Problem** (15 s) — generic AI reviewers forget.
2. **Evolution / Stage 1** (20 s) — generic review.
3. **Evolution / Stage 2** (20 s) — show actual retrieved memory cards.
4. **Evolution / Stage 3** (20 s) — senior-engineer review with citations.
5. **Team Switch** (20 s) — same diff, three team brains, three different reviews.
6. **Dashboard + Timeline** (15 s) — confidence-ranked standards, live learning beats.
7. **Close** (10 s) — *Sentimental.ai transforms code review from stateless AI into organizational engineering memory.*

---

## Roadmap

- GitHub App integration (webhook → review on real PRs)
- Hindsight semantic embeddings on the diff itself (currently keyword-scored on the local fallback)
- Standards diffing & changelog (when a standard's confidence crosses a threshold)
- Per-developer onboarding mode: a new hire's first PR ships with the entire team brain attached
