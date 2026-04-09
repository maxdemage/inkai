import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import type { Command } from '../types.js';
import { getChapterCount, readChapter, getBookDir } from '../book/manager.js';
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

async function generateOdt(
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

export const exportCommand: Command = {
  name: 'export',
  description: 'Export all chapters to a single .odt document',
  aliases: ['odt'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = await getChapterCount(ctx.config, book.projectName);

    if (totalChapters === 0) {
      error('No chapters to export. Use /create-chapter to write one.');
      return;
    }

    header('Export Book');

    const spinner = ora({ text: 'Collecting chapters...', color: 'cyan' }).start();

    const chapters: string[] = [];
    for (let i = 1; i <= totalChapters; i++) {
      const content = await readChapter(ctx.config, book.projectName, i);
      if (content) {
        chapters.push(content);
      }
    }

    spinner.text = 'Generating ODT...';

    const buffer = await generateOdt(book.title, book.authors, chapters);
    const filename = `${book.projectName}.odt`;
    const outputPath = join(getBookDir(ctx.config, book.projectName), filename);

    await writeFile(outputPath, buffer);

    spinner.stop();

    success(`Exported ${chapters.length} chapter(s) to ODT.`);
    info(`File: ${c.highlight(outputPath)}`);
    blank();
  },
};
