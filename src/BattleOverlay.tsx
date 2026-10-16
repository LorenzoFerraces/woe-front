import { useEffect, useRef } from 'react'
import { Chibi } from './Chibi'
import type { Combatiente, ResultadoDuelo } from './types'

interface Props {
  retador: Combatiente
  rival: Combatiente
  duelo: ResultadoDuelo
  turno: number
  terminado: boolean
  aviso?: string
  onClose: () => void
}

export function BattleOverlay({ retador, rival, duelo, turno, terminado, aviso, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cerrar = useRef<HTMLButtonElement>(null)
  const paso = turno >= 0 ? duelo.turnos[turno] : null
  const ultimoGolpe = turno === duelo.turnos.length - 1
  const ganador = duelo.ganadorId === retador.id && duelo.ganadorOrigen === retador.origen ? retador : rival

  useEffect(() => {
    const elemento = dialog.current!
    const overflow = document.body.style.overflow
    elemento.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      elemento.close()
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => { if (terminado) cerrar.current?.focus() }, [terminado])

  const ataca = (c: Combatiente) => paso?.atacanteId === c.id && paso.atacanteOrigen === c.origen
  const vida = (c: Combatiente) => paso ? ataca(c) ? paso.vidaAtacante : paso.vidaDefensor : c.vida
  const nombreAtacante = ataca(retador) ? retador.nombre : rival.nombre

  return (
    <dialog ref={dialog} className="battle-overlay" aria-labelledby="battle-title"
      onCancel={(event) => { if (!terminado) event.preventDefault(); else onClose() }}>
      <div className="battle-content">
        <header className="battle-header">
          <span className="battle-eyebrow">ARENA MULTIAPLICADOR · DUELO EN VIVO</span>
          <h2 id="battle-title">{terminado ? 'Tenemos un ganador' : !paso ? 'Frente a frente' : 'Que hablen los golpes'}</h2>
          <p>{retador.origen} <span>vs.</span> {rival.origen}</p>
        </header>
        <div className="battle-scoreboard">
          {[retador, rival].map((c) => (
            <div key={`${c.origen}-${c.id}`} className="battle-health">
              <div><strong>{c.nombre}</strong><span>Nv. {c.nivel} · {c.clase}</span></div>
              <div className="battle-health-track"><span style={{ transform: `scaleX(${Math.max(0, vida(c) / c.vida)})` }} /></div>
              <small>{Math.max(0, Math.round(vida(c)))} / {Math.round(c.vida)} VIDA</small>
            </div>
          ))}
        </div>
        <div className="battle-stage" data-finished={ultimoGolpe || undefined}>
          <div className="battle-ring" aria-hidden="true" />
          {[retador, rival].map((c, i) => (
            <div key={`${c.origen}-${c.id}`} className="battle-position" data-side={i === 0 ? 'left' : 'right'}>
              <div className="battle-puppet" key={`${duelo.idDuelo}-${turno}-${i}`}
                data-action={!paso ? 'ready' : ultimoGolpe && c !== ganador ? 'ko' : ataca(c) ? 'attack' : paso.danoRecibido < 0 ? 'heal' : 'hit'}>
                <div className="puppet-shadow" />
                <div className="puppet-body" aria-hidden="true">
                  <div className="puppet-leg puppet-leg--back" /><div className="puppet-leg puppet-leg--front" />
                  <div className="puppet-arm puppet-arm--back"><div className="puppet-shield" /></div>
                  <div className="puppet-torso"><span /></div>
                  <div className="puppet-arm puppet-arm--front"><div className="puppet-sword" /></div>
                </div>
                <div className="puppet-head"><Chibi c={c} size={112} /></div>
                {paso && !ataca(c) && (
                  <span className="battle-damage" data-healing={paso.danoRecibido < 0 || undefined} data-crit={paso.critico || undefined}>
                    {paso.danoRecibido < 0 ? '+' : '−'}{Math.round(Math.abs(paso.danoRecibido))}
                  </span>
                )}
                {paso && !ataca(c) && paso.danoRecibido > 0 && <div className="battle-impact" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M50 0 61 33 93 13 73 44 100 52 68 62 85 91 55 74 39 100 36 69 3 82 23 53 0 36 33 35Z" /></svg></div>}
              </div>
              <span className="battle-name">{c.nombre}</span>
            </div>
          ))}
          {!paso && <div className="battle-versus">VS</div>}
          {ultimoGolpe && <div className="battle-victory"><span>VICTORIA</span><strong>{ganador.nombre}</strong><small>+{duelo.xpGanada} XP</small></div>}
        </div>
        <footer className="battle-footer">
          <p role="status">{terminado ? aviso ?? 'Registrando el resultado…' : !paso ? 'Los combatientes entran a la arena…' : `TURNO ${paso.n} · ${nombreAtacante} ${paso.danoRecibido < 0 ? 'le devuelve energía a su rival' : paso.critico ? '¡lanza su GOLPE CRÍTICO!' : 'lanza su ataque'}`}</p>
          <button ref={cerrar} className="btn" disabled={!terminado} onClick={onClose}>{terminado ? 'Volver a la arena' : 'Combate en curso'}</button>
        </footer>
      </div>
    </dialog>
  )
}
