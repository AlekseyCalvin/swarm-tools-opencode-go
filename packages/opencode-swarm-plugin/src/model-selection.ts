/**
 * Model Selection Module
 *
 * Determines which model a worker agent should use based on subtask
 * characteristics like file types and complexity.
 */

import type { DecomposedSubtask } from "./schemas/task";

/**
 * Model vendors
 */
export type ModelVendor = "anthropic" | "openai" | "google" | "zai" | "minimax" | "opencode-go" | "opencode";

/**
 * Unified model representation with vendor information
 */
export interface VendorModel {
  vendor: ModelVendor;
  model: string;
  displayName: string;
}

export interface SwarmConfig {
  primaryModel?: string;

  coordinatorVendor?: ModelVendor;
  coordinatorModel?: string;
  workerVendor?: ModelVendor;
  workerModel?: string;
  liteVendor?: ModelVendor;
  liteModel?: string;
}

function parseModelString(modelString: string): VendorModel {
  const parts = modelString.split("/");
  
  if (parts.length === 1) {
    return {
      vendor: "opencode-go", // Update global default assumption
      model: modelString,
      displayName: modelString
    };
  }
  
  if (parts.length >= 2) {
    // Re-join everything after the first slash in case model names contain slashes
    const vendor = parts[0] as ModelVendor;
    const model = parts.slice(1).join("/");
    
    let displayName = `${vendor}/${model}`;
    if (vendor === "minimax") {
      displayName = model.replace("MiniMax-", "MiniMax ");
    }
    
    return { vendor, model, displayName };
  }
  
  throw new Error(`Invalid model format: ${modelString}`);
}

function getDefaultForVendor(vendor: ModelVendor): string {
  switch (vendor) {
    case "opencode-go":
      return "deepseek-v4-pro"; // Default coordinator
    case "opencode":
      return "nemotron-3-super-free";
    case "google":
      return "gemini-3-flash-preview"; // Default lite
    case "openai":
      return "gpt-5-4-mini"; 
    case "anthropic":
      return "claude-sonnet-4.5"; 
    case "zai":
      return "glm-4.7"; 
    case "minimax":
      return "minimax/MiniMax-M2.7"; 
    default:
      return "deepseek-v4-pro"; 
  }
}

function getModelDisplayName(vendor: ModelVendor, model: string): string {
  const shortVendor = vendor === "minimax" ? "MiniMax" : vendor;
  return `${shortVendor}/${model}`;
}

export function selectWorkerModel(
  subtask: DecomposedSubtask & { model?: string },
  config: SwarmConfig,
): VendorModel {
  if (subtask.model) {
    return parseModelString(subtask.model);
  }

  const files = subtask.files || [];

  if (files.length > 0) {
    const allDocs = files.every((f) => {
      const lower = f.toLowerCase();
      return lower.endsWith(".md") || lower.endsWith(".mdx");
    });

    const allTests = files.every((f) => {
      const lower = f.toLowerCase();
      return lower.includes(".test.") || lower.includes(".spec.");
    });

    if (allDocs || allTests) {
      const liteVendor = config.liteVendor || config.workerVendor || "google";
      const liteModel = config.liteModel || getDefaultForVendor(liteVendor);
      const parsedLiteModel = parseModelString(liteModel);
      
      return {
        vendor: parsedLiteModel.vendor,
        model: parsedLiteModel.model,
        displayName: parsedLiteModel.displayName
      };
    }
  }

  const workerVendor = config.workerVendor || "opencode-go";
  const workerModel = config.workerModel || getDefaultForVendor(workerVendor);
  
  return {
    vendor: workerVendor,
    model: workerModel,
    displayName: getModelDisplayName(workerVendor, workerModel)
  };
}
