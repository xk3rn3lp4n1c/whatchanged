# whatchanged

> Generate Conventional Commit messages from your staged changes — using a local LLM via [Ollama](https://ollama.com). No API keys, no cloud, nothing leaves your machine.

`whatchanged` reads your staged Git diff, sends it to a model running locally in Ollama, and drops a clean [Conventional Commits](https://www.conventionalcommits.org/) message straight into the Source Control input box. Review it, tweak it, commit.

<!-- Replace with a real demo GIF before publishing — it's the single biggest driver of installs. -->

<!-- ![Demo](media/demo.gif) -->

## Features

- **100% local** — runs entirely against your own Ollama server. No API key, no account, no network calls beyond `localhost`.
- **Conventional Commits** — output follows the spec (`feat:`, `fix:`, `chore:`, `refactor:`, etc.) with an imperative subject and an optional bulleted body.
- **One command** — stage your changes, run it, and the message lands in the SCM input box ready to edit.
- **Configurable model** — point it at whatever you've pulled (`qwen2.5-coder`, `llama3.2`, `codellama`, …).
- **Handles the real world** — large diffs are truncated to stay within context, requests are cancellable and time-limited, and you get clear errors when Ollama isn't running or the model isn't pulled.

## Requirements

- [Ollama](https://ollama.com) installed and running (`ollama serve`).
- At least one model pulled. The default is `qwen2.5-coder`:
  ```bash
  ollama pull qwen2.5-coder
  ```
- Git, and a workspace folder that is a Git repository.

## Installation

**From the Marketplace** — search for `whatchanged` in the Extensions panel and click Install.

**From a `.vsix`** — download the file, then:

```bash
code --install-extension whatchanged-0.0.1.vsix
```

Or in VS Code: Extensions panel → `…` menu → **Install from VSIX**.

## Usage

1. Stage the changes you want to commit (`git add …`, or use the Source Control panel).
2. Open the Command Palette (`Cmd/Ctrl+Shift+P`).
3. Run **whatchanged: Generate Commit Message**.
4. The generated message appears in the Source Control input box. Review, edit if needed, and commit.

A notification shows progress while the model generates, and can be cancelled at any time.

## Configuration

| Setting                       | Default                  | Description                                                   |
| ----------------------------- | ------------------------ | ------------------------------------------------------------- |
| `commitHelper.ollama.baseUrl` | `http://localhost:11434` | URL of your Ollama server.                                    |
| `commitHelper.ollama.model`   | `qwen2.5-coder`          | Model used to generate the message. Must be pulled in Ollama. |

Set these via **Settings → Extensions → whatchanged**, or in `settings.json`:

```json
{
  "commitHelper.ollama.model": "llama3.2",
  "commitHelper.ollama.baseUrl": "http://localhost:11434"
}
```

Run `ollama list` to see which models you've already pulled.

## How it works

The extension runs `git diff --cached` in your workspace, wraps the diff in a prompt instructing the model to follow Conventional Commits, and POSTs it to Ollama's `/api/chat` endpoint (non-streaming). The response is stripped of any stray markdown or boilerplate and written to the Git Source Control input box. The diff never leaves your machine.

## Troubleshooting

**"Could not reach Ollama…"** — Ollama isn't running. Start it with `ollama serve` (or launch the Ollama app), then try again.

**"Ollama model '…' not found"** — the configured model isn't pulled. Run `ollama pull <model>`, or change `commitHelper.ollama.model` to one you already have.

**"No staged changes found"** — stage something first with `git add` or the Source Control panel.

**"Request timed out"** — local generation can be slow on the first run while the model loads into memory. Try again, or switch to a smaller/faster model.

## Privacy

Your code and diffs are sent only to the Ollama server you configure — by default `localhost`. Nothing is transmitted to any third-party service, and no API keys are stored.

## License

MIT
