import { VendorDetailPage } from '@/modules/vendors/VendorDetailPage'

export function generateStaticParams() {
  return ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map((id) => ({ id }))
}

export default function VendorDetail({ params }: { params: { id: string } }) {
  return <VendorDetailPage id={params.id} />
}
