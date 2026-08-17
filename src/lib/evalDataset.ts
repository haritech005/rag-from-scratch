/**
 * Evaluation Test Set for Phase 10 RAG Evaluation
 * Based on RAG.pdf (Retrieval-Augmented Generation Survey paper)
 */

export interface EvalQuestion {
  id: number;
  question: string;
  category: "Direct Factual" | "Semantic Retrieval" | "Paraphrased" | "Out of Scope" | "Distractor/Tricky";
  expectedBehavior: string;
}

export const EVAL_TEST_SET: EvalQuestion[] = [
  {
    id: 1,
    question: "What are the three research paradigms of RAG?",
    category: "Direct Factual",
    expectedBehavior: "Should retrieve chunks from Page 2/4 and answer: Naive RAG, Advanced RAG, and Modular RAG.",
  },
  {
    id: 2,
    question: "What are the three main components of the Naive RAG framework?",
    category: "Direct Factual",
    expectedBehavior: "Should retrieve chunks from Page 3/4 and identify indexing, retrieval, and generation.",
  },
  {
    id: 3,
    question: "How does RAG help overcome LLM pre-training data freshness and knowledge limitations?",
    category: "Semantic Retrieval",
    expectedBehavior: "Should retrieve chunks explaining external database integration to bridge knowledge gaps and reduce hallucinations.",
  },
  {
    id: 4,
    question: "What strategies are used during the post-retrieval process in Advanced RAG?",
    category: "Semantic Retrieval",
    expectedBehavior: "Should retrieve chunks from Page 4 discussing re-ranking context chunks and context compression.",
  },
  {
    id: 5,
    question: "What methods are used to improve indexing granularity before performing document search?",
    category: "Paraphrased",
    expectedBehavior: "Should map 'indexing granularity' to pre-retrieval strategies (data granularity, metadata addition, mixed retrieval).",
  },
  {
    id: 6,
    question: "How can vision and language models be integrated in multimodal retrieval augmented generation?",
    category: "Paraphrased",
    expectedBehavior: "Should retrieve multimodal RAG section (Page 16) mentioning models like RA-CM3 and BLIP-2.",
  },
  {
    id: 7,
    question: "What is the capital city of France?",
    category: "Out of Scope",
    expectedBehavior: "Should trigger strict fallback: 'The requested information was not found in the document.'",
  },
  {
    id: 8,
    question: "How does backpropagation work in deep convolutional neural networks?",
    category: "Out of Scope",
    expectedBehavior: "Should trigger strict fallback: 'The requested information was not found in the document.'",
  },
  {
    id: 9,
    question: "Does RAG eliminate 100% of memory overhead during LLM inference?",
    category: "Distractor/Tricky",
    expectedBehavior: "Should retrieve context clarifying RAG is cost-effective compared to pre-training without making false claims.",
  },
  {
    id: 10,
    question: "What functional modules does Modular RAG introduce beyond sequential retrieval and generation?",
    category: "Distractor/Tricky",
    expectedBehavior: "Should retrieve Modular RAG details (search module, fine-tuned retriever, iterative/adaptive retrieval).",
  },
];
