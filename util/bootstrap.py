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

import os
import download_wiki
import wikipediaapi
import fibs_firebase_config
import spacy
import json
import random

kNUM_WRITES = 10
kNUM_VOTES = 10


def bootstrap():
    bucket = fibs_firebase_config.get_bucket()
    bucket.cors = [{
        'origin': ['*'],
        'method': ['GET'],
        'maxAgeSeconds': 86400
    }]
    bucket.update()

    random.seed(42)
    nlp = spacy.load("en_core_web_sm")
    wiki = wikipediaapi.Wikipedia("en")
    pages_by_category, _ = download_wiki.read_categories()
    db = fibs_firebase_config.initialize_firebase()
    pages = [
        (cat, p)
        for cat, page_list in pages_by_category.items() for p in page_list]
    pages = sorted(pages)
    random.shuffle(pages)
    workflow = {}
    for index, (category, page) in enumerate(pages[:kNUM_WRITES]):
        download_wiki.process_page(nlp, category, wiki, page)
        workflow[f"{index:05}_write"] = {
            "page": page,
            "type": "write",
            "veracity": bool(index % 2)
        }

    claims = [[], []]
    with open(os.path.join("dataset", "test.jsonl")) as f:
        for line in f:
            claim = json.loads(line)
            label = int(claim["label"] == "SUPPORTS")
            claims[label].append(claim)
    random.shuffle(claims[0])
    random.shuffle(claims[1])
    os.makedirs("pages", exist_ok=True)
    for index in range(kNUM_VOTES):
        if random.random() < 0.5:
            claim_left, claim_right = claims[0][index], claims[1][index]
        else:
            claim_right, claim_left = claims[0][index], claims[1][index]
        for claim in [claim_left, claim_right]:
            db.collection("fibs").document(claim["id"]).set({
                "page": claim["wikipedia_page"],
                "claim": claim["text"],
                "author": "UNK",
                "veracity": str(bool(claim["label"] == "SUPPORTS")).upper(),
                "gold": [
                    {"line": ev["text"]} for ev in claim["gold_evidence"]],
                "evidence": [
                    {"line": ev["text"]} for ev in claim["retrieved_evidence"]],
            })
        workflow[f"{index:05}_vote"] = {
            "claim_left": claim_left["id"],
            "claim_right": claim_right["id"],
            "page_left": claim_left["wikipedia_page"],
            "page_right": claim_right["wikipedia_page"],
            "type": "verify",
        }

    blob = bucket.blob(f"workflow/default.json")
    blob.upload_from_string(
        json.dumps(workflow, indent=2, sort_keys=True),
        content_type='application/json')

if __name__ == "__main__":
    bootstrap()
