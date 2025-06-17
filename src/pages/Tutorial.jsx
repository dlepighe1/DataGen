import React from 'react';
import { Database, Download, Search, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';

const Tutorial = () => {
  // Define tutorial steps with their content
  const steps = [
    {
      title: "Navigate to Generate Page",
      description: "Click on the 'Generate' tab in the navigation menu to access the data generation interface.",
      icon: Database,
      details: "The Generate page is your main workspace where you'll configure and create your datasets."
    },
    {
      title: "Add Your Columns",
      description: "Define the columns you want in your dataset by typing column names and clicking 'Add'.",
      icon: Search,
      details: "Common column types include: Name, Age, Email, City, Salary, Phone, Address, etc. The AI will generate appropriate data for each column type."
    },
    {
      title: "Generate Your Data",
      description: "Click the 'Generate Data' button to create synthetic data based on your column specifications.",
      icon: ArrowDown,
      details: "Our AI analyzes your column names and generates realistic, contextually appropriate data that maintains statistical coherence."
    },
    {
      title: "Download Your Dataset",
      description: "Choose your preferred format (CSV, JSON, or TXT) and download your generated dataset.",
      icon: Download,
      details: "CSV is perfect for spreadsheet applications, JSON for web applications, and TXT for simple text processing."
    }
  ];

  return (
    // Main container with gradient background
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      {/* Content container */}
      <div className="max-w-4xl mx-auto">
        
        {/* Page header */}
        <div className="text-center mb-12">
          {/* Page title with gradient text */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            How to Use DataGen AI
          </h1>
          {/* Page description */}
          <p className="text-xl text-gray-600">
            Follow these simple steps to generate high-quality synthetic datasets
          </p>
        </div>

        {/* Tutorial steps container */}
        <div className="space-y-8">
          {/* Map through each tutorial step */}
          {steps.map((step, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-4">
                  {/* Step number badge */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  {/* Step title with icon */}
                  <div className="flex items-center space-x-3">
                    <step.icon className="h-6 w-6 text-blue-600" />
                    <span>{step.title}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Step description */}
                <p className="text-gray-600 mb-3 text-lg">{step.description}</p>
                {/* Step details */}
                <p className="text-gray-500 text-sm">{step.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pro Tips section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center">
          {/* Pro Tips header */}
          <h2 className="text-2xl font-bold mb-4">Pro Tips</h2>
          
          {/* Tips grid */}
          <div className="grid md:grid-cols-2 gap-6 text-left">
            
            {/* Tip 1: Column Naming */}
            <div>
              <h3 className="font-semibold mb-2">Column Naming</h3>
              <p className="text-sm opacity-90">
                Use descriptive column names like "First Name", "Email Address", or "Annual Salary" for better AI understanding.
              </p>
            </div>
            
            {/* Tip 2: Data Quality */}
            <div>
              <h3 className="font-semibold mb-2">Data Quality</h3>
              <p className="text-sm opacity-90">
                The AI generates contextually appropriate data - "Age" will produce realistic age ranges, "Email" will create valid email formats.
              </p>
            </div>
            
            {/* Tip 3: Format Selection */}
            <div>
              <h3 className="font-semibold mb-2">Format Selection</h3>
              <p className="text-sm opacity-90">
                Choose CSV for Excel/Google Sheets, JSON for programming projects, and TXT for simple data processing.
              </p>
            </div>
            
            {/* Tip 4: Dataset Size */}
            <div>
              <h3 className="font-semibold mb-2">Dataset Size</h3>
              <p className="text-sm opacity-90">
                Each generation creates 10 rows by default. For larger datasets, simply generate multiple times and combine the results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
