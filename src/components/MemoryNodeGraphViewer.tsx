import React, { useState, useEffect } from 'react';
import {
  Brain,
  Network,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Sliders,
  Maximize2,
  RotateCcw,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Link,
  Edit2,
} from 'lucide-react';
import { WorldGraph, WorldNode, WorldRelationship } from '../engine/vnext/types';

interface MemoryNodeGraphViewerProps {
  graph?: WorldGraph;
  onUpdateGraph?: (updatedGraph: WorldGraph) => void;
  onClose?: () => void;
}

export const MemoryNodeGraphViewer: React.FC<MemoryNodeGraphViewerProps> = ({
  graph: externalGraph,
  onUpdateGraph,
  onClose,
}) => {
  const [nodes, setNodes] = useState<WorldNode[]>([]);
  const [edges, setEdges] = useState<WorldRelationship[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // New Link creation modal
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [targetNodeIdForLink, setTargetNodeIdForLink] = useState<string>('');
  const [relationTypeInput, setRelationTypeInput] = useState('RELATION_TO');
  const [relationWeightInput, setRelationWeightInput] = useState(0.85);

  // New Node creation modal
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeCategory, setNewNodeCategory] = useState<WorldNode['category']>('USER_FACT');
  const [newNodeConfidence, setNewNodeConfidence] = useState(90);

  // Fetch or initialize graph state
  useEffect(() => {
    if (externalGraph && externalGraph.nodes.length > 0) {
      setNodes(externalGraph.nodes);
      setEdges(externalGraph.edges);
    } else {
      fetchWorldModel();
    }
  }, [externalGraph]);

  const fetchWorldModel = async () => {
    try {
      const res = await fetch('/api/vnext/state');
      if (res.ok) {
        const data = await res.json();
        if (data.worldGraph) {
          setNodes(data.worldGraph.nodes || []);
          setEdges(data.worldGraph.edges || []);
        }
      }
    } catch (err) {
      console.error('Failed fetching world model graph:', err);
    }
  };

  const handlePruneNode = async (nodeId: string) => {
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    // Sync to backend persistent storage or callback
    if (onUpdateGraph) {
      onUpdateGraph({ nodes: updatedNodes, edges: updatedEdges });
    }

    try {
      await fetch(`/api/memories/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
    } catch (e) {
      // Background sync
    }
  };

  const handleAdjustConfidence = (nodeId: string, newConfidence: number) => {
    const updatedNodes = nodes.map((n) => (n.id === nodeId ? { ...n, confidence: newConfidence } : n));
    setNodes(updatedNodes);
    if (onUpdateGraph) {
      onUpdateGraph({ nodes: updatedNodes, edges });
    }
  };

  const handlePromoteStage = (nodeId: string, stage: WorldNode['verificationStage']) => {
    const updatedNodes = nodes.map((n) => (n.id === nodeId ? { ...n, verificationStage: stage } : n));
    setNodes(updatedNodes);
    if (onUpdateGraph) {
      onUpdateGraph({ nodes: updatedNodes, edges });
    }
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !targetNodeIdForLink) return;

    const newEdge: WorldRelationship = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceId: selectedNodeId,
      targetId: targetNodeIdForLink,
      relation: relationTypeInput.toUpperCase().replace(/\s+/g, '_'),
      weight: relationWeightInput,
      timestamp: new Date().toISOString(),
    };

    const updatedEdges = [...edges, newEdge];
    setEdges(updatedEdges);
    setIsAddingLink(false);
    setTargetNodeIdForLink('');

    if (onUpdateGraph) {
      onUpdateGraph({ nodes, edges: updatedEdges });
    }
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    const newNode: WorldNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: newNodeLabel.trim(),
      category: newNodeCategory,
      properties: { createdBy: 'Operator Manual Entry' },
      confidence: newNodeConfidence,
      lastVerified: new Date().toISOString(),
      verificationStage: 'VERIFIED',
    };

    const updatedNodes = [newNode, ...nodes];
    setNodes(updatedNodes);
    setSelectedNodeId(newNode.id);
    setIsAddingNode(false);
    setNewNodeLabel('');

    if (onUpdateGraph) {
      onUpdateGraph({ nodes: updatedNodes, edges });
    }
  };

  // Filtered nodes
  const filteredNodes = nodes.filter((n) => {
    const matchesSearch =
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'ALL' || n.category === selectedCategoryFilter;
    const matchesStage = selectedStageFilter === 'ALL' || n.verificationStage === selectedStageFilter;
    return matchesSearch && matchesCategory && matchesStage;
  });

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeEdges = edges.filter(
    (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
  );

  const getStageBadgeColor = (stage: WorldNode['verificationStage']) => {
    switch (stage) {
      case 'CORE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'VERIFIED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'CANDIDATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-5 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Network className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Interactive Memory Vault & Graph Ledger
              <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                {nodes.length} Facts • {edges.length} Relational Links
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Visual inspection, confidence weight tuning, relational edge mapping, and manual pruning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingNode(true)}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Memory Fact
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search episodic facts or entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Categories</option>
          <option value="USER_FACT">USER_FACT</option>
          <option value="PREFERENCE">PREFERENCE</option>
          <option value="PROJECT_CONTEXT">PROJECT_CONTEXT</option>
          <option value="ENTITY">ENTITY</option>
          <option value="SYSTEM_STATE">SYSTEM_STATE</option>
        </select>

        <select
          value={selectedStageFilter}
          onChange={(e) => setSelectedStageFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Verification Stages</option>
          <option value="CORE">CORE (Hard Invariant)</option>
          <option value="VERIFIED">VERIFIED (Proven Fact)</option>
          <option value="CANDIDATE">CANDIDATE (Under Review)</option>
          <option value="TEMPORARY">TEMPORARY (Episodic Observation)</option>
        </select>
      </div>

      {/* Interactive Main Graph Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Graph Visual Canvas / Nodes Grid */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-3 relative">
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono border-b border-slate-800/80 pb-2">
            <span>Episodic Nodes ({filteredNodes.length} Displayed)</span>
            <span>Click node to inspect or prune</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredNodes.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-slate-500 text-xs font-mono">
                No memory facts matched search criteria.
              </div>
            ) : (
              filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const connectedCount = edges.filter(
                  (e) => e.sourceId === node.id || e.targetId === node.id
                ).length;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 relative group ${
                      isSelected
                        ? 'bg-slate-900 border-purple-500 shadow-lg shadow-purple-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-100 truncate">{node.label}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-mono border rounded ${getStageBadgeColor(node.verificationStage)}`}>
                        {node.verificationStage}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Category: <strong className="text-slate-300">{node.category}</strong></span>
                      <span>Confidence: <strong className="text-emerald-400">{node.confidence}%</strong></span>
                    </div>

                    {/* Confidence progress bar */}
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-purple-500 h-full transition-all duration-300"
                        style={{ width: `${node.confidence}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                      <span>Links: {connectedCount} edges</span>
                      <span className="text-purple-400 group-hover:underline">Inspect Node →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono border rounded inline-block mb-1 ${getStageBadgeColor(selectedNode.verificationStage)}`}>
                    {selectedNode.verificationStage}
                  </span>
                  <h4 className="text-sm font-bold text-white">{selectedNode.label}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{selectedNode.id}</span>
                </div>
                <button
                  onClick={() => handlePruneNode(selectedNode.id)}
                  title="Prune this fact from Memory Ledger"
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Prune
                </button>
              </div>

              {/* Confidence Weight Adjustment */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Confidence Weight:</span>
                  <strong className="text-emerald-400">{selectedNode.confidence}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedNode.confidence}
                  onChange={(e) => handleAdjustConfidence(selectedNode.id, parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Verification Stage Controls */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400">Promote / Demote Stage:</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {(['CORE', 'VERIFIED', 'CANDIDATE', 'TEMPORARY'] as WorldNode['verificationStage'][]).map((stg) => (
                    <button
                      key={stg}
                      onClick={() => handlePromoteStage(selectedNode.id, stg)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                        selectedNode.verificationStage === stg
                          ? 'bg-purple-500/30 text-purple-300 border-purple-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relational Edges List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Relational Links ({selectedNodeEdges.length})</span>
                  <button
                    onClick={() => setIsAddingLink(true)}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Link className="w-3 h-3" /> + Add Link
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedNodeEdges.length === 0 ? (
                    <p className="text-[11px] text-slate-500 font-mono italic">No relational links attached.</p>
                  ) : (
                    selectedNodeEdges.map((edge) => {
                      const otherNodeId = edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId;
                      const otherNode = nodes.find((n) => n.id === otherNodeId);
                      return (
                        <div key={edge.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono flex items-center justify-between">
                          <span className="text-cyan-300 font-bold">{edge.relation}</span>
                          <span className="text-slate-300 truncate max-w-[100px]">{otherNode?.label || otherNodeId}</span>
                          <span className="text-[10px] text-slate-500">(w: {edge.weight})</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs font-mono space-y-2">
              <Brain className="w-8 h-8 text-slate-700 mx-auto animate-bounce" />
              <p>Select any node from the Memory Vault graph to inspect properties, adjust weights, or prune stored facts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Memory Fact Modal */}
      {isAddingNode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateNode} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Add Stored Episodic Fact
              </h4>
              <button type="button" onClick={() => setIsAddingNode(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Fact Description / Label:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. User prefers concise answers with typescript examples"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Category:</label>
                <select
                  value={newNodeCategory}
                  onChange={(e: any) => setNewNodeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="USER_FACT">USER_FACT</option>
                  <option value="PREFERENCE">PREFERENCE</option>
                  <option value="PROJECT_CONTEXT">PROJECT_CONTEXT</option>
                  <option value="ENTITY">ENTITY</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confidence Weight ({newNodeConfidence}%):</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={newNodeConfidence}
                  onChange={(e) => setNewNodeConfidence(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNode(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer"
              >
                Save to Memory Vault
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Relational Link Modal */}
      {isAddingLink && selectedNode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateLink} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Link className="w-4 h-4 text-purple-400" />
                Add Relational Edge from '{selectedNode.label}'
              </h4>
              <button type="button" onClick={() => setIsAddingLink(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Target Memory Node:</label>
                <select
                  required
                  value={targetNodeIdForLink}
                  onChange={(e) => setTargetNodeIdForLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Target Node --</option>
                  {nodes
                    .filter((n) => n.id !== selectedNode.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.category})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Relation Type:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEPENDS_ON, OPERATES, PREFERS"
                  value={relationTypeInput}
                  onChange={(e) => setRelationTypeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Link Weight ({relationWeightInput}):</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={relationWeightInput}
                  onChange={(e) => setRelationWeightInput(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer"
              >
                Create Edge
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
