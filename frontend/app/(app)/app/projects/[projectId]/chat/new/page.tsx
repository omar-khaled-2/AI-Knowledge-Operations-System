import { notFound, redirect } from "next/navigation";
import { getProject } from "@/app/(app)/app/projects/actions";
import { createSession } from "../actions";

export default async function NewChatPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProject(params.projectId);

  if (!project) {
    notFound();
  }

  // Create a new session with a default name
  const session = await createSession({
    name: "New Chat",
    projectId: project.id,
  });

  // Redirect to the new session
  redirect(`/app/projects/${project.id}/chat/${session.id}`);
}
