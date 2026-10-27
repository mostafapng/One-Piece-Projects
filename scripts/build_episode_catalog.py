#!/usr/bin/env python3
"""Build the offline catalog from a pinned source and English translations.

Maintenance tool only. Missing, blank, or duplicate entries fail the import.
No translation model, API key, or download is needed to run the finished app.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SOURCE_COMMIT = '54c44be8b3fcf8c1a48a0dec6478e809d63356de'
SOURCE_URL = f'https://github.com/nswsys/one-piece-dashboard/blob/{SOURCE_COMMIT}/app/public/data/episodes.json'
SOURCE_SHA256 = '34148a2ddf4b3744272a198d6f1ee623628a317c2b546f19aeddce24ff150cc2'
LAST = 1156


def build(source_path, translations_path, existing_path, destination):
    if hashlib.sha256(source_path.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('Source differs from pinned snapshot; review and repin before importing')
    source = json.loads(source_path.read_text())['episodios']
    translations = json.loads(translations_path.read_text())
    edits_path = Path(__file__).resolve().parents[1] / 'data/episode_edits.json'
    edits = json.loads(edits_path.read_text())
    for number, text in translations.items():
        for wrong, right in edits['normalizations'].items():
            text = re.sub(r'\b' + re.escape(wrong) + r'\b', right, text)
        translations[number] = edits['english_overrides'].get(number, text)
    originals = {entry['number']: entry for entry in json.loads(existing_path.read_text()) if entry['number'] <= 3}
    selected = [entry for entry in source if 1 <= entry['numero'] <= LAST]
    if sorted(entry['numero'] for entry in selected) != list(range(1, LAST + 1)):
        raise ValueError('Source must contain each episode 1–1156 exactly once')
    if set(translations) != {str(number) for number in range(1, LAST + 1)}:
        raise ValueError('Translations must cover exactly episodes 1–1156')
    catalog = []
    for entry in sorted(selected, key=lambda value: value['numero']):
        number = entry['numero']
        summary = translations[str(number)].strip()
        original = entry['sinopsis'].strip()
        if not summary or not original or not entry['titulo'].strip():
            raise ValueError(f'Missing content in episode {number}')
        if number in originals:
            result = originals[number].copy()
            result.update(title=entry['titulo'], source='Log Pose · original episode notes', source_url='', bundled=True)
        else:
            result = {
                'number': number, 'title': entry['titulo'], 'summary': summary,
                'summary_original': original, 'original_language': 'es',
                'translation': 'English machine translation of a Spanish episode synopsis; the original is available below.',
                'source': 'TMDB episode synopsis · English translation',
                'source_url': 'https://www.themoviedb.org/tv/37854-one-piece',
                'source_dataset_url': SOURCE_URL,
                'bundled': True, 'facts': [], 'images': [],
            }
        catalog.append(result)
    if len({entry['summary'] for entry in catalog}) != LAST:
        raise ValueError('Duplicate English summaries; inspect translations before importing')
    destination.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Wrote {len(catalog)} offline summaries. Source SHA-256: {hashlib.sha256(source_path.read_bytes()).hexdigest()}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--translations', type=Path, required=True)
    parser.add_argument('--original-notes', type=Path, default=Path('data/episodes.json'))
    parser.add_argument('--output', type=Path, default=Path('data/episodes.json'))
    args = parser.parse_args()
    build(args.source, args.translations, args.original_notes, args.output)
