import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  Download, FileText, Database, Settings, Wand2, Plus, Trash2, AlertTriangle,
  WifiOff, ServerCrash, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ClipboardCheck, Timer, Braces, Brain, Hash,
  Cpu, CheckCircle2, Layers,
} from 'lucide-react';
import { Input } from '../components/UI/Input';
import { NumberStepper } from '../components/UI/NumberStepper';
import { Slider } from '../components/UI/Slider';
import { Switch } from '../components/UI/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/UI/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/UI/Dropdown-menu';
import { toast } from '../components/Use-toast';

const MAX_ROWS = 10000;
const PAGE_SIZE = 10;

/* ── Small helper: section label ── */
function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2 mt-0.5">
      {children}
    </p>
  );
}

/* ── CSV-safe value: quote fields containing commas, quotes or newlines ── */
function escapeCsvValue(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ════════ Quality Report building blocks ════════ */

const LABEL_PALETTE = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fbbf24', '#34d399'];

const TYPE_CHIP_STYLES = {
  number:  { color: '#7dd3fc', background: 'rgba(14,165,233,0.14)',  border: '1px solid rgba(56,189,248,0.3)' },
  string:  { color: '#a5b4fc', background: 'rgba(99,102,241,0.14)',  border: '1px solid rgba(99,102,241,0.3)' },
  text:    { color: '#a5b4fc', background: 'rgba(99,102,241,0.14)',  border: '1px solid rgba(99,102,241,0.3)' },
  date:    { color: '#d8b4fe', background: 'rgba(168,85,247,0.14)',  border: '1px solid rgba(168,85,247,0.3)' },
  boolean: { color: '#6ee7b7', background: 'rgba(52,211,153,0.14)',  border: '1px solid rgba(52,211,153,0.3)' },
  email:   { color: '#f9a8d4', background: 'rgba(244,114,182,0.14)', border: '1px solid rgba(244,114,182,0.3)' },
  label:   { color: '#fcd34d', background: 'rgba(251,191,36,0.14)',  border: '1px solid rgba(251,191,36,0.3)' },
};

function MetaChip({ icon, label, value, accent = '#7dd3fc' }) {
  const Icon = icon;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ background: 'rgba(15,23,52,0.7)', border: '1px solid rgba(56,189,248,0.16)' }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold" style={{ color: accent }}>{value}</span>
    </div>
  );
}

