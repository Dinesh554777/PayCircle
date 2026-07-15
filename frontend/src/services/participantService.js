import api from './api';

const participantService = {
  getAll: async (campaignId = null) => {
    // const params = campaignId ? { campaignId } : {};
    // const response = await api.get('/participants', { params });
    // return response.data;
    
    // Mock implementation
    return Promise.resolve([
      { id: 1, name: 'John Doe', status: 'Paid', amount: 50 },
      { id: 2, name: 'Jane Smith', status: 'Pending', amount: 50 }
    ]);
  },

  addParticipant: async (participantData) => {
    // const response = await api.post('/participants', participantData);
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ id: 3, ...participantData, status: 'Pending' });
  },

  updateStatus: async (id, status) => {
    // const response = await api.patch(`/participants/${id}/status`, { status });
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ id, status });
  },

  sendReminder: async (id) => {
    // const response = await api.post(`/participants/${id}/remind`);
    // return response.data;
    
    // Mock implementation
    console.log(`Sending reminder to participant ${id}`);
    return Promise.resolve({ success: true, message: 'Reminder sent successfully' });
  },

  removeParticipant: async (id) => {
    // await api.delete(`/participants/${id}`);
    // return true;
    
    // Mock implementation
    return Promise.resolve(true);
  }
};

export default participantService;
