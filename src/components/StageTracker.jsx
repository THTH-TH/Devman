import { STAGES, STAGE_IDS } from '../data/stages'
import { CheckCircle2 } from 'lucide-react'

export default function StageTracker({ currentStage }) {
  const currentIdx = STAGE_IDS.indexOf(currentStage)

  return (
    <div className="flex items-center overflow-x-auto scrollbar-hide gap-0">
      {STAGES.map((stage, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx
        const isLast = idx === STAGES.length - 1

        return (
          <div key={stage.id} className="flex items-center shrink-0">
            {/* Stage pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                isCurrent
                  ? `${stage.bg} text-white shadow-sm`
                  : isPast
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-white text-gray-300 border border-gray-200'
              }`}
            >
              {isPast && <CheckCircle2 size={12} className="shrink-0" />}
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
              )}
              {stage.short}
            </div>

            {/* Connector */}
            {!isLast && (
              <div
                className={`w-4 h-0.5 shrink-0 ${
                  idx < currentIdx ? 'bg-gray-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
