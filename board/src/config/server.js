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
import firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/firestore';
import 'firebase/performance';
import 'firebase/auth';
import 'firebase/storage';
import 'firebase/remote-config';
import {
  useDocumentData,
  useCollectionData,
} from 'react-firebase-hooks/firestore';
import {useAuthState} from 'react-firebase-hooks/auth';
import firebaseConfig from './firebase.json';
import chunk from 'lodash.chunk';
import flatten from 'lodash.flatten';

export const firebaseApp = firebase.initializeApp(firebaseConfig);
export const analytics = firebase.analytics();
export const perf = firebase.performance();
export const db = firebase.firestore();
const remoteConfig = firebase.remoteConfig();
const storage = firebase.storage();
// remoteConfig.settings = {
//   minimumFetchIntervalMillis: 60 * 60 * 1000,
// };

remoteConfig.defaultConfig = {
  kWorkflowID: 'default',
  kTotalVoteMinutes: 3,
  kTotalWriteMinutes: 8,
  kEvidenceSeconds: 15,
  kSecondsPenalty: 10,
  kShowRevealButton: true,
};

export const logLevelEvent = (event, item, status, success, seconds) => {
  analytics.logEvent(event, {
    level_name: item.type,
    first_time: status.done ? 0 : 1,
    pages: [item.page, item.page_left, item.page_right].filter(s => s),
    success,
    seconds,
  });
};

export const logout = () => {
  firebaseApp.auth().signOut();
};

export const getUserID = () =>
  firebase.auth().currentUser && firebase.auth().currentUser.uid;

export const useConfig = () => {
  const [config, setConfig] = React.useState(remoteConfig);
  remoteConfig.fetchAndActivate().then(() => setConfig(remoteConfig));
  return config;
};

export const useAuth = () => useAuthState(firebase.auth());

const WIKI_URL =
  'https://en.wikipedia.org/w/api.php?format=json&' +
  'action=query&prop=pageimages&redirects&origin=*&pithumbsize=500&titles=';

const imagesBackup = {
  'Disneyland Paris':
    'https://upload.wikimedia.org/wikipedia/en/2/2d/Disneyland_Hotel%2C_Paris%2C_France%2C_2011.jpg',
  'A Song of Ice and Fire':
    'https://upload.wikimedia.org/wikipedia/en/d/dc/A_Song_of_Ice_and_Fire_book_collection_box_set_cover.jpg',
  "Grey's Anatomy":
    'https://upload.wikimedia.org/wikipedia/en/a/ac/GreysAnatomysSeason1Cast.jpg',
  'Darth Vader':
    'https://upload.wikimedia.org/wikipedia/en/7/76/Darth_Vader.jpg',
  'Family Guy':
    'https://upload.wikimedia.org/wikipedia/en/a/aa/Family_Guy_Logo.svg',
  'Breaking Bad':
    'https://upload.wikimedia.org/wikipedia/en/6/61/Breaking_Bad_title_card.png',
  'The Hobbit':
    'https://upload.wikimedia.org/wikipedia/en/4/4a/TheHobbit_FirstEdition.jpg',
  'Brave New World':
    'https://upload.wikimedia.org/wikipedia/en/6/62/BraveNewWorld_FirstEdition.jpg',
  'Of Mice and Men':
    'https://upload.wikimedia.org/wikipedia/en/0/01/OfMiceAndMen.jpg',
  'The Walking Dead (TV series)':
    'https://upload.wikimedia.org/wikipedia/commons/e/ef/The_Walking_Dead_2010_logo.svg',
  'Lord of the Flies':
    'https://upload.wikimedia.org/wikipedia/en/9/9b/LordOfTheFliesBookCover.jpg',
  'Willard Brown':
    'https://upload.wikimedia.org/wikipedia/en/5/55/Willard_Brown_Baseball.jpeg',
  'The Last Picture Show':
    'https://upload.wikimedia.org/wikipedia/en/8/8f/The_Last_Picture_Show_%28movie_poster%29.jpg',
  'Hannah and Her Sisters':
    'https://upload.wikimedia.org/wikipedia/en/a/af/Hannah_and_her_sisters.jpg',
  'The Heart is a Lonely Hunter':
    'https://upload.wikimedia.org/wikipedia/en/b/bf/HeartIsALonelyHunter.jpg',
  'Larry MacPhail':
    'https://upload.wikimedia.org/wikipedia/en/2/22/Larry_MacPhail.jpg',
};

export const getWikipediaImages = pages =>
  Promise.all(
    chunk(pages, 45).map(p =>
      fetch(WIKI_URL + p.join('|'))
        .then(response => response.json())
        .then(data => data.query)
        .then(({redirects, pages}) => {
          const redirectMap = new Map(
            (redirects || []).map(({to, from}) => [to, from])
          );
          return Object.values(pages).map(page => [
            redirectMap.get(page.title) || page.title,
            page.thumbnail && page.thumbnail.source,
          ]);
        })
    )
  )
    .then(pairs => flatten(pairs).concat(Object.entries(imagesBackup)))
    .then(pairs => new Map(pairs.filter(pair => pair[1])));
// .then(map => {
//   console.log('Missing pages', pages.filter(p => !map.get(p)))
//   return map;
// });

