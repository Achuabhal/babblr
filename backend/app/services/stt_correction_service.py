"""
STT Correction Service - Context-aware speech-to-text correction.

This service uses an LLM to correct speech recognition errors based on
conversation context. Unlike grammar correction, this focuses on:
- Homophones (words that sound alike)
- Similar-sounding words/phrases
- Context-based disambiguation

Example: "mi amo" vs "me llamo" when the tutor asked "¿Cómo te llamas?"
"""

import json
import logging
from dataclasses import dataclass, field

from app.config import settings
from app.services.llm.factory import ProviderFactory

logger = logging.getLogger(__name__)

# Prompt for STT correction - focuses on recognition errors, not grammar
STT_CORRECTION_PROMPT = """You are analyzing speech-to-text output for a {language} language learning conversation.
The student is at {level} level and may have imperfect pronunciation.

CONVERSATION CONTEXT (recent messages):
{conversation_context}

SPEECH-TO-TEXT OUTPUT (may contain recognition errors):
"{stt_text}"

Your task: Determine if the STT output makes sense in the context of the conversation.
If there are recognition errors (words that sound similar but don't fit the context), correct them.

Common STT errors to watch for:
- Homophones or near-homophones (words that sound alike)
- Mispronounced words that Whisper interpreted literally
- Word boundaries (e.g., "mi amo" vs "me llamo")
- Missing or added articles/pronouns

IMPORTANT:
- Only correct RECOGNITION errors, not grammar mistakes (grammar is corrected separately)
- If the STT output makes sense in context, return it unchanged
- Consider what the tutor/assistant just asked to inform corrections
- Be conservative: only correct when you're confident it's a recognition error

Respond with a JSON object:
{{
  "corrected_text": "the corrected transcription (or original if no recognition errors)",
  "stt_corrections": [
    {{
      "original": "what STT produced",
      "corrected": "what the student likely said",
      "reason": "brief explanation of why this is a recognition error"
    }}
  ],
  "confidence": 0.0-1.0
}}

If no corrections are needed, return an empty stt_corrections array.
"""


@dataclass
class STTCorrectionResult:
    """Result of STT correction."""

    original_text: str
    corrected_text: str
    corrections: list[dict] = field(default_factory=list)
    confidence: float = 1.0


class STTCorrectionService:
    """Service for correcting STT output using conversation context."""

    def __init__(self, provider_name: str | None = None):
        """Initialize the STT correction service.

        Args:
            provider_name: LLM provider to use. Defaults to settings.llm_provider.
        """
        self._provider_name = provider_name
        self._provider = None

    @property
    def provider(self):
        """Lazy-load the LLM provider."""
        if self._provider is None:
            self._provider = ProviderFactory.get_provider(self._provider_name)
        return self._provider

    async def correct_transcription(
        self,
        stt_text: str,
        conversation_history: list[dict[str, str]],
        language: str,
        difficulty_level: str = "A1",
    ) -> STTCorrectionResult:
        """Correct STT output based on conversation context.

        Args:
            stt_text: Raw transcription from Whisper.
            conversation_history: Recent conversation messages [{"role": "...", "content": "..."}].
            language: Target language (e.g., "Spanish", "Italian").
            difficulty_level: CEFR level (A1-C2) or legacy level.

        Returns:
            STTCorrectionResult with corrected text and list of corrections.
        """
        if not stt_text or not stt_text.strip():
            return STTCorrectionResult(
                original_text=stt_text, corrected_text=stt_text, corrections=[]
            )

        # Format conversation context (last N messages)
        context_messages = conversation_history[-6:]  # Last 3 exchanges
        if context_messages:
            context_lines = []
            for msg in context_messages:
                role = "Tutor" if msg["role"] == "assistant" else "Student"
                context_lines.append(f"{role}: {msg['content']}")
            conversation_context = "\n".join(context_lines)
        else:
            conversation_context = "(No previous conversation context)"

        # Normalize difficulty level
        level = difficulty_level.upper() if difficulty_level else "A1"
        if level in ["BEGINNER", "INTERMEDIATE", "ADVANCED"]:
            level_map = {"BEGINNER": "A1-A2", "INTERMEDIATE": "B1-B2", "ADVANCED": "C1-C2"}
            level = level_map.get(level, "A1-A2")

        prompt = STT_CORRECTION_PROMPT.format(
            language=language,
            level=level,
            conversation_context=conversation_context,
            stt_text=stt_text,
        )

        try:
            response = await self.provider.generate(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="",
                max_tokens=512,
                temperature=0.2,  # Low temperature for consistent corrections
            )

            # Parse JSON response
            result = self._parse_response(response.content, stt_text)

            # Log corrections in dev mode
            if settings.babblr_dev_mode and result.corrections:
                logger.info(
                    "STT Correction applied:\n  Original: %s\n  Corrected: %s\n  Corrections: %s",
                    result.original_text,
                    result.corrected_text,
                    json.dumps(result.corrections, ensure_ascii=False, indent=2),
                )

            return result

        except Exception as e:
            logger.error("STT correction failed: %s", str(e))
            # On error, return original text unchanged
            return STTCorrectionResult(
                original_text=stt_text, corrected_text=stt_text, corrections=[]
            )

    def _parse_response(self, content: str, original_text: str) -> STTCorrectionResult:
        """Parse the LLM response JSON.

        Args:
            content: Raw LLM response content.
            original_text: Original STT text (fallback).

        Returns:
            Parsed STTCorrectionResult.
        """
        try:
            # Try to extract JSON from response (handle markdown code blocks)
            json_str = content.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()

            data = json.loads(json_str)

            return STTCorrectionResult(
                original_text=original_text,
                corrected_text=data.get("corrected_text", original_text),
                corrections=data.get("stt_corrections", []),
                confidence=data.get("confidence", 1.0),
            )
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.warning("Failed to parse STT correction response: %s", str(e))
            return STTCorrectionResult(
                original_text=original_text, corrected_text=original_text, corrections=[]
            )


# Singleton instance
_stt_correction_service: STTCorrectionService | None = None


def get_stt_correction_service() -> STTCorrectionService:
    """Get the singleton STT correction service instance."""
    global _stt_correction_service
    if _stt_correction_service is None:
        _stt_correction_service = STTCorrectionService()
    return _stt_correction_service
