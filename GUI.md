# inkai Web UI — GUI Guide

inkai ships with a full browser-based GUI that mirrors every CLI command as a click. No terminal knowledge required.

---

## Starting the GUI

```bash
# Build the CLI first (one-time)
npm install && npm run build

# Start the server
inkai serve
```

Open **http://localhost:4242**.

To use a different port:

```bash
inkai serve --port 8080
```

### Development mode (live reload)

```bash
# Terminal 1 — API backend
inkai serve

# Terminal 2 — Vite dev server (hot reload)
cd web && npm install && npm run dev
```

Open **http://localhost:5173**. The dev server proxies all `/api` requests to `:4242`.

To rebuild the frontend for production:

```bash
cd web && npm run build
```

---

## Pages

### Books Dashboard (`/`)

Your home screen. Shows every book project as a card.

| Element | What it does |
|---------|-------------|
| **Book card** | Displays title, genre, type, author, chapter count, last-updated date, and status badge |
| **Open Book button** | Navigate into the book's detail page |
| **⋯ menu** | Archive or unarchive a project |
| **+ New Book** | Opens the Create Book wizard (sidebar button or empty-state CTA) |

Status badges:
- `new` — just created, lore not yet generated
- `initial-processing` — lore generation in progress
- `work-in-progress` — active project _(green dot, pulsing)_
- `completed` — all chapters written
- `archived` — hidden from the default list

---

### Create Book Wizard

A 4-step guided flow that launches when you click **+ New Book**.

| Step | What happens |
|------|-------------|
| **1 — Basic info** | Enter project name, title, type, genre, subgenre, author(s), purpose, and summary |
| **2 — Round 1 questions** | AI generates 4-5 foundational questions. Answer them in the form. |
| **3 — Round 2 questions** | AI reads your Round 1 answers and asks deeper follow-up questions. |
| **4 — Creating** | Streams live progress as the AI generates all lore files. Redirects to the book on completion. |

---

### Book Detail (`/books/:id`)

Three tabs covering everything about a single book.

#### Chapters tab

- Lists every chapter with number, word count, and a `reviewed` badge if a review exists.
- Hover any row to reveal three action buttons: **Read**, **Review**, **Rewrite**.
- A **Write Chapter N** button at the bottom opens the chapter creation flow.
- Collapsible **Book Summary** section at the top renders `summary-of-chapters.md`.

**Chapter actions:**
- **Read** → navigates to the reading view (see below).
- **Review** → streams an AI literary review (critique, suggestions, grade) using the writer model. Saves `review_chapter_N.md`.
- **Rewrite** → applies the review to produce a fully rewritten chapter. If no review exists yet, one is generated first.

#### Lore tab

- Grid of lore file cards — click any card to open the full inline **Lore Editor**.
- **Lore Editor**: full-height text area, dirty-state tracking, Save / Discard buttons, confirmation on unsaved-exit.
- Action buttons across the top row:

| Button | What it generates |
|--------|-------------------|
| **Enhance Lore** | AI identifies weak spots and asks targeted questions. Apply answers to deepen existing lore files. |
| **Story Arc** | Generates / regenerates `story-arc.md` — a full narrative arc with act structure, turning points, and thematic threads. |
| **Timeline** | Generates / regenerates `timeline.md` — a chronology of events from all lore and chapter summaries, with sequencing-conflict flags. |
| **Characters** | Generates / regenerates `characters.md` — detailed character sheets with current arc state and inter-character tensions. |

Expandable panels below the grid let you preview the generated `story-arc.md`, `style-of-writing.md`, `timeline.md`, and `characters.md` without leaving the page.

#### Summary tab

Renders `summary-of-chapters.md` as formatted markdown.

---

### Create Chapter Flow

Opens as a modal from the Chapters tab.

1. AI suggests a direction for the next chapter (fetch from `/api/books/:id/chapters/suggest`). You can use the suggestion or write your own guidelines.
2. If it's the first chapter, a **Writing Instructions** section appears — set your preferred style, pacing, perspective, and chapter length. These are saved and reused for all future chapters.
3. Click **Write Chapter** — the server builds a detailed plan synchronously, then spawns a background worker. You get a job ID and the plan text immediately.
4. The modal confirms the job was started and links to the **Jobs** page.

---

### Reading View (`/books/:id/read/:n`)

A full-screen, distraction-free reading experience.

- **Parchment background** with Georgia serif font for comfortable long-form reading.
- **Chapter / Review tabs** — toggle between reading the chapter and reading its AI review.
- **Prev / Next** navigation buttons with chapter N-of-total display.
- **Lore sidebar** (collapsible) — lists every lore file. Files that contain terms found in the current chapter are highlighted with a violet dot. Click a file to read its full content in the sidebar.
- **Lore term highlighting** — key terms extracted from H2/H3 headers and `**bold**` text in lore files are underlined with a dashed violet line in the chapter text. Click any highlighted term to open a floating popover showing the relevant lore content.

---

### Jobs (`/jobs`)

Monitor all background chapter-writing jobs.

| Status dot | Meaning |
|-----------|---------|
| Grey | Pending — worker not yet started |
| Amber (pulsing) | Running — worker is active |
| Green | Done — chapter written successfully |
| Red | Failed — check the log |

- Click a row to expand it and stream the **live log output** from the worker process.
- **Read** button on done jobs navigates directly to the finished chapter.
- **Delete** removes the job record (does not delete the chapter).
- The page auto-refreshes every 3 seconds while active jobs exist.

---

### Settings (`/settings`)

Configure everything without touching config files.

#### LLM Providers
Enter API keys for OpenAI, Anthropic, and/or Google Gemini. Keys are masked on load — leave the field blank to keep the existing key; enter a new value to replace it.

#### Model Tiers
Assign a provider and model name to each of the three tiers:

| Tier | Used for |
|------|---------|
| **Small (Fast)** | Suggestions, questions, lore summaries |
| **Medium** | Planning, lore operations, enhance-lore |
| **Writer (Best)** | Chapter writing, reviews, rewrites, story arc, timeline, characters |

A dropdown suggests common model names for whichever provider is selected; you can also type any model name directly.

#### General
- **Git auto-commit** toggle — when enabled, every write operation (lore, chapter, review) is committed to the book's local git repo.
- **Language** selector — sets the language for AI-generated content and prompt templates.

Click **Save** in the top-right corner to apply all changes at once.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js / TypeScript, Express 5 |
| Frontend | React 18, Vite 6, Tailwind CSS 3 |
| State | TanStack React Query 5 |
| Routing | React Router 6 |
| Streaming | Server-Sent Events (SSE) for all LLM operations |
| Icons | Lucide React |
| Markdown | react-markdown |
