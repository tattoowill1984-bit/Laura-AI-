# Laura AI Model Provider Abstraction & Integration Guide

## Overview

The Model Provider Abstraction decouples Laura AI's cognitive pipeline (`gabbySubstrate`, `facts.ts`, `extractionEngine`, `server.ts`) from specific LLM implementations.

## Environment Configuration

Configure `LAURA_MODEL_PROVIDER` in your `.env` or system environment variables:

```env
# Selected Provider: gemini | claude
LAURA_MODEL_PROVIDER=gemini

# Provider API Keys
GEMINI_API_KEY="your-gemini-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Swap Test Procedure

1. **Verify Default Gemini Provider**:
   - Ensure `LAURA_MODEL_PROVIDER=gemini` or default.
   - Run a request through Laura. The `executionMetadata` returns `provider: "Gemini"` and `model: "gemini-2.5-flash"`.

2. **Swap to Claude Provider**:
   - Set `LAURA_MODEL_PROVIDER=claude` and `ANTHROPIC_API_KEY=your_key` in `.env`.
   - Send a prompt to Laura. The `executionMetadata` returns `provider: "Claude"` and `model: "claude-3-5-sonnet-20241022"`.

3. **Fallback Resiliency Check**:
   - If `LAURA_MODEL_PROVIDER=claude` but `ANTHROPIC_API_KEY` is omitted, the factory automatically falls back gracefully to `GeminiProvider` or local deterministic synthesis without crashing the application.
