import type { Metadata } from 'next'
import { QuestExperience } from '@/components/quest/QuestExperience'

export const metadata: Metadata = {
  title: 'Nutrition Fitness Assessment',
  description: 'A reflective assessment of nutrition awareness, consistency and adaptability.',
  robots: { index: false, follow: false },
}

export default function QuestPage() {
  return <QuestExperience />
}
