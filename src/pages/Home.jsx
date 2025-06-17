import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, Database, Download, Search } from 'lucide-react';

const Home = () => {
  return (
    // Main container with gradient background
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Hero content container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Centered hero content */}
          <div className="text-center">
            {/* Main headline with gradient text */}
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
              AI-Powered Data Generation
            </h1>
            
            {/* Hero description */}
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate high-quality synthetic datasets for machine learning, testing, and research. 
              Perfect for practitioners and ML enthusiasts who need realistic data for their projects.
            </p>
            
            {/* Call-to-action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {/* Primary CTA button */}
              <Link
                to="/generate"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Start Generating Data
              </Link>
              
              {/* Secondary CTA button */}
              <Link
                to="/tutorial"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {/* Three-column feature grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Feature 1: Custom Columns */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Icon + Title row */}
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-3 text-xl font-semibold">Custom Columns</h3>
              </div>
              {/* Feature description */}
              <p className="text-gray-600">
                Define your own column specifications and let AI generate realistic data that matches your requirements.
              </p>
            </div>

            {/* Feature 2: Multiple Formats */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Icon + Title row */}
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="ml-3 text-xl font-semibold">Multiple Formats</h3>
              </div>
              {/* Feature description */}
              <p className="text-gray-600">
                Export your generated datasets in CSV, JSON, or TXT formats for seamless integration with your tools.
              </p>
            </div>

            {/* Feature 3: Quality Data */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Icon + Title row */}
              <div className="flex items-center mb-4">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Search className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-xl font-semibold">Quality Data</h3>
              </div>
              {/* Feature description */}
              <p className="text-gray-600">
                Get high-quality synthetic data that maintains statistical properties and realistic patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            {/* CTA headline */}
            <h2 className="text-3xl font-bold mb-4">Ready to Generate Your First Dataset?</h2>
            {/* CTA description */}
            <p className="text-xl mb-8 opacity-90">
              Join thousands of practitioners using AI-generated data for their projects
            </p>
            {/* Final CTA button */}
            <Link
              to="/generate"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Get Started Now</span>
              <ArrowDown className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
