import React from 'react';
import {
  Database,
  Wand2,
  Plus,
  Settings,
  ArrowRightCircle,
  Search,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';

const Tutorial = () => {
  // Updated tutorial steps reflecting current Generate page workflow
  const steps = [
    {
      title: 'Navigate to Generate Page',
      description: "Click on the 'Generate' item in the top‑nav to open your workspace.",
      icon: Database,
      details:
        'The Generate page is where you configure columns, tweak parameters, preview results and export datasets.'
    },
    {
      title: 'Pick Manual or Template Mode',
      description: 'Use the tabs in the Dataset Configuration card to switch between Manual Setup and Templates.',
      icon: Wand2,
      details:
        'Manual Setup lets you build a schema from scratch, whereas Templates instantly preload common schemas such as E‑commerce, Finance, Healthcare, Education, Marketing and IoT.'
    },
    {
      title: 'Load a Template (optional)',
      description: "If you chose 'Templates', pick one from the dropdown and click ‘Load Template’.",
      icon: Wand2,
      details:
        'The Columns panel will be auto‑filled. You can still edit, add or remove columns afterwards.'
    },
    {
      title: 'Add or Adjust Columns',
      description: "Type one or more column names and hit the plus icon, or edit existing columns in the 'Column Settings' panel.",
      icon: Plus,
      details:
        'For each column you can set its data type, numeric range, missing‑value percentage, noise level, outlier percentage and more.'
    },
    {
      title: 'Fine‑tune Global Settings',
      description: 'Set the number of rows, choose a distribution type (Balanced or Distorted) and add any custom instructions.',
      icon: Settings,
      details:
        'Balanced data keeps values tidy; Distorted intentionally introduces noise for data‑cleaning practice. The row counter accepts 1 – 10 000.'
    },
    {
      title: 'Generate Your Data',
      description: 'Click the “Generate Data” button and wait a few seconds while the API builds your dataset.',
      icon: ArrowRightCircle,
      details:
        'The button shows a spinner while processing. If something goes wrong you will receive an in‑app toast with diagnostic info.'
    },
    {
      title: 'Preview the Result',
      description: 'The first 20 rows appear instantly in the preview table for a quick sanity check.',
      icon: Search,
      details:
        'Nulls are shown in italics; you can scroll horizontally if a row contains many columns.'
    },
    {
      title: 'Download Your Dataset',
      description: 'Choose CSV, JSON or TXT and your file will start downloading immediately.',
      icon: Download,
      details:
        'CSV works best for spreadsheets, JSON for web/dev projects, and TXT for plain‑text review.'
    }
  ];

  return (
    // Outer container
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            How to Use DataGen AI
          </h1>
          <p className="text-xl text-gray-600">
            Follow these quick steps to craft realistic, custom datasets
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-4">
                  {/* Number badge */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  {/* Title & icon */}
                  <div className="flex items-center space-x-3">
                    <step.icon className="h-6 w-6 text-blue-600" />
                    <span>{step.title}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3 text-lg">{step.description}</p>
                <p className="text-gray-500 text-sm">{step.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pro Tips */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Pro Tips</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            {/* Tip 1 */}
            <div>
              <h3 className="font-semibold mb-2">Template Quick‑Start</h3>
              <p className="text-sm opacity-90">
                Not sure where to begin? Load a template and tweak it instead of building a schema from scratch.
              </p>
            </div>
            {/* Tip 2 */}
            <div>
              <h3 className="font-semibold mb-2">Column Fine‑Tuning</h3>
              <p className="text-sm opacity-90">
                Use sliders to inject missing values, noise or outliers — perfect for testing data‑cleaning pipelines.
              </p>
            </div>
            {/* Tip 3 */}
            <div>
              <h3 className="font-semibold mb-2">Row Limits</h3>
              <p className="text-sm opacity-90">
                Generate up to 10 000 rows in one go. Need more? Run multiple batches and merge them.
              </p>
            </div>
            {/* Tip 4 */}
            <div>
              <h3 className="font-semibold mb-2">Distribution Strategy</h3>
              <p className="text-sm opacity-90">
                Switch to ‘Distorted’ to simulate dirty, real‑world data and stress‑test your ML workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
