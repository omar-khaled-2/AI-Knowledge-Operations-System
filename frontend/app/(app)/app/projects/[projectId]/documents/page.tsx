import { notFound } from "next/navigation"
import { getProject } from "@/app/(app)/app/projects/actions"
import { DocumentsClient } from "./documents-client"

export default async function DocumentsPage({
  params,
}: {
  params: { projectId: string }
}) {
  const project = await getProject(params.projectId)

  if (!project) {
    notFound()
  }

  return <DocumentsClient projectId={project.id} projectName={project.name} />
}
