/**
 * Copia texto al portapapeles. Usa la API moderna y, si no está (http, webviews
 * de Instagram/Facebook, navegadores viejos), el truco del textarea.
 * Devuelve true si pudo copiar.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // seguimos con el plan B
  }
  return copiarConTextarea(texto);
}

function copiarConTextarea(texto: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  // Fuera de pantalla y con 16px para que iOS no haga zoom.
  area.style.cssText =
    "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;pointer-events:none;";
  const activo = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  let ok = false;
  try {
    area.select();
    area.setSelectionRange(0, texto.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(area);
    activo?.focus?.({ preventScroll: true });
  }
  return ok;
}
