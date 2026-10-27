# Log Pose — One Piece companion

A beginner-friendly C++17 backend with a browser interface. Look up an episode recap, ask about One Piece, and set the last episode you have finished to keep later catalog facts out of responses.

**This is a working starter, not a complete One Piece database.** It includes original, manually written notes for anime episodes **1–3**. No external episode feed, official episode photos, or IMDb integration is bundled. It is an unofficial fan project.

## Run it

Prerequisites: Linux, a C++17 compiler, GNU Make, pkg-config, libcurl development headers. Python 3 is used only for tests. These are available in the prepared cloud environment. On Debian/Ubuntu, the corresponding packages are `g++ make pkg-config libcurl4-openssl-dev python3`.

From this repository's directory:

```sh
make
make run
```

On your own computer, open a browser at `http://127.0.0.1:8080`. The server binds only to your machine's loopback interface. Cloud onboarding does not provide a browser preview; the API can still be checked with local requests. Stop with Ctrl+C. Change the local port with `PORT=8081 make run`.

1. Set **Last episode finished**. It starts at **0**; nothing is unlocked automatically.
2. Enter an episode number at or below your limit and click **Read recap**.
3. Ask a question such as “What is Luffy's dream?”

Recaps contain events from the requested episode, so only mark an episode finished **after watching it**. The app cannot know what you have actually watched. Questions you type may themselves contain spoilers. Lowering the limit clears visible recaps and conversation; late replies from the old limit are discarded. Nothing is stored in browser storage.

## Run on a Mac with Brave

All commands go in the **Terminal** app, not Brave. Press the Return/Enter key after each command.

1. Install Apple’s command-line tools with `xcode-select --install`. Finish the installer before continuing. If already installed, continue.
2. Install Homebrew using the instructions at https://brew.sh, including its displayed shell setup steps.
3. In Terminal, run `brew install pkg-config curl`.
4. Download this repository using GitHub’s **Code → Download ZIP**, then double-click the ZIP in Finder to extract it.
5. In Terminal, type `cd ` (including the space), drag the extracted project folder from Finder into Terminal, then press Return. This works even if the extracted folder has `-main` in its name.
6. Run `export PKG_CONFIG_PATH="$(brew --prefix curl)/lib/pkgconfig"`.
7. Run `make run` and keep Terminal open.
8. In **Brave’s address bar**, enter `http://127.0.0.1:8080`.

Press Control+C in Terminal to stop. For subsequent starts, open Terminal and repeat steps 5–8. No API key is needed for the local helper.

## Optional ChatGPT-powered selection

Without an API key, the app uses an explicitly labeled local keyword-based fact helper. It can answer only a small set of questions and refuses unrelated or unsupported requests. This mode is limited and is not ChatGPT.

To connect the OpenAI Responses API, provide an API key securely as the `ONE_PIECE_API_KEY` environment variable before starting. `OPENAI_API_KEY` is also recognized on your own machine. Never paste the key into chat, source files, frontend JavaScript, or a committed file. `.env` is ignored by Git but is **not automatically loaded**. An existing ChatGPT subscription does not include API billing.

`ONE_PIECE_MODEL` optionally overrides the default `gpt-4.1-mini`; the chosen model must support Responses API structured JSON output. The network must permit HTTPS to `api.openai.com`. The UI indicates that AI is configured, not that a live call has succeeded. A failed call falls back to the local helper with a visible notice. API calls send the current question and unlocked catalog notes, not previous conversation. API usage may cost money. The app requests `store: false`; consult your API account's data policies.

### How spoiler protection works

A prompt alone is insufficient to guarantee spoiler-free model prose. This app instead:

- Filters the catalog **on the C++ server** using the watched limit on every request.
- Sends only unlocked facts to the API, never the whole catalog.
- Requires the model to return fact IDs, not a freely written answer.
- Validates those IDs against the filtered catalog and renders only stored text.
- Uses fixed refusal text if no supported answer exists. Future-looking questions receive a fixed protective refusal.
- Serves neither the raw catalog nor source files to the browser.

This prevents a model from introducing future-story prose into displayed answers. It does **not** verify the accuracy or episode assignment of manually edited catalog entries: incorrect catalog facts can still spoil the story. The local keyword helper can match an irrelevant fact, and an AI selector can choose an irrelevant unlocked fact. No general chatbot or fully reliable intent classifier is claimed. The companion is a single-question fact assistant, not a conversation-memory system.

This is a local personal app, not an authenticated public service. Do not expose it publicly with an API key without adding authentication, rate limiting, and usage limits.

## Real episode images

No generated pictures or substitute series posters are used. The starter displays an honest empty state because a reusable, episode-specific photo source has not been verified. Official episode page retrieval was blocked in the setup environment. IMDb and official sites do not automatically grant image reuse rights; do not scrape or hotlink without permission.

After obtaining permission or an appropriate license, add a real photo **from that episode** to its `images` array in `data/episodes.json`:

```json
{
  "url": "https://your-permitted-image-host.example/episode-1.jpg",
  "source_url": "https://your-source.example/episode-1",
  "credit": "Actual copyright holder / photographer",
  "permission": "Actual license or permission reference",
  "alt": "Describe this episode image without future-story information"
}
```

These are placeholders showing the format, not working image URLs or permission claims. Replace every field with verified information. Images must use HTTPS. They appear only when the episode is unlocked. Image hosts see ordinary browser image requests; no API key is sent to them. Inspect the image, caption, source URL, and license yourself before adding it. Restart after editing data.

## Add episodes

`data/episodes.json` is deliberately small and readable. Each entry has a positive unique `number`, a `summary`, `facts`, and `images`. Each fact needs a unique `id`, lowercase `keywords`, and `text`. Write original summaries and facts based only on that episode and earlier. Do not copy scripts or full third-party summaries. Check that recaps, facts, and images contain no later revelations. The app loads the catalog at startup and rejects malformed entries. No AI is used to invent missing episode summaries.

## Understand the code

- `src/main.cpp`: HTTP routes, watched-limit checks, catalog loading, local matching, OpenAI integration.
- `web/index.html`, `style.css`, `app.js`: accessible browser UI; messages use text nodes instead of HTML insertion.
- `data/episodes.json`: local, editable episode notes.
- `tests/smoke.py`: real HTTP regression tests, including spoiler boundaries and invalid input.
- `vendor/`: pinned header-only dependencies and their licenses; see `vendor/README.md`.

The browser asks the C++ backend for data. C++ handles JSON using nlohmann/json, serves HTTP using cpp-httplib, and calls the API using libcurl with TLS verification enabled. You do not need CMake or a JavaScript package manager.

## Validate

```sh
make test
```

Tests start their own server on a temporary local port with API credentials removed from that child process. They do not call OpenAI or spend API credits. Live AI calls require your own configured credential and have not been validated in this environment.

Optional browser checks are also provided. With Python Playwright and Chromium available, run `python3 tests/browser_smoke.py`. These exercise recaps, chat, off-topic refusal, clearing content after lowering the watched limit, and mobile overflow. They also run without API credentials.

For this cloud environment, an optional `ONE_PIECE_API_KEY` secret requirement and the `api.openai.com` destination have been saved in the environment draft. Add your own key securely in environment settings, review/save the draft, and publish to retain the prepared environment. Draft saving alone does not configure the running process or verify a live API call.
