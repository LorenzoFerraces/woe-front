/** Contrato compartido — ver docs/superpowers/specs/2026-10-12-arena-multiaplicador-design.md */

/** Lo que se pega en arenas.json: solo la URL del endpoint de lectura. */
export interface ArenaConfig {
  /** URL completa de GET /api/arena/inscriptos. La de POST sale de acá. */
  url: string
  /** Nombre visible. Si no se pone, se deriva del host de la URL. */
  label?: string
  /** true = datos falsos en memoria, sin llamar al backend. Solo para developear el frontend. */
  mock?: boolean
}

/** Arena ya resuelta: las dos URLs y la etiqueta, derivadas de la config. */
export interface Arena {
  id: string
  label: string
  url: string
  urlDuelos: string
  mock?: boolean
}

/** Tal cual lo devuelve GET /api/arena/inscriptos. `origen` lo agrega el frontend. */
export interface Combatiente {
  id: number
  nombre: string
  nivel: number
  experiencia: number
  raza: string
  clase: string
  fuerza: number
  destreza: number
  armadura: number
  vida: number
  danoArmaDerecha: number
  danoArmaIzquierda: number
  combatesGanados: number
  combatesPerdidos: number
  /** El endpoint solo devuelve personajes en arena: nombre de la Arena, nunca null. */
  arena: string
  origen: string
  /** Referencia de escala absurda, no es un personaje real de ninguna app. */
  smurf?: boolean
}

/** Body de POST /api/arena/duelos. Direcionado: solo ids de personajes que ESE app posee (los ids son locales a cada base). El XP NO viaja. */
export type ResultadoParticipante = 'GANADOR' | 'PERDEDOR'

export interface ParticipanteDuelo {
  id: number
  resultado: ResultadoParticipante
}

export interface RegistroDuelo {
  idDuelo: string
  participantes: ParticipanteDuelo[]
}

export interface Turno {
  n: number
  atacanteId: number
  atacanteOrigen: string
  danoGenerado: number
  danoRecibido: number
  vidaAtacante: number
  vidaDefensor: number
}

export interface ResultadoDuelo {
  idDuelo: string
  ganadorId: number
  ganadorOrigen: string
  perdedorId: number
  perdedorOrigen: string
  turnos: Turno[]
  /** Solo para mostrar. La app lo recalcula al recibir el duelo. */
  xpGanada: number
}