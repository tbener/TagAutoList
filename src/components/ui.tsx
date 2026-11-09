"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-11 px-5 text-sm md:h-10 md:px-4" : "h-9 px-3.5 text-xs md:h-8 md:px-3",
        variant === "primary" && "bg-cta text-cta-fg shadow-sm hover:opacity-90",
        variant === "outline" && "border border-border hover:bg-accent-soft",
        variant === "ghost" && "hover:bg-accent-soft",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-card px-3.5 text-base outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 md:h-10 md:px-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "accent" ? "bg-accent-soft text-accent" : "bg-border/60 text-muted",
      )}
    >
      {children}
    </span>
  );
}

/** Centered dialog on desktop, bottom sheet on phones. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed z-50 max-h-[90dvh] overflow-y-auto border border-border bg-card p-5 shadow-xl outline-none",
            "inset-x-0 bottom-0 rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1 text-muted hover:bg-accent-soft" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
