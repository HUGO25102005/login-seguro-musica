@AGENTS.md
# Project: login-seguro

This project is dedicated to building a highly secure authentication system using modern fullstack technologies. All development must prioritize security, performance, and code quality.

## Project Identity & Standards

- **Goal:** Develop a robust and secure login application.
- **Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS.
- **Security Mandate:** Adhere to OWASP Top 10 mitigations and industry-standard security best practices. Never compromise security for convenience.

## Specialized Agent Skills

The following skills have been installed and should be leveraged for relevant tasks:

- **`fullstack-developer`**: Expert guidance on Next.js/React architecture and implementation.
- **`fullstack-guardian`**: Specialized knowledge for building secure and robust fullstack applications.
- **`security-best-practices`**: Industry-standard security implementations and auditing guidelines.

## Custom Subagents

To handle complex tasks with expert precision, utilize the following subagents:

### `@fullstack_dev`
- **Focus:** Feature implementation, UI/UX, and system architecture.
- **When to use:** Designing new components, integrating APIs, or refactoring frontend/backend logic.
- **Instructions:** Located in `.gemini/agents/fullstack_dev.md`.

### `@security_eng`
- **Focus:** Security audits, hardening, and threat modeling.
- **When to use:** Reviewing code for vulnerabilities, implementing auth logic, or configuring security headers.
- **Instructions:** Located in `.gemini/agents/security_eng.md`.

## Workflow Guidelines

1.  **Security First:** Every feature must be reviewed by the `@security_eng` persona (or with its mindset).
2.  **Type Safety:** Maintain strict TypeScript definitions across the entire stack.
3.  **Testing:** All security-critical paths (login, logout, token handling) must have comprehensive tests.
4.  **Documentation:** Document security decisions and architectural choices clearly in the codebase or relevant `.md` files.
