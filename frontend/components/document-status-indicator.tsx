'use client'

import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useDocumentStatus } from '@/hooks/use-websocket-event'
import { cn } from '@/lib/utils'

interface DocumentStatusIndicatorProps {
  documentId: string
  className?: string
}

const statusConfig = {
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  processed: {
    label: 'Processed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  embedded: {
    label: 'Embedded',
    icon: Database,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
} as const

export function DocumentStatusIndicator({
  documentId,
  className,
}: DocumentStatusIndicatorProps) {
  const status = useDocumentStatus(documentId)

  // Don't render anything if no status has been received
  if (!status) {
    return null
  }

  const config = statusConfig[status.status]
  const Icon = config.icon
  const isProcessing = status.status === 'processing'
  const hasError = status.status === 'error'

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-2 rounded-lg border px-3 py-2',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn('h-4 w-4', config.color, isProcessing && 'animate-spin')}
        />
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
      </div>

      {isProcessing && typeof status.progress === 'number' && (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, status.progress))}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(status.progress)}%
          </span>
        </div>
      )}

      {hasError && status.error && (
        <p className="text-xs text-red-600">{status.error}</p>
      )}
    </div>
  )
}
