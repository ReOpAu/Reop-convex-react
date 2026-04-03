import { useState } from "react";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	getPlaceDetailsApi,
	searchAddressApi,
	validateAddressApi,
} from "~/services/address-api.client";
import type { LocationIntent } from "~/stores/types";
import { classifyIntent } from "~/utils/addressFinderUtils";

// Constants for testing
const MAX_RESULTS = 5;
const PROCESSING_TIMEOUT = 30000; // 30 seconds
const API_DEBOUNCE_DELAY = 500;

interface ApiCallLog {
	id: string;
	timestamp: number;
	api: string;
	params: any;
	response?: any;
	error?: string;
	executionTime?: number;
}

interface TestResult {
	id: string;
	input: string;
	addressType: "street" | "suburb" | "full_address";
	intent: LocationIntent;
	apiCalls: ApiCallLog[];
	finalResult: any;
	processingSteps: string[];
	executionTime: number;
	timestamp: number;
}

export default function AddressValidationTests() {
	const [testResults, setTestResults] = useState<TestResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [manualAddress, setManualAddress] = useState("");
	const [selectedApiCall, setSelectedApiCall] = useState<ApiCallLog | null>(
		null,
	);

	// Common test cases for quick testing
	const quickTestCases = {
		street: ["Collins Street", "Chapel Street", "High Street", "Smith Street"],
		suburb: ["Footscray", "Camberwell", "Richmond", "Footscray, Victoria"],
		full_address: [
			"123 Collins Street, Melbourne VIC 3000",
			"18A Chaucer Crescent, Camberwell VIC 3126",
			"456 Chapel Street, Prahran VIC 3181",
			"789 High Street, Kew VIC 3101",
		],
	};

	// Helper to create unique test ID
	const generateTestId = () =>
		`test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	// Main test function that logs all API calls
	const runAddressTest = async (
		address: string,
		addressType: "street" | "suburb" | "full_address",
	) => {
		setIsRunning(true);
		const testId = generateTestId();
		const startTime = Date.now();
		const apiCalls: ApiCallLog[] = [];
		const processingSteps: string[] = [];

		try {
			// Step 1: Intent classification
			processingSteps.push("1. Classifying intent");
			const intent = classifyIntent(address);
			processingSteps.push(`   Intent detected: ${intent}`);

			// Step 2: Get place suggestions
			processingSteps.push("2. Getting place suggestions");
			const suggestionsStart = Date.now();
			const suggestionsResult = await searchAddressApi({
				query: address,
				intent: intent || "general",
				isAutocomplete: false,
				maxResults: MAX_RESULTS,
			});
			const suggestionsTime = Date.now() - suggestionsStart;

			apiCalls.push({
				id: `${testId}_suggestions`,
				timestamp: suggestionsStart,
				api: "getPlaceSuggestions",
				params: {
					query: address,
					intent: intent || "general",
					isAutocomplete: false,
					maxResults: MAX_RESULTS,
				},
				response: suggestionsResult,
				executionTime: suggestionsTime,
			});
			processingSteps.push(
				`   Found ${suggestionsResult.success ? suggestionsResult.suggestions?.length || 0 : 0} suggestions`,
			);

			// Step 3: Get details for first suggestion (if any)
			let detailsResult = null;
			if (
				suggestionsResult.success &&
				suggestionsResult.suggestions?.length > 0
			) {
				const firstSuggestion = suggestionsResult.suggestions[0];
				if (firstSuggestion.placeId) {
					processingSteps.push("3. Getting place details");
					const detailsStart = Date.now();
					detailsResult = await getPlaceDetailsApi({
						placeId: firstSuggestion.placeId,
					});
					const detailsTime = Date.now() - detailsStart;

					apiCalls.push({
						id: `${testId}_details`,
						timestamp: detailsStart,
						api: "getPlaceDetails",
						params: { placeId: firstSuggestion.placeId },
						response: detailsResult,
						executionTime: detailsTime,
					});
					processingSteps.push(
						`   Got place details: ${detailsResult.success ? "success" : "failed"}`,
					);
				}
			}

			// Step 4: Validate address (if we have a formatted address)
			let validationResult = null;
			if (detailsResult?.success && detailsResult.details?.formattedAddress) {
				processingSteps.push("4. Validating address");
				const validationStart = Date.now();
				validationResult = await validateAddressApi({
					address: detailsResult.details.formattedAddress,
				});
				const validationTime = Date.now() - validationStart;

				apiCalls.push({
					id: `${testId}_validation`,
					timestamp: validationStart,
					api: "validateAddress",
					params: { address: detailsResult.details.formattedAddress },
					response: validationResult,
					executionTime: validationTime,
				});
				processingSteps.push(
					`   Validation result: ${validationResult.success ? "valid" : "invalid"}`,
				);
			}

			// Create final result
			const finalResult = {
				suggestions: suggestionsResult,
				details: detailsResult,
				validation: validationResult,
			};

			const testResult: TestResult = {
				id: testId,
				input: address,
				addressType,
				intent,
				apiCalls,
				finalResult,
				processingSteps,
				executionTime: Date.now() - startTime,
				timestamp: startTime,
			};

			setTestResults((prev) => [testResult, ...prev]);
		} catch (error) {
			console.error("Test execution failed:", error);
			apiCalls.push({
				id: `${testId}_error`,
				timestamp: Date.now(),
				api: "error",
				params: { address },
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsRunning(false);
		}
	};

	// Quick test handlers
	const runQuickTest = (
		address: string,
		type: "street" | "suburb" | "full_address",
	) => {
		runAddressTest(address, type);
	};

	const runManualTest = () => {
		if (!manualAddress.trim()) return;
		const type = manualAddress.includes(",")
			? "full_address"
			: manualAddress.toLowerCase().includes("street") ||
					manualAddress.toLowerCase().includes("road")
				? "street"
				: "suburb";
		runAddressTest(manualAddress, type);
	};

	const clearResults = () => {
		setTestResults([]);
		setSelectedApiCall(null);
	};

	// Generate comprehensive summary for copying
	const generateTestSummary = () => {
		if (testResults.length === 0) return "No test results to export.";

		const totalTests = testResults.length;
		const totalApiCalls = testResults.reduce(
			(sum, test) => sum + test.apiCalls.length,
			0,
		);
		const totalTime = testResults.reduce(
			(sum, test) => sum + test.executionTime,
			0,
		);
		const avgTime = totalTime / totalTests;

		// Group by address type
		const byType = testResults.reduce(
			(acc, test) => {
				if (!acc[test.addressType]) acc[test.addressType] = [];
				acc[test.addressType].push(test);
				return acc;
			},
			{} as Record<string, TestResult[]>,
		);

		// Group by intent
		const byIntent = testResults.reduce(
			(acc, test) => {
				const intent = test.intent || "general";
				if (!acc[intent]) acc[intent] = [];
				acc[intent].push(test);
				return acc;
			},
			{} as Record<string, TestResult[]>,
		);

		const summary = [
			"=== ADDRESS API TEST RESULTS SUMMARY ===",
			`Generated: ${new Date().toISOString()}`,
			"",
			"📊 OVERVIEW:",
			`• Total Tests: ${totalTests}`,
			`• Total API Calls: ${totalApiCalls}`,
			`• Total Execution Time: ${formatExecutionTime(totalTime)}`,
			`• Average Test Time: ${formatExecutionTime(avgTime)}`,
			"",
			"🏷️ BY ADDRESS TYPE:",
			...Object.entries(byType).map(([type, tests]) => {
				const avgTimeForType =
					tests.reduce((sum, t) => sum + t.executionTime, 0) / tests.length;
				return `• ${type.replace("_", " ")}: ${tests.length} tests (avg: ${formatExecutionTime(avgTimeForType)})`;
			}),
			"",
			"🎯 BY INTENT:",
			...Object.entries(byIntent).map(([intent, tests]) => {
				const avgTimeForIntent =
					tests.reduce((sum, t) => sum + t.executionTime, 0) / tests.length;
				return `• ${intent}: ${tests.length} tests (avg: ${formatExecutionTime(avgTimeForIntent)})`;
			}),
			"",
			"📋 DETAILED TEST RESULTS:",
			"",
			...testResults.map((test, index) => {
				const errors = test.apiCalls.filter((call) => call.error);
				const successCalls = test.apiCalls.filter((call) => !call.error);

				return [
					`${index + 1}. ${test.input}`,
					`   Type: ${test.addressType.replace("_", " ")} | Intent: ${test.intent} | Time: ${formatExecutionTime(test.executionTime)}`,
					`   API Calls: ${test.apiCalls.length} (${successCalls.length} success, ${errors.length} errors)`,
					"",
					...test.apiCalls.map((call, callIndex) => {
						if (call.error) {
							return `   ${callIndex + 1}. ${call.api} - ERROR: ${call.error}`;
						}

						const responseInfo = call.response?.success
							? call.api === "getPlaceSuggestions"
								? `${call.response.suggestions?.length || 0} suggestions`
								: call.api === "getPlaceDetails"
									? `Got details for ${call.response.details?.formattedAddress || "place"}`
									: call.api === "validateAddress"
										? `Validation: ${call.response.validation?.verdict || "unknown"}`
										: "success"
							: "failed";

						return `   ${callIndex + 1}. ${call.api} (${call.executionTime ? formatExecutionTime(call.executionTime) : "?ms"}) - ${responseInfo}`;
					}),
					"",
					...test.processingSteps.map((step) => `   ${step}`),
					"",
					"---",
					"",
				].join("\n");
			}),
			"",
			"🔧 API PERFORMANCE ANALYSIS:",
			"",
			...(() => {
				const apiStats = {} as Record<
					string,
					{ count: number; totalTime: number; errors: number }
				>;

				testResults.forEach((test) => {
					test.apiCalls.forEach((call) => {
						if (!apiStats[call.api]) {
							apiStats[call.api] = { count: 0, totalTime: 0, errors: 0 };
						}
						apiStats[call.api].count++;
						apiStats[call.api].totalTime += call.executionTime || 0;
						if (call.error) apiStats[call.api].errors++;
					});
				});

				return Object.entries(apiStats).map(([api, stats]) => {
					const avgTime = stats.totalTime / stats.count;
					const successRate = (
						((stats.count - stats.errors) / stats.count) *
						100
					).toFixed(1);
					return `• ${api}: ${stats.count} calls, avg ${formatExecutionTime(avgTime)}, ${successRate}% success`;
				});
			})(),
		].join("\n");

		return summary;
	};

	// Copy summary to clipboard
	const copyAllResults = async () => {
		try {
			const summary = generateTestSummary();
			await navigator.clipboard.writeText(summary);
			// You could add a toast notification here if you have one
			console.log("Test results copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			// Fallback: show in console or alert
			alert("Copy failed. Check console for results.");
			console.log(generateTestSummary());
		}
	};

	// Helper functions for UI
	const getAddressTypeColor = (type: string) => {
		switch (type) {
			case "street":
				return "bg-blue-50 text-blue-700";
			case "suburb":
				return "bg-green-50 text-green-700";
			case "full_address":
				return "bg-purple-50 text-purple-700";
			default:
				return "bg-gray-50 text-gray-700";
		}
	};

	const getApiStatusColor = (success: boolean) => {
		return success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
	};

	const formatExecutionTime = (ms: number) => {
		return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
	};

	return (
		<PublicLayout>
			<div className="container mx-auto py-8 px-4 max-w-7xl">
				<div className="space-y-6">
					{/* Header */}
					<div className="text-center space-y-2">
						<h1 className="text-3xl font-bold">Address API Test Suite</h1>
						<p className="text-gray-600">
							Test our Convex APIs with visibility into request/response flow
						</p>
					</div>

					{/* Test Controls */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								Quick Tests
								<div className="flex gap-2">
									{testResults.length > 0 && (
										<Button
											variant="default"
											size="sm"
											onClick={copyAllResults}
											disabled={isRunning}
											className="bg-blue-600 hover:bg-blue-700"
										>
											📋 Copy All Results
										</Button>
									)}
									<Button
										variant="outline"
										size="sm"
										onClick={clearResults}
										disabled={isRunning}
									>
										Clear Results
									</Button>
									{isRunning && <Badge>Running...</Badge>}
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Tabs defaultValue="street" className="w-full">
								<TabsList className="grid w-full grid-cols-3">
									<TabsTrigger value="street">Street Names</TabsTrigger>
									<TabsTrigger value="suburb">Suburb Names</TabsTrigger>
									<TabsTrigger value="full_address">Full Addresses</TabsTrigger>
								</TabsList>

								<TabsContent value="street" className="space-y-2">
									<div className="grid grid-cols-2 gap-2">
										{quickTestCases.street.map((address) => (
											<Button
												key={address}
												variant="outline"
												size="sm"
												onClick={() => runQuickTest(address, "street")}
												disabled={isRunning}
												className="text-xs"
											>
												{address}
											</Button>
										))}
									</div>
								</TabsContent>

								<TabsContent value="suburb" className="space-y-2">
									<div className="grid grid-cols-2 gap-2">
										{quickTestCases.suburb.map((address) => (
											<Button
												key={address}
												variant="outline"
												size="sm"
												onClick={() => runQuickTest(address, "suburb")}
												disabled={isRunning}
												className="text-xs"
											>
												{address}
											</Button>
										))}
									</div>
								</TabsContent>

								<TabsContent value="full_address" className="space-y-2">
									<div className="grid grid-cols-1 gap-2">
										{quickTestCases.full_address.map((address) => (
											<Button
												key={address}
												variant="outline"
												size="sm"
												onClick={() => runQuickTest(address, "full_address")}
												disabled={isRunning}
												className="text-xs text-left"
											>
												{address}
											</Button>
										))}
									</div>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>

					{/* Manual Address Test */}
					<Card>
						<CardHeader>
							<CardTitle>Manual Address Test</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex gap-2">
								<Input
									value={manualAddress}
									onChange={(e) => setManualAddress(e.target.value)}
									placeholder="Enter any address to test (e.g., Collins Street, Footscray, or 123 Main St, Melbourne)"
									disabled={isRunning}
									className="flex-1"
									onKeyDown={(e) => e.key === "Enter" && runManualTest()}
								/>
								<Button
									onClick={runManualTest}
									disabled={isRunning || !manualAddress.trim()}
								>
									Test
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Test Results */}
					{testResults.length > 0 && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Test Results List */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										Test Results
										<Badge variant="outline">{testResults.length} tests</Badge>
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3 max-h-96 overflow-y-auto">
										{testResults.map((result) => (
											<div
												key={result.id}
												className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
												onClick={() => setSelectedApiCall(null)}
											>
												<div className="flex items-start justify-between mb-2">
													<div className="flex-1">
														<div className="font-medium text-sm">
															{result.input}
														</div>
														<div className="text-xs text-gray-500">
															Intent: {result.intent} •{" "}
															{formatExecutionTime(result.executionTime)}
														</div>
													</div>
													<div className="flex gap-2">
														<Badge
															className={getAddressTypeColor(
																result.addressType,
															)}
														>
															{result.addressType.replace("_", " ")}
														</Badge>
														<Badge variant="outline">
															{result.apiCalls.length} API calls
														</Badge>
													</div>
												</div>

												{/* API Call Timeline */}
												<div className="space-y-1">
													{result.apiCalls.map((call, index) => (
														<div
															key={call.id}
															className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
															onClick={(e) => {
																e.stopPropagation();
																setSelectedApiCall(call);
															}}
														>
															<span className="font-mono">{index + 1}.</span>
															<span className="font-medium">{call.api}</span>
															{call.executionTime && (
																<Badge
																	className={getApiStatusColor(!call.error)}
																>
																	{formatExecutionTime(call.executionTime)}
																</Badge>
															)}
															{call.error && (
																<Badge className="bg-red-100 text-red-800">
																	ERROR
																</Badge>
															)}
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* API Call Details */}
							<Card>
								<CardHeader>
									<CardTitle>API Call Details</CardTitle>
								</CardHeader>
								<CardContent>
									{selectedApiCall ? (
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<Badge variant="outline">{selectedApiCall.api}</Badge>
												{selectedApiCall.executionTime && (
													<Badge
														className={getApiStatusColor(
															!selectedApiCall.error,
														)}
													>
														{formatExecutionTime(selectedApiCall.executionTime)}
													</Badge>
												)}
											</div>

											<div>
												<h4 className="font-semibold mb-2">
													Request Parameters:
												</h4>
												<pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
													{JSON.stringify(selectedApiCall.params, null, 2)}
												</pre>
											</div>

											{selectedApiCall.error ? (
												<div>
													<h4 className="font-semibold mb-2 text-red-600">
														Error:
													</h4>
													<pre className="text-xs bg-red-50 p-3 rounded overflow-auto max-h-32">
														{selectedApiCall.error}
													</pre>
												</div>
											) : (
												<div>
													<h4 className="font-semibold mb-2">Response:</h4>
													<pre className="text-xs bg-green-50 p-3 rounded overflow-auto max-h-64">
														{JSON.stringify(selectedApiCall.response, null, 2)}
													</pre>
												</div>
											)}
										</div>
									) : (
										<div className="text-center text-gray-500 py-8">
											Click on an API call to see details
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					)}

					{/* Usage Instructions */}
					<Card>
						<CardHeader>
							<CardTitle>How to Use This Test Suite</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-gray-600">
							<div>
								<strong>Quick Tests:</strong> Click buttons to test common
								address patterns
							</div>
							<div>
								<strong>Manual Test:</strong> Type any address to see how our
								APIs handle it
							</div>
							<div>
								<strong>API Flow:</strong> See the sequence of API calls and
								their responses
							</div>
							<div>
								<strong>Address Types:</strong>
							</div>
							<ul className="ml-4 space-y-1">
								<li>
									• <strong>Street Names:</strong> Tests intent classification
									and suggestions
								</li>
								<li>
									• <strong>Suburb Names:</strong> Tests suburb correction logic
									(Victoria/Australia fix)
								</li>
								<li>
									• <strong>Full Addresses:</strong> Tests complete address
									validation flow
								</li>
							</ul>
							<div>
								<strong>Click on API calls</strong> to see detailed
								request/response data
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</PublicLayout>
	);
}
