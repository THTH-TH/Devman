export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center mb-4">
        <span className="text-gray-400 text-xl">⚙</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-600 mb-1">{title}</h2>
      <p className="text-gray-400 text-sm">This section is coming soon.</p>
    </div>
  )
}
