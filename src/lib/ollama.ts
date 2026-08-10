/**
 * Ollama Local AI Integration Client (Placeholder for Phase 2 & Phase 3)
 * 
 * Future Responsibility:
 * Communicates directly with the local Ollama instance running on localhost:11434.
 * - nomic-embed-text: Generates 768-dimensional vector embeddings for text chunks & user queries.
 * - gemma3:4b: Generates grounded LLM answers using retrieved text chunks as context.
 */

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const EMBEDDING_MODEL = "nomic-embed-text";
export const LLM_MODEL = "gemma3:4b";

export async function generateEmbedding(text: string): Promise<number[]> {
  // Implementation will be added in Phase 2
  throw new Error("Embedding generation not implemented yet. Scheduled for Phase 2.");
}

export async function generateLLMResponse(prompt: string, context: string): Promise<string> {
  // Implementation will be added in Phase 3
  throw new Error("LLM response generation not implemented yet. Scheduled for Phase 3.");
}
