import { notFound } from "next/navigation";
import { getProject } from "@/app/(app)/app/projects/actions";
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

  return (
    <ChatSessionsClient
      projectId={project.id}
      projectName={project.name}
    />
  );
}
