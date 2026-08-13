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

export async function generateLLMResponse(prompt: string, context: string): Promise<string> {
  // Scheduled for Phase 5 / LLM Generation
  throw new Error("LLM response generation scheduled for Phase 5.");
}

