import api from './api';

const campaignService = {
  getAll: async (filters = {}) => {
    // const response = await api.get('/campaigns', { params: filters });
    // return response.data;
    
    // Mock implementation
    return Promise.resolve([
      { id: 1, name: 'Summer Retreat', amount: 5000, status: 'Active' },
      { id: 2, name: 'Farewell Gift', amount: 350, status: 'Completed' }
    ]);
  },

  getById: async (id) => {
    // const response = await api.get(`/campaigns/${id}`);
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ 
      id, 
      name: 'Summer Retreat', 
      amount: 5000, 
      status: 'Active' 
    });
  },

  create: async (campaignData) => {
    // const response = await api.post('/campaigns', campaignData);
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ id: 3, ...campaignData, status: 'Active' });
  },

  update: async (id, updateData) => {
    // const response = await api.put(`/campaigns/${id}`, updateData);
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ id, ...updateData });
  },

  delete: async (id) => {
    // await api.delete(`/campaigns/${id}`);
    // return true;
    
    // Mock implementation
    return Promise.resolve(true);
  }
};

export default campaignService;
