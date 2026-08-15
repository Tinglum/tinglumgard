import type { Metadata } from 'next'
import { QuestAdmin } from '@/components/quest/QuestAdmin'

export const metadata: Metadata = { title: 'Nutrition Fitness — Live admin', robots: { index: false, follow: false } }

export default function QuestAdminPage() {
  return <QuestAdmin />
}
