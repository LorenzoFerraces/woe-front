import { memo, useMemo } from 'react'
import { Avatar, Style } from '@dicebear/core'
import definition from '@dicebear/styles/adventurer.json'
import { rasgosDe } from './rasgos'
import type { Combatiente } from './types'

// Estilo "Adventurer" de Lisa Wischofsky, remix CC BY 4.0 — atribución en el pie.
const estilo = new Style(definition as never)

export const Chibi = memo(function Chibi({ c, size = 56 }: { c: Combatiente; size?: number }) {
  const svg = useMemo(
    () =>
      String(
        new Avatar(estilo, {
          ...rasgosDe(c),
          backgroundColor: [],
          size: 120,
          borderRadius: 0,
        }),
      ),
    [c],
  )
  return (
    <div
      className="chibi"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${c.nombre}, ${c.clase} ${c.raza}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
})