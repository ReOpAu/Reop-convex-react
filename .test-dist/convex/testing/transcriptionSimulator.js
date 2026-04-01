// ElevenLabs transcription error simulation for voice input testing
import { v } from "convex/values";
import { action } from "../_generated/server";
import { runValidationAccuracyTests } from "./runValidationTests";
// Phonetic similarity patterns for Australian addresses
export const phoneticPatterns = [
    // Suburb name confusion (high similarity)
    {
        correct: "Canterbury",
        phoneticErrors: ["Camberwell", "Cantabury", "Cantebury", "Canterbury"],
        phoneticDistance: 0.8, // Very similar sounding
        frequency: "high", // Common error
    },
    {
        correct: "Camberwell",
        phoneticErrors: ["Canterbury", "Campbell", "Camber well", "Cambridge"],
        phoneticDistance: 0.7,
        frequency: "high",
    },
    {
        correct: "Prahran",
        phoneticErrors: ["Prahan", "Praran", "Praha", "Pran"],
        phoneticDistance: 0.6,
        frequency: "medium",
    },
    {
        correct: "South Yarra",
        phoneticErrors: ["Southyarra", "South Yara", "South Yera", "South Yoora"],
        phoneticDistance: 0.7,
        frequency: "medium",
    },
    {
        correct: "Richmond",
        phoneticErrors: ["Richmont", "Richmond", "Rich mont", "Richmund"],
        phoneticDistance: 0.5,
        frequency: "low",
    },
    // Street type confusion (very common)
    {
        correct: "Street",
        phoneticErrors: ["St", "Steet", "street", "streat"],
        phoneticDistance: 0.9,
        frequency: "very_high",
    },
    {
        correct: "Crescent",
        phoneticErrors: ["Cres", "Cresent", "crescant", "cresant"],
        phoneticDistance: 0.8,
        frequency: "high",
    },
    {
        correct: "Avenue",
        phoneticErrors: ["Ave", "Av", "avenue", "avenew", "avenu"],
        phoneticDistance: 0.8,
        frequency: "high",
    },
    {
        correct: "Road",
        phoneticErrors: ["Rd", "road", "rode", "rowd"],
        phoneticDistance: 0.7,
        frequency: "medium",
    },
    {
        correct: "Drive",
        phoneticErrors: ["Dr", "drive", "drv", "draiv"],
        phoneticDistance: 0.6,
        frequency: "medium",
    },
    {
        correct: "Court",
        phoneticErrors: ["Ct", "court", "cout", "cort"],
        phoneticDistance: 0.7,
        frequency: "medium",
    },
    {
        correct: "Place",
        phoneticErrors: ["Pl", "place", "plase", "plac"],
        phoneticDistance: 0.6,
        frequency: "medium",
    },
    // Number confusion (speech recognition issues)
    {
        correct: "18",
        phoneticErrors: ["80", "8", "18th", "eighteen"],
        phoneticDistance: 0.4,
        frequency: "medium",
    },
    {
        correct: "15",
        phoneticErrors: ["50", "5", "15th", "fifteen"],
        phoneticDistance: 0.4,
        frequency: "medium",
    },
    {
        correct: "30",
        phoneticErrors: ["13", "3", "30th", "thirty"],
        phoneticDistance: 0.4,
        frequency: "medium",
    },
    // Postcode confusion
    {
        correct: "3124",
        phoneticErrors: ["3126", "3104", "3142", "three one two four"],
        phoneticDistance: 0.3,
        frequency: "high",
    },
    {
        correct: "3126",
        phoneticErrors: ["3124", "3106", "3146", "three one two six"],
        phoneticDistance: 0.3,
        frequency: "high",
    },
];
// Simulate ElevenLabs transcription errors
export function simulateTranscriptionErrors(originalAddress, errorProbability = 0.3) {
    const variations = [];
    const currentAddress = originalAddress;
    // Apply phonetic transformations
    for (const pattern of phoneticPatterns) {
        if (Math.random() < errorProbability) {
            for (const error of pattern.phoneticErrors) {
                if (currentAddress.includes(pattern.correct)) {
                    // Create variation with this error
                    const variation = currentAddress.replace(pattern.correct, error);
                    if (variation !== currentAddress) {
                        variations.push(variation);
                    }
                }
            }
        }
    }
    // Apply common speech-to-text artifacts
    const speechArtifacts = applyCommonSpeechArtifacts(originalAddress);
    variations.push(...speechArtifacts);
    // Apply multiple errors (compound errors)
    if (Math.random() < 0.2) {
        // 20% chance of multiple errors
        const compoundErrors = applyCompoundErrors(originalAddress);
        variations.push(...compoundErrors);
    }
    // Remove duplicates and original
    return [...new Set(variations)].filter((v) => v !== originalAddress);
}
// Common speech-to-text artifacts
function applyCommonSpeechArtifacts(address) {
    const artifacts = [];
    // Capitalization errors (speech often loses capitalization)
    artifacts.push(address.toLowerCase());
    artifacts.push(address.toUpperCase());
    // Missing punctuation/commas
    artifacts.push(address.replace(/,/g, ""));
    artifacts.push(address.replace(/,/g, " "));
    // Extra spaces
    artifacts.push(address.replace(/\s+/g, "  ")); // Double spaces
    artifacts.push(address.replace(/ /g, "")); // No spaces
    // "A" vs "Ay" confusion
    if (address.includes("A ")) {
        artifacts.push(address.replace(/A /g, "Ay "));
        artifacts.push(address.replace(/A /g, "Eh "));
    }
    // State abbreviation vs full name
    const stateReplacements = {
        VIC: "Victoria",
        Victoria: "VIC",
        NSW: "New South Wales",
        "New South Wales": "NSW",
    };
    for (const [abbr, full] of Object.entries(stateReplacements)) {
        if (address.includes(abbr)) {
            artifacts.push(address.replace(abbr, full));
        }
    }
    return artifacts.filter((a) => a !== address);
}
// Apply multiple errors to simulate real-world transcription failures
function applyCompoundErrors(address) {
    const compoundErrors = [];
    // Common combinations
    let modified = address;
    // Suburb + postcode error
    modified = modified.replace("Canterbury", "Camberwell");
    modified = modified.replace("3124", "3126");
    if (modified !== address)
        compoundErrors.push(modified);
    // Street type + capitalization
    modified = address.replace("Street", "St").toLowerCase();
    if (modified !== address)
        compoundErrors.push(modified);
    // Number + street type error
    modified = address.replace("18A", "80").replace("Crescent", "Cres");
    if (modified !== address)
        compoundErrors.push(modified);
    return compoundErrors;
}
// Generate comprehensive transcription test scenarios
export function generateVoiceInputScenarios(baseAddresses) {
    const scenarios = [];
    let scenarioId = 1;
    for (const address of baseAddresses) {
        // Perfect transcription (baseline)
        scenarios.push({
            id: `voice_${scenarioId++}`,
            originalAddress: address,
            transcribedAddress: address,
            errorType: "perfect",
            confidence: 0.95,
            expectedValidation: "should_pass",
            reason: "Perfect transcription should validate correctly",
        });
        // Generate error variations
        const transcriptionErrors = simulateTranscriptionErrors(address, 0.7);
        for (const errorAddress of transcriptionErrors.slice(0, 3)) {
            // Limit to 3 variations per address
            // Determine expected validation based on error severity
            let expectedValidation;
            let confidence;
            // Analyze error severity
            const hasSuburbError = checkSuburbMismatch(address, errorAddress);
            const hasPostcodeError = checkPostcodeMismatch(address, errorAddress);
            const hasStreetError = checkStreetMismatch(address, errorAddress);
            if (hasSuburbError || hasPostcodeError) {
                expectedValidation = "should_fail";
                confidence = 0.6; // Lower confidence for major errors
            }
            else if (hasStreetError) {
                expectedValidation = "borderline";
                confidence = 0.8; // Medium confidence
            }
            else {
                expectedValidation = "should_pass";
                confidence = 0.9; // High confidence for minor errors
            }
            scenarios.push({
                id: `voice_${scenarioId++}`,
                originalAddress: address,
                transcribedAddress: errorAddress,
                errorType: determineErrorType(address, errorAddress),
                confidence,
                expectedValidation,
                reason: `Transcription error: ${getErrorDescription(address, errorAddress)}`,
            });
        }
    }
    return scenarios;
}
// Helper functions for error analysis
function checkSuburbMismatch(original, transcribed) {
    const originalSuburb = extractSuburb(original);
    const transcribedSuburb = extractSuburb(transcribed);
    return originalSuburb !== transcribedSuburb;
}
function checkPostcodeMismatch(original, transcribed) {
    const originalPostcode = extractPostcode(original);
    const transcribedPostcode = extractPostcode(transcribed);
    return originalPostcode !== transcribedPostcode;
}
function checkStreetMismatch(original, transcribed) {
    const originalStreet = extractStreetName(original);
    const transcribedStreet = extractStreetName(transcribed);
    return originalStreet !== transcribedStreet;
}
function extractSuburb(address) {
    const parts = address.split(",");
    if (parts.length >= 2) {
        return parts[1].trim().split(" ")[0]; // First word after first comma
    }
    return null;
}
function extractPostcode(address) {
    const match = address.match(/\b\d{4}\b/);
    return match ? match[0] : null;
}
function extractStreetName(address) {
    const parts = address.split(",")[0]; // Everything before first comma
    const words = parts.trim().split(" ");
    if (words.length >= 2) {
        return words.slice(1, -1).join(" "); // Exclude number and street type
    }
    return null;
}
function determineErrorType(original, transcribed) {
    const differences = countDifferences(original, transcribed);
    if (differences === 0)
        return "perfect";
    if (differences === 1)
        return "phonetic";
    if (differences === 2)
        return "speech_artifact";
    return "compound";
}
function countDifferences(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    let differences = 0;
    const maxLength = Math.max(words1.length, words2.length);
    for (let i = 0; i < maxLength; i++) {
        if (words1[i] !== words2[i]) {
            differences++;
        }
    }
    return differences;
}
function getErrorDescription(original, transcribed) {
    const suburbMismatch = checkSuburbMismatch(original, transcribed);
    const postcodeMismatch = checkPostcodeMismatch(original, transcribed);
    const streetMismatch = checkStreetMismatch(original, transcribed);
    const errors = [];
    if (suburbMismatch)
        errors.push("suburb mismatch");
    if (postcodeMismatch)
        errors.push("postcode error");
    if (streetMismatch)
        errors.push("street name error");
    return errors.length > 0 ? errors.join(", ") : "minor formatting differences";
}
// Action to run transcription simulation tests
export const runTranscriptionSimulationTests = action({
    args: {
        baseAddresses: v.optional(v.array(v.string())),
        maxScenariosPerAddress: v.optional(v.number()),
    },
    returns: v.object({
        success: v.boolean(),
        scenarios: v.optional(v.array(v.any())),
        results: v.optional(v.any()),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        try {
            // Use default addresses if none provided
            const defaultAddresses = [
                "18A Chaucer Crescent, Canterbury VIC 3124",
                "123 Collins Street, Melbourne VIC 3000",
                "300 Chapel Street, Prahran VIC 3181",
            ];
            const baseAddresses = args.baseAddresses || defaultAddresses;
            const scenarios = generateVoiceInputScenarios(baseAddresses);
            // Limit scenarios per address
            const limitedScenarios = args.maxScenariosPerAddress
                ? scenarios.slice(0, baseAddresses.length * args.maxScenariosPerAddress)
                : scenarios;
            // Run validation tests on the transcribed addresses
            // Note: This would need to be implemented to actually test the scenarios
            return {
                success: true,
                scenarios: limitedScenarios,
                results: null, // Would be populated by actual validation tests
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Transcription simulation failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
});
