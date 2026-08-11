import fs from "fs";
import path from "path";
// @ts-ignore - pdf-parse standard CommonJS export
import pdfParse from "pdf-parse";
import { ExtractedDocument, ExtractedPage } from "@/types";

/**
 * Phase 1: PDF Text Extraction
 * 
 * Reads a PDF file from the backend server filesystem and extracts its text page-by-page,
 * preserving exact page numbers without performing chunking or embedding yet.
 */

/**
 * Custom page renderer passed to pdf-parse to intercept each page's text during parsing.
 */
function createPageRenderer(pagesList: ExtractedPage[]) {
  let pageCounter = 0;

  return function (pageData: any) {
    pageCounter++;
    return pageData.getTextContent().then((textContent: any) => {
      // Extract text items from page content and join them with spaces
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ") // Clean up extra spaces
        .trim();

      pagesList.push({
        page: pageCounter,
        text: pageText,
      });

      return pageText;
    });
  };
}

/**
 * Extracts text from a PDF Buffer page by page.
 * 
 * @param pdfBuffer - Raw binary buffer of the PDF file
 * @returns Array of ExtractedPage objects ({ page: number, text: string })
 */
export async function extractPdfPagesFromBuffer(pdfBuffer: Buffer): Promise<ExtractedPage[]> {
  const extractedPages: ExtractedPage[] = [];

  const options = {
    pagerender: createPageRenderer(extractedPages),
  };

  // Run pdf-parse parser with custom page renderer
  await pdfParse(pdfBuffer, options);

  return extractedPages;
}

/**
 * Parses a PDF document located at a given file path and returns the full ExtractedDocument object.
 * 
 * @param pdfFilePath - Absolute or relative file path to the PDF document
 * @returns ExtractedDocument containing filename, totalPages, extractedAt timestamp, and pages array
 */
export async function parsePdfFile(pdfFilePath: string): Promise<ExtractedDocument> {
  const absolutePath = path.isAbsolute(pdfFilePath)
    ? pdfFilePath
    : path.join(process.cwd(), pdfFilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PDF file not found at path: ${absolutePath}`);
  }

  // Read raw binary data from disk into Buffer
  const pdfBuffer = fs.readFileSync(absolutePath);

  // Extract pages using pdf-parse custom page renderer
  const pages = await extractPdfPagesFromBuffer(pdfBuffer);

  const filename = path.basename(absolutePath);

  return {
    filename,
    totalPages: pages.length,
    extractedAt: new Date().toISOString(),
    pages,
  };
}
