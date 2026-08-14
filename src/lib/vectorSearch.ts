/**
 * Vector Similarity Search Module (Phase 5)
 * 
 * Calculates mathematical similarity (Cosine Similarity) between a user question vector
 * and all document chunk vectors stored in local JSON data/vectors.json to return Top-K chunks.
 */

import { VectorEmbedding } from "@/types";

export interface SearchResult {
  chunkId: string;
  pageNumber: number;
  content: string;
  score: number;
  embedding?: number[];
}

/**
 * Calculates Cosine Similarity between two numerical vectors vecA and vecB.
 * Formula: (vecA · vecB) / (||vecA|| * ||vecB||)
 * 
 * @param vecA - First vector array (e.g., query embedding)
 * @param vecB - Second vector array (e.g., chunk embedding)
 * @returns Similarity score between -1.0 and 1.0 (higher means more semantically similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  /*
  
A = [1,2,1]
B = [2,0,2]
it performs:

dotProduct

= 1×2
+ 2×0
+ 1×2

= 4
  */

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  /*
  
||A|| = sqrt(1² + 2² + 1²) = sqrt(1+4+1) = sqrt(6)

||B|| = sqrt(2² + 0² + 2²) = sqrt(4+0+4) = sqrt(8)


  */

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Ranks all stored vectors against a query vector and returns Top-K highest scoring chunks.
 * 
 * @param queryVector - Vector embedding of the user's question (768 numbers)
 * @param storedVectors - Array of stored chunk vectors from data/vectors.json
 * @param topK - Number of top chunks to return (default: 3)
 * @returns Array of SearchResult sorted in descending order of similarity score
 */
export function searchTopK(
  queryVector: number[],
  storedVectors: VectorEmbedding[],
  topK: number = 3
): SearchResult[] {
  const results: SearchResult[] = storedVectors.map((item) => {
    const score = cosineSimilarity(queryVector, item.embedding);
    return {
      chunkId: item.id || item.chunkId,
      pageNumber: item.pageNumber,
      content: item.content,
      score,
    };
  });

  // Sort by score in descending order (highest score first)
  results.sort((a, b) => b.score - a.score);

  // Return top K results
  return results.slice(0, topK);
}

