/**
 * Model Selection Tests
 *
 * Tests for selectWorkerModel function that determines which model
 * a worker should use based on subtask characteristics.
 */
import { describe, test, expect } from "bun:test";
import { selectWorkerModel } from "./model-selection";
import type { DecomposedSubtask } from "./schemas/task";

// Mock config type matching expected SwarmConfig structure
interface TestConfig {
  primaryModel?: string;
  liteModel?: string;
  workerVendor?: any;
  workerModel?: string;
  liteVendor?: any;
}

describe("selectWorkerModel", () => {
  // Use our new preferred vendors and models for testing
  const mockConfig: TestConfig = {
    workerVendor: "opencode-go",
    workerModel: "kimi-k2.6",
    liteVendor: "google",
    liteModel: "gemini-3-flash-preview",
  };

  test("uses explicit model field from subtask when provided", () => {
    const subtask: DecomposedSubtask & { model?: string } = {
      title: "Update docs",
      description: "Update README",
      files: ["README.md"],
      estimated_effort: "trivial",
      model: "opencode-go/deepseek-v4-pro", // Explicit override
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("deepseek-v4-pro");
  });

  test("uses liteModel for all markdown files", () => {
    const subtask: DecomposedSubtask = {
      title: "Update docs",
      description: "Update all docs",
      files: ["README.md", "CONTRIBUTING.md"],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  test("uses liteModel for all MDX files", () => {
    const subtask: DecomposedSubtask = {
      title: "Update docs",
      description: "Update content",
      files: ["docs/intro.mdx", "docs/guide.mdx"],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  test("uses liteModel for test files with .test. pattern", () => {
    const subtask: DecomposedSubtask = {
      title: "Write tests",
      description: "Add unit tests",
      files: ["src/auth.test.ts", "src/user.test.ts"],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  test("uses liteModel for test files with .spec. pattern", () => {
    const subtask: DecomposedSubtask = {
      title: "Write specs",
      description: "Add spec tests",
      files: ["src/auth.spec.ts", "src/user.spec.ts"],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  test("uses workerModel when files are mixed (code + docs)", () => {
    const subtask: DecomposedSubtask = {
      title: "Implement feature with docs",
      description: "Add feature and document it",
      files: ["src/feature.ts", "README.md"],
      estimated_effort: "medium",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("kimi-k2.6");
  });

  test("uses workerModel when files are mixed (code + tests)", () => {
    const subtask: DecomposedSubtask = {
      title: "Implement feature with tests",
      description: "Add feature and tests",
      files: ["src/feature.ts", "src/feature.test.ts"],
      estimated_effort: "medium",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("kimi-k2.6");
  });

  test("uses workerModel for implementation files", () => {
    const subtask: DecomposedSubtask = {
      title: "Implement auth",
      description: "Add authentication",
      files: ["src/auth.ts", "src/middleware.ts"],
      estimated_effort: "large",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("kimi-k2.6");
  });

  test("defaults to fallback liteModel when liteModel not configured", () => {
    const configWithoutLite: TestConfig = {
      workerVendor: "opencode",
      workerModel: "nemotron-3-super-free",
      // liteModel and liteVendor are undefined
    };

    const subtask: DecomposedSubtask = {
      title: "Update docs",
      description: "Update README",
      files: ["README.md"],
      estimated_effort: "trivial",
    };

    const result = selectWorkerModel(subtask, configWithoutLite);
    // Inherits workerVendor, then looks up default for that vendor
    expect(result.vendor).toBe("opencode");
    expect(result.model).toBe("nemotron-3-super-free");
  });

  test("falls back to default worker model when entirely unconfigured", () => {
    const emptyConfig: TestConfig = {};

    const subtask: DecomposedSubtask = {
      title: "Implement code",
      description: "Code",
      files: ["src/main.ts"],
      estimated_effort: "trivial",
    };

    const result = selectWorkerModel(subtask, emptyConfig);
    // Should fall back to opencode-go default logic
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("deepseek-v4-pro");
  });

  test("handles empty files array by defaulting to workerModel", () => {
    const subtask: DecomposedSubtask = {
      title: "Research task",
      description: "Investigate options",
      files: [],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("opencode-go");
    expect(result.model).toBe("kimi-k2.6");
  });

  test("handles mixed markdown and mdx files using liteModel", () => {
    const subtask: DecomposedSubtask = {
      title: "Update all docs",
      description: "Update docs",
      files: ["README.md", "docs/guide.mdx", "CHANGELOG.md"],
      estimated_effort: "small",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });

  test("case insensitive file extension matching", () => {
    const subtask: DecomposedSubtask = {
      title: "Update docs",
      description: "Update README",
      files: ["README.MD", "CONTRIBUTING.MD"],
      estimated_effort: "trivial",
    };

    const result = selectWorkerModel(subtask, mockConfig);
    expect(result.vendor).toBe("google");
    expect(result.model).toBe("gemini-3-flash-preview");
  });
});
