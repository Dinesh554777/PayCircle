import { FiEye, FiEdit2, FiTrash2, FiClock, FiUsers, FiDollarSign } from 'react-icons/fi';

export default function CampaignCard({ campaign, onView, onEdit, onDelete }) {
  const { name, purpose, amount, targetAmount, deadline, totalParticipants, paidParticipants, status } = campaign;
  
  // Calculate progress percentage
  const progress = totalParticipants > 0 ? Math.round((paidParticipants / totalParticipants) * 100) : 0;

  // Status badge styling
  const statusColors = {
    Active: 'bg-green-100 text-green-800 border-green-200',
    Completed: 'bg-blue-100 text-blue-800 border-blue-200',
    Expired: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full overflow-hidden">
      {/* Card Header */}
      <div className="p-5 border-b border-gray-100 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 pr-4">{name}</h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">{purpose}</p>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center text-gray-700 font-semibold">
            <FiDollarSign className="text-gray-400 mr-1.5" size={16} />
            <span className="text-gray-900">{amount}</span>
            <span className="text-gray-500 font-normal ml-1 text-xs">/ {targetAmount}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FiClock className="text-gray-400 mr-1.5" size={16} />
            <span className={new Date(deadline) < new Date() && status !== 'Completed' ? 'text-red-600 font-medium' : ''}>
              {deadline}
            </span>
          </div>
        </div>

        {/* Progress Bar for Participants */}
        <div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span className="flex items-center"><FiUsers className="mr-1.5" /> Participation</span>
            <span className="font-medium text-gray-700">{paidParticipants} of {totalParticipants} paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${progress === 100 ? 'bg-blue-500' : 'bg-green-500'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Card Footer - Actions */}
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => onView(campaign.id)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <FiEye size={18} />
          </button>
          <button 
            onClick={() => onEdit(campaign.id)}
            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit Campaign"
          >
            <FiEdit2 size={18} />
          </button>
        </div>
        <button 
          onClick={() => onDelete(campaign.id)}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Campaign"
        >
          <FiTrash2 size={18} />
        </button>
      </div>
    </div>
  );
}
