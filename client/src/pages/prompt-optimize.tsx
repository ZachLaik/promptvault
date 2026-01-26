import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo } from "@/lib/auth";
import type { Project, Prompt, PromptVersion, OptimizationDataset, PromptOptimization, OptimizationSettings, QAExample } from "@shared/schema";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Play,
  Upload,
  Download,
  Key,
  Sparkles,
  History,
  FileJson,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Settings,
  Edit3,
  Copy,
  MoreVertical,
  TrendingUp,
  GitCompare,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DatasetWithExamples extends Omit<OptimizationDataset, 'examples'> {
  examples: QAExample[];
}

interface OptimizationWithAuthor extends PromptOptimization {
  author: {
    id: number;
    username: string;
    email: string;
  };
}

interface OpenRouterKey {
  id: number;
  name: string;
  keyPrefix: string;
  isDefault: boolean;
  createdAt: string;
}

// Diff computation utilities
interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

function computeLineDiff(original: string, optimized: string): DiffSegment[] {
  const originalLines = original.split('\n');
  const optimizedLines = optimized.split('\n');
  const result: DiffSegment[] = [];

  // Simple line-by-line diff using LCS-like approach
  let i = 0, j = 0;

  while (i < originalLines.length || j < optimizedLines.length) {
    if (i >= originalLines.length) {
      // Remaining lines are additions
      result.push({ type: 'added', text: optimizedLines[j] });
      j++;
    } else if (j >= optimizedLines.length) {
      // Remaining lines are removals
      result.push({ type: 'removed', text: originalLines[i] });
      i++;
    } else if (originalLines[i] === optimizedLines[j]) {
      // Lines match
      result.push({ type: 'unchanged', text: originalLines[i] });
      i++;
      j++;
    } else {
      // Check if the original line exists later in optimized
      const foundInOptimized = optimizedLines.slice(j + 1).indexOf(originalLines[i]);
      const foundInOriginal = originalLines.slice(i + 1).indexOf(optimizedLines[j]);

      if (foundInOptimized !== -1 && (foundInOriginal === -1 || foundInOptimized <= foundInOriginal)) {
        // Line was added
        result.push({ type: 'added', text: optimizedLines[j] });
        j++;
      } else if (foundInOriginal !== -1) {
        // Line was removed
        result.push({ type: 'removed', text: originalLines[i] });
        i++;
      } else {
        // Line was changed (show as remove + add)
        result.push({ type: 'removed', text: originalLines[i] });
        result.push({ type: 'added', text: optimizedLines[j] });
        i++;
        j++;
      }
    }
  }

  return result;
}

