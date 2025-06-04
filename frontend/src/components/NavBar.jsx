import React from 'react';
import { NavLink } from 'react-router-dom';
import { Database, Home, BookOpen, Package, Info } from 'lucide-react';

const Navbar = () => {
  // Define navigation items with their properties
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Generate', path: '/generate', icon: Database },
    { name: 'Tutorial', path: '/tutorial', icon: BookOpen },
    { name: 'Extras', path: '/extras', icon: Package },
    { name: 'About', path: '/about', icon: Info },
  ];

  return (
    // Sticky navigation bar with backdrop blur and shadow
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-50">
      {/* Container with responsive padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Flexbox layout for navbar content */}
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and brand name section */}
          <div className="flex items-center space-x-2">
            {/* Database icon as logo */}
            <Database className="h-8 w-8 text-blue-600" />
            {/* Brand name with gradient text */}
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DataGen AI
            </span>
          </div>
          
          {/* Desktop navigation menu */}
          <div className="hidden md:flex space-x-8">
            {/* Map through navigation items */}
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                // Dynamic className based on active state
                className={({ isActive }) =>
                  `flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50' // Active state styling
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50' // Default and hover state
                  }`
                }
              >
                {/* Render icon component */}
                <item.icon className="h-4 w-4" />
                {/* Navigation item text */}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          {/* Mobile menu button (placeholder for future mobile menu implementation) */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600">
              {/* Hamburger menu icon */}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;