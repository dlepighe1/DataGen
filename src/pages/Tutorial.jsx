import React from 'react';
import {
  Wand2, Sparkles, Brain, Settings, Hash, Dice5, Sliders,
  Type, Binary, Calendar, Mail, ToggleLeft, ClipboardCheck, Download,
  Lightbulb, ArrowRight,
} from 'lucide-react';

/* ───────────────────────── building blocks ───────────────────────── */

function SectionCard({ icon: Icon, badge, title, subtitle, children }) {
  return (
    <section data-animate className="glass-panel p-5 sm:p-7">
      <div className="flex items-start gap-3 sm:gap-4 mb-5">
        <div
          className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', boxShadow: '0 0 16px rgba(14,165,233,0.35)' }}
        >
          {Icon && <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
        </div>
        <div className="min-w-0">
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80">{badge}</span>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* A parameter explainer: what it is + how to set it for a result */
function Param({ icon: Icon, name, what, tip }) {
  return (
    <div
      className="rounded-xl p-4 h-full"
      style={{ background: 'rgba(15,23,52,0.6)', border: '1px solid rgba(56,189,248,0.14)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="h-4 w-4 text-sky-400 shrink-0" />}
        <h4 className="text-sm font-semibold text-slate-100">{name}</h4>
      </div>
      <p className="text-[13px] text-slate-400 leading-relaxed">{what}</p>
      {tip && (
        <p className="text-[13px] text-sky-300/90 leading-relaxed mt-2 flex gap-1.5">
          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{tip}</span>
        </p>
      )}
    </div>
  );
}

/* "Want this result? Do this." recipe row */
function Recipe({ goal, how }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2.5 border-b border-slate-700/40 last:border-0">
      <span className="text-sm font-semibold text-slate-200 sm:w-1/3 shrink-0">{goal}</span>
      <span className="text-[13px] text-slate-400 leading-relaxed">{how}</span>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

const Tutorial = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] py-8 sm:py-12 px-4 relative z-10 text-slate-200">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div data-animate className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-3 tracking-tight">
            How to Use DataGen
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Three ways to build a dataset and exactly which knobs to turn for the result you want.
          </p>
        </div>

        {/* Three modes at a glance */}
        <div data-animate className="grid sm:grid-cols-3 gap-4 mb-10 sm:mb-14">
          {[
            { icon: Settings, title: 'Manual Setup', desc: 'Build a schema column by column with full control over types and noise.', accent: '#38bdf8' },
            { icon: Wand2, title: 'Templates', desc: 'Load a ready-made schema (e-commerce, healthcare…) and tweak it.', accent: '#a78bfa' },
            { icon: Brain, title: 'NLP Tasks', desc: 'Generate labelled text datasets for classification, retrieval, QA, pairs.', accent: '#34d399' },
          ].map((m) => (
            <div key={m.title} className="glass-panel p-5 text-center">
              <div
                className="mx-auto mb-3 w-11 h-11 rounded-xl flex items-center justify-center border"
                style={{ background: `${m.accent}1A`, borderColor: `${m.accent}40` }}
              >
                <m.icon className="h-5 w-5" style={{ color: m.accent }} />
              </div>
              <h3 className="font-semibold text-slate-100 mb-1">{m.title}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8 sm:space-y-10">

          {/* ── 1. Manual Setup ── */}
          <SectionCard
            icon={Settings}
            badge="Mode 1"
            title="Manual Setup"
            subtitle="In the Dataset Configuration card, open the Manual Setup tab. Type a column name (or several, comma-separated) and press the + button. Each column then gets its own settings card."
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Data Types</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <Param icon={Type} name="Text" what="Free-form words generated by the AI engine (names, categories, descriptions). Steered by your Custom Instructions." />
              <Param icon={Mail} name="Email" what="Valid-looking addresses kept consistent with the person's name in the same row." />
              <Param icon={Binary} name="Number" what="Numeric values sampled within a range you set. Unlocks Number Type, Min/Max, Noise and Outliers." />
              <Param icon={Calendar} name="Date" what="ISO dates within the last ~2 years (mixed formats when Distorted)." />
              <Param icon={ToggleLeft} name="Boolean" what="True/false values, evenly split (dirtied to yes/no/1/0 when Distorted)." />
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Per-Column Parameters</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Param
                name="Number Type"
                what="Integers, Decimals, or Mixed."
                tip="Use Integers for counts/ages, Decimals for prices/rates, Mixed to stress-test type handling."
              />
              <Param
                name="Min / Max Value"
                what="The range a numeric column is drawn from. Values cluster near the middle (a bell curve), tapering toward the edges."
                tip="Set a tight range for realistic values; a wide one for sparse, spread-out data."
              />
              <Param
                name="Missing Values (%)"
                what="The exact share of cells left blank (null)."
                tip="Set 10-20% to practise imputation; the engine guarantees the precise count, not an approximation."
              />
              <Param
                name="Add Noise / Noise Level"
                what="Adds Gaussian jitter scaled to the column's range, so values wobble around their true value."
                tip="Turn on with ~5-10% to simulate sensor error or measurement noise."
              />
              <Param
                name="Add Outliers / Outlier (%)"
                what="Injects an exact number of extreme values that fall outside the Min/Max range."
                tip="Set 3-5% to test outlier detection or robust scaling in your pipeline."
              />
            </div>
          </SectionCard>

          {/* ── 2. Templates ── */}
          <SectionCard
            icon={Wand2}
            badge="Mode 2"
            title="Templates"
            subtitle="Load a ready-made schema and tweak it"
          />

          {/* ── 3. NLP Tasks ── */}
          <SectionCard
            icon={Brain}
            badge="Mode 3"
            title="NLP Tasks"
            subtitle="Open the NLP Tasks tab and pick a task. The AI writes a pool of unique examples for your domain; the statistical engine then enforces balance, ratios, and label noise exactly."
          >
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <Param
                name="Text Classification"
                what="Short texts each tagged with a class. You define the Class Labels (2-6 of them)."
                tip="Balanced mode splits classes exactly evenly; Distorted skews them and flips ~5% of labels (label noise)."
              />
              <Param
                name="Search & Retrieval"
                what="Query-passage pairs marked relevant or not, for ranking and semantic-search models."
                tip="Use the Negative Examples slider to set the share of non-matching (hard-negative) pairs."
              />
              <Param
                name="Question Answering"
                what="Context passages with a question and an extractive answer guaranteed to appear in the context."
                tip="Great for fine-tuning or evaluating extractive QA without licensing a real corpus."
              />
              <Param
                name="Paraphrase Pairs"
                what="Sentence pairs labelled paraphrase / not-paraphrase, for similarity and embedding models."
                tip="The Negative Examples slider controls how many pairs are non-paraphrases."
              />
            </div>
            <div
              className="flex items-start gap-2.5 rounded-lg p-3.5 text-[13px] leading-relaxed"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-slate-300">
                Set the <strong className="text-indigo-300">domain</strong> in Custom Instructions
                (e.g. "medical research abstracts" or "e-commerce product reviews"). That single field
                is what tailors every generated example to your use case.
              </span>
            </div>
          </SectionCard>

          {/* ── 4. Shared settings ── */}
          <SectionCard
            icon={Sliders}
            badge="Applies to every mode"
            title="Global Settings"
            subtitle="These four controls sit below the tabs and shape every generation."
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <Param icon={Hash} name="Number of Rows" what="How many rows to generate, from 1 to 10,000." tip="Use the ▲▼ steppers (±100) for quick sizing, or type an exact count." />
              <Param icon={Dice5} name="Seed (optional)" what="Locks randomness so the same schema + seed reproduce the identical dataset." tip="Leave blank for fresh data; share a seed so a teammate regenerates yours exactly." />
              <Param icon={Sliders} name="Distribution Type" what="Balanced = clean, tidy data. Distorted = injected nulls, noise, dirty text/dates and skew." tip="Pick Distorted to practise cleaning or to stress-test a model's robustness." />
              <Param icon={Brain} name="Custom Instructions" what="Free text passed to the AI engine to steer the semantic content of text columns/examples." tip='Be specific: "all customers are from Chicago", "products are vintage vinyl records".' />
            </div>
          </SectionCard>

          {/* ── 5. Generate, inspect, export ── */}
          <SectionCard
            icon={ClipboardCheck}
            badge="Final step"
            title="Generate, Inspect & Export"
            subtitle="Click Generate Data. Results stream into the preview on the right."
          >
            <div className="grid sm:grid-cols-3 gap-3">
              <Param name="Preview" what="A paginated table of the result. Nulls are flagged; wide tables scroll horizontally." />
              <Param
                icon={ClipboardCheck}
                name="Data Quality Report"
                what="Expand it to verify requested-vs-actual missing %, ranges, outliers, class balance, the seed, and which engine/model ran."
                tip="This is your audit trail: proof the parameters were honoured exactly."
              />
              <Param icon={Download} name="Export" what="Download as CSV (spreadsheets/pandas), JSON (apps), or TXT (quick review)." />
            </div>
          </SectionCard>

          {/* ── Recipes ── */}
          <SectionCard icon={Lightbulb} badge="Cheat sheet" title="Recipes: Want X? Do Y">
            <div>
              <Recipe goal="Clean training data" how="Templates or Manual, Balanced distribution, 0% missing, noise/outliers off." />
              <Recipe goal="Data-cleaning practice" how="Distorted distribution, or set Missing 10-20% and enable Noise/Outliers per column." />
              <Recipe goal="Reproducible dataset" how="Set a Seed and keep the same schema, and anyone with both regenerates it byte-for-byte." />
              <Recipe goal="Balanced classifier set" how="NLP → Text Classification, your labels, Balanced mode for exact even classes." />
              <Recipe goal="Hard negatives for retrieval" how="NLP → Search & Retrieval, raise the Negative Examples slider (e.g. 60-70%)." />
              <Recipe goal="Domain-specific text" how="Write the domain in Custom Instructions; it steers names, categories and examples." />
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
};

export default Tutorial;