export const getFromStorage = (collection, name) =>
  storage
    .refFromURL(
      `gs://${firebaseConfig.storageBucket}/${collection}/${name}.json`
    )
    .getDownloadURL()
    .then(url => fetch(url))
    .then(response => response.json());

export const getWorkflow = name => getFromStorage('workflow', name.trim());

export const useDB = (collection, doc) =>
  useDocumentData(db.collection(collection).doc(doc));

export const login = authResult => {
  const user = authResult.user;
  const isNewUser = authResult.additionalUserInfo.isNewUser;
  const ref = db.collection('users').doc(user.uid);
  if (isNewUser)
    ref.set({
      displayName: user.displayName,
      // photoURL: user.photoURL,
      // email: user.email,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      created: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    });
  else
    ref.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    });
};

export const Result = {
  RIGHT: 'right',
  WRONG: 'wrong',
  CANCEL: 'cancel',
  REPORT: 'report',
};

export const reportFib = (fib, issue) => {
  const user = firebase.auth().currentUser;
  return db
    .collection('fibs')
    .doc(fib.id)
    .collection('reports')
    .doc(user.uid)
    .set({
      issue,
      created: firebase.firestore.FieldValue.serverTimestamp(),
    });
};

export const rateFibs = (goodFib, badFib) => {
  const batch = db.batch();
  const user = firebase.auth().currentUser;
  if (goodFib) {
    const like = db
      .collection('fibs')
      .doc(goodFib.id)
      .collection('likes')
      .doc(user.uid);
    batch.set(like, {created: firebase.firestore.FieldValue.serverTimestamp()});
  }
  if (badFib) {
    const dislike = db
      .collection('fibs')
      .doc(badFib.id)
      .collection('dislikes')
      .doc(user.uid);
    batch.set(dislike, {
      created: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  return batch.commit();
};

const FUNCTION_PATH = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/api/`;

export const secureFetch = (path, config) =>
  firebase
    .auth()
    .currentUser.getIdToken(true)
    .then(idToken =>
      fetch(FUNCTION_PATH + path, {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      })
    );

export const castVote = (fibs, index, time, trueSeconds, reveal) =>
  secureFetch('createVote', {
    method: 'POST',
    body: JSON.stringify({
      fibs: fibs.map(f => f.id),
      index,
      time,
      trueSeconds,
      reveal,
    }),
  }).then(response => response.json());

export const useUserStatus = () => {
  const [userStatus, setuserStatus] = React.useState();
  const userId = getUserID();
  const saveStatus = status =>
    db
      .collection('status')
      .doc(userId)
      .set(status, {merge: true});
  React.useEffect(() => {
    if (!userId) return;
    return db
      .collection('status')
      .doc(userId)
      .onSnapshot(doc => setuserStatus(doc.data() || {}));
  }, [userId]);
  return [userStatus, saveStatus];
};

export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState([]);
  const userId = getUserID();
  const saveNotifications = notifs =>
    db
      .collection('notifications')
      .doc(userId)
      .set({list: notifs});
  React.useEffect(() => {
    if (!userId) return;
    return db
      .collection('notifications')
      .doc(userId)
      .onSnapshot(doc => setNotifications((doc.data() || {list: []}).list));
  }, [userId]);
  return [notifications, saveNotifications];
};

export const useUserScore = userId => {
  const [userScore, setUserScore] = React.useState();
  React.useEffect(() => {
    if (!userId) return;
    return db
      .collection('leaderboard')
      .doc(userId)
      .onSnapshot(doc => setUserScore(doc.data()));
  }, [userId]);
  return userScore;
};

export const getPage = title =>
  getFromStorage('pages', title).catch(e =>
    db
      .collection('pages')
      .doc(title)
      .get()
      .then(doc => JSON.parse(doc.data().sentences))
      .catch(e => {
        console.log('Failed to find page', title);
        return [];
      })
  );

export const getIndex = title =>
  getFromStorage('indices', title).catch(e =>
    db
      .collection('indices')
      .doc(title)
      .get()
      .then(doc => JSON.parse(doc.data().lunr_index))
      .catch(e => {
        console.log('Failed to find index', title);
        return [];
      })
  );

export const getFibs = game =>
  Array.isArray(game)
    ? getFibsByID(game)
    : db
        .collection('fibs')
        .where('game', 'in', [parseInt(game), game.toString()])
        .get()
        .then(snapshot => {
          const result = [];
          snapshot.forEach(fib => result.push({id: fib.id, ...fib.data()}));
          return result;
        });

export const getFibsByID = claims =>
  Promise.all(
    claims.map(claim =>
      db
        .collection('fibs')
        .doc(claim)
        .get()
        .then(c => ({id: c.id, ...c.data()}))
    )
  );

export const saveFib = fib =>
  fib.id
    ? db
        .collection('fibs')
        .doc(fib.id)
        .set(fib)
    : db
        .collection('fibs')
        .add({
          ...fib,
          author: getUserID(),
          created: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .catch(console.error);

export const useLeaderboard = orderBy =>
  useCollectionData(
    db
      .collection('leaderboard')
      .orderBy(orderBy, 'desc')
      .limit(20)
  );

export default firebaseApp;
