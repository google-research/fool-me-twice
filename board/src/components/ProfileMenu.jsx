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
import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import ListSubheader from '@material-ui/core/ListSubheader';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Delete from '@material-ui/icons/Delete';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Notifications from '@material-ui/icons/Notifications';
import LinearProgress from '@material-ui/core/LinearProgress';

import {logout} from '../config/server.js';

const format = (text, number) =>
  text.replace('{}', number || 0).replace('(s)', number === 1 ? '' : 's');

const levels = {
  verify: [0, 1, 2, 3, 10, 30, 50, 200, 500, 1000, 25000],
  fool: [0, 0, 0, 1, 2, 10, 50, 150, 250, 5000, 10000],
  liked: [0, 0, 0, 1, 2, 10, 50, 150, 250, 5000, 10000],
  write: [0, 0, 1, 2, 10, 10, 25, 50, 250, 500, 1500],
};

const level_names = [
  {
    name: 'First Timer',
    text: 'Welcome to the game!  Vote on a claim to level up ...',
  },
  {
    name: 'Voter',
    text:
      "Great job!  You've discerned truth from fiction, now write your own claim!",
  },
  {
    name: 'Debut Author',
    text: "You've written your first claim ... now to see who bites ...",
  },
  {
    name: 'First Blood',
    text:
      "Is it possibled to be liked and feared?  You've fooled someone with a claim, and gotten someone to find your claim interesting.",
  },
  {
    name: 'Vote Early, Vote Often',
    text:
      "You've gone on a voting streak ... hopefully your seeing what makes claims tricky and interesting.",
  },
  {
    name: 'All-Rounder',
    text:
      "Voting on claims, writing claims, likes, fooling others ... you've done it all!",
  },
  {
    name: 'Getting Traction',
    text:
      "The claims you've written are both interesting and challenging, keep at it!",
  },
  {
    name: 'Prolific Author',
    text:
      'Quality and Quantitity: Your claims are interesting, tricky, and everywhere.',
  },
  {
    name: 'Expert',
    text:
      'Your claims are so good that everything next to them seems boring and obvious.',
  },
  {
    name: 'Master',
    text:
      "Alexander wept, for there were no more fools to conquer.  Congrats, you've reached the highest level!",
  },
];

const texts = {
  verify: 'Indentified {} false claim(s)',
  fool: 'Fooled {} player(s)',
  liked: 'Liked {} time(s)',
  write: 'Wrote {} claim(s)',
};

const categories = Object.keys(levels);

const getLevel = user =>
  Math.min(
    ...categories.map(cat =>
      levels[cat].findIndex(p => (user[`${cat}Total`] || 0) < p)
    )
  );

function Progress({user, category}) {
  const level = getLevel(user);
  const start = 0; //levels[category][level];
  const points = user[`${category}Total`] || 0;
  const end = levels[category][level];
  const progress = Math.min(100, (100 * (points - start)) / (end - start));
  return (
    <>
      {format(texts[category], points)}
      <Box display="flex" alignItems="center" style={{paddingBottom: 10}}>
        <Box width={80} mr={1}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
        <Box minWidth={50}>
          <Typography variant="body2" color="textSecondary">
            {points} / {end} required
          </Typography>
        </Box>
      </Box>
    </>
  );
}

export default function ProfileMenu({user, notifications, setNotifications}) {
  const [anchorEl1, setAnchorEl1] = React.useState(null);
  const [anchorEl2, setAnchorEl2] = React.useState(null);
  const [anchorEl3, setAnchorEl3] = React.useState(null);

  const handleClick1 = event => {
    setAnchorEl1(event.currentTarget);
  };

  const handleClose1 = () => {
    setAnchorEl1(null);
  };

  const handleClick2 = event => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleClick3 = event => {
    setAnchorEl3(event.currentTarget);
  };

  const handleClose3 = () => {
    setAnchorEl3(null);
  };

  const notifCount = notifications.filter(n => !n.seen && !n.deleted).length;
  const markNotif = (i, attr) => {
    const newNotifs = notifications.slice();
    newNotifs[i] = {...notifications[i], [attr]: true};
    setNotifications(newNotifs);
  };

  const level = user ? getLevel(user) : 0;

  return (
    <>
      {user && (
        <div>
          <Button color="inherit" onClick={handleClick3}>
            Level {level} &middot; {level_names[level - 1].name} &middot;{' '}
            {user.points || 0} points
          </Button>
        </div>
      )}
      <div>
        <IconButton
          aria-label="notifications"
          aria-controls="primary-notifications-menu"
          aria-haspopup="true"
          color="inherit"
          onClick={handleClick2}
        >
          <Badge badgeContent={notifCount} color="primary">
            <Notifications />
          </Badge>
        </IconButton>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl2}
          keepMounted
          open={Boolean(anchorEl2)}
          onClose={handleClose2}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
        >
          {notifications.filter(n => !n.deleted).length === 0 && (
            <span style={{margin: 20}}>No notifications</span>
          )}
          {notifications.map(
            (n, i) =>
              !n.deleted && (
                <MenuItem
                  key={i}
                  style={{width: 350}}
                  onClick={() => {
                    markNotif(i, 'seen');
                    // handleClose2();
                  }}
                  selected={!n.seen}
                >
                  <ListItemText primary={n.primary} secondary={n.secondary} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => markNotif(i, 'deleted')}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </MenuItem>
              )
          )}
        </Menu>
        <IconButton
          aria-label="account of current user"
          aria-controls="primary-account-menu"
          aria-haspopup="true"
          color="inherit"
          onClick={handleClick1}
        >
          <AccountCircle />
        </IconButton>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl3}
          keepMounted
          open={Boolean(anchorEl3)}
          onClose={handleClose3}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <ListSubheader>Next Level Progress</ListSubheader>
          {user &&
            categories.map(cat => (
              <MenuItem key={cat}>
                <ListItemText
                  primary={<Progress user={user} category={cat} />}
                />
              </MenuItem>
            ))}
        </Menu>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl1}
          keepMounted
          open={Boolean(anchorEl1)}
          onClose={handleClose1}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
        >
          <MenuItem
            onClick={() => {
              handleClose1();
              logout();
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </div>
    </>
  );
}
