import React, { useState } from 'react';
import { Maximize2, Minimize2, Sparkles, Layers, ShieldCheck, Wrench, HeartHandshake, FileText } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';

const JobRequirementMap = ({
  mapData,
  displayRole = 'QA / Test Engineer',
  company = 'NVIDIA',
  isModal = false,
  onExpand,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Extract category groups from nodes and relationships
  const rootNode = mapData?.nodes?.find((n) => n.id === 'root_role') || {
    label: `${displayRole} (${company})`,
  };

  const getLeavesForCategory = (catId, fallbackPrefix) => {
    if (!mapData?.nodes || !mapData?.relationships) return [];
    const rels = mapData.relationships.filter((r) => r.source === catId);
    const targetIds = rels.map((r) => r.target);
    const leaves = mapData.nodes.filter((n) => targetIds.includes(n.id));
    if (leaves.length > 0) return leaves;

    // Fallback: match by category or prefix
    return mapData.nodes.filter(
      (n) =>
        n.id.startsWith(fallbackPrefix) ||
        (n.category && n.category.toLowerCase().includes(fallbackPrefix))
    );
  };

  const techLeaves = getLeavesForCategory('cat_tech', 'tech');
  const respLeaves = getLeavesForCategory('cat_resp', 'resp');
  const toolLeaves = getLeavesForCategory('cat_tools', 'tool');
  const softLeaves = getLeavesForCategory('cat_soft', 'soft');

  const categories = [
    {
      id: 'cat_tech',
      title: 'Technical Requirements',
      icon: Layers,
      headerBg: 'bg-blue-600 text-white',
      itemBg: 'bg-blue-50/80 text-blue-900 border-blue-200/80 hover:bg-blue-100/90',
      lineColor: '#2563eb',
      leaves: techLeaves.length > 0 ? techLeaves : [
        { id: 't1', label: 'Automation Testing' },
        { id: 't2', label: 'API Testing' },
        { id: 't3', label: 'Java / Python' },
        { id: 't4', label: 'SQL' },
        { id: 't5', label: 'Test Frameworks' },
      ],
    },
    {
      id: 'cat_resp',
      title: 'Responsibilities',
      icon: ShieldCheck,
      headerBg: 'bg-cyan-600 text-white',
      itemBg: 'bg-cyan-50/80 text-cyan-900 border-cyan-200/80 hover:bg-cyan-100/90',
      lineColor: '#3B82F6',
      leaves: respLeaves.length > 0 ? respLeaves : [
        { id: 'r1', label: 'Test Case Design' },
        { id: 'r2', label: 'Execute Test Cases' },
        { id: 'r3', label: 'Identify Defects' },
        { id: 'r4', label: 'Regression Testing' },
        { id: 'r5', label: 'Collaborate with Dev' },
      ],
    },
    {
      id: 'cat_tools',
      title: 'Tools & Technologies',
      icon: Wrench,
      headerBg: 'bg-purple-600 text-white',
      itemBg: 'bg-purple-50/80 text-purple-900 border-purple-200/80 hover:bg-purple-100/90',
      lineColor: '#7c3aed',
      leaves: toolLeaves.length > 0 ? toolLeaves : [
        { id: 'o1', label: 'Selenium' },
        { id: 'o2', label: 'Jenkins' },
        { id: 'o3', label: 'Postman' },
        { id: 'o4', label: 'JIRA' },
        { id: 'o5', label: 'Git' },
      ],
    },
    {
      id: 'cat_soft',
      title: 'Soft Skills',
      icon: HeartHandshake,
      headerBg: 'bg-amber-500 text-white',
      itemBg: 'bg-amber-50/80 text-amber-900 border-amber-200/80 hover:bg-amber-100/90',
      lineColor: '#d97706',
      leaves: softLeaves.length > 0 ? softLeaves : [
        { id: 's1', label: 'Problem Solving' },
        { id: 's2', label: 'Communication' },
        { id: 's3', label: 'Team Collaboration' },
        { id: 's4', label: 'Attention to Detail' },
        { id: 's5', label: 'Analytical Thinking' },
      ],
    },
  ];

  const renderTree = (expanded = false) => (
    <div className="w-full max-w-full overflow-x-auto select-none py-2 scrollbar-thin">
      <div className={`flex flex-col items-center mx-auto ${expanded ? 'min-w-[850px]' : 'min-w-[580px]'}`}>
        {/* Root Node: Target Role & Company */}
        <div className="relative z-10">
          <div className="px-6 py-3.5 rounded-xl bg-slate-900 text-white text-center shadow-lg border-2 border-slate-700 max-w-md mx-auto transition-transform hover:scale-[1.02]">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
              Target Role Specification
            </div>
            <div className="text-sm sm:text-base font-extrabold tracking-tight">
              {rootNode.label}
            </div>
          </div>
        </div>

        {/* Branching SVG Connector Lines */}
        <div className="w-full relative h-10 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 800 40" preserveAspectRatio="none">
            {/* Center vertical trunk */}
            <line x1="400" y1="0" x2="400" y2="20" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
            {/* Horizontal distribution bar */}
            <line x1="100" y1="20" x2="700" y2="20" stroke="#cbd5e1" strokeWidth="2" />
            {/* Drops to 4 categories */}
            <line x1="100" y1="20" x2="100" y2="40" stroke="#2563eb" strokeWidth="2" />
            <line x1="300" y1="20" x2="300" y2="40" stroke="#3B82F6" strokeWidth="2" />
            <line x1="500" y1="20" x2="500" y2="40" stroke="#7c3aed" strokeWidth="2" />
            <line x1="700" y1="20" x2="700" y2="40" stroke="#d97706" strokeWidth="2" />
          </svg>
        </div>

        {/* 4 Category Columns */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className="flex flex-col items-center space-y-2.5">
                {/* Category Header Card */}
                <div
                  className={`w-full py-2 px-2.5 rounded-lg text-center font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 ${cat.headerBg}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{cat.title}</span>
                </div>

                {/* Sub-node Chips */}
                <div className="w-full space-y-2">
                  {cat.leaves.map((leaf) => (
                    <div
                      key={leaf.id || leaf.label}
                      className={`w-full py-2 px-2.5 rounded-lg border text-center text-xs font-semibold shadow-xs transition-colors ${cat.itemBg}`}
                      title={leaf.label}
                    >
                      <span className="line-clamp-2 leading-snug">{leaf.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return renderTree(true);
  }

  return (
    <Card padding="p-5 sm:p-6" className="border-slate-200 shadow-sm relative overflow-hidden">
      {/* Header with Expand Button */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-royal-50 text-royal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">AI Job Requirement Map</h3>
            <p className="text-[11px] text-slate-400">Hierarchical visual structure of target job expectations</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Maximize2}
          onClick={() => {
            if (onExpand) onExpand();
            else setModalOpen(true);
          }}
          className="text-xs"
        >
          Expand
        </Button>
      </div>

      {/* Main Visual Tree */}
      {renderTree(false)}

      {/* Full Modal View on Expand */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="AI Job Requirement Map — Full View"
        size="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            This graph presents the four core pillars of the <strong>{displayRole}</strong> role at{' '}
            <strong>{company}</strong> derived directly from the Job Description.
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            {renderTree(true)}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default JobRequirementMap;
