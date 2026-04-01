import { v } from "convex/values";
import { api } from "../_generated/api";
import { action } from "../_generated/server";
import { requireIdentity } from "../utils/auth";
export const getAccessToken = action({
    args: {
        sessionId: v.string(),
    },
    returns: v.union(v.object({
        success: v.literal(true),
        token: v.string(),
    }), v.object({
        success: v.literal(false),
        error: v.string(),
    })),
    handler: async (ctx, args) => {
        await requireIdentity(ctx);
        const apiKey = process.env.CARTESIA_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Cartesia API key not configured",
            };
        }
        if (!process.env.CARTESIA_BRIDGE_SECRET) {
            return {
                success: false,
                error: "Cartesia bridge secret not configured",
            };
        }
        await ctx.runMutation(api.cartesia.sessionState.registerSession, {
            sessionId: args.sessionId,
        });
        try {
            const resp = await fetch("https://api.cartesia.ai/access-token", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Cartesia-Version": "2025-04-16",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    grants: { stt: true, tts: true, agent: true },
                    expires_in: 300,
                }),
            });
            if (!resp.ok) {
                const errorText = await resp.text();
                console.error("[getAccessToken] Cartesia API error:", errorText);
                return {
                    success: false,
                    error: `HTTP ${resp.status}: ${errorText}`,
                };
            }
            const data = await resp.json();
            const token = data.token;
            if (!token) {
                return {
                    success: false,
                    error: "No token in response",
                };
            }
            return { success: true, token };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[getAccessToken] Exception:", message);
            return { success: false, error: message };
        }
    },
});
