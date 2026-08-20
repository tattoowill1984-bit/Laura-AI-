# Laura AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Laura — an open-source persistent, adaptive AI agent framework combining large language models, structured memory, and runtime state to build long-lived personal AI assistants.

---

## What is Laura?

Laura is an open-source experiment and framework for building persistent, adaptive AI agents. Rather than being a simple chat wrapper, Laura combines a pluggable foundation model with persistent memory, runtime state management, and learning/feedback loops so the assistant improves and remembers over time.

## Why Laura matters

Most chatbot projects reset context or store flat logs. Laura’s architecture is focused on long-lived, explainable behavior: memory that’s searchable and structure-aware, a runtime that enforces autonomy boundaries and governance, and tools to reproduce, test, and benchmark agentic behaviors.

## Core features

- Persistent, searchable memory per user/context
- Pluggable LLM adapters (swap LLM backends easily)
- Runtime state and task orchestration for multi-step actions
- Session recording and replay for debugging and evaluation
- Governance and policy boundaries for safe autonomy

## Quick start (updated)

This repository is a Node + TypeScript project (see `package.json`). The quick start below works on macOS/Linux/Windows (WSL).

Prerequisites

- Node.js 18.x or newer (Node 20 recommended)
- Git

1. Clone the repo

   git clone https://github.com/tattoowill1984-bit/Laura-AI-.git
   cd Laura-AI-

2. Install dependencies

   npm install

   Note: the repo includes `bun.lock` — bun can be used as an alternative JavaScript runtime if you prefer, but `npm install` works reliably.

3. Configure environment

   Copy the example environment file and populate any required API keys:

   cp .env.example .env
   # Edit .env and add your keys (e.g. OPENAI_API_KEY, GOOGLE_API_KEY, etc.)

4. Run in development

   npm run dev

   This runs the TypeScript server (`tsx server.ts`) and starts the dev environment. Check the terminal output for the local URLs. Common dev ports:
   - Vite (frontend): http://localhost:5173
   - Backend server: http://localhost:3000 (or another port printed in the console)

5. Build for production

   npm run build
   npm run start

Troubleshooting

- If you see TypeScript errors, run `npm run lint` to check types.
- If the dev server does not come up, check `.env` for missing API keys.

## Demo / screenshots

(Place a GIF or screenshot here showing Laura in action. I can generate a demo GIF after I run the project locally.)

## Architecture (brief)

Laura is structured as three main layers:

1. Foundation Model Adapter — pluggable LLM interfaces
2. Memory Layer — persistent, searchable memory & retrieval
3. Runtime & Orchestration — task/state management, action execution, governance

## Roadmap (starter)

- v0.1: Core agent runtime + pluggable LLM adapter, local demo
- v0.2: Persistent memory implementation + search and replay
- v0.3: Governance module (policy sandboxing) + tests/benchmarks
- v1.0: Polished demo, docs site, reproducible benchmarks

## Contributing

Thanks for your interest! To get started:

- Read CONTRIBUTING.md
- Open issues for bugs or feature requests
- Label beginner-friendly issues with "good first issue" or "help wanted"

## License

This repository is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Contact

Open an issue or discussion on GitHub.
