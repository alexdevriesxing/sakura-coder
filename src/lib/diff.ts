export interface SimpleLineDiff {
  line: number;
  kind: 'same' | 'added' | 'removed';
  text: string;
}

export function createSimpleDiff(oldContent = '', newContent = ''): SimpleLineDiff[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const output: SimpleLineDiff[] = [];

  for (let i = 0; i < max; i += 1) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) {
      if (oldLine !== undefined) output.push({ line: i + 1, kind: 'same', text: oldLine });
    } else {
      if (oldLine !== undefined) output.push({ line: i + 1, kind: 'removed', text: oldLine });
      if (newLine !== undefined) output.push({ line: i + 1, kind: 'added', text: newLine });
    }
  }

  return output;
}
