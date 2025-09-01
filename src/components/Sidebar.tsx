import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <div className="w-64 bg-gray-100 p-4">
      <nav className="space-y-2">
        <NavLink 
          to="/" 
          className="block p-2 rounded hover:bg-gray-200"
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/session-logs" 
          className="block p-2 rounded hover:bg-gray-200"
        >
          Session Logs
        </NavLink>
      </nav>
    </div>
  );
}
