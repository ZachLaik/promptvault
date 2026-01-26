/**
 * Prompt Optimizer Service
 *
 * This service implements DSPy-style prompt optimization using the OpenRouter API.
 * It evaluates prompts against Q&A examples and iteratively improves them.
 */

import type { QAExample, OptimizationSettings, OptimizationIteration } from "@shared/schema";

interface JudgeResult {
  question: string;
  expectedAnswer: string;
  predictedAnswer: string;
  score: number;
  reasoning?: string;
}

interface OptimizationResult {
  optimizedContent: string;
  baselineScore: number;
  optimizedScore: number;
  iterations: OptimizationIteration[];
  judgeRemarks: JudgeResult[];
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://promptvault.app",
      "X-Title": "PromptVault Optimizer",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Generate a response using the prompt
 */
async function generateResponse(
  apiKey: string,
  model: string,
  promptContent: string,
  question: string
): Promise<string> {
  const messages = [
    { role: "system", content: promptContent },
    { role: "user", content: question },
  ];

  return callOpenRouter(apiKey, model, messages, 0.3);
}

/**
 * LLM-as-a-Judge evaluation
 */
async function evaluateWithLLMJudge(
  apiKey: string,
  judgeModel: string,
  question: string,
  expectedAnswer: string,
  predictedAnswer: string,
  strict: boolean = false
): Promise<{ score: number; reasoning: string }> {
  const judgePrompt = strict
    ? `You are a strict evaluator. Determine if the predicted answer is factually equivalent to the expected answer.

Question: ${question}
Expected Answer: ${expectedAnswer}
Predicted Answer: ${predictedAnswer}

Respond with a JSON object containing:
- "is_correct": true or false
- "reasoning": brief explanation

Only respond with the JSON object, nothing else.`
    : `You are an expert evaluator. Score how well the predicted answer matches the expected answer.

Question: ${question}
Expected Answer: ${expectedAnswer}
Predicted Answer: ${predictedAnswer}

Consider:
1. Factual correctness
2. Completeness
3. Relevance

Respond with a JSON object containing:
- "score": a number from 0.0 to 1.0 (1.0 = perfect match)
- "reasoning": brief explanation of the score

Only respond with the JSON object, nothing else.`;

  const response = await callOpenRouter(apiKey, judgeModel, [
    { role: "user", content: judgePrompt }
  ], 0.1);

  try {
    // Try to parse JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (strict) {
        return {
          score: parsed.is_correct ? 1.0 : 0.0,
          reasoning: parsed.reasoning || "",
        };
      }
      return {
        score: Math.max(0, Math.min(1, parseFloat(parsed.score) || 0)),
        reasoning: parsed.reasoning || "",
      };
    }
  } catch (e) {
    // Fallback parsing
  }

  return { score: 0.5, reasoning: "Unable to parse judge response" };
}

/**
 * Simple string-based metrics
 */
function exactMatchMetric(expected: string, predicted: string): number {
  return expected.toLowerCase().trim() === predicted.toLowerCase().trim() ? 1.0 : 0.0;
}

function containsMetric(expected: string, predicted: string): number {
  const exp = expected.toLowerCase().trim();
  const pred = predicted.toLowerCase().trim();
  return exp.includes(pred) || pred.includes(exp) ? 1.0 : 0.0;
}

