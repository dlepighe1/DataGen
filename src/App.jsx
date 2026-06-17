// frontend/src/App.jsx
import React, { useLayoutEffect, useRef } from 'react';
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

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
    if (pageRef.current) {
      // Smooth, gentle fadeInUp with a subtle bounce (back.out overshoot)
      const items = pageRef.current.querySelectorAll('[data-animate]');
      const targets = items.length ? items : [pageRef.current];
      gsap.fromTo(
        targets,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 0.55,
          ease: 'back.out(1.4)',
          stagger: items.length ? 0.08 : 0,
          clearProps: 'transform',
        }
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

      {/* App shell: column layout so the footer anchors to the bottom */}
      <div className="flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <AnimatedRoutes />

        {/* Footer */}
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
