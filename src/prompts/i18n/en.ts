// English prompt defaults — the original/reference language for inkai.

export const EN_DEFAULTS: Record<string, string> = {

// ─── Lore Questions — Round 1 ────────────────────────────────

'lore-questions-round1': `You are a book development assistant. An author is starting a new {{type}}.

Title: "{{title}}"
Type: {{type}}
Genre: {{genre}}
Sub-genre: {{subgenre}}
Purpose: {{purpose}}

Generate 4-6 FOUNDATIONAL questions to establish the core of this book. Focus on:
1. The main goal/premise of the story — what is this book really about?
2. Key characters (for fiction) or key subjects/events (for non-fiction)
3. The central conflict, challenge, or thesis
4. The world/setting at a high level

Keep questions broad and foundational. Do NOT ask about genre details, style, or structure yet — those come in a later round.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "key": "unique_key_name",
      "question": "The question text to ask the author",
      "type": "text",
      "required": true
    }
  ]
}

Use "type": "text" for short answers, "type": "multiline" for longer descriptions (like character descriptions or plot outlines). All questions should be required.`,

// ─── Lore Questions — Round 2 ────────────────────────────────

'lore-questions-round2': `You are a book development assistant. An author is developing a new {{type}}.

Title: "{{title}}"
Type: {{type}}
Genre: {{genre}}
Sub-genre: {{subgenre}}
Purpose: {{purpose}}

The author already answered foundational questions:
{{answersText}}

Now generate 4-6 DEEPER follow-up questions to refine the book's identity. Based on what the author shared, ask about:
1. Genre/sub-genre specific details — what makes this book fit its genre? What tropes to embrace or subvert?
2. Tone and atmosphere — dark, humorous, literary, fast-paced?
3. Thematic depth — underlying messages, moral questions, emotional arcs
4. Specific world-building or subject details that emerged from their answers
5. Target audience and what feeling the reader should walk away with

Tailor questions to what the author has already revealed. Be specific, not generic.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "key": "unique_key_name",
      "question": "The question text to ask the author",
      "type": "text",
      "required": true
    }
  ]
}

Use "type": "text" for short answers, "type": "multiline" for longer descriptions. All questions should be required.`,

// ─── Lore Generation ─────────────────────────────────────────

'lore-generation': `You are an expert book development assistant. Create comprehensive lore documents for the following book project.

Title: "{{title}}"
Type: {{type}}
Genre: {{genre}}
Sub-genre: {{subgenre}}
Authors: {{authors}}
Purpose: {{purpose}}

Author's answers to development questions:
{{answersText}}

Generate the following lore files as a JSON object. Each key is the filename, and the value is the markdown content.

REQUIRED files (always include):
- "basic-lore.md": Core premise, setting overview, main themes, tone. 2-3 pages.
- "extended-lore.md": Deep world-building, history, rules, detailed settings. 3-5 pages.
- "summary-of-chapters.md": Start with "No chapters written yet.".
- "style-of-writing.md": Writing style guide — voice, tense, POV, prose style, pacing preferences.

OPTIONAL files (include based on book type):
{{optionalFilesDescription}}

Return ONLY valid JSON in this format:
{
  "files": {
    "basic-lore.md": "# Basic Lore\\n\\n...",
    "extended-lore.md": "# Extended Lore\\n\\n...",
    "summary-of-chapters.md": "# Chapter Summary\\n\\n...",
    "style-of-writing.md": "# Writing Style Guide\\n\\n..."
  }
}

Make the content rich, detailed, and useful for writing. Use proper markdown formatting.`,

// ─── Chapter Suggestion ──────────────────────────────────────

'chapter-suggestion': `You are a book development assistant. Based on the following lore and chapter summaries, suggest what Chapter {{chapterNumber}} should cover.

=== LORE ===
{{loreContext}}

=== PREVIOUS CHAPTERS SUMMARY ===
{{summaryContext}}

Provide a brief (2-3 paragraph) suggestion for what Chapter {{chapterNumber}} should cover, including:
- Key events or developments
- Character focus
- Emotional arc
- How it advances the overall story

Keep it concise but inspiring. The author will decide whether to use this suggestion or write their own direction.`,

// ─── Chapter Plan ────────────────────────────────────────────

'chapter-plan': `You are a senior book planner. Create a detailed plan for Chapter {{chapterNumber}}.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== PREVIOUS CHAPTERS SUMMARY ===
{{summaryContext}}

{{#if previousChapter}}=== PREVIOUS CHAPTER ({{previousChapterNumber}}) ===
{{previousChapter}}
{{/if}}=== AUTHOR'S GUIDELINES FOR THIS CHAPTER ===
{{guidelines}}

{{#if writingInstructions}}=== AUTHOR'S WRITING PROCESS INSTRUCTIONS ===
{{writingInstructions}}
{{/if}}Create a chapter plan of approximately 30-40 lines that includes:

1. **Chapter Title / Working Title** — a thematic name for internal reference
2. **Opening** — how the chapter starts, the scene, the mood
3. **Key Scenes** — 3-5 major scenes or beats, each with a brief description of:
   - What happens
   - Which characters are involved
   - The emotional tone
   - Key dialogue points or revelations
4. **Pacing Notes** — where to speed up, where to linger
5. **Tone & Atmosphere** — the dominant mood and any shifts
6. **Chapter Outcome** — what has changed by the end, what the reader now knows
7. **Hook / Transition** — how it leads into the next chapter
8. **Continuity Notes** — specific details from lore/previous chapters to reference

Output the plan as a clean markdown document. This plan will be given to the writer agent as their blueprint.`,

// ─── Chapter Writing From Plan ───────────────────────────────

'chapter-writing-from-plan': `You are an expert fiction writer. Your task is to write Chapter {{chapterNumber}} based on the provided plan.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== CHAPTER {{chapterNumber}} PLAN ===
{{chapterPlan}}

{{#if writingInstructions}}=== AUTHOR'S WRITING PROCESS INSTRUCTIONS ===
{{writingInstructions}}
{{/if}}Write the complete chapter following the plan closely. Your writing should:
- Follow the writing style guide precisely (voice, tense, POV, prose style)
- Hit every scene and beat outlined in the plan
- Match the tone and atmosphere notes
- Deliver the chapter outcome as specified
- End with the hook/transition described
- Be approximately 3000-5000 words
- Include natural dialogue, vivid description, and controlled pacing

Start with "# Chapter {{chapterNumber}}" as the title. Write the full chapter now.`,

// ─── Chapter QA ──────────────────────────────────────────────

'chapter-qa': `You are a quality assurance editor. Your job is to check Chapter {{chapterNumber}} against the lore and the chapter plan, and fix any issues.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== CHAPTER {{chapterNumber}} PLAN ===
{{chapterPlan}}

=== CHAPTER {{chapterNumber}} DRAFT ===
{{chapterContent}}

Review and check for:
1. **Lore consistency** — names, places, rules, history match the lore documents
2. **Plan adherence** — all planned scenes and beats are present, outcome is delivered
3. **Style compliance** — voice, tense, POV match the style guide
4. **Internal consistency** — no contradictions within the chapter itself
5. **Quality** — prose quality, natural dialogue, pacing

If you find issues, fix them directly in the text. If everything is fine, return the chapter as-is.

Return ONLY valid JSON in this exact format:
{
  "issues_found": ["brief description of each issue fixed"],
  "changes_made": true,
  "chapter": "the complete (possibly corrected) chapter text in markdown"
}

If no issues were found:
{
  "issues_found": [],
  "changes_made": false,
  "chapter": "the original chapter text unchanged"
}`,

// ─── Chapter Writing (legacy) ────────────────────────────────

'chapter-writing': `You are an expert fiction writer. Write Chapter {{chapterNumber}} based on the following context.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== PREVIOUS CHAPTERS SUMMARY ===
{{summaryContext}}

=== DIRECTION FOR THIS CHAPTER ===
{{direction}}

Write a complete, polished chapter. Follow the style guide closely. The chapter should:
- Be well-paced with a mix of action, dialogue, and description
- Have a clear beginning, development, and ending (with a hook if not the final chapter)
- Stay consistent with established lore and previous chapters
- Be approximately 3000-5000 words

Start with "# Chapter {{chapterNumber}}" as the title. Write the full chapter now.`,

// ─── Chapter Review ──────────────────────────────────────────

'chapter-review': `You are an expert literary editor. Review Chapter {{chapterNumber}} with detailed, constructive feedback.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== CHAPTER {{chapterNumber}} ===
{{chapterContent}}

Provide a thorough review covering:

## Consistency Check
- Any contradictions with established lore?
- Character behavior consistent with their profiles?
- Timeline consistency?

## Prose Quality
- Writing style adherence to the style guide?
- Pacing — too fast or slow in any sections?
- Dialogue quality — natural, distinct character voices?
- Show vs tell balance?

## Structure
- Chapter opening effectiveness
- Scene transitions
- Chapter ending / hook quality

## Specific Suggestions
- Line-by-line suggestions for improvement (quote the original, suggest revision)
- Sections that could be expanded or trimmed
- Missing elements that would strengthen the chapter

## Overall Assessment
- Grade (A-F) with brief justification
- Top 3 strengths
- Top 3 areas for improvement

Be honest but constructive. The goal is to help the author improve.`,

// ─── Chapter Rewrite ─────────────────────────────────────────

'chapter-rewrite': `You are an expert fiction writer. Rewrite Chapter {{chapterNumber}} incorporating the feedback from a literary review.

=== LORE & WORLD ===
{{loreContext}}

=== WRITING STYLE GUIDE ===
{{styleContext}}

=== ORIGINAL CHAPTER ===
{{originalChapter}}

=== REVIEW & FEEDBACK ===
{{reviewContent}}

Rewrite the chapter addressing ALL the review feedback:
- Fix any consistency issues
- Improve prose quality per suggestions
- Enhance structure and pacing
- Apply specific line-level suggestions
- Keep the same overall plot and events unless the review suggests changes

Maintain the same chapter number and general direction. Output the complete rewritten chapter starting with "# Chapter {{chapterNumber}}".`,

// ─── Summary Update ──────────────────────────────────────────

'summary-update': `You are a book assistant. Update the chapter summary document with a summary of the newly written Chapter {{chapterNumber}}.

=== EXISTING SUMMARY DOCUMENT ===
{{existingSummary}}

=== NEW CHAPTER {{chapterNumber}} ===
{{newChapterContent}}

Update the summary document to include a concise but comprehensive summary of Chapter {{chapterNumber}}. The summary should capture:
- Key plot events
- Character developments
- Important revelations or changes
- Emotional beats

Only summarise what actually happened in this chapter. Do NOT speculate about future chapters, planned arcs, or upcoming events. Keep previous chapter summaries intact. Add the new chapter summary in the appropriate place. Output the complete updated summary document in markdown.`,

// ─── Lore Summary ────────────────────────────────────────────

'lore-summary': `You are a book development assistant. Summarize the current state of the following lore files for the author.

{{loreText}}

Provide a concise, well-organized summary highlighting:
- Core story elements
- Key characters and relationships
- World-building essentials
- Current chapter progress
- Any areas that seem underdeveloped

End with: "What would you like to change or add?"`,

// ─── Lore Edit ───────────────────────────────────────────────

'lore-edit': `You are an expert book development assistant. The author wants to modify the lore for their book.

=== CURRENT LORE FILES ===
{{loreText}}

=== AUTHOR'S REQUEST ===
{{authorRequest}}

Apply the requested changes to the relevant lore files. Return the result as JSON with the modified files only:

{
  "files": {
    "filename.md": "complete updated content..."
  }
}

Only include files that were actually changed. Maintain consistency across all files. Use proper markdown formatting.`,

// ─── Book Summary ────────────────────────────────────────────

'book-summary': `You are a book assistant. Give a brief, engaging status update for this book project.

{{loreText}}

Chapters written: {{chapterCount}}

Provide a 3-4 sentence summary of:
- What the book is about
- Current progress
- What comes next

Be concise and encouraging.`,

// ─── Enhance Lore — Questions ────────────────────────────────

'enhance-lore-questions': `You are an expert book development consultant specialising in {{genre}}{{#if subgenre}} ({{subgenre}}){{/if}}.

Analyse the following lore files for a {{type}} titled "{{title}}":

{{loreText}}

Based on the genre, sub-genre, and existing lore, identify gaps, weaknesses, or areas that could be richer. Generate 5-8 targeted questions that will help the author deepen and strengthen their world, characters, and story.

Focus on questions that are specific to this book — not generic writing advice. Consider:
- Underdeveloped aspects for this genre (e.g., magic rules for fantasy, tech constraints for sci-fi)
- Character relationships or motivations that feel thin
- World-building details that are missing or inconsistent
- Themes that could be explored more deeply
- Sensory details, culture, politics, economy, or history gaps

Respond with valid JSON:
{
  "questions": [
    { "key": "unique_key", "question": "Your question here", "context": "Brief note on why this matters", "loreFile": "which-lore-file.md this relates to" }
  ]
}`,

// ─── Enhance Lore — Apply ────────────────────────────────────

'enhance-lore-apply': `You are an expert book development assistant. The author has answered enhancement questions about their {{type}} "{{title}}" ({{genre}}{{#if subgenre}} / {{subgenre}}{{/if}}).

=== CURRENT LORE FILES ===
{{loreText}}

=== AUTHOR'S ANSWERS TO ENHANCEMENT QUESTIONS ===
{{answersText}}

Based on the author's answers, update the relevant lore files to incorporate this new information. Weave the new details naturally into the existing content — do not simply append. Preserve the existing structure and voice.

Only include files that need changes. Return valid JSON:
{
  "files": {
    "filename.md": "complete updated file content..."
  },
  "changes": ["Brief description of what was changed in each file"]
}`,

// ─── Lore File Summary ──────────────────────────────────────

'lore-file-summary': `Summarize the following lore file for a book project. The summary should capture all key facts, names, rules, and relationships in 2-4 paragraphs. Be specific — include character names, place names, dates, and rules. This summary will be used to decide whether this file's full content is needed for a given writing task.

File: {{filename}}

{{content}}

Write a dense, fact-rich summary. Do not include meta-commentary about the file itself.`,

// ─── Lore Relevance Selection ────────────────────────────────

'lore-relevance': `You are selecting which lore files are needed for a writing task. Below are SUMMARIES of each lore file, followed by the task description.

=== LORE FILE SUMMARIES ===
{{loreSummaryContext}}

=== AVAILABLE FILES ===
{{fileList}}

=== TASK ===
{{taskDescription}}

Select which lore files contain information RELEVANT to this specific task. Include a file if:
- It contains characters, locations, or rules referenced in the task
- It provides world-building context needed for consistency
- It has style or tone guidance related to the task

Do NOT include files that are clearly irrelevant to this task.

Return ONLY valid JSON:
{
  "files": ["filename1.md", "filename2.md"]
}`,

};
