import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createParticles() {
  if (prefersReducedMotion()) return [];
  const amount = window.innerWidth < 600 ? 25 : 55;
  return Array.from({ length: amount }, () => {
    const size = `${1 + Math.random() * 3}px`;
    return {
      left: `${Math.random() * 100}%`,
      bottom: `${-20 - Math.random() * 40}px`,
      width: size,
      height: size,
      "--duration": `${7 + Math.random() * 12}s`,
      "--delay": `${Math.random() * -15}s`,
      "--move-x": `${Math.random() * 160 - 80}px`,
    };
  });
}

/** Fondo cinematográfico: backdrop con parallax, brillos y partículas. */
export default function MovieBackdrop({ movie }) {
  const backdropRef = useRef(null);
  const [missingBackdrop, setMissingBackdrop] = useState(!movie.backdrop);
  const [particles] = useState(createParticles);

  useEffect(() => {
    if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) return undefined;

    const onMouseMove = (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      backdropRef.current.style.transform = `scale(1.08) translate(${x * -15}px, ${y * -10}px)`;
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <div className="movie-background" aria-hidden="true">
      <img
        ref={backdropRef}
        className="movie-backdrop"
        alt=""
        src={missingBackdrop ? movie.poster : movie.backdrop}
        style={missingBackdrop ? { filter: "saturate(1.1) contrast(1.05) brightness(.45)" } : undefined}
        onError={() => setMissingBackdrop(true)}
      />
      <div className="movie-glow"></div>
      <div className="movie-glow-two"></div>
      <div className="movie-particles">
        {particles.map((style, index) => (
          <span key={index} className="movie-particle" style={style}></span>
        ))}
      </div>
    </div>
  );
}
