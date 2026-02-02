import React from 'react';
import './Sidebar.css';

function Sidebar({ activeView, onViewChange }) {
  const menuItems = [
    // Fleet Monitoring
    { id: 'dashboard', icon: '📊', label: 'Fleet Overview', group: 'Fleet' },
    { id: 'systems', icon: '💻', label: 'All Devices', group: 'Fleet' },
    { id: 'alerts', icon: '🚨', label: 'Alerts & Issues', group: 'Fleet' },
    
    // Device Details
    { id: 'users', icon: '👤', label: 'By Employee', group: 'Devices' },
    { id: 'applications', icon: '📦', label: 'Software Inventory', group: 'Devices' },
    { id: 'locations', icon: '📍', label: 'Device Locations', group: 'Devices' },
    
    // Performance & Health
    { id: 'network', icon: '🌐', label: 'Network Health', group: 'Health' },
    { id: 'bootlogon', icon: '⚡', label: 'Performance', group: 'Health' },
    
    // Administration
    { id: 'trends', icon: '📈', label: 'Analytics', group: 'Admin' },
    { id: 'reports', icon: '📋', label: 'Reports', group: 'Admin' },
    { id: 'admin', icon: '⚙️', label: 'System Admin', group: 'Admin' },
  ];

  // Group items by section
  const groups = {
    Fleet: menuItems.filter(i => i.group === 'Fleet'),
    Devices: menuItems.filter(i => i.group === 'Devices'),
    Health: menuItems.filter(i => i.group === 'Health'),
    Admin: menuItems.filter(i => i.group === 'Admin'),
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {Object.entries(groups).map(([groupName, items]) => (
          items.length > 0 && (
            <div key={groupName} className="nav-group">
              <div className="nav-group-label">{groupName}</div>
              {items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => onViewChange(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          )
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
