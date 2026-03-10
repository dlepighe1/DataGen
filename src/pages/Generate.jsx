import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Download, FileText, Database, Settings, Wand2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Label } from '../components/UI/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import { Textarea } from '../components/UI/Textarea';
import { Slider } from '../components/UI/Slider';
import { Switch } from '../components/UI/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/UI/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/UI/Tabs';
import { toast } from '../components/Use-toast';

const Generate = () => {
  const [columns, setColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [rowCount, setRowCount] = useState(100);
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedData, setGeneratedData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const [distributionType, setDistributionType] = useState('balanced');

  const tableRef = useRef(null);
  const previewRef = useRef(null);
  const [visibleRows, setVisibleRows] = useState(20); // default value

  // Animation to show the table
  useEffect(() => {
    if (!isGenerating && generatedData.length && tableRef.current) {
      gsap.to(tableRef.current, {
        duration: 0.8,
        opacity: 1,
        ease: 'power2.out',
      });
    }
  }, [isGenerating, generatedData]);

  // Templates
  const datasetTemplates = [
    { value: 'ecommerce', label: 'E-commerce Data', description: 'Orders, products, and customer behavior' },
    { value: 'healthcare', label: 'Healthcare Records', description: 'Patient visits, vitals, and treatment plans' },
    { value: 'financial', label: 'Financial Transactions', description: 'Bank activity, merchants, and fraud flags' },
    { value: 'school', label: 'Student Performance', description: 'Grades, attendance, and course records' },
    { value: 'sports', label: 'Athlete Stats', description: 'Match performance, cards, goals, and injuries' },
    { value: 'videogames', label: 'Game Analytics', description: 'Session metrics, levels, purchases, and rewards' },
    { value: 'marketing', label: 'Marketing Analytics', description: 'Campaign performance, user engagement, and conversion metrics' }
  ];

  const addColumn = () => {
    const names = newColumnName
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    const uniqueNames = names.filter((name, index, self) => self.indexOf(name) === index);
    const newColumns = uniqueNames
      .filter(name => !columns.find(col => col.name === name))
      .map(name => ({
        name,
        type: 'string',
        nanPercentage: 0,
        addNoise: false,
        noiseLevel: 0,
        addOutliers: false,
        outlierPercentage: 0,
        numberType: 'integers'
      }));
    if (newColumns.length) {
      setColumns([...columns, ...newColumns]);
      setNewColumnName('');
    }
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
        { name: 'OrderID', type: 'string' },
        { name: 'CustomerID', type: 'string' },
        { name: 'CustomerName', type: 'string' },
        { name: 'Email', type: 'email' },
        { name: 'OrderDate', type: 'date' },
        { name: 'ProductID', type: 'string' },
        { name: 'ProductName', type: 'string' },
        { name: 'Category', type: 'string' },
        { name: 'Quantity', type: 'number', numberType: 'integers', minValue: 1, maxValue: 5 },
        { name: 'UnitPrice', type: 'number', numberType: 'decimals', minValue: 5, maxValue: 500 },
        { name: 'TotalAmount', type: 'number', numberType: 'decimals', minValue: 10, maxValue: 2500 },
        { name: 'PaymentMethod', type: 'string' },
        { name: 'DeliveryStatus', type: 'string' },
        { name: 'IsFirstPurchase', type: 'boolean' }
      ],
      financial: [
        { name: 'TransactionID', type: 'string' },
        { name: 'AccountID', type: 'string' },
        { name: 'AccountType', type: 'string' },
        { name: 'TransactionDate', type: 'date' },
        { name: 'Amount', type: 'number', numberType: 'decimals', minValue: -10000, maxValue: 10000 },
        { name: 'Currency', type: 'string' },
        { name: 'MerchantName', type: 'string' },
        { name: 'Category', type: 'string' },
        { name: 'BalanceAfterTransaction', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100000 },
        { name: 'IsInternational', type: 'boolean' },
        { name: 'IsFraudulent', type: 'boolean' }
      ],
      healthcare: [
        { name: 'PatientID', type: 'string' },
        { name: 'FullName', type: 'string' },
        { name: 'Age', type: 'number', numberType: 'integers', minValue: 0, maxValue: 100 },
        { name: 'Gender', type: 'string' },
        { name: 'VisitDate', type: 'date' },
        { name: 'Diagnosis', type: 'string' },
        { name: 'TreatmentPlan', type: 'string' },
        { name: 'Medication', type: 'string' },
        { name: 'BloodPressure', type: 'string' },
        { name: 'HeartRate', type: 'number', numberType: 'integers', minValue: 50, maxValue: 180 },
        { name: 'CholesterolLevel', type: 'number', numberType: 'decimals', minValue: 3.0, maxValue: 7.0 },
        { name: 'FollowUpRequired', type: 'boolean' }
      ],
      school: [
        { name: 'StudentID', type: 'string' },
        { name: 'FullName', type: 'string' },
        { name: 'GradeLevel', type: 'number', numberType: 'integers', minValue: 1, maxValue: 12 },
        { name: 'Gender', type: 'string' },
        { name: 'EnrollmentDate', type: 'date' },
        { name: 'CourseName', type: 'string' },
        { name: 'AssignmentScore', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100 },
        { name: 'ExamScore', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100 },
        { name: 'FinalGrade', type: 'string' },
        { name: 'AttendanceRate', type: 'number', numberType: 'decimals', minValue: 50, maxValue: 100 },
        { name: 'ScholarshipRecipient', type: 'boolean' }
      ],
      marketing: [
        { name: 'UserID', type: 'string' },
        { name: 'CampaignID', type: 'string' },
        { name: 'Impressions', type: 'number', numberType: 'integers', minValue: 100, maxValue: 10000 },
        { name: 'Clicks', type: 'number', numberType: 'integers', minValue: 1, maxValue: 500 },
        { name: 'Conversions', type: 'number', numberType: 'integers', minValue: 0, maxValue: 50 },
        { name: 'AdSpend', type: 'number', numberType: 'decimals', minValue: 5, maxValue: 500 },
        { name: 'Date', type: 'date' }
      ],
      sports: [
        { name: 'PlayerID', type: 'string' },
        { name: 'FullName', type: 'string' },
        { name: 'TeamName', type: 'string' },
        { name: 'Sport', type: 'string' },
        { name: 'MatchDate', type: 'date' },
        { name: 'Position', type: 'string' },
        { name: 'MinutesPlayed', type: 'number', numberType: 'integers', minValue: 0, maxValue: 120 },
        { name: 'GoalsScored', type: 'number', numberType: 'integers', minValue: 0, maxValue: 5 },
        { name: 'Assists', type: 'number', numberType: 'integers', minValue: 0, maxValue: 5 },
        { name: 'YellowCards', type: 'number', numberType: 'integers', minValue: 0, maxValue: 2 },
        { name: 'RedCard', type: 'boolean' },
        { name: 'Injury', type: 'boolean' }
      ],
      videogames: [
        { name: 'PlayerID', type: 'string' },
        { name: 'Username', type: 'string' },
        { name: 'GameTitle', type: 'string' },
        { name: 'SessionStart', type: 'date' },
        { name: 'SessionEnd', type: 'date' },
        { name: 'SessionDurationMinutes', type: 'number', numberType: 'integers', minValue: 5, maxValue: 300 },
        { name: 'LevelAchieved', type: 'number', numberType: 'integers', minValue: 1, maxValue: 100 },
        { name: 'InGameCurrencyEarned', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 5000 },
        { name: 'ItemsPurchased', type: 'number', numberType: 'integers', minValue: 0, maxValue: 50 },
        { name: 'UsedMicrotransactions', type: 'boolean' },
        { name: 'IsPremiumUser', type: 'boolean' }
      ]
    };
    if (selectedTemplate && templates[selectedTemplate]) {
      setColumns(templates[selectedTemplate]);
    }
  };


  const generateData = async () => {
    if (!columns.length) {
      toast({ title: 'No columns defined', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);

    const configPayload = { rowCount, distributionType, customInstructions, template: selectedTemplate, columns };
    try {
      // Use environment variable for production API URL, or fallback to local port 8000 for development
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      });
      if (!resp.ok) {
        const errorData = await resp.json(); // Assuming error response is JSON
        throw new Error(errorData.details || errorData.error || 'Unknown error during generation.');
      }

      const { status, table } = await resp.json();
      if (status === 'ok' && Array.isArray(table)) {
        setGeneratedData(table);
        toast({ title: 'Data Generated!', description: `Loaded ${table.length} rows.` });
      } else {
        throw new Error('Invalid data format received from server.');
      }
    } catch (err) {
      toast({ title: 'Error Generating Data', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadData = format => {
    if (!generatedData.length) {
      toast({ title: 'No Data to Download', description: 'Generate data first.', variant: 'destructive' });
      return;
    }
    let content, filename, mimeType;
    switch (format) {
      case 'csv':
        // Use the actual generated data's keys for CSV header if columns state is not fully representative
        const csvColumns = columns.length > 0 ? columns.map(c => c.name) : Object.keys(generatedData[0] || {});
        content = [
          csvColumns.join(','),
          ...generatedData.map(r => csvColumns.map(colName => r[colName] ?? '').join(','))
        ].join('\n');
        filename = 'data.csv';
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(generatedData, null, 2);
        filename = 'data.json';
        mimeType = 'application/json';
        break;
      case 'txt':
        content = generatedData.map(r => columns.map(c => `${c.name}: ${r[c.name] ?? 'N/A'}`).join(' | ')).join('\n');
        filename = 'data.txt';
        mimeType = 'text/plain';
        break;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Download Started', description: filename });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Generate Your Dataset
          </h1>
          <p className="text-xl text-slate-400">
            Create realistic, customizable datasets with advanced parameters
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Configuration Card */}
            <Card className="glass-panel text-slate-200 border-none shadow-none">
              <CardHeader>
                <CardTitle className="text-white">Dataset Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                    <TabsTrigger value="template">Templates</TabsTrigger>
                  </TabsList>

                  {/* Templates Tab */}
                  <TabsContent value="template" className="space-y-4">
                    <div>
                      <Label>Dataset Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="mt-2 bg-slate-900/50 border-sky-900/50 text-slate-200">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-sky-900/50 text-slate-200">
                          {datasetTemplates.map(t => (
                            <SelectItem key={t.value} value={t.value} className="focus:bg-sky-900/50 focus:text-sky-100 cursor-pointer">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <p className="text-sm text-sky-200/70 mt-2">
                          {datasetTemplates.find(t => t.value === selectedTemplate).description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={generateFromTemplate}
                      disabled={!selectedTemplate}
                      className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary)/0.85)] active:scale-95 transition"
                    >
                      <Wand2 className="h-4 w-4 mr-2" /> Load Template
                    </Button>
                  </TabsContent>

                  {/* Manual Tab */}
                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="new-column" className="text-slate-300">Add New Column</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="new-column"
                          className="bg-slate-900/50 border-sky-900/50 text-slate-200 placeholder-slate-500"
                          value={newColumnName}
                          onChange={e => setNewColumnName(e.target.value)}
                          placeholder="Enter column name"
                          onKeyPress={e => e.key === 'Enter' && addColumn()}
                        />
                        <Button
                          onClick={addColumn}
                          className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary)/0.85)] active:scale-95 transition"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="row-count" className="text-slate-300">Number of Rows</Label>
                    <Input
                      id="row-count"
                      type="number"
                      className="mt-2 bg-slate-900/50 border-sky-900/50 text-slate-200"
                      value={rowCount}
                      onChange={e => setRowCount(+e.target.value)}
                      min="1"
                      max="10000"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Distribution Type</Label>
                    <Select
                      value={distributionType}
                      onValueChange={setDistributionType}
                    >
                      <SelectTrigger className="mt-2 bg-slate-900/50 border-sky-900/50 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-sky-900/50 text-slate-200">
                        <SelectItem value="balanced" className="focus:bg-sky-900/50 cursor-pointer">Balanced Dataset</SelectItem>
                        <SelectItem value="distorted" className="focus:bg-sky-900/50 cursor-pointer">Distorted/Noisy Dataset</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-sky-200/70 mt-1">
                      {distributionType === 'balanced'
                        ? 'Well-balanced data for standard training'
                        : 'Noisy, distorted data for data cleaning practice'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="custom-instructions" className="text-slate-300">Custom Instructions</Label>
                    <Textarea
                      id="custom-instructions"
                      className="mt-2 bg-slate-900/50 border-sky-900/50 text-slate-200 placeholder-slate-500"
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="Any special requirements or patterns"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column Settings */}
            {columns.length > 0 && (
              <Card className="glass-panel text-slate-200 border-none shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Settings className="h-5 w-5 text-sky-400" /> <span>Column Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {columns.map((column, index) => (
                    <div key={index} className="bg-slate-800/40 border border-sky-900/30 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-900/80 border border-sky-500/30 text-sm font-medium text-sky-300 tracking-wide">
                          {column.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColumn(index)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300">Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={v => updateColumn(index, { type: v })}
                          >
                            <SelectTrigger className="mt-1 bg-slate-900/50 border-sky-900/50 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-sky-900/50 text-slate-200">
                              <SelectItem value="string" className="focus:bg-sky-900/50 cursor-pointer">Text</SelectItem>
                              <SelectItem value="number" className="focus:bg-sky-900/50 cursor-pointer">Number</SelectItem>
                              <SelectItem value="email" className="focus:bg-sky-900/50 cursor-pointer">Email</SelectItem>
                              <SelectItem value="date" className="focus:bg-sky-900/50 cursor-pointer">Date</SelectItem>
                              <SelectItem value="boolean" className="focus:bg-sky-900/50 cursor-pointer">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {column.type === 'number' && (
                          <>
                            <div>
                              <Label className="text-slate-300">Number Type</Label>
                              <Select
                                value={column.numberType || 'integers'}
                                onValueChange={v => updateColumn(index, { numberType: v })}
                              >
                                <SelectTrigger className="mt-1 bg-slate-900/50 border-sky-900/50 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-sky-900/50 text-slate-200">
                                  <SelectItem value="integers" className="focus:bg-sky-900/50 cursor-pointer">Integers Only</SelectItem>
                                  <SelectItem value="decimals" className="focus:bg-sky-900/50 cursor-pointer">Decimals Only</SelectItem>
                                  <SelectItem value="mixed" className="focus:bg-sky-900/50 cursor-pointer">Mixed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-slate-300">Min Value</Label>
                              <Input
                                type="number"
                                value={column.minValue || 0}
                                onChange={e => updateColumn(index, { minValue: parseInt(e.target.value) })}
                                className="mt-1 bg-slate-900/50 border-sky-900/50 text-slate-200"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-300">Max Value</Label>
                              <Input
                                type="number"
                                value={column.maxValue || 100}
                                onChange={e => updateColumn(index, { maxValue: parseInt(e.target.value) })}
                                className="mt-1 bg-slate-900/50 border-sky-900/50 text-slate-200"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <Label>Missing Values: {column.nanPercentage}%</Label>
                        <Slider
                          value={[column.nanPercentage]}
                          onValueChange={v => updateColumn(index, { nanPercentage: v[0] })}
                          max={50}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Add Noise</Label>
                        <Switch
                          checked={column.addNoise}
                          onCheckedChange={c => updateColumn(index, { addNoise: c })}
                        />
                      </div>
                      {column.addNoise && (
                        <div>
                          <Label>Noise Level: {column.noiseLevel}%</Label>
                          <Slider
                            value={[column.noiseLevel]}
                            onValueChange={v => updateColumn(index, { noiseLevel: v[0] })}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      )}
                      {column.type === 'number' && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>Add Outliers</Label>
                            <Switch
                              checked={column.addOutliers}
                              onCheckedChange={c => updateColumn(index, { addOutliers: c })}
                            />
                          </div>
                          {column.addOutliers && (
                            <div>
                              <Label>Outlier Percentage: {column.outlierPercentage}%</Label>
                              <Slider
                                value={[column.outlierPercentage]}
                                onValueChange={v => updateColumn(index, { outlierPercentage: v[0] })}
                                max={20}
                                step={1}
                                className="mt-2"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Generate & Download */}
            <Card className="glass-panel border-none shadow-none text-slate-200">
              <CardContent className="pt-6">
                <Button
                  onClick={generateData}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 border-none shadow-lg text-lg font-semibold"
                >
                  {isGenerating ? 'Generating...' : 'Generate Data'}
                </Button>

                {generatedData.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Download Options</Label>
                    <div className="flex flex-wrap gap-2">
                      {['csv', 'json', 'txt'].map(fmt => (
                        <Button
                          key={fmt}
                          variant="outline"
                          onClick={() => downloadData(fmt)}
                          className="flex-1 min-w-0"
                        >
                          {fmt === 'csv'
                            ? <Download className="h-4 w-4 mr-2" />
                            : <FileText className="h-4 w-4 mr-2" />}
                          {fmt.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="rounded-2xl overflow-hidden glass-panel shrink-0 self-start w-full">
            {/* Panel header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
              style={{ borderColor: 'rgba(56, 189, 248, 0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)' }}
                >
                  <Database className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sky-100/90 text-lg">Generated Data Preview</span>
              </div>
              {generatedData.length > 0 && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold tracking-wide"
                  style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                >
                  {generatedData.length} rows
                </span>
              )}
            </div>

            <div className="p-4" ref={previewRef}>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div
                    className="animate-spin rounded-full h-12 w-12"
                    style={{ border: '3px solid rgba(99,179,237,0.15)', borderTopColor: '#60a5fa', borderBottomColor: '#a78bfa' }}
                  />
                  <p className="text-sm font-medium" style={{ color: '#93c5fd' }}>Generating your dataset…</p>
                </div>
              ) : !generatedData.length ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: 'rgba(148,163,184,0.6)' }}>
                  <Database className="h-14 w-14 mb-4 opacity-30" />
                  <p className="text-sm text-center max-w-xs">
                    Configure your columns and click <strong style={{ color: '#93c5fd' }}>Generate Data</strong> to see a preview here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto opacity-0 rounded-xl" ref={tableRef}
                  style={{ border: '1px solid rgba(99,179,237,0.12)' }}
                >
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(4,18,43,0.7)' }}>
                        {(columns.length > 0
                          ? columns
                          : Object.keys(generatedData[0] || {}).map(name => ({ name }))
                        ).map((c, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-left"
                            style={{ borderBottom: '1px solid rgba(99,179,237,0.2)' }}
                          >
                            <span
                              className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide"
                              style={{
                                background: i % 2 === 0
                                  ? 'rgba(59,130,246,0.2)'
                                  : 'rgba(139,92,246,0.2)',
                                color: i % 2 === 0 ? '#93c5fd' : '#c4b5fd',
                                border: `1px solid ${i % 2 === 0 ? 'rgba(99,179,237,0.3)' : 'rgba(167,139,250,0.3)'}`,
                              }}
                            >
                              {c.name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedData.slice(0, 25).map((row, r) => {
                        const cols = columns.length > 0
                          ? columns
                          : Object.keys(generatedData[0] || {}).map(name => ({ name }));
                        return (
                          <tr
                            key={r}
                            style={{
                              background: r % 2 === 0
                                ? 'rgba(255,255,255,0.025)'
                                : 'rgba(255,255,255,0.01)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,179,237,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = r % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)'}
                          >
                            {cols.map((c, j) => (
                              <td
                                key={j}
                                className="px-4 py-2.5"
                                style={{
                                  borderBottom: '1px solid rgba(99,179,237,0.07)',
                                  color: row[c.name] == null ? 'rgba(148,163,184,0.4)' : 'rgba(219,234,254,0.85)',
                                  fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
                                  fontSize: '0.78rem',
                                  letterSpacing: '0.01em',
                                }}
                              >
                                {row[c.name] == null ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(252,165,165,0.6)', border: '1px solid rgba(239,68,68,0.2)' }}
                                  >
                                    null
                                  </span>
                                ) : (
                                  String(row[c.name])
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {generatedData.length > 25 && (
                    <div
                      className="text-center py-3 text-xs"
                      style={{
                        color: 'rgba(148,163,184,0.6)',
                        borderTop: '1px solid rgba(99,179,237,0.1)',
                        background: 'rgba(4,18,43,0.5)',
                      }}
                    >
                      Showing 25 of <span style={{ color: '#93c5fd', fontWeight: 600 }}>{generatedData.length}</span> rows
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