import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

type ActionMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  buttonClassName?: string
  menuClassName?: string
  iconClassName?: string
}

const defaultMenuClassName =
  'w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800'

export function ActionMenu({
  open,
  onOpenChange,
  children,
  buttonClassName = 'rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
  menuClassName = defaultMenuClassName,
  iconClassName = 'h-5 w-5 text-gray-400'
}: ActionMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  onOpenChangeRef.current = onOpenChange

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const place = () => {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button || !menu) return
      const rect = button.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const gap = 8
      const fitsBelow = rect.bottom + gap + menuRect.height <= window.innerHeight - 8
      const top = fitsBelow ? rect.bottom + gap : Math.max(8, rect.top - gap - menuRect.height)
      const left = Math.min(Math.max(8, rect.right - menuRect.width), window.innerWidth - menuRect.width - 8)
      setPosition(previous => (previous && previous.top === top && previous.left === left ? previous : { top, left }))
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onOpenChangeRef.current(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChangeRef.current(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          onOpenChange(!open)
        }}
        className={buttonClassName}
      >
        <MoreVertical className={iconClassName} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'fixed',
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            zIndex: 80,
            visibility: position ? 'visible' : 'hidden'
          }}
          className={`${menuClassName} max-h-[min(24rem,calc(100vh-1rem))] overflow-y-auto`}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  )
}
