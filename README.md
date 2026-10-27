# Log Pose — One Piece companion for Vercel

A pirate-themed episode and movie companion, now built with **JavaScript and Node.js 22**. It deploys to Vercel as static browser assets plus six Node.js functions. No C++ compiler, Homebrew curl, database, or always-running server is required.

The original C++ source remains available for learning, but **the supported Vercel workflow uses npm**.

## Deploy it on Vercel

1. Open [Vercel](https://vercel.com) and sign in with GitHub.
2. Choose **Add New → Project** and import **mostafapng/One-Piece-Projects**. If it is not listed, give the Vercel GitHub integration access to that repository.
3. Use the repository root as the **Root Directory**. The included `vercel.json` supplies the settings below; keep them as configured.
4. Leave environment variables empty for the free local fact helper, then click **Deploy**.
5. Open the website URL Vercel gives you in Brave or any other modern browser. You no longer need to keep Terminal running.

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | Repository root (`.`), not `web` or `api` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `public` |
| Node.js version | 22.x, selected by `package.json` |

All episode summaries, movie summaries, and the local question helper work **without an API key**. After importing the GitHub repository, future pushes to its production branch normally trigger a new Vercel deployment. No Vercel project or live deployment is created just by running `npm run build`.

## What is included

- **All 1,156 bundled episode summaries**, available without an external episode service.
- Original English notes for episodes 1–3; English translations/adaptations of Spanish source synopses for 4–1156, with the Spanish originals available for reference.
- A **watched-episode limit** checked on the server for every recap/chat request.
- Episode chat restricted to the selected recap, with a labeled keyword-based helper and optional ChatGPT selection.
- A separate **Movie Den** with original three-section summaries of all **15 theatrical films**, recommended anime thresholds, a watched-movie confirmation, and an isolated movie chat.
- The existing parchment, ocean-blue, gold, and pirate-font theme, with local fonts and original decorative SVG artwork.

The catalog is bundled in server functions, not copied into public assets. The browser receives only the requested episode or confirmed movie. Changing a watched limit clears visible content and invalidates late replies; changing movies clears the movie conversation. Limits are viewing preferences, not account permissions: users can change their own limit.

Recaps include the selected episode's events, and movie overviews include endings. Source wording and machine translations can contain mistakes; not every plot detail has been independently audited. Movie thresholds are cautious recommendations, not an official timeline or a complete spoiler guarantee. Sources and translation provenance are in [data/SOURCES.md](data/SOURCES.md). External reference links may reveal other story details if opened.

## Optional paid ChatGPT selection

For a public deployment, an API key by itself **does not enable paid requests**. Set both of these in **Vercel → Project → Settings → Environment Variables**, then redeploy:

| Variable | Purpose |
| --- | --- |
| `ONE_PIECE_API_KEY` | Your private OpenAI API key; kept only on the server |
| `ONE_PIECE_AI_ACCESS_CODE` | A private access code of at least 16 characters that you choose |
| `ONE_PIECE_MODEL` | Optional model override; defaults to `gpt-4.1-mini` |

Select the deployment environments where you want them available. Redeploy after changing variables. Do not add a `NEXT_PUBLIC_`, `VITE_`, or other public prefix to the key. Never enter or commit real keys in source, frontend JavaScript, GitHub, or chat. `OPENAI_API_KEY` is also recognized by the Node backend, but the documented project setting is `ONE_PIECE_API_KEY`.

When both required settings exist, an **Optional ChatGPT access** field appears on the website. Enter the private access code there—not your API key. The code stays in the current tab's memory and is not saved to local/session storage. Without a correct code, visitors use the free local helper and cannot cause a paid API request through these endpoints. A ChatGPT subscription does not include API billing.

The code is a shared-secret gate, not individual accounts or a distributed rate limiter. Share it only with people you want to authorize, use OpenAI project spending controls, and use Vercel deployment protection if the whole site should be private. The app imposes a 20-second upstream timeout and a small output-token budget; those are not spending limits.

The model only selects fact IDs from the selected episode or movie. The backend validates the IDs and displays stored text, never unrestricted model prose. Failed AI calls fall back to the local helper with a notice. The current question and selected notes are sent to OpenAI, not chat history, with `store: false`. Consult your API account's data policies. Live paid calls have not been tested without a credential; adapter behavior is tested with mocked responses.

## Run locally on your Mac

Install **Node.js 22 LTS** from [nodejs.org](https://nodejs.org), or use an existing version manager with the included `.nvmrc`.

In **Terminal**, enter your downloaded project folder, then run these one at a time:

```sh
npm ci
npm run dev
```

In Brave, press **Command+L**, enter `http://127.0.0.1:8080`, and press Return. Stop the server with **Control+C**. Change the local port with `PORT=8081 npm run dev`.

No Xcode SDK configuration or C++ compilation is needed. If you have an old C++ server running on port 8080, stop it before starting this version. Local settings can be exported in the shell. Alternatively, create an ignored `.env` file based on `.env.example` and use:

```sh
node --env-file=.env scripts/dev-server.js
```

`npm run dev` does not automatically load `.env`. Vercel injects the variables from its project settings.

## Build and test

```sh
npm ci
npm run build
npm test
```

The application has **no third-party npm runtime dependencies**. The lockfile is checked in for repeatable installs. The build validates the complete episode/movie catalog and copies only allowlisted frontend files into `public/`. Raw catalogs, `.env` files, C++ files, and server code are never copied there.

Tests exercise all 1,156 episode requests, future-episode rejection, all movie gates, per-movie chat isolation, invalid/oversized input, HTTPS same-origin handling, pre-parsed Vercel request bodies, AI access-code protection, invalid model IDs, and safe public output. No paid API calls are made by tests.

Optional real-browser checks require Python Playwright and Chromium:

```sh
npm run test:browser
```

These start the Node server and check the real UI, episodes 1015/1156, local chat, independent movie chat, changing limits, late replies, local fonts, access-code UI, and three viewport sizes.

## How deployment is structured

| Location | Role |
| --- | --- |
| `web/` | Editable HTML, CSS, JavaScript, fonts, and decorative artwork |
| `public/` | Generated static output; ignored by Git |
| `api/*.js` | Six Vercel function entrypoints |
| `lib/http.js` | Shared HTTP validation, origin checks, and API behavior |
| `lib/catalog.js` | Server-side catalog loading and integrity checks |
| `lib/chat.js` | Local matching, private AI access, and bounded fact selection |
| `data/` | Bundled episode/movie content and provenance; never a public static folder |
| `scripts/build-web.js` | Validates data and prepares the static output |
| `scripts/dev-server.js` | Local adapter for the same function handlers |
| `vercel.json` | Static output, function data inclusion, timeouts, and response headers |

Each serverless request contains its own watched limit and selection. No state is kept in a shared server process, no writable filesystem is required, and cold starts reload the bundled catalog. Recaps never call Jikan or another live episode provider. Only optional AI calls use `api.openai.com`.

The six endpoints remain `/api/status`, `/api/episode`, `/api/chat`, `/api/movies`, `/api/movie`, and `/api/movie-chat`. Public output is separate from function data, and `includeFiles: data/**` explicitly retains the catalogs in every function bundle.

## Original C++ version

`src/main.cpp`, `vendor/`, `Makefile`, and `tests/smoke.py` are retained as the original C++ reference. It is not used by Vercel or the npm workflow. Its older local-only AI configuration does not provide the new deployment access-code gate, so do not expose that legacy server publicly with a paid key. For C++ study, its local build still uses `make`; the Node version is the maintained app for this deployment.

## Attribution and images

One Piece belongs to Eiichiro Oda, Shueisha, and Toei Animation. This is an unofficial fan project. Source dataset and translation credits are in [data/SOURCES.md](data/SOURCES.md); font licenses are retained in `web/fonts/`.

No unverified episode photos or unrelated posters are substituted for real stills. Original entries support HTTPS images with source, credit, permission, and alt text. Obtain the needed permission/license before adding photos. The imported source dataset's image URLs are not rendered by this project.
