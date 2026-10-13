import type { Arena, Combatiente, RegistroDuelo } from './types'

export async function cargarArenas(): Promise<Arena[]> {
  const res = await fetch('/arenas.json')
  if (!res.ok) throw new Error('No se pudo leer /arenas.json')
  return (await res.json()).arenas
}

/** Trae el roster de cada app en paralelo y lo devuelve unificado con el `origen` puesto. */
export async function roster(arenas: Arena[]): Promise<Combatiente[]> {
  const lists = await Promise.all(
    arenas.map(async (a) => {
      if (a.mock) return rosterMock(a)
      const res = await fetch(`${a.baseUrl}/api/arena/inscriptos`)
      if (!res.ok) return []
      return ((await res.json()) as Combatiente[]).map((c) => ({ ...c, origen: a.label }))
    }),
  )
  return lists.flat()
}

/** Le manda el veredicto del duelo, con SOLO los personajes que esa app posee (un id de otra app puede ser otro personaje aquí). */
export async function registrarDuelo(
  arena: Arena,
  registro: RegistroDuelo,
): Promise<{ ok: boolean; status: number }> {
  if (arena.mock) return { ok: true, status: 200 }
  const res = await fetch(`${arena.baseUrl}/api/arena/duelos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registro),
  })
  return { ok: res.ok, status: res.status }
}

// ---------------------------------------------------------------- mock

const NOMBRES = ['Ayla', 'Gominoli', 'Barbará', 'Piruja', 'Dora', 'Aladín', 'Écaro', 'Rick']
const CLASES = ['GUERRERO', 'MAGO', 'ARQUERO', 'PIRARO']
const RAZAS = ['HUMANO', 'ORCO', 'ELFO', 'GOBLIN']
const ARENAS = ['Arena del Norte', 'Arena del Sur']

/** Datos falsos pero con los mismos 14 campos del contrato. Para developear sin backends. */
function rosterMock(a: Arena): Combatiente[] {
  const seed = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const rnd = (n: number) => (seed * (n + 7) * 2654435761) % 100

  return Array.from({ length: 4 }, (_, i) => {
    const nivel = 1 + rnd(i) % 10
    return {
      id: i + 1,
      nombre: NOMBRES[(seed + i) % NOMBRES.length],
      nivel,
      experiencia: 100 * nivel * rnd(i + 1),
      raza: RAZAS[rnd(i + 2) % RAZAS.length],
      clase: CLASES[rnd(i + 3) % CLASES.length],
      fuerza: 10 + rnd(i + 4) % 40,
      destreza: 5 + rnd(i + 5) % 30,
      armadura: 10 + rnd(i + 6) % 40,
      vida: 80 + rnd(i + 7) % 80,
      danoArmaDerecha: rnd(i + 8) % 50,
      danoArmaIzquierda: rnd(i + 9) % 25,
      combatesGanados: rnd(i + 10) % 20,
      combatesPerdidos: rnd(i + 11) % 20,
      arena: ARENAS[rnd(i + 12) % ARENAS.length],
      origen: a.label,
    } satisfies Combatiente
  })
}