function LabelDistributionBar({ distribution }) {
  const entries = Object.entries(distribution);
  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
  return (
    <div className="space-y-2.5">
      <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,52,0.8)' }}>
        {entries.map(([label, count], i) => (
          <div
            key={label}
            title={`${label}: ${count}`}
            style={{
              width: `${(count / total) * 100}%`,
              background: `linear-gradient(180deg, ${LABEL_PALETTE[i % LABEL_PALETTE.length]}, ${LABEL_PALETTE[i % LABEL_PALETTE.length]}99)`,
              boxShadow: `0 0 10px ${LABEL_PALETTE[i % LABEL_PALETTE.length]}40`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([label, count], i) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: LABEL_PALETTE[i % LABEL_PALETTE.length] }} />
            <span className="text-slate-300 font-medium">{label}</span>
            <span className="text-slate-500">{count.toLocaleString()} ({Math.round((count / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReportColumnCard({ col }) {
  const chipStyle = TYPE_CHIP_STYLES[col.type] || TYPE_CHIP_STYLES.string;
  const missingMatches = col.requested_missing_pct != null
    && col.actual_missing_pct === col.requested_missing_pct;
  return (
    <div
      className="rounded-xl p-3.5 space-y-2.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(160deg, rgba(15,23,52,0.85), rgba(10,16,38,0.75))',
        border: '1px solid rgba(56,189,248,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100 truncate">{col.name}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={chipStyle}>
          {col.type}
        </span>
      </div>

      {col.requested_missing_pct != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Missing values</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">{col.requested_missing_pct}%</span>
              <span className="text-slate-600">→</span>
              <span className={missingMatches ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {col.actual_missing_pct}%
              </span>
              {missingMatches && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,72,0.9)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(col.actual_missing_pct * 2, 100)}%`,
                background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                boxShadow: '0 0 8px rgba(14,165,233,0.5)',
              }}
            />
          </div>
        </div>
      )}

      {col.requested_range && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Range</span>
          <span className="text-slate-300">
            [{col.requested_range[0]}, {col.requested_range[1]}]
            {col.actual_range && (
              <span className="text-slate-500"> → [{col.actual_range[0]}, {col.actual_range[1]}]</span>
            )}
          </span>
        </div>
      )}

      {col.avg_chars != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Avg length</span>
          <span className="text-slate-300">{col.avg_chars} chars</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <span
          className="text-[11px] px-2 py-0.5 rounded-md"
          style={{ background: 'rgba(56,189,248,0.1)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.2)' }}
        >
          {col.unique_values?.toLocaleString()} unique
        </span>
        {col.outliers_injected > 0 && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(168,85,247,0.12)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.25)' }}
          >
            {col.outliers_injected} outliers
          </span>
        )}
        {col.mean != null && (
          <span className="text-[11px] text-slate-500 ml-auto">μ {col.mean} · σ {col.std}</span>
        )}
      </div>
    </div>
  );
}

const Generate = () => {
  const [columns, setColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [rowCount, setRowCount] = useState(100);
  const [seed, setSeed] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedData, setGeneratedData] = useState([]);
  const [resultColumns, setResultColumns] = useState([]);
  const [nlpTask, setNlpTask] = useState('retrieval');
  const [nlpLabels, setNlpLabels] = useState('positive, negative, neutral');
  const [negativeRatio, setNegativeRatio] = useState(50);
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [page, setPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null); // { type, title, message }
  const [activeTab, setActiveTab] = useState('manual');
  const [distributionType, setDistributionType] = useState('balanced');

  const tableRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!isGenerating && generatedData.length && tableRef.current) {
      gsap.fromTo(tableRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }, [isGenerating, generatedData]);

  const datasetTemplates = [
    { value: 'ecommerce',   label: 'E-commerce Data',         description: 'Orders, products, and customer behavior' },
    { value: 'healthcare',  label: 'Healthcare Records',       description: 'Patient visits, vitals, and treatment plans' },
    { value: 'financial',   label: 'Financial Transactions',   description: 'Bank activity, merchants, and fraud flags' },
    { value: 'school',      label: 'Student Performance',      description: 'Grades, attendance, and course records' },
    { value: 'sports',      label: 'Athlete Stats',            description: 'Match performance, cards, goals, and injuries' },
    { value: 'videogames',  label: 'Game Analytics',           description: 'Session metrics, levels, purchases, and rewards' },
    { value: 'marketing',   label: 'Marketing Analytics',      description: 'Campaign performance, user engagement, and conversions' },
  ];

  const nlpTaskOptions = [
    { value: 'retrieval',      label: 'Search & Retrieval',   description: 'Query and passage pairs with relevance labels for semantic search and ranking models' },
    { value: 'classification', label: 'Text Classification',  description: 'Short texts with class labels such as sentiment, intent, spam, or your own classes' },
    { value: 'qa',             label: 'Question Answering',   description: 'Context passages with questions and extractive answers' },
    { value: 'pairs',          label: 'Paraphrase Pairs',     description: 'Sentence pairs labeled as paraphrase or not, for similarity and embedding models' },
  ];

  const addColumn = () => {
    const names = newColumnName.split(',').map(n => n.trim()).filter(n => n.length > 0);
    const unique = names.filter((n, i, self) => self.indexOf(n) === i);
    const newCols = unique
      .filter(n => !columns.find(c => c.name === n))
      .map(n => ({ name: n, type: 'string', nanPercentage: 0, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0, numberType: 'integers' }));
    if (newCols.length) { setColumns([...columns, ...newCols]); setNewColumnName(''); }
  };

  const removeColumn = idx => setColumns(columns.filter((_, i) => i !== idx));
  const updateColumn = (idx, updates) => {
    const copy = [...columns];
    copy[idx] = { ...copy[idx], ...updates };
    setColumns(copy);
  };

  const generateFromTemplate = () => {
    const templates = {
      ecommerce: [
        { name: 'OrderID',        type: 'string' },
        { name: 'CustomerID',     type: 'string' },
        { name: 'CustomerName',   type: 'string' },
        { name: 'Email',          type: 'email' },
        { name: 'OrderDate',      type: 'date' },
        { name: 'ProductID',      type: 'string' },
        { name: 'ProductName',    type: 'string' },
        { name: 'Category',       type: 'string' },
        { name: 'Quantity',       type: 'number', numberType: 'integers', minValue: 1,  maxValue: 5    },
        { name: 'UnitPrice',      type: 'number', numberType: 'decimals', minValue: 5,  maxValue: 500  },
        { name: 'TotalAmount',    type: 'number', numberType: 'decimals', minValue: 10, maxValue: 2500 },
        { name: 'PaymentMethod',  type: 'string' },
        { name: 'DeliveryStatus', type: 'string' },
        { name: 'IsFirstPurchase', type: 'boolean' },
      ],
      financial: [
        { name: 'TransactionID',          type: 'string' },
        { name: 'AccountID',              type: 'string' },
        { name: 'AccountType',            type: 'string' },
        { name: 'TransactionDate',        type: 'date' },
        { name: 'Amount',                 type: 'number', numberType: 'decimals', minValue: -10000, maxValue: 10000  },
        { name: 'Currency',               type: 'string' },
        { name: 'MerchantName',           type: 'string' },
        { name: 'Category',               type: 'string' },
        { name: 'BalanceAfterTransaction',type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100000 },
        { name: 'IsInternational',        type: 'boolean' },
        { name: 'IsFraudulent',           type: 'boolean' },
      ],
      healthcare: [
        { name: 'PatientID',        type: 'string' },
        { name: 'FullName',         type: 'string' },
        { name: 'Age',              type: 'number', numberType: 'integers', minValue: 0, maxValue: 100 },
        { name: 'Gender',           type: 'string' },
        { name: 'VisitDate',        type: 'date' },
        { name: 'Diagnosis',        type: 'string' },
        { name: 'TreatmentPlan',    type: 'string' },
        { name: 'Medication',       type: 'string' },
        { name: 'BloodPressure',    type: 'string' },
        { name: 'HeartRate',        type: 'number', numberType: 'integers', minValue: 50, maxValue: 180 },
        { name: 'CholesterolLevel', type: 'number', numberType: 'decimals', minValue: 3.0, maxValue: 7.0 },
        { name: 'FollowUpRequired', type: 'boolean' },
      ],
      school: [
        { name: 'StudentID',         type: 'string' },
        { name: 'FullName',          type: 'string' },
        { name: 'GradeLevel',        type: 'number', numberType: 'integers', minValue: 1,  maxValue: 12  },
        { name: 'Gender',            type: 'string' },
        { name: 'EnrollmentDate',    type: 'date' },
        { name: 'CourseName',        type: 'string' },
        { name: 'AssignmentScore',   type: 'number', numberType: 'decimals', minValue: 0,  maxValue: 100 },
        { name: 'ExamScore',         type: 'number', numberType: 'decimals', minValue: 0,  maxValue: 100 },
        { name: 'FinalGrade',        type: 'string' },
        { name: 'AttendanceRate',    type: 'number', numberType: 'decimals', minValue: 50, maxValue: 100 },
        { name: 'ScholarshipRecipient', type: 'boolean' },
      ],
      marketing: [
        { name: 'UserID',      type: 'string' },
        { name: 'CampaignID',  type: 'string' },
        { name: 'Impressions', type: 'number', numberType: 'integers', minValue: 100, maxValue: 10000 },
        { name: 'Clicks',      type: 'number', numberType: 'integers', minValue: 1,   maxValue: 500   },
        { name: 'Conversions', type: 'number', numberType: 'integers', minValue: 0,   maxValue: 50    },
        { name: 'AdSpend',     type: 'number', numberType: 'decimals', minValue: 5,   maxValue: 500   },
        { name: 'Date',        type: 'date' },
      ],
      sports: [
        { name: 'PlayerID',       type: 'string' },
        { name: 'FullName',       type: 'string' },
        { name: 'TeamName',       type: 'string' },
        { name: 'Sport',          type: 'string' },
        { name: 'MatchDate',      type: 'date' },
        { name: 'Position',       type: 'string' },
        { name: 'MinutesPlayed',  type: 'number', numberType: 'integers', minValue: 0, maxValue: 120 },
        { name: 'GoalsScored',    type: 'number', numberType: 'integers', minValue: 0, maxValue: 5   },
        { name: 'Assists',        type: 'number', numberType: 'integers', minValue: 0, maxValue: 5   },
        { name: 'YellowCards',    type: 'number', numberType: 'integers', minValue: 0, maxValue: 2   },
        { name: 'RedCard',        type: 'boolean' },
        { name: 'Injury',         type: 'boolean' },
      ],
      videogames: [
        { name: 'PlayerID',                 type: 'string' },
        { name: 'Username',                 type: 'string' },
        { name: 'GameTitle',                type: 'string' },
        { name: 'SessionStart',             type: 'date' },
        { name: 'SessionEnd',               type: 'date' },
        { name: 'SessionDurationMinutes',   type: 'number', numberType: 'integers', minValue: 5,    maxValue: 300  },
        { name: 'LevelAchieved',            type: 'number', numberType: 'integers', minValue: 1,    maxValue: 100  },
        { name: 'InGameCurrencyEarned',     type: 'number', numberType: 'decimals', minValue: 0,    maxValue: 5000 },
        { name: 'ItemsPurchased',           type: 'number', numberType: 'integers', minValue: 0,    maxValue: 50   },
        { name: 'UsedMicrotransactions',    type: 'boolean' },
        { name: 'IsPremiumUser',            type: 'boolean' },
      ],
    };
    if (selectedTemplate && templates[selectedTemplate]) {
      setColumns(templates[selectedTemplate]);
      toast({ title: 'Template Loaded', description: `Loaded ${templates[selectedTemplate].length} columns.` });
    }
  };

  const isNlpMode = activeTab === 'nlp';

  const generateData = async () => {
    if (!isNlpMode && !columns.length) {
      toast({ title: 'No columns defined', description: 'Add at least one column first.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);

    // Client-side timeout: abort after 2 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    const clampedRows = Math.min(Math.max(1, rowCount || 1), MAX_ROWS);
    const endpoint = isNlpMode ? '/api/nlp/generate' : '/api/generate';
    const configPayload = isNlpMode
      ? {
          task: nlpTask,
          rowCount: clampedRows,
          seed: seed === '' ? null : Number(seed),
          distributionType,
          customInstructions,
          labels: nlpLabels,
          negativeRatio: negativeRatio / 100,
        }
      : {
          rowCount: clampedRows,
          seed: seed === '' ? null : Number(seed),
          distributionType,
          customInstructions,
          template: selectedTemplate,
          columns,
        };

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      let resp;
      try {
        resp = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configPayload),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        // Network-level error: can't reach the server at all
        if (fetchErr.name === 'AbortError') {
          setGenerateError({
            type: 'timeout',
            title: 'Request Timed Out',
            message: 'The request took too long (over 2 minutes). The server may be overloaded. Please try again.',
          });
        } else {
          setGenerateError({
            type: 'connection',
            title: 'Cannot Connect to Backend',
            message: `Unable to reach the DataGen server at ${API_URL}. Make sure the backend is running (python app.py) and that VITE_API_URL is set correctly.`,
          });
        }
        return;
      }

      const data = await resp.json();

      if (!resp.ok) {
        const errType = data.error_type || 'unknown';
        const errDetails = data.details || data.error || 'An unknown error occurred.';

        if (errType === 'rate_limited' || resp.status === 429) {
          setGenerateError({
            type: 'rate_limited',
            title: 'Slow Down a Little',
            message: errDetails,
          });
        } else if (errType === 'validation' || resp.status === 400) {
          setGenerateError({
            type: 'error',
            title: 'Invalid Configuration',
            message: errDetails,
          });
        } else if (errType === 'connection' || resp.status === 503) {
          setGenerateError({
            type: 'connection',
            title: 'AI Service Unreachable',
            message: errDetails,
          });
        } else if (errType === 'model_unavailable' || resp.status === 502) {
          setGenerateError({
            type: 'model',
            title: 'AI Models Unavailable',
            message: errDetails + ' This is usually temporary, so please try again in a moment.',
          });
        } else if (errType === 'config' || resp.status === 500) {
          setGenerateError({
            type: 'config',
            title: 'Server Configuration Error',
            message: errDetails,
          });
        } else {
          setGenerateError({
            type: 'error',
            title: 'Generation Failed',
            message: errDetails,
          });
        }
        return;
      }

      if (data.status === 'ok' && Array.isArray(data.table)) {
        setGeneratedData(data.table);
        setResultColumns(Object.keys(data.table[0] || {}));
        setReport(data.report || null);
        setPage(0);
        setShowReport(false);
        toast({ title: '✅ Data Generated!', description: `Loaded ${data.table.length} rows.` });
      } else {
        setGenerateError({
          type: 'error',
          title: 'Invalid Response',
          message: 'The server returned an unexpected data format. Please try again.',
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const downloadData = format => {
    if (!generatedData.length) {
      toast({ title: 'No Data to Download', description: 'Generate data first.', variant: 'destructive' });
      return;
    }
    const cols = resultColumns.length > 0 ? resultColumns : Object.keys(generatedData[0] || {});
    let content, filename, mimeType;
    switch (format) {
      case 'csv': {
        content = [
          cols.map(escapeCsvValue).join(','),
          ...generatedData.map(r => cols.map(n => escapeCsvValue(r[n])).join(',')),
        ].join('\n');
        filename = 'data.csv'; mimeType = 'text/csv'; break;
      }
      case 'json':
        content = JSON.stringify(generatedData, null, 2);
        filename = 'data.json'; mimeType = 'application/json'; break;
      case 'txt':
        content = generatedData.map(r => cols.map(n => `${n}: ${r[n] ?? 'N/A'}`).join(' | ')).join('\n');
        filename = 'data.txt'; mimeType = 'text/plain'; break;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Download Started', description: filename });
  };

  /* derive column list for table rendering from the generated result */
  const tableCols = (resultColumns.length > 0
    ? resultColumns
    : Object.keys(generatedData[0] || {})
  ).map(name => ({ name }));

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(generatedData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = generatedData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const pagerButtonClass = enabled => [
    'p-1.5 rounded-lg transition-all duration-150',
    enabled
      ? 'text-sky-300 hover:bg-sky-500/15 hover:text-sky-200 active:scale-90'
      : 'text-slate-700 cursor-not-allowed',
  ].join(' ');

  return (
    <div className="min-h-[calc(100vh-64px)] py-8 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Heading ── */}
        <div data-animate className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-3 tracking-tight">
            Generate Your Dataset
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Create realistic, customizable datasets with advanced parameters
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* ══════════ LEFT COLUMN ══════════ */}
          <div data-animate className="space-y-6">

            {/* 1. Dataset Configuration Card */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <span className="w-2 h-5 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500 inline-block"/>
                Dataset Configuration
              </h2>

              {/* Tabs toggle */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full mb-5">
                  <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                  <TabsTrigger value="template">Templates</TabsTrigger>
                  <TabsTrigger value="nlp">NLP Tasks</TabsTrigger>
                </TabsList>

                {/* ── Templates Tab ── */}
                <TabsContent value="template" className="space-y-5">
                  <div>
                    <SectionLabel>Dataset Template</SectionLabel>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template…" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasetTemplates.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <p className="text-xs text-sky-400/80 mt-2 pl-1">
                        {datasetTemplates.find(t => t.value === selectedTemplate)?.description}
                      </p>
                    )}
                  </div>

                  {/* Load Template button, prominent and full-width */}
                  <button
                    onClick={generateFromTemplate}
                    disabled={!selectedTemplate}
                    className={[
                      'w-full flex items-center justify-center gap-2.5',
                      'py-3 px-6 rounded-xl',
                      'font-semibold text-sm tracking-wide',
                      'transition-all duration-200 active:scale-[0.97]',
                      selectedTemplate
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30 hover:from-sky-400 hover:to-indigo-400 hover:shadow-sky-500/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <Wand2 className="h-4.5 w-4.5" />
                    Load Template
                  </button>
                </TabsContent>

                {/* ── Manual Tab ── */}
                <TabsContent value="manual" className="space-y-4">
                  <div>
                    <SectionLabel>Add New Column</SectionLabel>
                    <div className="flex gap-2">
                      <Input
                        id="new-column"
                        value={newColumnName}
                        onChange={e => setNewColumnName(e.target.value)}
                        placeholder="Enter column name (comma-separated for multiple)"
                        onKeyPress={e => e.key === 'Enter' && addColumn()}
                        className="flex-1"
                      />
                      <button
                        onClick={addColumn}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:from-sky-400 hover:to-indigo-400 shadow-lg shadow-sky-500/30 transition-all duration-200 active:scale-95 flex-shrink-0"
                        title="Add column"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </TabsContent>

                {/* ── NLP Tasks Tab ── */}
                <TabsContent value="nlp" className="space-y-5">
                  <div>
                    <SectionLabel>NLP Task</SectionLabel>
                    <Select value={nlpTask} onValueChange={setNlpTask}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {nlpTaskOptions.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-sky-400/80 mt-2 pl-1">
                      {nlpTaskOptions.find(t => t.value === nlpTask)?.description}
                    </p>
                  </div>

                  {nlpTask === 'classification' && (
                    <div>
                      <SectionLabel>Class Labels</SectionLabel>
                      <Input
                        value={nlpLabels}
                        onChange={e => setNlpLabels(e.target.value)}
                        placeholder="positive, negative, neutral"
                      />
                      <p className="text-xs text-slate-500 mt-1.5 pl-1">
                        Enter 2 to 6 comma-separated labels. Balanced mode splits classes exactly evenly.
                      </p>
                    </div>
                  )}

                  {(nlpTask === 'retrieval' || nlpTask === 'pairs') && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <SectionLabel>Negative Examples</SectionLabel>
                        <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">
                          {negativeRatio}%
                        </span>
                      </div>
                      <Slider
                        value={[negativeRatio]}
                        onValueChange={v => setNegativeRatio(v[0])}
                        min={10}
                        max={90}
                        step={5}
                      />
                      <p className="text-xs text-slate-500 mt-2 pl-1">
                        {nlpTask === 'retrieval'
                          ? 'Share of query and passage pairs that are not relevant, useful as hard training negatives.'
                          : 'Share of sentence pairs that are not paraphrases.'}
                      </p>
                    </div>
                  )}

                  <div
                    className="flex items-start gap-2.5 rounded-lg p-3 text-xs leading-relaxed"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <Brain className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-400">
                      The AI engine writes a pool of unique examples for your domain (set it in
                      Custom Instructions below); class balance, negative ratios, and label noise
                      are then enforced exactly by the statistical engine.
                    </span>
                  </div>
                </TabsContent>
              </Tabs>

              {/* ── Shared fields below tabs ── */}
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <SectionLabel>Number of Rows</SectionLabel>
                    <NumberStepper
                      id="row-count"
                      value={rowCount}
                      onChange={setRowCount}
                      min={1}
                      max={MAX_ROWS}
                      step={100}
                    />
                    <p className="text-xs text-slate-500 mt-1.5 pl-1">Up to {MAX_ROWS.toLocaleString()} rows</p>
                  </div>
                  <div>
                    <SectionLabel>Seed (Optional)</SectionLabel>
                    <NumberStepper
                      id="seed"
                      value={seed}
                      onChange={v => setSeed(v === '' ? '' : String(v))}
                      min={0}
                      step={1}
                      allowEmpty
                      placeholder="Random"
                    />
                    <p className="text-xs text-slate-500 mt-1.5 pl-1">Same seed gives the same dataset</p>
                  </div>
                </div>

                <div>
                  <SectionLabel>Distribution Type</SectionLabel>
                  <Select value={distributionType} onValueChange={setDistributionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced Dataset</SelectItem>
                      <SelectItem value="distorted">Distorted / Noisy Dataset</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-sky-400/75 mt-2 pl-1">
                    {distributionType === 'balanced'
                      ? '⚖️  Well-balanced data for standard training'
                      : isNlpMode
                        ? '📡  Skewed classes, label noise, and dirty text for robustness practice'
                        : '📡  Noisy, distorted data for data cleaning practice'}
                  </p>
                </div>

                <div>
                  <SectionLabel>Custom Instructions</SectionLabel>
                  <textarea
                    id="custom-instructions"
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    maxLength={600}
                    placeholder={isNlpMode
                      ? 'Describe the domain, e.g. "medical research abstracts" or "e-commerce product search"…'
                      : 'Shape the text content, e.g. "All customers are from Chicago" or "Products are vintage vinyl records"…'}
                    rows={3}
                    className={[
                      'w-full resize-none rounded-lg px-3 py-2.5 text-sm',
                      'bg-[rgba(10,18,40,0.75)] text-slate-100 placeholder:text-slate-500',
                      'border border-slate-600/70',
                      'outline-none',
                      'transition-all duration-200',
                      'focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20',
                    ].join(' ')}
                  />
                  <p className="text-xs text-slate-500 mt-1 pl-1">
                    {isNlpMode
                      ? 'Sets the domain for the generated examples (queries, passages, texts…)'
                      : 'Applied by the AI engine to text columns (names, categories, descriptions…)'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Column Settings Card (tabular modes only) */}
            {!isNlpMode && columns.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-sky-400 flex-shrink-0" />
                  <span>Column Settings</span>
                  <span className="ml-auto text-xs font-normal text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                    {columns.length} {columns.length === 1 ? 'column' : 'columns'}
                  </span>
                </h2>

                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {columns.map((column, index) => (
                    <div
                      key={index}
                      className="rounded-xl p-4 space-y-4"
                      style={{
                        background: 'rgba(15,23,52,0.65)',
                        border: '1px solid rgba(56,189,248,0.14)',
                      }}
                    >
                      {/* Column header row */}
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                          style={{
                            background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
                            border: '1px solid rgba(56,189,248,0.3)',
                            color: '#7dd3fc',
                          }}
                        >
                          {column.name}
                        </span>
                        <button
                          onClick={() => removeColumn(index)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-all duration-150"
                          title="Remove column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Type selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <SectionLabel>Data Type</SectionLabel>
                          <Select value={column.type} onValueChange={v => updateColumn(index, { type: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {column.type === 'number' && (
                          <div>
                            <SectionLabel>Number Type</SectionLabel>
                            <Select value={column.numberType || 'integers'} onValueChange={v => updateColumn(index, { numberType: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="integers">Integers Only</SelectItem>
                                <SelectItem value="decimals">Decimals Only</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Min / Max for numbers */}
                      {column.type === 'number' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <SectionLabel>Min Value</SectionLabel>
                            <NumberStepper
                              value={column.minValue ?? 0}
                              onChange={v => updateColumn(index, { minValue: v === '' ? 0 : Number(v) })}
                            />
                          </div>
                          <div>
                            <SectionLabel>Max Value</SectionLabel>
                            <NumberStepper
                              value={column.maxValue ?? 100}
                              onChange={v => updateColumn(index, { maxValue: v === '' ? 0 : Number(v) })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Missing values slider */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <SectionLabel>Missing Values</SectionLabel>
                          <span className="text-xs font-mono font-semibold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md border border-sky-400/20">
                            {column.nanPercentage}%
                          </span>
                        </div>
                        <Slider
                          value={[column.nanPercentage]}
                          onValueChange={v => updateColumn(index, { nanPercentage: v[0] })}
                          max={50}
                          step={1}
                        />
                      </div>

                      {/* Add Noise toggle */}
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Add Noise</p>
                          <p className="text-xs text-slate-500">Introduce random noise to values</p>
                        </div>
                        <Switch checked={column.addNoise} onCheckedChange={c => updateColumn(index, { addNoise: c })} />
                      </div>

                      {column.addNoise && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <SectionLabel>Noise Level</SectionLabel>
                            <span className="text-xs font-mono font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">
                              {column.noiseLevel}%
                            </span>
                          </div>
                          <Slider
                            value={[column.noiseLevel]}
                            onValueChange={v => updateColumn(index, { noiseLevel: v[0] })}
                            max={20}
                            step={1}
                          />
                        </div>
                      )}

                      {/* Outliers (number columns only) */}
                      {column.type === 'number' && (
                        <>
                          <div className="flex items-center justify-between py-1">
                            <div>
                              <p className="text-sm font-medium text-slate-300">Add Outliers</p>
                              <p className="text-xs text-slate-500">Inject extreme values into the column</p>
                            </div>
                            <Switch checked={column.addOutliers} onCheckedChange={c => updateColumn(index, { addOutliers: c })} />
                          </div>

                          {column.addOutliers && (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <SectionLabel>Outlier Percentage</SectionLabel>
                                <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md border border-purple-400/20">
                                  {column.outlierPercentage}%
                                </span>
                              </div>
                              <Slider
                                value={[column.outlierPercentage]}
                                onValueChange={v => updateColumn(index, { outlierPercentage: v[0] })}
                                max={20}
                                step={1}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Generate Card */}
            <div className="glass-panel p-6">
              <button
                onClick={generateData}
                disabled={isGenerating}
                className={[
                  'w-full flex items-center justify-center gap-3',
                  'py-3.5 rounded-xl text-base font-bold tracking-wide',
                  'transition-all duration-200 active:scale-[0.98]',
                  isGenerating
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white shadow-xl shadow-sky-500/30 hover:from-sky-400 hover:via-blue-400 hover:to-indigo-400 hover:shadow-sky-500/50',
                ].join(' ')}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-slate-300" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    Generate Data
                  </>
                )}
              </button>
            </div>

          </div>{/* end left col */}

          {/* ══════════ RIGHT COLUMN: Preview ══════════ */}
          <div data-animate className="glass-panel overflow-hidden self-start">

            {/* Panel header */}
            <div
              className="px-5 py-4 flex items-center justify-between gap-3"
              style={{ borderBottom: '1px solid rgba(56,189,248,0.18)', background: 'rgba(9,14,35,0.7)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', boxShadow: '0 0 12px rgba(14,165,233,0.4)' }}
                >
                  <Database className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-100 text-base truncate">Generated Data Preview</span>
              </div>

              {generatedData.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-bold tracking-wide"
                    style={{ background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)' }}
                  >
                    {generatedData.length.toLocaleString()} rows
                  </span>

                  {/* Export dropdown, labeled and next to the data it acts on */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-300 border border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-200 transition-all duration-200 active:scale-95 outline-none"
                        title="Export dataset"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[10rem] rounded-xl border-slate-700/80 bg-[rgba(10,18,40,0.97)] text-slate-200 shadow-2xl shadow-black/60 backdrop-blur-xl p-1.5"
                    >
                      {[
                        { fmt: 'csv',  icon: <Download className="h-4 w-4 text-sky-400" />,    label: 'Export as CSV'  },
                        { fmt: 'json', icon: <Braces   className="h-4 w-4 text-indigo-400" />, label: 'Export as JSON' },
                        { fmt: 'txt',  icon: <FileText className="h-4 w-4 text-purple-400" />, label: 'Export as TXT'  },
                      ].map(({ fmt, icon, label }) => (
                        <DropdownMenuItem
                          key={fmt}
                          onSelect={() => downloadData(fmt)}
                          className="gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm focus:bg-sky-500/20 focus:text-sky-100"
                        >
                          {icon}
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="p-4" ref={previewRef}>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div
                    className="animate-spin rounded-full h-12 w-12"
                    style={{ border: '3px solid rgba(99,179,237,0.15)', borderTopColor: '#38bdf8', borderBottomColor: '#818cf8' }}
                  />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-sky-400/80 animate-pulse">Generating your dataset…</p>
                    <p className="text-xs text-slate-500">Usually just a few seconds, though the AI step can take up to 30 seconds</p>
                  </div>
                </div>
              ) : generateError ? (
                /* ── Error panel ── */
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center space-y-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: generateError.type === 'connection' || generateError.type === 'timeout'
                        ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                      border: generateError.type === 'connection' || generateError.type === 'timeout'
                        ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(234,179,8,0.25)',
                    }}
                  >
                    {generateError.type === 'connection'   && <WifiOff className="h-8 w-8 text-red-400" />}
                    {generateError.type === 'model'        && <ServerCrash className="h-8 w-8 text-amber-400" />}
                    {generateError.type === 'timeout'      && <RefreshCw className="h-8 w-8 text-red-400" />}
                    {generateError.type === 'config'       && <ServerCrash className="h-8 w-8 text-amber-400" />}
                    {generateError.type === 'rate_limited' && <Timer className="h-8 w-8 text-amber-400" />}
                    {generateError.type === 'error'        && <AlertTriangle className="h-8 w-8 text-amber-400" />}
                  </div>

                  <div className="space-y-2 max-w-xs">
                    <p className="font-bold text-slate-200 text-base">{generateError.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{generateError.message}</p>
                  </div>

                  {/* Contextual hints */}
                  {generateError.type === 'connection' && (
                    <div
                      className="text-left text-xs rounded-lg p-3 space-y-1 w-full max-w-xs"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <p className="font-semibold text-red-400 mb-1.5">Troubleshooting:</p>
                      <p className="text-slate-400">1. Is the backend running? Run <code className="text-sky-400 bg-slate-800 px-1 rounded">python app.py</code></p>
                      <p className="text-slate-400">2. Check <code className="text-sky-400 bg-slate-800 px-1 rounded">VITE_API_URL</code> in your <code className="text-sky-400 bg-slate-800 px-1 rounded">.env</code></p>
                      <p className="text-slate-400">3. Make sure port 8000 is not blocked</p>
                    </div>
                  )}

                  {generateError.type === 'rate_limited' && (
                    <div
                      className="text-left text-xs rounded-lg p-3 w-full max-w-xs"
                      style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.15)' }}
                    >
                      <p className="text-amber-400/80">
                        Generation is rate-limited to keep the service free for everyone.
                        Wait a moment and try again. Your configuration is preserved.
                      </p>
                    </div>
                  )}

                  {generateError.type === 'model' && (
                    <div
                      className="text-left text-xs rounded-lg p-3 w-full max-w-xs"
                      style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.15)' }}
                    >
                      <p className="text-amber-400/80">All AI models in the OpenRouter fallback chain are currently unavailable. This is a temporary upstream issue.</p>
                    </div>
                  )}

                  <button
                    onClick={() => { setGenerateError(null); generateData(); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 shadow-lg shadow-sky-500/25 transition-all duration-200 active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>
              ) : !generatedData.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
                    style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                    <Database className="h-8 w-8 text-sky-500/50" />
                  </div>
                  <p className="text-sm text-slate-500 max-w-52 leading-relaxed">
                    {isNlpMode ? 'Pick an NLP task' : 'Configure your columns'} and click{' '}
                    <strong className="text-sky-400 font-semibold">Generate Data</strong>
                    {' '}to see a preview here.
                  </p>
                </div>
              ) : (
                <div ref={tableRef} style={{ opacity: 0 }}>
                  {/* Horizontally scrollable table */}
                  <div className="overflow-x-auto rounded-xl custom-scrollbar">
                    <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr style={{ background: 'rgba(5,12,35,0.85)' }}>
                          {tableCols.map((c, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                              style={{ borderBottom: '1px solid rgba(56,189,248,0.18)' }}
                            >
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide"
                                style={{
                                  background: i % 3 === 0
                                    ? 'rgba(14,165,233,0.18)'
                                    : i % 3 === 1
                                      ? 'rgba(99,102,241,0.18)'
                                      : 'rgba(168,85,247,0.18)',
                                  color: i % 3 === 0 ? '#7dd3fc' : i % 3 === 1 ? '#a5b4fc' : '#d8b4fe',
                                  border: `1px solid ${i % 3 === 0 ? 'rgba(56,189,248,0.3)' : i % 3 === 1 ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.3)'}`,
                                }}
                              >
                                {c.name}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, r) => (
                          <tr
                            key={safePage * PAGE_SIZE + r}
                            style={{
                              background: r % 2 === 0 ? 'rgba(255,255,255,0.022)' : 'transparent',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = r % 2 === 0 ? 'rgba(255,255,255,0.022)' : 'transparent'}
                          >
                            {tableCols.map((c, j) => {
                              const isLong = typeof row[c.name] === 'string' && row[c.name].length > 60;
                              return (
                              <td
                                key={j}
                                className="px-4 py-2.5"
                                style={{
                                  borderBottom: '1px solid rgba(56,189,248,0.07)',
                                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                                  fontSize: '0.78rem',
                                  letterSpacing: '0.01em',
                                  whiteSpace: isLong ? 'normal' : 'nowrap',
                                  minWidth: isLong ? '18rem' : undefined,
                                  maxWidth: isLong ? '26rem' : undefined,
                                  color: row[c.name] == null
                                    ? 'rgba(148,163,184,0.35)'
                                    : 'rgba(226,232,240,0.9)',
                                }}
                              >
                                {row[c.name] == null ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(252,165,165,0.7)', border: '1px solid rgba(239,68,68,0.2)' }}
                                  >
                                    null
                                  </span>
                                ) : (
                                  String(row[c.name])
                                )}
                              </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  <div
                    className="flex items-center justify-between flex-wrap gap-2 px-3 py-2.5 mt-1 rounded-xl"
                    style={{ border: '1px solid rgba(56,189,248,0.1)', background: 'rgba(5,12,35,0.6)' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      Rows{' '}
                      <span style={{ color: '#7dd3fc', fontWeight: 700 }}>
                        {(safePage * PAGE_SIZE + 1).toLocaleString()}-{Math.min((safePage + 1) * PAGE_SIZE, generatedData.length).toLocaleString()}
                      </span>{' '}
                      of <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{generatedData.length.toLocaleString()}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(0)} disabled={safePage === 0}
                        className={pagerButtonClass(safePage > 0)} title="First page">
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setPage(safePage - 1)} disabled={safePage === 0}
                        className={pagerButtonClass(safePage > 0)} title="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-mono font-semibold text-slate-400 px-2 select-none">
                        {safePage + 1} / {totalPages}
                      </span>
                      <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages - 1}
                        className={pagerButtonClass(safePage < totalPages - 1)} title="Next page">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}
                        className={pagerButtonClass(safePage < totalPages - 1)} title="Last page">
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quality report */}
                  {report && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowReport(!showReport)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-sky-200 transition-all duration-150"
                        style={{ border: '1px solid rgba(56,189,248,0.14)', background: 'rgba(9,14,35,0.6)' }}
                      >
                        <span className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                          Data Quality Report
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{
                              background: report.engine === 'hybrid' ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.12)',
                              color: report.engine === 'hybrid' ? '#6ee7b7' : '#94a3b8',
                              border: `1px solid ${report.engine === 'hybrid' ? 'rgba(52,211,153,0.3)' : 'rgba(148,163,184,0.25)'}`,
                            }}
                          >
                            {report.engine === 'hybrid' ? 'AI + Statistical' : report.engine === 'local' ? 'Offline Engine' : 'Statistical'}
                          </span>
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showReport ? 'rotate-180' : ''}`} />
                      </button>

                      {showReport && (
                        <div
                          className="mt-2 rounded-2xl p-4 sm:p-5 space-y-4 relative overflow-hidden"
                          style={{
                            border: '1px solid rgba(56,189,248,0.16)',
                            background: 'linear-gradient(165deg, rgba(9,14,35,0.85), rgba(5,12,35,0.75))',
                          }}
                        >
                          {/* soft glow accent */}
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(14,165,233,0.08), transparent 55%)' }}
                          />

                          {/* Meta chips */}
                          <div className="flex flex-wrap gap-2 relative">
                            <MetaChip icon={Hash} label="Seed" value={report.seed} />
                            <MetaChip icon={Layers} label="Mode" value={report.distribution} accent="#a5b4fc" />
                            {report.task && (
                              <MetaChip icon={Brain} label="Task" value={report.task} accent="#d8b4fe" />
                            )}
                            {report.model_used && (
                              <MetaChip icon={Cpu} label="Model" value={report.model_used.split('/').pop()} accent="#6ee7b7" />
                            )}
                            {report.unique_pool_size != null && (
                              <MetaChip icon={Database} label="Unique pool" value={report.unique_pool_size.toLocaleString()} accent="#fcd34d" />
                            )}
                            {report.custom_instructions_applied && (
                              <MetaChip icon={CheckCircle2} label="Instructions" value="applied" accent="#6ee7b7" />
                            )}
                          </div>

                          {/* Label distribution (NLP tasks) */}
                          {report.label_distribution && (
                            <div className="relative space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Label Distribution
                                {report.label_noise_flips > 0 && (
                                  <span className="ml-2 normal-case tracking-normal font-medium text-amber-400/90">
                                    · {report.label_noise_flips} labels intentionally flipped (noise)
                                  </span>
                                )}
                              </p>
                              <LabelDistributionBar distribution={report.label_distribution} />
                            </div>
                          )}

                          {/* Per-column cards */}
                          <div className="relative grid sm:grid-cols-2 gap-2.5">
                            {report.columns?.map((c, i) => (
                              <ReportColumnCard key={i} col={c} />
                            ))}
                          </div>

                          <p className="relative text-xs text-slate-500 leading-relaxed">
                            Every percentage above is enforced exactly by the statistical engine. Run again with
                            seed <span className="text-sky-300 font-semibold">{report.seed}</span> to reproduce this dataset.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Generate;
