# NewYork

NewYork is a ServiceNow **AIUX** application built with the ServiceNow SDK (Fluent). It runs as a scoped app (`x_1433234_newyork`) on a ServiceNow instance and is served at `/newyork`.

## What's in the app

| Route        | What it does                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `/home`      | Landing page with an overview of the app and feature cards.                                           |
| `/city`      | An interactive isometric 3D New York City scene (Three.js). Click a city service to open its details panel. |
| `/incidents` | A live list of active incidents from your instance, rendered with `ListDataManager` and `<aiux-list-connected>`. |

The `widgets/` folder has a sample widget (`aiux-hello-world`) with a server script.

## Prerequisites

1. **The AIUX (LUX) extension for VS Code.** Install the ServiceNow AIUX extension, plus the recommended `servicenow.fluent-language-extension` (VS Code will offer it when you open the project).
2. **A ServiceNow instance on the latest release**, with admin access so you can install scoped apps.
3. **Node.js and the ServiceNow SDK, latest versions.**
   - Node.js `24.14.1` or newer (see `.nvmrc`; run `nvm use` if you use nvm).
   - The ServiceNow SDK (`@servicenow/sdk`) installs with the project's dependencies, so you can run it with `pnpm now-sdk …`.
4. **pnpm.** The project uses pnpm 11. The simplest way to get it is `corepack enable`.

## Getting started

### 1. Install dependencies

```bash
git clone <repo-url>
cd newyork
nvm use            # optional, picks up Node from .nvmrc
corepack enable    # sets up pnpm
pnpm install
```

`pnpm install` also runs a `postinstall` script that copies the ServiceNow agent skills into `.claude/skills` and `.agents/skills`, so AI coding agents can use them.

### 2. Connect to your ServiceNow instance

Add your instance credentials to the SDK:

```bash
pnpm now-sdk auth --add https://<your-instance>.service-now.com
```

For local development the app also reads a `.env` file in the project root. It's git-ignored, so create it yourself:

```bash
GLIDE_ORIGIN=https://<your-instance>.service-now.com
AUTH_TOKEN=<your-token>
```

Don't commit `.env`.

### 3. Run it locally

```bash
pnpm dev
```

This starts the dev server against your instance. Open the URL it prints and go to `/home`.

### 4. Build and deploy to the instance

```bash
pnpm build      # compile the AIUX bundles and app metadata into dist-metadata/
pnpm deploy     # install the app on your instance
```

To overwrite an app that's already installed, run `pnpm deploy:reinstall`.

## Commands

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `pnpm dev`              | Start the local dev server                    |
| `pnpm build`            | Build the AIUX frontend and metadata          |
| `pnpm lint`             | Run ESLint (AIUX a11y, i18n, SSR, style rules) |
| `pnpm deploy`           | Install the app on the ServiceNow instance    |
| `pnpm deploy:reinstall` | Reinstall, overwriting the existing app       |
| `pnpm doctor`           | Check the AIUX project setup                  |
| `pnpm agent:skills`     | Re-copy the agent skills into `.claude/skills` |

## Project structure

```
pages/              # File-based routing: each directory is a URL route
  home/             #   page.js plus page-scoped components/
  city/
  incidents/
widgets/            # Widgets (custom elements with server scripts)
src/fluent/         # Fluent (ServiceNow SDK) metadata
aiux.json           # AIUX app manifest (name, basename, landing page)
now.config.json     # ServiceNow scope manifest (scope, scopeId)
theme.js, *.app.css # Theme and Tailwind/DaisyUI styles
```

## Development conventions

- Components extend `AIUXElement` from `@servicenow/aiux/aiux-components-core`, never `LitElement`.
- Guard `window`, `document`, and `localStorage` with `isServer` from `lit`, because pages render on the server too.
- Style with Tailwind and DaisyUI. Don't use `--now-*` CSS tokens.
- For lists and record forms, use the AIUX data components (`ListDataManager`, `RecordDataManager`) instead of custom markup.
- Run `pnpm lint` and `pnpm build` before you deploy.

For the full guidance for AI coding agents, see [`AGENTS.md`](AGENTS.md).
