import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { FiMenu } from 'react-icons/fi';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Navbar at top */}
      <div className="flex-shrink-0 z-20 shadow-sm relative bg-white">
        <Navbar />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block flex-shrink-0 relative z-10 shadow-sm h-full">
          <Sidebar isOpen={true} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl h-full transform transition-transform duration-300">
              <Sidebar isOpen={true} setIsOpen={setIsSidebarOpen} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 relative w-full">
          {/* Mobile Menu Toggle */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none flex items-center bg-white p-2.5 rounded-lg shadow-sm border border-gray-200 transition-colors"
            >
              <FiMenu className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium text-sm">Dashboard Menu</span>
            </button>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
