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

import React, {useEffect, useState} from 'react';

// import PlusOne from '@material-ui/icons/PlusOne';
import Flag from '@material-ui/icons/Flag';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import Card from '@material-ui/core/Card';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import CardActions from '@material-ui/core/CardActions';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import Collapse from '@material-ui/core/Collapse';
import Backdrop from '@material-ui/core/Backdrop';
import WikiSource from './WikiSource.jsx';

import Timer from './Timer.jsx';
import Loading from './Loading.jsx';
// import DisplayAnswerEvidence from './DisplayAnswerEvidence.jsx';
import {
  getFibs,
  castVote,
  rateFibs,
  reportFib,
  Result,
} from '../config/server.js';

const styles = {
  infoIcon: {
    width: '1.0em',
    verticalAlign: 'bottom',
    paddingRight: 3,
  },
  cards: {
    padding: '0 20px',
    height: 'Calc(100vh - 280px)',
    flexFlow: 'column',
    display: 'flex',
  },
  evidence: {
    overflowY: 'auto',
    overflowX: 'hidden',
    height: '100%',
    // flexGrow: 1,
  },
  instructionsTitle: {
    margin: 5,
  },
  startButton: {
    margin: 5,
  },
  clueButton: {
    width: '100%',
    marginTop: 10,
  },
};

// Game States
const STARTING = 'starting';
const PLAYING = 'playing';
const TIMEOUT = 'timeout';
const LOADING = 'loading';
const DONE_RIGHT = 'done_right';
const DONE_WRONG = 'done_wrong';

const Clues = ({fib, reveal, onReveal, disabled}) => {
  const goldClues = fib.gold.map((text, key) => ({
    text: text.line || text,
    key: key + fib.evidence.length,
    isGold: true,
  }));
  const clues = fib.evidence
    .map((text, key) => ({text: text.line || text, key}))
    .concat(goldClues)
    .slice(0, reveal)
    .reverse();
  const [entering, setEntering] = useState(0);
  const numClues = clues.length;
  useEffect(() => {
    const timer = setTimeout(() => setEntering(numClues), 1);
    return () => clearTimeout(timer);
  }, [numClues]);

  return (
    <>
      <Button
        style={styles.clueButton}
        variant="outlined"
        disabled={reveal >= fib.evidence.length + fib.gold.length || disabled}
        key="+1"
        aria-label="get clue"
        onClick={() => onReveal()}
      >
        Get a clue
      </Button>
      <div style={styles.evidence}>
        {clues.map(({text, isGold, key}) => (
          <Collapse key={key} in={key !== entering}>
            <Card
              style={{
                marginTop: 10,
                position: 'relative',
                backgroundColor: isGold && '#CFB87C',
              }}
            >
              <CardContent>{text}</CardContent>
            </Card>
          </Collapse>
        ))}
      </div>
    </>
  );
};

const Entities = ({
  fibs,
  showSource,
  showClaims,
  votingDisabled,
  voteOnFib,
  reportOnFib,
  indexVoted,
}) => (
  <Grid container spacing={1}>
    {fibs.map((fib, index) => (
      <Grid item xs={12 / fibs.length} key={index}>
        <FibContainer
          fib={fib}
          showSource={showSource}
          showClaims={showClaims}
          votingDisabled={votingDisabled}
          voted={indexVoted === index}
          voteOnFib={() => voteOnFib(fibs, index)}
          reportOnFib={issue => reportOnFib(fib, issue)}
        />
      </Grid>
    ))}
  </Grid>
);

