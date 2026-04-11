import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { select } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { readChapter, getBookDir } from '../book/manager.js';
import { header, success, error, info, blank, c } from '../ui.js';
import ora from 'ora';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function markdownToOdtContent(md: string): string {
  const lines = md.split('\n');
  let xml = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      xml += `<text:h text:style-name="Heading_20_1" text:outline-level="1">${escapeXml(line.slice(2))}</text:h>\n`;
    } else if (line.startsWith('## ')) {
      xml += `<text:h text:style-name="Heading_20_2" text:outline-level="2">${escapeXml(line.slice(3))}</text:h>\n`;
    } else if (line.startsWith('### ')) {
      xml += `<text:h text:style-name="Heading_20_3" text:outline-level="3">${escapeXml(line.slice(4))}</text:h>\n`;
    } else if (line.startsWith('---') || line.startsWith('***')) {
      xml += `<text:p text:style-name="Horizontal_20_Line">* * *</text:p>\n`;
    } else if (line.startsWith('> ')) {
      xml += `<text:p text:style-name="Quotations">${escapeXml(line.slice(2))}</text:p>\n`;
    } else if (line.trim() === '') {
      xml += `<text:p text:style-name="Text_20_Body"/>\n`;
    } else {
      // Handle basic inline markdown (bold, italic)
      let text = escapeXml(line);
      // Bold: **text** → styled span
      text = text.replace(/\*\*(.+?)\*\*/g, '<text:span text:style-name="Bold">$1</text:span>');
      // Italic: *text* → styled span
      text = text.replace(/\*(.+?)\*/g, '<text:span text:style-name="Italic">$1</text:span>');
      xml += `<text:p text:style-name="Text_20_Body">${text}</text:p>\n`;
    }
  }

  return xml;
}

function buildContentXml(title: string, chapters: string[]): string {
  let body = '';

  // Title page
  body += `<text:h text:style-name="Title" text:outline-level="1">${escapeXml(title)}</text:h>\n`;
  body += `<text:p text:style-name="Text_20_Body"/>\n`;

  for (let i = 0; i < chapters.length; i++) {
    // Page break before each chapter (except first if title page counts)
    if (i > 0) {
      body += `<text:p text:style-name="Page_20_Break"/>\n`;
    }
    body += markdownToOdtContent(chapters[i]);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Page_20_Break" style:family="paragraph" style:parent-style-name="Text_20_Body">
      <style:paragraph-properties fo:break-before="page"/>
    </style:style>
    <style:style style:name="Bold" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Italic" style:family="text">
      <style:text-properties fo:font-style="italic"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${body}
    </office:text>
  </office:body>
</office:document-content>`;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Title" style:family="paragraph" style:class="chapter">
      <style:paragraph-properties fo:text-align="center" fo:margin-top="2cm" fo:margin-bottom="1cm"/>
      <style:text-properties fo:font-size="28pt" fo:font-weight="bold" fo:color="#1a1a2e"/>
    </style:style>
    <style:style style:name="Heading_20_1" style:family="paragraph" style:class="text" style:display-name="Heading 1">
      <style:paragraph-properties fo:margin-top="0.8cm" fo:margin-bottom="0.4cm"/>
      <style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#16213e"/>
    </style:style>
    <style:style style:name="Heading_20_2" style:family="paragraph" style:class="text" style:display-name="Heading 2">
      <style:paragraph-properties fo:margin-top="0.6cm" fo:margin-bottom="0.3cm"/>
      <style:text-properties fo:font-size="16pt" fo:font-weight="bold" fo:color="#0f3460"/>
    </style:style>
    <style:style style:name="Heading_20_3" style:family="paragraph" style:class="text" style:display-name="Heading 3">
      <style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.2cm"/>
      <style:text-properties fo:font-size="13pt" fo:font-weight="bold" fo:font-style="italic"/>
    </style:style>
    <style:style style:name="Text_20_Body" style:family="paragraph" style:class="text" style:display-name="Text Body">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.2cm" fo:line-height="150%"/>
      <style:text-properties fo:font-size="12pt" fo:font-family="Serif"/>
    </style:style>
    <style:style style:name="Quotations" style:family="paragraph" style:class="text">
      <style:paragraph-properties fo:margin-left="1cm" fo:margin-right="1cm" fo:margin-top="0.2cm" fo:margin-bottom="0.2cm"/>
      <style:text-properties fo:font-style="italic" fo:font-size="11pt" fo:color="#555555"/>
    </style:style>
    <style:style style:name="Horizontal_20_Line" style:family="paragraph" style:display-name="Horizontal Line">
      <style:paragraph-properties fo:text-align="center" fo:margin-top="0.4cm" fo:margin-bottom="0.4cm"/>
      <style:text-properties fo:color="#999999" fo:font-size="14pt"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm"
        fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.5cm" fo:margin-right="2.5cm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
  </office:master-styles>
</office:document-styles>`;
}

function buildManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`;
}

function buildMetaXml(title: string, authors: string[]): string {
  const author = escapeXml(authors.join(', '));
  const date = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${author}</dc:creator>
    <meta:creation-date>${date}</meta:creation-date>
    <dc:date>${date}</dc:date>
    <meta:generator>inkai</meta:generator>
  </office:meta>
</office:document-meta>`;
}

export async function generateOdt(
  title: string,
  authors: string[],
  chapters: string[]
): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('META-INF/manifest.xml', buildManifestXml());
  zip.file('meta.xml', buildMetaXml(title, authors));
  zip.file('styles.xml', buildStylesXml());
  zip.file('content.xml', buildContentXml(title, chapters));

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.oasis.opendocument.text' });
}

// ─── EPUB Generation ──────────────────────────────────────────

