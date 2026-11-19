"use client";

import { useActionState, useState } from "react";
import { login } from "@/lib/actions/auth";
import { BRAND } from "@lovora/domain";
import { IconArrowRight } from "@/components/icons";

export function LoginForm({ next }: { next: string }) {
  const [show, setShow] = useState(false);
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-[#f4ede2] shadow-[0_40px_100px_-40px_rgb(0_0_0/0.8)] backdrop-blur-2xl sm:p-8">
      <p className="text-[0.66rem] uppercase tracking-[0.32em] text-white/55">Step inside</p>
      <h2 className="font-lux mt-3 text-3xl">Welcome back.</h2>
      <form action={action} className="rise mt-5 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="text-sm text-white/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-[0.95rem] text-white outline-none transition placeholder:text-white/30 focus:border-[#e2c794]/70 focus:shadow-[0_0_0_4px_rgb(226_199_148/0.15)]"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-white/70">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 pr-16 text-[0.95rem] text-white outline-none transition placeholder:text-white/30 focus:border-[#e2c794]/70 focus:shadow-[0_0_0_4px_rgb(226_199_148/0.15)]"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs text-white/55 hover:text-white">
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-rose-300">
            {state.error}
          </p>
        )}
        <button className="btn-gold w-full justify-center" disabled={pending}>
          {pending ? `Opening ${BRAND.name}…` : "Enter"}
          {!pending && <IconArrowRight size={17} />}
        </button>
      </form>
    </div>
  );
}
