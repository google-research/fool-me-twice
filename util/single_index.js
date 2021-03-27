// Copyright 2019 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var args = process.argv.slice(2);

var fs = require('fs');
var lunr = require('lunr');

function buildIndex(inputFilename) {
  var buffer = fs.readFileSync(inputFilename, 'utf8');
  var documents = JSON.parse(buffer);

  var idx = lunr(function () {
    this.ref('id')
    this.field('name')
    this.field('line')

    documents["sentences"].forEach(function (doc) {
      var index_entry = {"line": doc["line"], "name": doc["name"], "id": doc["id"]};
      this.add(index_entry);
    }, this)
  })

  return idx;
}

input_filename = args[0].replace('",', '').replace('"', '')
output_filename = args[1].replace('",', '').replace('"', '')

idx = buildIndex(input_filename);

fs.writeFileSync(output_filename, JSON.stringify(idx, null, 1), 'utf8')
