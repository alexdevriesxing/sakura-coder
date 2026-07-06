interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  count?: number;
  gap?: number;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, count = 1, gap = 8 }: SkeletonProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width, height, borderRadius, flexShrink: 0 }}
        />
      ))}
    </div>
  );
}
