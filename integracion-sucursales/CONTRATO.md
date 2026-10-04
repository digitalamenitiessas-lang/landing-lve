# Contrato v1: landing ↔ sucursal (tienda web)

Este documento es la especificación de la API que cada sucursal ("Sala de Profes") le ofrece a la landing de La Vieja Escuela para vender café.

La fuente de verdad de las formas de datos es `src/lib/tienda/contrato.ts` de la landing, que valida con zod **todas** las respuestas. Si una sucursal devuelve algo que no cumple el contrato, la landing lo trata como "sucursal no disponible". El kit repite los tipos en TypeScript puro en `src/lib/tienda/tipos.ts` de cada sucursal, porque esa app no usa zod.

- [Resumen](#resumen)
- [Autenticación y headers](#autenticación-y-headers)
- [GET /api/tienda/publico/catalogo](#get-apitiendapublicocatalogo)
- [POST /api/tienda/publico/ventas](#post-apitiendapublicoventas)
- [GET /api/tienda/publico/ventas/{codigo}](#get-apitiendapublicoventascodigo)
- [Errores](#errores)
- [Estados de una venta](#estados-de-una-venta)
- [Idempotencia](#idempotencia)
- [Tokens del ticket](#tokens-del-ticket)
- [Vencimiento](#vencimiento)
- [Límites](#límites)
- [Privacidad](#privacidad)
- [Versionado](#versionado)

---

## Resumen

| Método | Ruta | Para qué | Respuesta OK |
|---|---|---|---|
| `GET` | `/api/tienda/publico/catalogo` | Productos, precios, si la venta está abierta y datos de pago/retiro | `200 Catalogo` |
| `POST` | `/api/tienda/publico/ventas` | Crear una venta `pendiente_pago` | `201 { venta, token }`, o `200` si es una repetición |
| `GET` | `/api/tienda/publico/ventas/{codigo}` | Estado de una venta para el ticket del cliente (header `X-Venta-Token`) | `200 { venta }` |

- La base de cada ruta es la URL del sistema de la sucursal, sin barra final. Por ejemplo, `https://sala-de-profes-24.vercel.app`.
- Todo va en JSON UTF-8.
- Todas las respuestas llevan `Cache-Control: no-store`.
- Las fechas son ISO 8601 con zona horaria, tal como las devuelve Postgres (`2026-10-04T18:30:00.123+00:00`).
- Los montos son pesos argentinos con IVA incluido, como `number` (`9500`, `9500.5`). El precio y el total **siempre** los calcula la sucursal con su propia base: la landing nunca manda precios.

---

## Autenticación y headers

En **todas** las llamadas, la landing manda:

```http
Authorization: Bearer <TIENDA_API_SECRET de esa sucursal>
X-Contrato-Version: 1
Accept: application/json
```

- **`TIENDA_API_SECRET`** es una variable de entorno de la sucursal, con un mínimo de 32 caracteres. Se genera con `openssl rand -hex 32`. En la landing, el mismo valor va en `SUCURSAL_SANTA_FE_API_SECRET` o `SUCURSAL_24_API_SECRET`.
- **Comparación:** se hace en tiempo constante (`crypto.timingSafeEqual` sobre el sha-256 de los dos valores, así tampoco se filtra el largo).
- **Si falta `TIENDA_API_SECRET`** en la sucursal, o tiene menos de 32 caracteres, las tres rutas responden **siempre** `503` con `{"error":"La tienda web de esta sucursal no está configurada.","codigo":"error_interno"}`. Nunca quedan abiertas.
- **Si el secreto falta o no coincide:** `401` con `{"error":"Secreto inválido.","codigo":"no_autorizado"}`.
- **Si `X-Contrato-Version` viene con otro valor:** `400` con `codigo: "datos_invalidos"` y `campo: "X-Contrato-Version"`. Si no viene, se asume v1.
- **`X-Cliente-IP`:** la landing lo puede mandar en el POST, pero v1 lo ignora.

El secreto lo usa solo el servidor de la landing: el navegador del cliente nunca habla directo con la sucursal.

---

## GET /api/tienda/publico/catalogo

Devuelve los productos ordenados por `orden` y después por `nombre`, junto con la configuración de la tienda de esa sucursal. La configuración vive en `app_settings`, con clave `tienda`.

**Request**

```bash
curl -s https://sala-de-profes-24.vercel.app/api/tienda/publico/catalogo \
  -H "Authorization: Bearer $SECRETO" -H "X-Contrato-Version: 1"
```

**Response 200**

```json
{
  "version": 1,
  "venta_habilitada": true,
  "mensaje": "Esta semana tostamos el jueves: retirás desde el viernes.",
  "productos": [
    {
      "id": "6f1c0a52-3d1e-4c47-9a0e-2a5b6f0c9d11",
      "slug": "cafe-1-4",
      "nombre": "Café de la casa · 1/4 kg",
      "descripcion": "El mismo café que servimos en la barra. Bolsa de 250 g.",
      "presentacion": "250 g",
      "precio": 9500,
      "disponible": true,
      "opciones": [
        {
          "id": "molienda",
          "nombre": "Molienda",
          "requerida": true,
          "valores": [
            { "id": "grano", "nombre": "En grano" },
            { "id": "espresso", "nombre": "Molido para espresso" },
            { "id": "moka", "nombre": "Molido para cafetera italiana" },
            { "id": "filtro", "nombre": "Molido para filtro (V60, Chemex, goteo)" },
            { "id": "prensa", "nombre": "Molido para prensa francesa" }
          ]
        }
      ],
      "max_por_pedido": 6
    }
  ],
  "pago": {
    "alias": "la.vieja.escuela.24",
    "cbu": null,
    "titular": "Nombre del titular",
    "banco": "Banco",
    "cuit": "20-12345678-9"
  },
  "whatsapp": "5493815551234",
  "retiro": {
    "direccion": "24 de Septiembre y Chacabuco",
    "horario": "Lunes a sábado de 8 a 20",
    "indicaciones": "Pedilo en la barra con tu código."
  },
  "vencimiento_horas": 48
}
```

(Los valores son de ejemplo: los datos reales los carga cada sucursal en `/tienda` → Ajustes. Los de `pago` y `whatsapp` los cambia solo un socio, y cada cambio queda en la auditoría de la sucursal.)

**Reglas**

| Campo | Regla |
|---|---|
| `venta_habilitada` | Interruptor general de la sucursal. Con `false`, la landing muestra el café **sin precio y sin dejar comprar**, con el aviso "La venta web está pausada en esta sucursal", y el POST responde `409 venta_deshabilitada`. Desde la app no se puede activar sin alias o CBU y sin WhatsApp. |
| `productos[].disponible` | Es `false` si el producto está apagado, **no tiene precio** (`precio <= 0`; en ese caso sale `precio: 0`) **o tiene opciones mal cargadas** (ver la fila siguiente). Con `false`, la landing muestra el café sin precio y sin dejar comprar, con el aviso "Agotado en esta sucursal". |
| `productos[].opciones` | Se descartan las opciones mal armadas (sin `id`, sin `nombre` o sin `valores`), para que la landing no rechace el catálogo entero. Si hubo que descartar o recortar algo (también un `id` de opción o de valor con espacios de más o de más de 60 caracteres), el producto sale con `disponible: false`: `tienda_crear_venta` valida contra lo guardado y rechazaría lo que mande la landing. |
| `whatsapp` | Solo dígitos, de 10 a 15, con formato internacional (`549381…`), o `null`. |
| `vencimiento_horas` | Entero de 1 a 720. Si lo guardado es inválido, vale 48. |

**Qué muestra la landing.** Toma el producto con `slug` `cafe-1-4` (o, si no está, el primero de `productos`). Solo deja comprar si `venta_habilitada` es `true` y ese producto viene con `disponible: true`. Si no, no muestra el precio ni el formulario de compra, y avisa por qué. Se mira en este orden:

| Caso | Aviso en la landing |
|---|---|
| `venta_habilitada: false` | "La venta web está pausada en esta sucursal" |
| El producto viene con `disponible: false` | "Agotado en esta sucursal" |
| `productos` viene vacío | "Todavía no estamos vendiendo café en esta sucursal" |

---

## POST /api/tienda/publico/ventas

Crea una venta `pendiente_pago`. Toda la lógica corre en una sola transacción de Postgres, en `public.tienda_crear_venta(p_venta, p_prefijo, p_token_hash)`:

- valida de nuevo,
- toma los precios de la base,
- controla stock, máximos, opciones y el límite por teléfono,
- es idempotente.

**Request**

```bash
curl -s -X POST https://sala-de-profes-24.vercel.app/api/tienda/publico/ventas \
  -H "Authorization: Bearer $SECRETO" -H "X-Contrato-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "9b2e6c1a-4f5d-4a8e-b7c3-1d2e3f4a5b6c",
    "items": [
      { "producto_id": "6f1c0a52-3d1e-4c47-9a0e-2a5b6f0c9d11", "cantidad": 2, "opciones": { "molienda": "espresso" } }
    ],
    "cliente": { "nombre": "Juana Pérez", "telefono": "381 555-1234", "email": null },
    "nota": "Paso el sábado a la mañana",
    "origen": "landing"
  }'
```

| Campo | Tipo | Regla |
|---|---|---|
| `idempotency_key` | string | UUID que genera la landing una vez por intento de compra. |
| `items` | array | De 1 a 10 líneas. |
| `items[].producto_id` | string | `id` de un producto del catálogo. |
| `items[].cantidad` | number | Entero de 1 a 20. La suma de las líneas del mismo producto no puede pasar su `max_por_pedido`. |
| `items[].opciones` | object | `{ [opcion.id]: valor.id }`. Las opciones `requerida` son obligatorias. Una opción que el producto no tiene se rechaza. |
| `cliente.nombre` | string | De 2 a 80 caracteres, recortado. |
| `cliente.telefono` | string | `^[+]?[\d\s()-]{8,20}$`, con 8 a 15 dígitos. Se guarda tal cual lo escribió el cliente. |
| `cliente.email` | string \| null | Opcional. |
| `nota` | string \| null | Hasta 300 caracteres. |
| `origen` | `"landing"` | En v1 es el único valor posible. |

**Response 201: venta nueva** (o **200** si es una repetición con la misma `idempotency_key`)

```json
{
  "venta": {
    "codigo": "WEB-24-0042",
    "estado": "pendiente_pago",
    "total": 19000,
    "items": [
      {
        "nombre": "Café de la casa · 1/4 kg",
        "detalle": "Molido para espresso",
        "cantidad": 2,
        "precio_unitario": 9500,
        "subtotal": 19000
      }
    ],
    "cliente_nombre": "Juana",
    "creado_at": "2026-10-04T21:30:00.123+00:00",
    "pagado_at": null,
    "retirado_at": null,
    "cancelado_at": null,
    "vence_at": "2026-10-06T21:30:00.123+00:00",
    "pago": { "alias": "la.vieja.escuela.24", "cbu": null, "titular": "…", "banco": "…", "cuit": "…" },
    "whatsapp": "5493815551234",
    "retiro": { "direccion": "24 de Septiembre y Chacabuco", "horario": "…", "indicaciones": "…" }
  },
  "token": "pX1v0bQe2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9"
}
```

- **`codigo`:** se arma con el prefijo de la sucursal (`TIENDA_PREFIJO_CODIGO`: `WEB-SF` o `WEB-24`) y un número correlativo de 4 dígitos. Desde 10000 usa el número completo, como en `WEB-24-12345`.
- **`detalle`:** son los nombres de los valores elegidos, unidos con ` · `.
- **`pago`, `whatsapp` y `retiro`:** salen de la configuración **actual** de la sucursal.
- **Errores posibles:** `datos_invalidos`, `opcion_invalida`, `venta_deshabilitada`, `producto_no_disponible`, `demasiados_pedidos` (ver [Errores](#errores)).
- **Aviso al equipo:** si la venta es nueva, la sucursal manda un push a socios y encargados (evento `tienda_venta_nueva`) **después** de responder.

---

## GET /api/tienda/publico/ventas/{codigo}

Estado de una venta para el ticket del cliente. Además del secreto, pide el token de **esa** venta.

```bash
curl -s https://sala-de-profes-24.vercel.app/api/tienda/publico/ventas/WEB-24-0042 \
  -H "Authorization: Bearer $SECRETO" -H "X-Contrato-Version: 1" \
  -H "X-Venta-Token: $TOKEN"
```

- **Response 200:** `{ "venta": VentaPublica }`, con la misma forma que en el POST.
- **Response 404:** `{"error":"No encontramos ese pedido.","codigo":"no_encontrada"}`. Es **idéntico** para un código que no existe, un token que no corresponde, un token ausente o un código mal formado. Así nadie puede averiguar qué códigos existen.
- **Ventas vencidas:** antes de leer, la sucursal pasa a `cancelado` las pendientes vencidas. El ticket nunca muestra como "esperando pago" algo que ya venció.

---

## Errores

Todo error tiene la forma:

```json
{ "error": "Texto para mostrarle al cliente, en voseo.", "codigo": "datos_invalidos", "campo": "items.0.cantidad" }
```

- `campo` es opcional y **nunca es `null`**: si no aplica, no viene.
- `campo` usa la misma ruta que zod (`cliente.telefono`, `items.0.opciones.molienda`), con índices desde 0.

| `codigo` | HTTP | Cuándo |
|---|---|---|
| `no_autorizado` | 401 | Falta el secreto o no coincide. |
| `datos_invalidos` | 400 | El body está mal formado o algún dato no cumple las reglas. `campo` dice cuál. También se usa para un `X-Contrato-Version` distinto de 1 y para una `idempotency_key` repetida con otro teléfono (`campo: idempotency_key`). |
| `opcion_invalida` | 400 | Falta una opción requerida, o una opción o valor no existe. |
| `venta_deshabilitada` | 409 | La sucursal pausó la venta web. |
| `producto_no_disponible` | 409 | El producto no existe, está sin stock o no tiene precio. |
| `demasiados_pedidos` | 429 | Ese teléfono ya tiene 3 pedidos sin pagar, sin vencer, en las últimas 24 h. |
| `no_encontrada` | 404 | Código inexistente o token incorrecto (la misma respuesta a propósito). |
| `error_interno` | 500 | Falla de la sucursal: base caída, migración sin aplicar, etc. |
| `error_interno` | 503 | `TIENDA_API_SECRET` no configurado en la sucursal. |

Qué hace la landing con cada error:

- **El servidor de la landing** reenvía al navegador `codigo`, `error` y `campo` tal como los mandó la sucursal (`src/lib/tienda/cliente.ts`). Ante `opcion_invalida`, `producto_no_disponible` o `venta_deshabilitada` además descarta el catálogo cacheado, para que el formulario recargue el actual.
- **El formulario muestra el `error` de la sucursal tal cual solo para `datos_invalidos` y `opcion_invalida`**, porque ahí el texto señala el campo (y lo marca, si `campo` corresponde a uno del formulario).
- **Para `venta_deshabilitada`, `producto_no_disponible` y `demasiados_pedidos` muestra textos propios.** Cambiar esos textos en `tienda_crear_venta` no se ve en la landing.
- **Ante un 5xx** con error en contrato (`error_interno`) muestra un texto propio de "algo falló del lado de la sucursal". **Ante un 401, un timeout, un cuerpo que no es JSON o una respuesta fuera de contrato**, uno de "no pudimos conectar con la sucursal".
- En el ticket, un `404 no_encontrada` se muestra siempre con el texto de la landing.

---

## Estados de una venta

```
pendiente_pago ──(llegó el comprobante)──▶ pagado ──(lo retiró)──▶ retirado
      │                                        │
      ├──(el equipo la cancela)──▶ cancelado ◀─┤ (con motivo: hay que devolver la plata)
      └──(venció sin pago)───────▶ cancelado   (motivo_cancelacion = 'vencido')
                                       │
                                       └──(el comprobante llegó tarde)──▶ pagado   (solo las vencidas)
```

| Estado | Lo pone | Cuándo |
|---|---|---|
| `pendiente_pago` | la sucursal, al crear | Reservada; espera la transferencia. |
| `pagado` | socio o encargado, en `/tienda` | Llegó el comprobante por el monto exacto. |
| `retirado` | socio, encargado o barista | El cliente se llevó el café. Estado final. |
| `cancelado` | socio o encargado, o el vencimiento automático | Estado final, salvo las vencidas (`motivo_cancelacion = 'vencido'`): socio o encargado pueden pasarlas a `pagado` si el cliente había transferido y el comprobante se vio tarde. |

`retirado` no cambia más, y `cancelado` tampoco, salvo la excepción de las vencidas. Al pasar una vencida a `pagado`, la sucursal completa `pagado_at` y **vuelve a poner en `null`** `cancelado_at` y `motivo_cancelacion`: el ticket la ve como cualquier pagada (lo que tenía queda en la auditoría de la sucursal). La landing no puede dar por final un `cancelado` con motivo `vencido`. Cada paso guarda la fecha y quién lo hizo (`pagado_at`/`pagado_por`, etc.). La landing ve solo las fechas.

---

## Idempotencia

- La landing genera una `idempotency_key` (UUID) por intento de compra y la **reusa** si reintenta, por ejemplo después de un timeout o de un doble clic.
- La misma clave devuelve **la misma venta**, con status `200` en lugar de `201`, y un **token nuevo**. El token anterior deja de servir: queda guardado solo el hash del último.
- La repetición tiene que traer **el mismo teléfono** (se comparan los últimos 10 dígitos). Si no coincide, no es un reintento: responde `400 datos_invalidos` con `campo: idempotency_key`, y la venta y su token no cambian.
- Con la misma clave no se vuelve a validar stock ni a contar el límite por teléfono. La repetición responde `200` aunque la venta se haya pausado después.
- Si dos requests con la misma clave llegan a la vez, un candado (`pg_advisory_xact_lock`) las serializa, y una restricción `unique` hace de red de seguridad. Nunca se duplica la venta.
- La landing no debe reusar una clave para un pedido distinto: recibiría la venta vieja (o `datos_invalidos`, si cambió el teléfono).

---

## Tokens del ticket

- La sucursal genera el token con `crypto.randomBytes(32).toString('base64url')`: 43 caracteres.
- Se devuelve **una sola vez**, en la respuesta del POST.
- En la base se guarda solo su `sha-256` en hex (`tienda_ventas.token_hash`). Un volcado de la base no revela los tokens que ya tienen los clientes.
- La `idempotency_key` sí se guarda en claro. Con ella y el mismo teléfono, el POST entrega un token nuevo de esa venta (y deja sin efecto el anterior). Por eso no se loguea y el equipo no la ve: `authenticated` lee `tienda_ventas` por columnas, sin `idempotency_key` ni `token_hash`.
- Para consultar una venta hacen falta el secreto de la landing **y** el token. El token viaja en el header `X-Venta-Token`, nunca en la URL de la sucursal. En la landing va en el fragmento (`#t=...`) del link del ticket, que el navegador no le manda a ningún servidor.
- La comparación se hace en tiempo constante, y también se compara cuando el código no existe.

---

## Vencimiento

- `vence_at` = `created_at` + `vencimiento_horas` (por defecto 48 h, máximo 720 h).
- Las pendientes vencidas pasan a `cancelado` con `motivo_cancelacion = 'vencido'` y `cancelado_at = vence_at`. Eso lo hace `public.tienda_vencer_pendientes()`, que la sucursal llama:
  - antes de cada consulta del ticket,
  - antes de cada listado en `/tienda`,
  - cada hora, si se instaló el job opcional de pg_cron (`sql/opcional_cron_vencimientos.sql`).
- Una pendiente vencida ya no cuenta para el límite por teléfono, aunque todavía no haya pasado a `cancelado`.

---

## Límites

| Qué | Límite | Error |
|---|---|---|
| Líneas por pedido | 1 a 10 | `datos_invalidos` · `items` |
| Cantidad por línea | entero de 1 a 20 | `datos_invalidos` · `items.N.cantidad` |
| Unidades de un mismo producto | `max_por_pedido` (por defecto 6, máximo 20) | `datos_invalidos` · `items.N.cantidad` |
| Pedidos sin pagar por teléfono | 3 en 24 h, sin contar los vencidos. Compara los últimos 10 dígitos: `381 555-1234`, `+54 9 381 5551234` y `0381 5551234` son el mismo teléfono. | `demasiados_pedidos` · `cliente.telefono` (429) |
| Nombre | 2 a 80 caracteres | `datos_invalidos` · `cliente.nombre` |
| Nota | hasta 300 caracteres | `datos_invalidos` · `nota` |
| Reserva | 1 a 720 h | (configuración) |

La sucursal no limita por IP: eso, y el control de bots, lo hace la landing antes de llamar.

---

## Privacidad

- **Lo que nunca sale de la sucursal:** `VentaPublica` no incluye teléfono, email, nota, ids internos ni quién movió la venta. Del nombre manda solo el de pila (`"Juana Pérez"` → `"Juana"`).
- **Lo que no se loguea:** la sucursal no escribe en los logs datos del cliente (nombre, teléfono, email, nota), ni el token, ni el secreto. Solo el código de error técnico.
- **Lo que ve el equipo:** el teléfono, el email y la nota se ven solo en `/tienda` de la app de la sucursal, con sesión iniciada de socio, encargado o barista.
- **Permisos en la base:** las tablas `tienda_*` tienen RLS. Las leen solo socio, encargado y barista activos (de `tienda_ventas`, todas las columnas menos `token_hash` e `idempotency_key`), y escribe solo el servidor (`service_role`). Las funciones `tienda_*` las ejecuta solo `service_role`.
- **Rutas del equipo:** `/api/tienda/config` y `/api/tienda/ventas*` usan `service_role`, así que exigen ellas mismas sesión, rol y perfil activo (`profiles.is_active`).

---

## Versionado

- **v1:** esta versión. Se anuncia con `X-Contrato-Version: 1` y en el catálogo con `"version": 1`.
- **Cambios compatibles** (no suben la versión): agregar campos **opcionales** a las respuestas que la landing pueda ignorar, agregar productos u opciones, o cambiar textos de error (de los 4xx, la landing muestra el de la sucursal solo para `datos_invalidos` y `opcion_invalida`: ver [Errores](#errores)).
  - Ojo: los schemas zod de la landing son `z.object` y **descartan** las claves que no conocen. Un campo nuevo no rompe nada, pero tampoco se usa hasta que la landing lo agregue.
- **Cambios incompatibles** (suben a v2): cambiar o quitar un campo, cambiar un tipo, agregar un estado, o cambiar el significado de un status. Mientras dure la transición, la sucursal tiene que aceptar las dos versiones según el header `X-Contrato-Version`, y la landing manda la versión nueva recién cuando las dos sucursales la soportan.
- **Cualquier cambio** se hace primero en `src/lib/tienda/contrato.ts` de la landing y después se copia a `src/lib/tienda/tipos.ts` de cada sucursal.
