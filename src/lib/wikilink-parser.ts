const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

/** Extract all wikilink target titles from a block's content string */
export function parseWikilinks(content: string): string[] {
  const titles: string[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex since we reuse the regex
  WIKILINK_REGEX.lastIndex = 0;
  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    titles.push(match[1].trim());
  }
  return titles;
}

/** Resolve a wikilink title to a document ID by exact title match */
export function resolveWikilinkTitle(
  title: string,
  documents: { id: string; title: string }[],
): string | null {
  const found = documents.find((d) => d.title === title);
  return found ? found.id : null;
}

/** Extract context preview around a wikilink occurrence */
export function extractContext(
  content: string,
  matchIndex: number,
  matchLength: number,
  radius: number = 40,
): string {
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(content.length, matchIndex + matchLength + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < content.length ? '...' : '';
  return prefix + content.slice(start, end) + suffix;
}
