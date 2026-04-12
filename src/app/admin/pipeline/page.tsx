import { PipelineBoard } from '@/components/admin/pipeline-board'

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Pipeline</h1>
      <PipelineBoard />
    </div>
  )
}
