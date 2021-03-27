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

# Script to populate Firebase with workflows: tasks that users will complete.
# Script should be run frequently, particularly if many users are using the App.

import random
import datetime
import pickle
import json
import os
import tqdm

from csv import DictWriter
from collections import defaultdict, Counter

from absl import app
from absl import flags

import download_wiki
import fibs_firebase_config

FLAGS = flags.FLAGS
flags.DEFINE_string("name", os.path.join('logs', str(datetime.date.today())),
                    "Name of workflow and ouput files by default today's date")
flags.DEFINE_integer("min_length", 20,
                     "Minimum length of Wikipedia page to be included in task")
flags.DEFINE_boolean("use_cache", False,
                     "Use local cache instead of from Firebase")
flags.DEFINE_integer("time_offset", -6,
                     "Time Offset for date statistics")
flags.DEFINE_string("missing_category", "NOCAT",
                    "Category to assign to pages without a category")


def save_claims(claims, filename):
    claim_list = []
    fields = set()
    for ii in claims:
        claims[ii]["likes"] = list(claims[ii]["likes"])
        claims[ii]["text"] = claims[ii].pop("claim").strip()

        if claims[ii]["veracity"] == "TRUE":
            claims[ii]["label"] = "SUPPORTS"
        elif claims[ii]["veracity"] == "FALSE":
            claims[ii]["label"] = "REFUTES"
        else:
            print("Error", claims[ii].get("veracity", "No Veracity found"))
            continue
        del claims[ii]["veracity"]

        claims[ii]["id"] = ii
        if "created" in claims[ii]:
            claims[ii]["created"] = str(claims[ii]["created"])

        if "evidence1" in claims[ii]:
            claims[ii]["evidence"] = [
                claims[ii]["evidence1"], claims[ii]["evidence2"]]
            del claims[ii]["evidence1"]
            del claims[ii]["evidence2"]

        if not isinstance(claims[ii]["evidence"][0], dict):
            print("Error", ii, "Evidence is not dict")
            continue

        claims[ii]["retrieved_evidence"] = [
            dict(text=e["line"].strip(), section_header=e["name"])
            for e in claims[ii].pop("evidence")]

        gold = claims[ii].get("gold", [])
        if not gold:
            print("Error", ii, "No gold found")
            continue
        if not isinstance(gold[0], dict):
            print("Error", ii, "Gold is not dict")
            continue

        claims[ii]["gold_evidence"] = [
            dict(text=e["line"].strip(), section_header=e["name"])
            for e in claims[ii].pop("gold")]

        claim_list.append(claims[ii])
        for jj in claims[ii]:
            fields.add(jj)

    print(f"{len(claim_list)} claims with {str(fields)} fields")

    with open(f"{filename}.claims.csv", mode='w') as outfile:
        w = DictWriter(outfile, fields)
        w.writeheader()
        for ii in claim_list:
            w.writerow(ii)

    with open(f"{filename}.claims.jsonl", mode='w') as outfile:
        for ii in claim_list:
            outfile.write(json.dumps(ii, sort_keys=True) + '\n')

    return claim_list


