export default function ProgressBar({ value = 0, color = 'bg-ocean-500', height = 'h-2', className = '' }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
