import { NavLink } from 'react-router-dom';
import { FiHome, FiTarget, FiUsers, FiPieChart, FiSettings, FiLogOut } from 'react-icons/fi';

export default function Sidebar({ isOpen, setIsOpen }) {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: FiHome },
    { name: 'Campaigns', path: '/campaigns', icon: FiTarget },
    { name: 'Participants', path: '/participants', icon: FiUsers },
    { name: 'Analytics', path: '/analytics', icon: FiPieChart },
    { name: 'Profile', path: '/profile', icon: FiSettings },
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300 w-64`}>
      <div className="flex-1 py-6 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen && setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200">
          <FiLogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
