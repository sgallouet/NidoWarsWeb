# Codex Project Guidance

Use the local Codex skill at `skills/nido-wars-architecture/SKILL.md` when working in this repository.

Nido Wars is a realtime browser strategy game. Keep changes small, beautiful, modular, and performance-aware. Protect steady 60 FPS before adding visual complexity, keep the live canvas game as the first screen, and prefer in-world feedback over large explanatory UI.

Epic asset rule: every asset the game uses, and every source file needed to regenerate it, must live under `D:\Codex\NidoWarsWeb` before code, scripts, manifests, skills, or docs reference it. Never leave active paths pointing at Downloads, temp folders, external drives, URLs, or any other uncommitted location.

For feature work, rendering/input/UI changes, or performance-sensitive edits, read the skill references that match the task before changing files.
