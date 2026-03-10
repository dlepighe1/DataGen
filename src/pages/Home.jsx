import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Download, Search, Sparkles, Cpu, BarChart2 } from 'lucide-react';

/* ── Feature card ────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, accent }) {
  return (
    <div
      className="glass-panel group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Accent glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 70%)` }}
      />
      <div
        className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl border"
        style={{ background: `${accent}1A`, borderColor: `${accent}40` }}
      >
        <Icon className="h-6 w-6" style={{ color: accent }} />
      </div>
      <h3 className="text-xl font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-[15px] leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
const Home = () => {
  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(99,179,237,0.35)',
              color: '#93c5fd',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Gemini AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-gradient">
            AI-Powered<br />Data Generation
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-slate-400 leading-relaxed">
            Generate high-quality synthetic datasets for machine learning,
            testing, and research — in seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                boxShadow: '0 0 24px rgba(99,102,241,0.25)',
              }}
            >
              Start Generating
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/tutorial"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-1 text-sky-200 glass-panel"
            >
              Learn How It Works
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="max-w-4xl mx-auto px-4 mb-20">
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden shadow-2xl glass-panel">
            {[
              { value: '7+', label: 'Dataset Templates' },
              { value: '10K', label: 'Max Rows / Gen' },
              { value: '3', label: 'Export Formats' },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center py-6 px-4"
                style={{ background: 'rgba(15, 23, 42, 0.4)' }}
              >
                <div className="text-3xl font-bold mb-1 text-gradient">
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Database}
              title="Custom Columns"
              desc="Define your own schema: text, numbers, dates, booleans, emails — then let AI do the rest."
              accent="#60a5fa"
            />
            <FeatureCard
              icon={Cpu}
              title="Advanced Controls"
              desc="Fine-tune noise levels, outlier percentages, missing values, and distribution for realistic dirty data."
              accent="#a78bfa"
            />
            <FeatureCard
              icon={BarChart2}
              title="Export Anywhere"
              desc="Download your generated dataset as CSV, JSON, or plain text — ready for any workflow."
              accent="#34d399"
            />
          </div>
        </div>

        {/* CTA banner */}
        <div className="mx-4 md:mx-auto max-w-4xl mb-24 rounded-3xl px-8 py-14 text-center glass-panel">
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to Build Your First Dataset?
          </h2>
          <p className="mb-8 text-sky-100">
            Join practitioners using AI-generated synthetic data for real projects.
          </p>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            }}
          >
            Get Started Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
