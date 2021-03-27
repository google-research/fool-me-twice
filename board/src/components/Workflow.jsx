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

import React, {useState, useEffect} from 'react';

import {withRouter} from 'react-router-dom';
import seedrandom from 'seedrandom';

import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
// import Avatar from '@material-ui/core/Avatar';
import DoneIcon from '@material-ui/icons/Done';
import CloseIcon from '@material-ui/icons/Close';

import FlagIcon from '@material-ui/icons/FlagOutlined';
// import Create from '@material-ui/icons/Create';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import LinearProgress from '@material-ui/core/LinearProgress';
import {makeStyles} from '@material-ui/core/styles';
import uniq from 'lodash.uniq';
import flatten from 'lodash.flatten';

import VideoCard from './VideoCard.jsx';
import Table from './Table.jsx';
import Loading from './Loading.jsx';
import Editor from './Editor.jsx';
import SplitImage from './SplitImage.jsx';

import {
  Result,
  getWorkflow,
  useUserStatus,
  getWikipediaImages,
  logLevelEvent,
  getUserID,
} from '../config/server.js';

const VERIFY = 'verify';
const WRITE = 'write';

const useStyles = makeStyles(theme => ({
  icon: {
    marginRight: theme.spacing(2),
  },
  heroContent: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(3, 0, 2),
  },
  cardGrid: {
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    fontSize: 10,
    alignSelf: 'center',
    letterSpacing: 1.0,
  },
  cardContent: {
    flexGrow: 1,
    padding: '0px 15px',
    textAlign: 'center',
  },
  cardActions: {
    alignSelf: 'center',
    padding: 15,
  },
  avatarDone: {
    backgroundColor: 'green',
  },
  avatarPending: {
    backgroundColor: '#3f51b5',
  },
  avatarDisabled: {},
  media: {
    height: 0,
    paddingTop: '56.25%', // 16:9
    backgroundPosition: 'top',
  },
}));

// const CardAvatar = ({done, disabled, children, classes}) => (
//   <Avatar
//     className={
//       done
//         ? classes.avatarDone
//         : disabled
//         ? classes.avatarDisabled
//         : classes.avatarPending
//     }
//   >
//     {done ? <Done /> : children}
//   </Avatar>
// );

const VerifyToDo = ({item, status, onClick, classes}) => (
  <Card className={classes.card}>
    <SplitImage
      source1={item.imageURL_left}
      name1={item.page_left}
      source2={item.imageURL_right}
      name2={item.page_right}
    />
    <CardHeader
      disableTypography
      className={classes.cardHeader}
      title={
        <span>
          <FlagIcon style={{verticalAlign: 'bottom', marginRight: 5}} />
          FIND THE FIB
        </span>
      }
    />
    <CardContent className={classes.cardContent}>
      {item.page === item.page2 ? (
        <>
          Learn about <b>{item.page}</b> and find which statement is false.
        </>
      ) : (
        <>
          Learn about <b>{item.page}</b> and <b>{item.page2}</b> and find which
          statement is false.
        </>
      )}
    </CardContent>
    <CardActions className={classes.cardActions}>
      <Button
        variant="outlined"
        color="primary"
        onClick={onClick}
        disabled={status.disabled}
      >
        {status.done ? 'Go again' : 'Go'}
      </Button>
    </CardActions>
  </Card>
);

const WriteToDo = ({item, status, onClick, classes}) => (
  <Card className={classes.card}>
    <SplitImage source1={item.imageURL} name1={item.page} />
    <CardHeader
      disableTypography
      className={classes.cardHeader}
      title={
        <span>
          {item.veracity.toString() === 'true' ? (
            <DoneIcon style={{verticalAlign: 'bottom', marginRight: 5}} />
          ) : (
            <CloseIcon style={{verticalAlign: 'middle', marginRight: 5}} />
          )}
          WRITE A {item.veracity.toString().toUpperCase()} CLAIM
        </span>
      }
    />
    <CardContent className={classes.cardContent}>
      Read about <b>{item.page}</b> and come up with a <b>{item.veracity}</b>{' '}
      sentence.
    </CardContent>
    <CardActions className={classes.cardActions}>
      <Button
        variant="outlined"
        color="primary"
        onClick={onClick}
        disabled={status.disabled}
      >
        {status.done ? 'Go again' : 'Go'}
      </Button>
    </CardActions>
  </Card>
);

const ToDo = ({item, ...props}) =>
  item.type === VERIFY ? (
    <VerifyToDo item={item} {...props} />
  ) : (
    <WriteToDo item={item} {...props} />
  );

