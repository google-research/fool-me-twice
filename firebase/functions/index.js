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

'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cookieParser = require('cookie-parser')();
const bodyParser = require('body-parser').json()
const cors = require('cors')({origin: true});
const assert = require('assert');

admin.initializeApp();
const app = express();
const db = admin.firestore();

// We give as a maximum 2 minutes worth of points
const MAX_VERIFY_POINTS = 120;
const WRITE_POINTS = 100;
const LIKED_POINTS = 10;

const validateFirebaseIdToken = async (req, res, next) => {
  console.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if(req.cookies) {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};

const createVote = async (req, res) => {
  const {uid} = req.user;
  const {fibs, index, time, trueSeconds, reveal} = req.body;
  try {
    assert(fibs.length === 2);
    assert(fibs[index]);
    assert(time < 300);
    assert(time >= 0);

    const veracity = await Promise.all(fibs.map(
      fibId => db.doc(`fibs/${fibId}`).get().then(f => f.data().veracity !== 'FALSE')
    ));

    // @todo: Move this to a different object
    const authors = await Promise.all(fibs.map(
      fibId => db.doc(`fibs/${fibId}`).get().then(f => f.data().author)
    ));

    assert(veracity.filter(f => !f).length === 1);
    assert(authors.indexOf(uid) === -1);
    const success = !veracity[index];

    const batch = db.batch();
    const points = success ? Math.min(MAX_VERIFY_POINTS, Math.floor(time)) : 0;
    // @todo: Assert this don't already exist
    fibs.forEach(fibId =>
      batch.set(
        db.doc(`fibs/${fibId}/votes/${uid}`),
        {
          author: uid,
          points,
          secondsLeft: trueSeconds || -1,
          evidenceUsed: reveal || [],
          fibs,
          success,
          created: admin.firestore.FieldValue.serverTimestamp(),
        }
      )
    );
    batch.set(
      db.collection('leaderboard').doc(uid),
      {
        points: admin.firestore.FieldValue.increment(points),
        verifyPoints: admin.firestore.FieldValue.increment(points),
        verifyTotal: admin.firestore.FieldValue.increment(success ? 1 : 0),
      },
      {merge: true}
    );
    const authorPoints = Math.floor((MAX_VERIFY_POINTS - points) / authors.length);
    if (success && authors.length && authorPoints) {
      authors.filter(a => a).forEach(author =>
        batch.set(
          db.collection('leaderboard').doc(author),
          {
            points: admin.firestore.FieldValue.increment(authorPoints),
            foolPoints: admin.firestore.FieldValue.increment(authorPoints),
            foolTotal: admin.firestore.FieldValue.increment(1),
          },
          {merge: true}
        )
      );
    }
    const result = await batch.commit();
    res.json({success, points});
  } catch (error) {
    console.error('Error while creating vote:', error);
    res.status(403).send('Unauthorized');
    return;
  }
}

app.use(cors);
app.use(cookieParser);
app.use(bodyParser);
app.use(validateFirebaseIdToken);
app.post('/createVote', createVote);

exports.changeName = functions.firestore
    .document('users/{userId}')
    .onWrite((change, context) => {
      return db.collection('leaderboard').doc(context.params.userId).set({
        displayName: change.after.data().displayName,
        points: admin.firestore.FieldValue.increment(0),
      },
      {merge: true});
    });

exports.fibWritten = functions.firestore
    .document('fibs/{fibId}')
    .onCreate((snapshot, context) => {
      const {author} = snapshot.data();
      return db.collection('leaderboard').doc(author).set({
        points: admin.firestore.FieldValue.increment(WRITE_POINTS),
        writePoints: admin.firestore.FieldValue.increment(WRITE_POINTS),
        writeTotal: admin.firestore.FieldValue.increment(1),
      },
      {merge: true});
    });

exports.fibLiked = functions.firestore
    .document('fibs/{fibId}/likes/{userId}')
    .onCreate((snapshot, context) => db.doc(`fibs/${context.params.fibId}`).get()
        .then(f => f.data())
        .then(fib => {
          assert(fib.author !== context.params.userId);
          return fib.author;
        })
        .then(author => db.doc(`leaderboard/${author}`).set({
          points: admin.firestore.FieldValue.increment(LIKED_POINTS),
          likedPoints: admin.firestore.FieldValue.increment(LIKED_POINTS),
          likedTotal: admin.firestore.FieldValue.increment(1),
        }, {merge: true})));

const LIKE_NOTIFICATION = 'likes';
const FOOL_NOTIFICATION = 'fools';

exports.leaderboardChanged = functions.firestore
      .document('leaderboard/{userId}')
      .onUpdate((change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        let likes = (after.likedTotal || 0) - (before.likedTotal || 0);
        let fools = (after.foolTotal || 0) - (before.foolTotal || 0);
        if (!likes && !fools) return Promise.resolve();
        const doc = db.doc(`notifications/${context.params.userId}`);
        return doc.get()
          .then(n => n.data() || {list: []})
          .then(notifs => {
            let newNotifs = notifs.list.filter(n => !n.deleted);
            if (likes) {
              const likeNotif = newNotifs.find(n => n.type === LIKE_NOTIFICATION) || {};
              likes += (likeNotif.likes || 0);
              newNotifs = newNotifs.filter(n => n.type !== LIKE_NOTIFICATION);
              const s = likes === 1 ? '' : 's';
              newNotifs.push({
                likes,
                type: LIKE_NOTIFICATION,
                created: new Date().getTime(),
                primary: 'Your claims are liked',
                secondary: `You got ${likes} new like${s}. Keep it up!`,
              });
            }
            if (fools) {
              const foolsNotif = newNotifs.find(n => n.type === FOOL_NOTIFICATION) || {};
              fools += (foolsNotif.fools || 0);
              newNotifs = newNotifs.filter(n => n.type !== FOOL_NOTIFICATION);
              const s = fools === 1 ? '' : 's';
              newNotifs.push({
                fools,
                type: FOOL_NOTIFICATION,
                created: new Date().getTime(),
                primary: 'You are an awesome writer',
                secondary: `${fools} player${s} have been fooled. Amazing!`,
              });
            }

            return doc.set({list: newNotifs});
          })
      });

exports.api = functions.https.onRequest(app);
