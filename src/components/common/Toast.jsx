import { useToast } from "../../hooks/useToast.js";

export default function Toast() {
  const { toast } = useToast();

  return (
    <div role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="cinehub-toast show">
          {toast.text}
        </div>
      )}
    </div>
  );
}