const ToDos = ({to_dos, images, status, onSelect, progress}) => {
  const classes = useStyles();
  return (
    <>
      <div className={classes.heroContent}>
        <Container maxWidth="sm">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="textPrimary"
            gutterBottom
          >
            Choose your next challenge
          </Typography>
        </Container>
      </div>
      <Container className={classes.cardGrid} maxWidth="md">
        <Box display="flex" alignItems="center" style={{paddingBottom: 10}}>
          <Box width="100%" mr={1}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
          <Box minWidth={35}>
            <Typography variant="body2" color="textSecondary">{`${Math.round(
              progress
            )}%`}</Typography>
          </Box>
        </Box>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6} md={4} key="tutorial">
            <VideoCard
              classes={classes}
              src="https://storage.googleapis.com/fool-me-twice-media/tutorial2.mp4"
              title="LEARN HOW TO PLAY"
              content="Watch this quick video tutorial to learn how to fool and not be fooled."
            />
          </Grid>
          {to_dos.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item.index}>
              <ToDo
                item={{
                  imageURL_left: images.get(item.page_left),
                  imageURL_right: images.get(item.page_right),
                  imageURL: images.get(item.page),
                  ...item,
                }}
                onClick={() => {
                  logLevelEvent('level_start', item, status[item.index] || {});
                  onSelect({...item, start_time: new Date().getTime()});
                }}
                status={status[item.index] || {}}
                classes={classes}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

const withIndex = to_do => ({
  ...to_do,
  page: to_do.page && to_do.page.split('_').join(' '),
  index:
    to_do.type === VERIFY
      ? `${to_do.claim_left}_${to_do.claim_right}`
      : `${to_do.page}_${to_do.veracity}`,
});

const canSee = (to_do, status) =>
  to_do.type !== VERIFY ||
  // This allows votes you did from being filtered out.
  status[to_do.index] ||
  !(status[to_do.claim_left] || status[to_do.claim_right]);

function Workflow({config, history}) {
  const [status, setStatus] = useUserStatus();
  const [images, setImages] = useState(new Map());
  const [workflow, setWorkflow] = useState();
  const [progress, setProgress] = useState(0);
  const workflowID = config.getString('kWorkflowID');
  useEffect(() => {
    if (!status) return;
    console.log('Getting workflow ', workflowID);
    const userID = getUserID();
    getWorkflow(workflowID)
      .then(w => {
        const to_dos = Object.values(w)
          .map(withIndex)
          .filter(t => canSee(t, status))
          .map(t => [seedrandom(userID + t.index)(), t])
          .sort()
          .map(pair => pair[1]);
        const total = to_dos.length;
        const pending = to_dos.filter(
          t => !(status[t.index] && status[t.index].done)
        );
        setProgress((100.0 * (total - pending.length)) / total);
        return {to_dos: pending.slice(0, 50)};
      })
      // .then(w => {
      //   console.log('Verify', w.to_dos.filter(v => v.type === VERIFY).length);
      //   return w;
      // })
      .then(setWorkflow)
      .catch(console.error);
  }, [status, workflowID]);

  useEffect(() => {
    if (!workflow) return;
    const pages = uniq(
      flatten(workflow.to_dos.map(i => [i.page, i.page_left, i.page_right]))
    )
      .filter(x => x)
      .reverse();
    getWikipediaImages(pages)
      .then(setImages)
      .catch(console.error);
  }, [workflow]);

  const [item, setItem] = useState();
  const onComplete = (item, result, claim_id) => {
    if (result === Result.CANCEL) {
      // User pressed back button
      setItem();
      history.push('/play');
      return;
    }
    const newStatus = status[item.index] || {};
    const seconds = Math.floor((new Date().getTime() - item.start_time) / 1000);
    const event = result === Result.REPORT ? 'level_report' : 'level_end';
    logLevelEvent(
      event,
      item,
      newStatus,
      result === Result.RIGHT ? 1 : 0,
      seconds
    );

    // newStatus.disabled = true;
    newStatus.done |= true;
    newStatus.result = result;
    newStatus.type = item.type;
    const forbidden = {};
    if (item.claim_left) forbidden[item.claim_left] = true;
    if (item.claim_right) forbidden[item.claim_right] = true;
    if (claim_id) {
      forbidden[claim_id] = true;
      newStatus.claim_id = claim_id;
    }
    setStatus({...status, ...forbidden, [item.index]: newStatus});
    setItem();
    history.push('/play');
  };

  if (!workflow || !status) return <Loading />;
  // Stop showing tutorial after the third time
  const seenTutorial =
    Object.values(status || {}).filter(s => s.done && s.type === WRITE).length >
    1;
  return (
    <>
      {!item && (
        <ToDos
          progress={progress}
          images={images}
          to_dos={workflow.to_dos}
          status={status}
          onSelect={setItem}
        />
      )}
      {item && item.type === VERIFY && (
        <Table
          config={config}
          game={`${item.claim_left}_${item.claim_right}`}
          onComplete={result => onComplete(item, result)}
        />
      )}
      {item && item.type === WRITE && (
        <Editor
          config={config}
          seenTutorial={seenTutorial}
          page={item.page}
          veracity={item.veracity}
          onComplete={(result, claim_id) => onComplete(item, result, claim_id)}
        />
      )}
    </>
  );
}

export default withRouter(Workflow);
