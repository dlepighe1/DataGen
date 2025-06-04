import React from 'react';
import { ArrowDown, Database, Search } from 'lucide-react';
// Make sure the Card components are available at this path or adjust as needed
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto bg-background">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Dataset Resources
          </h1>
          <p className="text-xl text-gray-600">
            Explore these popular platforms for finding existing datasets
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">{dataset.name}</CardTitle>
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {dataset.category}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{dataset.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {dataset.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <Search className="h-3 w-3 mr-2 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={dataset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  <span>Visit Website</span>
                  <ArrowDown className="h-4 w-4 rotate-[-45deg]" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">When to Use External Datasets vs. DataGen AI</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-600">Use External Datasets When:</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <Search className="h-4 w-4 mr-2 text-green-500 mt-1 flex-shrink-0" />
                  You need real-world data with authentic patterns and distributions
                </li>
                <li className="flex items-start">
                  <Search className="h-4 w-4 mr-2 text-green-500 mt-1 flex-shrink-0" />
                  Your research requires established benchmarks for comparison
                </li>
                <li className="flex items-start">
                  <Search className="h-4 w-4 mr-2 text-green-500 mt-1 flex-shrink-0" />
                  You're working on domain-specific problems with existing datasets
                </li>
                <li className="flex items-start">
                  <Search className="h-4 w-4 mr-2 text-green-500 mt-1 flex-shrink-0" />
                  Large-scale datasets are required for deep learning models
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-600">Use DataGen AI When:</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <Database className="h-4 w-4 mr-2 text-blue-500 mt-1 flex-shrink-0" />
                  You need custom datasets with specific column requirements
                </li>
                <li className="flex items-start">
                  <Database className="h-4 w-4 mr-2 text-blue-500 mt-1 flex-shrink-0" />
                  Privacy concerns prevent using real user data
                </li>
                <li className="flex items-start">
                  <Database className="h-4 w-4 mr-2 text-blue-500 mt-1 flex-shrink-0" />
                  You're prototyping and need quick test data generation
                </li>
                <li className="flex items-start">
                  <Database className="h-4 w-4 mr-2 text-blue-500 mt-1 flex-shrink-0" />
                  Educational purposes and learning data science concepts
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
