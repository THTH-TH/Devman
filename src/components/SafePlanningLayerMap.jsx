import React, { lazy, Suspense } from 'react'
import { AlertCircle, Layers, Loader2 } from 'lucide-react'

const PlanningLayerMap = lazy(() => import('./PlanningLayerMap'))

function MapFallback({ title = 'Planning layer map' }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
        <Loader2 size={16} className="animate-spin text-forest-600" />
        Loading {title.toLowerCase()}...
      </div>
    </section>
  )
}

class PlanningLayerErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Planning layer map failed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Layers size={15} />
                Planning layer map unavailable
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                DevMan can still load this project. Use the Google map links and supporting summaries while the live council map is retried.
              </p>
            </div>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}

export default function SafePlanningLayerMap(props) {
  return (
    <PlanningLayerErrorBoundary>
      <Suspense fallback={<MapFallback title={props.title} />}>
        <PlanningLayerMap {...props} />
      </Suspense>
    </PlanningLayerErrorBoundary>
  )
}
