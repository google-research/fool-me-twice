# coding=utf-8
# Copyright 2019 Google LLC.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# Lint as: python3

import wikipediaapi
import spacy
import json
import tqdm
from collections import defaultdict
from glob import glob
from os
import subprocess
import fibs_firebase_config


from typing import Text, Tuple, Mapping, Set, List, Iterable, Any

kBAD_SECTIONS = [
    "References", "Further reading", "Further Reading", "Episodes", "Sources",
    "See also", "External links", "Citations", "Documentaries", "Media"]
kBAD_ENDS = [
    ', "', "),", ")", '"', ":", "...", "Yahoo!", "Jeopardy!", "site", "&", ";",
    "Sgt.", "Col."]
kBAD_STARTS = ["(", "'s"]
kREFER = ["refer to:", "refers to:", 'disambiguation']
kMAX_LENGTH = 200000
kMIN_SENT_LENGTH = 30


def extract_sections(
    nlp: spacy.Language,
    sections: Iterable[wikipediaapi.WikipediaPageSection],
    level: Text = '',
    min_sent_length: int = kMIN_SENT_LENGTH,
    max_length: int = kMAX_LENGTH,
) -> Iterable[Mapping[Text, Any]]:
    total_length = 0
    for section in sections:
        if section.title in kBAD_SECTIONS:
            continue
        sents = list(map(str, nlp(section.text).sents))
        name = f"{level} | {section.title}" if level else section.title
        buffer = ""
        paragraph = False
        for ii, sent in enumerate(sents):
            bad_start = any(sent.strip().startswith(x) for x in kBAD_STARTS)
            bad_end = any(buffer.endswith(x) for x in kBAD_ENDS)
            long_enough = len(buffer) >= min_sent_length
            if long_enough and not bad_start and not bad_end:
                yield {
                    "name": name,
                    "sentence": ii - 1,
                    "par": paragraph,
                    "line": buffer,
                }
                total_length += len(buffer)
                if total_length > kMAX_LENGTH:
                    return
                buffer = ""

            paragraph = sent.endswith('\n')
            buffer += " " + " ".join(sent.replace("===", "").split())
            buffer = buffer.strip()
        if len(buffer) >= min_sent_length:
            yield {
                "name": name,
                "sentence": len(sents) - 1,
                "par": True,
                "line": buffer,
            }
        for subsection in extract_sections(nlp, section.sections, name):
            yield subsection


def process_page(
    nlp: spacy.Language,
    category: Text,
    wiki: wikipediaapi.Wikipedia,
    page: Text,
) -> bool:
    """Fetches a single page and creates index files."""
    filename = os.path.join("pages", "{page}.sentences.json")
    output_filename = filename.replace(".sentences.", ".index.")
    if not os.path.exists(filename):
        article = wiki.page(page)
        summary = wikipediaapi.WikipediaPageSection(
            wiki=wiki, title='Summary', text=article.summary)
        sections = [summary] + article.sections
        sentences = [
            dict(id=id, **sentence)
            for id, sentence in enumerate(extract_sections(nlp, sections))
        ]
        if any(refer in sentences[0]["line"].lower() for refer in kREFER):
            return False
        with open(filename, 'w') as outfile:
            json.dump(
                {"category": category, "title": page, "sentences": sentences},
                outfile, indent=2)
    if not os.path.exists(output_filename):
        command = f'node util/single_index.js "{filename}" "{output_filename}"'
        subprocess.call(command, shell=True)

    bucket = fibs_firebase_config.get_bucket()
    blob = bucket.blob(f"pages/{page}.json")
    if not blob.exists():
        blob.upload_from_filename(
            filename,
            content_type='application/json')
        bucket.blob(f"indices/{page}.json").upload_from_filename(
            output_filename,
            content_type='application/json')
        return True
    return False


def read_categories(
    path: Text = "categories/wikititle_*.txt",
) -> Tuple[Mapping[Text, List[Text]], Set[Text]]:
    pages = defaultdict(list)
    priority = set()
    for category in glob(path):
        category_name = category.split("wikititle_")[-1].split(".")[0]
        with open(category) as infile:
            for line in infile:
                page = line.strip()
                if page.startswith("*"):
                    page = page[1:]
                    priority.add(page)
                if page not in pages[category_name]:
                    pages[category_name].append(page)
    return pages, priority


if __name__ == "__main__":
    nlp = spacy.load('en_core_web_sm')
    wiki = wikipediaapi.Wikipedia('en')
    pages, _ = read_categories()
    os.makedirs("pages", exist_ok=True)

    for category in pages:
        total = sum(
            int(process_page(nlp, category, wiki, page))
            for page in tqdm.tqdm(pages[category], desc=category))
        print(f"Added {total} pages for {category}.")
