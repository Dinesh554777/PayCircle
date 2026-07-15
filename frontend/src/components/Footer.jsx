import { Link } from 'react-router-dom';
import { FiTwitter, FiGithub, FiLinkedin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-2xl font-bold text-white tracking-tight mb-4 inline-block">
              PayCircle
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              AI-Powered Smart Group Payment & Collection Platform. Simplifying how people pool money together.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <FiTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <FiGithub size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-300">
                <FiLinkedin size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/features" className="text-gray-400 hover:text-white transition-colors duration-300">Features</Link></li>
              <li><Link to="/pricing" className="text-gray-400 hover:text-white transition-colors duration-300">Pricing</Link></li>
              <li><Link to="/security" className="text-gray-400 hover:text-white transition-colors duration-300">Security</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors duration-300">About Us</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors duration-300">Careers</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} PayCircle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