function semanticSimilarity(expected: string, predicted: string): number {
  const tokenize = (text: string) => new Set(text.toLowerCase().split(/\s+/));
  const expTokens = tokenize(expected);
  const predTokens = tokenize(predicted);

  const intersection = new Set([...expTokens].filter(x => predTokens.has(x)));
  const union = new Set([...expTokens, ...predTokens]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

function combinedMetric(expected: string, predicted: string): number {
  if (exactMatchMetric(expected, predicted) === 1.0) return 1.0;
  if (containsMetric(expected, predicted) === 1.0) return 0.7;
  return semanticSimilarity(expected, predicted) * 0.5;
}

/**
 * Evaluate a prompt against all examples
 */
async function evaluatePrompt(
  apiKey: string,
  model: string,
  judgeModel: string | undefined,
  promptContent: string,
  examples: QAExample[],
  metric: string
): Promise<{ score: number; remarks: JudgeResult[] }> {
  const remarks: JudgeResult[] = [];
  let totalScore = 0;

  for (const example of examples) {
    const predictedAnswer = await generateResponse(apiKey, model, promptContent, example.question);

    let score: number;
    let reasoning: string | undefined;

    if (metric === "llm_judge" || metric === "llm_judge_strict") {
      const judge = await evaluateWithLLMJudge(
        apiKey,
        judgeModel || model,
        example.question,
        example.answer,
        predictedAnswer,
        metric === "llm_judge_strict"
      );
      score = judge.score;
      reasoning = judge.reasoning;
    } else if (metric === "exact") {
      score = exactMatchMetric(example.answer, predictedAnswer);
    } else if (metric === "contains") {
      score = containsMetric(example.answer, predictedAnswer);
    } else if (metric === "semantic") {
      score = semanticSimilarity(example.answer, predictedAnswer);
    } else {
      score = combinedMetric(example.answer, predictedAnswer);
    }

    remarks.push({
      question: example.question,
      expectedAnswer: example.answer,
      predictedAnswer,
      score,
      reasoning,
    });

    totalScore += score;
  }

  return {
    score: examples.length > 0 ? totalScore / examples.length : 0,
    remarks,
  };
}

/**
 * Generate optimized prompt using LLM
 */
async function generateOptimizedPrompt(
  apiKey: string,
  model: string,
  originalPrompt: string,
  examples: QAExample[],
  currentRemarks: JudgeResult[],
  iteration: number
): Promise<string> {
  // Find examples where the model performed poorly (threshold at 0.9 for stricter improvement)
  const poorPerformers = currentRemarks.filter(r => r.score < 0.9);

  // Calculate average score to understand current performance
  const avgScore = currentRemarks.reduce((sum, r) => sum + r.score, 0) / currentRemarks.length;

  const optimizationPrompt = `You are an expert prompt engineer specializing in DSPy-style prompt optimization. Your task is to SIGNIFICANTLY IMPROVE the following prompt to achieve near-perfect scores on the Q&A examples.

CURRENT PROMPT (to be improved):
---
${originalPrompt}
---

TARGET Q&A EXAMPLES (the optimized prompt MUST handle these perfectly):
${examples.map((e, i) => `Example ${i + 1}:
  Input: ${e.question}
  Required Output: ${e.answer}`).join('\n\n')}

CURRENT PERFORMANCE:
- Average Score: ${(avgScore * 100).toFixed(1)}%
- Iteration: ${iteration}

${poorPerformers.length > 0 ? `
CRITICAL ISSUES TO FIX (model did not produce perfect outputs):
${poorPerformers.map(r => `
❌ Question: "${r.question}"
   Expected: "${r.expectedAnswer}"
   Actual: "${r.predictedAnswer}"
   Score: ${(r.score * 100).toFixed(0)}%
   ${r.reasoning ? `Feedback: ${r.reasoning}` : ''}`).join('\n')}
` : 'All examples scored well, but aim for 100% accuracy.'}

YOUR TASK:
Rewrite the prompt to:
1. Ensure the model produces EXACTLY the expected output format
2. Add specific instructions that address each failure case
3. Include constraints, rules, or patterns the model should follow
4. Add explicit formatting requirements if needed
5. Consider adding relevant context or clarifications

IMPORTANT: Make substantial changes. Don't just tweak - restructure if needed.
The goal is to maximize accuracy on the Q&A examples.

Output ONLY the new improved prompt. No explanations, no markdown formatting, no meta-commentary.`;

  return callOpenRouter(apiKey, model, [
    { role: "user", content: optimizationPrompt }
  ], 0.8); // Slightly higher temperature for more creative rewrites
}

/**
 * Bootstrap optimization - generate few-shot demonstrations
 */
async function bootstrapOptimize(
  apiKey: string,
  model: string,
  originalPrompt: string,
  examples: QAExample[],
  maxDemos: number
): Promise<string> {
  // Select diverse examples for demonstrations
  const demos = examples.slice(0, Math.min(maxDemos, examples.length));

  const demoText = demos.map((e, i) =>
    `<example ${i + 1}>\nUser: ${e.question}\nAssistant: ${e.answer}\n</example>`
  ).join('\n\n');

  const bootstrapPrompt = `You are an expert prompt engineer specializing in few-shot learning. Transform the following prompt into a highly effective few-shot prompt that will maximize accuracy.

ORIGINAL SYSTEM PROMPT:
---
${originalPrompt}
---

DEMONSTRATION EXAMPLES TO INCORPORATE:
${demoText}

YOUR TASK:
Create a new, improved system prompt that:

1. RESTRUCTURES the original prompt for clarity
2. EMBEDS the demonstration examples in a clear format
3. ADDS explicit instructions about following the demonstrated pattern
4. INCLUDES format specifications (if the examples show a specific output format)
5. ADDS chain-of-thought guidance if appropriate

The new prompt should make it OBVIOUS to the model:
- What kind of responses are expected
- The exact format/structure to use
- Any rules or constraints from the examples

IMPORTANT: The output should be a complete, standalone system prompt that includes:
- The core instructions (improved from original)
- The few-shot examples formatted clearly
- Explicit instructions to follow the pattern

Output ONLY the new system prompt. No explanations or meta-commentary.`;

  return callOpenRouter(apiKey, model, [
    { role: "user", content: bootstrapPrompt }
  ], 0.8);
}

/**
 * Main optimization function
 */
export async function optimizePrompt(
  apiKey: string,
  originalContent: string,
  qaExamples: QAExample[],
  settings: OptimizationSettings
): Promise<OptimizationResult> {
  const { model, judgeModel, optimizer, metric, threshold, maxIterations, trials, demos } = settings;

  const iterations: OptimizationIteration[] = [];
  let bestPrompt = originalContent;
  let bestScore = 0;
  let allRemarks: JudgeResult[] = [];

  // Evaluate baseline
  const baseline = await evaluatePrompt(
    apiKey,
    model,
    judgeModel,
    originalContent,
    qaExamples,
    metric
  );

  const baselineScore = baseline.score;
  bestScore = baselineScore;
  allRemarks = baseline.remarks;

  console.log(`Baseline score: ${baselineScore.toFixed(3)}`);

  // Run optimization iterations
  const maxIters = maxIterations || 3;
  const targetThreshold = threshold || 0.95; // Raised default threshold to 95%

  for (let iter = 1; iter <= maxIters; iter++) {
    // Always run at least one iteration to try to improve the prompt,
    // then check threshold for subsequent iterations
    if (iter > 1 && bestScore >= targetThreshold) {
      console.log(`Threshold ${targetThreshold} reached at iteration ${iter - 1}`);
      break;
    }

    console.log(`Running optimization iteration ${iter}/${maxIters}...`);

    let candidatePrompt: string;

    // Generate candidate based on optimizer type
    if (optimizer === "bootstrap" || optimizer === "bootstrap_random") {
      candidatePrompt = await bootstrapOptimize(
        apiKey,
        model,
        iter === 1 ? originalContent : bestPrompt,
        qaExamples,
        demos || 4
      );
    } else {
      // COPRO or MIPRO - use iterative refinement
      candidatePrompt = await generateOptimizedPrompt(
        apiKey,
        model,
        iter === 1 ? originalContent : bestPrompt,
        qaExamples,
        allRemarks,
        iter
      );
    }

    // Evaluate candidate
    const evaluation = await evaluatePrompt(
      apiKey,
      model,
      judgeModel,
      candidatePrompt,
      qaExamples,
      metric
    );

    const improvement = evaluation.score - baselineScore;

    iterations.push({
      iteration: iter,
      baselineScore,
      optimizedScore: evaluation.score,
      improvement,
      judgeRemarks: evaluation.remarks,
      candidatePrompt, // Store the candidate prompt for this iteration
      timestamp: new Date().toISOString(),
    });

    console.log(`Iteration ${iter}: score=${evaluation.score.toFixed(3)}, improvement=${improvement.toFixed(3)}`);

    // Keep best - even if score is equal, prefer the optimized version
    // since it may have improvements in structure/clarity
    if (evaluation.score >= bestScore) {
      bestScore = evaluation.score;
      bestPrompt = candidatePrompt;
      allRemarks = evaluation.remarks;
      console.log(`New best prompt found at iteration ${iter}`);
    }
  }

  // If optimization didn't improve score, still return the optimized prompt
  // if it's at least as good, since the structure might be better
  const finalPrompt = bestScore >= baselineScore ? bestPrompt : originalContent;

  return {
    optimizedContent: finalPrompt,
    baselineScore,
    optimizedScore: bestScore,
    iterations,
    judgeRemarks: allRemarks,
  };
}
