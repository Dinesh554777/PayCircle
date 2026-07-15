import api from './api';

const authService = {
  login: async (credentials) => {
    // const response = await api.post('/auth/login', credentials);
    // return response.data;
    
    // Mock implementation for UI development
    console.log('Mock login for:', credentials.email);
    return Promise.resolve({ 
      token: 'mock-jwt-token-xyz', 
      user: { id: 1, name: 'John Doe', email: credentials.email, role: 'Organizer' } 
    });
  },

  register: async (userData) => {
    // const response = await api.post('/auth/register', userData);
    // return response.data;
    
    // Mock implementation
    console.log('Mock register for:', userData.email);
    return Promise.resolve({ 
      token: 'mock-jwt-token-xyz', 
      user: { id: 1, ...userData } 
    });
  },

  logout: () => {
    // Optional: await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    // const response = await api.get('/auth/me');
    // return response.data;
    
    // Mock implementation
    return Promise.resolve({ 
      id: 1, 
      name: 'John Doe', 
      email: 'john.doe@example.com', 
      role: 'Organizer' 
    });
  }
};

export default authService;