// Diff display component
function DiffView({ original, optimized }: { original: string; optimized: string }) {
  const diff = computeLineDiff(original, optimized);

  return (
    <div className="font-mono text-sm border rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 border-b flex items-center gap-2">
        <GitCompare className="h-4 w-4" />
        <span className="font-medium">Changes</span>
        <span className="text-gray-500 text-xs ml-auto">
          {diff.filter(d => d.type === 'removed').length} removed, {diff.filter(d => d.type === 'added').length} added
        </span>
      </div>
      <div className="max-h-96 overflow-auto">
        {diff.map((segment, idx) => (
          <div
            key={idx}
            className={`px-3 py-0.5 whitespace-pre-wrap break-words ${
              segment.type === 'added'
                ? 'bg-green-50 text-green-800 border-l-4 border-green-500'
                : segment.type === 'removed'
                ? 'bg-red-50 text-red-800 border-l-4 border-red-500'
                : 'bg-white'
            }`}
          >
            <span className="inline-block w-5 text-gray-400 select-none">
              {segment.type === 'added' ? '+' : segment.type === 'removed' ? '-' : ' '}
            </span>
            {segment.text || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

// Score visualization component
function ScoreChart({ iterations, baselineScore }: { iterations: any[]; baselineScore: number }) {
  const maxScore = Math.max(baselineScore, ...iterations.map(i => i.optimizedScore || 0));
  const minScore = Math.min(baselineScore, ...iterations.map(i => i.optimizedScore || 0)) * 0.9;
  const range = maxScore - minScore || 0.1;

  const allPoints = [
    { label: 'Baseline', score: baselineScore },
    ...iterations.map((iter, idx) => ({ label: `Iter ${idx + 1}`, score: iter.optimizedScore || baselineScore }))
  ];

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-purple-600" />
        <span className="font-medium">Score Progression</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {allPoints.map((point, idx) => {
          const height = ((point.score - minScore) / range) * 100;
          const isBaseline = idx === 0;
          const isImprovement = point.score > baselineScore;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs font-medium">
                {(point.score * 100).toFixed(1)}%
              </div>
              <div
                className={`w-full rounded-t transition-all ${
                  isBaseline
                    ? 'bg-gray-400'
                    : isImprovement
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                }`}
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              <div className="text-xs text-gray-500 truncate w-full text-center">
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// OpenRouter model type
interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

// Hook to fetch all OpenRouter models
function useOpenRouterModels() {
  const { data: models = [], isLoading } = useQuery<OpenRouterModel[]>({
    queryKey: ["openrouter-models"],
    queryFn: async () => {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const data = await response.json();

      // Transform API response to our format
      return data.data.map((model: any) => {
        // Extract provider from model ID (e.g., "openai/gpt-4o" -> "OpenAI")
        const providerId = model.id.split("/")[0];
        const providerNames: Record<string, string> = {
          "openai": "OpenAI",
          "anthropic": "Anthropic",
          "google": "Google",
          "meta-llama": "Meta",
          "mistralai": "Mistral",
          "cohere": "Cohere",
          "deepseek": "DeepSeek",
          "qwen": "Qwen",
          "perplexity": "Perplexity",
          "amazon": "Amazon",
          "nvidia": "NVIDIA",
          "x-ai": "xAI",
          "minimax": "MiniMax",
          "bytedance-seed": "ByteDance",
          "allenai": "AllenAI",
          "liquid": "LiquidAI",
          "ibm-granite": "IBM",
        };

        return {
          id: model.id,
          name: model.name,
          provider: providerNames[providerId] || providerId,
          pricing: model.pricing,
        };
      });
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return { models, isLoading };
}

// Model search component with autocomplete - fetches all OpenRouter models
function ModelSearchSelect({
  value,
  onChange,
  placeholder = "Search or enter model ID..."
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { models, isLoading } = useOpenRouterModels();

  const filteredModels = models.filter(
    model =>
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.id.toLowerCase().includes(search.toLowerCase()) ||
      model.provider.toLowerCase().includes(search.toLowerCase())
  );

  const selectedModel = models.find(m => m.id === value);
  const displayValue = selectedModel ? selectedModel.name : value;

  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);

  // Sort providers alphabetically
  const sortedProviders = Object.keys(groupedModels).sort();

  return (
    <div className="relative">
      <div
        className="flex items-center border rounded-md px-3 py-2 cursor-text bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="flex-1 outline-none text-sm"
          placeholder={isOpen ? placeholder : displayValue || placeholder}
          value={isOpen ? search : ""}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on option
            setTimeout(() => {
              setIsOpen(false);
              setSearch("");
            }, 200);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search) {
              // Allow custom model ID
              onChange(search);
              setIsOpen(false);
              setSearch("");
            }
            if (e.key === "Escape") {
              setIsOpen(false);
              setSearch("");
            }
          }}
        />
        {!isOpen && displayValue && (
          <span className="text-sm text-gray-700">{displayValue}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-auto">
          {isLoading && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              Loading models...
            </div>
          )}
          {search && !filteredModels.some(m => m.id === search) && (
            <div
              className="px-3 py-2 text-sm hover:bg-purple-50 cursor-pointer border-b"
              onClick={() => {
                onChange(search);
                setIsOpen(false);
                setSearch("");
              }}
            >
              Use custom: <span className="font-mono text-purple-600">{search}</span>
            </div>
          )}
          {sortedProviders.map((provider) => (
            <div key={provider}>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0 z-10">
                {provider} ({groupedModels[provider].length})
              </div>
              {groupedModels[provider].map((model) => (
                <div
                  key={model.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 ${
                    value === model.id ? 'bg-purple-100 text-purple-700' : ''
                  }`}
                  onClick={() => {
                    onChange(model.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{model.id}</div>
                </div>
              ))}
            </div>
          ))}
          {!isLoading && filteredModels.length === 0 && !search && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              Type to search {models.length} models or enter a custom model ID
            </div>
          )}
          {!isLoading && filteredModels.length === 0 && search && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No models match "{search}" - press Enter to use as custom ID
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const OPTIMIZERS = [
  {
    value: "bootstrap",
    label: "Bootstrap Few-Shot",
    description: "Basic few-shot learning with demonstrations",
    recommendation: "Good starting point for most prompts",
    whenToUse: "When you have quality examples and want quick results"
  },
  {
    value: "bootstrap_random",
    label: "Bootstrap Random Search",
    description: "Random search over demonstration combinations",
    recommendation: "Better exploration of example space",
    whenToUse: "When bootstrap alone doesn't improve enough"
  },
  {
    value: "mipro",
    label: "MIPRO (Recommended)",
    description: "Multi-stage Instruction Proposal and Optimization",
    recommendation: "Best for instruction-heavy prompts",
    whenToUse: "When your prompt needs better instructions, not just examples"
  },
  {
    value: "copro",
    label: "COPRO",
    description: "Coordinate-based Prompt Optimization",
    recommendation: "Most thorough but slowest",
    whenToUse: "When you need maximum optimization and have time"
  },
];

const METRICS = [
  {
    value: "exact",
    label: "Exact Match",
    description: "Requires exact string match",
    whenToUse: "For classification, yes/no answers, or structured outputs"
  },
  {
    value: "contains",
    label: "Contains",
    description: "Answer contains expected text",
    whenToUse: "When key phrases matter more than exact format"
  },
  {
    value: "semantic",
    label: "Semantic Similarity",
    description: "Embedding-based similarity",
    whenToUse: "For open-ended generation where meaning matters"
  },
  {
    value: "llm_judge",
    label: "LLM Judge (Recommended)",
    description: "Uses LLM to evaluate quality",
    whenToUse: "Best for complex outputs like summaries, analysis, creative writing"
  },
  {
    value: "llm_judge_strict",
    label: "LLM Judge (Strict)",
    description: "Stricter LLM evaluation",
    whenToUse: "When you need high precision and can accept lower recall"
  },
  {
    value: "combined",
    label: "Combined",
    description: "Mix of exact, contains, and semantic",
    whenToUse: "Balanced approach for mixed output types"
  },
];

export default function PromptOptimize() {
  const { projectId, promptSlug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("datasets");
  const [selectedDataset, setSelectedDataset] = useState<DatasetWithExamples | null>(null);
  const [showNewDatasetDialog, setShowNewDatasetDialog] = useState(false);
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);

  // New dataset form
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [newExamples, setNewExamples] = useState<QAExample[]>([{ question: "", answer: "" }]);

  // New API key form
  const [newKeyName, setNewKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  // Optimization settings
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [settings, setSettings] = useState<OptimizationSettings>({
    model: "openai/gpt-4o-mini",
    judgeModel: "openai/gpt-4o",
    optimizer: "bootstrap",
    metric: "llm_judge",
    maxIterations: 3,
    trials: 5,
    demos: 3,
  });

  // Latest run result
  const [latestResult, setLatestResult] = useState<any>(null);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // API returns prompt with content directly (not nested under latestVersion)
  const { data: prompt } = useQuery<Prompt & { content?: string; version?: number; message?: string }>({
    queryKey: [`/api/prompts/${promptSlug}`, project?.slug],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/prompts/${promptSlug}?projectSlug=${project?.slug}`);
      return response.json();
    },
    enabled: !!project?.slug && !!promptSlug,
  });

  const { data: datasets = [], isLoading: datasetsLoading } = useQuery<DatasetWithExamples[]>({
    queryKey: [`/api/prompts/${promptSlug}/datasets`, project?.slug],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/prompts/${promptSlug}/datasets?projectSlug=${project?.slug}`);
      return response.json();
    },
    enabled: !!project?.slug && !!promptSlug,
  });

  const { data: optimizations = [], isLoading: optimizationsLoading } = useQuery<OptimizationWithAuthor[]>({
    queryKey: [`/api/prompts/${promptSlug}/optimizations`, project?.slug],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/prompts/${promptSlug}/optimizations?projectSlug=${project?.slug}`);
      return response.json();
    },
    enabled: !!project?.slug && !!promptSlug,
  });

  const { data: openrouterKeys = [] } = useQuery<OpenRouterKey[]>({
    queryKey: ["/api/openrouter-keys"],
  });

  // Set default key when keys load
  useEffect(() => {
    if (openrouterKeys.length > 0 && !selectedKeyId) {
      const defaultKey = openrouterKeys.find(k => k.isDefault) || openrouterKeys[0];
      setSelectedKeyId(defaultKey.id);
    }
  }, [openrouterKeys, selectedKeyId]);

  const createDatasetMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; examples: QAExample[] }) => {
      const response = await apiRequest("POST", `/api/prompts/${promptSlug}/datasets`, {
        projectSlug: project?.slug,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${promptSlug}/datasets`] });
      setShowNewDatasetDialog(false);
      setNewDatasetName("");
      setNewDatasetDescription("");
      setNewExamples([{ question: "", answer: "" }]);
      toast({ title: "Dataset created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create dataset", description: error.message, variant: "destructive" });
    },
  });

  const updateDatasetMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; description?: string; examples?: QAExample[] }) => {
      const response = await apiRequest("PUT", `/api/datasets/${id}`, {
        projectSlug: project?.slug,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${promptSlug}/datasets`] });
      toast({ title: "Dataset updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update dataset", description: error.message, variant: "destructive" });
    },
  });

  const deleteDatasetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/datasets/${id}?projectSlug=${project?.slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${promptSlug}/datasets`] });
      setSelectedDataset(null);
      toast({ title: "Dataset deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete dataset", description: error.message, variant: "destructive" });
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: async (data: { name: string; apiKey: string }) => {
      const response = await apiRequest("POST", "/api/openrouter-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrouter-keys"] });
      setShowAddKeyDialog(false);
      setNewKeyName("");
      setNewApiKey("");
      setSelectedKeyId(data.id);
      toast({ title: "API key added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add API key", description: error.message, variant: "destructive" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/openrouter-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrouter-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  const runOptimizationMutation = useMutation({
    mutationFn: async (data: { datasetId: number; settings: OptimizationSettings; keyId: number }) => {
      const response = await apiRequest("POST", `/api/prompts/${promptSlug}/optimize-with-key`, {
        projectSlug: project?.slug,
        content: prompt?.content || "",
        datasetId: data.datasetId,
        settings: data.settings,
        keyId: data.keyId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${promptSlug}/optimizations`] });
      setLatestResult(data);
      setIsRunning(false);
      setShowRunDialog(false);
      setActiveTab("history");
      toast({ title: "Optimization completed!", description: `Score improved from ${(data.baselineScore * 100).toFixed(1)}% to ${(data.optimizedScore * 100).toFixed(1)}%` });
    },
    onError: (error: any) => {
      setIsRunning(false);
      toast({ title: "Optimization failed", description: error.message, variant: "destructive" });
    },
  });

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        let examples: QAExample[] = [];

        if (Array.isArray(parsed)) {
          examples = parsed.map((item: any) => ({
            question: item.question || item.q || item.input || "",
            answer: item.answer || item.a || item.output || item.expected || "",
          })).filter((ex: QAExample) => ex.question && ex.answer);
        } else if (parsed.examples && Array.isArray(parsed.examples)) {
          examples = parsed.examples.map((item: any) => ({
            question: item.question || item.q || item.input || "",
            answer: item.answer || item.a || item.output || item.expected || "",
          })).filter((ex: QAExample) => ex.question && ex.answer);
        }

        if (examples.length === 0) {
          toast({ title: "No valid examples found", description: "JSON should contain an array of {question, answer} objects", variant: "destructive" });
          return;
        }

        if (selectedDataset) {
          updateDatasetMutation.mutate({
            id: selectedDataset.id,
            examples: [...selectedDataset.examples, ...examples],
          });
        } else {
          setNewExamples([...newExamples.filter(ex => ex.question || ex.answer), ...examples]);
        }

        toast({ title: `Imported ${examples.length} examples` });
      } catch (error) {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExportJson = (dataset: DatasetWithExamples) => {
    const json = JSON.stringify(dataset.examples, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, "-")}-examples.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunOptimization = () => {
    if (!selectedDataset) {
      toast({ title: "Please select a dataset first", variant: "destructive" });
      return;
    }
    if (!selectedKeyId) {
      toast({ title: "Please add an OpenRouter API key first", variant: "destructive" });
      return;
    }
    if (selectedDataset.examples.length < 3) {
      toast({ title: "Dataset must have at least 3 examples", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setRunProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setRunProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 1000);

    runOptimizationMutation.mutate({
      datasetId: selectedDataset.id,
      settings,
      keyId: selectedKeyId,
    }, {
      onSettled: () => {
        clearInterval(interval);
        setRunProgress(100);
      },
    });
  };

  const addExampleToDataset = () => {
    if (selectedDataset) {
      updateDatasetMutation.mutate({
        id: selectedDataset.id,
        examples: [...selectedDataset.examples, { question: "", answer: "" }],
      });
    }
  };

  const updateExampleInDataset = (index: number, field: "question" | "answer", value: string) => {
    if (selectedDataset) {
      const updatedExamples = [...selectedDataset.examples];
      updatedExamples[index] = { ...updatedExamples[index], [field]: value };
      // Debounced update - we'll update local state immediately and sync later
      setSelectedDataset({ ...selectedDataset, examples: updatedExamples });
    }
  };

  const saveDatasetExamples = () => {
    if (selectedDataset) {
      updateDatasetMutation.mutate({
        id: selectedDataset.id,
        examples: selectedDataset.examples.filter(ex => ex.question.trim() && ex.answer.trim()),
      });
    }
  };

  const removeExampleFromDataset = (index: number) => {
    if (selectedDataset) {
      const updatedExamples = selectedDataset.examples.filter((_, i) => i !== index);
      updateDatasetMutation.mutate({
        id: selectedDataset.id,
        examples: updatedExamples,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/projects" className="hover:text-gray-700">Projects</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/projects/${projectId}`} className="hover:text-gray-700">{project?.name || projectId}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/projects/${projectId}/prompts/${promptSlug}/edit`} className="hover:text-gray-700">{prompt?.title || promptSlug}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Optimize</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Prompt Optimization
            </h1>
            <p className="text-gray-500 mt-1">
              Improve your prompt using DSPy-style optimization with Q&A examples
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAddKeyDialog(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              {openrouterKeys.length > 0 ? "Manage Keys" : "Add API Key"}
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowRunDialog(true)}
              disabled={!selectedDataset || !selectedKeyId || isRunning}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Optimization
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="datasets" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Datasets
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Dataset List */}
              <Card className="col-span-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Datasets</CardTitle>
                    <Button size="sm" onClick={() => setShowNewDatasetDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {datasetsLoading ? (
                      <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : datasets.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>No datasets yet</p>
                        <p className="text-sm mt-1">Create a dataset with Q&A examples to optimize your prompt</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {datasets.map((dataset) => (
                          <div
                            key={dataset.id}
                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedDataset?.id === dataset.id ? "bg-purple-50 border-l-2 border-purple-500" : ""
                            }`}
                            onClick={() => setSelectedDataset(dataset)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{dataset.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {dataset.examples.length} examples
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleExportJson(dataset)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export JSON
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => deleteDatasetMutation.mutate(dataset.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Dataset Editor */}
              <Card className="col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedDataset ? selectedDataset.name : "Q&A Examples"}
                      </CardTitle>
                      <CardDescription>
                        {selectedDataset
                          ? selectedDataset.description || "Add question-answer pairs for optimization"
                          : "Select a dataset to edit examples"}
                      </CardDescription>
                    </div>
                    {selectedDataset && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".json"
                          onChange={handleImportJson}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-1" />
                          Import JSON
                        </Button>
                        <Button variant="outline" size="sm" onClick={saveDatasetExamples}>
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedDataset ? (
                    <ScrollArea className="h-[450px] pr-4">
                      <div className="space-y-4">
                        {selectedDataset.examples.map((example, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Example {index + 1}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExampleFromDataset(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Question / Input</Label>
                              <Textarea
                                value={example.question}
                                onChange={(e) => updateExampleInDataset(index, "question", e.target.value)}
                                placeholder="Enter the question or input..."
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Expected Answer / Output</Label>
                              <Textarea
                                value={example.answer}
                                onChange={(e) => updateExampleInDataset(index, "answer", e.target.value)}
                                placeholder="Enter the expected answer..."
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full" onClick={addExampleToDataset}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Example
                        </Button>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[450px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <FileJson className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Select a dataset from the list or create a new one</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Strategy Guide */}
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Optimization Strategy Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="font-semibold text-purple-700 mb-1">For Best Results:</div>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Use <strong>MIPRO</strong> optimizer for instruction-heavy prompts</li>
                      <li>• Use <strong>LLM Judge</strong> metric for open-ended tasks</li>
                      <li>• Provide 5-10 diverse Q&A examples</li>
                    </ul>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="font-semibold text-purple-700 mb-1">Model Selection:</div>
                    <ul className="text-gray-600 space-y-1">
                      <li>• <strong>Primary</strong>: Use the same model you'll deploy with</li>
                      <li>• <strong>Judge</strong>: Use a stronger model (GPT-4o, Claude 3.5)</li>
                      <li>• Cheaper models can work for simple tasks</li>
                    </ul>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="font-semibold text-purple-700 mb-1">If Optimization Fails:</div>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Add more diverse examples (different edge cases)</li>
                      <li>• Try a different optimizer (MIPRO → COPRO)</li>
                      <li>• Increase max iterations to 5-10</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Configuration</CardTitle>
                  <CardDescription>Choose the models for optimization and evaluation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Primary Model</Label>
                    <div className="mt-1">
                      <ModelSearchSelect
                        value={settings.model}
                        onChange={(v) => setSettings({ ...settings, model: v })}
                        placeholder="Search models or enter custom ID..."
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Model used for generating responses during optimization</p>
                  </div>

                  <div>
                    <Label>Judge Model (for LLM metrics)</Label>
                    <div className="mt-1">
                      <ModelSearchSelect
                        value={settings.judgeModel || ""}
                        onChange={(v) => setSettings({ ...settings, judgeModel: v })}
                        placeholder="Same as primary (or search...)"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Model for evaluating quality. <strong>Tip:</strong> Use GPT-4o or Claude 3.5 Sonnet for best judgment.
                    </p>
                  </div>

                  <div>
                    <Label>OpenRouter API Key</Label>
                    <Select value={selectedKeyId?.toString() || ""} onValueChange={(v) => setSelectedKeyId(parseInt(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select API key" />
                      </SelectTrigger>
                      <SelectContent>
                        {openrouterKeys.map((key) => (
                          <SelectItem key={key.id} value={key.id.toString()}>
                            {key.name} ({key.keyPrefix})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {openrouterKeys.length === 0 && (
                      <Button variant="link" className="p-0 h-auto mt-1" onClick={() => setShowAddKeyDialog(true)}>
                        Add an API key to get started
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Strategy</CardTitle>
                  <CardDescription>Configure the optimization algorithm and evaluation metric</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Optimizer</Label>
                    <Select value={settings.optimizer} onValueChange={(v: any) => setSettings({ ...settings, optimizer: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTIMIZERS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-gray-500 text-xs">{opt.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {settings.optimizer && (
                      <p className="text-xs text-purple-600 mt-1">
                        {OPTIMIZERS.find(o => o.value === settings.optimizer)?.whenToUse}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Evaluation Metric</Label>
                    <Select value={settings.metric} onValueChange={(v: any) => setSettings({ ...settings, metric: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRICS.map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{metric.label}</span>
                              <span className="text-gray-500 text-xs">{metric.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {settings.metric && (
                      <p className="text-xs text-purple-600 mt-1">
                        {METRICS.find(m => m.value === settings.metric)?.whenToUse}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Max Iterations</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={settings.maxIterations}
                        onChange={(e) => setSettings({ ...settings, maxIterations: parseInt(e.target.value) || 3 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Trials</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={settings.trials}
                        onChange={(e) => setSettings({ ...settings, trials: parseInt(e.target.value) || 5 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Demo Count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={settings.demos}
                        onChange={(e) => setSettings({ ...settings, demos: parseInt(e.target.value) || 3 })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization History</CardTitle>
                <CardDescription>View past optimization runs and their results</CardDescription>
              </CardHeader>
              <CardContent>
                {optimizationsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : optimizations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No optimization runs yet</p>
                    <p className="text-sm mt-1">Run an optimization to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {optimizations.map((opt) => {
                      const iterations = opt.iterations ? JSON.parse(opt.iterations) : [];
                      const qaExamples = JSON.parse(opt.qaExamples);
                      const optSettings = JSON.parse(opt.settings);
                      const baselineScore = parseFloat(opt.baselineScore || "0");
                      const optimizedScore = parseFloat(opt.optimizedScore || "0");
                      const improvement = optimizedScore - baselineScore;

                      return (
                        <Card key={opt.id} className="border">
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(opt.status)}
                                <div>
                                  <div className="font-medium text-lg">
                                    Run #{opt.id}
                                    <span className="text-gray-500 font-normal ml-2 text-sm">
                                      {formatTimeAgo(opt.createdAt)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {optSettings.optimizer} | {optSettings.metric} | {qaExamples.length} examples
                                  </div>
                                </div>
                              </div>

                              {opt.status === "completed" && opt.optimizedContent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(opt.optimizedContent || "");
                                    toast({ title: "Copied optimized prompt to clipboard" });
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy Result
                                </Button>
                              )}

                              {opt.status === "failed" && (
                                <Badge variant="destructive">{opt.errorMessage}</Badge>
                              )}
                            </div>

                            {opt.status === "completed" && (
                              <>
                                {/* Score Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-gray-500 mb-1">Baseline Score</div>
                                    <div className="text-2xl font-bold text-gray-700">
                                      {(baselineScore * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className="bg-green-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-green-600 mb-1">Optimized Score</div>
                                    <div className="text-2xl font-bold text-green-700">
                                      {(optimizedScore * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className={`rounded-lg p-4 text-center ${improvement > 0 ? 'bg-purple-50' : 'bg-yellow-50'}`}>
                                    <div className={`text-sm mb-1 ${improvement > 0 ? 'text-purple-600' : 'text-yellow-600'}`}>
                                      Improvement
                                    </div>
                                    <div className={`text-2xl font-bold ${improvement > 0 ? 'text-purple-700' : 'text-yellow-700'}`}>
                                      {improvement > 0 ? '+' : ''}{(improvement * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </div>

                                {/* Score Progression Chart */}
                                {iterations.length > 0 && (
                                  <div className="mb-6">
                                    <ScoreChart iterations={iterations} baselineScore={baselineScore} />
                                  </div>
                                )}

                                {/* Diff View */}
                                {opt.optimizedContent && opt.originalContent && (
                                  <details className="mb-4 group">
                                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2">
                                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                      <GitCompare className="h-4 w-4" />
                                      View Changes (Diff)
                                    </summary>
                                    <div className="mt-2">
                                      <DiffView original={opt.originalContent} optimized={opt.optimizedContent} />
                                    </div>
                                  </details>
                                )}

                                {/* Full Optimized Prompt */}
                                {opt.optimizedContent && (
                                  <details className="group">
                                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2">
                                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                      <Eye className="h-4 w-4" />
                                      View Full Optimized Prompt
                                    </summary>
                                    <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-64 mt-2 whitespace-pre-wrap">
                                      {opt.optimizedContent}
                                    </pre>
                                  </details>
                                )}
                              </>
                            )}

                            {/* Iterations Detail (for running or completed) */}
                            {iterations.length > 0 && (
                              <details className="mt-4 pt-4 border-t group">
                                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                  <History className="h-4 w-4" />
                                  Iteration Details ({iterations.length} iterations)
                                </summary>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                                  {iterations.map((iter: any, i: number) => {
                                    const iterScore = iter.optimizedScore || 0;
                                    const prevScore = i === 0 ? baselineScore : (iterations[i - 1]?.optimizedScore || baselineScore);
                                    const delta = iterScore - prevScore;
                                    return (
                                      <div key={i} className="bg-white p-3 rounded-lg text-sm border hover:border-purple-300 transition-colors">
                                        <div className="font-medium text-gray-800">Iteration {iter.iteration || i + 1}</div>
                                        <div className="text-lg font-bold text-purple-600">
                                          {(iterScore * 100).toFixed(1)}%
                                        </div>
                                        <div className={`text-xs ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                          {delta > 0 ? '+' : ''}{(delta * 100).toFixed(2)}% from prev
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* New Dataset Dialog */}
      <Dialog open={showNewDatasetDialog} onOpenChange={setShowNewDatasetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Dataset</DialogTitle>
            <DialogDescription>
              Create a dataset with Q&A examples for optimizing your prompt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Dataset Name</Label>
              <Input
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                placeholder="e.g., Customer Support Examples"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newDatasetDescription}
                onChange={(e) => setNewDatasetDescription(e.target.value)}
                placeholder="What is this dataset for?"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Q&A Examples</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                    id="import-json-new"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("import-json-new")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import JSON
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-3">
                <div className="space-y-3">
                  {newExamples.map((example, index) => (
                    <div key={index} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        {newExamples.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewExamples(newExamples.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder="Question / Input"
                        value={example.question}
                        onChange={(e) => {
                          const updated = [...newExamples];
                          updated[index].question = e.target.value;
                          setNewExamples(updated);
                        }}
                        rows={2}
                      />
                      <Textarea
                        placeholder="Expected Answer / Output"
                        value={example.answer}
                        onChange={(e) => {
                          const updated = [...newExamples];
                          updated[index].answer = e.target.value;
                          setNewExamples(updated);
                        }}
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setNewExamples([...newExamples, { question: "", answer: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Example
                  </Button>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDatasetDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const validExamples = newExamples.filter(ex => ex.question.trim() && ex.answer.trim());
                if (validExamples.length < 1) {
                  toast({ title: "Add at least one valid example", variant: "destructive" });
                  return;
                }
                createDatasetMutation.mutate({
                  name: newDatasetName || "Untitled Dataset",
                  description: newDatasetDescription,
                  examples: validExamples,
                });
              }}
              disabled={createDatasetMutation.isPending}
            >
              Create Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add API Key Dialog */}
      <Dialog open={showAddKeyDialog} onOpenChange={setShowAddKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OpenRouter API Keys</DialogTitle>
            <DialogDescription>
              Manage your OpenRouter API keys for running optimizations
            </DialogDescription>
          </DialogHeader>

          {openrouterKeys.length > 0 && (
            <div className="space-y-2 mb-4">
              {openrouterKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-gray-500">{key.keyPrefix}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isDefault && <Badge>Default</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteKeyMutation.mutate(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-4 pt-4">
            <div>
              <Label>Key Name</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Personal Key"
                className="mt-1"
              />
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Get your API key from{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  openrouter.ai/keys
                </a>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddKeyDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!newKeyName.trim() || !newApiKey.trim()) {
                  toast({ title: "Name and API key are required", variant: "destructive" });
                  return;
                }
                addKeyMutation.mutate({ name: newKeyName, apiKey: newApiKey });
              }}
              disabled={addKeyMutation.isPending}
            >
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Optimization Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Optimization</DialogTitle>
            <DialogDescription>
              Confirm settings before starting the optimization
            </DialogDescription>
          </DialogHeader>

          {isRunning ? (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500 animate-pulse" />
                <p className="font-medium">Optimizing your prompt...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a few minutes</p>
              </div>
              <Progress value={runProgress} className="h-2" />
              <p className="text-center text-sm text-gray-500">{Math.round(runProgress)}% complete</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dataset:</span>
                  <span className="font-medium">{selectedDataset?.name || "None selected"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Examples:</span>
                  <span className="font-medium">{selectedDataset?.examples.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Model:</span>
                  <span className="font-medium">{settings.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Optimizer:</span>
                  <span className="font-medium">{OPTIMIZERS.find(o => o.value === settings.optimizer)?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Metric:</span>
                  <span className="font-medium">{METRICS.find(m => m.value === settings.metric)?.label}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRunDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleRunOptimization}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Optimization
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
