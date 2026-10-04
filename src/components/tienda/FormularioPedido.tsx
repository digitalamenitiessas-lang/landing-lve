"use client";

import clsx from "clsx";
import {
  Check,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { SUCURSALES, esSucursalId, getSucursal, type SucursalId } from "@/config/sucursales";
import { formatPesos } from "@/lib/formato";
import { guardarVenta } from "@/lib/mis-pedidos";
import {
  EVENTO_ELEGIR_SUCURSAL,
  rutaTicket,
  type CatalogoPublico,
  type CrearVentaLandingBody,
  type DetalleElegirSucursal,
  type RespuestaCatalogo,
  type RespuestaCrearVenta,
} from "@/lib/tienda/api-landing";
import { CatalogoSchema, ClienteSchema, type Opcion, type Producto } from "@/lib/tienda/contrato";

import {
  MENSAJE_SIN_CONEXION,
  borrarDatosRecordados,
  campoDelServidor,
  cantidadMaxima,
  elegirProducto,
  etiquetaValor,
  guardarDatosRecordados,
  leerDatosRecordados,
  mensajeDeError,
  normalizarOpciones,
  nuevaClave,
  valoresVisibles,
  type CampoDato,
  type CampoForm,
  type ErroresCampo,
} from "./pedido";

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

const CatalogoPublicoSchema = CatalogoSchema.omit({ version: true, pago: true, whatsapp: true });

type EstadoCatalogo =
  | { estado: "cargando" }
  | { estado: "listo"; catalogo: CatalogoPublico }
  | { estado: "error"; mensaje: string };

async function pedirCatalogo(id: SucursalId): Promise<EstadoCatalogo> {
  try {
    const res = await fetch(`/api/tienda/${id}/catalogo`, {
      headers: { Accept: "application/json" },
    });
    const json = (await res.json().catch(() => null)) as RespuestaCatalogo | null;
    if (json?.ok) {
      const leido = CatalogoPublicoSchema.safeParse(json.catalogo);
      if (leido.success) return { estado: "listo", catalogo: leido.data };
      return { estado: "error", mensaje: mensajeDeError("sucursal_no_disponible") };
    }
    return {
      estado: "error",
      mensaje: mensajeDeError(json?.codigo ?? "sucursal_no_disponible", json?.error),
    };
  } catch {
    return { estado: "error", mensaje: MENSAJE_SIN_CONEXION };
  }
}

/* ------------------------------------------------------------------ */
/* Validación (misma regla que ClienteSchema del contrato)             */
/* ------------------------------------------------------------------ */

type Datos = Record<CampoDato, string>;
const DATOS_VACIOS: Datos = { nombre: "", telefono: "", email: "", nota: "" };

function primerMensaje(
  resultado: { success: true } | { success: false; error: { issues: { code: string; message: string }[] } },
  muyLargo: string,
): string | undefined {
  if (resultado.success) return undefined;
  const issue = resultado.error.issues[0];
  if (!issue) return undefined;
  return issue.code === "too_big" ? muyLargo : issue.message;
}

function validarCampo(campo: CampoDato, valor: string): string | undefined {
  const limpio = valor.trim();
  switch (campo) {
    case "nombre":
      return primerMensaje(ClienteSchema.shape.nombre.safeParse(valor), "Es muy largo: hasta 80 letras");
    case "telefono":
      if (!limpio) return "Dejanos tu WhatsApp o teléfono para avisarte";
      return primerMensaje(ClienteSchema.shape.telefono.safeParse(valor), "Revisá el teléfono");
    case "email":
      if (!limpio) return undefined;
      return primerMensaje(ClienteSchema.shape.email.safeParse(limpio), "Revisá el email");
    case "nota":
      return limpio.length > 300 ? "La nota puede tener hasta 300 caracteres" : undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Estética de hoja de cuaderno                                        */
/* ------------------------------------------------------------------ */

const HOJA: CSSProperties = {
  backgroundColor: "var(--color-papel-claro)",
  backgroundImage: [
    "linear-gradient(to right, transparent var(--margen), rgb(214 64 44 / 0.5) var(--margen), rgb(214 64 44 / 0.5) calc(var(--margen) + 2px), transparent calc(var(--margen) + 2px))",
    "repeating-linear-gradient(to bottom, transparent 0, transparent calc(2rem - 1px), rgb(125 179 227 / 0.38) calc(2rem - 1px), rgb(125 179 227 / 0.38) 2rem)",
  ].join(", "),
  backgroundPosition: "0 0, 0 4.5rem",
  backgroundRepeat: "no-repeat, repeat-y",
};

const INPUT =
  "block w-full min-h-12 rounded-lg border-2 border-tinta/45 bg-white/80 px-4 py-2.5 text-lg text-tinta placeholder:text-tinta-suave/70 transition-colors hover:border-tinta/70 focus:border-verde focus:bg-white aria-[invalid=true]:border-rojo-oscuro disabled:cursor-not-allowed disabled:opacity-60";

const FOCO_TARJETA =
  "has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-sol";

function ids(...partes: (string | false | null | undefined)[]): string | undefined {
  const lista = partes.filter(Boolean).join(" ");
  return lista || undefined;
}

function MensajeError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-base font-semibold text-rojo-oscuro">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario                                                          */
/* ------------------------------------------------------------------ */

export default function FormularioPedido() {
  const router = useRouter();
  const uid = useId();
  const f = (nombre: string) => `pedido${uid}${nombre}`;

  const [sucursalId, setSucursalId] = useState<SucursalId | null>(null);
  const [catalogos, setCatalogos] = useState<Partial<Record<SucursalId, EstadoCatalogo>>>({});
  const [opciones, setOpciones] = useState<Record<string, string>>({});
  const [cantidad, setCantidad] = useState(1);
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Clave de idempotencia del pedido en curso. */
  const clave = useRef<string | null>(null);
  /** Momento en que se mostró el formulario (antispam en el servidor). */
  const t0 = useRef<number | null>(null);
  /** Tras un intento fallido, el próximo cambio de datos estrena clave (un reintento sin cambios la conserva). */
  const estrenarClave = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const catalogoEnCurso = useRef(new Set<SucursalId>());
  const catalogoListo = useRef(new Set<SucursalId>());
  /** id del campo a enfocar después de mostrar errores. */
  const focoPendiente = useRef<string | null>(null);

  useEffect(() => {
    if (!focoPendiente.current) return;
    document.getElementById(focoPendiente.current)?.focus();
    focoPendiente.current = null;
  });

  const marcarCambio = useCallback(() => {
    if (estrenarClave.current) {
      clave.current = nuevaClave();
      estrenarClave.current = false;
    }
  }, []);

  const cargarCatalogo = useCallback((id: SucursalId, forzar = false) => {
    if (catalogoEnCurso.current.has(id)) return;
    if (!forzar && catalogoListo.current.has(id)) return;
    catalogoEnCurso.current.add(id);
    setCatalogos((prev) => ({ ...prev, [id]: { estado: "cargando" } }));
    void pedirCatalogo(id).then((estado) => {
      catalogoEnCurso.current.delete(id);
      if (estado.estado === "listo") catalogoListo.current.add(id);
      else catalogoListo.current.delete(id);
      setCatalogos((prev) => ({ ...prev, [id]: estado }));
    });
  }, []);

  const elegirSucursal = useCallback(
    (id: SucursalId) => {
      setSucursalId(id);
      marcarCambio();
      setErrores((prev) => (prev.sucursal ? { ...prev, sucursal: undefined } : prev));
      cargarCatalogo(id);
    },
    [cargarCatalogo, marcarCambio],
  );

  // Al montar: clave, t0, datos recordados y ?sucursal= de la URL.
  useEffect(() => {
    clave.current = nuevaClave();
    t0.current = Date.now();

    const recordados = leerDatosRecordados();
    const desdeUrl = new URLSearchParams(window.location.search).get("sucursal");
    // localStorage y la URL solo existen en el navegador: se leen después de hidratar
    // (leerlos en el render inicial rompería la hidratación).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización única con el almacenamiento del navegador
    if (recordados) setDatos((d) => ({ ...d, ...recordados }));
    if (desdeUrl && esSucursalId(desdeUrl)) elegirSucursal(desdeUrl);
  }, [elegirSucursal]);

  // Otras secciones pueden preseleccionar la sucursal ("Pedí acá tu café").
  useEffect(() => {
    const alElegir = (evento: Event) => {
      const id = (evento as CustomEvent<Partial<DetalleElegirSucursal> | undefined>).detail?.id;
      if (typeof id === "string" && esSucursalId(id)) elegirSucursal(id);
    };
    window.addEventListener(EVENTO_ELEGIR_SUCURSAL, alElegir);
    return () => window.removeEventListener(EVENTO_ELEGIR_SUCURSAL, alElegir);
  }, [elegirSucursal]);

  /* ---------------- derivados ---------------- */

  const sucursal = sucursalId ? getSucursal(sucursalId) : null;
  const estadoCatalogo: EstadoCatalogo | null = sucursalId
    ? (catalogos[sucursalId] ?? { estado: "cargando" })
    : null;
  const catalogo = estadoCatalogo?.estado === "listo" ? estadoCatalogo.catalogo : null;
  const producto: Producto | null = catalogo ? elegirProducto(catalogo.productos) : null;
  const vendiendo = Boolean(catalogo?.venta_habilitada && producto?.disponible);
  const bloqueado = Boolean(catalogo && !vendiendo);
  const maximo = cantidadMaxima(producto);
  const cantidadFinal = Math.min(Math.max(cantidad, 1), maximo);
  const opcionesFinales = normalizarOpciones(producto, opciones);
  const total = producto ? producto.precio * cantidadFinal : 0;

  const detalleOpciones = producto
    ? producto.opciones
        .map((o) => (opcionesFinales[o.id] ? etiquetaValor(o, opcionesFinales[o.id]!) : null))
        .filter((x): x is string => Boolean(x))
        .join(" · ")
    : "";

  const estadoParaLectores = !sucursal
    ? ""
    : estadoCatalogo?.estado === "cargando"
      ? `Cargando el precio de ${sucursal.nombre}…`
      : estadoCatalogo?.estado === "error"
        ? estadoCatalogo.mensaje
        : !vendiendo
          ? "Todavía no estamos vendiendo café en esta sucursal."
          : producto
            ? `Precio de la sucursal ${sucursal.nombre}: ${formatPesos(producto.precio)} cada bolsa.`
            : "";

  /* ---------------- handlers ---------------- */

  const cambiarDato =
    (campo: CampoDato) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const valor = e.target.value;
      setDatos((d) => ({ ...d, [campo]: valor }));
      marcarCambio();
      if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampo(campo, valor) }));
    };

  const salirDeDato = (campo: CampoDato) => () => {
    const valor = datos[campo];
    if (valor.trim()) setErrores((prev) => ({ ...prev, [campo]: validarCampo(campo, valor) }));
  };

  const elegirOpcion = (opcion: Opcion, valorId: string) => {
    setOpciones((prev) => ({ ...prev, [opcion.id]: valorId }));
    marcarCambio();
    const campo: CampoForm = `opcion:${opcion.id}`;
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  };

  const cambiarCantidad = (delta: number) => {
    setCantidad(Math.min(Math.max(cantidadFinal + delta, 1), maximo));
    marcarCambio();
    setErrores((prev) => (prev.cantidad ? { ...prev, cantidad: undefined } : prev));
  };

  const cambiarRecordar = (e: ChangeEvent<HTMLInputElement>) => {
    setRecordar(e.target.checked);
    if (!e.target.checked) borrarDatosRecordados();
  };

  const idDeCampo = (campo: CampoForm): string => {
    if (campo === "sucursal") return f(`suc-${SUCURSALES[0]!.id}`);
    if (campo === "cantidad") return f("mas");
    if (campo.startsWith("opcion:")) return f(`op-${campo.slice(7)}-0`);
    return f(campo);
  };

  /** Se enfoca después del próximo commit, cuando el fieldset ya no está deshabilitado. */
  const enfocar = (campo: CampoForm) => {
    focoPendiente.current = idDeCampo(campo);
  };

  function validarTodo(): ErroresCampo {
    const salida: ErroresCampo = {};
    if (!sucursalId) salida.sucursal = "Elegí en qué sucursal lo retirás";
    if (producto) {
      for (const opcion of producto.opciones) {
        if (opcion.requerida && !opcionesFinales[opcion.id]) {
          salida[`opcion:${opcion.id}`] = `Elegí una opción de ${opcion.nombre.toLowerCase()}`;
        }
      }
    }
    for (const campo of ["nombre", "telefono", "email", "nota"] as const) {
      const error = validarCampo(campo, datos[campo]);
      if (error) salida[campo] = error;
    }
    return salida;
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    const encontrados = validarTodo();
    const orden: CampoForm[] = [
      "sucursal",
      ...(producto?.opciones.map((o) => `opcion:${o.id}` as const) ?? []),
      "nombre",
      "telefono",
      "email",
      "nota",
    ];
    const primero = orden.find((c) => encontrados[c]);
    setErrores(encontrados);
    if (primero) {
      setErrorGeneral("Hay algo para corregir: lo marcamos en rojo.");
      enfocar(primero);
      return;
    }
    if (!sucursalId || !producto || !vendiendo) return;

    const cliente = {
      nombre: datos.nombre.trim(),
      telefono: datos.telefono.trim(),
      email: datos.email.trim() || null,
    };
    if (recordar) {
      guardarDatosRecordados({ nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email ?? "" });
    }

    clave.current ??= nuevaClave();
    const cuerpo: CrearVentaLandingBody = {
      idempotency_key: clave.current,
      items: [{ producto_id: producto.id, cantidad: cantidadFinal, opciones: opcionesFinales }],
      cliente,
      nota: datos.nota.trim() || null,
      hp: honeypot.current?.value ?? "",
      t0: t0.current ?? undefined,
    };

    setEnviando(true);
    setErrorGeneral(null);

    let respuesta: RespuestaCrearVenta;
    try {
      const res = await fetch(`/api/tienda/${sucursalId}/ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const json = (await res.json().catch(() => null)) as RespuestaCrearVenta | null;
      respuesta = json ?? {
        ok: false,
        error: "",
        codigo: res.status === 429 ? "demasiados_intentos" : "sucursal_no_disponible",
      };
    } catch {
      // Error de red: un reintento sin cambios usa la misma clave y no duplica el pedido.
      estrenarClave.current = true;
      setErrorGeneral(MENSAJE_SIN_CONEXION);
      setEnviando(false);
      return;
    }

    if (respuesta.ok) {
      // Nunca navegamos a una URL que no sea la del ticket.
      const destino =
        typeof respuesta.url === "string" && respuesta.url.startsWith("/pedido/")
          ? respuesta.url
          : rutaTicket(sucursalId, respuesta.venta.codigo, respuesta.token);
      // Así el chip "Tu pedido" aparece aunque el cliente no llegue a abrir el ticket.
      guardarVenta(sucursalId, respuesta.venta, respuesta.token);
      router.push(destino);
      return; // el botón queda en "Armando tu ticket…" hasta que cambia la página
    }

    estrenarClave.current = true;
    const mensaje = mensajeDeError(respuesta.codigo, respuesta.error);
    const campo = campoDelServidor(respuesta.campo);
    if (campo) {
      setErrores({ [campo]: mensaje });
      setErrorGeneral("Hay algo para corregir: lo marcamos en rojo.");
      enfocar(campo);
    } else {
      setErrorGeneral(mensaje);
    }
    if (
      respuesta.codigo === "producto_no_disponible" ||
      respuesta.codigo === "venta_deshabilitada" ||
      respuesta.codigo === "opcion_invalida"
    ) {
      cargarCatalogo(sucursalId, true);
    }
    setEnviando(false);
  }

  /* ---------------- render ---------------- */

  const err = (campo: CampoForm) => errores[campo];
  const idErr = (campo: CampoForm) => f(`err-${campo.replace(":", "-")}`);

  return (
    <form
      noValidate
      onSubmit={enviar}
      aria-labelledby={f("titulo")}
      style={HOJA}
      className="relative rounded-sm shadow-[0_1px_0_var(--color-papel-oscuro),0_24px_40px_-24px_rgb(30_26_21/0.45)] [--margen:2.4rem] sm:[--margen:3.75rem]"
    >
      {/* Cinta y agujeritos de carpeta */}
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-celeste-claro/85 shadow-sm"
      />
      {["top-[9%]", "top-1/2", "top-[91%]"].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={clsx(
            "absolute left-2.5 size-4 -translate-y-1/2 rounded-full bg-papel shadow-[inset_0_2px_3px_rgb(0_0_0/0.35)] sm:left-4 sm:size-5",
            pos,
          )}
        />
      ))}

      <div className="py-9 pr-4 pl-[calc(var(--margen)+0.9rem)] sm:py-11 sm:pr-9">
        <p className="a-mano text-xl text-tinta-suave">Cuaderno de comunicaciones</p>
        <h3 id={f("titulo")} className="titulo-afiche mt-1 text-4xl text-rojo-oscuro sm:text-5xl">
          Pedido de café
        </h3>

        {/* ---------------- Sucursal ---------------- */}
        <fieldset className="mt-8" aria-describedby={ids(err("sucursal") && idErr("sucursal"))}>
          <legend className="text-xl font-bold text-tinta">¿Dónde lo retirás?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SUCURSALES.map((s) => (
              <label
                key={s.id}
                className={clsx(
                  "group relative flex min-h-24 cursor-pointer flex-col rounded-xl border-2 bg-papel-claro/95 p-4 pr-14 transition-[border-color,box-shadow,background-color]",
                  "border-tinta/30 hover:border-tinta/60",
                  "has-checked:border-verde has-checked:bg-white has-checked:shadow-[0_4px_0_var(--color-verde)]",
                  err("sucursal") && "border-rojo-oscuro/70",
                  FOCO_TARJETA,
                )}
              >
                <input
                  id={f(`suc-${s.id}`)}
                  type="radio"
                  name="sucursal"
                  value={s.id}
                  checked={sucursalId === s.id}
                  onChange={() => elegirSucursal(s.id)}
                  className="sr-only"
                />
                <span className="a-mano text-lg text-rojo-oscuro">{s.apodo}</span>
                <span className="titulo-afiche mt-0.5 text-[1.7rem] text-verde">{s.nombre}</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-base text-tinta-suave">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {s.direccion}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-full border-2 border-tinta/35 bg-white text-white transition-colors group-has-checked:border-rojo group-has-checked:bg-rojo"
                >
                  <Check className="size-5 opacity-0 group-has-checked:opacity-100" strokeWidth={3} />
                </span>
              </label>
            ))}
          </div>
          {err("sucursal") && <MensajeError id={idErr("sucursal")}>{err("sucursal")}</MensajeError>}
        </fieldset>

        <p className="sr-only" aria-live="polite">
          {estadoParaLectores}
        </p>

        {/* ---------------- Producto según el catálogo ---------------- */}
        <div className="mt-8">
          {!sucursal && (
            <p className="a-mano rounded-lg border-2 border-dashed border-tinta/25 px-4 py-3 text-2xl text-tinta-suave">
              Elegí la sucursal para ver el precio y las opciones.
            </p>
          )}

          {estadoCatalogo?.estado === "cargando" && (
            <div aria-hidden="true" className="space-y-3">
              <div className="h-6 w-2/3 rounded bg-papel-oscuro motion-safe:animate-pulse" />
              <div className="flex flex-wrap gap-2">
                <div className="h-11 w-28 rounded-full bg-papel-oscuro motion-safe:animate-pulse" />
                <div className="h-11 w-44 rounded-full bg-papel-oscuro motion-safe:animate-pulse" />
                <div className="h-11 w-36 rounded-full bg-papel-oscuro motion-safe:animate-pulse" />
              </div>
              <div className="h-12 w-48 rounded-full bg-papel-oscuro motion-safe:animate-pulse" />
            </div>
          )}

          {estadoCatalogo?.estado === "error" && sucursalId && (
            <div className="rounded-xl border-2 border-rojo-oscuro/60 bg-white/80 p-4">
              <p className="flex items-start gap-2 text-lg font-semibold text-rojo-oscuro">
                <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
                {estadoCatalogo.mensaje}
              </p>
              <button
                type="button"
                onClick={() => cargarCatalogo(sucursalId, true)}
                className="boton boton-tinta mt-3"
              >
                <RotateCcw aria-hidden="true" className="size-4.5" />
                Reintentar
              </button>
            </div>
          )}

          {catalogo?.mensaje && (
            <div
              role="note"
              className="relative mb-6 max-w-sm rotate-1 bg-[#fbe38e] px-5 pt-6 pb-4 shadow-[0_10px_18px_-10px_rgb(0_0_0/0.45)]"
            >
              <span
                aria-hidden="true"
                className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rotate-3 bg-white/60"
              />
              <p className="a-mano text-2xl text-tinta">{catalogo.mensaje}</p>
            </div>
          )}

          {catalogo && !vendiendo && (
            <div className="rounded-xl border-2 border-tinta/30 bg-white/70 p-4">
              <p className="titulo-afiche text-2xl text-verde">
                Todavía no estamos vendiendo café en esta sucursal
              </p>
              <p className="mt-2 text-base text-tinta-suave">
                {SUCURSALES.length > 1
                  ? "Probá en la otra sucursal o volvé a pasar por acá en unos días."
                  : "Volvé a pasar por acá en unos días."}
              </p>
            </div>
          )}

          {producto && vendiendo && (
            <div className="space-y-7">
              <div>
                <p className="text-xl font-bold text-tinta">
                  {producto.nombre}
                  {producto.presentacion && (
                    <span className="font-semibold text-tinta-suave"> · {producto.presentacion}</span>
                  )}
                </p>
                {producto.descripcion && (
                  <p className="mt-1 text-base leading-relaxed text-tinta-suave">
                    {producto.descripcion}
                  </p>
                )}
              </div>

              {producto.opciones.map((opcion) => {
                const campo: CampoForm = `opcion:${opcion.id}`;
                const valores = valoresVisibles(opcion);
                const lista = opcion.requerida ? valores : [...valores, { id: "", etiqueta: "Sin preferencia" }];
                return (
                  <fieldset key={opcion.id} aria-describedby={ids(err(campo) && idErr(campo))}>
                    <legend className="text-xl font-bold text-tinta">
                      {opcion.nombre}
                      {!opcion.requerida && (
                        <span className="ml-2 text-base font-medium text-tinta-suave">(opcional)</span>
                      )}
                    </legend>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {lista.map((v, i) => (
                        <label
                          key={v.id || "sin-preferencia"}
                          className={clsx(
                            "group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 bg-white/85 px-4 py-2 text-base font-semibold text-tinta transition-colors",
                            "border-tinta/35 hover:border-tinta/70",
                            "has-checked:border-verde has-checked:bg-verde has-checked:text-papel-claro",
                            err(campo) && "border-rojo-oscuro/70",
                            FOCO_TARJETA,
                          )}
                        >
                          <input
                            id={f(`op-${opcion.id}-${i}`)}
                            type="radio"
                            name={`opcion-${opcion.id}`}
                            value={v.id}
                            checked={(opcionesFinales[opcion.id] ?? "") === v.id}
                            onChange={() => elegirOpcion(opcion, v.id)}
                            required={opcion.requerida}
                            className="sr-only"
                          />
                          <Check
                            aria-hidden="true"
                            className="hidden size-4 group-has-checked:block"
                            strokeWidth={3}
                          />
                          {v.etiqueta}
                        </label>
                      ))}
                    </div>
                    {err(campo) && <MensajeError id={idErr(campo)}>{err(campo)}</MensajeError>}
                  </fieldset>
                );
              })}

              <div role="group" aria-labelledby={f("cant-titulo")} aria-describedby={ids(f("cant-ayuda"), err("cantidad") && idErr("cantidad"))}>
                <p id={f("cant-titulo")} className="text-xl font-bold text-tinta">
                  ¿Cuántas bolsas?
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(-1)}
                    disabled={cantidadFinal <= 1}
                    aria-label="Una bolsa menos"
                    className="grid size-12 place-items-center rounded-full border-2 border-tinta bg-white text-tinta transition-colors hover:bg-tinta hover:text-papel-claro disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-tinta"
                  >
                    <Minus aria-hidden="true" className="size-5" strokeWidth={2.6} />
                  </button>
                  <output
                    aria-live="polite"
                    className="flex min-w-28 items-baseline justify-center gap-2 text-center"
                  >
                    <span className="titulo-afiche text-5xl text-tinta">{cantidadFinal}</span>
                    <span className="text-base font-semibold text-tinta-suave">
                      {cantidadFinal === 1 ? "bolsa" : "bolsas"}
                    </span>
                  </output>
                  <button
                    id={f("mas")}
                    type="button"
                    onClick={() => cambiarCantidad(1)}
                    disabled={cantidadFinal >= maximo}
                    aria-label="Una bolsa más"
                    className="grid size-12 place-items-center rounded-full border-2 border-tinta bg-white text-tinta transition-colors hover:bg-tinta hover:text-papel-claro disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-tinta"
                  >
                    <Plus aria-hidden="true" className="size-5" strokeWidth={2.6} />
                  </button>
                </div>
                <p id={f("cant-ayuda")} className="mt-2 text-base text-tinta-suave">
                  Hasta {maximo} por pedido.
                </p>
                {err("cantidad") && <MensajeError id={idErr("cantidad")}>{err("cantidad")}</MensajeError>}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Datos ---------------- */}
        <fieldset disabled={bloqueado || enviando} className="mt-10 space-y-6">
          <legend className="titulo-afiche text-3xl text-verde">Tus datos</legend>

          <div>
            <label htmlFor={f("nombre")} className="block text-lg font-bold text-tinta">
              Nombre
            </label>
            <input
              id={f("nombre")}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={80}
              value={datos.nombre}
              onChange={cambiarDato("nombre")}
              onBlur={salirDeDato("nombre")}
              aria-invalid={Boolean(err("nombre"))}
              aria-describedby={ids(err("nombre") && idErr("nombre"))}
              className={clsx(INPUT, "mt-2")}
            />
            {err("nombre") && <MensajeError id={idErr("nombre")}>{err("nombre")}</MensajeError>}
          </div>

          <div>
            <label htmlFor={f("telefono")} className="block text-lg font-bold text-tinta">
              WhatsApp o teléfono
            </label>
            <p id={f("telefono-ayuda")} className="mt-0.5 text-base text-tinta-suave">
              Con característica, ej. 381 555 1234
            </p>
            <input
              id={f("telefono")}
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={datos.telefono}
              onChange={cambiarDato("telefono")}
              onBlur={salirDeDato("telefono")}
              aria-invalid={Boolean(err("telefono"))}
              aria-describedby={ids(f("telefono-ayuda"), err("telefono") && idErr("telefono"))}
              className={clsx(INPUT, "mt-2")}
            />
            {err("telefono") && <MensajeError id={idErr("telefono")}>{err("telefono")}</MensajeError>}
          </div>

          <div>
            <label htmlFor={f("email")} className="block text-lg font-bold text-tinta">
              Email <span className="text-base font-medium text-tinta-suave">(opcional)</span>
            </label>
            <input
              id={f("email")}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              value={datos.email}
              onChange={cambiarDato("email")}
              onBlur={salirDeDato("email")}
              aria-invalid={Boolean(err("email"))}
              aria-describedby={ids(err("email") && idErr("email"))}
              className={clsx(INPUT, "mt-2")}
            />
            {err("email") && <MensajeError id={idErr("email")}>{err("email")}</MensajeError>}
          </div>

          <div>
            <label htmlFor={f("nota")} className="block text-lg font-bold text-tinta">
              Nota para la sucursal <span className="text-base font-medium text-tinta-suave">(opcional)</span>
            </label>
            <textarea
              id={f("nota")}
              name="nota"
              rows={3}
              maxLength={300}
              value={datos.nota}
              onChange={cambiarDato("nota")}
              onBlur={salirDeDato("nota")}
              aria-invalid={Boolean(err("nota"))}
              aria-describedby={ids(f("nota-cuenta"), err("nota") && idErr("nota"))}
              className={clsx(INPUT, "mt-2 resize-y")}
            />
            <p id={f("nota-cuenta")} className="mt-1 text-right text-sm text-tinta-suave">
              {datos.nota.length}/300
            </p>
            {err("nota") && <MensajeError id={idErr("nota")}>{err("nota")}</MensajeError>}
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-medium text-tinta">
            <input
              type="checkbox"
              checked={recordar}
              onChange={cambiarRecordar}
              className="size-5 shrink-0 accent-verde"
            />
            Recordar mis datos en este dispositivo
          </label>
        </fieldset>

        {/* Honeypot: invisible para personas, tentador para bots */}
        <div aria-hidden="true" className="absolute top-0 -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={f("empresa")}>Empresa</label>
          <input
            ref={honeypot}
            id={f("empresa")}
            name="empresa"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        {/* ---------------- Resumen ---------------- */}
        <section
          aria-labelledby={f("resumen")}
          className="mt-10 rounded-xl border-2 border-dashed border-tinta/40 bg-papel/80 p-5"
        >
          <h4 id={f("resumen")} className="titulo-afiche text-2xl text-verde">
            Resumen
          </h4>
          {producto && vendiendo && sucursal ? (
            <>
              <p className="mt-3 text-lg font-semibold text-tinta">
                {cantidadFinal} × {producto.nombre}
              </p>
              {detalleOpciones && <p className="text-base text-tinta-suave">{detalleOpciones}</p>}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t-2 border-tinta/15 pt-3">
                <span className="text-lg font-bold text-tinta">Total</span>
                <output aria-live="polite" className="titulo-afiche text-5xl text-rojo-oscuro">
                  {formatPesos(total)}
                </output>
              </div>
              <p className="mt-2 text-base text-tinta-suave">
                Precio de la sucursal {sucursal.nombre}
                {cantidadFinal > 1 && ` · ${formatPesos(producto.precio)} cada bolsa`}
              </p>
              <p className="mt-1 text-base text-tinta-suave">
                {/* La dirección va siempre tal como figura en los afiches (config/sucursales). */}
                Retirás en {sucursal.direccion}
                {catalogo?.retiro.horario && ` · ${catalogo.retiro.horario}`}
              </p>
            </>
          ) : (
            <p className="a-mano mt-2 text-2xl text-tinta-suave">
              {sucursal ? "Todavía no hay precio para mostrar." : "Elegí la sucursal para ver el precio"}
            </p>
          )}
        </section>

        {/* ---------------- Envío ---------------- */}
        <div aria-live="polite" aria-atomic="true">
          {errorGeneral && (
            <p className="mt-6 flex items-start gap-2 rounded-lg border-2 border-rojo-oscuro/60 bg-white/85 p-4 text-lg font-semibold text-rojo-oscuro">
              <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
              {errorGeneral}
            </p>
          )}
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={enviando || Boolean(sucursal && !vendiendo)}
            aria-describedby={f("aclaracion")}
            className="boton boton-rojo w-full text-xl sm:w-auto sm:min-w-72"
          >
            {enviando ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
                Armando tu ticket…
              </>
            ) : (
              "Generar mi ticket"
            )}
          </button>
          <p id={f("aclaracion")} className="mt-3 text-base text-tinta-suave">
            Todavía no pagás nada: en el ticket te damos el alias y el monto exacto.
            {catalogo && vendiendo && (
              <>
                {" "}
                Te guardamos el pedido {catalogo.vencimiento_horas}{" "}
                {catalogo.vencimiento_horas === 1 ? "hora" : "horas"} para que lo pagues.
              </>
            )}
          </p>
        </div>
      </div>
    </form>
  );
}
