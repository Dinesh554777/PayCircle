export default function DashboardCard({ title, value, icon, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm font-medium flex items-center ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1">{trendUp ? '↑' : '↓'}</span>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
