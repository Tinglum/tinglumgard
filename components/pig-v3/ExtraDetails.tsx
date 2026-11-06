'use client'

import { useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import styles from './pig-sales-v3.module.css'

export function ExtraDetails({ title, description, ideas, weight, price, label }: {
  title: string; description: string; ideas: string[]; weight: string; price: string; label: string
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 180) }
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button className={styles.extraInfo} onClick={event => { event.preventDefault(); enter() }} onMouseEnter={enter} onMouseLeave={leave} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) enter() }} onBlur={leave} aria-label={`${label}: ${title}`}>{title}<span aria-hidden> ⓘ</span></button></PopoverTrigger>
    <PopoverContent className={styles.extraPopover} sideOffset={10} collisionPadding={16} onMouseEnter={enter} onMouseLeave={leave} onOpenAutoFocus={event => event.preventDefault()}>
      <h4>{title}</h4><p>{description}</p>
      {ideas.length > 0 && <ul>{ideas.map(idea => <li key={idea}>{idea}</li>)}</ul>}
      <small>{weight}</small><strong>{price}</strong>
    </PopoverContent>
  </Popover>
}
