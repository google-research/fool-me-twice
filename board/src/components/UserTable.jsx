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

import {useLeaderboard} from '../config/server.js';

import Loading from './Loading.jsx';

// import Avatar from '@material-ui/core/Avatar';
// import AccountCircle from '@material-ui/icons/AccountCircle';
import {makeStyles} from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';

// const format = (text, number) =>
//   text.replace('{}', number || 0).replace('(s)', number === 1 ? '' : 's');
//   <span>
//     {format('{} point(s)', points)}
//     &nbsp;&middot;&nbsp;
//     {format('Identified {} false claim(s)', verifyTotal)}
//     &nbsp;&middot;&nbsp;
//     {format('Wrote {} claim(s)', writeTotal)}
//     &nbsp;&middot;&nbsp;
//     {format('Fooled {} player(s)', foolTotal)}
//     &nbsp;&middot;&nbsp;
//     {format('Liked {} time(s)', likedTotal)}
//   </span>

const attributes = [
  'verifyTotal',
  'writeTotal',
  'foolTotal',
  'likedTotal',
  'points',
];

const names = {
  verifyTotal: 'False Claims Found',
  writeTotal: 'Claims Written',
  foolTotal: 'Players Fooled',
  likedTotal: 'Likes Received',
  points: 'Total Points',
};

const useStyles = makeStyles(theme => ({
  paper: {
    width: '80%',
    margin: theme.spacing(4),
  },
}));

function UserLine({user}) {
  const {displayName} = user;
  return (
    <TableRow hover>
      <TableCell>{displayName}</TableCell>
      {attributes.map(a => (
        <TableCell key={a} align="right">
          {Math.floor(user[a] || 0)}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function UserTable() {
  const [orderBy, setOrderBy] = useState('points');
  const [users, loading, error] = useLeaderboard(orderBy);
  const classes = useStyles();
  if (error) console.error(error);
  return (
    <Grid container spacing={4} justify="center">
      <Paper elevation={1} className={classes.paper}>
        <TableContainer>
          <Table
            className={classes.table}
            aria-labelledby="leaderboard"
            size="medium"
            aria-label="leaderboard"
          >
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                {attributes.map(a => (
                  <TableCell key={a} align="right" sortDirection="desc">
                    <TableSortLabel
                      active={orderBy === a}
                      direction={'desc'}
                      onClick={() => setOrderBy(a)}
                    >
                      {names[a]}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading &&
                users.map((user, i) => <UserLine user={user} key={i} />)}
            </TableBody>
          </Table>
        </TableContainer>
        {loading && <Loading />}
      </Paper>
    </Grid>
  );
}
