import { useState } from 'react'

import { ApprovalCard } from '../../components/approval/ApprovalCard'
import { useApprovals } from '../../hooks/use-approvals'

export function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')

  const status = activeTab === 'pending' ? 'waiting_approval' : undefined

  const { data, isLoading, error } = useApprovals({ status })

  return (
    <div className='approvals-page'>
      <header className='page-header'>
        <h1>Approvals</h1>
      </header>

      <div className='filter-tabs'>
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          Pending
          {data && activeTab === 'pending' && <span className='tab-badge'>{data.total}</span>}
        </button>
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          All
        </button>
      </div>

      {isLoading && (
        <div className='page-loading'>
          <div className='loading-spinner' />
          <p>Loading approvals...</p>
        </div>
      )}

      {error && (
        <div className='page-error'>
          <p>Error loading approvals: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )}

      {data && (
        <div className='approvals-grid'>
          {data.items.length === 0 ? (
            <div className='empty-state'>
              <p>No approvals found</p>
            </div>
          ) : (
            data.items.map((approval) => <ApprovalCard key={approval.id} approval={approval} />)
          )}
        </div>
      )}
    </div>
  )
}
