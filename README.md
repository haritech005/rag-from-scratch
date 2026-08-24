# Vanilla RAG Bot — Local PDF Question Answering System

A lightweight, privacy-first Retrieval-Augmented Generation (RAG) web application built from first principles using Next.js 15, React 19, Tailwind CSS, and local Ollama models.

This application enables users to upload PDF documents and ask questions grounded strictly in the document context. It handles PDF parsing, fixed-window text chunking, dense vector embeddings, vector similarity search, conversational history resolution, and answer generation with exact page-level citations.

---
## Features

- **Automated PDF Indexing**: Upload any text-based PDF to automatically parse pages, chunk text, and generate vector embeddings.
- **Local & Private Execution**: Powered entirely by local models via Ollama (`nomic-embed-text` for vector embeddings and `gemma3:4b` for LLM inference). No external API keys or cloud dependencies.
- **Conversational Memory**: Maintains chat history to resolve follow-up questions and pronouns (e.g., "What college did he attend?" followed by "Mention his graduation year").
- **Strict Context Grounding**: Enforces a Cosine Similarity threshold (`minScore = 0.40`). Out-of-scope questions cleanly trigger a fallback refusal message rather than generating hallucinations.
- **Page Citations**: Every response includes verifiable source tags referencing the exact document page numbers.
- **Dark Theme Interface**: Clean two-column user interface with a drag-and-drop file uploader, document metadata status, and markdown chat rendering.

---

## System Architecture

```
[ PDF Document ] -> [ 1. Text Parsing ] -> [ 2. Text Chunking ]
                         (pdf-parse)         (600 tokens, 100 overlap)
                                                         |
                                                         v
[ User Question ] -> [ 4. Cosine Similarity ] <- [ 3. Vector Store ]
       |                (Top-K=5, minScore=0.40)   (nomic-embed-text 768-dim)
       v                         |
[ History Resolution ] ---------> v
  (Enrich Query)        [ 5. Grounded Prompt ] -> [ 6. LLM Generation ]
                          (Strict Rules)             (gemma3:4b)
```

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v3, PostCSS, Autoprefixer
- **PDF Parser**: `pdf-parse`
- **Embedding Model**: `nomic-embed-text` (768 dimensions via Ollama)
- **Generative Model**: `gemma3:4b` (via Ollama)

---

## Quick Start

### 1. Prerequisites
Install [Node.js](https://nodejs.org) (v18+) and [Ollama](https://ollama.com).

Pull the required local models:
```bash
ollama pull nomic-embed-text
ollama pull gemma3:4b
```

### 2. Installation
```bash
git clone https://github.com/haritech005/rag-from-scratch.git
cd rag-from-scratch
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Accepts a PDF file (`FormData`), extracts text, generates vector embeddings, and initializes the document index. |
| `POST` | `/api/chat` | Receives user question and chat history, executes vector search, and returns grounded answer with page citations. |
| `GET` | `/api/document/status` | Returns the current active document status and metadata. |
| `DELETE` | `/api/document` | Clears the current document index and vector store. |

---

## RAG Hyperparameters

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Chunk Size** | 600 tokens | Balances semantic context with search precision. |
| **Chunk Overlap** | 100 tokens | Prevents information cutoff across chunk boundaries. |
| **Top-K** | 5 | Ensures sufficient context for complex queries. |
| **Similarity Threshold** | 0.40 | Filters low-confidence noise while accommodating casual query phrasing. |

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/          # Production API routes (upload, chat, document)
│   │   ├── globals.css   # Global styles and Tailwind imports
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main application page
│   ├── components/
│   │   ├── ChatArea.tsx  # Message history and input interface
│   │   ├── Icons.tsx     # Bounded SVG icons
│   │   └── Sidebar.tsx   # File dropzone and document status panel
│   ├── lib/
│   │   ├── chunker.ts    # Text chunking implementation
│   │   ├── ollama.ts     # Ollama API client and prompt construction
│   │   ├── pdf.ts        # PDF parsing utility
│   │   ├── storage.ts    # Local JSON storage handlers
│   │   └── vectorSearch.ts # Cosine similarity search engine
│   └── types/            # TypeScript type definitions
└── package.json
```

## Features<img width="1917" height="1133" alt="Screenshot 2026-08-24 192428" src="https://github.com/user-attachments/assets/4f44995b-edb9-4f5b-acfe-2ba30077c58e" />

---

## License

MIT
