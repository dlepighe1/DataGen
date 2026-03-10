import React from 'react';
import { ArrowDown, Database, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';

const Extras = () => {
  const datasets = [
    {
      name: "Kaggle",
      description: "The world's largest data science community with powerful tools and resources.",
      url: "https://www.kaggle.com/datasets",
      features: ["Machine Learning datasets", "Data science competitions", "Public APIs", "Community contributions"],
      category: "General ML/Data Science"
    },
    {
      name: "UC Irvine ML Repository",
      description: "A collection of databases, domain theories, and data generators used by the machine learning community.",
      url: "https://archive.ics.uci.edu/ml/index.php",
      features: ["Academic datasets", "Well-documented", "Citation information", "Various domains"],
      category: "Academic Research"
    },
    {
      name: "Google Dataset Search",
      description: "Search for datasets stored across thousands of repositories on the web.",
      url: "https://datasetsearch.research.google.com/",
      features: ["Comprehensive search", "Multiple sources", "Metadata filtering", "Free access"],
      category: "Search Engine"
    },
    {
      name: "AWS Open Data",
      description: "Discover and share datasets that are available via AWS resources.",
      url: "https://registry.opendata.aws/",
      features: ["Cloud-hosted datasets", "High-quality data", "Easy access", "Various formats"],
      category: "Cloud Platform"
    },
    {
      name: "Hugging Face Datasets",
      description: "The largest hub of ready-to-use NLP datasets for machine learning models.",
      url: "https://huggingface.co/datasets",
      features: ["NLP focused", "Ready-to-use", "Large variety", "Model integration"],
      category: "Natural Language Processing"
    },
    {
      name: "Data.gov",
      description: "The home of the U.S. Government's open data with over 200,000 datasets.",
      url: "https://www.data.gov/",
      features: ["Government data", "High reliability", "Various topics", "Regular updates"],
      category: "Government/Public"
    }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 relative z-10 text-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Dataset Resources
          </h1>
          <p className="text-xl text-slate-400">
            Explore these popular platforms for finding existing datasets
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset, index) => (
            <Card key={index} className="glass-panel border-none shadow-none text-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-900/20">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg text-white font-semibold">{dataset.name}</CardTitle>
                  <Database className="h-5 w-5 text-sky-400" />
                </div>
                <span className="text-xs bg-sky-900/40 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full w-fit">
                  {dataset.category}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col h-[calc(100%-80px)]">
                <p className="text-slate-400 mb-6 flex-grow">{dataset.description}</p>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-sm mb-3 text-slate-300">Key Features:</h4>
                  <ul className="text-[13px] text-slate-400 space-y-2">
                    {dataset.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Search className="h-3.5 w-3.5 mr-2 text-teal-400 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={dataset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:from-sky-400 hover:to-indigo-400 transition-all duration-200 shadow-lg mt-auto w-full"
                >
                  <span>Visit Website</span>
                  <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 glass-panel rounded-2xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-sky-500/5 pointer-events-none" />
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-10 text-white relative z-10">
            When to Use External Datasets vs. DataGen AI
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-teal-400 flex items-center gap-2 pb-2 border-b border-teal-500/20">
                <Search className="h-5 w-5" />
                Use External Datasets When:
              </h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <div className="bg-teal-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Search className="h-3.5 w-3.5 text-teal-400" /></div>
                  <span className="leading-relaxed">You need real-world data with authentic patterns and distributions</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-teal-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Search className="h-3.5 w-3.5 text-teal-400" /></div>
                  <span className="leading-relaxed">Your research requires established benchmarks for comparison</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-teal-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Search className="h-3.5 w-3.5 text-teal-400" /></div>
                  <span className="leading-relaxed">You're working on domain-specific problems with existing datasets</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-teal-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Search className="h-3.5 w-3.5 text-teal-400" /></div>
                  <span className="leading-relaxed">Large-scale datasets are required for deep learning models</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-sky-400 flex items-center gap-2 pb-2 border-b border-sky-500/20">
                <Database className="h-5 w-5" />
                Use DataGen AI When:
              </h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <div className="bg-sky-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Database className="h-3.5 w-3.5 text-sky-400" /></div>
                  <span className="leading-relaxed">You need custom datasets with specific column requirements</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-sky-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Database className="h-3.5 w-3.5 text-sky-400" /></div>
                  <span className="leading-relaxed">Privacy concerns prevent using real user data</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-sky-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Database className="h-3.5 w-3.5 text-sky-400" /></div>
                  <span className="leading-relaxed">You're prototyping and need quick test data generation</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-sky-500/20 p-1 rounded mt-0.5 mr-3 shrink-0"><Database className="h-3.5 w-3.5 text-sky-400" /></div>
                  <span className="leading-relaxed">Educational purposes and learning data science concepts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Extras;
