import { ExtractedDocument, ExtractedPage, TextChunk, ChunkedDocument } from "@/types";

/**
 * Phase 2: Document Text Chunking Module
 * 
 * Splits raw extracted page text into smaller, overlapping chunks while preserving
 * exact page numbers for accurate retrieval citations.
 */

// Approximate character ratio: ~4 characters per token in standard English text
const CHARS_PER_TOKEN = 4;

/**
 * Estimates token count from a text string based on character length.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits text from a single ExtractedPage into chunks using a sliding window algorithm.
 * 
 * @param page - ExtractedPage object containing page number and full text
 * @param chunkSizeTokens - Target tokens per chunk (default: 600 tokens ≈ 2400 chars)
 * @param overlapTokens - Overlap tokens between consecutive chunks (default: 100 tokens ≈ 400 chars)
 * @returns Array of TextChunk objects with pageNumber preserved
 */
export function chunkSinglePage(
  page: ExtractedPage,
  chunkSizeTokens: number = 600,
  overlapTokens: number = 100
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const text = page.text.trim();
  if (!text) return chunks;

  const chunkSizeChars = chunkSizeTokens * CHARS_PER_TOKEN; // e.g. 600 * 4 = 2400 chars
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;     // e.g. 100 * 4 = 400 chars
  const stepChars = chunkSizeChars - overlapChars;          // e.g. 2400 - 400 = 2000 chars

  // Split text by whitespace into words to ensure we break at word boundaries
  const words = text.split(/\s+/);
  let currentWordIndex = 0;
  let chunkCounter = 1;

  while (currentWordIndex < words.length) {
    let currentChunkWords: string[] = [];
    let currentLength = 0;

    // Build chunk until reaching approx chunkSizeChars
    let i = currentWordIndex;
    while (i < words.length && currentLength < chunkSizeChars) {
      currentChunkWords.push(words[i]);
      currentLength += words[i].length + 1; // +1 for space
      i++;
    }

    const chunkContent = currentChunkWords.join(" ").trim();
    if (chunkContent.length > 0) {
      chunks.push({
        id: `chunk-p${page.page}-${chunkCounter}`,
        pageNumber: page.page,
        content: chunkContent,
        charCount: chunkContent.length,
        tokenCount: estimateTokenCount(chunkContent),
      });
      chunkCounter++;
    }

    // If we've reached the end of the words, break
    if (i >= words.length) break;

    // Calculate how many words to step forward to achieve the desired overlap
    let overlapLength = 0;
    let stepBackWords = 0;
    for (let j = i - 1; j >= currentWordIndex; j--) {
      overlapLength += words[j].length + 1;
      stepBackWords++;
      if (overlapLength >= overlapChars) break;
    }

    // Advance word index by (words in chunk - stepBackWords), ensuring forward progress
    const advanceBy = Math.max(1, currentChunkWords.length - stepBackWords);
    currentWordIndex += advanceBy;
  }

  return chunks;
}

/**
 * Processes an entire ExtractedDocument object and chunks all pages.
 * 
 * @param document - Full ExtractedDocument from Phase 1
 * @param chunkSizeTokens - Target tokens per chunk (default: 600)
 * @param overlapTokens - Tokens overlap (default: 100)
 * @returns ChunkedDocument structure ready to save as JSON
 */
export function chunkExtractedDocument(
  document: ExtractedDocument,
  chunkSizeTokens: number = 600,
  overlapTokens: number = 100
): ChunkedDocument {
  const allChunks: TextChunk[] = [];

  for (const page of document.pages) {
    const pageChunks = chunkSinglePage(page, chunkSizeTokens, overlapTokens);
    allChunks.push(...pageChunks);
  }

  return {
    sourceFilename: document.filename,
    totalChunks: allChunks.length,
    chunkSizeTokens,
    chunkOverlapTokens: overlapTokens,
    chunkedAt: new Date().toISOString(),
    chunks: allChunks,
  };
}
