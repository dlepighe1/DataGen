// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import Navbar and Footer
import Navbar from './components/NavBar';
import Footer from './components/Footer';

// Import each page
import Home from './pages/Home';
import Generate from './pages/Generate';
import Tutorial from './pages/Tutorial';
import Extras from './pages/Extras';
import About from './pages/About';

const App = () => {
  return (
    <BrowserRouter>
      {/* Navbar */}
      <Navbar />

      {/* Page Content */}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/extras" element={<Extras />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />
    </BrowserRouter>
  );
};

export default App;
