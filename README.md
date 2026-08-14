# 🧠 Laura AI: A Pre-Attentive Cognitive Architecture for Gemini

Most AI agent frameworks are token-heavy, high-latency, and prone to hallucinations. I built Laura AI directly from my phone to solve this exact problem using a neuro-inspired pre-attentive pipeline.

### ⚡ The Core Innovation: "Fast" Pre-Filtering
Instead of flooding heavy LLMs with raw environmental data streams, Laura AI utilizes a low-latency, resource-efficient Fast Processing Layer. 
* 🚪 **Observation Envelope:** Bounds incoming data by time, geography, or relevance.
* 🛑 **Significance Fusion:** Dropping 90%+ of background noise, habits, and irrelevant sensory data.
* 🚀 **Smart Escalation:** Only complex, high-priority temporal anomalies are escalated to the **LLM Consult** (via Google AI Studio / Gemini).

### 🛡️ Epistemic Security & Closed-Loop Learning
* 🔍 **Epistemic Check:** Validates token outputs against a structured **Evidence DAG** before commands hit the Executor, acting as a real-time hallucination filter.
* 🔄 **Outcome Feedback:** Continuously updates the Fast Layer's expectations based on real-world results, building a self-hardening loop.

Built entirely on a lightweight stack (TypeScript/Bun/Vite) optimized for edge computing and seamless Google AI Studio integration.
