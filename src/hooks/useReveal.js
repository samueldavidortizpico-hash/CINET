import { useEffect, useRef, useState } from "react";

/**
 * Animación de aparición al hacer scroll (clases .reveal/.visible de main.css).
 * Devuelve [ref, className]. El observer se desconecta en el cleanup.
 */
export function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible ? "reveal visible" : "reveal"];
}
