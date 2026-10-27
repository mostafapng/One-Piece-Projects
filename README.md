# Log Pose — a One Piece voyage

A C++17 web app with a pirate-styled browser interface: parchment, ocean blue, straw-hat gold, locally bundled pirate fonts, a straw-hat emblem, a skull flag, and nautical symbols. These decorative vectors are original fan-project graphics, not official episode stills.

## What it does

- **Episode lookups 1–1156.** Original notes for episodes 1–3 work offline. Other numbers fetch their individual episode synopsis from the [Jikan API](https://docs.api.jikan.moe/) (MyAnimeList anime ID 21), then cache it locally. No API key is needed for episode lookups.
- **A watched-episode boundary.** The C++ server refuses recaps above the last episode you say you have finished, before making an external request. Titles and summaries are not preloaded for future episodes.
- **Episode chat.** Open a recap first. The assistant can select only text from that episode, not later episodes or movies.
- **A separate Movie Den.** All 15 theatrical One Piece movies have original, three-section plot overviews, including their endings. Each has a conservative anime-context threshold and a separate “I’ve finished this movie” confirmation.
- **Independent movie chat.** Only the selected, confirmed movie’s notes enter this conversation. Changing movies, unchecking confirmation, or changing the watched limit clears old content and invalidates late replies.
- **Works without ChatGPT.** A labeled keyword-based local helper selects existing notes. Optional OpenAI integration improves selection without displaying free-form model prose.

**Coverage limitation:** accepting every number from 1–1156 is not a promise that MyAnimeList has a synopsis for every episode. Descriptions can be missing; Jikan can be offline or rate-limited. The app explicitly reports missing or unavailable recaps and never invents replacements. Live episode-provider access was blocked by the cloud network during development. The parser and HTTP routes were tested with synthetic fixtures, including episode 1156; comprehensive live coverage has not been audited.

**Spoilers:** recaps include events from the requested episode. Movie overviews include endings. Only unlock things you have actually finished. External episode descriptions are not independently spoiler-audited and may include retrospective context. Movie viewing thresholds are cautious recommendations, not an official timeline or an absolute spoiler guarantee. The app prevents crossing its stored boundaries; the accuracy and wording of source material still matter.

## Run on a Mac with Brave

All commands below go in **Terminal**, not Brave. Press Return/Enter after each command.

1. Install Apple’s tools with `xcode-select --install`. If already installed, continue.
2. Install Homebrew using https://brew.sh and complete the shell setup commands it displays.
3. Run `brew install pkg-config curl`.
4. Download this repository with GitHub’s **Code → Download ZIP**. Double-click the ZIP in Finder to extract it.
5. In Terminal, type `cd ` with the space, drag the extracted folder into Terminal, then press Return.
6. Run `make run` and keep Terminal open.
7. In **Brave**, press **Command+L**, enter `http://127.0.0.1:8080`, and press Return.

The Makefile automatically selects Apple’s compiler, Homebrew curl, and an installed SDK matching the macOS major version when available. This avoids choosing an incompatible macOS 27 SDK on a macOS 26 machine. If automatic SDK selection fails on the Mac used during development, the verified workaround was:

```sh
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk make CXX="$(xcrun --find clang++)" run
```

That exact workaround requires the named SDK to exist; it is not a universal setting for other Macs. The updated Makefile’s macOS branch has not been executed on a Mac in the cloud workspace.

To stop, press **Control+C** in Terminal. Later, open Terminal, enter the project folder, and run `make run` again.

### Get this update if you downloaded an earlier ZIP

Stop the old server with Control+C, download the new ZIP from GitHub, and extract it into a **new folder**. Do not merge it into or overwrite a folder containing your own changes or keys. Enter the new folder in Terminal and run `make run`. Refresh Brave. Browser settings are intentionally not persisted, so set your watched limit again.

## Run on Linux / the prepared cloud environment

Prerequisites: a C++17 compiler, GNU Make, pkg-config, libcurl development headers; Python 3 for tests. Debian/Ubuntu packages: `g++ make pkg-config libcurl4-openssl-dev python3`.

```sh
make -j2
make run
```

Run from the repository root. The app binds **only to 127.0.0.1**, default port 8080. Change it with `PORT=8081 make run`. The cloud onboarding interface has no browser preview; local requests and browser automation can validate the server internally.

## Optional ChatGPT selection

Set `ONE_PIECE_API_KEY` securely in the environment before starting. On your own machine, `OPENAI_API_KEY` is also accepted. `.env` files are ignored by Git but **not automatically loaded**. Never commit real keys or put them in frontend JavaScript. A ChatGPT subscription does not include API billing.

`ONE_PIECE_MODEL` defaults to `gpt-4.1-mini`; another model must support the OpenAI Responses API with structured JSON output. The app sends only the current question and selected episode/movie notes, not conversation history. It requests `store: false`; consult your API account’s data policies. Live calls were not tested without a credential. A failed call falls back to the local helper with a notice.

The model returns **fact IDs**, not an unrestricted answer. C++ validates the IDs against the selected episode or movie and renders only stored/source text. This prevents the model from generating future-story prose, but does not fact-check the underlying text. Local matching can choose an irrelevant paragraph. Neither mode is an unrestricted chatbot, a perfect intent classifier, or a conversation-memory system.

This is a personal local application. Do not expose it publicly with an API key without authentication, rate limits, and spending controls.

## Sources, network, and cache

- Episode provider: `https://api.jikan.moe/v4/anime/21/episodes/{number}`. Only the requested, unlocked episode is fetched; titles/summaries from adjacent episodes are not fetched.
- Attribution links lead to the relevant MyAnimeList episode page. Source text and embedded attribution are retained; no provider affiliation is claimed. Follow Jikan/MyAnimeList terms when using or redistributing source data.
- Successful external responses are saved under `.cache/episodes/` (Git-ignored). Cached recaps work offline. Unsuccessful responses are not cached.
- Upstream requests are serialized and spaced at least 1.1 seconds apart. A rate-limit response asks the user to wait instead of automatically retrying.
- Movie overviews are original prose in `data/movies.json`, with Wikipedia links for further reading. They have not been independently fact-checked against a live movie database. Specials, OVAs, and the live-action series are not included.
- Network destinations: `api.jikan.moe` for recaps; `api.openai.com` only for optional AI. Fonts and decorative artwork are served locally. MyAnimeList/Wikipedia links open only if clicked.

`ONE_PIECE_CACHE_DIR` optionally overrides the cache directory. Delete cached episode files to refresh their source descriptions. Browser history/limits are not saved. `ONE_PIECE_EPISODE_FIXTURES` is a test-only operator setting selecting local synthetic source files; leave it unset for real recaps.

## Real episode photos

No generated episode images or unrelated series posters are substituted for real episode stills. No verified/reusable photo source is bundled. Original entries in `data/episodes.json` still support an `images` array, with `url`, `source_url`, `credit`, `permission`, and `alt` fields. Use HTTPS and obtain the needed permission/license. Source availability on IMDb or an official site is not itself permission to reuse an image. Images appear only inside an unlocked recap. External Jikan episode descriptions do not supply episode photos.

## Project map

- `src/main.cpp`: C++ HTTP routes, spoiler boundaries, source adapter, cache, local and optional AI selection.
- `web/`: HTML, CSS, JavaScript, original decorative SVG symbols, local OFL-licensed fonts.
- `data/episodes.json`: original offline notes for episodes 1–3.
- `data/movies.json`: 15 movie overviews and viewing thresholds.
- `tests/smoke.py`: real HTTP tests with synthetic episode-provider responses, no API credits or internet required.
- `tests/browser_smoke.py`: optional Playwright/Chromium checks for both panels, font loading, spoiler boundaries, stale replies, movie isolation, and responsive layouts.
- `vendor/`: pinned nlohmann/json and cpp-httplib headers and licenses. See `vendor/README.md`.

## Validate

```sh
make test
```

With Python Playwright and Chromium installed, also run:

```sh
python3 tests/browser_smoke.py
```

Test child processes remove API credentials and point at `tests/fixtures/episodes`. Those files are **clearly labeled synthetic data, not actual episode recaps**. Tests exercise the valid range, every future-number gate, all 15 movie gates, source mismatch/null/malformed cases, off-topic requests, and chat isolation. They do not establish live synopsis coverage or movie-plot accuracy.
