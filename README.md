# Kambia

Sistema de control de dinero para casa de cambio informal. Ver la especificación
completa del negocio en el documento de origen (contexto, módulos, reglas de
negocio y casos de prueba).

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS. Mobile-first.
- **Backend / DB:** Supabase (PostgreSQL + Auth + Realtime).
- **Auth:** Supabase Auth, 2 usuarios fijos (Milagro / Juan) con roles `dueña` / `trabajador`.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

Crea un proyecto en [supabase.com](https://supabase.com). Copia la URL y la
`anon key` del proyecto (Project Settings → API).

### 2. Ejecutar la migración

En el SQL Editor de Supabase, ejecuta el contenido de
`supabase/migrations/0001_init_schema.sql`. Esto crea todas las tablas,
vistas de saldo calculado, triggers de inmutabilidad y políticas de RLS, y
precarga las 13 cuentas conocidas, el catálogo de monedas y las tasas de
comisión (S/2 monedas, S/1 billetes por cada S/100).

### 3. Crear los 2 usuarios de Auth

En Dashboard → Authentication → Users → **Add user**, crea:

- `milagro@kambia.local` (contraseña a elección de Milagro)
- `juan@kambia.local` (contraseña a elección de Juan)

Luego ejecuta `supabase/seed_usuarios.sql` en el SQL Editor para vincular
estos usuarios de Auth con sus roles de negocio (`dueña` / `trabajador`) en la
tabla `usuarios`.

### 4. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
valores del paso 1.

### 5. Instalar y correr

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`. El login muestra dos
botones (Milagro / Juan); al seleccionar uno se pide la contraseña creada en
el paso 3.

### 6. Desplegar en Vercel

Conecta el repositorio en Vercel y define las mismas 2 variables de entorno
en el proyecto. `next build` es el comando de build estándar.

## Estructura

```
supabase/migrations/0001_init_schema.sql   Schema completo + triggers + RLS
supabase/seed_usuarios.sql                 Vincula usuarios Auth con roles
app/(app)/                                 Pantallas autenticadas (Fase 1 MVP)
lib/actions/                               Server actions (mutaciones)
lib/queries/                               Lecturas desde Supabase
lib/supabase/                              Clientes browser/server/middleware
types/database.types.ts                    Tipos alineados al schema SQL
```

## Decisiones de diseño relevantes

- **Saldos siempre calculados:** `v_saldos_cuentas` es una vista SQL que suma
  y resta `movimientos` en tiempo real — nunca hay un campo de saldo editable
  a mano, cumpliendo el requisito central de trazabilidad.
- **Inmutabilidad de movimientos:** un trigger bloquea `UPDATE`/`DELETE` sobre
  `movimientos` salvo para el rol `dueña`, y aun así deja registro en
  `movimientos_audit_log`. Los errores se corrigen con `ajuste_correccion`
  referenciando el movimiento original.
- **Bloqueo de días cerrados:** un trigger impide insertar movimientos con
  `fecha_contable` de un día donde la cuenta afectada ya fue cerrada
  (`cierres_diarios.cerrado = true`).
- **Faltante real vs. variación cambiaria:** el cierre diario calcula la
  diferencia real (conteo físico − saldo del sistema, en la moneda nativa de
  la cuenta) por separado de la variación cambiaria (efecto de un cambio de
  TC durante el día sobre cuentas en USD/EUR), nunca mezcladas.
- **Resiliencia offline:** el formulario de nueva transacción y la bitácora
  de Juan guardan en `localStorage` cuando no hay conexión y reintentan el
  envío automáticamente al reconectar (`lib/offlineQueue.ts`).

## Fase 2 (no incluida en este MVP)

Historial/reportes filtrables avanzados, alertas de cierre próximo/deudas
vencidas, y una UI dedicada de corrección de movimientos (hoy cubierta de
forma funcional pero mínima desde el mismo formulario de nueva transacción,
tipo `ajuste_correccion`).
