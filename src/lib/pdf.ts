import "server-only";
import { PDFParse } from "pdf-parse";

export type ExtractedPdf = { text: string; pages: number };

export function isPdf(bytes: Uint8Array) {
  // "%PDF-" magic header; the MIME type from the browser can't be trusted.
  return bytes.length > 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
}

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedPdf> {
  // pdf.js transfers (detaches) the buffer it receives; give it a copy so callers keep theirs.
  const parser = new PDFParse({ data: bytes.slice() });
  try {
    const result = await parser.getText();
    const text = result.text
      .replace(/^-- \d+ of \d+ --$/gm, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { text, pages: result.total };
  } finally {
    await parser.destroy();
  }
}
