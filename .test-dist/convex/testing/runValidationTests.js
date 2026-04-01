// Automated test runner for address validation accuracy assessment
import { v } from "convex/values";
import { action } from "../_generated/server";
import { validateThenEnrichAddress } from "../address/utils";
import { generateTranscriptionVariations, testCategories, validationTestCases, } from "./validationTestCases";
// Evaluate if a test result matches expectations
function evaluateTestResult(testCase, actualResult) {
    const { expected } = testCase;
    const { isValid, error } = actualResult;
    switch (expected) {
        case "SHOULD_PASS":
            if (isValid) {
                return {
                    passed: true,
                    score: "PASS",
                    notes: "Correctly validated valid address",
                };
            }
            else {
                return {
                    passed: false,
                    score: "FAIL",
                    notes: `Should have passed but failed: ${error}`,
                };
            }
        case "SHOULD_FAIL":
            if (!isValid) {
                return {
                    passed: true,
                    score: "PASS",
                    notes: `Correctly rejected invalid address: ${error}`,
                };
            }
            else {
                return {
                    passed: false,
                    score: "FAIL",
                    notes: "Should have failed but incorrectly validated",
                };
            }
        case "BORDERLINE":
            // For borderline cases, we just record the result without marking as pass/fail
            return {
                passed: true,
                score: "UNEXPECTED",
                notes: `Borderline case: ${isValid ? "Validated" : "Rejected"} - ${error || "No error"}`,
            };
        default:
            return { passed: false, score: "FAIL", notes: "Unknown expected result" };
    }
}
// Helper function to run validation tests (shared logic)
async function runValidationTestsInternal(apiKey, categories, maxTestsPerCategory, includeTranscriptionVariations) {
    const startTime = Date.now();
    const results = [];
    // Determine which test cases to run
    let testCasesToRun = [];
    if (categories && categories.length > 0) {
        // Run specific categories
        for (const category of categories) {
            if (category in testCategories) {
                const categoryTests = testCategories[category];
                const limitedTests = maxTestsPerCategory
                    ? categoryTests.slice(0, maxTestsPerCategory)
                    : categoryTests;
                testCasesToRun.push(...limitedTests);
            }
        }
    }
    else {
        // Run all test cases
        testCasesToRun = maxTestsPerCategory
            ? validationTestCases.slice(0, maxTestsPerCategory)
            : validationTestCases;
    }
    // Add transcription variations if requested
    if (includeTranscriptionVariations) {
        const variationTests = [];
        for (const testCase of testCasesToRun) {
            if (testCase.transcriptionVariations) {
                for (const variation of testCase.transcriptionVariations) {
                    variationTests.push({
                        ...testCase,
                        id: `${testCase.id}_variation_${variationTests.length}`,
                        input: variation,
                        category: "transcription_error",
                    });
                }
            }
        }
        testCasesToRun.push(...variationTests);
    }
    console.log(`🧪 Running ${testCasesToRun.length} validation tests...`);
    // Execute each test case
    for (const testCase of testCasesToRun) {
        const testStartTime = Date.now();
        try {
            console.log(`Testing: ${testCase.id} - "${testCase.input}"`);
            // Use the same validation method as the actual system
            const actualResult = await validateThenEnrichAddress(testCase.input, 1, // maxResults
            apiKey);
            // Convert result format to match validation result
            const validationResult = {
                isValid: actualResult.success,
                formattedAddress: actualResult.success
                    ? actualResult.suggestions[0]?.description
                    : undefined,
                error: actualResult.success ? undefined : actualResult.error,
                placeId: actualResult.success
                    ? actualResult.suggestions[0]?.placeId
                    : undefined,
                // Add more fields as needed
            };
            const evaluation = evaluateTestResult(testCase, validationResult);
            const executionTime = Date.now() - testStartTime;
            results.push({
                testCase,
                actualResult: validationResult,
                passed: evaluation.passed,
                score: evaluation.score,
                notes: evaluation.notes,
                executionTime,
            });
            console.log(`  Result: ${evaluation.score} - ${evaluation.notes}`);
        }
        catch (error) {
            const executionTime = Date.now() - testStartTime;
            results.push({
                testCase,
                actualResult: {
                    isValid: false,
                    error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
                },
                passed: false,
                score: "FAIL",
                notes: "Test execution error",
                executionTime,
            });
            console.log(`  ERROR: ${error}`);
        }
    }
    // Calculate summary statistics
    const totalTests = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const unexpected = results.filter((r) => r.score === "UNEXPECTED").length;
    const accuracy = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    // Calculate category-specific results
    const categoryResults = {};
    for (const category of Object.keys(testCategories)) {
        const categoryTests = results.filter((r) => r.testCase.category === category);
        const categoryPassed = categoryTests.filter((r) => r.passed).length;
        categoryResults[category] = {
            total: categoryTests.length,
            passed: categoryPassed,
            accuracy: categoryTests.length > 0
                ? (categoryPassed / categoryTests.length) * 100
                : 0,
        };
    }
    const executionTime = Date.now() - startTime;
    const testSuiteResult = {
        totalTests,
        passed,
        failed,
        unexpected,
        accuracy,
        categoryResults,
        results,
        executionTime,
        timestamp: new Date().toISOString(),
    };
    console.log(`🧪 Test Suite Complete: ${passed}/${totalTests} passed (${accuracy.toFixed(1)}% accuracy)`);
    console.log(`Categories:`, categoryResults);
    return testSuiteResult;
}
// Main test runner action
export const runValidationAccuracyTests = action({
    args: {
        categories: v.optional(v.array(v.string())), // Which categories to test
        includeTranscriptionVariations: v.optional(v.boolean()),
        maxTestsPerCategory: v.optional(v.number()),
    },
    returns: v.object({
        success: v.boolean(),
        results: v.optional(v.any()), // Full test results
        summary: v.optional(v.object({
            totalTests: v.number(),
            passed: v.number(),
            failed: v.number(),
            accuracy: v.number(),
        })),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google Places API key not configured",
            };
        }
        try {
            const testSuiteResult = await runValidationTestsInternal(apiKey, args.categories, args.maxTestsPerCategory, args.includeTranscriptionVariations);
            return {
                success: true,
                results: testSuiteResult,
                summary: {
                    totalTests: testSuiteResult.totalTests,
                    passed: testSuiteResult.passed,
                    failed: testSuiteResult.failed,
                    accuracy: testSuiteResult.accuracy,
                },
            };
        }
        catch (error) {
            console.error("Validation test suite failed:", error);
            return {
                success: false,
                error: `Test suite execution failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
// Quick test runner for specific categories
export const quickValidationTest = action({
    args: {
        category: v.string(),
        maxTests: v.optional(v.number()),
    },
    returns: v.object({
        success: v.boolean(),
        summary: v.optional(v.string()),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google Places API key not configured",
            };
        }
        try {
            const testSuiteResult = await runValidationTestsInternal(apiKey, [args.category], args.maxTests || 5, false);
            return {
                success: true,
                summary: `${args.category}: ${testSuiteResult.passed}/${testSuiteResult.totalTests} passed (${testSuiteResult.accuracy.toFixed(1)}% accuracy)`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Quick test failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
// Test individual address
export const testSingleAddress = action({
    args: {
        address: v.string(),
        expectedResult: v.optional(v.union(v.literal("SHOULD_PASS"), v.literal("SHOULD_FAIL"), v.literal("BORDERLINE"))),
    },
    returns: v.object({
        success: v.boolean(),
        result: v.optional(v.any()),
        evaluation: v.optional(v.string()),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Google Places API key not configured",
            };
        }
        try {
            const result = await validateThenEnrichAddress(args.address, 1, apiKey);
            let evaluation = "";
            if (args.expectedResult) {
                const testCase = {
                    id: "manual_test",
                    input: args.address,
                    expected: args.expectedResult,
                    reason: "Manual test",
                    category: "valid_address",
                };
                const validationResult = {
                    isValid: result.success,
                    formattedAddress: result.success
                        ? result.suggestions[0]?.description
                        : undefined,
                    error: result.success ? undefined : result.error,
                };
                const evalResult = evaluateTestResult(testCase, validationResult);
                evaluation = `${evalResult.score}: ${evalResult.notes}`;
            }
            return {
                success: true,
                result,
                evaluation,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Single address test failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
