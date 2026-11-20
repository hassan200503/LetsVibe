export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="space-y-3 pt-10">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-9 w-72 max-w-full rounded" />
        <div className="skeleton h-4 w-96 max-w-full rounded" />
      </div>
      <div className="mt-8 flex gap-2">
        <div className="skeleton h-10 w-64 rounded-full" />
        <div className="skeleton h-10 w-48 rounded-full" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton aspect-square rounded-[14px] sm:rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
