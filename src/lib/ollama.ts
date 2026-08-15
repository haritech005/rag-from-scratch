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

/**
 * Generates a 768-dimensional vector embedding for a given text string using local Ollama nomic-embed-text.
 * 
 * @param text - Input string content to embed
 * @returns Promise resolving to an array of 768 floating-point numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error("Invalid embedding response received from Ollama");
    }

    return data.embedding;
  } catch (error: any) {
    if (error.cause?.code === "ECONNREFUSED" || error.message.includes("fetch failed")) {
      throw new Error(
        `Could not connect to Ollama at ${OLLAMA_BASE_URL}. Please make sure Ollama is running ('ollama serve') and model '${EMBEDDING_MODEL}' is pulled ('ollama pull ${EMBEDDING_MODEL}').`
      );
    }
    throw error;
  }
}

/**
 * Constructs a grounded RAG prompt by formatting system instructions, retrieved context chunks, and user question.
 * 
 * @param question - Original user question string
 * @param chunks - Top-K retrieved chunks with page numbers and text content
 * @returns Complete prompt string ready for LLM generation
 */
export function buildRAGPrompt(
  question: string,
  chunks: { chunkId: string; pageNumber: number; content: string; score: number }[]
): string {
  const contextText = chunks
    .map(
      (c, i) =>
        `--- CONTEXT CHUNK ${i + 1} (Page ${c.pageNumber}, ID: ${c.chunkId}) ---\n${c.content}`
    )
    .join("\n\n");

  return `You are a helpful and strict RAG AI Assistant.

SYSTEM INSTRUCTIONS:
1. Answer the USER QUESTION using ONLY the facts contained in the PROVIDED CONTEXT below.
2. Do NOT use outside knowledge or assumptions not present in the CONTEXT.
3. When calculating durations between month/year date ranges (e.g., Sept 2024 to Feb 2025), count the exact months step-by-step accurately (Sept, Oct, Nov, Dec, Jan, Feb = 6 months).
4. If the answer cannot be found in the PROVIDED CONTEXT, strictly reply with: "The requested information was not found in the document."
5. Include page number citations (e.g. [Page X]) in your answer whenever referencing facts from the context.


=== PROVIDED CONTEXT ===
${contextText}
========================

USER QUESTION: ${question}

ANSWER:`;
}

/**
 * Sends a constructed prompt to local Ollama gemma3:4b model to generate a text answer.
 * 
 * @param fullPrompt - Grounded prompt containing system instructions, context chunks, and question
 * @returns Promise resolving to the generated text response string
 */
export async function generateLLMResponse(fullPrompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: fullPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (typeof data.response !== "string") {
      throw new Error("Invalid LLM response received from Ollama");
    }

    return data.response.trim();
  } catch (error: any) {
    if (error.cause?.code === "ECONNREFUSED" || error.message.includes("fetch failed")) {
      throw new Error(
        `Could not connect to Ollama at ${OLLAMA_BASE_URL}. Please ensure Ollama is running ('ollama serve') and model '${LLM_MODEL}' is pulled ('ollama pull ${LLM_MODEL}').`
      );
    }
    throw error;
  }
}


