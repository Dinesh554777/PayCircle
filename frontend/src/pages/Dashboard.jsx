import { FiTarget, FiDollarSign, FiUsers, FiClock, FiPlus, FiMail, FiDownload } from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardCard from '../components/DashboardCard';

export default function Dashboard() {
  // Dummy Data
  const summaryData = [
    { title: 'Total Campaigns', value: '12', icon: <FiTarget size={20} />, trend: '2 new', trendUp: true },
    { title: 'Total Collection', value: '$24,500', icon: <FiDollarSign size={20} />, trend: '15%', trendUp: true },
    { title: 'Paid Participants', value: '145', icon: <FiUsers size={20} />, trend: '8%', trendUp: true },
    { title: 'Pending Payments', value: '$3,200', icon: <FiClock size={20} />, trend: '2%', trendUp: false },
  ];

  const pieData = [
    { name: 'Paid', value: 145 },
    { name: 'Pending', value: 32 },
  ];
  const COLORS = ['#10B981', '#F59E0B']; // Green, Amber

  const barData = [
    { name: 'Jan', collected: 4000 },
    { name: 'Feb', collected: 3000 },
    { name: 'Mar', collected: 5000 },
    { name: 'Apr', collected: 7000 },
    { name: 'May', collected: 2500 },
    { name: 'Jun', collected: 3000 },
  ];

  const recentTransactions = [
    { id: 'TRX-001', name: 'John Doe', campaign: 'Summer BBQ', amount: '$50.00', status: 'Paid', date: 'Today, 10:24 AM' },
    { id: 'TRX-002', name: 'Alice Smith', campaign: 'Office Gift', amount: '$25.00', status: 'Pending', date: 'Yesterday, 2:15 PM' },
    { id: 'TRX-003', name: 'Bob Johnson', campaign: 'Summer BBQ', amount: '$50.00', status: 'Paid', date: 'Yesterday, 9:00 AM' },
    { id: 'TRX-004', name: 'Emma Davis', campaign: 'Team Jersey', amount: '$120.00', status: 'Paid', date: 'Jul 12, 4:30 PM' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organizer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, here's your collection overview.</p>
        </div>
        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <FiPlus className="mr-2" /> Create Campaign
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <FiMail className="mr-2" /> Invite
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <FiDownload className="mr-2" /> Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((data, index) => (
          <DashboardCard key={index} {...data} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Monthly Collection</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `$${val}`} dx={-10} />
                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="collected" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Status</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trx.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                        {trx.name.charAt(0)}
                      </div>
                      {trx.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trx.campaign}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{trx.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      trx.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {trx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
