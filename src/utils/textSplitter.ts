const MAX_LENGTH = 260;

export function splitIntoThread(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!current) {
      current = trimmed;
    } else if ((current + " " + trimmed).length <= MAX_LENGTH - 10) {
      current += " " + trimmed;
    } else {
      chunks.push(current);
      current = trimmed;
    }
  }
  if (current) chunks.push(current);

  const total = chunks.length;
  return chunks.map((chunk, i) => `${chunk} (${i + 1}/${total})`);
}
