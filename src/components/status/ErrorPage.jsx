import { HTTP_STATUS_MESSAGES } from "../../data/statusMessages.js";

export default function ErrorPage({ code = 500, title = HTTP_STATUS_MESSAGES[500].title, message = HTTP_STATUS_MESSAGES[500].message }) {
  return (
    <div className="status-card status-card--error" role={code >= 400 ? "alert" : "status"}>
      <span className="status-code">{code}</span>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}
