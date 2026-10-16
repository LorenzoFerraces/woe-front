# WOE Front — Arena Multiaplicador

Frontend que se conecta a las 5 aplicaciones backend del curso, junta sus personajes en un roster único, deja que dos peleen, **simula el combate en el navegador** y manda el resultado de vuelta a cada aplicación.

No es un backend. No tiene base de datos.

## Requisitos

- Node 22+
- Las 5 APIs con el contrato del **Taller** implementado (`GET /api/arena/inscriptos` y `POST /api/arena/duelos`)

Para desarrollar la UI **no hace falta ninguna de las APIs**: con `"mock": true` funciona standalone.

## Setup

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Configuración: las URLs de las 5 apps

`public/arenas.json` — se edita **sin rebuild**, recargás el browser y al día. Solo hay que pegar la URL del endpoint de lectura; la de escritura y el nombre se derivan solos:

```json
{ "arenas": [
  { "url": "http://localhost:8081/api/arena/inscriptos", "mock": true }
]}
```

| Campo | Obligatorio | Qué hace |
|---|---|---|
| `url` | sí | URL completa de `GET /inscriptos`. La de `POST /duelos` sale de ahí reemplazando el recurso final. |
| `label` | no | Nombre visible en la card. Si no lo ponés, se deriva del host: `http://crudgpt.dominio.local/...` → **crudgpt**. |
| `mock` | no | `true` = datos falsos en memoria, **sin ninguna llamada de red**. Para desarrollar la UI sin las APIs arriba. |

Con `"mock": true` la app genera 4 personajes falsos por backend y no toca la red. Ponelo en `false` con las URLs reales para trabajar contra datos de verdad.

> Si las URLs reales van por subdominio (`crudgpt.dominio.local`), podés borrar el `label` y sale solo del host. Si van todas por `localhost:puerto` el `label` hace falta, porque si no las 5 se llamarían igual.

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm test         # tests de la simulación de combate (runner nativo de Node)
npm run build    # typecheck + build de producción a dist/
```

## Qué hace

1. Llama a `GET /api/arena/inscriptos` en las 5 apps **en paralelo** y las une en un roster (solo los que están en una Arena).
2. Marca como **smurf** a los personajes con estadísticas infladas y los bloquea para pelear.
3. Cada personaje muestra sus atributos, su arma y un avatar generado según clase y raza.
4. Elegís retador y rival, `Pelear` simula el combate con las fórmulas del enunciado de TP2 y lo reproduce turno a turno. Cada ataque tiene chance de **crítico** (daño ×2): `5% + destreza × 0.75%`, con techo de 40% para contener los smurfs.
5. Al terminar el último turno, **el duelo se registra solo**: le manda `POST /api/arena/duelos` a las apps que poseen a los participantes (1 o 2), con el mismo `idDuelo`, y cada una aplica el veredicto de sus personajes.

## Detección de smurfs

Un personaje con las estadísticas infladas no debería poder ganar todas las batallas. La detección se calcula **sobre el roster real** (no hay un personaje de referencia fijo), comparando cada uno contra el resto. Si es smurf, la card lleva una **cruz roja y un sello SMURF**, y no se puede seleccionar.

Usa tres señales, porque cada una cubre un hueco distinto:

| Señal | Detecta |
|---|---|
| `razonDominancia > 3` | ventaja *relativa* contra el PJ típico. No se puede eludir quedándose un pelo por debajo, y no se envenena si todos inflan parejo. |
| `dano > mediana × 3` | magnitud extrema frente al cohort. |
| `dano > 400` | red de seguridad para cuando la **mayoría** de una app infla, caso en que las dos señales relativas se apagan. |

> Límite conocido: un personaje apenas mejor que el promedio (fuerza +20%) gana más combates y **no** es smurf — no debería serlo. La detección apunta a los que rompen la escala, no a los que son un poco buenos.

## Arquitectura

```
arenas.json ──> api.ts ──┐
                         ├──> App.tsx ──┬──> Chibi.tsx ──> rasgos.ts
combate.ts <── api.ts ───┘              └──> index.css
  └── combate.test.ts
```

`combate.ts` es una **función pura**: no sabe nada de React ni de la red (las fórmulas y la razón de dominancia viven ahí). Por eso se testea en Node sin navegador y por eso el mismo código alimenta el cálculo y la animación.

## Tests

14 tests, sin framework — el runner nativo de Node. Cubren la simulación de combate, la detección de smurfs y el contrato.

- Los dos primeros verifican los **ejemplos numéricos del enunciado** (101.8 de daño generado, 135 de daño recibido) — si la especificación cambia, los tests fallan.
- Los de smurf verifican las propiedades que la hacen robustas: que subirle los números a *todo* el curso no marca a nadie (invariancia), que un inflado sí se marca, y que sigue detectando cuando una app infla por cantidad hasta envenenar la mediana.

```bash
npm test
# tests 14
# pass 14
```

## Stack

- React 19 + Vite 8 + TypeScript 5.9
- `@dicebear/core` + `@dicebear/styles` para los avatares
- Sin librería de animación: todo el movimiento es CSS
- Sin router, sin state management, sin charts

## Créditos

Los avatares usan el estilo [Adventurer](https://www.dicebear.com/styles/adventurer/) de Lisa Wischofsky, remix **CC BY 4.0**, servido por [DiceBear](https://www.dicebear.com/). La atribución está en el pie de la página y no debe removerse.

## Notas

- El `POST /api/arena/duelos` va **direcionado**: solo a las apps que poseen a los participantes. Los ids son locales a cada base (el `id` 7 de una app es otro personaje en otra), así que mandar el mismo body a las cinco aplicaría el duelo sobre personajes equivocados. El body es `{ idDuelo, participantes: [{ id, resultado }] }`.
- Las APIs deben tener CORS habilitado para el origen de este frontend.