# La Vieja Escuela — Landing

Landing pública de **La Vieja Escuela, Bar Café** (neobodegón norteño, San Miguel de Tucumán).

- Vende el **1/4 kg de café** (en grano o molido) con retiro en la sucursal que elija el cliente.
- Cada pedido se crea como **venta pendiente de pago en el sistema de esa sucursal** (Sala de Profes),
  no en la landing.
- El cliente queda en un **ticket guiado**: alias y monto para transferir, y un botón de WhatsApp con el
  mensaje armado para mandar el comprobante. El ticket se actualiza solo cuando el equipo lo marca
  como **pagado** y después como **retirado**.
- La **carta digital** queda anunciada como "próximamente" y las **membresías** están pendientes de
  definir (la sección no aparece hasta que se cargue `NEXT_PUBLIC_MEMBRESIAS_URL`).

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · GSAP · Zod.

## Cómo funciona

```
Navegador ──► Landing (Next, sin base de datos) ──► Sala de Profes de la sucursal elegida
                 /api/tienda/{sucursal}/...           /api/tienda/publico/...
                 agrega el secreto, valida,            guarda la venta en su Supabase,
                 filtra datos de pago del catálogo     calcula el precio, avisa al equipo
```

| Sucursal | Dirección | Sistema |
|---|---|---|
| `santa-fe` | Santa Fe 746 | `sala-de-profes-LVE` |
| `24-de-septiembre` | 24 de Septiembre y Chacabuco | `sala-de-profes-24` |

- El contrato entre la landing y las sucursales está en [`src/lib/tienda/contrato.ts`](src/lib/tienda/contrato.ts)
  y documentado en [`integracion-sucursales/CONTRATO.md`](integracion-sucursales/CONTRATO.md).
- Lo que cada sucursal tiene que agregar a su sistema (migración SQL, rutas, pantalla `/tienda` para el
  equipo y parches listos para aplicar) está en [`integracion-sucursales/`](integracion-sucursales/README.md).
  **La landing no toca esos repos ni sus bases.**
- El navegador nunca habla directo con una sucursal ni ve sus secretos. El token de cada ticket viaja en
  el fragmento de la URL (`#t=...`), así no queda en logs de ningún servidor.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y poner TIENDA_MOCK=1
npm run dev
```

Con `TIENDA_MOCK=1` las dos sucursales se simulan en memoria (`/api/mock-sucursal/...`, con el mismo
contrato que las reales) y se habilita el panel **[/dev/sucursales](http://localhost:3000/dev/sucursales)**
para marcar pedidos como pagados o retirados y probar el ciclo completo. El modo demo se ignora si
`VERCEL_ENV=production`.

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Para qué |
|---|---|
| `SUCURSAL_SANTA_FE_API_URL` / `_SECRET` | URL del sistema de Santa Fe y su `TIENDA_API_SECRET` |
| `SUCURSAL_24_API_URL` / `_SECRET` | Ídem para 24 de Septiembre |
| `TIENDA_MOCK` | `1` solo en desarrollo: sucursales simuladas |
| `NEXT_PUBLIC_SITE_URL` | URL pública (metadatos) |
| `NEXT_PUBLIC_CARTA_URL` | Si se completa, el botón de la carta lleva ahí |
| `NEXT_PUBLIC_MEMBRESIAS_URL` | Pendiente: si se completa, aparece la sección de membresías |

## Despliegue (Vercel)

1. Importar el repo en Vercel y cargar las variables (sin `TIENDA_MOCK`).
2. En cada sucursal, aplicar el kit de `integracion-sucursales/` y cargar el mismo secreto de ambos lados.
3. Cargar precio, alias, CBU y WhatsApp desde `/tienda → Ajustes` en el sistema de cada sucursal
   (los datos de cobro solo los puede cambiar un **socio**) y activar la venta web. Hasta entonces la
   landing muestra el café sin precio con "La venta web está pausada en esta sucursal" (o "Agotado en
   esta sucursal" si está activa pero sin stock) y no deja comprar.