def save_comparisons(comparisons, claims, votes, filename):
    comparison_rows = []
    fields = ["points", "secondsLeft", "time"]

    for user in comparisons:
        for ii in comparisons[user]:
            comparison_row = {}
            if ii not in claims:
                print(f"Missing claim {ii}")
                continue
            if not comparisons[user][ii] in claims:
                print(f"Missing claim {comparisons[user][ii]}")
                continue
            claim_label = claims[ii]["label"]
            if claim_label == "SUPPORTS":
                true_claim = ii
                false_claim = comparisons[user][ii]
            else:
                assert claim_label == "REFUTES", f"Invalid {ii}: {claim_label}"
                false_claim = ii
                true_claim = comparisons[user][ii]

            comparison_row["true"] = true_claim
            comparison_row["false"] = false_claim

            comparison_row["true_claim"] = claims[true_claim]["text"]
            comparison_row["false_claim"] = claims[false_claim]["text"]

            comparison_row["user"] = user
            for field in fields:
                try:
                    true_field = votes[true_claim][user][field]
                    false_field = votes[false_claim][user][field]
                    assert(true_field == false_field)
                    comparison_row[field] = votes[true_claim][user][field]
                    if field == "time":
                        comparison_row[field] = str(comparison_row[field])
                except KeyError:
                    comparison_row[field] = -1

            if user not in votes[false_claim] or user not in votes[true_claim]:
                print(f"Corrupted vote for user {user}:")
                if user not in votes[false_claim]:
                    print(f"\t Not in votes for claim {false_claim} (false)")
                if user not in votes[true_claim]:
                    print(f"\t Not in votes for claim {true_claim} (true)")
                comparison_row["true_evidence_seen"] = -1
                comparison_row["false_evidence_seen"] = -1
            else:
                # Evidence used should be consistent across these two votes.
                true_evidence_seen_1 = votes[true_claim][user][
                    "evidence_used"].get(true_claim, -1)
                false_evidence_seen_1 = votes[false_claim][user][
                    "evidence_used"].get(true_claim, -1)
                assert(true_evidence_seen_1 == false_evidence_seen_1)
                false_evidence_seen_0 = votes[false_claim][user][
                    "evidence_used"].get(false_claim, -1)
                true_evidence_seen_0 = votes[true_claim][user][
                    "evidence_used"].get(false_claim, -1)
                assert(false_evidence_seen_0 == true_evidence_seen_0)
                # So we can use from either (we'll use true)
                comparison_row["true_evidence_seen"] = true_evidence_seen_1
                comparison_row["false_evidence_seen"] = true_evidence_seen_0
            comparison_rows.append(comparison_row)

    fields = (
        list(comparison_row.keys()) +
        ["true_" + x for x in fields] +
        ["false_" + x for x in fields])

    print(f"{len(comparison_rows)} comparison rows with fields {fields}")

    with open(f"{filename}.votes.jsonl", mode='w') as outfile:
        # Sort by who has used evidence (makes it easier to see harder stuff)
        for ii in sorted(
            comparison_rows,
            key=lambda x: x["false_evidence_seen"] + x["true_evidence_seen"],
            reverse=True,
        ):
            outfile.write(json.dumps(ii, sort_keys=True) + '\n')

    with open(f"{filename}.votes.csv", 'w') as outfile:
        w = DictWriter(outfile, fields)
        w.writeheader()
        for ii in comparison_rows:
            w.writerow(ii)


def get_users(db):
    result = {}
    for ii in db.collection('users').stream():
        result[ii.reference.id] = ii.to_dict()['displayName']
    return result


def get_comparisons(db):
    d = defaultdict(dict)
    num_comparisons = 0
    for ii in db.collection('status').stream():
        user = ii.reference.id
        val = ii.to_dict()

        # find the pairs of claims that people saw.
        seen_claims = [
            x for x in val
            if "_" in x and not (x.endswith("false") or x.endswith("true"))]
        for claim_pair in seen_claims:
            left, right = claim_pair.split("_")
            d[user][left] = right
            d[user][right] = left
            num_comparisons += 1
    print(f"Got {num_comparisons} comparisons from database")
    return d


def get_claims(db, categories):
    claims = {}
    votes = defaultdict(dict)
    for ii in db.collection('fibs').stream():
        key = ii.reference.id
        claims[key] = ii.to_dict()

    for key in tqdm.tqdm(claims):
        claims[key]["category"] = categories.get(
            claims[key]["page"], FLAGS.missing_category)

        num_votes = 0
        num_likes = 0
        num_correct = 0

        claims[key]["votes"] = []
        vote_iterator = db.collection('fibs').document(key).collection("votes")
        for jj in vote_iterator.stream():
            num_votes += 1
            vote = jj.to_dict()

            claims[key]["votes"].append(vote["author"])
            if vote["success"]:
                num_correct += 1

            vote = jj.to_dict()
            voter = vote["author"]

            if voter not in votes[key]:
                votes[key][voter] = {}
            votes[key][voter]["points"] = vote["points"]
            votes[key][voter]["time"] = vote["created"]
            votes[key][voter]["secondsLeft"] = vote.get("secondsLeft", -1)

            fibs = vote.get("fibs", None)
            evidence = vote.get("evidenceUsed", -1)

            evidence_used = {}
            if fibs and evidence:
                evidence_used[fibs[0]] = evidence[0]
                evidence_used[fibs[1]] = evidence[1]
                assert key in fibs, f"key {key} not in fibs {fibs}"
            votes[key][voter]["evidence_used"] = evidence_used

        claims[key]["likes"] = set()
        like_iterator = db.collection('fibs').document(key).collection("likes")
        for jj in like_iterator.stream():
            num_likes += 1
            claims[key]["likes"].add(jj.reference.id)

        claims[key]['id'] = key
        claims[key]['total_votes'] = num_votes
        claims[key]['total_likes'] = num_likes
        claims[key]['correct_votes'] = num_correct

    return claims, votes


