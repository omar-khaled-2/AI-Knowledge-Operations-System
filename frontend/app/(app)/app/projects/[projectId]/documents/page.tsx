import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getProject } from "@/app/(app)/app/projects/actions"
import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { UploadButton } from "./upload-button"
import { DocumentList } from "./document-list"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"

function DocumentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}

export default async function DocumentsPage({
  params,
}: {
  params: { projectId: string }
}) {
  const project = await getProject(params.projectId)

  if (!project) {
    notFound()
  }

  return (
    <div className="p-4 lg:p-8 flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Documents"
        action={<UploadButton projectId={project.id} />}
      >
        <Breadcrumbs projectId={project.id} projectName={project.name} section="documents" />
      </PageHeader>

      <Suspense fallback={<DocumentsLoading />}>
        <DocumentList projectId={project.id} />
      </Suspense>
    </div>
  )
}
