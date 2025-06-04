import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 text-center py-4">
      <p className="text-gray-600 text-sm">
        © {new Date().getFullYear()} DataGen AI. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
