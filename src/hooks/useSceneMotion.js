import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

/** Desplazamiento decorativo con ratón, limitado a una actualización por frame.
 * No captura gestos táctiles ni altera los controles de la escena. */
export function useSceneMotion() {
  const reduced = usePrefersReducedMotion();
  const frame = useRef(null);
  const scene = useRef(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frame.current);
      scene.current?.style.removeProperty("--scene-x");
      scene.current?.style.removeProperty("--scene-y");
      scene.current?.style.removeProperty("--scene-rotate");
      scene.current?.style.removeProperty("--scene-tilt");
    };
  }, [reduced]);

  const onPointerMove = (event) => {
    if (reduced || event.pointerType !== "mouse") return;
    const node = event.currentTarget;
    const { clientX, clientY } = event;
    scene.current = node;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const bounds = node.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2));
      node.style.setProperty("--scene-x", `${x * 10}px`);
      node.style.setProperty("--scene-y", `${y * 7}px`);
      node.style.setProperty("--scene-rotate", `${x * 3}deg`);
      node.style.setProperty("--scene-tilt", `${-y * 3}deg`);
    });
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(frame.current);
    scene.current?.style.removeProperty("--scene-x");
    scene.current?.style.removeProperty("--scene-y");
    scene.current?.style.removeProperty("--scene-rotate");
    scene.current?.style.removeProperty("--scene-tilt");
  };

  return { onPointerMove, onPointerLeave };
}
