import { danoGenerado, razonDominancia } from './combate.ts'
import type { Arena, ArenaConfig, Combatiente, RegistroDuelo } from './types'

/**
 * Nombre visible de una arena, a partir del host de la URL.
 * `crudgpt.localhost:8081/api/...` -> `crudgpt`; `localhost:8081/api/...` -> `localhost:8081`.
 */
export function etiquetaDe(url: string): string {
  try {
    const { hostname, port } = new URL(url)
    const [subdominio, ...resto] = hostname.split('.')
    if (resto.length === 0) return port ? `${subdominio}:${port}` : subdominio
    return subdominio
  } catch {
    return url
  }
}

/** De la URL de `inscriptos` saca la de `duelos`: mismo prefijo, otro recurso final. */
function urlDuelosDe(url: string): string {
  return url.replace(/\/inscriptos\/?$/, '/duelos')
}

export function resolver(cfg: ArenaConfig): Arena {
  // El config es del propio curso: sin scheme, fetch sale relativo y pega 404 al localhost.
  // Completarlo es más simple que exigirlo en la doc.
  const url = /^\w+:\/\//.test(cfg.url) ? cfg.url : `http://${cfg.url}`
  const label = cfg.label ?? etiquetaDe(url)
  return { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, url, urlDuelos: urlDuelosDe(url), mock: cfg.mock }
}

export async function cargarArenas(): Promise<Arena[]> {
  const res = await fetch('/arenas.json')
  if (!res.ok) throw new Error('No se pudo leer /arenas.json')
  const { arenas } = (await res.json()) as { arenas: ArenaConfig[] }
  return arenas.map(resolver)
}

/**
 * Detecta personajes con estadísticas infladas (los "smurfs"). No es un personaje
 * fijo: se calcula sobre el roster real, así funciona contra los backends de verdad.
 *
 * Combina tres señales, cada una cubre un hueco distinto:
 *
 *  - `razonDominancia > 3`: ventaja *relativa* de daño contra el PJ típico. No se
 *    puede eludir "quedándose un pelo por debajo" si sos extremo, y no se envenena
 *    si todos inflan *parejo*. Señal principal.
 *  - `dano > mediana * 3`: magnitud extrema frente al cohort.
 *  - `dano > PISO_ABSOLUTO`: red de seguridad para cuando la *mayoría* de una app
 *    infla (la mediana y el PJ típico se corren y las dos señales relativas se
 *    apagan). Es un valor alto y solo de respaldo; no reemplaza a las relativas.
 *
 * Límite conocido: un personaje apenas mejor que el promedio (fuerza+20%) gana más
 * combates y NO es smurf — no debería serlo. La detección apunta a los que rompen
 * la escala, no a los que son un poco buenos.
 */
const UMBRAL_SMURF = 3
// Un PJ honesto ronda daño 50-150 con las armas del TP2. 400 está 3x por encima
// del peor caso normal y por debajo de cualquier inflado real. Es red de seguridad,
// no criterio principal: los cortes relativos mandan.
const PISO_ABSOLUTO = 400

export function marcarSmurfs(combatientes: Combatiente[]): Combatiente[] {
  if (combatientes.length < 3) return combatientes
  const mediana = combatientes.map(danoGenerado).sort((a, b) => a - b)[Math.floor(combatientes.length / 2)]
  if (mediana <= 0) return combatientes
  const tipico = combatientes.reduce((a, b) =>
    Math.abs(danoGenerado(a) - mediana) <= Math.abs(danoGenerado(b) - mediana) ? a : b,
  )
  return combatientes.map((c) => {
    const d = danoGenerado(c)
    return {
      ...c,
      smurf: razonDominancia(c, tipico) > UMBRAL_SMURF || d > mediana * UMBRAL_SMURF || d > PISO_ABSOLUTO,
    }
  })
}

/**
 * Leaderboard de grupos por duelos de la sesión: recibe la lista de ganadores
 * (`ganadorOrigen` de cada duelo) y devuelve el top 7, ordenado por victorias
 * desc con desempate alfabético. Función pura, como el resto de la lógica de datos.
 */
export function palmares(ganadores: string[]): Array<{ origen: string; victorias: number }> {
  const conteo = new Map<string, number>()
  for (const origen of ganadores) conteo.set(origen, (conteo.get(origen) ?? 0) + 1)
  return [...conteo.entries()]
    .map(([origen, victorias]) => ({ origen, victorias }))
    .sort((a, b) => b.victorias - a.victorias || a.origen.localeCompare(b.origen))
    .slice(0, 7)
}

/** Trae el roster de cada app en paralelo y lo devuelve unificado con el `origen` puesto. */
export async function roster(arenas: Arena[]): Promise<Combatiente[]> {
  const lists = await Promise.all(
    arenas.map(async (a) => {
      if (a.mock) return rosterMock(a)
      const res = await fetch(a.url)
      if (!res.ok) return []
      return ((await res.json()) as Combatiente[]).map((c) => ({ ...c, origen: a.label }))
    }),
  )
  return marcarSmurfs(lists.flat())
}

/** Le manda el veredicto del duelo, con SOLO los personajes que esa app posee (un id de otra app puede ser otro personaje aquí). */
export async function registrarDuelo(
  arena: Arena,
  registro: RegistroDuelo,
): Promise<{ ok: boolean; status: number }> {
  if (arena.mock) return { ok: true, status: 200 }
  const res = await fetch(arena.urlDuelos, {
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