def cluster_by_category(claims, min_size=8, max_size=64, desired=16):
    # First, cluster by categories
    cat_cluster = defaultdict(list)
    for ii in claims:
        cat = claims[ii]["category"]
        cat_cluster[cat].append(claims[ii])

    cat_small, cat_big = cluster_check(cat_cluster, min_size, max_size)

    if cat_small:
        merged = []
        for ii in cat_small:
            print(f"{ii} too small")
            # print(cat_cluster[ii])
            for jj in cat_cluster[ii]:
                merged.append(jj)
            del cat_cluster[ii]
        cat_cluster["merged"] = merged

    if cat_big:
        for ii in cat_big:
            subcluster = cluster_by_interest(cat_cluster[ii], desired, ii)
            print(f"{ii} too big")
            del cat_cluster[ii]
            for jj in subcluster:
                cat_cluster[jj] = subcluster[jj]

    return cat_cluster


def num_likes(claim):
    return len(claim.get('likes', []))


def cluster_by_interest(claims, desired_size, orig_title):
    sorted_view = sorted(claims, key=lambda x: num_likes(x))

    d = {}
    cluster = 0
    for start in range(0, len(claims), desired_size):
        cluster += 1
        key = f"{cluster:04}-{orig_title}"
        d[key] = sorted_view[start:start + desired_size]
    return d


def cluster_check(clusters, min_size, max_size):
    too_small = [x for x in clusters if len(clusters[x]) < min_size]
    too_big = [x for x in clusters if len(clusters[x]) > max_size]

    return too_small, too_big


def build_pairs(claims):
    clusters = cluster_by_category(claims)
    for ii in sorted(clusters):
        for jj, kk in build_cluster_pairs(clusters[ii]):
            yield jj["id"], kk["id"]


def build_cluster_pairs(cluster):
    shuffled_order = list(cluster)
    random.shuffle(shuffled_order)

    true_claims = [x for x in cluster if x["veracity"].lower() == 'true']
    false_claims = [x for x in cluster if x["veracity"].lower() != 'true']

    max_length = min(len(true_claims), len(false_claims))

    for ii, jj in zip(true_claims[:max_length], false_claims[:max_length]):
        if random.random() > 0.5:
            yield ii, jj
        else:
            yield jj, ii


def compute_stats(users, votes, claims, filename, time_offset):
    stats = defaultdict(Counter)
    delta = datetime.timedelta(hours=time_offset)
    for claim in claims.values():
        author = users.get(claim.get('author'))
        created = claim.get('created')
        if author and created:
            day = (created + delta).isoformat()[:10]
            stats[(day, author)]['write'] += 1
    for user_vote in votes.values():
        for user, vote in user_vote.items():
            created = vote.get('time')
            author = users.get(user)
            result = 'correct' if vote["points"] > 0 else 'incorrect'
            if author and created:
                day = (created + delta).isoformat()[:10]
                stats[(day, author)][f'vote_{result}'] += 1
    keys = sorted(stats.keys())
    attrs = ['vote_correct', 'vote_incorrect', 'write']
    with open(f"{filename}.stats.csv", 'w') as outfile:
        w = DictWriter(outfile, ['day', 'author'] + attrs)
        w.writeheader()
        for key in keys:
            day, author = key
            row = dict(day=day, author=author)
            for attr in attrs:
                row[attr] = stats[key][attr]
            w.writerow(row)