function markdownToXhtml(md: string): string {
  const lines = md.split('\n');
  let html = '';

  for (const line of lines) {
    if (line.startsWith('# ')) {
      html += `<h1>${escapeXml(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${escapeXml(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${escapeXml(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('---') || line.startsWith('***')) {
      html += `<p class="separator">* * *</p>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote><p>${escapeXml(line.slice(2))}</p></blockquote>\n`;
    } else if (line.trim() === '') {
      // skip empty lines (paragraph spacing handled by CSS)
    } else {
      let text = escapeXml(line);
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html += `<p>${text}</p>\n`;
    }
  }

  return html;
}

function buildEpubChapterXhtml(chapterContent: string, chapterIndex: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Chapter ${chapterIndex + 1}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${markdownToXhtml(chapterContent)}
</body>
</html>`;
}

function buildEpubTitlePage(title: string, authors: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<div class="title-page">
  <h1 class="book-title">${escapeXml(title)}</h1>
  <p class="book-author">${escapeXml(authors.join(', '))}</p>
</div>
</body>
</html>`;
}

function buildEpubStylesheet(): string {
  return `body {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.6;
  margin: 1em;
  color: #1a1a1a;
}
h1 { font-size: 1.8em; margin: 1em 0 0.5em; color: #1a1a2e; }
h2 { font-size: 1.4em; margin: 0.8em 0 0.4em; color: #0f3460; }
h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; font-style: italic; }
p { margin: 0.4em 0; text-indent: 1.5em; }
p.separator { text-align: center; text-indent: 0; color: #999; margin: 1em 0; font-size: 1.2em; }
blockquote { margin: 0.5em 1.5em; }
blockquote p { font-style: italic; color: #555; text-indent: 0; }
.title-page { text-align: center; margin-top: 30%; }
.book-title { font-size: 2.4em; margin-bottom: 0.5em; }
.book-author { font-size: 1.2em; color: #555; }
`;
}

function buildEpubContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function buildEpubContentOpf(title: string, authors: string[], chapterCount: number): string {
  const bookId = `inkai-${Date.now()}`;
  const author = escapeXml(authors.join(', '));
  const date = new Date().toISOString().split('T')[0];

  let manifest = `    <item id="style" href="style.css" media-type="text/css"/>\n`;
  manifest += `    <item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>\n`;
  manifest += `    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n`;
  for (let i = 0; i < chapterCount; i++) {
    manifest += `    <item id="chapter-${i + 1}" href="chapter-${String(i + 1).padStart(2, '0')}.xhtml" media-type="application/xhtml+xml"/>\n`;
  }

  let spine = `    <itemref idref="title-page"/>\n`;
  spine += `    <itemref idref="toc"/>\n`;
  for (let i = 0; i < chapterCount; i++) {
    spine += `    <itemref idref="chapter-${i + 1}"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
${manifest}  </manifest>
  <spine>
${spine}  </spine>
</package>`;
}

function buildEpubTocXhtml(title: string, chapterCount: number): string {
  let items = '';
  for (let i = 0; i < chapterCount; i++) {
    items += `      <li><a href="chapter-${String(i + 1).padStart(2, '0')}.xhtml">Chapter ${i + 1}</a></li>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${items}    </ol>
  </nav>
</body>
</html>`;
}

export async function generateEpub(
  title: string,
  authors: string[],
  chapters: string[]
): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype must be first and uncompressed (EPUB spec)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', buildEpubContainerXml());
  zip.file('OEBPS/content.opf', buildEpubContentOpf(title, authors, chapters.length));
  zip.file('OEBPS/style.css', buildEpubStylesheet());
  zip.file('OEBPS/title.xhtml', buildEpubTitlePage(title, authors));
  zip.file('OEBPS/toc.xhtml', buildEpubTocXhtml(title, chapters.length));

  for (let i = 0; i < chapters.length; i++) {
    const filename = `chapter-${String(i + 1).padStart(2, '0')}.xhtml`;
    zip.file(`OEBPS/${filename}`, buildEpubChapterXhtml(chapters[i], i));
  }

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

export const exportCommand: Command = {
  name: 'export',
  description: 'Export all chapters to .odt or .epub',
  aliases: ['odt', 'epub'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = book.chapterCount;

    if (totalChapters === 0) {
      error('No chapters to export. Use /create-chapter to write one.');
      return;
    }

    header('Export Book');

    // Determine format from alias or arg, otherwise ask
    let format: 'odt' | 'epub' | undefined;
    const firstArg = args[0]?.toLowerCase();
    if (firstArg === 'odt' || firstArg === 'epub') {
      format = firstArg;
    }
    if (!format) {
      format = await select({
        message: 'Export format:',
        choices: [
          { name: 'EPUB — e-readers, Kindle, Apple Books', value: 'epub' as const },
          { name: 'ODT — LibreOffice, Google Docs', value: 'odt' as const },
        ],
      });
    }

    const spinner = ora({ text: 'Collecting chapters...', color: 'cyan' }).start();

    const chapters: string[] = [];
    for (let i = 1; i <= totalChapters; i++) {
      const content = await readChapter(ctx.config, book.projectName, i);
      if (content) {
        chapters.push(content);
      }
    }

    const ext = format;
    spinner.text = `Generating ${ext.toUpperCase()}...`;

    const buffer = format === 'epub'
      ? await generateEpub(book.title, book.authors, chapters)
      : await generateOdt(book.title, book.authors, chapters);

    const filename = `${book.projectName}.${ext}`;
    const outputPath = join(getBookDir(ctx.config, book.projectName), filename);

    await writeFile(outputPath, buffer);

    spinner.stop();

    success(`Exported ${chapters.length} chapter(s) to ${ext.toUpperCase()}.`);
    info(`File: ${c.highlight(outputPath)}`);
    blank();
  },
};
