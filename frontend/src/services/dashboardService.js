import api from './api';

const dashboardService = {
  getSummary: async () => {
    // const response = await api.get('/dashboard/summary');
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({
      totalCampaigns: 12,
      totalCollection: 24500,
      paidParticipants: 145,
      pendingPayments: 3200
    });
  },

  getTransactions: async (limit = 5) => {
    // const response = await api.get('/dashboard/transactions', { params: { limit } });
    // return response.data;
    
    // Mock implementation
    return Promise.resolve([
      { id: 'TRX-001', name: 'John Doe', amount: 50, status: 'Paid', date: 'Today' },
      { id: 'TRX-002', name: 'Jane Smith', amount: 25, status: 'Pending', date: 'Yesterday' }
    ]);
  },

  getAnalytics: async () => {
    // const response = await api.get('/dashboard/analytics');
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({
      monthlyCollection: [
        { name: 'Jan', collected: 4000 },
        { name: 'Feb', collected: 3000 }
      ],
      paymentStatus: [
        { name: 'Paid', value: 75 },
        { name: 'Pending', value: 25 }
      ]
    });
  }
};

export default dashboardService;
