/**
 * Strip HTML tags and decode entities to plain text.
 * Used for AI context injection and RAG tokenization.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert plain text to HTML paragraphs for Tiptap.
 * Handles backward compatibility with data saved before getHTML() fix.
 * - If content already has HTML tags, return as-is
 * - Double newlines → separate <p> tags
 * - Single newlines → <br> within a paragraph
 */
export function ensureHtml(content: string): string {
  if (!content) return '';
  // Already HTML if it contains common HTML tags
  if (/<(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|br|code|strong|em|a)\b/i.test(content)) {
    return content;
  }
  // Plain text → HTML paragraphs
  const paragraphs = content.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const withBreaks = p.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('');
}
