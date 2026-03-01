export function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`h-1.5 w-4 rounded-full transition-colors ${
            i <= value ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}
