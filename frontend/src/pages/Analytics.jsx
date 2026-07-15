import { FiTrendingUp, FiCalendar, FiDollarSign, FiActivity, FiDownload } from 'react-icons/fi';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import DashboardCard from '../components/DashboardCard';

export default function Analytics() {
  const summaryData = [
    { title: "Today's Collection", value: '$450', icon: <FiActivity size={20} />, trend: '12%', trendUp: true },
    { title: 'Weekly Collection', value: '$3,200', icon: <FiCalendar size={20} />, trend: '5%', trendUp: true },
    { title: 'Monthly Collection', value: '$12,450', icon: <FiTrendingUp size={20} />, trend: '2%', trendUp: false },
    { title: 'Total Revenue', value: '$84,500', icon: <FiDollarSign size={20} />, trend: '18%', trendUp: true },
  ];

  const barData = [
    { name: 'Jan', collected: 4000 },
    { name: 'Feb', collected: 3000 },
    { name: 'Mar', collected: 5000 },
    { name: 'Apr', collected: 7000 },
    { name: 'May', collected: 2500 },
    { name: 'Jun', collected: 6000 },
  ];

  const pieData = [
    { name: 'Paid', value: 75 },
    { name: 'Pending', value: 15 },
    { name: 'Failed', value: 10 },
  ];
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  const lineData = [
    { name: 'Week 1', CampaignA: 400, CampaignB: 240, CampaignC: 240 },
    { name: 'Week 2', CampaignA: 300, CampaignB: 139, CampaignC: 221 },
    { name: 'Week 3', CampaignA: 200, CampaignB: 980, CampaignC: 229 },
    { name: 'Week 4', CampaignA: 278, CampaignB: 390, CampaignC: 200 },
  ];

  const areaData = [
    { date: '01/07', amount: 1200 },
    { date: '05/07', amount: 2100 },
    { date: '10/07', amount: 800 },
    { date: '15/07', amount: 1600 },
    { date: '20/07', amount: 900 },
    { date: '25/07', amount: 1700 },
    { date: '30/07', amount: 3000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Deep dive into your collection performance and trends.</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
          <FiDownload className="mr-2" /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((data, index) => (
          <DashboardCard key={index} {...data} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Collection Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Collection Trend</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `$${val}`} dx={-10} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status (Pie Chart) */}
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

        {/* Monthly Collection (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Monthly Collection</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `$${val/1000}k`} dx={-10} />
                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="collected" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Performance (Line Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Campaign Performance</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `$${val}`} dx={-10} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="CampaignA" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="CampaignB" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="CampaignC" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
