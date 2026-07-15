import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Features', path: '/features' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight">
              PayCircle
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-gray-800 hover:text-blue-600 transition-colors duration-300 font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/login"
              className="text-gray-800 hover:text-blue-600 transition-colors duration-300 font-medium px-3 py-2"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-medium"
            >
              Register
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-800 hover:text-blue-600 focus:outline-none transition-colors duration-300"
              aria-label="Toggle menu"
            >
              {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`md:hidden absolute w-full bg-white border-t border-gray-100 shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="block px-3 py-3 rounded-md text-base font-medium text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-300"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col space-y-3">
            <Link
              to="/login"
              className="block px-3 py-3 text-center rounded-md text-base font-medium text-gray-800 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-300"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="block px-3 py-3 text-center rounded-full text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300 shadow-sm"
              onClick={() => setIsOpen(false)}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
