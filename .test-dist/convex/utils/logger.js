// Simple environment-aware logger for Convex actions
export function log(message, ...optionalParams) {
    if (process.env.ENABLE_DEBUG_LOGS === "true") {
        // eslint-disable-next-line no-console
        console.log(`[DEBUG] ${message}`, ...optionalParams);
    }
}
