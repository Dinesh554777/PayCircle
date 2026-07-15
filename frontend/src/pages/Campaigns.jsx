import { useState, useMemo } from 'react';
import { FiSearch, FiFilter, FiPlus } from 'react-icons/fi';
import CampaignCard from '../components/CampaignCard';

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Dummy Data
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: 'Summer Company Retreat 2026',
      purpose: 'Collecting funds for the upcoming company retreat to the mountains. Covers accommodation, food, and activities.',
      amount: '$4,200',
      targetAmount: '$5,000',
      deadline: 'Aug 15, 2026',
      totalParticipants: 50,
      paidParticipants: 42,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Sarah\'s Farewell Gift',
      purpose: 'Gift for Sarah who is leaving after 5 years. Planning to get her a smartwatch and a gift card.',
      amount: '$350',
      targetAmount: '$350',
      deadline: 'Jul 10, 2026',
      totalParticipants: 15,
      paidParticipants: 15,
      status: 'Completed'
    },
    {
      id: 3,
      name: 'Weekly Football Pitch Hire',
      purpose: 'Pitch rental fees for the upcoming 10 weeks of Thursday night football.',
      amount: '$150',
      targetAmount: '$600',
      deadline: 'Jul 20, 2026',
      totalParticipants: 12,
      paidParticipants: 3,
      status: 'Active'
    },
    {
      id: 4,
      name: 'Q2 Office Snacks Fund',
      purpose: 'Quarterly collection for premium office snacks and coffee beans.',
      amount: '$200',
      targetAmount: '$400',
      deadline: 'Mar 31, 2026',
      totalParticipants: 20,
      paidParticipants: 10,
      status: 'Expired'
    }
  ]);

  const handleView = (id) => console.log('View campaign', id);
  const handleEdit = (id) => console.log('Edit campaign', id);
  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            campaign.purpose.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your active and past payment collections.</p>
        </div>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
        
        <div className="flex items-center w-full md:w-auto gap-2">
          <FiFilter className="text-gray-500 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full md:w-auto py-2 pl-3 pr-8 border border-gray-300 bg-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 cursor-pointer shadow-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCampaigns.map(campaign => (
            <CampaignCard 
              key={campaign.id} 
              campaign={campaign} 
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Try adjusting your search or filters. If you don't have any campaigns yet, create a new one!
          </p>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group z-30"
        title="Create New Campaign"
      >
        <FiPlus size={24} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out font-semibold">
          Create Campaign
        </span>
      </button>
    </div>
  );
}