const FibContainer = ({
  fib,
  voted,
  votingDisabled,
  showClaims,
  showSource,
  voteOnFib,
  reportOnFib,
}) => {
  const anchorRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  return (
    <Card
      style={{
        minHeight: '100%',
        position: 'relative',
      }}
    >
      <CardHeader
        style={{backgroundColor: '#eeeeee'}}
        title={
          <>
            {fib.page}
            {showSource && (
              <WikiSource style={{marginLeft: 10}} page={fib.page} />
            )}
          </>
        }
      />
      {showClaims && (
        <CardContent style={{marginBottom: 35}}>{fib.claim}</CardContent>
      )}
      {showClaims && (
        <CardActions
          disableSpacing
          style={{bottom: 0, position: 'absolute', right: 0}}
        >
          <ButtonGroup
            variant="outlined"
            color="primary"
            ref={anchorRef}
            aria-label="split button"
          >
            <Button
              disabled={votingDisabled}
              key="x"
              color="primary"
              variant={voted ? 'contained' : 'outlined'}
              aria-label="mark false"
              onClick={voteOnFib}
              startIcon={<Flag />}
            >
              Mark as false
            </Button>
            <Button
              color="primary"
              size="small"
              aria-controls={open ? 'split-button-menu' : undefined}
              aria-expanded={open ? 'true' : undefined}
              aria-label="select merge strategy"
              aria-haspopup="menu"
              onClick={() => setOpen(!open)}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
          <Menu
            id="simple-menu"
            anchorEl={anchorRef.current}
            keepMounted
            open={open}
            onClose={() => setOpen(false)}
            getContentAnchorEl={null}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <MenuItem onClick={() => reportOnFib('spam')}>Report spam</MenuItem>
            <MenuItem onClick={() => reportOnFib('inappropiate')}>
              Report inappropiate
            </MenuItem>
            <MenuItem onClick={() => reportOnFib('other')}>
              Report other problems
            </MenuItem>
          </Menu>
        </CardActions>
      )}
    </Card>
  );
};

