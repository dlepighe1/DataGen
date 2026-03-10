import React from 'react';
import { Database, ArrowDown, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';

const About = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] p-4 relative z-10 text-slate-200">
      <div className="max-w-4xl mx-auto pb-12">
        <div className="text-center mb-12 pt-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Database className="h-12 w-12 text-sky-400" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-gradient">
              DataGen AI
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Empowering data scientists and ML practitioners with AI-generated synthetic datasets
          </p>
        </div>

        <div className="space-y-8">
          <Card className="glass-panel border-none shadow-none text-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-white">
                <Search className="h-5 w-5 text-sky-400" />
                <span>Our Mission</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-slate-300 leading-relaxed text-lg">
                DataGen AI was created to democratize access to high-quality synthetic datasets for machine learning and data science projects. 
                We believe that every practitioner, researcher, and enthusiast should have access to realistic test data without the complexity 
                of data collection, privacy concerns, or licensing restrictions.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-none text-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Database className="h-5 w-5 text-sky-400" />
                <span>What We Offer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2 text-sky-300 text-lg">AI-Powered Generation</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">
                    Our advanced AI algorithms understand column context and generate realistic, 
                    statistically coherent data that maintains proper relationships and distributions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-indigo-300 text-lg">Custom Specifications</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">
                    Define your own column requirements and let our AI adapt to generate 
                    data that fits your specific use case and domain requirements.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-teal-300 text-lg">Multiple Formats</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">
                    Export your generated datasets in CSV, JSON, or TXT formats, 
                    making integration with your existing tools and workflows seamless.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-purple-300 text-lg">Privacy-First</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">
                    All generated data is synthetic and doesn't contain any real personal information, 
                    ensuring complete privacy compliance for your projects.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-none text-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <ArrowDown className="h-5 w-5 text-sky-400" />
                <span>Perfect For</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-slate-800/40 border border-sky-900/30 rounded-xl hover:-translate-y-1 transition-transform">
                  <h3 className="font-semibold mb-2 text-white">Students & Learners</h3>
                  <p className="text-sm text-slate-400">
                    Practice data science concepts without needing real datasets
                  </p>
                </div>
                <div className="text-center p-6 bg-slate-800/40 border border-sky-900/30 rounded-xl hover:-translate-y-1 transition-transform">
                  <h3 className="font-semibold mb-2 text-white">Developers</h3>
                  <p className="text-sm text-slate-400">
                    Generate test data for application development and testing
                  </p>
                </div>
                <div className="text-center p-6 bg-slate-800/40 border border-sky-900/30 rounded-xl hover:-translate-y-1 transition-transform">
                  <h3 className="font-semibold mb-2 text-white">Researchers</h3>
                  <p className="text-sm text-slate-400">
                    Create synthetic datasets for algorithm prototyping and validation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-none shadow-none text-slate-200">
            <CardHeader>
              <CardTitle className="text-white">Technology Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-6 text-[15px]">
                DataGen AI is built using modern web technologies to ensure a fast, reliable, and user-friendly experience:
              </p>
              <div className="grid md:grid-cols-2 gap-6 text-[15px]">
                <div>
                  <h4 className="font-semibold mb-3 text-sky-300">Frontend</h4>
                  <ul className="text-slate-400 space-y-2">
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2"></div>React 18 with TypeScript</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2"></div>Tailwind CSS for styling</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2"></div>Shadcn/ui component library</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2"></div>Responsive design principles</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-indigo-300">Features</h4>
                  <ul className="text-slate-400 space-y-2">
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></div>Real-time data generation</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></div>Multiple export formats</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></div>Intuitive user interface</li>
                    <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></div>Cross-platform compatibility</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="glass-panel text-slate-200 rounded-2xl p-8 lg:p-12 text-center relative overflow-hidden mt-12">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent pointer-events-none" />
            <h2 className="text-3xl font-bold mb-4 text-white relative z-10">Ready to Generate Your Data?</h2>
            <p className="text-lg mb-8 text-sky-100 max-w-2xl mx-auto relative z-10">
              Join the community of data professionals using AI-generated datasets for their projects
            </p>
            <a
              href="/generate"
              className="inline-flex items-center justify-center relative z-10 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              }}
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
