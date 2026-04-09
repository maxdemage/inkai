# inkai

**AI-Powered Book Writing Agent** — a CLI tool that guides you through creating, writing, and refining books using a community of AI agents.

## Manifesto

Inkai is a tool to help you pour your ideas onto documents - nothing more.

See more in MANIFESTO.md

## What inkai is not

inkai is not a one prompt wonder magical wand - it will not create everything for you, it is to help you, guide you, and write what you want. Nothing more.

> **New here?** See [GUIDE.md](GUIDE.md) for a detailed step-by-step walkthrough.

## Quick Start

```bash
# Install dependencies and build
npm install && npm run build

# Run directly
node dist/index.js

# Or link globally
npm link
inkai

# Run tests
npm test
```

## Features

- **Multi-LLM Support** — OpenAI, Anthropic (Claude), and Google Gemini
- **3-Tier LLM System** — small (fast/cheap), medium (balanced), writer (best quality)
- **Interactive CLI** — fancy terminal UI with tab completion
- **Book Projects** — create and manage multiple book projects
- **2-Round Adaptive Questioning** — AI asks foundational questions first, then deeper follow-ups based on your answers
- **AI-Generated Lore** — world-building, characters, timelines, style guides
- **Smart Lore Selection** — per-file summaries with content hashing; a cheap LLM pre-flight picks only the lore files relevant to each task, saving tokens on large worlds
- **6-Step Chapter Pipeline** — plan → write → QA with separate AI agents
- **Chapter Review** — detailed literary review with improvement suggestions
- **Chapter Rewriting** — apply review feedback automatically
- **Customisable Prompts** — edit `~/.inkai/prompts/*.md` to control how AI writes
- **Background Writing** — optionally run chapter writing in a detached process that survives exit
- **CLI Book Reader** — read chapters in a comfortable terminal reader with keyboard navigation
- **ODT & EPUB Export** — export all chapters to `.odt` (LibreOffice/Google Docs) or `.epub` (e-readers/Kindle)
- **Multi-Language Prompts** — choose your book language on first run (English, Polish); prompts are served in the selected language
- **Archive System** — soft-delete projects with 30-day grace period
- **Git Integration** — auto-commits if git is available
- **Local Database** — tracks all projects with status management

## Commands

### Global Commands
| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `/h`, `/?` | Show available commands |
| `/config` | `/settings`, `/setup` | Configure LLM providers and settings |
| `/create-book` | `/new`, `/create` | Create a new book project |
| `/list` | `/ls` | List all book projects |
| `/select [name]` | `/open`, `/use` | Select a book project to work on |
| `/archive` | — | Archive, restore, or purge book projects |
| `/jobs` | `/bg`, `/background` | Show background writing jobs (`/jobs clear` to remove finished) |
| `/reset-prompts` | `/prompts-reset` | Reset prompt files to defaults (asks language) |
| `/deselect` | `/close`, `/back` | Deselect current book project |
| `/quit` | `/exit`, `/q` | Exit inkai |

### Book Commands (requires `/select`)
| Command | Aliases | Description |
|---------|---------|-------------|
| `/create-chapter` | `/write`, `/chapter` | Write the next chapter (6-step pipeline) |
| `/review-chapter [n]` | `/review` | Get AI review of a chapter |
| `/read-review [n]` | `/view-review` | Read a chapter review in the CLI reader |
| `/rewrite-chapter [n]` | `/rewrite` | Rewrite a chapter based on review feedback |
| `/edit-lore` | `/lore` | Review and modify book lore |
| `/enhance-lore` | `/enhance` | AI-guided lore enhancement — answer targeted questions to deepen your world |
| `/status` | `/info`, `/stat` | Show current book project status |
| `/summary` | `/chapters-summary` | Show the chapter summary document |
| `/read [n]` | `/reader`, `/view` | Read chapters in a CLI reader (↑↓/jk scroll, N/P chapters, Q quit) |
| `/export [format]` | `/odt`, `/epub` | Export all chapters to `.odt` or `.epub` |

## Configuration

Config is stored in `~/.inkai/config.json`. On first run, you'll be guided through setup — including your book language (English or Polish) and LLM provider.

### LLM Tiers

| Tier | Purpose | Recommended |
|------|---------|-------------|
| **small** | Quick questions, summaries, suggestions | GPT-4o-mini, Gemini Flash |
| **medium** | Lore analysis, chapter planning | Claude Sonnet, GPT-4o |
| **writer** | Chapter writing, reviews, QA, rewrites | Claude Opus, Gemini 2.5 Pro |

### Customisable Prompts

On first run, inkai writes default prompt templates to `~/.inkai/prompts/` in your chosen language. You can edit any `.md` file to change how the AI behaves — templates use `{{variable}}` substitution and `{{#if var}}...{{/if}}` conditionals. If you delete a file, the built-in default is used as fallback. Use `/reset-prompts` to regenerate all files in a different language.

