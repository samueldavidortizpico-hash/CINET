import { Link } from "react-router-dom";

/**
 * Botón con las clases de marca (.btn / .btn-primary / .btn-secondary).
 * Con `to` se renderiza como enlace del router.
 */
export default function Button({ to, variant, className = "", type = "button", ...props }) {
  const classes = ["btn", variant && `btn-${variant}`, className].filter(Boolean).join(" ");

  if (to) return <Link to={to} className={classes} {...props} />;
  return <button type={type} className={classes} {...props} />;
}
