/* Logos SVG inline (sin peticiones externas), antes strings en watch-platforms.js. */

const ARIAL = "Arial,Helvetica,sans-serif";
const ARIAL_BLACK = "'Arial Black',Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

const LOGOS = {
  netflix: (
    <svg viewBox="0 0 56 68">
      <rect x="4" y="4" width="14" height="60" fill="#E50914" />
      <rect x="38" y="4" width="14" height="60" fill="#E50914" />
      <polygon points="18,4 38,4 38,22 18,46" fill="#E50914" />
    </svg>
  ),
  disney: (
    <svg viewBox="0 0 148 50">
      <text x="4" y="40" fontFamily={SERIF} fontStyle="italic" fontWeight="700" fontSize="34" fill="#2187D9">Disney</text>
      <text x="117" y="38" fontFamily={ARIAL_BLACK} fontWeight="900" fontSize="28" fill="white">+</text>
    </svg>
  ),
  prime: (
    <svg viewBox="0 0 108 50">
      <text x="6" y="28" fontFamily={ARIAL} fontWeight="900" fontSize="21" fill="white">prime</text>
      <text x="6" y="44" fontFamily={ARIAL} fontWeight="400" fontSize="12" fill="#00A8E1" letterSpacing="2.5">video</text>
    </svg>
  ),
  max: (
    <svg viewBox="0 0 100 56">
      <text x="50%" y="44" textAnchor="middle" fontFamily={ARIAL_BLACK} fontWeight="900" fontSize="40" fill="white">MAX</text>
    </svg>
  ),
  appletv: (
    <svg viewBox="0 0 80 46">
      <text x="50%" y="38" textAnchor="middle" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif" fontWeight="200" fontSize="32" fill="white">tv+</text>
    </svg>
  ),
  paramount: (
    <svg viewBox="0 0 120 70">
      <polygon points="60,6 84,32 36,32" fill="#0064FF" />
      {[[44, 21], [52, 13], [60, 10], [68, 13], [76, 21]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="2.6" fill="#0064FF" />
      ))}
      <text x="60" y="56" textAnchor="middle" fontFamily={ARIAL} fontWeight="900" fontSize="11.5" fill="white" letterSpacing="0.6">PARAMOUNT+</text>
    </svg>
  ),
  mgm: (
    <svg viewBox="0 0 100 56">
      <text x="50%" y="44" textAnchor="middle" fontFamily={SERIF} fontWeight="700" fontSize="30" fill="#C5A028">MGM+</text>
    </svg>
  ),
  crunchyroll: (
    <svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="26" fill="none" stroke="#F47521" strokeWidth="5" />
      <circle cx="30" cy="30" r="15" fill="#F47521" />
      <circle cx="30" cy="30" r="9" fill="#0d0b14" />
    </svg>
  ),
};

export default function PlatformLogo({ id }) {
  return LOGOS[id] ?? null;
}
