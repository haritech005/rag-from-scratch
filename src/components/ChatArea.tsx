"use client";

import React, { useState, useRef, useEffect } from "react";
import { DocumentMeta } from "@/lib/storage";
import { ChatMessage } from "@/types";
import { UserAvatarIcon, BotAvatarIcon, SendArrowIcon, SpinnerIcon, FilePdfIcon } from "./Icons";

interface ChatAreaProps {
  documentMeta: DocumentMeta | null;
  chatHistory: ChatMessage[];
  isQuerying: boolean;
  onSendMessage: (question: string) => void;
}

export default function ChatArea({
  documentMeta,
  chatHistory,
  isQuerying,
  onSendMessage,
}: ChatAreaProps) {
  const [inputQuery, setInputQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isQuerying]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying || !documentMeta) return;
    onSendMessage(inputQuery.trim());
    setInputQuery("");
  };

  /**
   * Simple inline Markdown & Citation renderer
   * Converts [Page X] into styled citation pills and formats **bold**, bullet points, and newlines.
   */
  const renderMessageContent = (text: string) => {
    const paragraphs = text.split("\n\n");

    return (
      <div className="space-y-3 text-slate-200 text-sm leading-relaxed">
        {paragraphs.map((para, pIdx) => {
          // Check for bullet lists
          if (para.startsWith("* ") || para.startsWith("- ")) {
            const listItems = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ul key={pIdx} className="list-disc list-inside space-y-1.5 pl-1 my-2">
                {listItems.map((item, iIdx) => (
                  <li key={iIdx}>{formatInlineFormatting(item.replace(/^[*-\s]+/, ""))}</li>
                ))}
              </ul>
            );
          }

          // Check for numbered lists
          if (/^\d+\.\s/.test(para)) {
            const listItems = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ol key={pIdx} className="list-decimal list-inside space-y-1.5 pl-1 my-2">
                {listItems.map((item, iIdx) => (
                  <li key={iIdx}>{formatInlineFormatting(item.replace(/^\d+\.\s*/, ""))}</li>
                ))}
              </ol>
            );
          }

          return <p key={pIdx}>{formatInlineFormatting(para)}</p>;
        })}
      </div>
    );
  };

  const formatInlineFormatting = (str: string) => {
    // Split by page citations like [Page X] or [Page X, Y]
    const citationRegex = /(\[Page\s+\d+(?:,\s*\d+)*\])/gi;
    const parts = str.split(citationRegex);

    return parts.map((part, idx) => {
      if (citationRegex.test(part)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-sm"
          >
            📄 {part.replace(/\[|\]/g, "")}
          </span>
        );
      }

      // Handle bold formatting **text**
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return (
            <strong key={bIdx} className="font-semibold text-slate-100">
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  return (
    <main className="flex-1 bg-[#101116] h-full flex flex-col justify-between overflow-hidden relative">
      {/* 1. Header Bar */}
      <header className="px-6 py-4 border-b border-[#20232e] bg-[#14161f] flex items-center justify-between flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <BotAvatarIcon className="w-8 h-8" />
          <div>
            <h1 className="text-sm font-bold text-slate-100">Vanilla RAG Assistant</h1>
            <p className="text-xs text-slate-400">Strictly grounded PDF Q&A system</p>
          </div>
        </div>

        {documentMeta ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="truncate max-w-[180px]">{documentMeta.filename}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>No document loaded</span>
          </div>
        )}
      </header>

      {/* 2. Messages List Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-6">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto select-none my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 shadow-lg">
              <BotAvatarIcon className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">
              What would you like to ask about your PDF?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {documentMeta
                ? `Active document "${documentMeta.filename}" is indexed and ready! Type your question below.`
                : "Please upload a PDF document on the left panel to begin asking grounded questions."}
            </p>

            {documentMeta && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full">
                <button
                  onClick={() => onSendMessage("What is the summary of this document?")}
                  className="p-3 bg-[#1a1c26] hover:bg-[#222533] border border-[#2b2e3e] rounded-xl text-xs text-slate-300 transition-all text-left"
                >
                  💡 "What is the summary of this document?"
                </button>
                <button
                  onClick={() => onSendMessage("What are the key points in this file?")}
                  className="p-3 bg-[#1a1c26] hover:bg-[#222533] border border-[#2b2e3e] rounded-xl text-xs text-slate-300 transition-all text-left"
                >
                  🔍 "What are the key points in this file?"
                </button>
              </div>
            )}
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 max-w-4xl mx-auto ${
                msg.role === "user" ? "flex-row" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {msg.role === "user" ? (
                  <UserAvatarIcon className="w-8 h-8" />
                ) : (
                  <BotAvatarIcon className="w-8 h-8" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div className="flex-1 min-w-0">
                {msg.role === "user" ? (
                  <div className="bg-[#20232e] text-slate-100 px-4 py-3 rounded-2xl rounded-tl-none border border-[#2d3140] text-sm shadow-sm inline-block max-w-full">
                    {msg.content}
                  </div>
                ) : (
                  <div className="bg-[#171922] border border-[#262a38] p-4 rounded-2xl rounded-tl-none shadow-md space-y-3">
                    {renderMessageContent(msg.content)}

                    {/* Sources Badge List */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-3 border-t border-[#262938] flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium">Source References:</span>
                        {msg.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-[#242836] border border-[#32374a] text-slate-300 font-mono text-[11px]"
                          >
                            Page {src.page}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isQuerying && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <BotAvatarIcon className="w-8 h-8 flex-shrink-0" />
            <div className="bg-[#171922] border border-[#262a38] px-4 py-3 rounded-2xl rounded-tl-none shadow-md flex items-center gap-3">
              <SpinnerIcon className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-300 font-medium">
                Searching vector index & generating answer...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Bottom Floating Chat Input Bar */}
      <footer className="p-4 md:px-12 bg-[#12141c] border-t border-[#20232e] flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isQuerying || !documentMeta}
            placeholder={
              documentMeta
                ? "What's up?"
                : "Please upload a PDF file on the left sidebar first..."
            }
            className="w-full bg-[#1c1e28] text-slate-100 placeholder-slate-500 text-sm px-5 py-3.5 pr-14 rounded-2xl border border-[#2c303f] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner transition-all"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isQuerying || !documentMeta}
            className="absolute right-2 p-2.5 rounded-xl bg-[#2d3142] hover:bg-[#383d52] active:scale-95 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
            title="Send Message"
          >
            <SendArrowIcon className="w-4 h-4 text-slate-200" />
          </button>
        </form>
      </footer>
    </main>
  );
}