```
~/.inkai/prompts/
├── lore-questions-round1.md    # Round 1 book creation questions
├── lore-questions-round2.md    # Round 2 follow-up questions
├── lore-generation.md          # Lore file generation
├── chapter-suggestion.md       # Chapter direction suggestion
├── chapter-plan.md             # Chapter planning
├── chapter-writing-from-plan.md # Chapter writing from plan
├── chapter-qa.md               # QA review of written chapters
├── chapter-review.md           # Literary chapter review
├── chapter-rewrite.md          # Chapter rewriting from feedback
├── summary-update.md           # Rolling summary updates
├── lore-summary.md             # Lore overview for editing
├── lore-edit.md                # Lore modification
├── book-summary.md             # Book status summary
├── chapter-writing.md          # Legacy direct chapter writing
├── lore-file-summary.md        # Summarise individual lore files for smart selection
└── lore-relevance.md           # Select relevant lore files for a task
```

## Book Project Structure

```
~/.inkai/books/<project-name>/
├── writing-instructions.md      # Your writing process preferences (created on first chapter)
├── lore/
│   ├── basic-lore.md           # Core premise, themes, tone
│   ├── extended-lore.md        # Deep world-building
│   ├── summary-of-chapters.md  # Rolling chapter summaries
│   ├── style-of-writing.md     # Writing style guide
│   ├── characters.md           # (optional) Character profiles
│   ├── timeline.md             # (optional) Event timeline
│   ├── magic-system.md         # (optional) Fantasy/sci-fi systems
│   ├── technology-tree.md      # (optional) Tech details
│   ├── notes.md                # (optional) Misc notes
│   ├── links.md                # (optional) Reference links
│   └── .summaries/             # Auto-generated lore summaries (hash-validated)
│       ├── basic-lore.md
│       ├── characters.md
│       └── ...
├── chapters/
│   ├── chapter-01.md
│   ├── review_chapter_01.md
│   ├── chapter-02.md
│   └── ...
└── chapters-plan/
    ├── plan-chapter-01.md       # Detailed plan for each chapter
    ├── plan-chapter-02.md
    └── ...
```

## Book Workflow

### 1. Create a book — `/create-book`

Answer basic metadata questions (title, genre, type), then go through two adaptive AI-driven rounds:

- **Round 1 — Foundation:** Story premise, characters, world, central conflict
- **Round 2 — Details:** Based on your Round 1 answers, the AI asks deeper questions about genre identity, tone, themes, and audience

The AI then generates a full set of lore files from all your answers.

### 2. Select a project — `/select my-book`

Opens a project with an AI-generated status summary.

### 3. Write a chapter — `/create-chapter`

A 6-step agentic pipeline:

| Step | What | LLM |
|------|------|-----|
| 1 | **Guidelines** — AI suggests a direction, or write your own | small |
| 2 | **Plan** — detailed scene-by-scene chapter blueprint | medium |
| 3 | **Prepare context** — smart lore selection picks relevant files for the writer | small |
| 4 | **Write** — full chapter from plan (fresh agent, no prior conversation) | writer |
| 5 | **QA** — separate agent checks against lore/plan, auto-fixes issues | writer |
| 6 | **Save & summarise** — write chapter + update rolling summary | small |

On the very first chapter, you'll also set up **writing instructions** (preferred chapter length, dialogue style, pacing, perspective, etc.) that persist for all future chapters.

#### Background writing

Enable via `/config` → "Toggle background writing". When enabled, after confirming the chapter plan you'll be offered to run the writing in the background. A detached Node.js worker handles steps 4-6 (write → QA → save) independently — you can close inkai and come back later. Use `/jobs` to check progress. On startup, inkai notifies you about completed, running, or failed jobs.

### 4. Review — `/review-chapter 1`

Detailed literary feedback: consistency, prose quality, structure, line-by-line suggestions, overall grade.

### 5. Rewrite — `/rewrite-chapter 1`

Applies review feedback automatically with the writer LLM.

### 6. Iterate

Use `/edit-lore` to refine the world, then continue writing chapters.

## Testing

Inkai uses [Vitest](https://vitest.dev/) for testing.

```bash
npm test            # single run
npm run test:watch  # watch mode
```

Test suites cover:
- **LLM JSON parsing** — all extraction strategies (direct, code fences, brace detection) and error handling
- **Prompt templates** — variable interpolation, conditionals, and default template integrity
- **Book manager** — path helpers, lore/chapter/plan/review file I/O round-trips
- **Chapter pipeline** — full 3-step orchestration (write → QA → save) with mocked LLM calls, callback firing, error recovery, and git integration

## License

MIT
