import { HTTP_STATUS_MESSAGES } from "../../data/statusMessages.js";

export default function NotFound() {
  const { title, message } = HTTP_STATUS_MESSAGES[404];
  return (
    <div className="status-card" role="status">
      <span className="status-code">404</span>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}
