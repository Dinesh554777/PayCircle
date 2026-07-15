import { useState, useMemo } from 'react';
import { FiSearch, FiFilter, FiBell, FiFileText, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Participants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dummy Data
  const [participants, setParticipants] = useState([
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', amount: '$50.00', status: 'Paid', date: 'Jul 15, 2026', avatar: 'J' },
    { id: 2, name: 'Alice Smith', email: 'alice.s@example.com', amount: '$50.00', status: 'Pending', date: '-', avatar: 'A' },
    { id: 3, name: 'Bob Johnson', email: 'bob.j@example.com', amount: '$50.00', status: 'Paid', date: 'Jul 14, 2026', avatar: 'B' },
    { id: 4, name: 'Emma Davis', email: 'emma.d@example.com', amount: '$50.00', status: 'Pending', date: '-', avatar: 'E' },
    { id: 5, name: 'Michael Brown', email: 'michael.b@example.com', amount: '$50.00', status: 'Paid', date: 'Jul 13, 2026', avatar: 'M' },
    { id: 6, name: 'Sarah Wilson', email: 'sarah.w@example.com', amount: '$50.00', status: 'Failed', date: 'Jul 12, 2026', avatar: 'S' },
    { id: 7, name: 'David Lee', email: 'david.l@example.com', amount: '$50.00', status: 'Paid', date: 'Jul 10, 2026', avatar: 'D' },
  ]);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const currentData = filteredParticipants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to remove this participant?')) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Participants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage people involved in your campaigns and track their payments.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
          Add Participant
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
        
        <div className="flex items-center w-full sm:w-auto gap-2">
          <FiFilter className="text-gray-500 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1); // Reset to first page on filter
            }}
            className="block w-full sm:w-40 py-2 pl-3 pr-8 border border-gray-300 bg-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 cursor-pointer shadow-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Participant</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Date</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.length > 0 ? (
                currentData.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-200">
                            {participant.avatar}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                          <div className="text-sm text-gray-500">{participant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{participant.amount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        participant.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                        participant.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {participant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {participant.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {participant.status === 'Pending' && (
                          <button title="Send Reminder" className="text-gray-400 hover:text-amber-600 transition-colors">
                            <FiBell size={18} />
                          </button>
                        )}
                        {participant.status === 'Paid' && (
                          <button title="View Receipt" className="text-gray-400 hover:text-green-600 transition-colors">
                            <FiFileText size={18} />
                          </button>
                        )}
                        <button title="Delete" onClick={() => handleDelete(participant.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    No participants found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredParticipants.length)}</span> of <span className="font-medium">{filteredParticipants.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">Previous</span>
                    <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page Numbers */}
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1 
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">Next</span>
                    <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Mobile Pagination */}
            <div className="flex items-center justify-between w-full sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
