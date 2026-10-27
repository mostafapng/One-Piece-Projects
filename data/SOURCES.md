# Episode catalog provenance

The shipped catalog contains **every integer episode number from 1 to 1156**, once each, with a distinct nonblank English summary. It is a static snapshot. The app reads no external episode service.

## Source snapshot

- Dataset: [nswsys/one-piece-dashboard](https://github.com/nswsys/one-piece-dashboard).
- Exact commit: `54c44be8b3fcf8c1a48a0dec6478e809d63356de`.
- File: [`app/public/data/episodes.json`](https://github.com/nswsys/one-piece-dashboard/blob/54c44be8b3fcf8c1a48a0dec6478e809d63356de/app/public/data/episodes.json).
- The source dataset credits **TMDB** for Spanish episode synopses and **MyAnimeList via Jikan** for English titles/episode metadata. See its [ingestion documentation](https://github.com/nswsys/one-piece-dashboard/blob/54c44be8b3fcf8c1a48a0dec6478e809d63356de/README.md).
- The source snapshot contains 1167 episodes; this project deliberately imports only **1–1156**. There are no missing or empty Spanish source synopses in that range.
- Source file SHA-256: `34148a2ddf4b3744272a198d6f1ee623628a317c2b546f19aeddce24ff150cc2`.
- No source application code, images, or image URLs were imported.

TMDB data is used for this noncommercial personal fan project with attribution. This product is not endorsed or certified by TMDB. MyAnimeList, Jikan, and the source dataset's authors likewise do not endorse this app. Source links are references and may contain details beyond a viewer's selected episode.

## English text

Episodes 1–3 retain the original Log Pose English notes. The other entries include their Spanish source in `summary_original` and an English synopsis in `summary`.

Translations were prepared offline with the Argos Spanish → English 1.0 model, using CTranslate2 4.6.0 and SentencePiece 0.2.1 (CPU/int8, beam size 2, sentence batches). The model was obtained over verified HTTPS from the pinned URL recorded in the [Argos package index's history](https://github.com/argosopentech/argospm-index):

`https://github.com/uav4geo/LibreTranslate-Models/raw/3d5ca0a2c3c302287339b2944329f767ac1673f4/es_en.argosmodel`

Downloaded model SHA-256: `1b963aa0e0cb6e5ce874f0aa1a1949a19bc4d762e833532239a8834340f6b378`. This is an artifact identifier computed after download, not a separately published checksum. The model and translation packages are **not distributed with or required by the app**. The model's README credits OPUS OpenSubtitles, ParaCrawl, and UNPC parallel corpora.

Common franchise terms were normalized before/after translation. Selected English entries were edited for readability and specificity, including episode 1015 from the reported failure. `episode_edits.json` records those edits and name normalizations. These are machine-assisted translations/adaptations, not professionally reviewed translations. Some source entries are very short promotional synopses; the catalog does not pretend they are complete scene-by-scene accounts. The Spanish original is retained so wording can be inspected and corrected.

The completeness tests establish coverage and behavior, not the correctness of every plot assertion or every translation. The watched limit gates the assigned episode; it cannot independently audit source spoilers.

## Maintenance

The finished catalog is checked into Git, so starting the app never regenerates it or downloads a model. `scripts/build_episode_catalog.py` can rebuild the catalog from the pinned source JSON and an English translation mapping. It rejects missing, duplicate, blank, or out-of-range entries instead of creating generic filler text. Keep the edit manifest applied when regenerating translations.

Current catalog SHA-256: `14af162c986ea53e0ac74640127782155822a3b2deb5f56ebe1d64e8813f43ee`.
