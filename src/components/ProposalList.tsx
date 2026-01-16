import React, { useState, useMemo } from 'react';
import type { Proposal } from '../types';

interface ProposalListProps {
  proposals: Proposal[];
  onAddProposal: (proposal: Proposal) => void;
  isGenerating?: boolean;
}

// Get border/background color based on likelihood
function getLikelihoodStyles(likelihood?: 'high' | 'medium' | 'low') {
  switch (likelihood) {
    case 'high':
      return 'border-green-300 bg-green-50';
    case 'medium':
      return 'border-yellow-300 bg-yellow-50';
    case 'low':
      return 'border-red-300 bg-red-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
}

// Collapsible likelihood group
const LikelihoodGroup: React.FC<{
  title: string;
  count: number;
  likelihood: 'high' | 'medium' | 'low';
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, count, likelihood, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerStyles = {
    high: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-red-100 text-red-800 border-red-300'
  };

  if (count === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-lg border flex items-center justify-between ${headerStyles[likelihood]}`}
      >
        <span className="font-medium text-sm">
          {title} ({count})
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Single proposal card
const ProposalCard: React.FC<{
  proposal: Proposal;
  onAddProposal: (proposal: Proposal) => void;
}> = ({ proposal, onAddProposal }) => {
  if (proposal.status === 'pending' || proposal.status === 'assessing') {
    return (
      <div className={`rounded-lg p-3 border-2 ${getLikelihoodStyles(proposal.likelihood)}`}>
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-4 w-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-600">
            {proposal.status === 'assessing' ? 'Assessing...' : 'Generating...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 border-2 ${getLikelihoodStyles(proposal.likelihood)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {proposal.displayName}
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            {proposal.rationale}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
              {proposal.relation === 'parent' ? 'Parent' :
               proposal.relation === 'ancestor' ? 'Ancestor' :
               proposal.relation === 'child' ? 'Child' : 'Descendant'}
            </span>
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
              {proposal.direction === 'upstream' ? 'Cause' : 'Effect'}
            </span>
          </div>
          {proposal.criticReason && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {proposal.criticReason}
            </p>
          )}
        </div>
        <button
          onClick={() => onAddProposal(proposal)}
          className="flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

// Loading indicator with animated dots
const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <svg
        className="animate-spin h-4 w-4 text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm text-blue-700">
        Thinking<span className="animate-pulse">...</span>
      </span>
    </div>
  );
};

export const ProposalList: React.FC<ProposalListProps> = ({
  proposals,
  onAddProposal,
  isGenerating = false,
}) => {
  // Group proposals by likelihood
  const groupedProposals = useMemo(() => {
    const completed = proposals.filter(p => p.status === 'complete');
    return {
      high: completed.filter(p => p.likelihood === 'high'),
      medium: completed.filter(p => p.likelihood === 'medium'),
      low: completed.filter(p => p.likelihood === 'low'),
      pending: proposals.filter(p => p.status === 'pending' || p.status === 'assessing')
    };
  }, [proposals]);

  const hasProposals = proposals.length > 0;
  const hasCompletedProposals = groupedProposals.high.length + groupedProposals.medium.length + groupedProposals.low.length > 0;

  if (!hasProposals && !isGenerating) {
    return (
      <div className="text-sm text-gray-500 italic">
        No proposals yet. Click "Propose New Causes" or "Propose New Effects" to get suggestions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">New Node Proposals</h3>

      {/* Thinking indicator while generating */}
      {isGenerating && <ThinkingIndicator />}

      {/* Pending proposals (still being processed) */}
      {groupedProposals.pending.length > 0 && (
        <div className="space-y-2">
          {groupedProposals.pending.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} onAddProposal={onAddProposal} />
          ))}
        </div>
      )}

      {/* Grouped completed proposals */}
      {hasCompletedProposals && (
        <>
          <LikelihoodGroup
            title="Likely"
            count={groupedProposals.high.length}
            likelihood="high"
            defaultOpen={true}
          >
            {groupedProposals.high.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onAddProposal={onAddProposal} />
            ))}
          </LikelihoodGroup>

          <LikelihoodGroup
            title="Possible"
            count={groupedProposals.medium.length}
            likelihood="medium"
            defaultOpen={true}
          >
            {groupedProposals.medium.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onAddProposal={onAddProposal} />
            ))}
          </LikelihoodGroup>

          <LikelihoodGroup
            title="Unlikely"
            count={groupedProposals.low.length}
            likelihood="low"
            defaultOpen={false}
          >
            {groupedProposals.low.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onAddProposal={onAddProposal} />
            ))}
          </LikelihoodGroup>
        </>
      )}
    </div>
  );
};

export default ProposalList;
