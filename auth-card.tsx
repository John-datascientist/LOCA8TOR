import type { ChangeEvent, ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthCard({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface-muted px-4 py-16">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="border border-border-strong bg-surface p-8">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function TextField({
  id,
  label,
  type = "text",
  placeholder,
  required = false,
  value,
  defaultValue,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-caps text-xs font-semibold text-foreground">
        {label} {required && <span className="text-accent-dark">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        {...(value !== undefined ? { value, onChange } : { defaultValue })}
        className="border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
      />
    </div>
  );
}
