# Laura AI Model Provider Abstraction & Integration Guide

## Overview

The Model Provider Abstraction decouples Laura AI's cognitive pipeline (`gabbySubstrate`, `facts.ts`, `extractionEngine`, `server.ts`) from specific LLM implementations.

## Environment Configuration

Configure environment variables in `.env` or system environment variables:

```env
# Provider API Keys
GEMINI_API_KEY="your-gemini-api-key"
```

## Verification Procedure

1. **Verify Gemini Provider**:
   - Run a request through Laura. The `executionMetadata` returns `provider: "Gemini"` and `model: "gemini-3.6-flash"`.

