# Changelog

All notable changes to inkai are documented here.

---

## 0.7.0 — 2026-04-18

### Added
- **Chapter notes** — per-chapter author annotations ("sticky notes") that persist alongside chapters.
  - **CLI**: press `E` during reading to open a multiline notes editor for the current chapter.
  - **GUI**: floating sticky-note button in bottom-left of the reading view opens a textarea overlay; notes auto-save.
  - **Chapter list**: a "notes" badge appears next to chapters that have notes.
  - **Rewrite integration**: chapter notes are automatically included in the rewrite prompt alongside the review and author direction.

### Changed
- **Sidebar jobs section** — now shows only the two most recent jobs and is scrollable, keeping the left panel compact.

---

## 0.6.0 — 2026-04-14

### Added
- **Dashboard** (`/`) — new home screen replacing the plain books list; shows active books as a compact row list, archived books in a collapsible section, recent completed chapters, and an inline agent prompt bar.
- **Agent mode in Dashboard** — type a plain-English request directly from the dashboard and the agent plans + executes the steps without leaving the page; the modal now lives in `Layout` so navigation steps no longer close it mid-run.
- **Lore file search in Lore Editor** — a search box above the file list filters by filename and file content; files with no match are hidden; "No matches" message shown when the filter is empty.
- **Lore file search in Reading View sidebar** — the same keyword search is available in the lore panel on the right-hand side of the reading screen; hidden when a file is open, shows "No matches" when nothing passes the filter.
- **Git tab in Book page** — view working-tree changes and recent commit history, and commit directly from the browser with a custom message.
- **Lore Review button restored** — the "Lore Review" AI tool is back in the Lore tab alongside Enhance Lore, Story Arc, Timeline, and Characters.
- **Chapter notes** — per-chapter author annotations ("sticky notes") that persist alongside chapters.
  - **CLI**: press `E` during reading to open a multiline notes editor for the current chapter.
  - **GUI**: floating sticky-note button in bottom-left of the reading view opens a textarea overlay; notes auto-save.
  - **Chapter list**: a "notes" badge appears next to chapters that have notes.
  - **Rewrite integration**: chapter notes are automatically included in the rewrite prompt alongside the review and author direction.

### Changed
- **Lore tab layout** — AI Enhancing Tools are now displayed as a card grid with a short description under each button; lore files are listed one per row below the tools panel.

### Fixed
- **Agent modal closed immediately on navigation** — `MiniAgentModal` was rendered inside `BooksPage`; any `navigate` step the agent executed would unmount the page and close the modal. Lifted into `Layout` via `AgentContext` so it persists across all route changes.

---

## 0.5.0 — 2026-04-12

---

## [0.4.0] — 2026-04-11

### Added
- **Web GUI** — full browser-based interface at `http://localhost:4242`; every CLI action available as a click
- **AI Enhancing Tools section** in Lore tab — Enhance Lore, Story Arc, Timeline, Characters grouped under a dedicated panel
- **EPUB export** — export all chapters to `.epub` for e-readers and Kindle
- **Jobs page** — monitor background chapter-writing jobs with live log streaming
- **Settings page** — configure LLM providers, model tiers, git auto-commit, and language from the browser
- **Reading view** — parchment-style full-screen reader with lore term highlighting and collapsible lore sidebar
- **`HOW TO HELP.md`** — contribution guide covering prompt translation, writing quality, and new book-type support
- **GitHub ruleset** — branch protection for `main` requiring code-owner review via PR

### Fixed
- `PATCH /api/books/:id` handler no longer wipes book title when only `status` is sent — all fields now written conditionally
- `book.authors` crash on books created before the `authors` field was added — guarded with `?? []`
- Logo in GUI sidebar now navigates to the books dashboard

### Changed
- `npm run build` now also builds the web frontend (`cd web && npm install && npm run build`)
- Status picker in book detail page is more visually prominent (bordered button with chevron)

---

## [0.3.0]

### Added
- **Background writing** — detached Node.js worker handles chapter write → QA → save; survives exit
- **`/jobs`** CLI command — show, monitor, and clear background writing jobs
- **`/read-review [n]`** — read a chapter review in the CLI reader
- **`/summary`** — show the rolling chapter summary document
- **`/lore-review`** — full lore review: find contradictions, gaps, and inconsistencies, then fix them
- **`/story-arc`** — generate or regenerate the book-level story arc
- **`/timeline`** — generate a chronology from lore and chapters, flags impossible sequencing
- **`/characters`** — generate or edit character sheets with arc state and inter-character tensions
- **`/list-chapters`** — display all chapters with word counts and review status
- **`/enhance-lore`** — AI-guided lore enhancement via targeted questions
- **`/reset-prompts`** — regenerate all prompt files in a chosen language
- **ODT export** — export chapters to `.odt` for LibreOffice / Google Docs
- **CLI book reader** — comfortable terminal reader with keyboard navigation (↑↓/jk, N/P, Q)
- **Multi-language prompts** — English and Polish built-in; user can add more

### Changed
- Lore editing refactored to support external editor integration
- Session management added to CLI

---

## [0.2.0]

### Added
- **2-round adaptive questioning** on book creation — Round 1 foundation questions, Round 2 deeper follow-ups based on answers
- **Smart lore selection** — cheap LLM pre-flight picks only relevant lore files per task, saving tokens
- **6-step chapter pipeline** — suggestion → plan → context prep → write → QA → save & summarise
- **Chapter review** — literary feedback with consistency check, prose quality, and grade
- **Chapter rewrite** — applies review feedback automatically with the writer LLM
- **`/edit-basic-info`** — edit title, genre, authors, and other book metadata
- **`/change-status`** — change book status (in-progress / completed / review / on-hold / limbo)
- **Writing instructions** — set on first chapter, persisted for all future chapters
- **Git auto-commit** — every write operation committed to the book's local git repo (optional)
- **Archive system** — soft-delete projects with 30-day grace period

---

## [0.1.0]

### Added
- Initial release
- CLI with interactive terminal UI and tab completion
- Multi-LLM support: OpenAI, Anthropic (Claude), Google Gemini
- 3-tier LLM system: small / medium / writer
- Book project management with local SQLite database
- AI-generated lore files from book description
- Basic chapter writing pipeline
- Customisable prompt templates (`~/.inkai/prompts/`)
- `~/.inkai/config.json` configuration with guided first-run setup
