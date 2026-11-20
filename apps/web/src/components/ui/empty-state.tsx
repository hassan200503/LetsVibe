export function EmptyState({
  icon,
  title,
  children,
  action,
  className = "",
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          {icon}
        </span>
      )}
      <p className="type-card-title font-display mt-4 text-lg">{title}</p>
      {children && <p className="type-small mx-auto mt-1.5 max-w-sm text-muted">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
