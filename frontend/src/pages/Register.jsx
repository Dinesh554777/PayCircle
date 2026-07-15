import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'organizer', // default role
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        console.log('Registration payload:', formData);
      }, 1000);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="px-8 pt-10 pb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join PayCircle and simplify your group collections.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to use PayCircle as an...
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`border rounded-lg p-4 flex cursor-pointer transition-all duration-200 ${
                  formData.role === 'organizer' 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200 hover:border-blue-200'
                }`}>
                  <input type="radio" name="role" value="organizer" checked={formData.role === 'organizer'} onChange={handleChange} className="sr-only" />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-bold ${formData.role === 'organizer' ? 'text-blue-700' : 'text-gray-900'}`}>
                      Organizer
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      I want to create campaigns and collect money.
                    </span>
                  </div>
                </label>
                
                <label className={`border rounded-lg p-4 flex cursor-pointer transition-all duration-200 ${
                  formData.role === 'participant' 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200 hover:border-blue-200'
                }`}>
                  <input type="radio" name="role" value="participant" checked={formData.role === 'participant'} onChange={handleChange} className="sr-only" />
                  <div className="flex flex-col">
                    <span className={`block text-sm font-bold ${formData.role === 'participant' ? 'text-blue-700' : 'text-gray-900'}`}>
                      Participant
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      I was invited to pay for a group campaign.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border outline-none ${
                    errors.fullName ? 'border-red-300 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'
                  } rounded-lg bg-gray-50 focus:bg-white transition-colors duration-200 sm:text-sm`}
                  placeholder="John Doe"
                />
              </div>
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border outline-none ${
                    errors.email ? 'border-red-300 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'
                  } rounded-lg bg-gray-50 focus:bg-white transition-colors duration-200 sm:text-sm`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Passwords - Grid for Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border outline-none ${
                      errors.password ? 'border-red-300 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'
                    } rounded-lg bg-gray-50 focus:bg-white transition-colors duration-200 sm:text-sm`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border outline-none ${
                      errors.confirmPassword ? 'border-red-300 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'
                    } rounded-lg bg-gray-50 focus:bg-white transition-colors duration-200 sm:text-sm`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="pt-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-2 text-sm">
                  <label htmlFor="acceptTerms" className="text-gray-700">
                    I agree to the <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>.
                  </label>
                  {errors.acceptTerms && <p className="mt-1 text-sm text-red-600 block">{errors.acceptTerms}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Footer of Card */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
