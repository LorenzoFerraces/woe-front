import assert from 'node:assert/strict'
import { test } from 'node:test'
import { danoGenerado, danoRecibido, simular, xpPorVictoria } from './combate.ts'
import type { Combatiente } from './types.ts'

const guerrero: Combatiente = {
  id: 1, nombre: 'G', nivel: 1, experiencia: 0, raza: 'HUMANO', clase: 'GUERRERO',
  fuerza: 25, destreza: 20, armadura: 50, vida: 100,
  danoArmaDerecha: 30, danoArmaIzquierda: 20,
  combatesGanados: 0, combatesPerdidos: 0, arena: 'Arena', origen: 'test',
}

const rival = (over: Partial<Combatiente> = {}): Combatiente => ({
  ...guerrero, id: 2, nombre: 'R', ...over,
})

test('ejemplo del enunciado: daño generado = 101.8', () => {
  // Fuerza 25, Destreza 20, arma 30 dcha + 20 izq -> 37
  assert.equal(Math.round(danoGenerado(guerrero) * 100) / 100, 101.8)
})

test('ejemplo del enunciado: daño recibido = 135', () => {
  // Atacante genera 200, defensor tiene armadura 50 y genera 150
  const atk = rival({ danoArmaDerecha: 200, danoArmaIzquierda: 0, destreza: 0, fuerza: 0 })
  const def = rival({ armadura: 50, danoArmaDerecha: 150, danoArmaIzquierda: 0, fuerza: 0, destreza: 0 })
  assert.equal(danoGenerado(def), 150)
  assert.equal(Math.round(danoRecibido(atk, def)), 135)
})

test('xp por victoria = 10 * nivel', () => {
  assert.equal(xpPorVictoria(rival({ nivel: 4 })), 40)
})

test('el retador ataca primero (turno 1 impar es del retador)', () => {
  const r = simular(guerrero, rival())
  assert.equal(r.turnos[0].n, 1)
  assert.equal(r.turnos[0].atacanteId, guerrero.id)
  assert.equal(r.turnos[1].atacanteId, rival().id)
})

test('siempre termina y alguien gana', () => {
  for (let i = 0; i < 200; i++) {
    const a = rival({ id: 1, fuerza: i % 40, vida: 10 + (i % 90), armadura: i % 60 })
    const b = rival({ id: 2, fuerza: (i * 7) % 40, vida: 10 + ((i * 3) % 90), armadura: (i * 5) % 60 })
    const r = simular(a, b)
    assert.ok(r.turnos.length > 0 && r.turnos.length <= 200, 'termina dentro del techo')
    assert.ok([a.id, b.id].includes(r.ganadorId))
    assert.notEqual(r.ganadorId, r.perdedorId)
  }
})

test('diez veces más poder siempre gana', () => {
  const r = simular(rival({ id: 1, fuerza: 200, vida: 100 }), rival({ id: 2, fuerza: 20, vida: 100 }))
  assert.equal(r.ganadorId, 1)
})

test('no se cura por encima de la vida máxima', () => {
  // armadura 10.000 hace que el daño recibido sea negativo en ambos sentidos
  const r = simular(
    rival({ id: 1, fuerza: 10, armadura: 10000, vida: 100 }),
    rival({ id: 2, fuerza: 10, armadura: 10000, vida: 100 }),
  )
  for (const t of r.turnos) {
    assert.ok(t.vidaAtacante <= 100 && t.vidaDefensor <= 100, 'nadie supera su vida máxima')
  }
})