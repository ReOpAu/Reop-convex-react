"""Loopback tools for the Cartesia Line address finder agent.

Each call gets its own in-memory state bag keyed by the browser-provided
session ID. Tool-driven UI updates are forwarded through Convex using the
shared bridge secret so concurrent callers cannot overwrite each other's
browser state.
"""

import json
import os
from typing import Annotated

import httpx
from line.llm_agent import loopback_tool

from intent_classification import classify_location_intent

CONVEX_URL = os.getenv("CONVEX_URL", "")
BRIDGE_TOKEN = os.getenv("CARTESIA_BRIDGE_SECRET", "")


async def _call_convex(path: str, args: dict, kind: str) -> dict:
    url = f"{CONVEX_URL}/api/{kind}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            url,
            json={"path": path, "args": args},
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def _call_convex_action(path: str, args: dict) -> dict:
    return await _call_convex(path, args, "action")


async def _call_convex_mutation(path: str, args: dict) -> dict:
    return await _call_convex(path, args, "mutation")


def _format_suggestion(suggestion: dict) -> dict:
    return {
        "placeId": suggestion.get("placeId", ""),
        "description": suggestion.get("description", ""),
        "resultType": suggestion.get("resultType", "general"),
        "suburb": suggestion.get("suburb"),
        "confidence": suggestion.get("confidence", 0),
        "types": suggestion.get("types", []),
        "structuredFormatting": suggestion.get("structuredFormatting"),
    }


def _mark_validated_suggestion(suggestion: dict) -> dict:
    enriched = dict(suggestion)
    types = list(enriched.get("types") or [])
    for marker in ("street_address", "validated_address"):
        if marker not in types:
            types.append(marker)
    enriched["types"] = types
    enriched["resultType"] = enriched.get("resultType") or "address"
    return enriched


