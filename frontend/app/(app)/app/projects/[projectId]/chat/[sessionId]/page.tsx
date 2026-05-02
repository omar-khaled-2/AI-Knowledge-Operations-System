import { notFound } from "next/navigation";
import { getProject } from "@/app/(app)/app/projects/actions";
import { getSession, getSessions, getMessages } from "../actions";
import { ChatClient } from "./chat-client";

export default async function ChatSessionPage({
  params,
}: {
  params: { projectId: string; sessionId: string };
}) {
  // Fetch project, session, all sessions, and messages in parallel
  const [project, session, sessionsResult, messagesResult] = await Promise.all([
    getProject(params.projectId),
    getSession(params.sessionId),
    getSessions(params.projectId, {
      page: 1,
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    getMessages(params.sessionId, { page: 1, limit: 100 }).catch(() => ({ messages: [], total: 0 })),
  ]);

  if (!project) {
    notFound();
  }

  if (!session) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0a0a0a]">Session not found</h1>
        <p className="text-[#6a6a6a] mt-2">
          The session you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <a
          href={`/app/projects/${params.projectId}/chat`}
          className="text-[#6a6a6a] hover:text-[#0a0a0a] mt-4 inline-block"
        >
          ← Back to conversations
        </a>
      </div>
    );
  }

  // Map backend message format to frontend message format
  const initialMessages = messagesResult.messages.map((msg) => ({
    id: msg.id,
    sessionId: msg.sessionId,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: msg.createdAt,
    sources: msg.sources?.map((source) => ({
      id: source.documentId,
      documentName: source.title,
      snippet: source.snippet,
    })),
  }));

  return (
    <ChatClient
      project={{ id: project.id, name: project.name }}
      session={session}
      allSessions={sessionsResult.data}
      initialMessages={initialMessages}
    />
  );
}
