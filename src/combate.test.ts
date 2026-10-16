import assert from 'node:assert/strict'
import { test } from 'node:test'
import { danoGenerado, danoRecibido, probCritico, razonDominancia, simular, xpPorVictoria } from './combate.ts'
import { etiquetaDe, marcarSmurfs, palmares, resolver } from './api.ts'
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

test('marca como smurf al que tiene daño muy por encima de la mediana', () => {
  // 4 personajes de daño normal y uno con fuerza 999 (daño absurdo)
  const roster = [
    ...Array.from({ length: 4 }, (_, i) => rival({ id: i + 1, fuerza: 25 })),
    rival({ id: 99, nombre: 'Smurf', fuerza: 999 }),
  ]
  const marcados = marcarSmurfs(roster)
  assert.equal(marcados.filter((c) => c.smurf).length, 1, 'solo se marca el inflado')
  assert.equal(marcados.find((c) => c.id === 99)!.smurf, true)
  for (const c of marcados.filter((c) => c.id !== 99)) {
    assert.ok(!c.smurf, 'un personaje normal no se marca')
  }
})

test('no marca smurf en un roster chico o uniforme', () => {
  const roster = Array.from({ length: 5 }, (_, i) => rival({ id: i + 1, fuerza: 25 }))
  assert.equal(marcarSmurfs(roster).filter((c) => c.smurf).length, 0)
  assert.equal(marcarSmurfs([rival(), rival({ id: 2 })]).length, 2, 'roster chico se devuelve tal cual')
})

const escalar = (c: Combatiente, f: number): Combatiente => {
  const s = {
    fuerza: Math.round(c.fuerza * f),
    destreza: Math.round(c.destreza * f),
    armadura: Math.round(c.armadura * f),
    vida: Math.round(c.vida * f),
    danoArmaDerecha: Math.round(c.danoArmaDerecha * f),
    danoArmaIzquierda: Math.round(c.danoArmaIzquierda * f),
  }
  return { ...c, ...s }
}

test('la razón de dominancia no cambia si TODOS se inflan por igual', () => {
  // Es la propiedad que hace la métrica inmune al veneno de la mediana:
  // inflar todo el curso no genera ventaja, porque nadie queda por encima de nadie.
  const base = rival({ id: 1 })
  assert.equal(razonDominancia(base, base), 1)
  assert.equal(razonDominancia(escalar(base, 2), escalar(base, 2)), 1)
  assert.equal(razonDominancia(escalar(base, 100), escalar(base, 100)), 1)
})

test('la razón se dispara cuando uno solo se infla', () => {
  const base = rival({ id: 1 })
  const r1 = razonDominancia(escalar(base, 1.5), base)
  const r4 = razonDominancia(escalar(base, 4), base)
  // No exigimos monotonicidad estricta: al saturar en TURNOS_MAX la razón se aplana
  // (x2 y x4 dan lo mismo), que es justo lo que la hace acotada e interpretable.
  assert.ok(r1 > 3, 'x1.5 ya supera el corte de 3 contra este PJ típico')
  assert.ok(r4 >= r1, 'más inflado no baja la razón')
  assert.ok(r4 <= 50, 'r4 acotada')
})

test('la razón queda acotada: el corte es interpretable', () => {
  // Sin saturar, la razón se dispara a 5 dígitos y cualquier corte deja de distinguir.
  const base = rival({ id: 1 })
  const r = razonDominancia(escalar(base, 1000), base)
  assert.ok(r <= 50, `razon acotada (fue ${r})`)
})

test('detecta el inflado aunque una app haya creado muchos', () => {
  // El ataque real: una app que infla por cantidad para envenenar la mediana.
  // Con 16 de 36 inflados la mediana se va y la magnitud sola no ve nada.
  const normales = Array.from({ length: 20 }, (_, i) => rival({ id: i + 1 }))
  const inflados = normales.slice(0, 16).map((c, i) => ({ ...escalar(c, 4), id: 100 + i }))
  const marcados = marcarSmurfs([...normales, ...inflados])
  const detectados = marcados.filter((c) => c.smurf).length
  assert.ok(detectados >= 14, `debe ver casi todos los inflados (vio ${detectados})`)
})

