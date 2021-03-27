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

import React, {useState} from 'react';

import TextField from '@material-ui/core/TextField';
// import IconButton from '@material-ui/core/IconButton';
// import PlayArrow from '@material-ui/icons/PlayArrow';

import Header from './Header.jsx';
import Table from './Table.jsx';

const GameSelect = ({value, onChange}) => (
  <>
    <div style={{textAlign: 'right', width: 120}}>
      <TextField
        placeholder="Game Number"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        type="number"
      />
    </div>
    {/*<IconButton onClick={onClick} aria-label="start game" color="inherit">
      <PlayArrow />
    </IconButton>*/}
  </>
);

export default function Board({
  user,
  notifications,
  setNotifications,
  config,
  board,
  data,
}) {
  const [game, setGame] = useState();
  // const [gameConfirmed, setGameConfirmed] = useState();
  return (
    <>
      <Header
        user={user}
        notifications={notifications}
        setNotification={setNotifications}
      >
        <GameSelect value={game} onChange={setGame} />
      </Header>
      <Table config={config} data={data} game={game} />
    </>
  );
}
