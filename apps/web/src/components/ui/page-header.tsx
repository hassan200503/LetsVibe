export function PageHeader({
  eyebrow,
  title,
  children,
  world,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  world: string;
  actions?: React.ReactNode;
}) {
  return (
    <div data-world={world} className={`bg-${world} grain relative overflow-hidden`}>
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="eyebrow flex items-center gap-2.5">
                <span className="h-px w-6 bg-current opacity-45" aria-hidden />
                {eyebrow}
              </p>
            )}
            <h1 className="type-page-title font-display mt-3 max-w-3xl">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="type-body mt-3 max-w-2xl text-muted sm:mt-4">{children}</div>}
      </div>
    </div>
  );
}

export function Container({ children, world, className = "" }: { children: React.ReactNode; world?: string; className?: string }) {
  return (
    <div data-world={world} className={`relative mx-auto max-w-6xl px-4 pb-20 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