test('detecta el inflado cuando la MAYORÍA de una app infla', () => {
  // Caso extremo: 20 de 24 inflados. La mediana y el PJ típico son ambos inflados,
  // así que las dos señales relativas se apagan. Solo el piso absoluto lo ve.
  const inflados = Array.from({ length: 20 }, (_, i) => ({
    ...escalar(rival({ id: i + 1 }), 6),
    id: i + 1,
  }))
  const normales = Array.from({ length: 4 }, (_, i) => rival({ id: 200 + i }))
  const marcados = marcarSmurfs([...inflados, ...normales])
  const deInflado = marcados.filter((c) => c.id <= 20)
  const deNormal = marcados.filter((c) => c.id > 200)
  assert.ok(
    deInflado.filter((c) => c.smurf).length >= 18,
    `debe ver casi todos los inflados (vio ${deInflado.filter((c) => c.smurf).length}/20)`,
  )
  assert.ok(
    deNormal.every((c) => !c.smurf),
    'no debe marcar a los normales en un roster mayoritariamente inflado',
  )
})

test('prob de crítico: 5% base + 0.75% por destreza, con techo anti-smurf de 40%', () => {
  assert.equal(probCritico(rival({ destreza: 0 })), 0.05)
  assert.equal(Math.round(probCritico(guerrero) * 1000) / 1000, 0.2) // destreza 20
  assert.equal(probCritico(rival({ destreza: 999 })), 0.4, 'el techo acota a los inflados')
})

test('RNG siempre crítico: el daño se duplica y el turno se marca', () => {
  const base = danoRecibido(guerrero, rival())
  const r = simular(guerrero, rival(), () => 0)
  assert.ok(r.turnos.length > 0)
  for (const t of r.turnos) {
    assert.ok(t.critico, 'el turno queda marcado como crítico')
    if (t.danoRecibido > 0) assert.equal(t.danoRecibido, base * 2, 'el daño salta al doble')
  }
})

test('RNG nunca crítico: daño normal y sin marca', () => {
  const base = danoRecibido(guerrero, rival())
  const r = simular(guerrero, rival(), () => 0.999)
  for (const t of r.turnos) {
    assert.ok(!t.critico)
    if (t.danoRecibido > 0) assert.equal(t.danoRecibido, base)
  }
})

test('el crítico no se aplica al daño negativo ("curación")', () => {
  const r = simular(
    rival({ id: 1, fuerza: 10, armadura: 10000, vida: 100 }),
    rival({ id: 2, fuerza: 10, armadura: 10000, vida: 100 }),
    () => 0,
  )
  assert.ok(r.turnos.every((t) => !t.critico), 'nadie critica devolviendo energía')
})

test('deriva la etiqueta del host de la URL', () => {
  assert.equal(etiquetaDe('http://crudgpt.localhost:8081/api/arena/inscriptos'), 'crudgpt')
  assert.equal(etiquetaDe('https://tots.dominio.local/api/arena/inscriptos'), 'tots')
  // localhost a secas no sirve como nombre: se cae al host:port para que se distinguan
  assert.equal(etiquetaDe('http://localhost:8081/api/arena/inscriptos'), 'localhost:8081')
  assert.equal(etiquetaDe('no-es-una-url'), 'no-es-una-url', 'no explota con basura')
})

test('palmares: agrupa y suma victorias por origen', () => {
  const p = palmares(['crudgpt', 'tots', 'crudgpt'])
  assert.deepEqual(p, [
    { origen: 'crudgpt', victorias: 2 },
    { origen: 'tots', victorias: 1 },
  ])
})

test('palmares: el desempate es alfabético', () => {
  const p = palmares(['tots', 'crudgpt', 'tots', 'crudgpt'])
  assert.equal(p.length, 2)
  assert.equal(p[0].origen, 'crudgpt', 'empatados: primero el alfabético menor')
  assert.equal(p[0].victorias, 2)
})

test('palmares: corta en el top 7', () => {
  const p = palmares(Array.from({ length: 10 }, (_, i) => `app${i}`))
  assert.equal(p.length, 7)
  assert.equal(p[0].origen, 'app0', 'empatados en 1: orden alfabético')
})

test('resolver: completa el scheme si no viene (fetch relativo = 404 al localhost)', () => {
  const a = resolver({ url: 'vela-20a027dd8bc56e67.velaunq.ddns.net/api/arena/inscriptos', label: 'CrudGPT' })
  assert.equal(a.url, 'http://vela-20a027dd8bc56e67.velaunq.ddns.net/api/arena/inscriptos')
  assert.equal(a.urlDuelos, 'http://vela-20a027dd8bc56e67.velaunq.ddns.net/api/arena/duelos')
  assert.equal(a.label, 'CrudGPT')
})

test('resolver: respeta un scheme explícito y deriva label del subdominio', () => {
  const a = resolver({ url: 'https://crudgpt.dominio.local/api/arena/inscriptos' })
  assert.equal(a.url, 'https://crudgpt.dominio.local/api/arena/inscriptos')
  assert.equal(a.label, 'crudgpt')
})