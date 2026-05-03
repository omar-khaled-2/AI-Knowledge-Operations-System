import { notFound } from "next/navigation";
import { getProject } from "@/app/(app)/app/projects/actions";
import { getSessions, type PaginatedSessionsResponse } from "./actions";
import { ChatSessionsClient } from "./chat-client";

export default async function ChatSessionsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProject(params.projectId);

  if (!project) {
    notFound();
  }

  // Fetch latest 20 sessions server-side with aggregation
  let sessions: PaginatedSessionsResponse["data"] = [];
  try {
    const result = await getSessions(params.projectId, {
      page: 1,
      limit: 20,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    sessions = result.data;
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
  }

  return (
    <ChatSessionsClient
      projectId={project.id}
      projectName={project.name}
      initialSessions={sessions}
    />
  );
}
