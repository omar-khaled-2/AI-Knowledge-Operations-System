"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Search,
  Send,
  BookOpen,
  User,
  Bot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Session } from "@/lib/mock-data";

interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: Array<{
    id: string;
    documentName: string;
    pageNumber?: number;
    snippet: string;
  }>;
}

interface Project {
  id: string;
  name: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChatMessageComponent({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-[#0a0a0a]" : "bg-[#f5f0e0] border border-[#e5e5e5]",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-[#6a6a6a]" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5",
            isUser ? "bg-[#0a0a0a] text-white" : "bg-[#f5f0e0] text-[#0a0a0a]",
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#9a9a9a]">Sources</p>
            {message.sources.map((source) => (
              <button
                key={source.id}
                className="flex items-center gap-2 text-xs text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors bg-[#fffaf0] border border-[#e5e5e5] rounded-lg px-3 py-2 w-full text-left"
              >
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {source.documentName}
                  {source.pageNumber && ` · p.${source.pageNumber}`}
                </span>
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-[#9a9a9a]">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

interface ChatClientProps {
  project: Project;
  session: Session;
  allSessions: Session[];
  initialMessages: Message[];
}

export function ChatClient({
  project,
  session,
  allSessions,
  initialMessages,
}: ChatClientProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>(initialMessages);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [inputValue]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sessionId: session.id,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        sessionId: session.id,
        role: "assistant",
        content: `I&apos;ve analyzed your question about "${newMessage.content}". Based on the available documents and previous conversations, here&apos;s what I found:\n\nThis is a simulated response. In the actual implementation, this would query the vector database and generate a contextual answer based on your project&apos;s knowledge base.`,
        timestamp: new Date().toISOString(),
        sources: [
          {
            id: "src-sim",
            documentName: "Relevant Document",
            snippet: "Matching content...",
          },
        ],
      };
      setChatMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredSessions = searchQuery
    ? allSessions.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.preview?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : allSessions;

  return (
    <div className="h-screen flex">
      {/* Chat Sidebar */}
      <div className="w-[280px] bg-[#faf5e8] border-r border-[#e5e5e5] hidden lg:flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#e5e5e5] space-y-3">
          <Link
            href={`/app/projects/${project.id}/chat`}
            className="flex items-center gap-2 text-sm text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All conversations
          </Link>
          <Link
            href={`/app/projects/${project.id}/chat/new`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold hover:bg-[#1f1f1f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-[#fffaf0] border border-[#e5e5e5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {filteredSessions.map((s) => (
            <Link
              key={s.id}
              href={`/app/projects/${project.id}/chat/${s.id}`}
              className={cn(
                "flex items-start gap-3 px-4 py-3 mx-2 rounded-xl transition-colors",
                s.id === session.id ? "bg-[#f5f0e0]" : "hover:bg-[#f5f0e0]/50",
              )}
            >
              <MessageSquare className="h-4 w-4 text-[#6a6a6a] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm truncate",
                    s.id === session.id
                      ? "font-medium text-[#0a0a0a]"
                      : "text-[#3a3a3a]",
                  )}
                >
                  {s.name}
                </p>
                <p className="text-xs text-[#9a9a9a] truncate">{s.preview || "No messages yet"}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-[#e5e5e5] bg-[#fffaf0]">
          <Link
            href={`/app/projects/${project.id}/chat`}
            className="lg:hidden p-2 hover:bg-[#f5f0e0] rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[#0a0a0a] truncate">
              {session.name}
            </h2>
            <p className="text-xs text-[#9a9a9a]">
              {chatMessages.length} messages · {project.name}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 space-y-6">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f0e0] flex items-center justify-center mx-auto">
                  <MessageSquare className="h-6 w-6 text-[#6a6a6a]" />
                </div>
                <p className="text-[#6a6a6a]">Start a new conversation</p>
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-[#6a6a6a]" />
              </div>
              <div className="bg-[#f5f0e0] rounded-2xl px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#6a6a6a]" />
                  <span className="text-sm text-[#6a6a6a]">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#e5e5e5] bg-[#fffaf0] px-4 lg:px-6 py-4">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your project..."
              rows={1}
              className="flex-1 min-h-[44px] max-h-[200px] px-4 py-3 bg-[#fffaf0] border border-[#e5e5e5] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-[#0a0a0a] text-white hover:bg-[#1f1f1f]"
                  : "bg-[#e5e5e5] text-[#9a9a9a] cursor-not-allowed",
              )}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-[#9a9a9a] text-center mt-2">
            AI responses are generated based on your project knowledge
          </p>
        </div>
      </div>
    </div>
  );
}
