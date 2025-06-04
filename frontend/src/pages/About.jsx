import React from 'react';
import { Database, ArrowDown, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Database className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DataGen AI
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Empowering data scientists and ML practitioners with AI-generated synthetic datasets
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>Our Mission</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                DataGen AI was created to democratize access to high-quality synthetic datasets for machine learning and data science projects. 
                We believe that every practitioner, researcher, and enthusiast should have access to realistic test data without the complexity 
                of data collection, privacy concerns, or licensing restrictions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>What We Offer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-blue-600">AI-Powered Generation</h3>
                  <p className="text-gray-600 text-sm">
                    Our advanced AI algorithms understand column context and generate realistic, 
                    statistically coherent data that maintains proper relationships and distributions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-purple-600">Custom Specifications</h3>
                  <p className="text-gray-600 text-sm">
                    Define your own column requirements and let our AI adapt to generate 
                    data that fits your specific use case and domain requirements.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-green-600">Multiple Formats</h3>
                  <p className="text-gray-600 text-sm">
                    Export your generated datasets in CSV, JSON, or TXT formats, 
                    making integration with your existing tools and workflows seamless.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-orange-600">Privacy-First</h3>
                  <p className="text-gray-600 text-sm">
                    All generated data is synthetic and doesn't contain any real personal information, 
                    ensuring complete privacy compliance for your projects.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowDown className="h-5 w-5 text-blue-600" />
                <span>Perfect For</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Students & Learners</h3>
                  <p className="text-sm text-gray-600">
                    Practice data science concepts without needing real datasets
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Developers</h3>
                  <p className="text-sm text-gray-600">
                    Generate test data for application development and testing
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Researchers</h3>
                  <p className="text-sm text-gray-600">
                    Create synthetic datasets for algorithm prototyping and validation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                DataGen AI is built using modern web technologies to ensure a fast, reliable, and user-friendly experience:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Frontend</h4>
                  <ul className="text-gray-600 space-y-1">
                    <li>• React 18 with TypeScript</li>
                    <li>• Tailwind CSS for styling</li>
                    <li>• Shadcn/ui component library</li>
                    <li>• Responsive design principles</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Real-time data generation</li>
                    <li>• Multiple export formats</li>
                    <li>• Intuitive user interface</li>
                    <li>• Cross-platform compatibility</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Generate Your Data?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join the community of data professionals using AI-generated datasets for their projects
            </p>
            <a
              href="/generate"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-block"
            >
              Start Generating Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
