# 🤖 Vanilla RAG Bot — Local PDF Question Answering System

A high-performance, 100% local, privacy-first Retrieval-Augmented Generation (RAG) web application built from first principles with **Next.js 15**, **React 19**, **Tailwind CSS**, and **Ollama**.

Without relying on heavy frameworks like LangChain or LlamaIndex, this repository demonstrates how to build a production-grade PDF RAG engine from scratch — featuring automated PDF text parsing, fixed-window chunking, 768-dimensional dense vector embeddings, vector similarity search, conversational history resolution, and grounded LLM generation with exact page citations.

---

## 🌟 Key Features

- 📂 **Automated PDF Upload & Vector Indexing**: Single-click PDF ingestion that automatically parses text pages, chunks content, and generates vector embeddings.
- 🔒 **100% Local & Privacy-Preserving**: Powered completely by local models via Ollama (`nomic-embed-text` for vector embeddings and `gemma3:4b` for LLM inference). Zero data leaves your machine.
- 💬 **Conversational Memory & Pronoun Resolution**: Maintains chat history to accurately resolve follow-up queries (e.g. *"What college did he study at?"* $\rightarrow$ *"Mention his graduation year"*).
- 🛡️ **Strict Grounding & Anti-Hallucination**: Enforces a Cosine Similarity threshold (`minScore = 0.40`). Out-of-scope questions (e.g., *"What is the capital of France?"*) trigger a clean fallback response: *"The requested information was not found in the document."*
- 📄 **Page-Level Citations**: Generates verifiable source badges and inline citations (e.g., `📄 Page 4`) referencing the exact pages where facts originated.
- 🎨 **Modern Dark Theme Interface**: Sleek two-column dashboard with drag-and-drop PDF dropzone, expandable document processing status, interactive chat bubbles, and formatted markdown rendering.

---

## 📐 RAG Pipeline Architecture

```
[ Upload PDF ] ──► [ 1. Text Extraction ] ──► [ 2. Fixed-Window Chunking ]
                          (pdf-parse)              (600 tokens, 100 overlap)
                                                               │
                                                               ▼
[ User Question ] ──► [ 4. Cosine Similarity ] ◄── [ 3. Vector Embeddings ]
       │                   (Top-K=5, minScore=0.40)      (nomic-embed-text 768-dim)
       ▼                               │
[ Pronoun Resolution ] ─────────────►  ▼
(Enrich Search Text)         [ 5. Grounded Prompting ] ──► [ 6. Local LLM Response ]
                               (Strict System Rules)           (gemma3:4b + Citations)
```

