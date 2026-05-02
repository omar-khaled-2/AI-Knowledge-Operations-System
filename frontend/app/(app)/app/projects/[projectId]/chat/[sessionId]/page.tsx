import { notFound } from "next/navigation";
import { getProject } from "@/app/(app)/app/projects/actions";
import { getSession, getSessions } from "../actions";
import { ChatClient } from "./chat-client";

export default async function ChatSessionPage({
  params,
}: {
  params: { projectId: string; sessionId: string };
}) {
  // Fetch project, session, and all sessions in parallel
  const [project, session, sessionsResult] = await Promise.all([
    getProject(params.projectId),
    getSession(params.sessionId),
    getSessions(params.projectId, {
      page: 1,
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
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

  // TODO: Replace with real messages when messages API is available
  const initialMessages: any[] = [];

  return (
    <ChatClient
      project={{ id: project.id, name: project.name }}
      session={session}
      allSessions={sessionsResult.data}
      initialMessages={initialMessages}
    />
  );
}
