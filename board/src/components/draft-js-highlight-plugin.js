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

import React from 'react';

const findWithRegex = (regex, contentBlock, callback) => {
  const text = contentBlock.getText();
  if (!regex || !text) return;
  let matchArr, start;
  while ((matchArr = regex.exec(text)) !== null) {
    start = matchArr.index;
    callback(start, start + matchArr[0].length);
  }
};

const Highlight = props => (
  <span data-offset-key={props.offsetKey}>
    <mark>{props.children}</mark>
  </span>
);

export default config => {
  const regexp = config.highlight;
  const highlightStrategy = (contentBlock: Object, callback: Function) => {
    findWithRegex(regexp, contentBlock, callback);
  };
  return {
    decorators: [
      {
        strategy: highlightStrategy,
        component: Highlight,
      },
    ],
  };
};
