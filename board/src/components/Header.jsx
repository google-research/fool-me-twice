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

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ProfileMenu from './ProfileMenu.jsx';
import Link from '@material-ui/core/Link';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';

import {Link as RouterLink, withRouter} from 'react-router-dom';

const LinkRouter = props => <Link {...props} component={RouterLink} />;

function Header({children, location, ...props}) {
  const {pathname} = location;
  const paths = [
    {to: '/play', name: 'Play'},
    // {to: '/board', name: 'Board'},
    // {to: '/editor', name: 'Create'},
    {to: '/leaderboard', name: 'Leaderboard'},
  ];
  return (
    <AppBar color="default" position="sticky">
      <Toolbar>
        <Typography variant="h6" color="inherit" noWrap>
          Fool Me Twice
        </Typography>
        <Breadcrumbs
          separator="-"
          aria-label="breadcrumb"
          style={{paddingLeft: 20, paddingTop: 1}}
        >
          {paths.map(path => (
            <LinkRouter
              key={path.to}
              color={pathname === path.to ? 'inherit' : 'textPrimary'}
              to={path.to}
            >
              {path.name}
            </LinkRouter>
          ))}
        </Breadcrumbs>
        <div style={{flexGrow: 1}} />
        {children}
        <ProfileMenu {...props} />
      </Toolbar>
    </AppBar>
  );
}

export default withRouter(Header);
