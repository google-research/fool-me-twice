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

from google.cloud import firestore
from google.cloud import storage
import json
import os

config_file = os.path.join('board', 'src', 'config', 'firebase.json')
with open(config_file) as f:
    config = json.load(f)
    project_id = config['projectId']
    bucket = config['storageBucket']

def initialize_firebase():
    return firestore.Client(project_id)

def initialize_storage():
    return storage.Client(project_id)

def get_bucket():
    return initialize_storage().bucket(bucket)
