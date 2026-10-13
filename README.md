# WOE Front — Arena Multiaplicador

Frontend que se conecta a las 5 aplicaciones backend del curso, junta sus personajes en un roster único, deja que dos peleen, **simula el combate en el navegador** y manda el resultado de vuelta a cada aplicación.

No es un backend. No tiene base de datos.

## Requisitos

- Node 22+
- Las 5 APIs con el contrato de la Entrega 4 implementado (`GET /api/arena/inscriptos` y `POST /api/arena/duelos`)

## Setup

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Configuración: las URLs de las 5 apps

`public/arenas.json` — se edita **sin rebuild**, recargás el browser y al día:

```json
{ "arenas": [
  { "id": "crudgpt", "label": "CrudGPT", "baseUrl": "http://localhost:8081", "mock": true }
]}
```

Con `"mock": true` la app genera 4 personajes falsos por backend y **no hace ninguna llamada de red**. Sirve para desarrollar la UI sin las APIs arriba. Ponelo en `false` y poné las URLs reales para trabajar contra datos de verdad.

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm test         # tests de la simulación de combate (runner nativo de Node)
npm run build    # typecheck + build de producción a dist/
```

## Qué hace

1. Llama a `GET /api/arena/inscriptos` en las 5 apps **en paralelo** y las une en un roster.
2. Cada personaje muestra sus atributos, su arma y un avatar generado según clase y raza.
3. Elegís retador y rival (solo los que están en una Arena pueden pelear).
4. `Pelear` simula el combate con las fórmulas del enunciado de TP2 y lo reproduce turno a turno.
5. Al terminar el último turno, **el duelo se registra solo**: le manda `POST /api/arena/duelos` a las apps que poseen a los participantes (1 o 2), con el mismo `idDuelo`, y cada una aplica el veredicto de sus personajes.

## Arquitectura

```
arenas.json ──> api.ts ──┐
                         ├──> App.tsx ──> Chibi.tsx ──> rasgos.ts
combate.ts <── api.ts ───┘         │
  └── combate.test.ts             └──> index.css
```

`combate.ts` es una **función pura**: no sabe nada de React ni de la red. Por eso se testea en Node sin navegador y por eso el mismo código alimenta el cálculo y la animación.

## Tests

7 tests sobre la simulación. Los dos primeros verifican los **ejemplos numéricos del enunciado** (101.8 de daño generado, 135 de daño recibido) — si la especificación cambia, los tests fallan.

```bash
npm test
# tests 7
# pass 7
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