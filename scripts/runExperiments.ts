const BASE_URL = "http://localhost:3000";

const EXPERIMENTS = [
  {
    name: "Experiment A (Baseline)",
    chunkSize: 500,
    chunkOverlap: 100,
    topK: 3,
    minScore: 0.0,
    description: "Smaller chunks (500 tokens), Top-K=3, no similarity threshold.",
  },
  {
    name: "Experiment B (High Recall)",
    chunkSize: 800,
    chunkOverlap: 150,
    topK: 5,
    minScore: 0.0,
    description: "Larger chunks (800 tokens), Top-K=5 for higher context recall.",
  },
  {
    name: "Experiment C (High Precision Thresholding)",
    chunkSize: 600,
    chunkOverlap: 100,
    topK: 5,
    minScore: 0.65,
    description: "Medium chunks (600 tokens), Top-K=5, similarity threshold minScore=0.65 to filter noise.",
  },
];

async function runAllExperiments() {
  console.log("\n=======================================================");
  console.log("    PHASE 11: RAG QUALITY EXPERIMENTATION SUITE        ");
  console.log("=======================================================\n");

  const summary = [];

  for (const exp of EXPERIMENTS) {
    console.log(`\n>>> Executing ${exp.name}...`);
    console.log(`    ${exp.description}`);

    try {
      const res = await fetch(`${BASE_URL}/api/experiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exp),
      });

      const data = await res.json();
      if (!data.success) {
        console.error(`❌ Experiment failed: ${data.error}`);
        continue;
      }

      const result = data.experiment;
      console.log(`    ✓ Total Chunks Generated : ${result.totalChunksInStore}`);
      console.log(`    ✓ Avg Similarity Score   : ${result.avgSimilarityScore}`);
      console.log(`    ✓ Fallback Count (Out of Scope): ${result.fallbackCount}/10`);

      summary.push({
        name: exp.name,
        chunkSize: exp.chunkSize,
        overlap: exp.chunkOverlap,
        topK: exp.topK,
        minScore: exp.minScore,
        totalChunks: result.totalChunksInStore,
        avgSimilarityScore: result.avgSimilarityScore,
        fallbackCount: result.fallbackCount,
      });
    } catch (err: any) {
      console.error(`❌ Error running ${exp.name}:`, err.message);
    }
  }

  console.log("\n=======================================================");
  console.log("             EXPERIMENT COMPARISON SUMMARY             ");
  console.log("=======================================================");
  console.table(summary);
  console.log("=======================================================\n");
}

runAllExperiments();
