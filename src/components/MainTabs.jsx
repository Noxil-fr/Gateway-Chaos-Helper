const TABS = [
  { id: 'analyzer', label: 'Log Analyzer' },
  { id: 'gateway', label: 'Gateway version' },
]

export default function MainTabs({ activeTab, onTabChange }) {
  return (
    <div className="main-tab-bar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`main-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
