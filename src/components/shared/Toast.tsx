"use client";

/**
 * System-wide ephemeral toast notifications, so an action's success/failure
 * is always visibly confirmed instead of silently updating (or not updating)
 * page state the user has to notice on their own. Complements, not replaces,
 * the persistent notification center (/admin/notifications, backed by
 * src/models/Notification.ts) — a toast is "this just happened," the
 * notification center is "here's what happened while you weren't looking."
 *
 * Usage: const toast = useToast(); toast.success("Saved"); toast.error("...");
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_CONFIG: Record<ToastType, { icon: typeof CheckCircle; className: string }> = {
  success: { icon: CheckCircle, className: "border-green-200 bg-green-50 text-green-800" },
  error: { icon: XCircle, className: "border-red-200 bg-red-50 text-red-800" },
  warning: { icon: AlertTriangle, className: "border-yellow-200 bg-yellow-50 text-yellow-800" },
  info: { icon: Info, className: "border-blue-200 bg-blue-50 text-blue-800" },
};

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show("success", message),
      error: (message: string) => show("error", message),
      warning: (message: string) => show("warning", message),
      info: (message: string) => show("info", message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const cfg = TYPE_CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${cfg.className}`}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a <ToastProvider>");
  }
  return ctx;
}
