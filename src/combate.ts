import type { Combatiente, ResultadoDuelo, Turno } from './types'

/**
 * Simulación del combate. Fórmulas textuales del TP2 (entrega2.md, sección Combate).
 * Función pura: mismo input, mismo output. No toca red ni estado.
 */

// ponytail: techo de 200 turnos porque la fórmula permite DañoRecibido negativo
// (armadura > daño), o sea dos tanques se curan entre ellos para siempre.
// Subir el techo o agregar condición de victoria por tiempo si se ve raro en clase.
const MAX_TURNOS = 200

export function danoArma(c: Combatiente): number {
  return c.danoArmaDerecha + c.danoArmaIzquierda * 0.35
}

/** Daño = (Fuerza * 2) + (DañoArma * (1 + (Destreza * 0.02))) */
export function danoGenerado(c: Combatiente): number {
  return c.fuerza * 2 + danoArma(c) * (1 + c.destreza * 0.02)
}

/** Defensa = Armadura + (DañoGenerado * 10%). El DañoGenerado es el del DEFENSOR. */
export function danoRecibido(atacante: Combatiente, defensor: Combatiente): number {
  return danoGenerado(atacante) - (defensor.armadura + danoGenerado(defensor) * 0.1)
}

/**
 * Crítico (extensión al enunciado): 5% base + 0.75% por punto de destreza.
 * El techo de 40% acota a los inflados — sin techo un smurf con destreza alta critía cada turno.
 */
export function probCritico(c: Combatiente): number {
  return Math.min(0.4, 0.05 + c.destreza * 0.0075)
}

/** Si el vencedor es un Personaje gana 10 * nivel (TP2). */
export function xpPorVictoria(c: Combatiente): number {
  return 10 * c.nivel
}

/**
 * Techo de turnos. El daño recibido escala linealmente con las estadísticas,
 * así que vida/daño es invariante; el problema es que cuando el daño del atacante
 * empieza a rozar la defensa, la razón se dispara a valores de 5 dígitos y
 * cualquier corte deja de distinguir. Saturar en 50 turnos ("más que esto es no
 * lo matan nunca") mantiene la razón interpretable.
 */
const TURNOS_MAX = 50

/**
 * Razón de dominancia contra un oponente representativo: cuántos turnos te aguanta
 * él por cada turno que vos lo aguantás a él. 1 = parejo, >3 = dominás.
 *
 * Es una razón, no un umbral de magnitud: subirle todos los números a todo el curso
 * no la mueve (la razón queda en 1), mientras que inflarse uno solo la dispara.
 * Por eso no se puede "quedarse justo por debajo" del corte.
 */
export function razonDominancia(c: Combatiente, tipico: Combatiente): number {
  const meMatan = danoRecibido(tipico, c)
  const yoMato = danoRecibido(c, tipico)
  // Ambos términos van de 1 (morís en un turno) a TURNOS_MAX (no te matan nunca).
  // El piso de 1 turno es lo que acota la razón: sin él, un denominador que tiende
  // a 0 (daño del atacante → ∞) revienta la división a 5 dígitos.
  const turnosQueMeAguantan =
    meMatan <= 0 ? TURNOS_MAX : Math.min(TURNOS_MAX, Math.max(1, c.vida / meMatan))
  const turnosQueYoAguanto =
    yoMato <= 0 ? TURNOS_MAX : Math.min(TURNOS_MAX, Math.max(1, tipico.vida / yoMato))
  return turnosQueMeAguantan / turnosQueYoAguanto
}

export function simular(
  retador: Combatiente,
  rival: Combatiente,
  /** Inyectable para que la simulación siga siendo pura y testeable. */
  random: () => number = Math.random,
): ResultadoDuelo {
  let vidaR = retador.vida
  let vidaV = rival.vida
  const turnos: Turno[] = []

  for (let n = 1; n <= MAX_TURNOS; n++) {
    const atacante = n % 2 === 1 ? retador : rival
    const defensor = n % 2 === 1 ? rival : retador
    const bruto = danoRecibido(atacante, defensor)
    // Crítico solo si el golpeLastimó: el daño negativo es "curación".
    const critico = bruto > 0 && random() < probCritico(atacante)
    const golpe = critico ? bruto * 2 : bruto

    if (atacante === retador) vidaV -= golpe
    else vidaR -= golpe

    // no se puede curar por encima de la vida máxima
    vidaR = Math.min(vidaR, retador.vida)
    vidaV = Math.min(vidaV, rival.vida)

    turnos.push({
      n,
      atacanteId: atacante.id,
      atacanteOrigen: atacante.origen,
      danoGenerado: danoGenerado(atacante),
      danoRecibido: golpe,
      critico: critico || undefined,
      vidaAtacante: Math.max(0, Math.round(atacante === retador ? vidaR : vidaV)),
      vidaDefensor: Math.max(0, Math.round(atacante === retador ? vidaV : vidaR)),
    })

    if (vidaR <= 0 || vidaV <= 0) break
  }

  // Empate al llegar al techo: gana quien haya perdido menos vida, y a igualdad el retador.
  const ganador =
    vidaR <= 0 && vidaV <= 0
      ? vidaR < vidaV
        ? retador
        : rival
      : vidaV <= 0
        ? retador
        : rival

  const perdedor = ganador === retador ? rival : retador

  return {
    idDuelo: crypto.randomUUID(),
    ganadorId: ganador.id,
    ganadorOrigen: ganador.origen,
    perdedorId: perdedor.id,
    perdedorOrigen: perdedor.origen,
    turnos,
    xpGanada: xpPorVictoria(ganador),
  }
}