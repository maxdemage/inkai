interface DiffLine {
  type: 'add' | 'del' | 'ctx' | 'hunk' | 'file';
  oldNo: number | null;
  newNo: number | null;
  content: string;
}

function parseDiff(raw: string): DiffLine[] {
  // git show includes commit message header — skip everything before the first `diff --git` line
  const diffStart = raw.indexOf('\ndiff --git ');
  const content = diffStart >= 0 ? raw.slice(diffStart + 1) : raw;
  const lines = content.split('\n');
  const result: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (const line of lines) {
    // Track file boundaries from diff --git header
    if (line.startsWith('diff --git ')) {
      // Extract filename: "diff --git a/foo b/foo" → "foo"
      const m = line.match(/^diff --git a\/.+ b\/(.+)$/);
      result.push({ type: 'file', oldNo: null, newNo: null, content: m ? m[1] : line });
      continue;
    }

    // Skip file header lines (---, +++, index)
    if (
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ')
    ) continue;

    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -a,b +c,d @@
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = parseInt(m[1], 10);
        newNo = parseInt(m[2], 10);
      }
      result.push({ type: 'hunk', oldNo: null, newNo: null, content: line });
      continue;
    }

    if (line.startsWith('+')) {
      result.push({ type: 'add', oldNo: null, newNo: newNo++, content: line.slice(1) });
    } else if (line.startsWith('-')) {
      result.push({ type: 'del', oldNo: oldNo++, newNo: null, content: line.slice(1) });
    } else {
      // Context line (starts with ' ' or empty at EOF)
      result.push({ type: 'ctx', oldNo: oldNo++, newNo: newNo++, content: line.startsWith(' ') ? line.slice(1) : line });
    }
  }

  return result;
}

interface SideBySidePair {
  left: DiffLine | null;
  right: DiffLine | null;
}

function buildSideBySide(lines: DiffLine[]): SideBySidePair[] {
  const pairs: SideBySidePair[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'hunk' || line.type === 'file') {
      pairs.push({ left: line, right: null });
      i++;
    } else if (line.type === 'ctx') {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.type === 'del') {
      // Collect consecutive deletions
      const dels: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'del') dels.push(lines[i++]);
      // Collect consecutive additions
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === 'add') adds.push(lines[i++]);
      const max = Math.max(dels.length, adds.length);
      for (let j = 0; j < max; j++) {
        pairs.push({ left: dels[j] ?? null, right: adds[j] ?? null });
      }
    } else if (line.type === 'add') {
      pairs.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }
  return pairs;
}

function DiffCell({ line, side }: { line: DiffLine | null; side: 'left' | 'right' }) {
  const emptyNoClass = side === 'left'
    ? 'select-none w-7 shrink-0 border-r app-divider'
    : 'select-none w-7 shrink-0';
  if (!line) {
    return (
      <>
        <td className={emptyNoClass} />
        <td className="px-3 py-0.5 font-mono text-xs whitespace-pre-wrap break-all">&nbsp;</td>
      </>
    );
  }
  if (line.type === 'hunk') {
    return (
      <>
        <td colSpan={2} className="px-3 py-1 font-mono text-[10px] app-text-faint bg-[color:var(--diff-hunk,rgba(128,128,128,0.08))]">
          {line.content}
        </td>
      </>
    );
  }

  const no = side === 'left' ? line.oldNo : line.newNo;
  const noClass = side === 'left'
    ? 'select-none text-right pr-2 pl-1 text-[10px] font-mono app-text-faint w-7 shrink-0 border-r app-divider'
    : 'select-none text-right pr-2 pl-1 text-[10px] font-mono app-text-faint w-7 shrink-0';
  const bg = line.type === 'del'
    ? 'bg-[color:var(--diff-del,rgba(239,68,68,0.12))]'
    : line.type === 'add'
    ? 'bg-[color:var(--diff-add,rgba(34,197,94,0.12))]'
    : '';
  const textColor = line.type === 'del'
    ? 'text-[color:var(--semantic-danger-text)]'
    : line.type === 'add'
    ? 'text-[color:var(--semantic-success-text)]'
    : 'app-text';

  return (
    <>
      <td className={`${noClass} ${bg}`}>
        {no ?? ''}
      </td>
      <td className={`px-3 py-0.5 font-mono text-xs whitespace-pre-wrap break-all ${bg} ${textColor}`}>
        {line.content || '\u00a0'}
      </td>
    </>
  );
}

interface Props {
  diff: string;
  file: string;
  hash?: string;
}

export function DiffViewer({ diff, file, hash }: Props) {
  if (!diff.trim()) {
    return (
      <div className="px-4 py-3 text-sm app-text-faint italic">No changes in this file.</div>
    );
  }

  // When showing a commit (git show), the raw output may contain multiple file diffs.
  // parseDiff already strips the commit message header.
  const lines = parseDiff(diff);
  const pairs = buildSideBySide(lines);

  return (
    <div className="overflow-x-auto">
      <div className="px-4 py-2 border-b app-divider flex items-center gap-2">
        {hash && <code className="text-[11px] font-mono text-[color:var(--accent)]">{hash}</code>}
        {file && <code className="text-xs font-mono app-text">{file}</code>}
        {!hash && !file && <span className="text-xs app-text-faint">Diff</span>}
      </div>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b app-divider">
            <th colSpan={2} className="px-3 py-1 text-left text-[10px] app-text-faint font-semibold uppercase tracking-wider border-r app-divider w-1/2">Before</th>
            <th colSpan={3} className="px-3 py-1 text-left text-[10px] app-text-faint font-semibold uppercase tracking-wider w-1/2">After</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, i) => {
            // file boundary row
            if (pair.left?.type === 'file') {
              return (
                <tr key={i}>
                  <td colSpan={5} className="px-3 py-1.5 font-mono text-[11px] app-text border-t-2 app-divider bg-[color:var(--diff-hunk,rgba(128,128,128,0.06))]">
                    {pair.left.content}
                  </td>
                </tr>
              );
            }
            // hunk row spans full width
            if (pair.left?.type === 'hunk') {
              return (
                <tr key={i}>
                  <td colSpan={5} className="px-3 py-1 font-mono text-[10px] app-text-faint bg-[color:var(--diff-hunk,rgba(128,128,128,0.08))]">
                    {pair.left.content}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={i} className="border-b app-divider last:border-0">
                <DiffCell line={pair.left} side="left" />
                <td className="w-px border-r app-divider" />
                <DiffCell line={pair.right} side="right" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
