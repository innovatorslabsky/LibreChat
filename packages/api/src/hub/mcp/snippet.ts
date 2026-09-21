/** The bit of matched text a search result shows around the query, so a
 * client can tell which thread it wants without opening every candidate. */
export function snippetAround(text: string, at: number, length: number): string {
  const half = Math.floor(length / 2);
  const start = Math.max(0, at - half);
  const end = Math.min(text.length, start + length);
  const cut = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${cut}${end < text.length ? '…' : ''}`;
}
