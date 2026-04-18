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
- Hover any row to reveal four action buttons: **Read**, **Review**, **Rewrite**, and a small **pencil** icon to open the chapter in the manual editor.
- A **Write Chapter N** button at the top-right opens the chapter creation flow.
- When a background writing job is **active for this book**, an amber status strip appears above the chapter list showing the job status with a "View →" link to the Jobs page. It auto-polls every 3 seconds.
- After accepting a chapter plan, a **toast notification** appears in the bottom-right ("Chapter N queued / Writing in the background…") and auto-dismisses after 6 seconds.
- Collapsible **Book Summary** section at the top renders `summary-of-chapters.md`.

**Chapter actions (hover a row):**
- **Read** → navigates to the reading view.
- **Review** → streams an AI literary review. Saves `review_chapter_N.md`.
- **Rewrite** → applies the review to produce a rewritten chapter.
- **pencil icon** → opens the chapter in the full-panel **Manual Editor** (see below).

#### Lore tab

Two sections:

**AI Enhancing Tools** — a grid of action cards, each with a description:

| Card | What it generates |
|------|-------------------|
| **Enhance Lore** | AI identifies weak spots and asks targeted questions. Apply answers to deepen existing lore files. |
| **Story Arc** | Generates / regenerates `story-arc.md` — full narrative arc with act structure, turning points, and thematic threads. |
| **Timeline** | Generates / regenerates `timeline.md` — chronology of all events with sequencing-conflict flags. |
| **Characters** | Generates / regenerates `characters.md` — detailed character sheets with arc state and inter-character tensions. |
| **Lore Review** | Full lore QA: the writer LLM finds contradictions and gaps across all lore files and applies fixes automatically. |

**Lore Files** — a scrollable list of every lore file. Click any row to open the **Lore Editor**.

- **Lore Editor**: full-height text area, dirty-state tracking, Save / Discard buttons, confirmation on unsaved-exit.
- A **right sidebar** lists all lore files; clicking one switches to it (with unsaved-change confirmation).
- A **search box** at the top of the file list filters by filename and by file content — useful for finding which lore file mentions a specific character or place. Files with no match are hidden; a "No matches" message is shown when the filter is empty.

#### Manual Chapter Editor

Opens as a full-panel takeover when you click the pencil icon on a chapter row or the **Edit** button in the reading view.

- Full-height monospace textarea pre-loaded with the chapter's current content.
- **Dirty-state tracking** — "Unsaved changes" label appears as soon as you type.
- **Save** button (disabled until dirty); shows a spinner while saving and a "Saved!" flash on success.
- Confirmation dialog on close with unsaved changes.
- Closes and returns to the book detail page.

#### Summary tab

Renders `summary-of-chapters.md` as formatted markdown.

---

### Export

The **Export** button appears in the book header whenever the book has at least one chapter. Clicking it opens a small dropdown:

| Format | Description |
|--------|-------------|
| **EPUB** | EPUB 3 file with title page, table of contents, and per-chapter CSS — for e-readers, Kindle, Apple Books |
| **ODT** | OpenDocument Text file for LibreOffice, Google Docs, or Microsoft Word |

The file is generated server-side and downloaded by the browser immediately.

---

### Create Chapter Flow

Opens as a modal from the Chapters tab.

1. AI suggests a direction for the next chapter (fetch from `/api/books/:id/chapters/suggest`). You can use the suggestion or write your own guidelines.
2. If it's the first chapter, a **Writing Instructions** section appears — set your preferred style, pacing, perspective, and chapter length. These are saved and reused for all future chapters.
3. Click **Write Chapter** — the server builds a detailed plan synchronously, then spawns a background worker. You get a job ID and the plan text immediately.
4. The modal closes and a **toast notification** pops up in the bottom-right confirming the job is queued. An active-job strip also appears in the Chapters tab while the job runs.

---

### Reading View (`/books/:id/read/:n`)

A full-screen, distraction-free reading experience.

- **Themeable background** — choose from App Theme, Paper, White, Dusk, Dark, Sepia, or Forest (see Typography Settings below).
- **Reading progress bar** — a thin bar just below the top chrome fills left-to-right as you scroll through the chapter.
- **Chapter / Review tabs** — if the chapter has an AI review, a tab switcher appears in the top bar. The review is fetched on demand when you first switch to it.
- **Prev / Next** navigation with chapter N-of-total display.
- **Edit chapter button** (pencil icon, top-right) — visible on the Chapter tab only. Navigates back to the book page and immediately opens the chapter in the Manual Editor.
- **Lore sidebar** (collapsible, `PanelRight` icon) — lists every lore file; files containing terms found in the chapter are highlighted with a violet dot. Click a file to read it in the sidebar. A **search box** at the top of the file list filters by filename and file content (the search box is hidden when a file is open).
- **Lore term highlighting** — H2/H3 headers and `**bold**` terms from lore files are underlined in the text. Click any to open a floating popover with the relevant lore content.
- **Chapter notes** — a floating sticky-note button sits in the bottom-left corner. Click to open a small overlay with a textarea for writing author annotations. Notes are saved per chapter and automatically fed into the rewrite prompt. The button is highlighted when notes exist for the current chapter.

#### Typography Settings (`Type` icon in the top bar)

A panel with four settings, all persisted to `localStorage`:

| Setting | Options |
|---------|---------|
| **Font size** | S (15 px) · M (18 px) · L (21 px) · XL (25 px) |
| **Typeface** | Serif (Georgia) · Sans (system-ui) · Mono (Courier) · Humanist (Palatino) |
| **Background** | App Theme · Paper · White · Dusk · Dark · Sepia · Forest |
| **Text color** | Theme · Ink · Charcoal · Slate · Cream · White · Warm |

The top-bar chrome (buttons, borders, navigation) adapts its contrast automatically to the chosen background theme. When the app is using a dark workspace theme, the reader now defaults to a dark reading surface too.

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

### Agent

A built-in natural language assistant, available on every page via the **Agent** button in the sidebar navigation.

Click **Agent** to open the panel, then type what you want to do in plain English. The agent sends your request to the server, which uses a small LLM to produce a step-by-step plan and then executes it:

| Step type | What happens |
|-----------|-------------|
| **Say** | The agent displays an informational message |
| **Ask** | The agent asks you a question and waits for your typed answer |
| **Navigate** | Automatically navigates to the relevant book page |
| **SSE action** | Runs an AI operation inline with a live progress feed |

**Example requests:**
- *"Update the characters with a new villain"*
- *"Generate the story arc for my sci-fi novel"*
- *"Run a lore review on my current project"*
- *"Generate the timeline"*

If the intent is ambiguous the agent will ask for clarification. After a plan finishes you can type another request in the same panel — the previous result is cleared and a fresh plan begins.

---

### Settings (`/settings`)

Configure everything without touching config files.

#### Appearance
- Compact, collapsible theme picker at the top of Settings
- Shows the currently selected theme in a summary row by default
- Expands into a full gallery of curated dark and light workspace themes
- Theme changes apply instantly and are persisted in the browser

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