export default function Table({data, config, game, onComplete}) {
  const [seconds, setSeconds] = useState(0);
  const [indexVoted, setIndexVoted] = useState(-1);
  const [trueSeconds, setTrueSeconds] = useState(0);
  const [reveal, setReveal] = useState([]);
  const [fibs, setFibs] = useState([]);
  const [message, setMessage] = useState();
  const [gameState, setGameState] = useState(STARTING);
  // const [loading, setLoading] = useState(false);

  // useEffect(() =>
  //   Promise.all(data.map(
  //     ({scores, ...fib}, id) => saveFib({id: id.toString(), ...fib})
  //   )).then(results => console.log('Done')),
  //   [data]
  // );

  const kEvidenceSeconds = config.getNumber('kEvidenceSeconds');
  const kTotalVoteMinutes = config.getNumber('kTotalVoteMinutes');
  const kSecondsPenalty = config.getNumber('kSecondsPenalty');
  const kShowRevealButton = config.getBoolean('kShowRevealButton');

  useEffect(() => {
    setSeconds(0);
    setTrueSeconds(0);
    if (!game) return;
    // setLoading(true);
    setFibs([]);
    setGameState(STARTING);
    getFibs(game.split('_')).then(newFibs => {
      setFibs(newFibs);
      // setLoading(false);
      setReveal(newFibs.map(f => -1));
    });
  }, [game]);

  useEffect(() => {
    const tick = () => {
      if (gameState !== PLAYING) return;
      const newSeconds = seconds - 0.5;
      setTrueSeconds(s => s - 0.5);
      setSeconds(newSeconds);
      if (gameState === PLAYING && seconds < 0) {
        setGameState(TIMEOUT);
        setMessage({
          title: 'Ups. You run out of time!',
          content: `Remember to watch the clock. Which claim was more interesting?`,
        });
      }

      if (!kShowRevealButton && newSeconds % kEvidenceSeconds === 0) {
        setReveal(r => r.map(r => r + 1));
      }
    };
    const timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [seconds, gameState, kShowRevealButton, kEvidenceSeconds]);

  const incrementReveal = index => {
    const newReveal = reveal.concat();
    newReveal[index]++;
    setReveal(newReveal);
    setSeconds(seconds - kSecondsPenalty);
  };

  const voteOnFib = (fibs, index) => {
    setGameState(LOADING);
    setIndexVoted(index);
    castVote(fibs, index, seconds, trueSeconds, reveal).then(
      ({success, points}) => {
        if (success) {
          setGameState(DONE_RIGHT);
          setMessage({
            title: 'Good job!',
            content: `You found the false claim and got ${points} points! Which one was more interesting?`,
          });
        } else {
          setGameState(DONE_WRONG);
          setMessage({
            title: 'Sorry!',
            content: `That claim was actually correct. Which one was more interesting?`,
          });
        }
      }
    );
  };

  const reportOnFib = (fib, issue) => {
    setGameState(LOADING);
    reportFib(fib, issue).then(() => onComplete && onComplete(Result.REPORT));
  };

  const chooseInterestingFib = (goodFib, badFib) => {
    setMessage();
    setSeconds(0);
    setTrueSeconds(0);
    setReveal(fibs.map(f => -1));
    rateFibs(goodFib, badFib);
    if (onComplete)
      onComplete(gameState === DONE_RIGHT ? Result.RIGHT : Result.WRONG);
  };

  const instructions = `Time starts counting when you see the claims. Pay ${kSecondsPenalty} seconds to reveal hints to which one is false.`;

  const getHeader = () => {
    if (!game) return <div />;
    if (gameState === STARTING && !fibs.length) return <Loading />;
    if (gameState === STARTING || message)
      return (
        <>
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="textPrimary"
            gutterBottom
            style={styles.instructionsTitle}
          >
            {message ? message.title : 'Find the Fib'}
          </Typography>
          <Typography
            variant="h5"
            align="center"
            color="textSecondary"
            component="p"
          >
            {message ? message.content : instructions}
          </Typography>
          <Grid
            container
            spacing={2}
            justify="center"
            style={styles.startButton}
          >
            <Grid item>
              {message ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => chooseInterestingFib(fibs[0], fibs[1])}
                    startIcon={<ChevronLeft />}
                  >
                    {fibs[0].page}
                  </Button>
                  <Button
                    style={{margin: 10}}
                    variant="contained"
                    onClick={() => chooseInterestingFib()}
                  >
                    Not sure
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => chooseInterestingFib(fibs[1], fibs[0])}
                    endIcon={<ChevronRight />}
                  >
                    {fibs[1].page}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setReveal(r => r.map(a => 0));
                    setSeconds(kTotalVoteMinutes * 60);
                    setTrueSeconds(kTotalVoteMinutes * 60);
                    setGameState(PLAYING);
                  }}
                >
                  Show me the claims
                </Button>
              )}
            </Grid>
          </Grid>
        </>
      );
    return (
      <Typography
        component="h1"
        variant="h2"
        align="center"
        color="textPrimary"
        gutterBottom
      >
        <Timer seconds={seconds} totalMinutes={kTotalVoteMinutes} />
      </Typography>
    );
  };

  return (
    <>
      <Backdrop open={gameState === LOADING} style={{zIndex: 10000}}>
        <Loading />
      </Backdrop>
      <Container maxWidth="md">{getHeader(instructions)}</Container>
      <div style={styles.cards}>
        <Entities
          fibs={fibs}
          showSource={!!message}
          showClaims={gameState !== STARTING}
          votingDisabled={gameState !== PLAYING}
          voteOnFib={voteOnFib}
          indexVoted={indexVoted}
          reportOnFib={reportOnFib}
        />
        {gameState !== STARTING && (
          <Grid container spacing={1} style={{height: 'Calc(100% - 220px)'}}>
            {fibs.map((fib, index) => (
              <Grid
                item
                xs={12 / fibs.length}
                key={index}
                style={{height: '100%'}}
              >
                <Clues
                  disabled={seconds < kSecondsPenalty || gameState !== PLAYING}
                  fib={fib}
                  reveal={gameState === PLAYING ? reveal[index] : 999}
                  onReveal={() => incrementReveal(index)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </div>
    </>
  );
}
