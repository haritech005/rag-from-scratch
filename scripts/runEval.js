const fs = require('fs');
const path = require('path');

const EVAL_SET = [
  { id: 1, category: "Direct Factual", question: "What are the three research paradigms of RAG?" },
  { id: 2, category: "Direct Factual", question: "What are the three main components of the Naive RAG framework?" },
  { id: 3, category: "Semantic Retrieval", question: "How does RAG help overcome LLM pre-training data freshness and knowledge limitations?" },
  { id: 4, category: "Semantic Retrieval", question: "What strategies are used during the post-retrieval process in Advanced RAG?" },
  { id: 5, category: "Paraphrased", question: "What methods are used to improve indexing granularity before performing document search?" },
  { id: 6, category: "Paraphrased", question: "How can vision and language models be integrated in multimodal retrieval augmented generation?" },
  { id: 7, category: "Out of Scope", question: "What is the capital city of France?" },
  { id: 8, category: "Out of Scope", question: "How does backpropagation work in deep convolutional neural networks?" },
  { id: 9, category: "Distractor/Tricky", question: "Does RAG eliminate 100% of memory overhead during LLM inference?" },
  { id: 10, category: "Distractor/Tricky", question: "What functional modules does Modular RAG introduce beyond sequential retrieval and generation?" }
];

async function main() {
  console.log("=== PHASE 10 RAG EVALUATION RUNNER ===");
  const results = [];

  for (const item of EVAL_SET) {
    console.log(`Evaluating [Q${item.id}/10] (${item.category}): "${item.question}"...`);
    try {
      const res = await fetch("http://localhost:3000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: item.question, topK: 3 })
      });
      const data = await res.json();
      const answer = data.answer || "";
      const isFallback = answer.includes("not found in the document");
      results.push({
        id: item.id,
        category: item.category,
        question: item.question,
        retrievedChunks: (data.retrievedChunks || []).map(c => ({ chunkId: c.chunkId, pageNumber: c.pageNumber, score: c.score })),
        generatedAnswer: answer,
        sources: data.sources || [],
        isFallbackTriggered: isFallback
      });
      console.log(`  └ Answer length: ${answer.length} chars | Fallback: ${isFallback}`);
    } catch (err) {
      console.error(`  └ Error: ${err.message}`);
    }
  }

  const report = { evaluatedAt: new Date().toISOString(), totalQuestions: results.length, results };
  const dataDir = path.join(__dirname, "..", "data");
  fs.writeFileSync(path.join(dataDir, "eval_results.json"), JSON.stringify(report, null, 2));
  console.log("✓ Evaluation complete! Saved to data/eval_results.json");
}

main();
