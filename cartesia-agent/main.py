"""Cartesia Line voice agent for address finding."""

import os
import uuid

from line.llm_agent import LlmAgent, LlmConfig, end_call
from line.voice_agent_app import VoiceAgentApp

from config import INTRODUCTION, LLM_MODEL, LLM_TEMPERATURE, SYSTEM_PROMPT
from tools import build_tools


def _extract_session_id(call_request) -> str:
    metadata = getattr(call_request, "metadata", None)
    if isinstance(metadata, dict):
        session_id = metadata.get("session_id") or metadata.get("sessionId")
        if isinstance(session_id, str) and session_id:
            return session_id

    if metadata is not None:
        session_id = getattr(metadata, "session_id", None) or getattr(
            metadata, "sessionId", None
        )
        if isinstance(session_id, str) and session_id:
            return session_id

    fallback = f"cartesia_{uuid.uuid4()}"
    print(f"[main] Missing session metadata; using isolated fallback {fallback}")
    return fallback


async def get_agent(env, call_request):
    session_id = _extract_session_id(call_request)
    return LlmAgent(
        model=LLM_MODEL,
        api_key=os.getenv("GEMINI_API_KEY"),
        tools=[*build_tools(session_id), end_call],
        config=LlmConfig(
            system_prompt=SYSTEM_PROMPT,
            introduction=INTRODUCTION,
            temperature=LLM_TEMPERATURE,
        ),
    )


app = VoiceAgentApp(get_agent=get_agent)

if __name__ == "__main__":
    app.run()
