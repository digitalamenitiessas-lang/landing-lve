/** Glifo de Instagram en trazo (lucide-react ya no trae logos de marcas). Decorativo: el nombre accesible va en el link. */
export default function IconoInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable={false}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M17.6 6.4h.01" strokeWidth={2.6} />
    </svg>
  );
}
