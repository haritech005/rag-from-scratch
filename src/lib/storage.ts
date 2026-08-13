import fs from "fs/promises";
import path from "path";
import { ExtractedDocument, ChunkedDocument, LocalVectorStore } from "@/types";

/**
 * Local JSON Storage Utilities for Phase 1, Phase 2, and Phase 3
 * 
 * - Saves extracted pages into `data/extracted_pages.json` (Phase 1)
 * - Saves text chunks into `data/chunks.json` (Phase 2)
 * - Saves vector embeddings into `data/vectors.json` (Phase 3)
 */

const DATA_DIR = path.join(process.cwd(), "data");
const EXTRACTED_PAGES_FILE = path.join(DATA_DIR, "extracted_pages.json");
const CHUNKS_FILE = path.join(DATA_DIR, "chunks.json");
const VECTORS_FILE = path.join(DATA_DIR, "vectors.json");

/**
 * Saves extracted PDF pages into data/extracted_pages.json (Phase 1)
 */
export async function saveExtractedPages(documentData: ExtractedDocument): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const jsonContent = JSON.stringify(documentData, null, 2);
  await fs.writeFile(EXTRACTED_PAGES_FILE, jsonContent, "utf-8");
  return EXTRACTED_PAGES_FILE;
}

/**
 * Loads extracted PDF pages from data/extracted_pages.json if available.
 */
export async function loadExtractedPages(): Promise<ExtractedDocument | null> {
  try {
    const fileData = await fs.readFile(EXTRACTED_PAGES_FILE, "utf-8");
    return JSON.parse(fileData) as ExtractedDocument;
  } catch (error) {
    return null;
  }
}

/**
 * Saves generated text chunks into data/chunks.json (Phase 2)
 */
export async function saveChunks(chunkedData: ChunkedDocument): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const jsonContent = JSON.stringify(chunkedData, null, 2);
  await fs.writeFile(CHUNKS_FILE, jsonContent, "utf-8");
  return CHUNKS_FILE;
}

/**
 * Loads saved text chunks from data/chunks.json if available.
 */
export async function loadChunks(): Promise<ChunkedDocument | null> {
  try {
    const fileData = await fs.readFile(CHUNKS_FILE, "utf-8");
    return JSON.parse(fileData) as ChunkedDocument;
  } catch (error) {
    return null;
  }
}

/**
 * Saves generated vector embeddings into data/vectors.json (Phase 3)
 */
export async function saveEmbeddings(vectorStoreData: LocalVectorStore): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const jsonContent = JSON.stringify(vectorStoreData, null, 2);
  await fs.writeFile(VECTORS_FILE, jsonContent, "utf-8");
  return VECTORS_FILE;
}

/**
 * Loads saved vector embeddings from data/vectors.json if available.
 */
export async function loadEmbeddings(): Promise<LocalVectorStore | null> {
  try {
    const fileData = await fs.readFile(VECTORS_FILE, "utf-8");
    return JSON.parse(fileData) as LocalVectorStore;
  } catch (error) {
    return null;
  }
}

