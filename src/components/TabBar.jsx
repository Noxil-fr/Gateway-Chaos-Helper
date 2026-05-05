export default function TabBar({ tabs, activeTab, onSelect, onClose }) {
  if (tabs.length === 0) return null

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
          <span
            className="close-tab"
            onClick={(e) => {
              e.stopPropagation()
              onClose(tab.id)
            }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  )
}
