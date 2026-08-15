export default function Tabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab${isActive ? " tab-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {TabIcon && <TabIcon aria-hidden="true" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
