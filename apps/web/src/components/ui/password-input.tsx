"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";

export function PasswordInput({
  id,
  name,
  autoComplete = "new-password",
  minLength,
  required = true,
  placeholder,
  className = "",
}: {
  id: string;
  name: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input id={id} name={name} type={show ? "text" : "password"} required={required} minLength={minLength} autoComplete={autoComplete} placeholder={placeholder} className="field pr-14" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-1.5 my-auto grid size-10 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-white"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
