import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);
let toastSequence = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((options: ToastOptions) => {
    toastSequence += 1;
    setToasts((current) => [...current, { ...options, id: toastSequence }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((item) => {
          const isError = item.variant === "destructive";
          const isSuccess = item.variant === "success";
          const Icon = isError ? CircleAlert : CheckCircle2;

          return (
            <ToastPrimitive.Root
              key={item.id}
              defaultOpen
              duration={item.duration ?? 5200}
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              className={cn(
                "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-card p-4 pr-10 text-card-foreground shadow-soft",
                "data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out",
                isError && "border-destructive/25 bg-red-50",
                isSuccess && "border-success/25 bg-emerald-50",
              )}
              role={isError ? "alert" : "status"}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-5 shrink-0 text-primary",
                  isError && "text-destructive",
                  isSuccess && "text-success",
                )}
              />
              <div className="grid gap-1">
                <ToastPrimitive.Title className="text-sm font-semibold">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Fermer la notification"
                className="focus-ring absolute right-2 top-2 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed right-0 top-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[420px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit être utilisé dans un ToastProvider.");
  }
  return context;
}
