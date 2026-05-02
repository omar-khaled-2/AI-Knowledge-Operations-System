'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

interface Source {
  documentId: string
  title: string
  snippet: string
  score: number
}

interface ChatSourcesProps {
  sources: Source[]
}

export function ChatSources({ sources }: ChatSourcesProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-[#faf5e8] rounded-xl border border-[#e5e5e5] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#6a6a6a] hover:bg-[#f5f0e0] transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Sources ({sources.length})
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {sources.map((source, index) => (
            <div
              key={source.documentId}
              className="bg-white rounded-lg p-3 border border-[#e5e5e5]"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-[#0a0a0a]">
                  {index + 1}. {source.title}
                </h4>
                <span className="text-xs text-[#9a9a9a]">
                  {Math.round(source.score * 100)}% match
                </span>
              </div>
              <p className="text-xs text-[#6a6a6a] line-clamp-2">
                {source.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
