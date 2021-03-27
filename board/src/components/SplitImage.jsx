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

export const DUMMY_IMAGE =
  'https://dummyimage.com/500x280/ffffff/00000.png&text=';

const clip = text =>
  text && text.length < 23 ? text : text.substring(0, 20) + '...';

const source = text => (
  <a
    href={'http://en.wikipedia.org/wiki/' + text}
    style={{fill: 'white'}}
    target="_blank"
    rel="noopener noreferrer"
  >
    ⧉
  </a>
);

const textStyle = {
  fontSize: 0.7,
  userSelect: 'none',
  letterSpacing: 0.01,
  textShadow: '0px 2px 3px #00000080',
  fontFamily: 'Rockwell',
};

function SplitImage({source1, source2, name1, name2}) {
  return (
    <>
      <svg viewBox="0 0 10 5.6">
        <defs>
          <clipPath id="top">
            <polygon points="0 0, 9.9 0, 0 5.5" />
          </clipPath>
          <clipPath id="bottom">
            <polygon points="10 0.1, 10 5.6, 0.1 5.6" />
          </clipPath>
        </defs>
        <image
          preserveAspectRatio="xMidYMin slice"
          xlinkHref={source1 || DUMMY_IMAGE + name1}
          x="0"
          y="-1"
          height="7.6"
          width="10"
          clipPath={name2 && 'url(#top)'}
        />
        {name2 && (
          <>
            <image
              preserveAspectRatio="xMidYMin slice"
              xlinkHref={source2 || DUMMY_IMAGE + name2}
              x="0"
              y="-1"
              height="7.6"
              width="10"
              clipPath="url(#bottom)"
            />
            <text
              x="9.7"
              y="5.2"
              fill="white"
              textAnchor="end"
              style={textStyle}
            >
              {clip(name2)} {source(name2)}
            </text>
          </>
        )}
        <text x="0.4" y="1.0" fill="white" style={textStyle}>
          {clip(name1)} {source(name1)}
        </text>
      </svg>
    </>
  );
}

export default SplitImage;
