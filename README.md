# Log Pose — a One Piece voyage

A C++17 web app with a pirate-styled interface, episode recaps, a separate movie companion, and watched-episode limits.

## Every episode is included

**All 1,156 episode summaries are bundled with the app.** Recaps no longer call Jikan, require internet, need an API key, or rely on a previously populated cache. The server checks that every episode from 1 through 1156 is present exactly once and has a nonblank summary before starting.

Episodes 1–3 retain their original English notes. Episodes 4–1156 have English translations of Spanish episode synopses originally sourced from TMDB, with English titles from MyAnimeList. The pinned dataset, translation method, and attribution are documented in [data/SOURCES.md](data/SOURCES.md). Each translated episode also includes its original Spanish synopsis behind a disclosure. Some source synopses are short; these are episode overviews, not scene-by-scene transcripts. Machine translations can have awkward wording or mistakes; keeping the original makes them inspectable. Coverage was checked for all 1,156 entries; every plot detail has not been independently fact-checked.

## Run on your Mac with Brave

All commands below go in **Terminal**, not Brave. Press Return/Enter after each command.

1. Install Apple’s tools with `xcode-select --install`. If already installed, continue.
2. Install Homebrew using https://brew.sh and complete the shell setup commands it displays.
3. Run `brew install pkg-config curl`.
4. Download the repository using GitHub’s **Code → Download ZIP**. Double-click the ZIP in Finder to extract it.
5. In Terminal, type `cd ` with the space, drag the extracted folder into Terminal, and press Return.
6. Run `make run`. Keep Terminal open.
7. In **Brave**, press **Command+L**, enter `http://127.0.0.1:8080`, then press Return.

The Makefile selects Apple’s compiler, Homebrew curl, and an installed SDK matching your macOS major version when available. If automatic SDK selection fails on the Mac used during development, the successful workaround was:

```sh
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk make CXX="$(xcrun --find clang++)" run
```

That command requires the named SDK; do not use that exact path on a different Mac without checking it exists. The automatic macOS Makefile branch was not executed on a Mac in the cloud workspace.

Stop the app with **Control+C** in Terminal. To start it later, enter the project folder and run `make run` again.

### Updating an earlier download

1. Stop the old server with Control+C.
2. Download a fresh ZIP from GitHub and extract it into a **new folder**. Preserve old folders containing your own changes or keys.
3. Enter that new folder in Terminal and run `make run`.
4. Refresh Brave and set your watched limit again.

The updated browser title says **Offline Episode Edition**, and the episode card says **All 1,156 episode summaries are onboard**. If the page still mentions a Jikan connection error, you are running the old server or old downloaded folder.

## Run on Linux / the prepared cloud environment

Prerequisites: C++17 compiler, GNU Make, pkg-config, libcurl development headers, and Python 3 for tests. Debian/Ubuntu packages: `g++ make pkg-config libcurl4-openssl-dev python3`.

From the repository root:

```sh
make -j2
make run
```

The server binds only to **127.0.0.1**, default port 8080. Override the port with `PORT=8081 make run`. Cloud onboarding has no browser preview; local requests and browser automation validate it internally.

## Using the companion

- Set the **last episode you have finished**. The default is 0.
- Open a recap at or below that limit. All 1–1156 work offline.
- Ask the episode first mate about that recap. Its context stays in that single episode.
- Open the **Movie Den** for original three-section overviews of all 15 theatrical films.
- Movie summaries/chat require both the film’s recommended anime threshold and confirmation that you have watched the movie. Full movie summaries include their endings.

Lowering the watched limit clears recaps and both chats. Changing movies or removing confirmation clears the movie log/chat. Late replies cannot restore content after a limit change. Browser viewing limits and conversations are not saved.

Recaps contain events from the selected episode. Movie thresholds are cautious recommendations, not an official chronology or an absolute spoiler guarantee. The app gates entries by assigned episode; it cannot independently verify source wording or what you have actually watched. Specials/OVAs and the live-action series are not included in the movie list. Links to third-party reference sites may expose other story details if you open them.

## Optional ChatGPT selection

No API key is needed for **any episode summary, movie summary, or the labeled local fact helper**. The helper selects existing paragraphs by keywords, so it can miss questions or select an irrelevant paragraph.

To improve selection, securely set `ONE_PIECE_API_KEY` before starting. On your own machine, `OPENAI_API_KEY` is also recognized. `.env` files are Git-ignored but **not automatically loaded**. Never commit real keys or place them in frontend JavaScript. A ChatGPT subscription does not include API billing.

`ONE_PIECE_MODEL` defaults to `gpt-4.1-mini`; another model must support the OpenAI Responses API and structured JSON output. Only the current question and selected episode/movie notes are sent, not conversation history. The app requests `store: false`; consult your API account’s data policies. Live AI calls remain untested without a credential. Failed calls visibly fall back to local notes.

The model returns **fact IDs**, not freely written answers. The C++ server validates them against the selected episode or movie and renders only that stored text. It cannot invent future-story prose for the browser, but source inaccuracies remain possible. This is a single-question fact assistant, not a conversation-memory system.

Recaps and local chat require **no network destinations**. Only optional AI calls use `api.openai.com`. Fonts and decorative SVGs are local. Old Jikan caches and the former `ONE_PIECE_CACHE_DIR` / `ONE_PIECE_EPISODE_FIXTURES` variables are no longer used.

This is a local personal app. Public hosting with a paid API key requires authentication, rate limits, and spending controls.

## Artwork and credits

The theme uses original decorative fan-project SVGs and locally bundled OFL-licensed Pirata One and IM FELL English fonts. These are not official One Piece logo lettering or episode stills. One Piece belongs to Eiichiro Oda, Shueisha, and Toei Animation.

No unverified episode photos or unrelated posters are substituted. Entries can include an `images` array with `url`, `source_url`, `credit`, `permission`, and `alt` fields. Use HTTPS and obtain appropriate permission/license. An image appearing on IMDb or an official page is not itself permission to reuse it. The imported dataset’s image URLs have deliberately not been bundled or rendered.

## Project map

- `src/main.cpp`: C++ HTTP routes, catalog integrity checks, spoiler boundaries, local/optional AI selection.
- `data/episodes.json`: the complete offline episode catalog, including original Spanish source text for translated entries.
- `data/SOURCES.md`: pinned source, attribution, translation method, and integrity hashes.
- `data/movies.json`: 15 original movie overviews with recommended thresholds and reference links.
- `scripts/build_episode_catalog.py`: maintenance importer; refuses incomplete catalogs instead of creating placeholders.
- `web/`: browser UI, local fonts, original SVG artwork.
- `tests/smoke.py`: real HTTP tests including every episode 1–1156 with network unavailable.
- `tests/browser_smoke.py`: optional Playwright/Chromium tests, including episode 1015 from the reported bug.
- `vendor/`: pinned nlohmann/json and cpp-httplib headers with licenses.

## Validate

```sh
make test
```

With Python Playwright and Chromium installed:

```sh
python3 tests/browser_smoke.py
```

Tests strip API credentials from child processes and point HTTP(S) proxies at an unavailable local port. They exercise the **real bundled catalog** rather than synthetic episode responses, checking successful summaries for all 1,156 episodes, rejection of future requests, invalid/incomplete catalogs, off-topic questions, and isolated movie chats. They validate coverage and behavior, not every plot assertion.
