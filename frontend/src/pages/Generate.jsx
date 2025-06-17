import React, { useState } from 'react';
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

  const datasetTemplates = [
    { value: 'ecommerce', label: 'E-commerce Customer Data', description: 'Customer profiles with purchase history, preferences, and demographics' },
    { value: 'financial', label: 'Financial Records', description: 'Transaction data, account balances, and financial metrics' },
    { value: 'healthcare', label: 'Healthcare Data', description: 'Patient records, medical metrics, and treatment information' },
    { value: 'education', label: 'Educational Data', description: 'Student records, grades, courses, and academic performance' },
    { value: 'marketing', label: 'Marketing Analytics', description: 'Campaign performance, user engagement, and conversion metrics' },
    { value: 'iot', label: 'IoT Sensor Data', description: 'Time-series data from various sensors and devices' }
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
        { name: 'CustomerID', type: 'string' },
        { name: 'Age', type: 'number', numberType: 'integers', minValue: 18, maxValue: 80 },
        { name: 'Gender', type: 'string' },
        { name: 'City', type: 'string' },
        { name: 'TotalSpend', type: 'number', numberType: 'decimals', minValue: 10, maxValue: 1000 },
        { name: 'LastPurchaseDate', type: 'date' },
        { name: 'IsPrimeMember', type: 'boolean' }
      ],
      financial: [
        { name: 'TransactionID', type: 'string' },
        { name: 'AccountID', type: 'string' },
        { name: 'Amount', type: 'number', numberType: 'decimals', minValue: -5000, maxValue: 5000 },
        { name: 'TransactionType', type: 'string' },
        { name: 'TransactionDate', type: 'date' },
        { name: 'BalanceAfterTransaction', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100000 },
        { name: 'IsFraud', type: 'boolean' }
      ],
      healthcare: [
        { name: 'PatientID', type: 'string' },
        { name: 'Age', type: 'number', numberType: 'integers', minValue: 0, maxValue: 100 },
        { name: 'Diagnosis', type: 'string' },
        { name: 'BloodPressure_Systolic', type: 'number', numberType: 'integers', minValue: 90, maxValue: 180 },
        { name: 'BloodPressure_Diastolic', type: 'number', numberType: 'integers', minValue: 60, maxValue: 120 },
        { name: 'Medication', type: 'string' },
        { name: 'AdmissionDate', type: 'date' },
        { name: 'DischargeDate', type: 'date' }
      ],
      education: [
        { name: 'StudentID', type: 'string' },
        { name: 'GradeLevel', type: 'number', numberType: 'integers', minValue: 1, maxValue: 12 },
        { name: 'Major', type: 'string' },
        { name: 'GPA', type: 'number', numberType: 'decimals', minValue: 1.0, maxValue: 4.0 },
        { name: 'EnrollmentDate', type: 'date' },
        { name: 'CourseCount', type: 'number', numberType: 'integers', minValue: 1, maxValue: 7 },
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
      iot: [
        { name: 'DeviceID', type: 'string' },
        { name: 'Timestamp', type: 'date' },
        { name: 'TemperatureCelsius', type: 'number', numberType: 'decimals', minValue: -20, maxValue: 50 },
        { name: 'Humidity', type: 'number', numberType: 'decimals', minValue: 0, maxValue: 100 },
        { name: 'PressureKPa', type: 'number', numberType: 'decimals', minValue: 90, maxValue: 110 },
        { name: 'BatteryLevel', type: 'number', numberType: 'integers', minValue: 0, maxValue: 100 },
        { name: 'IsOnline', type: 'boolean' }
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
      const resp = await fetch('http://localhost:5000/api/generate', {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Generate Your Dataset
          </h1>
          <p className="text-xl text-gray-600">
            Create realistic, customizable datasets with advanced parameters
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Configuration Card */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Dataset Configuration</CardTitle>
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
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasetTemplates.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <p className="text-sm text-gray-600 mt-2">
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
                      <Label htmlFor="new-column">Add New Column</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="new-column"
                          className="border-1 border-gray-300"
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
                    <Label htmlFor="row-count">Number of Rows</Label>
                    <Input
                      id="row-count"
                      type="number"
                      className="mt-2 border-1 border-gray-300"
                      value={rowCount}
                      onChange={e => setRowCount(+e.target.value)}
                      min="1"
                      max="10000"
                    />
                  </div>
                  <div>
                    <Label>Distribution Type</Label>
                    <Select
                      value={distributionType}
                      onValueChange={setDistributionType}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced Dataset</SelectItem>
                        <SelectItem value="distorted">Distorted/Noisy Dataset</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600 mt-1">
                      {distributionType === 'balanced'
                        ? 'Well-balanced data for standard training'
                        : 'Noisy, distorted data for data cleaning practice'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="custom-instructions">Custom Instructions</Label>
                    <Textarea
                      id="custom-instructions"
                      className="mt-2 border-1 border-gray-300"
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
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" /> <span>Column Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto">
                  {columns.map((column, index) => (
                    <div key={index} className="border-1 border-gray-300 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-200 border border-gray-300 text-sm font-medium text-gray-800">
                          {column.name}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeColumn(index)}
                          className="border-1 border-gray-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={v => updateColumn(index, { type: v })}
                          >
                            <SelectTrigger className="mt-1">
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
                          <>
                            <div>
                              <Label>Number Type</Label>
                              <Select
                                value={column.numberType || 'integers'}
                                onValueChange={v => updateColumn(index, { numberType: v })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="integers">Integers Only</SelectItem>
                                  <SelectItem value="decimals">Decimals Only</SelectItem>
                                  <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Min Value</Label>
                              <Input
                                type="number"
                                value={column.minValue || 0}
                                onChange={e => updateColumn(index, { minValue: parseInt(e.target.value) })}
                                className="mt-1 border-1 border-gray-300"
                              />
                            </div>
                            <div>
                              <Label>Max Value</Label>
                              <Input
                                type="number"
                                value={column.maxValue || 100}
                                onChange={e => updateColumn(index, { maxValue: parseInt(e.target.value) })}
                                className="mt-1 border-1 border-gray-300"
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
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={generateData}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Generated Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {!generatedData.length ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data generated yet. Configure your columns and click "Generate Data".</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {/* Ensure columns are defined or infer from data if empty */}
                        {(columns.length > 0 ? columns : Object.keys(generatedData[0] || {}).map(name => ({name}))).map((c, i) => (
                          <th key={i} className="border border-gray-300 p-2 text-left font-semibold">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedData.slice(0, 20).map((row, r) => (
                        <tr key={r} className="hover:bg-gray-50">
                          {/* Use column names from the `columns` state for consistent ordering,
                              or fall back to keys from the first row if `columns` is empty (e.g., from template) */}
                          {(columns.length > 0 ? columns : Object.keys(generatedData[0] || {}).map(name => ({name}))).map((c, j) => (
                            <td key={j} className="border border-gray-300 p-2">
                              {row[c.name] == null ? <span className="text-gray-400 italic">null</span> : String(row[c.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedData.length > 20 && (
                    <p className="text-center text-gray-500 mt-4">
                      Showing first 20 of {generatedData.length} rows
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Generate;