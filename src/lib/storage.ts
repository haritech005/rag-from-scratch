import fs from "fs/promises";
import path from "path";
import { ExtractedDocument } from "@/types";

/**
 * Local JSON Storage Utilities for Phase 1
 * 
 * Saves extracted document pages into `data/extracted_pages.json`
 */

const DATA_DIR = path.join(process.cwd(), "data");
const EXTRACTED_PAGES_FILE = path.join(DATA_DIR, "extracted_pages.json");

/**
 * Saves extracted PDF pages into data/extracted_pages.json
 * 
 * @param documentData - ExtractedDocument object containing pages array
 */
export async function saveExtractedPages(documentData: ExtractedDocument): Promise<string> {
  // Ensure data directory exists
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Write formatted JSON to file
  const jsonContent = JSON.stringify(documentData, null, 2);
  await fs.writeFile(EXTRACTED_PAGES_FILE, jsonContent, "utf-8");

  return EXTRACTED_PAGES_FILE;
}

/**
 * Loads extracted PDF pages from data/extracted_pages.json if available.
 * 
 * @returns ExtractedDocument or null if file does not exist
 */
export async function loadExtractedPages(): Promise<ExtractedDocument | null> {
  try {
    const fileData = await fs.readFile(EXTRACTED_PAGES_FILE, "utf-8");
    return JSON.parse(fileData) as ExtractedDocument;
  } catch (error) {
    return null;
  }
}
