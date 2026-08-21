import type { Metadata } from 'next'
import { PresenterMode } from '@/components/quest/admin/PresenterMode'

export const metadata: Metadata = {
  title: 'Nutrition Fitness — Presenter',
  robots: { index: false, follow: false },
}

export default function QuestPresentPage() {
  return <PresenterMode />
}
