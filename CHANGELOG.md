# Changelog

All notable changes to inkai are documented here.

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
