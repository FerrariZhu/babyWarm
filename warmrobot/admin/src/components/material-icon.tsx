export function MaterialIcon({
  name,
  filled,
  className = "",
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "fill-icon" : ""} ${className}`}
      aria-hidden
    >
      {name}
    </span>
  );
}
