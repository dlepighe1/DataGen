import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, Home, BookOpen, Package, Info } from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Generate', path: '/generate', icon: Database },
    { name: 'Tutorial', path: '/tutorial', icon: BookOpen },
    { name: 'Extras', path: '/extras', icon: Package },
    { name: 'About', path: '/about', icon: Info },
  ];

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: scrolled
          ? 'rgba(4, 18, 43, 0.85)'
          : 'rgba(4, 18, 43, 0.60)',
        borderBottom: '1px solid rgba(99, 179, 237, 0.15)',
        transition: 'background 0.3s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                boxShadow: '0 0 16px rgba(14,165,233,0.4)',
              }}
            >
              <Database className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">
              DataGen AI
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-sky-300 bg-sky-900/40 shadow-inner border border-sky-400/30'
                      : 'text-slate-300 hover:text-sky-300 hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#93c5fd', background: 'rgba(255,255,255,0.06)' }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden pb-4 space-y-1"
            style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: '0.5rem' }}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-sky-300 bg-sky-900/40 border border-sky-400/30'
                      : 'text-slate-300 hover:text-sky-300 hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
