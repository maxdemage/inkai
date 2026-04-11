# How to Help

Inkai is a solo project and there are a few areas where contributions would make a real difference. You don't need to be a developer — some of the most valuable help is about language and writing craft.

---

## Translating Prompts to Other Languages

Inkai currently ships prompts in **English** and **Polish**. Prompts live in `src/prompts/i18n/` — each language is a single file that exports translated strings.

If you speak another language fluently and want to help:

- Copy `src/prompts/i18n/en.ts` as a starting point
- Translate each prompt string into your language
- Make sure the translation sounds natural for a *creative writing* context, not just technically correct
- Open a PR or share the file as a GitHub issue

Good candidates: Spanish, French, German, Portuguese, Japanese, Italian, Chinese

---

## Improving the Writing Prompts

The prompts that drive chapter writing, lore generation, and reviews are in `~/.inkai/prompts/` (after first run) and their defaults in `src/prompts/defaults.ts`.

If you have a background in writing, editing, or literary critique and you think the prompts could produce better prose — please help:

- Better instructions for pacing, tension, and scene structure
- Clearer guidance on dialogue vs. narration balance
- Stronger QA prompts that catch plot holes and lore contradictions
- More nuanced review prompts that give actionable feedback

You can experiment locally by editing files in `~/.inkai/prompts/` (no rebuild needed). Once you find something that works significantly better, share the diff or the full prompt text.

---

## Adapting Prompts for Other Book Types

Right now the prompts are tuned for **fiction** — novels, short stories, fan fiction. They assume characters, plot, world-building, chapters.

Many other formats could benefit from the same pipeline:

- **Non-fiction** — essays, memoirs, how-to guides, history books
- **RPG / tabletop** — campaign books, sourcebooks, adventure modules
- **Scripts** — screenplays, stage plays, podcast scripts
- **Poetry collections** — with very different structural assumptions

If you write in one of these formats and want to explore how inkai could support it, experimenting with the prompt files is the best starting point. Sharing what works (and what doesn't) is hugely valuable even without writing code.

---

## Getting in Touch

Open an issue or discussion on GitHub. Even a note saying "the QA prompt missed an obvious contradiction in my fantasy novel" is useful signal.
