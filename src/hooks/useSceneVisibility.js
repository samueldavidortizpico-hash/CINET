import { useEffect, useRef, useState } from "react";

/** Detiene la reproducción cuando la escena o la pestaña dejan de estar visibles. */
export function useSceneVisibility() {
  const ref = useRef(null);
  const [inViewport, setInViewport] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    const node = ref.current;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (node) observer?.observe(node);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      observer?.disconnect();
    };
  }, []);

  return [ref, inViewport && pageVisible];
}
