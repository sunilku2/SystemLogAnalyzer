import React from 'react';
import './FiltersBar.css';

function FiltersBar({
  timeRange = '24h',
  onTimeRangeChange,
  searchQuery = '',
  onSearchChange,
  autoRefresh = false,
  onAutoRefreshToggle,
  onExport
}) {
  return (
    <div className="filters-bar">
      <div className="filters-left">
        <div className="filter-group">
          <label className="filter-label">Time Range</label>
          <select
            className="filter-select"
            value={timeRange}
            onChange={(e) => onTimeRangeChange && onTimeRangeChange(e.target.value)}
          >
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="12h">Last 12h</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            className="filter-input"
            type="text"
            placeholder="Search users, systems, issues..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="filters-right">
        <label className="toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshToggle && onAutoRefreshToggle(e.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">Live Refresh</span>
        </label>

        <button className="btn btn-secondary" onClick={onExport} title="Export CSV">
          ⬇️ Export
        </button>
      </div>
    </div>
  );
}

export default FiltersBar;