def build_tools(session_id: str):
    session_state = {
        "last_query": None,
        "last_suggestions": [],
        "last_intent": "general",
        "current_selection": None,
        "selection_acknowledged": False,
    }

    def _reset_state():
        session_state["last_query"] = None
        session_state["last_suggestions"] = []
        session_state["last_intent"] = "general"
        session_state["current_selection"] = None
        session_state["selection_acknowledged"] = False

    async def _push_state_update(update_type: str, data: dict):
        if not BRIDGE_TOKEN:
            print("[tools] CARTESIA_BRIDGE_SECRET missing; skipping UI update")
            return

        try:
            await _call_convex_mutation(
                "cartesia/sessionState:pushUpdate",
                {
                    "sessionId": session_id,
                    "updateType": update_type,
                    "data": json.dumps(data),
                    "bridgeToken": BRIDGE_TOKEN,
                },
            )
        except Exception as error:
            print(f"[tools] Failed to push state update: {error}")

    @loopback_tool
    async def search_address(
        ctx,
        query: Annotated[str, "The address, suburb, or street name to search for"],
    ) -> str:
        """Search for an Australian address, suburb, or street name. Updates suggestions on screen. Always clears existing selection."""
        session_state["current_selection"] = None
        session_state["selection_acknowledged"] = False

        intent = classify_location_intent(query)

        if intent == "address":
            try:
                loose_result, strict_result = None, None

                try:
                    loose_result = await _call_convex_action(
                        "address/getPlaceSuggestions:getPlaceSuggestions",
                        {"query": query, "intent": "general", "isAutocomplete": True},
                    )
                except Exception as error:
                    print(f"[tools] Loose search failed: {error}")

                try:
                    strict_result = await _call_convex_action(
                        "address/getPlaceSuggestions:getPlaceSuggestions",
                        {
                            "query": query,
                            "intent": "address",
                            "maxResults": 1,
                            "isAutocomplete": False,
                        },
                    )
                except Exception as error:
                    print(f"[tools] Strict validation failed: {error}")

                strict_value = (strict_result or {}).get("value", strict_result or {})
                loose_value = (loose_result or {}).get("value", loose_result or {})

                if strict_value.get("success") and strict_value.get("suggestions"):
                    validated = _mark_validated_suggestion(strict_value["suggestions"][0])
                    all_suggestions = (
                        loose_value.get("suggestions", [])
                        if loose_value.get("success")
                        else [validated]
                    )
                    detected_intent = strict_value.get("detectedIntent", intent)
                    cached_suggestions = [
                        validated
                        if suggestion.get("placeId") == validated.get("placeId")
                        else suggestion
                        for suggestion in all_suggestions
                    ]
                    if not any(
                        suggestion.get("placeId") == validated.get("placeId")
                        for suggestion in cached_suggestions
                    ):
                        cached_suggestions = [validated, *cached_suggestions]

                    session_state["last_query"] = query
                    session_state["last_suggestions"] = cached_suggestions
                    session_state["last_intent"] = detected_intent

                    await _push_state_update(
                        "suggestions",
                        {
                            "query": query,
                            "intent": detected_intent,
                            "suggestions": [
                                _format_suggestion(suggestion)
                                for suggestion in cached_suggestions
                            ],
                        },
                    )

                    return json.dumps(
                        {
                            "status": "validated",
                            "count": 1,
                            "message": "Found it — it's on screen.",
                            "note": "IMPORTANT: Do NOT read the address aloud. The user can see it on screen. Just say something brief like 'Found it' or 'That's on screen now'.",
                        }
                    )

                if loose_value.get("success") and loose_value.get("suggestions"):
                    suggestions = loose_value["suggestions"]
                    detected_intent = loose_value.get("detectedIntent", intent)

                    session_state["last_query"] = query
                    session_state["last_suggestions"] = suggestions
                    session_state["last_intent"] = detected_intent

                    await _push_state_update(
                        "suggestions",
                        {
                            "query": query,
                            "intent": detected_intent,
                            "suggestions": [
                                _format_suggestion(suggestion)
                                for suggestion in suggestions
                            ],
                        },
                    )

                    return json.dumps(
                        {
                            "status": "suggestions_available",
                            "count": len(suggestions),
                            "message": "Some options are on screen.",
                            "note": "IMPORTANT: Do NOT read addresses aloud or state the count. Just say 'some options are on screen' or similar.",
                        }
                    )

                session_state["last_query"] = query
                session_state["last_suggestions"] = []
                session_state["last_intent"] = intent
                return json.dumps(
                    {
                        "status": "validation_failed",
                        "error": "The provided address could not be validated.",
                    }
                )
            except Exception as error:
                session_state["last_query"] = query
                session_state["last_suggestions"] = []
                session_state["last_intent"] = intent
                return json.dumps({"status": "error", "error": str(error)})

        try:
            result = await _call_convex_action(
                "address/getPlaceSuggestions:getPlaceSuggestions",
                {"query": query, "intent": intent, "maxResults": 5, "isAutocomplete": True},
            )
        except Exception as error:
            session_state["last_query"] = query
            session_state["last_suggestions"] = []
            session_state["last_intent"] = intent
            return json.dumps({"status": "error", "error": f"Search failed: {error}"})

        value = result.get("value", result)

        if not value.get("success"):
            session_state["last_query"] = query
            session_state["last_suggestions"] = []
            session_state["last_intent"] = intent
            return json.dumps(
                {
                    "status": "error",
                    "error": value.get("error", "Unknown error"),
                }
            )

        suggestions = value.get("suggestions", [])
        detected_intent = value.get("detectedIntent", intent)

        session_state["last_query"] = query
        session_state["last_suggestions"] = suggestions
        session_state["last_intent"] = detected_intent

        await _push_state_update(
            "suggestions",
            {
                "query": query,
                "intent": detected_intent,
                "suggestions": [
                    _format_suggestion(suggestion) for suggestion in suggestions
                ],
            },
        )

        if not suggestions:
            return json.dumps(
                {
                    "status": "no_results",
                    "message": f"No results for '{query}'. Could you try a different search?",
                }
            )

        return json.dumps(
            {
                "status": "suggestions_available",
                "count": len(suggestions),
                "message": "Options are on screen.",
                "note": "IMPORTANT: Do NOT read addresses aloud, state the count, or describe the results. Just say 'options are on screen' or 'take a look'.",
            }
        )

    @loopback_tool
    async def select_suggestion(
        ctx,
        place_id: Annotated[
            str, "The Google Places place ID of the suggestion to select"
        ],
    ) -> str:
        """Confirm the selection of a place by its unique placeId from current search results."""
        suggestion = None
        for current_suggestion in session_state.get("last_suggestions", []):
            if current_suggestion.get("placeId") == place_id:
                suggestion = current_suggestion
                break

        if not suggestion:
            return json.dumps(
                {
                    "status": "not_found",
                    "error": f"No suggestion with place ID '{place_id}' in current results. Use search_address to refresh.",
                }
            )

        enriched = dict(suggestion)
        try:
            result = await _call_convex_action(
                "address/getPlaceDetails:getPlaceDetails",
                {"placeId": place_id},
            )
            value = result.get("value", result)
            if value.get("success") and value.get("details"):
                details = value["details"]
                enriched.update(
                    {
                        "description": details.get(
                            "formattedAddress", enriched.get("description", "")
                        ),
                        "suburb": details.get("suburb", enriched.get("suburb")),
                        "postcode": details.get("postcode"),
                        "lat": details.get("lat"),
                        "lng": details.get("lng"),
                        "types": details.get("types", enriched.get("types", [])),
                    }
                )
        except Exception as error:
            print(f"[tools] Place details enrichment failed: {error}")

        session_state["current_selection"] = enriched

        await _push_state_update(
            "selection",
            {
                "suggestion": _format_suggestion(enriched),
                "query": session_state.get("last_query"),
            },
        )

        return json.dumps(
            {
                "status": "confirmed",
                "message": "Done.",
                "note": "IMPORTANT: Do NOT read the address aloud. It is visible on screen. Say 'got it', 'done', or ask what's next.",
            }
        )

    @loopback_tool
    async def select_by_ordinal(
        ctx,
        ordinal: Annotated[str, "Position like 'first', 'second', '1', '2', etc."],
    ) -> str:
        """Select a suggestion by its position from the last search results. ALWAYS use this for ordinal references."""
        ordinal_map = {
            "first": 0,
            "1": 0,
            "1st": 0,
            "second": 1,
            "2": 1,
            "2nd": 1,
            "third": 2,
            "3": 2,
            "3rd": 2,
            "fourth": 3,
            "4": 3,
            "4th": 3,
            "fifth": 4,
            "5": 4,
            "5th": 4,
        }

        index = ordinal_map.get(ordinal.lower().strip())
        if index is None:
            return json.dumps(
                {
                    "status": "error",
                    "error": f"Didn't understand '{ordinal}'. Please say first, second, third, etc.",
                }
            )

        suggestions = session_state.get("last_suggestions", [])
        if not suggestions:
            return json.dumps(
                {
                    "status": "error",
                    "error": "No search results to select from. Please search for an address first.",
                }
            )

        if index >= len(suggestions):
            return json.dumps(
                {
                    "status": "error",
                    "error": f"Only {len(suggestions)} results available. Choose 1 to {len(suggestions)}.",
                }
            )

        selected = suggestions[index]
        place_id = selected.get("placeId", "")

        if not place_id:
            return json.dumps(
                {
                    "status": "error",
                    "error": "That suggestion doesn't have a valid place ID. Try another.",
                }
            )

        return await select_suggestion(ctx, place_id)

    @loopback_tool
    async def get_current_state(ctx) -> str:
        """Get comprehensive session state including search, suggestions, and selection for debugging."""
        selection = session_state.get("current_selection")
        return json.dumps(
            {
                "last_query": session_state.get("last_query"),
                "last_intent": session_state.get("last_intent"),
                "num_suggestions": len(session_state.get("last_suggestions", [])),
                "has_selection": selection is not None,
                "selection_acknowledged": session_state.get(
                    "selection_acknowledged", False
                ),
                "current_selection": {
                    "description": selection.get("description", ""),
                    "suburb": selection.get("suburb"),
                    "postcode": selection.get("postcode"),
                }
                if selection
                else None,
            },
            indent=2,
        )

    @loopback_tool
    async def clear_selection(ctx) -> str:
        """Clear current selection and search state, resetting the system so user can start over."""
        _reset_state()
        await _push_state_update("clear", {})

        return json.dumps(
            {
                "status": "cleared",
                "message": "Ready for a new search.",
            }
        )

    @loopback_tool
    async def show_options_again(ctx) -> str:
        """Show the previous address options again after a selection has been confirmed."""
        suggestions = session_state.get("last_suggestions", [])
        query = session_state.get("last_query")

        if not suggestions or not query:
            return json.dumps(
                {
                    "status": "error",
                    "error": "No previous options available.",
                }
            )

        session_state["current_selection"] = None
        session_state["selection_acknowledged"] = False

        await _push_state_update(
            "show_options_again",
            {
                "query": query,
                "intent": session_state.get("last_intent", "general"),
                "suggestions": [
                    _format_suggestion(suggestion) for suggestion in suggestions
                ],
            },
        )

        return json.dumps(
            {
                "status": "options_displayed",
                "count": len(suggestions),
                "message": "Previous options are on screen again.",
                "note": "Do NOT list the options. They are visible on screen.",
            }
        )

    @loopback_tool
    async def confirm_user_selection(ctx) -> str:
        """Call AFTER you have verbally acknowledged a selection to the user. Logs confirmation to history."""
        selection = session_state.get("current_selection")
        if not selection:
            return json.dumps(
                {
                    "status": "error",
                    "error": "No selection to confirm.",
                }
            )

        return json.dumps(
            {
                "status": "acknowledged",
                "message": "Selection confirmed.",
            }
        )

    @loopback_tool
    async def set_selection_acknowledged(
        ctx,
        acknowledged: Annotated[
            str,
            "'true' or 'false' — whether the agent has acknowledged the selection to the user",
        ],
    ) -> str:
        """Set UI synchronization flag. Set true after confirming selection, false when starting new search."""
        is_ack = acknowledged.lower().strip() in ("true", "1", "yes")
        session_state["selection_acknowledged"] = is_ack

        await _push_state_update(
            "selection_acknowledged",
            {
                "acknowledged": is_ack,
            },
        )

        return json.dumps(
            {
                "status": "ok",
                "selection_acknowledged": is_ack,
            }
        )

    @loopback_tool
    async def request_manual_input(
        ctx,
        reason: Annotated[str, "Brief explanation of why manual input is needed"],
    ) -> str:
        """Enable manual text input while keeping voice conversation active (hybrid mode)."""
        await _push_state_update(
            "request_manual_input",
            {
                "reason": reason,
            },
        )

        return json.dumps(
            {
                "status": "hybrid_mode_activated",
                "message": "Manual input enabled.",
            }
        )

    return [
        search_address,
        select_suggestion,
        select_by_ordinal,
        get_current_state,
        clear_selection,
        show_options_again,
        confirm_user_selection,
        set_selection_acknowledged,
        request_manual_input,
    ]
