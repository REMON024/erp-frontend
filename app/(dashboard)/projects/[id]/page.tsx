import { ProjectDetailPage } from '@/modules/projects/ProjectDetailPage'

export function generateStaticParams() {
  return ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id }))
}

export default function ProjectDetail({ params }: { params: { id: string } }) {
  return <ProjectDetailPage id={params.id} />
}