### Pipeline Breakdown
1. **Text Extraction ([`src/lib/pdf.ts`](file:///d:/AI/RAGbasic/src/lib/pdf.ts))**: Intercepts PDF pages line-by-line using `pdf-parse` to preserve exact page numbers (`ExtractedPage`).
2. **Chunking ([`src/lib/chunker.ts`](file:///d:/AI/RAGbasic/src/lib/chunker.ts))**: Splits document text into overlapping token windows (`chunkSize = 600`, `overlap = 100`) to balance semantic completeness with search precision.
3. **Dense Vector Embeddings ([`src/lib/ollama.ts`](file:///d:/AI/RAGbasic/src/lib/ollama.ts))**: Calls Ollama's `nomic-embed-text` API to convert text chunks into 768-dimensional floating-point vectors.
4. **Vector Similarity Search ([`src/lib/vectorSearch.ts`](file:///d:/AI/RAGbasic/src/lib/vectorSearch.ts))**: Computes Cosine Similarity between user query vectors and stored chunk vectors, filtering out noise below `minScore = 0.40` and ranking the Top 5 matches.
5. **Grounded LLM Inference ([`src/lib/ollama.ts`](file:///d:/AI/RAGbasic/src/lib/ollama.ts))**: Injects retrieved chunks and conversation history into a strict system prompt and streams response generation via Ollama `gemma3:4b`.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v3, PostCSS, Autoprefixer
- **PDF Parser**: `pdf-parse`, `pdf2json`
- **Embeddings Model**: `nomic-embed-text` (768 dimensions via local Ollama)
- **Generative LLM**: `gemma3:4b` (via local Ollama)

---

## 📁 Project Directory Structure

```
d:\AI\RAGbasic\
├── data/                         # Local JSON & active PDF vector storage
│   └── .gitkeep
├── src/
│   ├── app/                      # Next.js 15 App Router pages & API routes
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts      # POST /api/chat — Conversational RAG query
│   │   │   ├── document/
│   │   │   │   ├── route.ts      # DELETE /api/document — Clear active PDF index
│   │   │   │   └── status/
│   │   │   │       └── route.ts  # GET /api/document/status — Active PDF metadata
│   │   │   └── upload/
│   │   │       └── route.ts      # POST /api/upload — Single-click PDF upload & indexing
│   │   ├── globals.css           # Global Tailwind CSS directives
│   │   ├── layout.tsx            # App root layout
│   │   └── page.tsx              # Main dashboard hosting Sidebar & ChatArea
│   ├── components/               # React UI Components
│   │   ├── ChatArea.tsx          # Right panel message list & chat bar
│   │   ├── Icons.tsx             # Custom bounded SVG icon suite
│   │   └── Sidebar.tsx           # Left panel dropzone, PDF badge & processing status
│   ├── lib/                      # Core RAG Library Modules
│   │   ├── chunker.ts            # Text chunking algorithm
│   │   ├── ollama.ts             # Ollama API client & prompt builder
│   │   ├── pdf.ts                # PDF page text extractor
│   │   ├── storage.ts            # Local JSON file storage helpers
│   │   └── vectorSearch.ts       # Cosine similarity vector search engine
│   └── types/                    # TypeScript interfaces & API payload schemas
├── postcss.config.js             # PostCSS plugin configuration
├── tailwind.config.js            # Tailwind CSS content paths
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **Ollama** installed on your system.

- Install Ollama from [ollama.com](https://ollama.com)
- Pull the required embedding and LLM models:
```bash
ollama pull nomic-embed-text
ollama pull gemma3:4b
```
- Verify Ollama is running locally at `http://127.0.0.1:11434`.

---

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/haritech005/rag-from-scratch.git
cd rag-from-scratch
npm install
```

---

### 3. Running the Application

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 🔌 API Reference

### 1. Upload & Index PDF
- **Endpoint**: `POST /api/upload`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF file)
- **Response**:
```json
{
  "success": true,
  "message": "PDF uploaded and indexed successfully",
  "document": {
    "filename": "Hari Resume.pdf",
    "fileSize": "2.0MB",
    "totalPages": 1,
    "totalChunks": 3,
    "totalVectors": 3,
    "status": "ready"
  }
}
```

### 2. Conversational RAG Query
- **Endpoint**: `POST /api/chat`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "question": "Which college did Hari study at?",
  "chatHistory": []
}
```
- **Response**:
```json
{
  "success": true,
  "answer": "Hariharan J studied at Bishop Heber College, earning a Bachelor of Science in Computer Science between 2021 and 2024 [Page 1].",
  "sources": [
    { "file": "Hari Resume.pdf", "page": 1 }
  ],
  "retrievedChunksCount": 3
}
```

### 3. Check Document Status
- **Endpoint**: `GET /api/document/status`
- **Response**: Returns metadata and indexing status (`ready`, `processing`, or `none`).

### 4. Clear Active Document
- **Endpoint**: `DELETE /api/document`
- **Response**: Clears current PDF index for new document uploads.

---

## ⚙️ Empirical RAG Hyperparameter Defaults

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Chunk Size** | `600 tokens` | Balances semantic depth with vector retrieval precision. |
| **Chunk Overlap** | `100 tokens` | Prevents context fragmentation across chunk boundaries. |
| **Top-K** | `5` | Ensures high context recall for multi-part questions. |
| **Similarity Threshold (`minScore`)** | `0.40` | Eliminates irrelevant noise while allowing casual user phrasing & typos. |
| **Embedding Model** | `nomic-embed-text` | High-accuracy 768-dimensional dense vector embeddings. |
| **LLM Inference** | `gemma3:4b` | Fast local generation with strict context grounding rules. |

---

## 📄 License

This project is open-source under the MIT License.
