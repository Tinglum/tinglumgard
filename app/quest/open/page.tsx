import type { Metadata } from 'next'
import { OpenAssessment } from '@/components/quest/OpenAssessment'

export const metadata: Metadata = {
  title: 'Nutrition Fitness Assessment',
  description: 'A reflective assessment of nutrition awareness, consistency and adaptability. 25 questions, about ten minutes.',
}

export default function OpenQuestPage() {
  return <OpenAssessment />
}
