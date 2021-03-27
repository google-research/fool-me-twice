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
import CircularProgress from '@material-ui/core/CircularProgress';

export default function Timer({seconds, totalMinutes}) {
  seconds = Math.max(seconds, 0);
  const minutes = Math.floor(seconds / 60);
  const paddedSeconds = (Math.floor(seconds) % 60).toString().padStart(2, '0');
  const ratio = (100 * seconds) / (totalMinutes * 60);
  return (
    <div style={{marginTop: 20, marginBottom: -100}}>
      <CircularProgress
        variant="static"
        color={seconds <= 30 ? 'secondary' : 'primary'}
        value={ratio}
        style={{width: 180, height: 180}}
      />
      <div style={{bottom: 140, position: 'relative'}}>
        {minutes}:{paddedSeconds}
      </div>
    </div>
  );
}
