import { ContractorDetailPage } from '@/modules/contractors/ContractorDetailPage'

export function generateStaticParams() {
  return ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => ({ id }))
}

export default function ContractorDetail({ params }: { params: { id: string } }) {
  return <ContractorDetailPage id={params.id} />
}
