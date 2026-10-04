# Kit de integración: tienda web en cada sucursal

Este kit es para quien desarrolla y mantiene **Sala de Profes** en cada sucursal:

| Sucursal | Repo | Prefijo de los pedidos |
|---|---|---|
| Santa Fe 746 ("La original") | `sala-de-profes-LVE` | `WEB-SF` |
| 24 de Septiembre y Chacabuco | `sala-de-profes-24` | `WEB-24` |

## Qué es y por qué

La landing de La Vieja Escuela vende **café de la casa por 1/4 kg** (en grano o molido). Funciona así:

1. El cliente elige sucursal, molienda y cantidad, y deja su nombre y su WhatsApp.
2. La landing crea la venta **en el sistema de esa sucursal**, en estado `pendiente_pago`.
3. Le muestra al cliente un ticket con el alias o CBU, el monto exacto y un botón de WhatsApp para mandar el comprobante.
4. El equipo de la sucursal, desde Sala de Profes, marca la venta **pagada** y después **entregada**. El ticket del cliente se actualiza solo.

**La landing no tiene base de datos.** Cada venta vive en el Supabase de la sucursal donde se compró, y la landing habla con cada sucursal por HTTP siguiendo un contrato. El contrato completo está en [`CONTRATO.md`](./CONTRATO.md).

Este kit le agrega a Sala de Profes:

- **Tablas y funciones en la base** (`supabase/migrations/20261004_tienda_web.sql`). La venta se crea en una sola transacción:
  - es idempotente,
  - toma el precio de la base,
  - aplica el límite de pedidos por teléfono,
  - vence sola si no se paga.
- **Una API pública** de 3 rutas para la landing, protegida con un secreto compartido.
- **La pantalla `/tienda`**, para que el equipo cobre, entregue y configure la tienda.
- **Un push nuevo**, "Nueva venta web", que les llega a socios y encargados.

La tienda arranca **apagada**: sin precio, sin stock y con la venta pausada. Hasta que alguien la active en `/tienda` → Ajustes, la web no puede vender.

## Qué hay en esta carpeta

| Ruta | Qué es |
|---|---|
| `parches/sala-de-profes-LVE.patch` | Parche para `sala-de-profes-LVE`, hecho sobre `93eb332`. |
| `parches/sala-de-profes-24.patch` | Parche para `sala-de-profes-24`, hecho sobre `8f5a0cb`. |
| `sql/20261004_tienda_web.sql` | La migración. Es la misma para las dos sucursales y ya viene adentro del parche. |
| `sql/opcional_cron_vencimientos.sql` | Job de pg_cron que vence los pedidos sin pagar cada hora. Es opcional. |
| `sql/rollback_tienda_web.sql` | Vuelta atrás de la base. **Borra las ventas web.** |
| `sql/pruebas/` | Pruebas de la migración en un Postgres descartable con Docker. |
| `CONTRATO.md` | Especificación de la API: requests, responses, errores, tokens y límites. |

Los dos parches traen el mismo código. La única diferencia: el de la 24 también agrega las variables nuevas a `.env.example`, porque LVE no tiene ese archivo. **Usá el parche de tu repo:** el de la 24 no aplica sobre LVE.

---

## Paso a paso (en cada sucursal)

> Hacelo primero en una rama y con un deploy de prueba si podés. Nada de esto toca datos existentes: solo agrega.

### 1. Traer el código

```bash
cd sala-de-profes-24                          # o sala-de-profes-LVE
git checkout main && git pull
git checkout -b feat/tienda-web
git am ../ruta/al/kit/parches/sala-de-profes-24.patch   # o sala-de-profes-LVE.patch
```

**Si `git am` falla** (pasa sobre todo en LVE, que cambia seguido):

```bash
git am --abort
git am -3 ../ruta/al/kit/parches/sala-de-profes-LVE.patch    # intenta un merge de 3 vías
# si quedan conflictos: resolvelos, git add <archivos>, git am --continue
```

