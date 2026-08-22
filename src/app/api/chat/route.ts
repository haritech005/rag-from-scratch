import { NextRequest, NextResponse } from "next/server";
import { loadEmbeddings, loadDocumentMeta } from "@/lib/storage";
import { generateEmbedding, buildRAGPrompt, generateLLMResponse } from "@/lib/ollama";
import { searchTopK } from "@/lib/vectorSearch";
import { ChatMessage } from "@/types";


/**
 * Endpoint 2: POST /api/chat
 * 
 * Streamlined Conversational Query Endpoint for User-Facing PDF RAG Application.
 * 
 * Uses hardcoded optimal RAG hyperparameter defaults:
 * - topK: 5
 * - minScore (Similarity Threshold): 0.60
 * - System Instructions: Strict context grounding with pronoun resolution and page citations [Page X]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question?.trim();
    const chatHistory: ChatMessage[] = Array.isArray(body.chatHistory) ? body.chatHistory : [];

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question string is required." },
        { status: 400 }
      );
    }

    // Step 1: Verify active indexed document exists
    const docMeta = await loadDocumentMeta();
    const vectorStore = await loadEmbeddings();

    if (!vectorStore || !vectorStore.vectors || vectorStore.vectors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No active PDF document indexed. Please upload a PDF first using POST /api/upload.",
        },
        { status: 400 }
      );
    }

    const filename = docMeta?.filename || vectorStore.sourceFilename || "Uploaded_Document.pdf";

    // Step 2: Filter prior history to exclude the current question
    const priorHistory = chatHistory.filter(
      (m, idx) => !(idx === chatHistory.length - 1 && m.role === "user" && m.content === question)
    );

    let vectorSearchText = question;
    const previousUserMsgs = priorHistory.filter((m) => m.role === "user");
    if (previousUserMsgs.length > 0) {
      const lastUserMsg = previousUserMsgs[previousUserMsgs.length - 1].content;
      if (
        question.length < 35 ||
        /\b(it|this|that|they|these|those|he|she|year|date|when|where|what)\b/i.test(question)
      ) {
        vectorSearchText = `${lastUserMsg} ${question}`;
      }
    }

    console.log(`\n=== CHAT QUERY: "${question}" (Search text: "${vectorSearchText}") ===`);

    // Step 3: Embed user question with nomic-embed-text
    const queryVector = await generateEmbedding(vectorSearchText);

    // Step 4: Vector Search with Top-K = 5 and minScore = 0.40 similarity threshold
    const topK = 5;
    const minScore = 0.40;
    const topChunks = searchTopK(queryVector, vectorStore.vectors, topK, minScore);

    const formattedChunks = topChunks.map((item) => ({
      chunkId: item.chunkId,
      pageNumber: item.pageNumber,
      score: parseFloat(item.score.toFixed(4)),
      content: item.content,
    }));

    // Step 5: Build grounded RAG prompt inserting retrieved context & prior history
    const fullPrompt = buildRAGPrompt(question, formattedChunks, priorHistory);

    // Step 6: Generate response with local Ollama gemma3:4b
    const rawAnswer = await generateLLMResponse(fullPrompt);


    // Step 7: Build clean source citations
    const sourceMap = new Map<number, { file: string; page: number }>();
    formattedChunks.forEach((c) => {
      sourceMap.set(c.pageNumber, { file: filename, page: c.pageNumber });
    });
    const sources = Array.from(sourceMap.values());

    return NextResponse.json({
      success: true,
      answer: rawAnswer,
      sources,
      retrievedChunksCount: formattedChunks.length,
      retrievedChunks: formattedChunks,
    });
  } catch (error: any) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process chat query" },
      { status: 500 }
    );
  }
}
