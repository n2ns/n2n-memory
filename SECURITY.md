# Security Policy

## Supported Versions

Security fixes target the latest published version of n2n-memory.

## Reporting a Vulnerability

Please do not open a public issue for suspected vulnerabilities.

Report security concerns through GitHub private vulnerability reporting for this repository, or contact Datafrog through the security channel listed on the organization profile.

When reporting, include:

- A description of the vulnerability.
- Steps to reproduce or a proof of concept.
- Affected versions or commit hashes.
- Any known impact or mitigation.

We aim to acknowledge reports within 5 business days.

## Security Model

n2n-memory stores project-local JSON files under `.mcp/`. It does not intentionally send memory data to remote services. Users should still review `.mcp/memory.json` before committing it to shared repositories because it may contain project-specific implementation details.
