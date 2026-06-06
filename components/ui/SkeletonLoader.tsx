export function SkeletonLoader({
  className = "",
  height = "1rem",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      style={{ height }}
      aria-hidden
    />
  );
}

export function SkeletonReport() {
  return (
    <div className="space-y-4">
      <SkeletonLoader height="2rem" className="w-1/3" />
      <SkeletonLoader height="10rem" className="w-full" />
      <SkeletonLoader height="6rem" className="w-full" />
      <SkeletonLoader height="6rem" className="w-2/3" />
    </div>
  );
}