**Si tampoco anda, aplicalo a mano.** Los archivos nuevos se copian tal cual. Los modificados son 5 cambios chicos que se hacen a mano (ver [Archivos del parche](#archivos-del-parche)). Otra opción es `git apply --reject` y resolver los `.rej`.

Compilá para confirmar:

```bash
npm ci
npx tsc --noEmit -p . 2>&1 | grep -E "tienda" || echo "sin errores en los archivos de la tienda"
npm run build
```

`next.config.ts` tiene `ignoreBuildErrors`, y el repo ya traía errores de tipos de antes (113 en la 24 y 123 en LVE). El parche no suma ninguno.

### 2. Aplicar la migración en Supabase

Elegí **una** de estas dos opciones:

```bash
# A) Desde tu compu, con SUPABASE_DB_URL en .env.local (pooler de Supabase)
node scripts/run-migration.mjs supabase/migrations/20261004_tienda_web.sql
```

B) Desde Supabase → **SQL Editor**: pegá el contenido de `supabase/migrations/20261004_tienda_web.sql` y dale **Run**.

- Se puede correr más de una vez sin romper nada.
- Crea `tienda_productos`, `tienda_ventas`, `tienda_venta_items`, las funciones `tienda_crear_venta()` y `tienda_vencer_pendientes()`, el setting `tienda` en `app_settings` y el producto `cafe-1-4`. Todo arranca apagado.

**Opcional:** corré también `sql/opcional_cron_vencimientos.sql` en el SQL Editor. Crea un job de pg_cron que cada hora pasa a "cancelado" los pedidos vencidos. No es imprescindible: la app ya los vence cada vez que alguien abre `/tienda` o el cliente mira su ticket.

### 3. Variables de entorno en Vercel

En el proyecto de la sucursal: **Settings → Environment Variables**, entorno *Production*.

| Variable | Santa Fe 746 | 24 de Septiembre |
|---|---|---|
| `TIENDA_API_SECRET` | `openssl rand -hex 32` (uno **propio**) | `openssl rand -hex 32` (otro distinto) |
| `TIENDA_PREFIJO_CODIGO` | `WEB-SF` | `WEB-24` |

- **`TIENDA_API_SECRET`** tiene que tener 32 caracteres como mínimo. Si falta o es más corto, las rutas públicas responden `503` siempre: nunca quedan abiertas.
- **`TIENDA_PREFIJO_CODIGO`** acepta `^[A-Z0-9-]{2,12}$`. Si falta, usa `WEB`. **No lo cambies después de vender:** los códigos ya entregados quedan con el prefijo viejo.
- **En la 24**, `.env.example` ya trae las dos variables.
- **En LVE** no hay `.env.example`. Agregalas a tu `.env.local` si querés probar en local.
- **Para Preview**, si querés probar, usá un secreto distinto del de producción.

### 4. Deploy

Mergeá `feat/tienda-web` a `main`, o hacé push y deploy como siempre. **Las variables nuevas recién se leen después de un redeploy.**

### 5. Cargar la tienda y abrirla

En Sala de Profes, con usuario **socio o encargado**: menú **Más → Operación → Tienda web** (`/tienda`) → **Ajustes**.

1. **Productos**: el precio del 1/4 kg, la marca "Hay stock" y el máximo por pedido (6 por defecto).
2. **Dónde transfieren**: alias y/o CBU (22 números), titular, banco y CUIT.
3. **Comprobantes y retiro**:
   - WhatsApp donde llegan los comprobantes, con 549 adelante y sin el 15 (`5493815551234`),
   - dirección,
   - horario,
   - indicaciones,
   - horas de reserva (48 por defecto).
4. Arriba, el interruptor **Venta activa**. No se puede prender sin alias o CBU y sin WhatsApp.
5. **Guardar ajustes**.

El panel también avisa si falta `TIENDA_API_SECRET` y muestra cómo van a salir los códigos (`WEB-24-0001`).

### 6. Conectar la landing

En el Vercel de la **landing**:

| Variable | Valor |
|---|---|
| `SUCURSAL_SANTA_FE_API_URL` | URL de Sala de Profes de Santa Fe, sin barra final (`https://sala-de-profes-lve.vercel.app`) |
| `SUCURSAL_SANTA_FE_API_SECRET` | el mismo `TIENDA_API_SECRET` de Santa Fe |
| `SUCURSAL_24_API_URL` | URL de Sala de Profes de la 24, sin barra final |
| `SUCURSAL_24_API_SECRET` | el mismo `TIENDA_API_SECRET` de la 24 |

En producción, `TIENDA_MOCK` tiene que estar en `0` o directamente no estar. Redeploy de la landing.

El secreto solo se usa de servidor a servidor: el navegador del cliente nunca lo ve.

---

## Probar con curl

```bash
BASE=https://sala-de-profes-24.vercel.app      # la de tu sucursal
SECRETO=...                                     # el TIENDA_API_SECRET
```

```bash
# 1. Sin secreto → 401 no_autorizado
curl -s $BASE/api/tienda/publico/catalogo

# 2. Catálogo → 200 con version 1, venta_habilitada, productos (anotá el id del café), pago, whatsapp, retiro
curl -s $BASE/api/tienda/publico/catalogo -H "Authorization: Bearer $SECRETO" -H "X-Contrato-Version: 1"
```

**Crear una venta de prueba.** Ojo: es una venta **real** en tu base. Después cancelala desde `/tienda`.

```bash
# 3. Crear → 201 { venta, token }; si repetís el MISMO comando → 200 con la misma venta y otro token
curl -s -X POST $BASE/api/tienda/publico/ventas \
  -H "Authorization: Bearer $SECRETO" -H "X-Contrato-Version: 1" -H "Content-Type: application/json" \
  -d '{"idempotency_key":"9b2e6c1a-4f5d-4a8e-b7c3-1d2e3f4a5b6c",
       "items":[{"producto_id":"<id del café>","cantidad":1,"opciones":{"molienda":"grano"}}],
       "cliente":{"nombre":"Prueba Equipo","telefono":"381 000-0000","email":null},
       "nota":"PRUEBA - cancelar","origen":"landing"}'

# 4. Consultar con el token que devolvió el paso 3 → 200 { venta }
curl -s $BASE/api/tienda/publico/ventas/WEB-24-0001 \
  -H "Authorization: Bearer $SECRETO" -H "X-Venta-Token: <token>"

# 5. Mismo código con otro token → 404 no_encontrada (igual que un código inexistente)
```

Respuestas esperables según el caso:

- **Venta pausada:** el paso 3 responde `409 venta_deshabilitada`.
- **Café sin precio o sin stock:** el paso 3 responde `409 producto_no_disponible`.
- **Antes de la migración:** las rutas públicas responden `500 error_interno`, y `/tienda` muestra "Falta aplicar la migración 20261004_tienda_web.sql".

---

## Cómo trabaja el equipo

La pantalla es **Más → Tienda web** (`/tienda`). Se actualiza sola cada 30 segundos y tiene 4 pestañas.

| Pestaña | Qué hay | Quién actúa |
|---|---|---|
| **Por cobrar** | Ventas esperando la transferencia. Si quedan menos de 6 h para que venzan, se resaltan en ámbar. | Socio o encargado. Cuando llega el comprobante **por el monto exacto**, tocan **Marcar pagado** y confirman. Si el cliente se arrepiente, **Cancelar** (el motivo es opcional). |
| **Para entregar** | Ya pagadas. | Cualquiera del equipo, barista incluido. Cuando el cliente pasa, le piden el **código** (`WEB-24-0042`) y tocan **Entregado**. Un socio o encargado puede **Cancelar**, con motivo obligatorio: hay que devolver la plata. |
| **Entregados** | Ventas cerradas. | Nadie. |
| **Cancelados** | Canceladas por el equipo o vencidas sin pago ("venció sin pago"). | Las canceladas por el equipo: nadie. Las vencidas: un socio o encargado puede tocar **Marcar pagado (llegó el comprobante)** y confirmar, si el cliente transfirió y el comprobante se vio tarde. La venta pasa a **Para entregar** y el cliente la ve pagada en su ticket. |

**En cada tarjeta:**

- código, estado y total,
- nombre del cliente, con su teléfono (toque para llamar) y un botón de **WhatsApp** que abre el chat con un mensaje ya armado,
- email, si lo dejó,
- productos con su molienda,
- nota del cliente,
- fecha de la venta y de vencimiento,
- quién la cobró, la entregó o la canceló.

**Otros detalles:**

- **Push:** cada venta nueva manda **"Nueva venta web"** a socios y encargados. Se configura en Configuración → Notificaciones, como cualquier otro evento.
- **Auditoría:** cada cobro, entrega, cancelación y cambio de ajustes queda registrado en **Auditoría**, módulo "Tienda web".
- **Vencimiento:** cuando vence el plazo, el pedido pasa solo a **Cancelados** ("venció sin pago"), aunque el cliente haya transferido y nadie haya visto el comprobante todavía. Si llega el comprobante **por el monto exacto**, buscá la venta en **Cancelados** y tocá **Marcar pagado (llegó el comprobante)**: vuelve a **Para entregar** con el mismo código, el mismo precio y el mismo total, y queda en Auditoría que había vencido. Esto se puede solo con las vencidas: una venta que canceló el equipo no se revive. Si preferís no tomar una transferencia muy tardía, devolvela y pedile que haga el pedido de nuevo.

---

## Seguridad

- **Secreto compartido.** Cada sucursal tiene su propio `TIENDA_API_SECRET`. Se compara en tiempo constante (`timingSafeEqual` sobre sha-256). Si falta, las rutas responden `503`: nunca quedan abiertas.
- **Token del ticket.** Se genera con `randomBytes(32)` y se le devuelve al cliente una sola vez. En la base se guarda **solo su sha-256**: un volcado de la base no revela los tokens que ya tienen los clientes. Para consultar hacen falta el secreto de la landing **y** el token.
- **Clave de idempotencia.** Repetir un pedido con la misma `idempotency_key` devuelve la misma venta con un token nuevo, pero **solo si coincide el teléfono** (últimos 10 dígitos). Si no coincide, responde `datos_invalidos` y no toca el token del cliente. Ni la clave ni el hash del token se le muestran al equipo: `authenticated` lee `tienda_ventas` por columnas, sin `token_hash` ni `idempotency_key`.
- **El mismo 404 para todo.** Un código inexistente y un token incorrecto dan la misma respuesta, y la comparación tarda lo mismo en los dos casos.
- **La respuesta pública no lleva datos personales.** Del nombre va solo el de pila. Nunca van el teléfono, el email, la nota ni quién movió la venta. Los logs del servidor tampoco guardan datos del cliente, ni el token, ni el secreto.
- **El precio lo pone la sucursal.** La landing manda producto, cantidad y opciones. El precio y el total salen siempre de `tienda_productos`.
- **RLS.**
  - Las tablas `tienda_*` las leen solo socio, encargado y barista activos (de `tienda_ventas`, todas las columnas menos `token_hash` e `idempotency_key`).
  - Nadie escribe desde el navegador: escriben las rutas del servidor con `service_role`.
  - Las funciones las ejecuta solo `service_role`.
- **Permisos en la app.**
  - Las rutas del equipo (`/api/tienda/config`, `/api/tienda/ventas` y `/api/tienda/ventas/[id]`) exigen sesión, rol **y** perfil activo (`profiles.is_active`). Alguien dado de baja en `/equipo` recibe `403` aunque vuelva a iniciar sesión.
  - Dar de baja en `/equipo` no bloquea la cuenta de Auth: la contraseña sigue sirviendo para el resto de la app. Al dar de baja a alguien, bloqueale también la cuenta (o cambiale la contraseña) en Supabase → Authentication, y si era encargado revisá el alias y el CBU en **Ajustes**.
  - Cobrar y cancelar: socio y encargado. También cobrar una vencida (Cancelados → **Marcar pagado**).
  - Entregar: también barista.
  - Ajustes: socio y encargado.
  - Cada cambio de estado se aplica solo si la venta sigue en el estado que se vio. Si dos personas tocan a la vez, la segunda recibe "Alguien más cambió la venta" y no se pisa nada.
- **Límites.**
  - Hasta 10 líneas por pedido.
  - De 1 a 20 unidades por línea.
  - El `max_por_pedido` de cada producto.
  - Hasta **3 pedidos sin pagar por teléfono en 24 h**. Compara los últimos 10 dígitos, así que `381 555-1234` y `+54 9 381 5551234` cuentan como el mismo teléfono.
  - El límite por IP y el control de bots los pone la landing.

## Rollback

Hay dos niveles:

1. **Apagar sin tocar nada.** En `/tienda` → Ajustes, apagá **Venta activa**. Otra forma: sacá `TIENDA_API_SECRET` de Vercel y hacé redeploy, y las rutas públicas pasan a responder `503`. En la landing, vaciá `SUCURSAL_*_API_URL` de esa sucursal.
2. **Sacar el código:** `git revert <commit del parche>` y deploy.

Si además querés **borrar la base**:

- Antes que nada, exportá las ventas: `select * from public.tienda_ventas order by numero;`.
- Después corré `sql/rollback_tienda_web.sql` en el SQL Editor. Borra el job de pg_cron, las funciones, las tablas, la secuencia y el setting `tienda`. **Se pierden todas las ventas web.**

## Archivos del parche

**Nuevos** (iguales en los dos repos):

```
supabase/migrations/20261004_tienda_web.sql      (copia de sql/20261004_tienda_web.sql)
src/lib/tienda/tipos.ts          tipos del contrato v1 + filas de las tablas + API del staff
src/lib/tienda/auth.ts           verificarSecreto / verificarVersion / protegerRutaPublica / requireRolActivo (staff)
src/lib/tienda/validar.ts        validarCrearVenta (equivalente a CrearVentaBodySchema, sin zod)
src/lib/tienda/config.ts         app_settings 'tienda', prefijo, productos, validación de ajustes
src/lib/tienda/ventas.ts         token + hash, carga de ventas, mapeo a VentaPublica / VentaStaff
src/lib/tienda/db.ts             cliente service_role sin tipar para las tablas tienda_*
src/lib/tienda/respuestas.ts     respuestas y errores con la forma del contrato
src/app/api/tienda/publico/catalogo/route.ts            GET  (landing)
src/app/api/tienda/publico/ventas/route.ts              POST (landing)
src/app/api/tienda/publico/ventas/[codigo]/route.ts     GET  (landing, X-Venta-Token)
src/app/api/tienda/ventas/route.ts                      GET  (staff)
src/app/api/tienda/ventas/[id]/route.ts                 PATCH (staff)
src/app/api/tienda/config/route.ts                      GET/PATCH (socio/encargado)
src/app/(app)/tienda/page.tsx
src/app/(app)/tienda/_components/VentaCard.tsx
src/app/(app)/tienda/_components/AjustesTienda.tsx
src/app/(app)/tienda/_components/formato.ts
src/app/(app)/tienda/_components/use-ahora.ts
```

**Modificados.** Son cambios chicos. Si el parche no aplica, hacelos a mano:

| Archivo | Cambio |
|---|---|
| `src/lib/audit.ts` | Agregar `'tienda'` a la unión de `module` en `AuditParams`. |
| `src/lib/push/notify-event.ts` | Agregar la clave `tienda_venta_nueva` a `DEFAULT_NOTIFICATION_EVENTS`: `label: 'Nueva venta web'`, `description: 'Un cliente compró desde la web (pendiente de transferencia).'`, `enabled: true`, `target_roles: ['socio', 'encargado']`, `target_user_ids: []`. El resto del archivo **difiere entre repos** (LVE usa `idsConRolEnTurno`): tocá solo ese objeto. |
| `src/components/layout/BottomNav.tsx` | Importar `ShoppingBag` de lucide. Agregar `{ label: 'Tienda web', href: '/tienda', icon: ShoppingBag, description: 'Ventas de la web: cobrar y entregar' }` en el grupo "Operación" de `SOCIO_MORE` (después de "Ventas") y de `ENCARGADO_MORE` (primero), y en "Herramientas" de `BARISTA_MORE` (después de "Vajilla"). |
| `src/components/layout/TopBar.tsx` | En `PAGE_TITLES`: `'/tienda': 'Tienda web'`. |
| `src/app/(app)/auditoria/page.tsx` | En `MODULE_CONFIG`: `tienda: { label: 'Tienda web', icon: ShoppingBag, color: '#006d5a', bg: '#e8f5f1' }` (e importar `ShoppingBag`). Así aparece en el filtro. |
| `.env.example` | **Solo en la 24.** Agrega `TIENDA_API_SECRET` y `TIENDA_PREFIJO_CODIGO=WEB-24`. |

`src/types/database.ts` **no se toca**, porque difiere entre repos y se regenera. Las tablas nuevas se consultan con un cliente sin tipar y se castean a los tipos de `src/lib/tienda/tipos.ts`. La ruta `/tienda` no choca con nada: `/pedidos` son compras a proveedores y `/ventas` es Fudo.

## Cómo se verificó

Todo se hizo en clones descartables. Los repos originales no se tocaron.

**Tipos:** `npx tsc --noEmit` da la misma cantidad de errores antes y después del parche, y ninguno es de un archivo nuevo o tocado.

| Repo | Errores sin el parche | Errores con el parche |
|---|---|---|
| 24 | 113 | 113 |
| LVE | 123 | 123 |

**Lint:** `npx eslint` sobre los archivos nuevos y tocados no da errores nuevos. El único que aparece es uno que `TopBar.tsx` ya tenía antes (`setMounted` en un effect).

**Build:** `next build` en la 24 pasa y genera las 7 rutas nuevas.

**Patches:** `git apply --check` y `git am` andan sobre clones frescos de los dos repos, y el resultado es idéntico a la rama probada.

**Prueba de punta a punta:** se hizo en la 24 con `next start`. La base fue un Postgres descartable (`supabase/postgres:17.6`) con la estructura real y la migración, detrás de un PostgREST mínimo de prueba. Las respuestas se validaron con los **schemas zod reales** de la landing (`CatalogoSchema`, `CrearVentaRespuestaSchema` y `ConsultarVentaRespuestaSchema`).

1. **Secreto y versión.** Sin secreto o con uno malo: `401`. Con `X-Contrato-Version: 2`: `400`. Con un secreto corto o sin secreto: `503`.
2. **Venta nueva y repetición.** La venta nueva da `201`. La repetición da `200`, con el mismo código y otro token; el token viejo pasa a dar `404`.
3. **Errores de validación.** Dan `400` o `409` con el `campo` exacto.
4. **Venta pausada:** `409`.
5. **Cuarto pedido sin pagar con el mismo teléfono escrito distinto:** `429`.
6. **Push.** Las ventas nuevas consultan a quién mandarle el push después de responder.
7. **Cambios de estado.** Se probaron transiciones válidas e inválidas (`409`) y permisos por rol (`403` para el barista que quiere cobrar o para el chef). Seis "pagado" simultáneos dan **un** `200` y cinco `409`. Una venta vencida pasa a "cancelado" al consultarla.
8. **Ajustes.** Validan alias, CBU, WhatsApp, horas y "disponible sin precio".
9. **Sin Supabase o sin migración.** Las rutas públicas dan `500` controlado y `/tienda` avisa que falta la migración.
10. **Pantalla.** `/tienda` se revisó a 375 px: sin scroll horizontal, con el ámbar de "vence en < 6 h" y la confirmación en dos pasos.
