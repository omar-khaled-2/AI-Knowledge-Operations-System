# Chat Session Resource Snippets - Design Document

**Date:** 2026-05-03
**Feature:** Inline Resource Snippet Display in Chat Sessions List
**Status:** Ready for Review

---

## Overview

Enable users to view referenced document snippets/chunks directly within the chat sessions list without navigating away from the page. This provides immediate context about what documents were referenced in each conversation, improving information discovery and reducing context switching.

## Problem Statement

Currently, the chat sessions list only shows conversation names, message counts, and last updated timestamps. Users cannot see which documents or knowledge sources were referenced in each conversation without opening the individual chat. This creates friction when trying to:
- Quickly identify which conversation contains information about a specific document
- Review what sources were consulted across multiple conversations
- Find relevant past discussions without opening each one

## Solution: Inline Snippet Expansion

### User Experience

1. **Collapsed State (Default):**
   - Each session item displays a subtle resource indicator showing the count of referenced chunks
   - Example: "📎 3 referenced chunks" or a document icon with count badge
   - Indicator positioned inline with existing metadata (message count, timestamp)
   - Visual treatment is subtle to avoid cluttering the list

2. **Expanded State (On Click):**
   - Clicking the resource indicator expands a panel below the session item
   - Panel displays a list of referenced document snippets
   - Each snippet card shows:
     - **Document name** (bold, truncated with ellipsis if too long)
     - **Page/section number** (optional, displayed as a small badge)
     - **Snippet text** (truncated to ~150-200 characters with "..." ellipsis)
   - Clean card layout with subtle borders/separators
   - No navigation links or buttons - purely informational display

3. **Interaction Patterns:**
   - **Expand/Collapse:** Click resource indicator to toggle expansion
   - **Single Expansion:** Only one session can be expanded at a time (clicking another collapses previous)
   - **Collapse All:** Click expanded session again or click outside to collapse
   - **Smooth Animation:** CSS transition for expand/collapse (max-height or opacity)

### Data Requirements

**Backend Changes Required:**

The session list API response must include `sources` array for each session:

```typescript
interface Session {
  id: string;
  projectId: string;
  name: string;
  messageCount: number;
  updatedAt: string;
  preview: string;
  sources?: SourceCitation[];  // NEW FIELD
}

interface SourceCitation {
  id: string;
  documentName: string;
  pageNumber?: number;
  snippet: string;
}
```

**Data Flow:**
1. Backend aggregates all unique sources referenced across all messages in a session
2. Returns up to 5 most relevant sources per session (based on recency or relevance score)
3. Frontend receives sources as part of the paginated sessions response

### UI Component Design

**New Components:**

1. **ResourceIndicator** (`components/resource-indicator.tsx`):
   - Displays count of referenced resources
   - Icon (Paperclip or FileText from lucide-react)
   - Badge with count
   - Clickable to toggle expansion
   - Visual state for expanded/collapsed

2. **SnippetCard** (`components/snippet-card.tsx`):
   - Individual snippet display component
   - Props: `documentName`, `pageNumber?`, `snippet`
   - Truncates snippet text with CSS line-clamp or substring
   - Subtle border/background to distinguish from session item

3. **ResourcePanel** (`components/resource-panel.tsx`):
   - Container for expanded snippet list
   - Receives array of `SourceCitation`
   - Renders list of `SnippetCard` components
   - Animate presence for expand/collapse
   - "+N more" indicator if sources exceed display limit

**Modified Components:**

1. **ListItem** (`@/components/list-container`):
   - May need style adjustments to accommodate expanded content
   - Ensure proper spacing when panel is open

2. **ChatSessionsClient** (`chat-client.tsx`):
   - Track expanded session ID in state
   - Render `ResourcePanel` conditionally for expanded session
   - Pass `sources` data to session items

### State Management

```typescript
// In ChatSessionsClient
const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

const toggleExpansion = (sessionId: string) => {
  setExpandedSessionId(prev => prev === sessionId ? null : sessionId);
};
```

### Styling Specifications

- **Resource Indicator:**
  - Icon size: 14px
  - Count badge: small, muted color
  - Hover: slight color change to indicate interactivity
  - Active/Expanded: different color to show state

- **Snippet Cards:**
  - Padding: 12px-16px
  - Background: slightly different from session item (subtle contrast)
  - Border: 1px solid muted color, rounded corners (8px)
  - Document name: 14px, font-weight 600, text-ink
  - Page number: 12px, badge style, muted background
  - Snippet text: 13px, text-muted-foreground, line-height 1.5
  - Max snippet display: 2-3 lines with ellipsis

- **Resource Panel:**
  - Padding top: 12px to separate from session item
  - Gap between cards: 8px
  - Animation: 200ms ease-in-out for height transition

### Edge Cases & Error Handling

1. **No Resources:**
   - Hide resource indicator entirely if `sources` is empty or undefined
   - Session item looks exactly as it does now

2. **Many Resources:**
   - Show max 3-5 snippet cards
   - Display "+N more referenced" text if additional sources exist
   - Do NOT implement "load more" - keep it simple

3. **Long Snippets:**
   - Truncate to ~150 characters with "..."
   - Use CSS line-clamp for multi-line truncation (2 lines max)

4. **Long Document Names:**
   - Truncate with ellipsis (max-width or CSS truncation)
   - Full name shown on hover via title attribute

5. **API Missing Sources Field:**
   - Frontend handles gracefully - treats as no sources
   - Backward compatible with existing API responses

### Accessibility

- Resource indicator is a button element (not div)
- aria-expanded attribute on indicator
- aria-controls linking indicator to panel
- Keyboard accessible (Enter/Space to toggle)
- Focus visible styles
- Screen reader announces "3 referenced chunks, collapsed"

### Performance Considerations

- Sources included in initial paginated response - no additional API calls
- Panel content rendered conditionally (not in DOM when collapsed)
- CSS transitions use transform/opacity for GPU acceleration
- No impact on initial page load performance

## Out of Scope

- Navigation to document detail pages
- Full-text search within snippets
- Filtering sessions by resource
- Resource management (add/remove/edit)
- Real-time resource updates
- Resource preview thumbnails

## Success Criteria

- [ ] Users can see resource count on each session item
- [ ] Clicking resource indicator expands snippet panel
- [ ] Snippet panel shows document name, page number, and snippet text
- [ ] Only one session expanded at a time
- [ ] Smooth expand/collapse animation
- [ ] Works on mobile and desktop
- [ ] Graceful handling of sessions with no resources
- [ ] Accessible via keyboard and screen readers

## Dependencies

- Backend API must include `sources` field in session list response
- Existing lucide-react icons (Paperclip, FileText)
- Existing UI components (ListItem, ListContainer)
- Tailwind CSS for styling

## Open Questions

1. Should we show the most recent sources or most relevant sources per session?
2. What is the maximum snippet length to display?
3. Should page numbers be shown for all document types or only PDFs?

## Approval

**Status:** Pending Review

**Reviewer Notes:**

---
