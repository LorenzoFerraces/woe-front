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

/** Si el vencedor es un Personaje gana 10 * nivel (TP2). */
export function xpPorVictoria(c: Combatiente): number {
  return 10 * c.nivel
}

export function simular(retador: Combatiente, rival: Combatiente): ResultadoDuelo {
  let vidaR = retador.vida
  let vidaV = rival.vida
  const turnos: Turno[] = []

  const generar = { [retador.id]: danoGenerado(retador), [rival.id]: danoGenerado(rival) }

  for (let n = 1; n <= MAX_TURNOS; n++) {
    const atacante = n % 2 === 1 ? retador : rival
    const defensor = n % 2 === 1 ? rival : retador
    const bruto = danoRecibido(atacante, defensor)

    if (atacante === retador) vidaV -= bruto
    else vidaR -= bruto

    // no se puede curar por encima de la vida máxima
    vidaR = Math.min(vidaR, retador.vida)
    vidaV = Math.min(vidaV, rival.vida)

    turnos.push({
      n,
      atacanteId: atacante.id,
      danoGenerado: generar[atacante.id],
      danoRecibido: bruto,
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
    perdedorId: perdedor.id,
    turnos,
    xpGanada: xpPorVictoria(ganador),
  }
}