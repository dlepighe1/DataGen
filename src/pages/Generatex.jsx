import React, { useState } from 'react';
import { Download, FileText, Database, Settings, Wand2, Plus, Trash2, AlertCircle } from 'lucide-react';
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
  const [columns, setColumns] = useState([
    { name: 'Name', type: 'string', nanPercentage: 0, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0 },
    { name: 'Age', type: 'number', minValue: 18, maxValue: 80, nanPercentage: 0, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0, numberType: 'integers' },
    { name: 'Email', type: 'email', nanPercentage: 0, addNoise: false, noiseLevel: 0 }
  ]);
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
    if (newColumnName.trim() && !columns.find(col => col.name === newColumnName.trim())) {
      setColumns([...columns, {
        name: newColumnName.trim(),
        type: 'string',
        nanPercentage: 0,
        addNoise: false,
        noiseLevel: 0,
        addOutliers: false,
        outlierPercentage: 0,
        numberType: 'integers'
      }]);
      setNewColumnName('');
    }
  };

  const removeColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index, updates) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], ...updates };
    setColumns(updatedColumns);
  };

  const generateFromTemplate = () => {
    const templates = {
      ecommerce: [
        { name: 'Customer_ID', type: 'string', nanPercentage: 0, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0 },
        { name: 'Name', type: 'string', nanPercentage: 2, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0 },
        { name: 'Age', type: 'number', minValue: 18, maxValue: 70, nanPercentage: 1, addNoise: true, noiseLevel: 2, addOutliers: true, outlierPercentage: 3, numberType: 'integers' },
        { name: 'Email', type: 'email', nanPercentage: 1, addNoise: false, noiseLevel: 0 },
        { name: 'Purchase_Amount', type: 'number', minValue: 10, maxValue: 1000, nanPercentage: 0, addNoise: true, noiseLevel: 5, addOutliers: true, outlierPercentage: 5, numberType: 'decimals' }
      ],
      financial: [
        { name: 'Account_ID', type: 'string', nanPercentage: 0, addNoise: false, noiseLevel: 0, addOutliers: false, outlierPercentage: 0 },
        { name: 'Balance', type: 'number', minValue: 0, maxValue: 100000, nanPercentage: 0, addNoise: true, noiseLevel: 3, addOutliers: true, outlierPercentage: 8, numberType: 'decimals' },
        { name: 'Transaction_Amount', type: 'number', minValue: -5000, maxValue: 5000, nanPercentage: 1, addNoise: true, noiseLevel: 4, addOutliers: true, outlierPercentage: 6, numberType: 'mixed' },
        { name: 'Credit_Score', type: 'number', minValue: 300, maxValue: 850, nanPercentage: 3, addNoise: true, noiseLevel: 2, addOutliers: true, outlierPercentage: 4, numberType: 'integers' }
      ]
    };

    if (selectedTemplate && templates[selectedTemplate]) {
      setColumns(templates[selectedTemplate]);
    }
  };

  const generateData = async () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const sampleData = Array.from({ length: rowCount }, (_, i) => {
        const row = {};
        columns.forEach(column => {
          if (Math.random() * 100 < column.nanPercentage) {
            row[column.name] = null;
            return;
          }

          let value;
          const isDistorted = distributionType === 'distorted';
          
          switch (column.type) {
            case 'string':
              value = `Sample ${column.name} ${i + 1}`;
              if (column.addNoise && Math.random() < column.noiseLevel / 100) {
                value += '_noisy';
              }
              break;
            case 'number':
              const min = column.minValue || 0;
              const max = column.maxValue || 100;
              
              if (isDistorted) {
                value = Math.random() < 0.7 
                  ? Math.random() * (max * 0.3 - min) + min 
                  : Math.random() * (max - min * 0.7) + min * 0.7;
              } else {
                value = Math.random() * (max - min) + min;
              }
              
              if (column.addNoise) {
                const noise = (Math.random() - 0.5) * column.noiseLevel;
                value += noise;
              }
              
              if (column.addOutliers && Math.random() * 100 < column.outlierPercentage) {
                value = Math.random() > 0.5 ? max * 2 : min / 2;
              }
              
              if (column.numberType === 'integers') {
                value = Math.round(value);
              } else if (column.numberType === 'decimals') {
                value = Math.round(value * 100) / 100;
              } else {
                value = Math.random() > 0.5 
                  ? Math.round(value) 
                  : Math.round(value * 100) / 100;
              }
              break;
            case 'email':
              value = `user${i + 1}@example.com`;
              if (column.addNoise && Math.random() < column.noiseLevel / 100) {
                value = `user${i + 1}@invalid`;
              }
              break;
            case 'date':
              value = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];
              break;
            case 'boolean':
              if (isDistorted) {
                value = Math.random() < 0.8;
              } else {
                value = Math.random() > 0.5;
              }
              if (column.addNoise && Math.random() < column.noiseLevel / 100) {
                value = null;
              }
              break;
            default:
              value = `${column.name} ${i + 1}`;
          }
          
          row[column.name] = value;
        });
        return row;
      });
      
      setGeneratedData(sampleData);
      setIsGenerating(false);
      toast({
        title: "Data Generated Successfully!",
        description: `Generated ${sampleData.length} rows with ${columns.length} columns.`,
      });
    }, 2000);
  };

  const downloadData = (format) => {
    if (generatedData.length === 0) {
      toast({
        title: "No Data to Download",
        description: "Please generate data first.",
        variant: "destructive",
      });
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'csv':
        content = [
          columns.map(col => col.name).join(','),
          ...generatedData.map(row => columns.map(col => row[col.name] || '').join(','))
        ].join('\n');
        filename = 'generated_data.csv';
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(generatedData, null, 2);
        filename = 'generated_data.json';
        mimeType = 'application/json';
        break;
      case 'txt':
        content = generatedData.map(row => 
          columns.map(col => `${col.name}: ${row[col.name] || 'N/A'}`).join(' | ')
        ).join('\n');
        filename = 'generated_data.txt';
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

    toast({
      title: "Download Started",
      description: `Your ${format.toUpperCase()} file is being downloaded.`,
    });
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
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dataset Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                    <TabsTrigger value="template">Templates</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="template" className="space-y-4">
                    <div>
                      <Label>Dataset Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasetTemplates.map(template => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <p className="text-sm text-gray-600 mt-2">
                          {datasetTemplates.find(t => t.value === selectedTemplate)?.description}
                        </p>
                      )}
                    </div>
                    <Button onClick={generateFromTemplate} disabled={!selectedTemplate} className="w-full">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Load Template
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="new-column">Add New Column</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="new-column"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Enter column name"
                          onKeyPress={(e) => e.key === 'Enter' && addColumn()}
                        />
                        <Button onClick={addColumn}>
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
                      value={rowCount}
                      onChange={(e) => setRowCount(parseInt(e.target.value) || 100)}
                      min="1"
                      max="10000"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Distribution Type</Label>
                    <Select value={distributionType} onValueChange={setDistributionType}>
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
                        : 'Noisy, distorted data for data cleaning practice'
                      }
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="custom-instructions">Custom Instructions</Label>
                    <Textarea
                      id="custom-instructions"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Any special requirements or patterns you want in the data"
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column Configuration */}
            {columns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Column Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto">
                  {columns.map((column, index) => (
                    <div key={index} className="border-1 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{column.name}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeColumn(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value) => updateColumn(index, { type: value })}
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
                                onValueChange={(value) => updateColumn(index, { numberType: value })}
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
                                onChange={(e) => updateColumn(index, { minValue: parseInt(e.target.value) })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Max Value</Label>
                              <Input
                                type="number"
                                value={column.maxValue || 100}
                                onChange={(e) => updateColumn(index, { maxValue: parseInt(e.target.value) })}
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <Label>Missing Values: {column.nanPercentage}%</Label>
                        <Slider
                          value={[column.nanPercentage]}
                          onValueChange={(value) => updateColumn(index, { nanPercentage: value[0] })}
                          max={50}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Add Noise</Label>
                        <Switch
                          checked={column.addNoise}
                          onCheckedChange={(checked) => updateColumn(index, { addNoise: checked })}
                        />
                      </div>

                      {column.addNoise && (
                        <div>
                          <Label>Noise Level: {column.noiseLevel}%</Label>
                          <Slider
                            value={[column.noiseLevel]}
                            onValueChange={(value) => updateColumn(index, { noiseLevel: value[0] })}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      )}

                      {(column.type === 'number') && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>Add Outliers</Label>
                            <Switch
                              checked={column.addOutliers}
                              onCheckedChange={(checked) => updateColumn(index, { addOutliers: checked })}
                            />
                          </div>

                          {column.addOutliers && (
                            <div>
                              <Label>Outlier Percentage: {column.outlierPercentage}%</Label>
                              <Slider
                                value={[column.outlierPercentage]}
                                onValueChange={(value) => updateColumn(index, { outlierPercentage: value[0] })}
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

            {/* Generation Controls */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={generateData}
                  disabled={isGenerating || columns.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {isGenerating ? 'Generating...' : 'Generate Data'}
                </Button>

                {generatedData.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Download Options</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadData('csv')}
                        className="flex-1 min-w-0"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadData('json')}
                        className="flex-1 min-w-0"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadData('txt')}
                        className="flex-1 min-w-0"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        TXT
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Generated Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data generated yet. Configure your columns and click "Generate Data".</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {columns.map((column, index) => (
                          <th key={index} className="border border-gray-300 p-2 text-left font-semibold">
                            {column.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedData.slice(0, 20).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {columns.map((column, colIndex) => (
                            <td key={colIndex} className="border border-gray-300 p-2">
                              {row[column.name] === null ? (
                                <span className="text-gray-400 italic">null</span>
                              ) : (
                                String(row[column.name])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedData.length > 20 && (
                    <p className="text-center text-gray-500 mt-4">
                      Showing first 20 rows of {generatedData.length} total rows
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
