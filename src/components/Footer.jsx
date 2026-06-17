import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer
      className="relative z-10 mt-auto"
      style={{
        background: 'rgba(4, 18, 43, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(99, 179, 237, 0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
            >
              <Database className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gradient">DataGen AI</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link to="/generate" className="text-slate-400 hover:text-sky-300 transition-colors">Generate</Link>
            <Link to="/tutorial" className="text-slate-400 hover:text-sky-300 transition-colors">Tutorial</Link>
            <Link to="/about" className="text-slate-400 hover:text-sky-300 transition-colors">About</Link>
            <a
              href="https://github.com/dlepighe1/DataGen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-sky-300 transition-colors"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-slate-500 text-center sm:text-right">
            © {new Date().getFullYear()} DataGen AI
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
