import fs from "fs";
import path from "path";
import { z } from "zod";
import { toolDefinitions } from "../ai/tools.config.js";
import { getElevenLabsConfig } from "./env-loader.js";

/**
 * Sync local configuration to ElevenLabs ADDRESS_FINDER agent (single-agent script).
 *
 * IMPORTANT: This script is ADDRESS_FINDER-specific. It reads the agent ID from
 * ELEVENLABS_AGENT_ID / VITE_ELEVENLABS_ADDRESS_AGENT_ID and uses the address-finder
 * prompt at ai/address-finder/master_prompt_base.txt.
 *
 * For multi-agent sync (including CONVERSATION_ASSISTANT), use:
 *   npx tsx scripts/4-multi-agent-sync.ts
 *
 * Uses correct ElevenLabs API format for conversation_config
 */
async function syncAgent(dryRun = false) {
	try {
		console.log("🔍 Loading environment and configuration...");
		const { apiKey, agentId } = getElevenLabsConfig();

		// Generate ElevenLabs-compatible client tool definitions
		console.log("🔧 Generating ElevenLabs client tool definitions...");
		const elevenLabsTools = Object.entries(toolDefinitions).map(
			([name, def]) => {
				const schema = z.toJSONSchema(def.parametersSchema);
				const schemaObj = schema as any;

				// Convert to ElevenLabs client tool format
				const properties: Record<string, any> = {};
				const required: string[] = [];

				if (schemaObj.properties) {
					Object.entries(schemaObj.properties).forEach(
						([propName, propSchema]: [string, any]) => {
							properties[propName] = {
								type: propSchema.type || "string",
								description: propSchema.description || propName,
								dynamic_variable: "",
								constant_value: "",
							};
						},
					);
				}

				if (schemaObj.required && Array.isArray(schemaObj.required)) {
					required.push(...schemaObj.required);
				}

				return {
					name,
					description: def.description,
					response_timeout_secs: 20,
					type: "client",
					parameters:
						Object.keys(properties).length > 0
							? {
									type: "object",
									required,
									description: "",
									properties,
								}
							: null,
					expects_response: true,
					dynamic_variables: {
						dynamic_variable_placeholders: {},
					},
				};
			},
		);

		console.log(
			`📋 Generated ${elevenLabsTools.length} ElevenLabs client tool definitions`,
		);

		// Load base prompt
		const basePromptPath = path.resolve(
			process.cwd(),
			"ai",
			"address-finder",
			"master_prompt_base.txt",
		);

		if (!fs.existsSync(basePromptPath)) {
			throw new Error(`Base prompt file not found: ${basePromptPath}`);
		}

		const basePrompt = fs.readFileSync(basePromptPath, "utf-8");

		// Generate tools section for prompt (for reference only)
		let toolsPrompt = "\n\n### **AVAILABLE TOOLS:**\n";
		elevenLabsTools.forEach((tool) => {
			toolsPrompt += `*   \`${tool.name}\`: ${tool.description}\n`;
		});

		const finalPrompt = `${basePrompt}${toolsPrompt}`;

		// Prepare payload in correct ElevenLabs format
		const payload = {
			conversation_config: {
				agent: {
					prompt: {
						prompt: finalPrompt,
						llm: "gemini-2.0-flash-001",
						temperature: 0,
						max_tokens: -1,
						tools: elevenLabsTools,
						built_in_tools: {
							end_call: {
								name: "end_call",
								description: "",
								response_timeout_secs: 20,
								type: "system",
								params: {
									system_tool_type: "end_call",
								},
							},
							language_detection: null,
							transfer_to_agent: null,
							transfer_to_number: null,
							skip_turn: {
								name: "skip_turn",
								description: "",
								response_timeout_secs: 20,
								type: "system",
								params: {
									system_tool_type: "skip_turn",
								},
							},
							play_keypad_touch_tone: null,
						},
						mcp_server_ids: [],
						native_mcp_server_ids: [],
						knowledge_base: [],
						custom_llm: null,
						ignore_default_personality: false,
						rag: {
							enabled: false,
							embedding_model: "e5_mistral_7b_instruct",
							max_vector_distance: 0.6,
							max_documents_length: 50000,
							max_retrieved_rag_chunks_count: 20,
						},
					},
				},
			},
		};

		if (dryRun) {
			console.log("\n--- DRY RUN: This payload would be sent to the API ---\n");
			console.log("📊 Payload Preview:");
			console.log("- Client Tools count:", elevenLabsTools.length);
			console.log("- Prompt length:", finalPrompt.length, "characters");
			console.log("- Base prompt file:", basePromptPath);
			console.log(
				"\n🔧 Tool names:",
				elevenLabsTools.map((t) => t.name).join(", "),
			);
			console.log("\n📄 First 500 characters of final prompt:");
			console.log(finalPrompt.substring(0, 500) + "...");
			console.log("\n✅ Dry run complete. Use without --dry-run to sync live.");
			return;
		}

		console.log(`\n📡 Syncing agent ${agentId}...`);
		console.log(
			"🎯 Target URL:",
			`https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
		);

		const response = await fetch(
			`https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key": apiKey,
				},
				body: JSON.stringify(payload),
			},
		);

		console.log(
			`📊 Response status: ${response.status} ${response.statusText}`,
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("❌ Sync failed!");
			if (response.status === 422) {
				console.error(
					"💡 Unprocessable Entity - Check tool configuration format and required fields",
				);
				console.error(
					"📋 Tools being sent:",
					elevenLabsTools.map((t) => t.name),
				);
			}
			console.error("Response body:", errorText);
			throw new Error(`API Error: ${response.status}\n${errorText}`);
		}

		const result = await response.json();
		console.log("✅ Agent configuration synced successfully!");
		console.log("📋 Updated:");
		console.log(`   - Prompt: ${finalPrompt.length} characters`);
		console.log(`   - Client Tools: ${elevenLabsTools.length} definitions`);
		console.log(`   - Agent: ${agentId}`);

		// Verify tools were applied
		if (result?.conversation_config?.agent?.prompt?.tools) {
			const appliedTools = result.conversation_config.agent.prompt.tools;
			console.log(
				`   - Applied Tools: ${appliedTools.length} (${appliedTools.map((t: any) => t.name).join(", ")})`,
			);
		}

		console.log(
			"\n🎉 Sync complete! Agent is now using the updated configuration.",
		);
	} catch (error) {
		console.error("❌ Sync failed:", error);
		process.exit(1);
	}
}

// Parse command line arguments
const isDryRun = process.argv.includes("--dry-run");

console.log("🚀 ElevenLabs Agent Configuration Sync (Fixed)");
console.log(`📋 Mode: ${isDryRun ? "DRY RUN (preview only)" : "LIVE SYNC"}`);
console.log("");

syncAgent(isDryRun);
