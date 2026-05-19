import { STAGES, STAGE_IDS } from '../data/stages'
import { CheckCircle2 } from 'lucide-react'

export default function StageTracker({ currentStage, activeStageIds = [], completedStageIds = [] }) {
  const currentIdx = STAGE_IDS.indexOf(currentStage)
  const activeSet = new Set(activeStageIds.length ? activeStageIds : [currentStage])
  const completedSet = new Set(completedStageIds)

  return (
    <div className="flex items-center overflow-x-auto scrollbar-hide gap-0">
      {STAGES.map((stage, idx) => {
        const isComplete = completedSet.has(stage.id)
        const isActive = activeSet.has(stage.id)
        const isCurrent = stage.id === currentStage
        const isPast = idx < currentIdx || isComplete
        const isFuture = idx > currentIdx
        const isLast = idx === STAGES.length - 1

        return (
          <div key={stage.id} className="flex items-center shrink-0">
            {/* Stage pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                isCurrent
                  ? `${stage.bg} text-white shadow-sm`
                  : isActive
                  ? `${stage.light} ${stage.text} border ${stage.border}`
                  : isComplete || isPast
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-white text-gray-300 border border-gray-200'
              }`}
            >
              {(isComplete || (isPast && !isActive)) && <CheckCircle2 size={12} className="shrink-0" />}
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
              )}
              {isActive && !isCurrent && !isComplete && (
                <span className={`w-1.5 h-1.5 rounded-full ${stage.dot} shrink-0`} />
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
