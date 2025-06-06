// src/pages/Generate.jsx
import React, { useState } from "react";
import {
  Download,
  FileText,
  Database,
  Settings,
  Wand2,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/UI/Card";

// Make sure these are imported:
import { Label } from "../components/UI/Label";
import { Slider } from "../components/UI/Slider";
import { Switch } from "../components/UI/Switch";

const Generate = () => {
  const [columns, setColumns] = useState([
    {
      name: "Name",
      type: "string",
      nanPercentage: 0,
      addNoise: false,
      noiseLevel: 0,
      addOutliers: false,
      outlierPercentage: 0,
      numberType: "integers",
      minValue: 0,
      maxValue: 100,
    },
    {
      name: "Age",
      type: "number",
      nanPercentage: 0,
      addNoise: false,
      noiseLevel: 0,
      addOutliers: false,
      outlierPercentage: 0,
      numberType: "integers",
      minValue: 18,
      maxValue: 80,
    },
    {
      name: "Email",
      type: "email",
      nanPercentage: 0,
      addNoise: false,
      noiseLevel: 0,
      addOutliers: false,
      outlierPercentage: 0,
      numberType: "integers",
      minValue: 0,
      maxValue: 0,
    },
  ]);

  const [newColumnName, setNewColumnName] = useState("");
  const [rowCount, setRowCount] = useState(100);
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generatedData, setGeneratedData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const [distributionType, setDistributionType] = useState("balanced");

  const datasetTemplates = [
    {
      value: "ecommerce",
      label: "E-commerce Customer Data",
      description:
        "Customer profiles with purchase history, preferences, and demographics",
    },
    {
      value: "financial",
      label: "Financial Records",
      description: "Transaction data, account balances, and financial metrics",
    },
    {
      value: "healthcare",
      label: "Healthcare Data",
      description: "Patient records, medical metrics, and treatment information",
    },
    {
      value: "education",
      label: "Educational Data",
      description:
        "Student records, grades, courses, and academic performance",
    },
    {
      value: "marketing",
      label: "Marketing Analytics",
      description: "Campaign performance, user engagement, and conversion metrics",
    },
    {
      value: "iot",
      label: "IoT Sensor Data",
      description: "Time-series data from various sensors and devices",
    },
  ];

  const addColumn = () => {
    const trimmed = newColumnName.trim();
    if (
      trimmed &&
      !columns.find((col) => col.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setColumns([
        ...columns,
        {
          name: trimmed,
          type: "string",
          nanPercentage: 0,
          addNoise: false,
          noiseLevel: 0,
          addOutliers: false,
          outlierPercentage: 0,
          numberType: "integers",
          minValue: 0,
          maxValue: 100,
        },
      ]);
      setNewColumnName("");
    }
  };

  const removeColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index, updates) => {
    const copy = [...columns];
    copy[index] = { ...copy[index], ...updates };
    setColumns(copy);
  };

  const generateFromTemplate = () => {
    const templates = {
      ecommerce: [
        {
          name: "Customer_ID",
          type: "string",
          nanPercentage: 0,
          addNoise: false,
          noiseLevel: 0,
          addOutliers: false,
          outlierPercentage: 0,
          numberType: "integers",
          minValue: 0,
          maxValue: 0,
        },
        {
          name: "Name",
          type: "string",
          nanPercentage: 2,
          addNoise: false,
          noiseLevel: 0,
          addOutliers: false,
          outlierPercentage: 0,
          numberType: "integers",
          minValue: 0,
          maxValue: 0,
        },
        {
          name: "Age",
          type: "number",
          nanPercentage: 1,
          addNoise: true,
          noiseLevel: 2,
          addOutliers: true,
          outlierPercentage: 3,
          numberType: "integers",
          minValue: 18,
          maxValue: 70,
        },
        {
          name: "Email",
          type: "email",
          nanPercentage: 1,
          addNoise: false,
          noiseLevel: 0,
          addOutliers: false,
          outlierPercentage: 0,
          numberType: "integers",
          minValue: 0,
          maxValue: 0,
        },
        {
          name: "Purchase_Amount",
          type: "number",
          nanPercentage: 0,
          addNoise: true,
          noiseLevel: 5,
          addOutliers: true,
          outlierPercentage: 5,
          numberType: "decimals",
          minValue: 10,
          maxValue: 1000,
        },
      ],
      financial: [
        {
          name: "Account_ID",
          type: "string",
          nanPercentage: 0,
          addNoise: false,
          noiseLevel: 0,
          addOutliers: false,
          outlierPercentage: 0,
          numberType: "integers",
          minValue: 0,
          maxValue: 0,
        },
        {
          name: "Balance",
          type: "number",
          nanPercentage: 0,
          addNoise: true,
          noiseLevel: 3,
          addOutliers: true,
          outlierPercentage: 8,
          numberType: "decimals",
          minValue: 0,
          maxValue: 100000,
        },
        {
          name: "Transaction_Amount",
          type: "number",
          nanPercentage: 1,
          addNoise: true,
          noiseLevel: 4,
          addOutliers: true,
          outlierPercentage: 6,
          numberType: "mixed",
          minValue: -5000,
          maxValue: 5000,
        },
        {
          name: "Credit_Score",
          type: "number",
          nanPercentage: 3,
          addNoise: true,
          noiseLevel: 2,
          addOutliers: true,
          outlierPercentage: 4,
          numberType: "integers",
          minValue: 300,
          maxValue: 850,
        },
      ],
    };

    if (selectedTemplate && templates[selectedTemplate]) {
      setColumns(templates[selectedTemplate]);
    }
  };

  const generateData = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const data = Array.from({ length: rowCount }, (_, i) => {
        const row = {};
        columns.forEach((col) => {
          if (Math.random() * 100 < col.nanPercentage) {
            row[col.name] = null;
            return;
          }

          let val;
          const distorted = distributionType === "distorted";

          switch (col.type) {
            case "string":
              val = `Sample ${col.name} ${i + 1}`;
              if (col.addNoise && Math.random() < col.noiseLevel / 100) {
                val += "_noisy";
              }
              break;
            case "number":
              const min = col.minValue || 0;
              const max = col.maxValue || 100;
              if (distorted) {
                val =
                  Math.random() < 0.7
                    ? Math.random() * (max * 0.3 - min) + min
                    : Math.random() * (max - min * 0.7) + min * 0.7;
              } else {
                val = Math.random() * (max - min) + min;
              }
              if (col.addNoise) {
                const noise = (Math.random() - 0.5) * col.noiseLevel;
                val += noise;
              }
              if (
                col.addOutliers &&
                Math.random() * 100 < col.outlierPercentage
              ) {
                val = Math.random() > 0.5 ? max * 2 : min / 2;
              }
              if (col.numberType === "integers") {
                val = Math.round(val);
              } else if (col.numberType === "decimals") {
                val = Math.round(val * 100) / 100;
              } else {
                val =
                  Math.random() > 0.5
                    ? Math.round(val)
                    : Math.round(val * 100) / 100;
              }
              break;
            case "email":
              val = `user${i + 1}@example.com`;
              if (col.addNoise && Math.random() < col.noiseLevel / 100) {
                val = `user${i + 1}@invalid`;
              }
              break;
            case "date":
              val = new Date(
                Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0];
              break;
            case "boolean":
              val = distorted
                ? Math.random() < 0.8
                : Math.random() > 0.5;
              if (col.addNoise && Math.random() < col.noiseLevel / 100) {
                val = null;
              }
              break;
            default:
              val = `${col.name} ${i + 1}`;
          }
          row[col.name] = val;
        });
        return row;
      });

      setGeneratedData(data);
      setIsGenerating(false);
      window.alert(
        `Generated ${data.length} rows with ${columns.length} columns.`
      );
    }, 1000);
  };

  const downloadData = (format) => {
    if (!generatedData.length) {
      window.alert("No data to download. Generate data first.");
      return;
    }

    let content = "";
    let filename = "";
    let mime = "";

    if (format === "csv") {
      content = [
        columns.map((c) => c.name).join(","),
        ...generatedData.map((row) =>
          columns.map((c) => row[c.name] ?? "").join(",")
        ),
      ].join("\n");
      filename = "generated_data.csv";
      mime = "text/csv";
    } else if (format === "json") {
      content = JSON.stringify(generatedData, null, 2);
      filename = "generated_data.json";
      mime = "application/json";
    } else {
      content = generatedData
        .map((row) =>
          columns.map((c) => `${c.name}: ${row[c.name] ?? "N/A"}`).join(" | ")
        )
        .join("\n");
      filename = "generated_data.txt";
      mime = "text/plain";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    window.alert(`Your ${format.toUpperCase()} is downloading.`);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border border-gray-300 rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-2">Generate Your Dataset</h1>
          <p className="text-lg text-gray-600">
            Configure columns and parameters below to create a custom dataset.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Dataset Config Card */}
            <Card>
              <CardHeader>
                <CardTitle>Dataset Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tabs */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setActiveTab("manual")}
                    className={`flex-1 py-2 rounded ${
                      activeTab === "manual"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Manual Setup
                  </button>
                  <button
                    onClick={() => setActiveTab("template")}
                    className={`flex-1 py-2 rounded ${
                      activeTab === "template"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Templates
                  </button>
                </div>

                {activeTab === "template" ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Dataset Template</Label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                      >
                        <option value="">— Select a template —</option>
                        {datasetTemplates.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <p className="text-sm text-gray-600 mt-1">
                          {
                            datasetTemplates.find(
                              (t) => t.value === selectedTemplate
                            )?.description
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={generateFromTemplate}
                      disabled={!selectedTemplate}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
                    >
                      <Wand2 className="h-5 w-5" />
                      Load Template
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-column">Add New Column</Label>
                      <div className="flex space-x-2">
                        <input
                          id="new-column"
                          type="text"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" ? addColumn() : null
                          }
                          placeholder="Column name"
                          className="flex-1 border border-gray-300 p-2 rounded"
                        />
                        <button
                          onClick={addColumn}
                          className="bg-blue-600 text-white p-2 rounded"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="row-count">Number of Rows</Label>
                    <input
                      id="row-count"
                      type="number"
                      value={rowCount}
                      onChange={(e) => setRowCount(parseInt(e.target.value) || 0)}
                      min="1"
                      max="10000"
                      className="w-full border border-gray-300 p-2 rounded"
                    />
                  </div>

                  <div>
                    <Label>Distribution Type</Label>
                    <select
                      value={distributionType}
                      onChange={(e) => setDistributionType(e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded"
                    >
                      <option value="balanced">Balanced Dataset</option>
                      <option value="distorted">Distorted/Noisy Dataset</option>
                    </select>
                    <p className="text-sm text-gray-600 mt-1">
                      {distributionType === "balanced"
                        ? "Well-balanced data for standard training"
                        : "Noisy, distorted data for data-cleaning practice"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="custom-instructions">
                      Custom Instructions
                    </Label>
                    <textarea
                      id="custom-instructions"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Any special requirements or patterns…"
                      className="w-full border border-gray-300 p-2 rounded"
                      rows="3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column Settings Card */}
            {columns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span>Column Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-h-96 overflow-y-auto">
                  {columns.map((col, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 p-4 rounded-lg space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{col.name}</h4>
                        <button
                          onClick={() => removeColumn(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Data Type */}
                        <div>
                          <Label>Data Type</Label>
                          <select
                            value={col.type}
                            onChange={(e) =>
                              updateColumn(idx, { type: e.target.value })
                            }
                            className="w-full border border-gray-300 p-2 rounded"
                          >
                            <option value="string">Text</option>
                            <option value="number">Number</option>
                            <option value="email">Email</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>

                        {/* Number‐specific settings */}
                        {col.type === "number" && (
                          <>
                            <div>
                              <Label>Number Type</Label>
                              <select
                                value={col.numberType}
                                onChange={(e) =>
                                  updateColumn(idx, {
                                    numberType: e.target.value,
                                  })
                                }
                                className="w-full border border-gray-300 p-2 rounded"
                              >
                                <option value="integers">Integers Only</option>
                                <option value="decimals">Decimals Only</option>
                                <option value="mixed">Mixed</option>
                              </select>
                            </div>
                            <div>
                              <Label>Min Value</Label>
                              <input
                                type="number"
                                value={col.minValue}
                                onChange={(e) =>
                                  updateColumn(idx, {
                                    minValue: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full border border-gray-300 p-2 rounded"
                              />
                            </div>
                            <div>
                              <Label>Max Value</Label>
                              <input
                                type="number"
                                value={col.maxValue}
                                onChange={(e) =>
                                  updateColumn(idx, {
                                    maxValue: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full border border-gray-300 p-2 rounded"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Missing Values Slider */}
                      <div>
                        <Label>
                          Missing Values: {col.nanPercentage}%
                        </Label>
                        <Slider
                          value={[col.nanPercentage]}
                          onValueChange={(valArr) =>
                            updateColumn(idx, {
                              nanPercentage: valArr[0],
                            })
                          }
                          min={0}
                          max={50}
                          step={1}
                          className="mt-2"
                        />
                      </div>

                      {/* Add Noise Switch */}
                      <div className="flex items-center justify-between">
                        <Label>Add Noise</Label>
                        <Switch
                          checked={col.addNoise}
                          onCheckedChange={(checked) =>
                            updateColumn(idx, { addNoise: checked })
                          }
                          // <-- No extra className here,
                          //     so it will use its default colors:
                          //     data-[state=checked]:bg-primary, data-[state=unchecked]:bg-input
                        />
                      </div>

                      {/* Noise Level Slider (only if Add Noise is ON) */}
                      {col.addNoise && (
                        <div>
                          <Label>Noise Level: {col.noiseLevel}%</Label>
                          <Slider
                            value={[col.noiseLevel]}
                            onValueChange={(valArr) =>
                              updateColumn(idx, {
                                noiseLevel: valArr[0],
                              })
                            }
                            min={0}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      )}

                      {/* Add Outliers Switch */}
                      <div className="flex items-center justify-between">
                        <Label>Add Outliers</Label>
                        <Switch
                          checked={col.addOutliers}
                          onCheckedChange={(checked) =>
                            updateColumn(idx, { addOutliers: checked })
                          }
                        />
                      </div>

                      {/* Outlier Percentage Slider (only if Add Outliers is ON) */}
                      {col.addOutliers && (
                        <div>
                          <Label>
                            Outlier Percentage: {col.outlierPercentage}%
                          </Label>
                          <Slider
                            value={[col.outlierPercentage]}
                            onValueChange={(valArr) =>
                              updateColumn(idx, {
                                outlierPercentage: valArr[0],
                              })
                            }
                            min={0}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Generate & Download Controls */}
            <Card>
              <CardContent className="pt-6">
                <button
                  onClick={generateData}
                  disabled={isGenerating || columns.length === 0}
                  className="w-full h-11 rounded-md px-8 text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isGenerating ? "Generating..." : "Generate Data"}
                </button>

                {generatedData.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>Download Options</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadData("csv")}
                        className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-100"
                      >
                        <Download className="h-5 w-5" />
                        CSV
                      </button>
                      <button
                        onClick={() => downloadData("json")}
                        className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-100"
                      >
                        <FileText className="h-5 w-5" />
                        JSON
                      </button>
                      <button
                        onClick={() => downloadData("txt")}
                        className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-100"
                      >
                        <FileText className="h-5 w-5" />
                        TXT
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                  <Database className="h-12 w-12 mb-4 opacity-50" />
                  <p>No data generated yet. Configure columns and click “Generate Data.”</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {columns.map((col, i) => (
                          <th
                            key={i}
                            className="border border-gray-300 p-2 text-left font-semibold"
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedData.slice(0, 20).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {columns.map((col, colIndex) => (
                            <td
                              key={colIndex}
                              className="border border-gray-300 p-2"
                            >
                              {row[col.name] === null ? (
                                <span className="text-gray-400 italic">null</span>
                              ) : (
                                String(row[col.name])
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
