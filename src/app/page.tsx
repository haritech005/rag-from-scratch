"use client";

import React, { useState, useEffect } from "react";
import { ExtractedDocument, ChunkedDocument, TextChunk, LocalVectorStore } from "@/types";

export default function Home() {
  const [extractedData, setExtractedData] = useState<ExtractedDocument | null>(null);
  const [chunkData, setChunkData] = useState<ChunkedDocument | null>(null);
  const [embedData, setEmbedData] = useState<LocalVectorStore | null>(null);
  
  const [loadingExtract, setLoadingExtract] = useState<boolean>(false);
  const [loadingChunk, setLoadingChunk] = useState<boolean>(false);
  const [loadingEmbed, setLoadingEmbed] = useState<boolean>(false);
  
  const [extractStatus, setExtractStatus] = useState<string>("");
  const [chunkStatus, setChunkStatus] = useState<string>("");
  const [embedStatus, setEmbedStatus] = useState<string>("");

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedChunkId, setSelectedChunkId] = useState<string>("");
  const [selectedVectorId, setSelectedVectorId] = useState<string>("");

  // Phase 5 Similarity Search state
  const [searchQuery, setSearchQuery] = useState<string>("What are the main paradigms of RAG?");
  const [loadingQuery, setLoadingQuery] = useState<boolean>(false);
  const [queryStatus, setQueryStatus] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { chunkId: string; pageNumber: number; score: number; content: string }[] | null
  >(null);

  // Load existing data on mount
  useEffect(() => {
    // Load Phase 1
    fetch("/api/ingest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.document) {
          setExtractedData(data.document);
        }
      })
      .catch(() => {});

    // Load Phase 2
    fetch("/api/chunk")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setChunkData(resData.data);
          if (resData.data.chunks.length > 0) {
            setSelectedChunkId(resData.data.chunks[0].id);
          }
        }
      })
      .catch(() => {});

    // Load Phase 3
    fetch("/api/embed")
      .then((res) => res.json())
      .then((embedRes) => {
        if (embedRes.success && embedRes.data) {
          setEmbedData(embedRes.data);
          if (embedRes.data.vectors.length > 0) {
            setSelectedVectorId(embedRes.data.vectors[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleExtractPDF = async () => {
    setLoadingExtract(true);
    setExtractStatus("Extracting text page-by-page from RAG.pdf...");
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setExtractedData(data.document);
        setExtractStatus(`Successfully extracted ${data.document.totalPages} pages! Saved to data/extracted_pages.json`);
      } else {
        setExtractStatus(`Extraction Error: ${data.error}`);
      }
    } catch (err: any) {
      setExtractStatus(`Error: ${err.message}`);
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleGenerateChunks = async () => {
    setLoadingChunk(true);
    setChunkStatus("Splitting extracted pages into overlapping chunks (500-800 tokens)...");
    try {
      const res = await fetch("/api/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkSize: 600, overlap: 100 }),
      });
      const resData = await res.json();
      if (resData.success) {
        setChunkData(resData.data);
        if (resData.data.chunks.length > 0) {
          setSelectedChunkId(resData.data.chunks[0].id);
        }
        setChunkStatus(`Successfully created ${resData.data.totalChunks} chunks! Saved to data/chunks.json`);
      } else {
        setChunkStatus(`Chunking Error: ${resData.error}`);
      }
    } catch (err: any) {
      setChunkStatus(`Error: ${err.message}`);
    } finally {
      setLoadingChunk(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    setLoadingEmbed(true);
    setEmbedStatus("Connecting to Ollama & generating vector embeddings with nomic-embed-text...");
    try {
      const res = await fetch("/api/embed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Refresh embeddings data
        const getRes = await fetch("/api/embed");
        const getData = await getRes.json();
        if (getData.success && getData.data) {
          setEmbedData(getData.data);
          if (getData.data.vectors.length > 0) {
            setSelectedVectorId(getData.data.vectors[0].id);
          }
        }
        setEmbedStatus(`Successfully generated ${data.totalEmbeddings} embeddings! Saved to data/vectors.json`);
      } else {
        setEmbedStatus(`Embedding Error: ${data.error}`);
      }
    } catch (err: any) {
      setEmbedStatus(`Error: ${err.message}`);
    } finally {
      setLoadingEmbed(false);
    }
  };

  const handleSearchQuery = async () => {
    if (!searchQuery.trim()) return;
    setLoadingQuery(true);
    setQueryStatus("Embedding user question & calculating Cosine Similarity against all chunks...");
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: searchQuery, topK: 3 }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.retrievedChunks);
        setQueryStatus(`Successfully searched ${data.totalVectorsSearched} vectors! Retrieved Top ${data.topK} chunks.`);
      } else {
        setQueryStatus(`Search Error: ${data.error}`);
      }
    } catch (err: any) {
      setQueryStatus(`Error: ${err.message}`);
    } finally {
      setLoadingQuery(false);
    }
  };

  const currentSelectedChunk: TextChunk | undefined = chunkData?.chunks.find(
    (c) => c.id === selectedChunkId
  ) || chunkData?.chunks[0];

  const currentSelectedVector = embedData?.vectors.find(
    (v) => v.id === selectedVectorId
  ) || embedData?.vectors[0];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <span className="badge">Phase 1 to 5: RAG Pipeline & Similarity Search</span>
        <h1 style={{ fontSize: "2.2rem", marginTop: "0.5rem" }}>
          Local PDF RAG Application
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Extract PDF text, split into overlapping chunks, embed with <code>nomic-embed-text</code>, and perform Cosine Similarity search over local JSON store.
        </p>
      </header>

      {/* PHASE 1 SECTION */}
      <section className="card">
        <h2>Phase 1: Extract PDF Text</h2>
        <p>
          Process <code>RAG.pdf</code> on the backend and save raw page text into <code>data/extracted_pages.json</code>.
        </p>
        <button
          onClick={handleExtractPDF}
          disabled={loadingExtract}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loadingExtract ? "#30363d" : "var(--accent-color)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingExtract ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loadingExtract ? "Extracting PDF Pages..." : "Extract PDF Text Page-by-Page"}
        </button>

        {extractStatus && (
          <p style={{ marginTop: "1rem", color: "var(--accent-color)", fontWeight: 500 }}>
            {extractStatus}
          </p>
        )}
      </section>

      {/* PHASE 2 SECTION */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Phase 2: Generate Text Chunks</h2>
        <p>
          Split extracted text into overlapping chunks (~600 tokens target, ~100 tokens overlap) while keeping exact <code>pageNumber</code> citations.
        </p>
        <button
          onClick={handleGenerateChunks}
          disabled={loadingChunk}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loadingChunk ? "#30363d" : "#238636",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingChunk ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loadingChunk ? "Generating Text Chunks..." : "Generate Text Chunks (Phase 2)"}
        </button>

        {chunkStatus && (
          <p style={{ marginTop: "1rem", color: "#2ea043", fontWeight: 500 }}>
            {chunkStatus}
          </p>
        )}
      </section>

      {/* PHASE 3 SECTION */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Phase 3: Generate Vector Embeddings</h2>
        <p>
          Send each chunk to local Ollama API using <code>nomic-embed-text</code> model to generate 768-dimensional semantic embeddings. Stores vector output in <code>data/vectors.json</code>.
        </p>
        <button
          onClick={handleGenerateEmbeddings}
          disabled={loadingEmbed}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loadingEmbed ? "#30363d" : "#8957e5",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingEmbed ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loadingEmbed ? "Generating Vector Embeddings..." : "Generate Chunk Embeddings (Phase 3)"}
        </button>

        {embedStatus && (
          <p style={{ marginTop: "1rem", color: "#a5d6ff", fontWeight: 500 }}>
            {embedStatus}
          </p>
        )}
      </section>

      {/* PHASE 5 VECTOR SIMILARITY SEARCH SECTION */}
      <section className="card" style={{ marginTop: "1.5rem", borderColor: "#1f6feb" }}>
        <h2>Phase 5: Vector Similarity Search ⭐</h2>
        <p>
          Enter a user question. Converts question to vector embedding using <code>nomic-embed-text</code>, calculates Cosine Similarity against all stored chunk vectors in <code>data/vectors.json</code>, and retrieves the Top 3 most relevant chunks.
        </p>
        <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask a question about the document..."
            style={{
              flex: "1",
              minWidth: "280px",
              padding: "0.75rem 1rem",
              borderRadius: "6px",
              backgroundColor: "var(--code-bg)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={handleSearchQuery}
            disabled={loadingQuery}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: loadingQuery ? "#30363d" : "#1f6feb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loadingQuery ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {loadingQuery ? "Searching Vectors..." : "Search Top 3 Chunks (Cosine Similarity)"}
          </button>
        </div>

        {queryStatus && (
          <p style={{ marginTop: "1rem", color: "#58a6ff", fontWeight: 500 }}>
            {queryStatus}
          </p>
        )}

        {searchResults && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Top 3 Retrieved Chunks (Ranked by Cosine Similarity):</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.8rem" }}>
              {searchResults.map((item, idx) => (
                <div
                  key={item.chunkId + idx}
                  style={{
                    backgroundColor: "#0d1117",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: "#58a6ff" }}>
                      Rank #{idx + 1} — Chunk ID: {item.chunkId}
                    </span>
                    <span style={{ color: "#7ee787", fontWeight: 600 }}>
                      Similarity Score: {item.score}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      Source: Page {item.pageNumber}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.95rem", lineHeight: "1.5", color: "var(--text-main)" }}>
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>


      {/* PHASE 3 INSPECTOR */}
      {embedData && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Phase 3 Vector Embeddings Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <strong>Total Embedded Chunks:</strong> <br />
              <code>{embedData.totalChunks} vectors</code>
            </div>
            <div>
              <strong>Embedding Model:</strong> <br />
              <code>nomic-embed-text (Ollama)</code>
            </div>
            <div>
              <strong>Vector Dimensions:</strong> <br />
              <code>{embedData.vectors[0]?.embedding.length || 768} dimensions</code>
            </div>
            <div>
              <strong>Saved Path:</strong> <br />
              <code>data/vectors.json</code>
            </div>
          </div>

          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor="vector-select">Select Vector Chunk ID:</label>
            <select
              id="vector-select"
              value={selectedVectorId}
              onChange={(e) => setSelectedVectorId(e.target.value)}
              style={{
                padding: "0.5rem 0.8rem",
                borderRadius: "4px",
                backgroundColor: "var(--code-bg)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              {embedData.vectors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} (Page {v.pageNumber} - {v.embedding.length} dims)
                </option>
              ))}
            </select>
          </div>

          {currentSelectedVector && (
            <div style={{ backgroundColor: "var(--code-bg)", padding: "1rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                <strong>Vector ID:</strong> {currentSelectedVector.id} | <strong>Page:</strong> {currentSelectedVector.pageNumber} | <strong>Dimensions:</strong> {currentSelectedVector.embedding.length}
              </div>
              <div style={{ padding: "0.8rem", backgroundColor: "#0d1117", borderRadius: "4px", fontSize: "0.9rem", marginBottom: "0.8rem" }}>
                <strong>Chunk Text:</strong> {currentSelectedVector.content.slice(0, 200)}...
              </div>
              <div style={{ padding: "0.8rem", backgroundColor: "#040d21", borderRadius: "4px", fontSize: "0.85rem", color: "#7ee787", overflowX: "auto" }}>
                <strong>Embedding Vector (first 10 of 768 values):</strong>
                <pre style={{ margin: "0.5rem 0 0 0" }}>
                  {JSON.stringify(currentSelectedVector.embedding.slice(0, 10), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PHASE 2 INSPECTOR & DISPLAY */}
      {chunkData && (
        <>
          <section className="card" style={{ marginTop: "1.5rem" }}>
            <h2>Phase 2 Overview: Chunks Dataset</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <strong>Total Chunks Produced:</strong> <br />
                <code>{chunkData.totalChunks} chunks</code>
              </div>
              <div>
                <strong>Target Chunk Size:</strong> <br />
                <code>~{chunkData.chunkSizeTokens} tokens (~2400 chars)</code>
              </div>
              <div>
                <strong>Chunk Overlap:</strong> <br />
                <code>~{chunkData.chunkOverlapTokens} tokens (~400 chars)</code>
              </div>
              <div>
                <strong>Saved File:</strong> <br />
                <code>data/chunks.json</code>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: "1.5rem" }}>
            <h2>Inspect Chunks Line-by-Line</h2>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="chunk-select">Select Chunk ID to View:</label>
              <select
                id="chunk-select"
                value={selectedChunkId}
                onChange={(e) => setSelectedChunkId(e.target.value)}
                style={{
                  padding: "0.5rem 0.8rem",
                  borderRadius: "4px",
                  backgroundColor: "var(--code-bg)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {chunkData.chunks.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} (Page {c.pageNumber} - {c.charCount} chars / ~{c.tokenCount} tokens)
                  </option>
                ))}
              </select>
            </div>

            {currentSelectedChunk && (
              <div style={{ backgroundColor: "var(--code-bg)", padding: "1rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  <span><strong>Chunk ID:</strong> {currentSelectedChunk.id}</span>
                  <span><strong>Source Page:</strong> Page {currentSelectedChunk.pageNumber}</span>
                  <span><strong>Length:</strong> {currentSelectedChunk.charCount} characters (~{currentSelectedChunk.tokenCount} tokens)</span>
                </div>
                <div style={{ padding: "0.8rem", backgroundColor: "#0d1117", borderRadius: "4px", fontSize: "0.95rem", lineHeight: "1.5" }}>
                  {currentSelectedChunk.content}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* PHASE 1 EXTRACTED PAGE PREVIEW */}
      {extractedData && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Phase 1 Source Page Preview</h2>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label htmlFor="page-select">Select Source Page:</label>
            <select
              id="page-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(Number(e.target.value))}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                backgroundColor: "var(--code-bg)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              {extractedData.pages.map((p) => (
                <option key={p.page} value={p.page}>
                  Page {p.page}
                </option>
              ))}
            </select>
          </div>
          <pre
            style={{
              backgroundColor: "var(--code-bg)",
              padding: "1rem",
              borderRadius: "6px",
              overflowX: "auto",
              maxHeight: "250px",
              fontSize: "0.85rem",
              border: "1px solid var(--border-color)",
            }}
          >
            {JSON.stringify(
              extractedData.pages.find((p) => p.page === selectedPage) || extractedData.pages[0],
              null,
              2
            )}
          </pre>
        </section>
      )}
    </div>
  );
}

