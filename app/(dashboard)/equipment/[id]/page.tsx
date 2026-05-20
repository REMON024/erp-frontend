import { EquipmentDetailPage } from '@/modules/equipment/EquipmentDetailPage'

export function generateStaticParams() {
  return ['eq1', 'eq2', 'eq3', 'eq4', 'eq5', 'eq6', 'eq7', 'eq8'].map((id) => ({ id }))
}

export default function EquipmentDetail({ params }: { params: { id: string } }) {
  return <EquipmentDetailPage id={params.id} />
}
