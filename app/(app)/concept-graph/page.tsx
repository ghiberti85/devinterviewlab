'use client'

import { useState, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useConcepts, useCreateConcept, useCreateRelation, useDeleteConcept } from '@/features/concepts/hooks/useConcepts'
import { Plus, Trash2 } from 'lucide-react'

function scoreColor(score: number) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

function toFlowNodes(concepts: any[]): Node[] {
  return concepts.map((c, i) => ({
    id: c.id,
    data: { label: c.name, score: c.score },
    position: { x: (i % 5) * 180 + 40, y: Math.floor(i / 5) * 120 + 40 },
    style: {
      background: scoreColor(c.score) + '22',
      border: `2px solid ${scoreColor(c.score)}`,
      borderRadius: 10,
      padding: '8px 14px',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--foreground)',
      minWidth: 120,
      textAlign: 'center' as const,
    },
  }))
}

function toFlowEdges(relations: any[]): Edge[] {
  return relations.map(r => ({
    id: r.id,
    source: r.source_id,
    target: r.target_id,
    label: r.relation_type,
    animated: r.relation_type === 'requires',
    style: { stroke: '#6366f1' },
    labelStyle: { fontSize: 10, fill: '#888' },
  }))
}

export default function ConceptGraphPage() {
  const { data, isLoading } = useConcepts()
  const createConcept = useCreateConcept()
  const createRelation = useCreateRelation()
  const deleteConcept = useDeleteConcept()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [initialized, setInitialized] = useState(false)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Sync data → flow nodes/edges once
  if (data && !initialized) {
    setNodes(toFlowNodes(data.nodes))
    setEdges(toFlowEdges(data.edges))
    setInitialized(true)
  }

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return
      await createRelation.mutateAsync({
        source_id: params.source,
        target_id: params.target,
        relation_type: 'related',
      })
      setEdges(eds => addEdge({ ...params, style: { stroke: '#6366f1' } }, eds))
    },
    [createRelation, setEdges]
  )

  async function handleCreateConcept(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const concept = await createConcept.mutateAsync({ name: newName, description: newDesc })
    setNodes(ns => [...ns, {
      id: concept.id,
      data: { label: concept.name, score: 0 },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      style: {
        background: '#ef444422',
        border: '2px solid #ef4444',
        borderRadius: 10,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500,
        minWidth: 120,
        textAlign: 'center' as const,
      },
    }])
    setNewName('')
    setNewDesc('')
    setShowForm(false)
  }

  async function handleDeleteSelected() {
    if (!selectedNode) return
    await deleteConcept.mutateAsync(selectedNode.id)
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id))
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
  }

  if (isLoading) return <div className="animate-pulse h-[600px] bg-muted rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag nodes to reposition. Connect nodes by dragging from a handle. Color = concept score.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedNode && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 border border-destructive text-destructive px-3 py-2 rounded-md text-sm hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} /> Delete "{(selectedNode.data as any).label}"
            </button>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Add concept
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border rounded-xl p-4 bg-card max-w-sm">
          <form onSubmit={handleCreateConcept} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Concept name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                placeholder="e.g. Closures"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Short description…"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createConcept.isPending}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50">
                {createConcept.isPending ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border py-2 rounded-md text-sm hover:bg-accent">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Weak (&lt;40)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Developing (40–70)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Strong (&gt;70)</span>
      </div>

      <div className="border rounded-xl overflow-hidden" style={{ height: 560 }}>
        {data?.nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="text-4xl">🕸️</div>
            <p className="text-sm font-medium">No concepts yet</p>
            <p className="text-xs max-w-xs">Add concepts above, then connect them by dragging from one node handle to another.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
            attributionPosition="bottom-right"
          >
            <Background gap={20} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap nodeColor={n => scoreColor((n.data as any).score ?? 0)} />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
