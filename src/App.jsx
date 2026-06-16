// frontend/src/App.jsx
import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

// Import Navbar and Footer
import Navbar from './components/NavBar';
import Footer from './components/Footer';
import HexagonBackground from './components/HexagonBackground';

// Import each page
import Home from './pages/Home';
import Generate from './pages/Generate';
import Tutorial from './pages/Tutorial';
import Extras from './pages/Extras';
import About from './pages/About';

/* Smooth page transitions: each route change fades/slides the new page in */
const AnimatedRoutes = () => {
  const location = useLocation();
  const pageRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (pageRef.current) {
      // Gentle reveal: a slow soft fade with a barely-there drift, no snap
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 8, scale: 0.995 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'sine.out', clearProps: 'transform' }
      );
    }
  }, [location.pathname]);

  return (
    <div ref={pageRef} key={location.pathname} className="flex-grow">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/extras" element={<Extras />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      {/* Global Background */}
      <HexagonBackground />

      {/* Navbar */}
      <Navbar />

      {/* Page Content */}
      <AnimatedRoutes />

      {/* Footer */}
      <Footer />
    </BrowserRouter>
  );
};

export default App;
