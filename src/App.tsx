import { useCallback, useEffect, useRef, useState } from 'react'
import { cargarArenas, registrarDuelo, roster } from './api'
import { danoGenerado, simular } from './combate'
import { Chibi } from './Chibi'
import type { Arena, Combatiente, ParticipanteDuelo, ResultadoDuelo } from './types'

type Aviso = { kind: 'error' | 'ok' | 'warn'; texto: string } | null
const MS_POR_TURNO = 620

export default function App() {
  const [arenas, setArenas] = useState<Arena[]>([])
  const [inscriptos, setInscriptos] = useState<Combatiente[]>([])
  const [elegidos, setElegidos] = useState<[Combatiente | null, Combatiente | null]>([null, null])
  const [duelo, setDuelo] = useState<ResultadoDuelo | null>(null)
  const [turno, setTurno] = useState(-1)
  const [aviso, setAviso] = useState<Aviso>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refrescar = useCallback(async (as: Arena[]) => {
    setInscriptos(await roster(as))
  }, [])

  useEffect(() => {
    cargarArenas()
      .then((as) => {
        setArenas(as)
        return refrescar(as)
      })
      .catch(() => setAviso({ kind: 'error', texto: 'No se pudo leer /arenas.json' }))
  }, [refrescar])

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const retador = elegidos[0]
  const rival = elegidos[1]
  const bloqueado = !retador || !rival
  const terminado = duelo !== null && turno >= duelo.turnos.length - 1

  function elegir(c: Combatiente) {
    if (timer.current) clearInterval(timer.current)
    if (c.smurf) {
      setAviso({ kind: 'warn', texto: `${c.nombre} tiene estadísticas infladas (smurf): no puede participar de un duelo.` })
      return
    }
    setDuelo(null)
    setTurno(-1)
    setAviso(null)
    setElegidos(([a, b]) => (a === null ? [c, null] : b === null && a.id !== c.id ? [a, c] : [null, null]))
  }

  function limpiar() {
    if (timer.current) clearInterval(timer.current)
    setElegidos([null, null])
    setDuelo(null)
    setTurno(-1)
    setAviso(null)
  }

  function pelear() {
    if (!retador || !rival) return
    const resultado = simular(retador, rival)
    setDuelo(resultado)
    setAviso(null)
    setTurno(0)
    timer.current = setInterval(() => {
      setTurno((t) => {
        if (t >= resultado.turnos.length - 1) {
          if (timer.current) clearInterval(timer.current)
          return t
        }
        return t + 1
      })
    }, MS_POR_TURNO)
  }

  async function registrar() {
    if (!duelo || !retador || !rival) return
    // direcionado: cada app solo recibe los personajes que ELLA posee; un id de otra
    // app puede ser otro personaje aquí (los ids son locales a cada base)
    const porOrigen = new Map<string, ParticipanteDuelo[]>()
    for (const c of [retador, rival]) {
      const lista = porOrigen.get(c.origen) ?? []
      lista.push({ id: c.id, resultado: c.id === duelo.ganadorId ? 'GANADOR' : 'PERDEDOR' })
      porOrigen.set(c.origen, lista)
    }
    const registros = [...porOrigen.entries()].map(([origen, partes]) =>
      registrarDuelo(arenas.find((a) => a.label === origen)!, { idDuelo: duelo.idDuelo, participantes: partes }),
    )
    const respuestas = await Promise.all(registros)
    const malas = respuestas.filter((r) => !r.ok)
    setAviso(
      malas.length
        ? { kind: 'error', texto: `${malas.length} app(s) rechazaron el duelo (${malas.map((m) => m.status).join(', ')})` }
        : { kind: 'ok', texto: `Duelo registrado en ${respuestas.length} app(s). +${duelo.xpGanada} XP para el ganador.` },
    )
    await refrescar(arenas)
  }

  // al terminar el último turno se registra solo, sin que el usuario haga nada
  const registrado = useRef<string | null>(null)
  useEffect(() => {
    if (!terminado || !duelo || registrado.current === duelo.idDuelo) return
    registrado.current = duelo.idDuelo
    void registrar()
  }, [terminado, duelo])

  const paso = duelo && turno >= 0 ? duelo.turnos[Math.min(turno, duelo.turnos.length - 1)] : null
  const vidaDe = (c: Combatiente) => (paso ? (paso.atacanteId === c.id ? paso.vidaAtacante : paso.vidaDefensor) : c.vida)
  const nombreDe = (id: number) => {
    if (retador?.id === id) return retador.nombre
    if (rival?.id === id) return rival.nombre
    return `#${id}`
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav__title">ARENA <span>MULTIAPLICADOR</span></div>
        <div className="nav__meta">{inscriptos.length} combatientes · {arenas.length} apps</div>
      </nav>

      {aviso && <div className="banner" data-kind={aviso.kind}>{aviso.texto}</div>}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <section className="section">
          <div className="section__head">
            <span>Inscriptos</span>
            <span>{retador ? (rival ? 'Listo para pelear' : 'Elegí el defensor') : 'Elegí el retador'}</span>
          </div>
          <div className="grid">
            {inscriptos.map((c) => (
              <button
                key={`${c.origen}-${c.id}`}
                className={`card${c.smurf ? ' card--smurf' : ''}`}
                aria-pressed={elegidos[0] === c || elegidos[1] === c}
                onClick={() => elegir(c)}
              >
                <div className="card__origen">{c.origen}</div>
                <div className="card__head">
                  <Chibi c={c} size={44} />
                  <div>
                    <div className="card__name">{c.nombre}</div>
                    <div className="card__sub">Nv {c.nivel} · {c.clase} · {c.raza}</div>
                  </div>
                </div>
                <div className="bars">
                  <Bar label="Fuerza" valor={c.fuerza} max={60} />
                  <Bar label="Destreza" valor={c.destreza} max={60} />
                  <Bar label="Armadura" valor={c.armadura} max={60} />
                  <Bar label="Daño" valor={Math.round(danoGenerado(c))} max={500} />
                </div>
                <div className="card__arena">
                  {c.arena} · {c.combatesGanados}G {c.combatesPerdidos}P
                </div>
                {c.smurf && (
                  <span className="card__smurf" title="Daño muy por encima del resto del roster. No puede participar de un duelo.">
                    SMURF
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <span>Duelo</span>
            <div className="actions">
              <button className="btn" disabled={bloqueado} onClick={pelear}>Pelear</button>
              <button className="btn btn--ghost" onClick={limpiar}>Limpiar</button>
            </div>
          </div>

          <div className="section__body">
            {!retador || !rival ? (
              <p className="hint">Elegí dos combatientes.</p>
            ) : (
              <>
                <div className="fight">
                  <Fighter
                    c={retador}
                    vida={vidaDe(retador)}
                    etiqueta="Retador"
                    lado="izq"
                    atacando={paso?.atacanteId === retador.id}
                    golpeado={paso?.atacanteId === rival.id}
                    caido={terminado && duelo?.ganadorId !== retador.id}
                    dmgRecibido={paso?.danoRecibido}
                  />
                  <div className="vs">VS</div>
                  <Fighter
                    c={rival}
                    vida={vidaDe(rival)}
                    etiqueta="Rival"
                    lado="der"
                    atacando={paso?.atacanteId === rival.id}
                    golpeado={paso?.atacanteId === retador.id}
                    caido={terminado && duelo?.ganadorId !== rival.id}
                    dmgRecibido={paso?.danoRecibido}
                  />
                </div>

                {duelo && (
                  <>
                    <div className="log" style={{ marginTop: '1.25rem' }}>
                      {duelo.turnos.slice(0, turno + 1).map((t) => (
                        <div key={t.n} className="log__row" data-turno={t.n === turno}>
                          <b>T{t.n}</b> {nombreDe(t.atacanteId)} golpea por {Math.round(t.danoGenerado)} ·{' '}
                          {t.danoRecibido >= 0
                            ? `recibe ${Math.round(t.danoRecibido)}`
                            : `se cura ${Math.round(-t.danoRecibido)}`}{' '}
                          · quedan {t.vidaDefensor} de vida
                        </div>
                      ))}
                    </div>

                    {terminado && (
                      <p className="veredicto" style={{ marginTop: '1rem' }}>
                        {nombreDe(duelo.ganadorId)} GANA · +{duelo.xpGanada} XP
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="credit">
        Avatares:{' '}
        <a href="https://www.dicebear.com/styles/adventurer/" target="_blank" rel="noreferrer">
          Adventurer
        </a>{' '}
        de Lisa Wischofsky, remix CC BY 4.0 — vía DiceBear
      </footer>
    </div>
  )
}

function Bar({ label, valor, max }: { label: string; valor: number; max: number }) {
  return (
    <div className="bar">
      <span className="bar__label">{label}</span>
      <span className="bar__track">
        <span className="bar__fill" style={{ width: `${Math.min(100, (valor / max) * 100)}%` }} />
      </span>
      <span className="bar__value">{valor}</span>
    </div>
  )
}

function Fighter({
  c,
  vida,
  etiqueta,
  lado,
  atacando = false,
  golpeado = false,
  caido = false,
  dmgRecibido,
}: {
  c: Combatiente
  vida: number
  etiqueta: string
  lado: 'izq' | 'der'
  atacando?: boolean
  golpeado?: boolean
  caido?: boolean
  dmgRecibido?: number
}) {
  return (
    <div
      className="fighter"
      data-lado={lado}
      data-atacando={atacando || undefined}
      data-golpeado={golpeado || undefined}
      data-caido={caido || undefined}
    >
      <div className="fighter__origen">{etiqueta} · {c.origen}</div>
      <div className="fighter__head">
        <div className="fighter__avatar">
          <Chibi c={c} size={92} />
          {golpeado && (
            <span className="fighter__dmg" key={`${c.id}-dmg`}>
              {Math.round(Math.abs(dmgRecibido ?? 0))}
            </span>
          )}
        </div>
        <div>
          <div className="fighter__name">{c.nombre}</div>
          <div className="card__sub">Nv {c.nivel} · {c.clase} · {c.raza}</div>
        </div>
      </div>
      <div className="hp">
        <div
          className="hp__fill"
          data-bajo={vida <= c.vida * 0.25}
          style={{ width: `${Math.max(0, (vida / c.vida) * 100)}%` }}
        />
      </div>
      <div className="hp__label">
        <span>VIDA</span>
        <span>{Math.max(0, vida)} / {c.vida}</span>
      </div>
    </div>
  )
}