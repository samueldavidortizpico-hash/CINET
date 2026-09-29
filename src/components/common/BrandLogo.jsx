/** Marca vectorial: conserva la C y el play, legibles en ambos temas y a cualquier tamaño. */
export default function BrandLogo() {
  return (
    <span className="brand-lockup" aria-hidden="true">
      <svg className="brand-symbol" viewBox="0 0 48 48" fill="none" focusable="false">
        <path className="brand-orbit" pathLength="1" d="M37.5 10.5a19 19 0 1 0 0 27" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path className="brand-play" d="M21 15.5a1.5 1.5 0 0 0-2.3 1.3v14.4a1.5 1.5 0 0 0 2.3 1.3l12-7.2a1.5 1.5 0 0 0 0-2.6Z" fill="currentColor" />
        <circle className="brand-spark" cx="40" cy="24" r="3" fill="currentColor" />
      </svg>
      <span className="brand-wordmark">CINET<span className="brand-period">.</span></span>
    </span>
  );
}