def save_workflow(
    db, workflow_name, claims, pairs, categories, priority, min_author=100,
    true_probability=0.5,
):
    d = defaultdict(dict)
    banned_pages = set()
    order = 0
    for ii, jj in pairs:
        item = f"{order:05}_vote"
        task = {
            "claim_left": claims[ii]["id"],
            "claim_right": claims[jj]["id"],
            "page_left": claims[ii]["page"],
            "page_right": claims[jj]["page"],
            "type": "verify"
        }

        if claims[ii]["page"] != claims[jj]["page"]:
            d[item] = task
            order += 1
        else:
            banned_pages.add(claims[ii]["page"])

    # db.collection('pages').document(sentences["title"]).set(dict((x,
    # str(sentences[x])) for x in sentences))

    if len(priority - banned_pages) > min_author:
        candidates = priority
    else:
        candidates = set()
        for ii in categories:
            for jj in categories[ii]:
                candidates.add(jj)
    candidates = list(candidates)
    random.shuffle(candidates)

    order = 0
    for ii in candidates:
        if ii in banned_pages:
            continue
        item = f"{order:05}_write"
        rng = random.random()
        veracity = (rng > true_probability)
        task = {
            "page": ii,
            "type": "write",
            "veracity": veracity
        }
        d[item] = task
        order += 1

    num_author = sum(1 for x in d if "write" in x)
    num_vote = sum(1 for x in d if "vote" in x)
    print(
        f"Created new workflow {workflow_name} with {num_author} authoring "
        f"tasks and {num_vote} voting tasks.")
    bucket = fibs_firebase_config.get_bucket()
    blob = bucket.blob(f"workflow/{workflow_name}.json")
    blob.upload_from_string(
        json.dumps(d, indent=2, sort_keys=True),
        content_type='application/json')


def get_index_length(db, page):
    filename = f'pages/{page}.sentences.json'
    sentences = []
    if os.path.isfile(filename):
        with open(filename, 'r') as infile:
            document = json.loads(infile.read())
    else:
        ref = db.collection('pages').document(page).get().to_dict()
        if ref is None:
            print('No JSON in index', page)
            return 0
        document = json.loads(ref['sentences'])
        with open(filename, 'w') as f:
            f.write(ref['sentences'])
    sentences = document["sentences"]
    if not sentences:
        return 0
    return len(sentences)


def page_lengths(db, pages, priority):
    """
    Read the length of pages.  This is used later to filter short pages.
    """

    lengths = defaultdict(dict)
    for category in pages:
        for page in pages[category]:
            lengths[category][page] = get_index_length(db, page)
            if (lengths[category][page] < FLAGS.min_length):
                print('Too short', category, page)
    return lengths


def main(argv):
    # Get claims that need to be voted on
    db = fibs_firebase_config.initialize_firebase()
    # Read in the subjects we might write claims about
    categories, priority = download_wiki.read_categories()
    categories = page_lengths(db, categories, priority)
    flip_categories = {}
    # Lookup for categories given page
    for ii in categories:
        for jj in categories[ii]:
            length = categories[ii][jj]
            if length > FLAGS.min_length:
                flip_categories[jj] = ii
            # else:
            #    print(length, ii, jj)

    if FLAGS.use_cache:
        try:
            with open(f"{FLAGS.name}.comparisons.pkl", "rb") as infile:
                comparisons = pickle.load(infile)
            with open(f"{FLAGS.name}.votes.pkl", "rb") as infile:
                votes = pickle.load(infile)
            with open(f"{FLAGS.name}.claims.pkl", "rb") as infile:
                claims = pickle.load(infile)
            with open(f"{FLAGS.name}.users.pkl", "rb") as infile:
                users = pickle.load(infile)
            cache_fail = False
        except IOError:
            cache_fail = True

    if not FLAGS.use_cache or cache_fail:
        users = get_users(db)
        comparisons = get_comparisons(db)
        print("Loaded comparisons")
        # This can be sped up, it gets votes twice
        claims, votes = get_claims(db, flip_categories)
        print("Loaded claims and votes")

        with open(f"{FLAGS.name}.comparisons.pkl", "wb") as outfile:
            pickle.dump(comparisons, outfile)
        with open(f"{FLAGS.name}.votes.pkl", "wb") as outfile:
            pickle.dump(votes, outfile)
        with open(f"{FLAGS.name}.claims.pkl", "wb") as outfile:
            pickle.dump(claims, outfile)
        with open(f"{FLAGS.name}.users.pkl", "wb") as outfile:
            pickle.dump(users, outfile)

    compute_stats(users, votes, claims, FLAGS.name, FLAGS.time_offset)

    # We want the number of true and false claims to be balanced
    true_probability = sum(
        1 for x in claims.values()
        if x["veracity"].lower() == 'true') / len(claims)
    print(f"Percentage of true claims: {true_probability}")

    pairs = list(build_pairs(claims))

    workflow_name = os.path.split(FLAGS.name)[-1]
    save_workflow(
        db, workflow_name, claims, pairs, categories, priority,
        true_probability=true_probability)
    save_claims(claims, FLAGS.name)
    save_comparisons(comparisons, claims, votes, FLAGS.name)


if __name__ == '__main__':
    app.run(main)
