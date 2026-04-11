# inkai — Step-by-Step Guide

This guide walks you through the full workflow of using inkai, from first setup to exporting a finished book.

---

## Table of Contents

1. [Installation](#1-installation)
2. [First-Time Setup](#2-first-time-setup)
3. [Creating a Book](#3-creating-a-book)
4. [Selecting a Project](#4-selecting-a-project)
5. [Understanding Your Lore](#5-understanding-your-lore)
6. [Editing & Enhancing Lore](#6-editing--enhancing-lore)
7. [Writing Your First Chapter](#7-writing-your-first-chapter)
8. [The 6-Step Chapter Pipeline](#8-the-6-step-chapter-pipeline)
9. [Background Writing](#9-background-writing)
10. [Reading Chapters](#10-reading-chapters)
11. [Reviewing a Chapter](#11-reviewing-a-chapter)
12. [Rewriting a Chapter](#12-rewriting-a-chapter)
13. [Checking Progress](#13-checking-progress)
14. [Exporting Your Book](#14-exporting-your-book)
15. [Customising Prompts](#15-customising-prompts)
16. [Managing Projects](#16-managing-projects)
17. [Tips & Best Practices](#17-tips--best-practices)

---

## 1. Installation

```bash
# Clone the repository and install dependencies
npm install

# Build TypeScript
npm run build

# Run directly
node dist/index.js

# Or link globally for convenience
npm link
inkai
```

You need **Node.js 22+**.

---

## 2. First-Time Setup

When you launch inkai for the first time, it will guide you through configuration:

1. **Choose an LLM provider** — OpenAI, Anthropic (Claude), or Google Gemini.
2. **Enter your API key** — the key is stored locally in `~/.inkai/config.json`.
3. **Default tiers are set automatically** — inkai uses a 3-tier LLM system:

| Tier | Purpose | Used for |
|------|---------|----------|
| **small** | Fast, cheap | Suggestions, summaries, lore selection |
| **medium** | Balanced | Chapter planning, lore analysis |
| **writer** | Best quality | Chapter writing, QA, reviews, rewrites |

You can reconfigure at any time with `/config` (or `/settings`, `/setup`):
- Change API keys
- Switch providers or models per tier
- Change the books directory
- Toggle background writing on/off
- View your current configuration

---

## 3. Creating a Book

Run `/create-book` (or `/new`, `/create`).

### Step 1 — Basic metadata

You'll be asked for:
- **Project name** — permanent, lowercase with hyphens (e.g. `my-fantasy-epic`)
- **Title** — the display title of your book
- **Type** — novel, novella, short story, poetry collection, etc.
- **Genre** — pick from a list or type your own
- **Sub-genre** — e.g. "dark fantasy", "cyberpunk", "cozy mystery"
- **Author(s)** — comma-separated
- **Purpose** — entertainment, education, personal memoir, etc.

### Step 2 — Round 1: Foundation questions

The AI generates ~8 foundational questions about your story — premise, characters, world, central conflict. Answer each question in as much or as little detail as you like.

Use multiline input for longer responses.

### Step 3 — Round 2: Deep-dive questions

Based on your Round 1 answers, the AI generates follow-up questions that dig deeper — genre identity, tone, themes, audience, character motivations, world rules.

### Step 4 — Lore generation

The AI takes all your answers and generates a set of lore files:
- `basic-lore.md` — core premise, themes, tone
- `extended-lore.md` — deep world-building
- `summary-of-chapters.md` — rolling chapter summary (starts empty)
- `style-of-writing.md` — writing style guide
- Plus optional files like `characters.md`, `timeline.md`, `magic-system.md`, `technology-tree.md`, `notes.md`, `links.md`

These files live in `~/.inkai/books/<project-name>/lore/`.

---

## 4. Selecting a Project

Before you can write, review, or export, you need to select a project:

```
/select my-fantasy-epic
```

Or just `/select` to pick from a list. Aliases: `/open`, `/use`.

When you select a project, inkai shows an AI-generated status summary — what's been written, what's next, and the current state of your world.

To deselect: `/deselect` (or `/close`, `/back`).

---

## 5. Understanding Your Lore

Lore is the backbone of your book. Every AI call that writes, reviews, or rewrites a chapter uses your lore as context.

### Smart lore selection

inkai doesn't naïvely dump all lore into every prompt. Instead:

1. **Summaries** — each lore file gets a short AI-generated summary, stored in `lore/.summaries/` with a content hash. Summaries are regenerated only when the source file changes.
2. **Relevance selection** — before each task, a cheap LLM call reads the summaries and picks only the lore files relevant to that task.
3. **Full lore for reviews** — review and rewrite commands always use the full lore context so the AI can catch consistency issues across the entire world.

This saves tokens and keeps the writer focused on what matters.

---

## 6. Editing & Enhancing Lore

### `/edit-lore` (alias: `/lore`)

Opens a menu where you can:
- Pick any lore file to edit in your system `$EDITOR` (defaults to `nano`)
- See token estimates per file
- Changes are saved and git-committed automatically

### `/enhance-lore` (alias: `/enhance`)

AI-guided lore expansion:
1. The AI analyses your current lore and generates targeted questions about gaps — underdeveloped characters, missing world details, vague timelines.
2. You answer the questions you care about (skip any with Enter).
3. The AI rewrites the relevant lore files, weaving in your new answers.

This is the easiest way to deepen your world without manually editing files.

### `/lore-review` (alias: `/review-lore`)

Full automated lore audit:
1. The **writer LLM** reads all your lore files and produces a detailed review — contradictions, timeline gaps, missing details, inconsistencies.
2. If issues are found, the **medium LLM** applies fixes to each affected file automatically.

Use this after major lore changes or every few chapters to keep your world consistent.

### `/story-arc` (alias: `/arc`)

Generate or regenerate a book-level story arc (`lore/story-arc.md`):
- Synthesises all lore, chapter summaries, and extracted notes
- Creates a structured arc with inciting incident, rising action, climax, resolution, and thematic threads
- If a story arc already exists, shows it and asks before regenerating

### `/characters` (alias: `/chars`)

Character sheet management:
- **Generate**: Creates `lore/characters.md` with detailed character sheets — traits, arcs, tensions, relationships — from your lore and chapters
- **Show**: Displays existing character sheets
- **Edit**: LLM-powered editing — describe what to change and the AI rewrites the sheet

### `/timeline`

Generate a chronological timeline (`lore/timeline.md`):
- Combines backstory, lore, chapter summaries, and extracted notes into a structured chronology
- Flags impossible sequencing or contradictions with ⚠️ markers
- Covers backstory events, story timeline, and projected future events

### `/rename`

Quick rename of the current book's title. Updates the database record.

### `/edit-basic-info` (aliases: `/edit-info`, `/basic-info`)

Walk through all basic book fields and update any you like:
- Title, type, genre, sub-genre
- Author list and purpose statement
- Summary (multiline)

---

## 7. Writing Your First Chapter

Run `/create-chapter` (or `/write`, `/chapter`).

On your **very first chapter**, inkai will ask if you want to set up **writing instructions** — preferences that guide the AI for all future chapters:
- Preferred chapter length
- Dialogue style (dense, sparse, mixed)
- Pacing preferences
- Perspective rules (first person, third limited, omniscient)
- Any other guidance ("no cliffhangers", "include internal monologue", etc.)

You can skip this and use defaults, or update it later via `/config`.

These instructions are saved in `writing-instructions.md` inside your project.

---

## 8. The 6-Step Chapter Pipeline

Every chapter goes through a 6-step pipeline:

### Step 1 — Guidelines (you + small LLM)

Choose how to start the chapter:
- **See AI suggestion first** — the AI proposes a direction based on your lore and story so far. You can accept, modify, or reject it.
- **Write your own** — type your own guidelines from scratch.

### Step 2 — Plan (medium LLM)

The AI creates a detailed scene-by-scene chapter blueprint. You'll see the plan and can approve, edit, or regenerate it.

### Step 3 — Context preparation (small LLM)

Smart lore selection picks only the relevant lore files for the writer. This happens automatically.

### Step 4 — Write (writer LLM)

A fresh AI agent (no conversation history — just your lore, plan, and previous chapter) writes the full chapter. This is the most expensive step and uses your best model.

### Step 5 — QA (writer LLM)

A separate AI agent reviews the written chapter against your lore and plan, checking for consistency errors, plot holes, and quality issues. If it finds problems, it automatically fixes them.

### Step 6 — Save & summarise (small LLM)

The final chapter is saved, and the rolling chapter summary (`summary-of-chapters.md`) is updated.

---

## 9. Background Writing

If you don't want to wait for steps 4–6 (writing, QA, saving), you can run them in the background:

1. Enable background writing: `/config` → "Toggle background writing"
2. Start a chapter normally — after you approve the plan, inkai will ask if you want to run the writing in the background.
3. If you say yes, a detached Node.js process handles the rest. You can close inkai entirely. 
4. Check progress with `/jobs` (or `/bg`, `/background`).
5. On next startup, inkai will notify you about completed, running, or failed jobs.
6. Clean up finished jobs with `/jobs clear`.

---

## 10. Reading Chapters

### CLI

```
/read           # Start from chapter 1
/read 3         # Start from chapter 3
```

Aliases: `/reader`, `/view`.

The CLI reader supports:
- **↑/↓** or **j/k** — scroll line by line
- **Page Up / Page Down** — scroll by page
- **N** — next chapter
- **P** — previous chapter
- **Q** — quit reader

Chapters are displayed with formatted markdown — headings, bold, italic, scene breaks, and bullet points are all rendered in the terminal.

### GUI Reading View

Open any chapter from the Book detail page. The reading view offers:

- **Scroll progress bar** — thin bar under the top chrome showing how far through the chapter you are.
- **Chapter / Review tabs** — switch between the chapter text and its AI review (if one exists). The review is fetched on demand.
- **Edit button** (pencil, top-right) — opens the chapter directly in the Manual Editor.
- **Typography settings** (Type icon) — font size, typeface, background theme, and text color, all saved in the browser.
- **Lore sidebar** — collapsible panel with every lore file; files containing terms from the chapter text are highlighted.
- **Lore term highlighting** — click any underlined term in the text to pop up the relevant lore content.

---

## 11. Reviewing a Chapter

```
/review-chapter 1       # Review chapter 1
/review                 # Review the latest chapter
```

Aliases: `/review`.

The writer LLM produces a detailed literary review covering:
- Consistency with lore and previous chapters
- Prose quality and style adherence
- Structure and pacing analysis
- Line-by-line suggestions
- Overall grade and recommended improvements

Reviews use **full lore context** (not just selected files) to catch any consistency issues across your entire world.

The review is saved to `chapters/review_chapter_NN.md`.

### Reading a review

```
/read-review 1          # Read the review for chapter 1
/read-review            # Read the latest review
```

Alias: `/view-review`.

This opens the review in the same comfortable CLI reader as `/read`.

---

## 12. Rewriting a Chapter

```
/rewrite-chapter 1      # Rewrite chapter 1
/rewrite                # Rewrite the latest chapter
```

Alias: `/rewrite`.

If a review exists for the chapter, the AI uses the feedback to rewrite and improve it. If no review exists, the AI first performs an inline review and then rewrites based on that.

Rewrites use **full lore context** for consistency. The rewritten chapter replaces the original, and a git commit is made.

---

## 13. Checking Progress

### `/status` (aliases: `/info`, `/stat`)

Shows a detailed AI-generated summary of your book's current state — chapters written, lore status, and what to work on next.

### `/summary` (alias: `/chapters-summary`)

Quickly displays the rolling `summary-of-chapters.md` — a concise synopsis of every chapter written so far. Useful for refreshing your memory before writing the next chapter.

### `/list` (alias: `/ls`)

Lists all your book projects with their status and chapter counts.

---

## 14. Exporting Your Book

### CLI

```
/export                 # Choose format interactively
/export epub            # Export directly to EPUB
/export odt             # Export directly to ODT
/epub                   # Shortcut for EPUB
/odt                    # Shortcut for ODT
```

### GUI

Click the **Export** button in the book header (visible whenever the book has at least one chapter) and choose **EPUB** or **ODT** from the dropdown. The file is generated server-side and downloaded immediately.

### EPUB
Generates an EPUB 3 file suitable for e-readers, Kindle, Apple Books, etc. Includes a title page, table of contents, and per-chapter formatting with proper CSS.

### ODT
Generates an OpenDocument Text file you can open in LibreOffice, Google Docs, or Microsoft Word. Includes headings, bold, italic, blockquotes, and scene breaks.

Exported files are saved in your project directory: `~/.inkai/books/<project-name>/`.

---

## 15. Customising Prompts

On first run, inkai writes default prompt templates to `~/.inkai/prompts/`. Every prompt the AI uses can be customised:

```
~/.inkai/prompts/
├── lore-questions-round1.md      # Book creation questions (round 1)
├── lore-questions-round2.md      # Follow-up questions (round 2)
├── lore-generation.md            # Lore file generation
├── chapter-suggestion.md         # Chapter direction suggestions
├── chapter-plan.md               # Chapter planning
├── chapter-writing-from-plan.md  # Chapter writing from plan
├── chapter-qa.md                 # QA review
├── chapter-review.md             # Literary review
├── chapter-rewrite.md            # Rewriting from feedback
├── summary-update.md             # Rolling summary updates
├── lore-summary.md               # Lore overview for editing
├── lore-edit.md                  # Lore modification
├── book-summary.md               # Book status summary
├── lore-file-summary.md          # Individual lore file summaries
├── lore-relevance.md             # Lore selection for tasks
└── chapter-writing.md            # Legacy direct writing
```

Templates use `{{variable}}` for substitution and `{{#if variable}}...{{/if}}` for conditionals.

If you delete a prompt file, inkai falls back to the built-in default.

To reset all prompts to defaults: `/reset-prompts` (alias: `/prompts-reset`).

---

## 16. Managing Projects

### Archiving

`/archive` lets you:
- **Archive** a project — soft-deletes it (moves to archived status)
- **Restore** an archived project — brings it back
- **Purge** an archived project — permanently deletes all files (30-day grace period)

### Git integration

If git is available on your system, inkai automatically:
- Initialises a git repo in each book project directory
- Commits after lore generation, chapter writing, reviews, rewrites, and edits

This gives you a full history of every change.

---

## 17. Tips & Best Practices

1. **Invest time in lore.** The better your lore, the better every chapter will be. Use `/enhance-lore` often.

2. **Review early.** Review your first chapter before writing the second — it helps you calibrate the AI's output and adjust your writing instructions or lore.

3. **Use writing instructions.** Even a few sentences about your preferred style dramatically improve output quality.

4. **Edit lore as you go.** As your story evolves, update your lore to reflect new developments. The AI uses lore, not previous chapters, as the primary source of truth.

5. **Check the summary.** Before writing each chapter, glance at `/summary` to make sure the rolling synopsis is accurate.

6. **Mix providers.** You can use a cheap model (GPT-4o-mini, Gemini Flash) for the small tier and an expensive one (Claude Opus, Gemini Pro) for the writer tier. Configure this in `/config` → "Configure LLM tiers".

7. **Background mode for long chapters.** If your writer model takes a while, enable background writing so you can close the terminal and come back later.

8. **Export often.** EPUB export is great for reading your book on a tablet or phone to get a feel for the pacing and flow outside the terminal.

9. **Use `/read` to stay immersed.** The CLI reader is a quick way to re-read what you've written without leaving inkai.

10. **Customise prompts if the output doesn't match your vision.** The default prompts are good starting points, but tweaking them (especially `chapter-writing-from-plan.md` and `chapter-qa.md`) can make a big difference.
