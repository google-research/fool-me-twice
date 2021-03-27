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
import CssBaseline from '@material-ui/core/CssBaseline';
import Workflow from './components/Workflow.jsx';
import Board from './components/Board.jsx';
import Editor from './components/Editor.jsx';
import Login from './components/Login.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Header from './components/Header.jsx';
import {
  useAuth,
  useUserScore,
  useConfig,
  useNotifications,
} from './config/server.js';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';

const AuthRoute = ({children, logged, ...props}) => (
  <Route {...props}>{logged ? children : <Redirect to="/login" />}</Route>
);

export default function App() {
  const config = useConfig();
  const [user, initialising, error] = useAuth();
  const [notifications, setNotifications] = useNotifications();
  const logged = initialising || user;
  const userScore = useUserScore(user && user.uid);
  if (error) console.error(error);
  const props = {
    user: userScore,
    notifications,
    setNotifications,
  };

  return (
    <div className="App">
      <CssBaseline />
      <Router>
        <Switch>
          <Route path="/" exact>
            <Redirect to="/play" />
          </Route>
          <AuthRoute logged={logged} path="/leaderboard">
            <Header {...props} />
            <Leaderboard />
          </AuthRoute>
          <AuthRoute logged={logged} path="/board">
            <Board config={config} {...props} />
          </AuthRoute>
          <AuthRoute logged={logged} path="/play">
            <Header {...props} />
            <Workflow config={config} />
          </AuthRoute>
          <AuthRoute logged={logged} path="/editor">
            <Header {...props} />
            <Editor config={config} />
          </AuthRoute>
          <Route path="/login">
            {user ? <Redirect to="/play" /> : <Login />}
          </Route>
        </Switch>
      </Router>
    </div>
  );
}
