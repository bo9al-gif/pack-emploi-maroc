# AI Maroc — Claude Project Guide

## Project
AI Maroc is a Morocco-focused web assistant and digital-services storefront.
Repository: bo9al-gif/pack-emploi-maroc
Production site: https://pack-emploi-maroc.vercel.app/
Primary branch: main

## Current architecture
- Static HTML/CSS/JS frontend.
- Node/Express server entry: server.js
- AI endpoint: api/chat.js
- Free AI routing and fallbacks: api/free-router.js
- Public tools endpoint: api/public-tools.js
- Browser chat history is currently localStorage-based.
- Commerce links point to the Shopify storefront.

## Current AI routing
Configured providers are tried in order:
1. Groq
2. Cerebras
3. Gemini
4. OpenRouter
5. Hugging Face
6. Keyless public fallback (Pollinations), unless disabled.

Do not hard-code secrets into the repository. API keys belong in the deployment environment.

## Development rules
- Inspect the existing code before changing it.
- For behavioral changes or bug fixes, write a failing regression test first, then implement the smallest fix, then run the full test suite.
- Never invent official Moroccan procedures, jobs, prices, API limits, injuries, or other changing facts.
- Prefer reliable official sources for changing/official information.
- Keep the UI usable on mobile and in Arabic RTL.
- Do not introduce paid services, purchases, subscriptions, or billing changes without explicit user awareness.

## Collaboration: ChatGPT + Claude
There is no direct Claude connector in the current ChatGPT toolset. The shared source of truth is therefore:
- GitHub repository for code and durable project instructions.
- Slack for coordination and status messages when connected.
- Vercel for deployment state when the account connection is available.
- Supabase for persistent app data when/if enabled.

When Claude changes code, commit it to a branch and leave a clear commit/PR message.
When ChatGPT changes code, do the same.
Do not overwrite another agent's work without reviewing the latest main/branch state first.

## Definition of done
A change is not considered complete until:
1. The implementation is present in GitHub.
2. Relevant tests pass.
3. Syntax/build checks pass.
4. Deployment status is known when deployment is part of the change.
5. The final behavior is described clearly, including any remaining limitation.
