import type { Combatiente } from './types'

/**
 * Los 11 nombres de clase de las 5 apps no coinciden entre sí, pero colapsan
 * en 4 arquetipos que sí se distinguen a simple vista.
 */
type Arquetipo = 'tanque' | 'mago' | 'tirador' | 'agil'

const CLASES: Record<string, Arquetipo> = {
  GUERRERO: 'tanque', BARBARO: 'tanque', PALADIN: 'tanque',
  MAGO: 'mago', BRUJO: 'mago',
  ARQUERO: 'tirador', CAZADOR: 'tirador',
  PICARO: 'agil', BARDO: 'agil',
}

const PELO: Record<Arquetipo, string[]> = {
  tanque: ['short01', 'short02', 'short03', 'short05', 'short07', 'short10'],
  mago: ['long01', 'long04', 'long09', 'long12', 'long17', 'long22'],
  tirador: ['short04', 'short08', 'short11', 'short14', 'short19', 'long02'],
  agil: ['long03', 'long07', 'long14', 'long20', 'short05', 'short13'],
}

const ANTEOJOS: Record<Arquetipo, string[]> = {
  tanque: ['variant01', 'variant02', 'variant03'],
  mago: ['variant01', 'variant02', 'variant03', 'variant04', 'variant05'],
  tirador: ['variant02', 'variant03', 'variant04'],
  agil: ['variant01', 'variant03', 'variant05'],
}

/** Rasgos de cara: el tanque lleva bigote, el mago pecas, el ágil rubor. */
const DETALLE: Record<Arquetipo, string | null> = {
  tanque: 'mustache',
  mago: 'freckles',
  tirador: 'birthmark',
  agil: 'blush',
}

const COLOR_PELO = ['#0e0e0e', '#6a4e35', '#562306', '#afafaf', '#3eac2c', '#592454']

/**
 * Las razas son datos libres (nombre en una tabla), no enums: se matchean por
 * substring. DiceBear acepta hex arbitrario fuera de su paleta, así que el
 * verde de los orcos se pinta tal cual.
 */
const PIEL: Array<[string[], string]> = [
  [['ORCO', 'GOBLIN'], '#6faa4e'],
  [['ORCO'], '#5c8f3f'],
  [['ELFO'], '#f2d3b1'],
  [['HUMAN', 'HUMANO'], '#ecad80'],
]

function arquetipoDe(clase: string): Arquetipo {
  return CLASES[(clase ?? '').toUpperCase()] ?? 'agil'
}

function pielDe(raza: string): string {
  const r = (raza ?? '').toUpperCase()
  return PIEL.find(([nombres]) => nombres.some((n) => r.includes(n)))?.[1] ?? '#ecad80'
}

/** Hash estable: mismo personaje, mismo avatar, siempre. Sin Math.random. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const elegir = <T,>(xs: T[], seed: number): T => xs[seed % xs.length]

/**
 * Opciones de DiceBear `adventurer` derivadas de la clase y la raza.
 * Cada componente se fija con `<nombre>Variant` y `<nombre>Probability`.
 */
export function rasgosDe(c: Combatiente): Record<string, unknown> {
  const a = arquetipoDe(c.clase)
  const seed = hash(`${c.origen}:${c.id}`)
  const detalle = DETALLE[a]

  return {
    seed: `${c.origen}:${c.id}`,
    hairVariant: elegir(PELO[a], seed),
    glassesVariant: elegir(ANTEOJOS[a], seed >> 3),
    // el tirador va sin anteojos para que se distinga del tanque de un vistazo
    glassesProbability: a === 'tirador' ? 0 : 100,
    detailsVariant: detalle ?? 'birthmark',
    detailsProbability: detalle ? 100 : 0,
    skinColor: pielDe(c.raza),
    hairColor: elegir(COLOR_PELO, seed >> 7),
  }
}