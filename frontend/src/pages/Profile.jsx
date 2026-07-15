import { FiUser, FiMail, FiPhone, FiBriefcase, FiShield, FiEdit2, FiLock, FiLogOut, FiCamera } from 'react-icons/fi';

export default function Profile() {
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    role: 'Organizer',
    organization: 'Acme Corporation',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=EFF6FF&color=1D4ED8&size=128&bold=true',
    joinDate: 'Joined March 2026'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            {/* Banner Background */}
            <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0 z-0"></div>
            
            {/* Avatar Container */}
            <div className="relative z-10 mt-10 mb-4 group cursor-pointer">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <FiCamera size={14} />
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm font-semibold text-blue-600 mt-1 mb-1">{user.role}</p>
            <p className="text-xs text-gray-500">{user.joinDate}</p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Account Actions</h3>
            
            <button className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gray-50 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm border border-gray-200 shadow-sm">
              <FiEdit2 size={16} />
              <span>Edit Profile</span>
            </button>
            
            <button className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gray-50 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm border border-gray-200 shadow-sm">
              <FiLock size={16} />
              <span>Change Password</span>
            </button>
            
            <div className="pt-3 mt-1 border-t border-gray-100">
              <button className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm border border-red-100 shadow-sm">
                <FiLogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-md transition-colors">Edit Details</button>
            </div>
            
            <div className="p-6 sm:p-8">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-2">
                    <FiUser className="mr-2 text-gray-400" size={16} /> Full Name
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 bg-gray-50 p-3.5 rounded-lg border border-gray-100 shadow-inner">
                    {user.name}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-2">
                    <FiMail className="mr-2 text-gray-400" size={16} /> Email Address
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 bg-gray-50 p-3.5 rounded-lg border border-gray-100 shadow-inner">
                    {user.email}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-2">
                    <FiPhone className="mr-2 text-gray-400" size={16} /> Phone Number
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 bg-gray-50 p-3.5 rounded-lg border border-gray-100 shadow-inner">
                    {user.phone}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-2">
                    <FiShield className="mr-2 text-gray-400" size={16} /> Role
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 bg-gray-50 p-3.5 rounded-lg border border-gray-100 shadow-inner">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full inline-block">
                      {user.role}
                    </span>
                  </dd>
                </div>
                
                <div className="sm:col-span-2 border-t border-gray-100 pt-8 mt-2">
                  <dt className="text-sm font-medium text-gray-500 flex items-center mb-2">
                    <FiBriefcase className="mr-2 text-gray-400" size={16} /> Organization
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 bg-gray-50 p-3.5 rounded-lg border border-gray-100 shadow-inner">
                    {user.organization}
                  </dd>
                </div>

              </dl>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
