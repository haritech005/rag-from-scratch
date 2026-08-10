import React from "react";

export default function Home() {
  return (
    <div>
      <header style={{ marginBottom: "2rem" }}>
        <span className="badge">Phase 1: Architecture & Project Scaffolding</span>
        <h1 style={{ fontSize: "2rem", marginTop: "0.5rem" }}>
          Local PDF RAG Application
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Built with Next.js, Node.js, Ollama (<code style={{ color: "var(--accent-color)" }}>gemma3:4b</code> & <code style={{ color: "var(--accent-color)" }}>nomic-embed-text</code>), and JSON storage.
        </p>
      </header>

      <section className="card">
        <h2>RAG Architecture Pipeline Overview</h2>
        <p>
          This application split into two distinct pipelines designed to turn raw document content into contextual answers:
        </p>

        <div className="architecture-grid">
          <div className="step-card">
            <h3 style={{ color: "var(--accent-color)" }}>1. Ingestion Pipeline</h3>
            <p style={{ fontSize: "0.9rem" }}>
              Reads <code>RAG.pdf</code> &rarr; Extracts Text &rarr; Splits into Chunks &rarr; Generates Embeddings via <code>nomic-embed-text</code> &rarr; Saves to <code>data/vectors.json</code>.
            </p>
          </div>

          <div className="step-card">
            <h3 style={{ color: "var(--accent-color)" }}>2. Query Pipeline</h3>
            <p style={{ fontSize: "0.9rem" }}>
              Receives Question &rarr; Embeds Query &rarr; Calculates Cosine Similarity with JSON Vectors &rarr; Retrieves Top Chunks &rarr; Prompts <code>gemma3:4b</code> &rarr; Returns Answer.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Current Phase Status</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Phase 1 project structure setup complete. Core RAG pipeline modules (extraction, chunking, embedding, vector search, LLM generation) are structured and ready for step-by-step implementation in upcoming phases.
        </p>
      </section>
    </div>
  );
}
