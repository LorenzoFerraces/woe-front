/** Contrato compartido — ver docs/superpowers/specs/2026-10-12-arena-multiaplicador-design.md */

export interface Arena {
  id: string
  label: string
  baseUrl: string
  /** true = datos falsos en memoria, sin llamar al backend. Solo para developear el frontend. */
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
  /** Nombre del Lugar si es Arena, null si está en Taberna/Tienda. */
  arena: string | null
  origen: string
}

/** Body de POST /api/arena/duelos. El XP NO viaja: lo calcula cada app. */
export interface RegistroDuelo {
  idDuelo: string
  idRetador: number
  idRival: number
  idGanador: number
}

export interface Turno {
  n: number
  atacanteId: number
  danoGenerado: number
  danoRecibido: number
  vidaAtacante: number
  vidaDefensor: number
}

export interface ResultadoDuelo {
  idDuelo: string
  ganadorId: number
  perdedorId: number
  turnos: Turno[]
  /** Solo para mostrar. La app lo recalcula al recibir el duelo. */
  xpGanada: number
}