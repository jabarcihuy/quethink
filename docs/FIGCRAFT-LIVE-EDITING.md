# FigCraft desktop live editing

## Current connection

On 2 November 2026 the FigCraft MCP reported `backend: headless`. It can edit and render the design, but is not attached to the desktop window. The configured command was `/usr/bin/figcraft-cli` with arguments `["mcp"]`.

The installed FigCraft README and `figcraft-cli mcp --help` document desktop attachment. This is a local connection; online collaboration and uploading the file are not required.

## Desktop attachment

Save your desktop edits first. Open FigCraft with its local control port and access limited to the mobile project:

```bash
figcraft --control 47800 \
  --automation-write-root /home/abdulinux/Projects/mobileApp/quethink \
  /home/abdulinux/Projects/mobileApp/quethink/docs/Quethink-Mobile-Prototype.figcraft
```

Configure the Codex FigCraft MCP server to use:

```toml
[mcp_servers.figcraft]
command = "/usr/bin/figcraft-cli"
args = ["mcp", "--attach", "47800"]
```

Reconnect/restart that MCP connection after the desktop app is ready. Verify using `inspect_ui`: it should report an attached app with window information rather than headless. Only then does a window screenshot represent the same desktop file the user is seeing.

Until that verification succeeds, agent screenshots are engine renders and must not be described as desktop live observation.

## Verified desktop connection — 2 November 2026

The desktop connection on port 47800 was verified using the installed `figcraft-cli mcp --attach 47800` bridge. Window inspection returned a focused FigCraft desktop window and screenshots with source `window`. Icon alignment was edited and saved through that attached connection. The original registered MCP process remains headless; do not use it to save its stale copy over the desktop file. Continue through the attached connection or reconnect the registered server before further edits.
