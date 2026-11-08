// pdf-parse v2 ships as CJS and uses a class-based API.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string }> };
};

/**
 * Extracts all text from a PDF Buffer using pdf-parse v2.
 * v2 API: new PDFParse({ data: Uint8Array }) → instance.getText() → { text }
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text ?? '';
}
