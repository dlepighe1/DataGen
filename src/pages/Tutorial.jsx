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
    <div className="min-h-[calc(100vh-64px)] p-4 relative z-10 text-slate-200">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            How to Use DataGen AI
          </h1>
          <p className="text-xl text-slate-400">
            Follow these quick steps to craft realistic, custom datasets
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <Card key={index} className="glass-panel border-none shadow-none text-slate-200 transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-5">
                  {/* Number badge */}
                  <div className="shrink-0 rounded-full flex items-center justify-center font-bold text-lg w-12 h-12 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: 'white' }}>
                    {index + 1}
                  </div>
                  {/* Title & icon */}
                  <div className="flex items-center space-x-3 text-white">
                    <step.icon className="h-6 w-6 text-sky-400" />
                    <span className="text-xl">{step.title}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-[5.25rem]">
                <p className="text-slate-300 mb-2 text-[17px] leading-relaxed">{step.description}</p>
                <p className="text-slate-500 text-[15px]">{step.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pro Tips */}
        <div className="mt-12 glass-panel rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 pointer-events-none" />
          
          <h2 className="text-2xl font-bold mb-8 text-white relative z-10 flex items-center justify-center gap-2">
            <Wand2 className="h-6 w-6 text-sky-400" /> Pro Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left relative z-10">
            {/* Tip 1 */}
            <div>
              <h3 className="font-semibold mb-2 text-sky-300 text-lg">Template Quick‑Start</h3>
              <p className="text-[15px] text-slate-400 leading-relaxed max-w-sm">
                Not sure where to begin? Load a template and tweak it instead of building a schema from scratch.
              </p>
            </div>
            {/* Tip 2 */}
            <div>
              <h3 className="font-semibold mb-2 text-indigo-300 text-lg">Column Fine‑Tuning</h3>
              <p className="text-[15px] text-slate-400 leading-relaxed max-w-sm">
                Use sliders to inject missing values, noise or outliers — perfect for testing data‑cleaning pipelines.
              </p>
            </div>
            {/* Tip 3 */}
            <div>
              <h3 className="font-semibold mb-2 text-purple-300 text-lg">Row Limits</h3>
              <p className="text-[15px] text-slate-400 leading-relaxed max-w-sm">
                Generate up to 10 000 rows in one go. Need more? Run multiple batches and merge them.
              </p>
            </div>
            {/* Tip 4 */}
            <div>
              <h3 className="font-semibold mb-2 text-teal-300 text-lg">Distribution Strategy</h3>
              <p className="text-[15px] text-slate-400 leading-relaxed max-w-sm">
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
