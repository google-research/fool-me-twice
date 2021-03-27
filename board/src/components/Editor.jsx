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
import csnlp from 'csnlp';
// import FuzzySet from 'fuzzyset.js';
import debounce from 'lodash.debounce';
import {HashLink as Link} from 'react-router-hash-link';

// import wrapper from './wrapper.js';
import Composer from './Composer.jsx';
import SmallTimer from './SmallTimer.jsx';
import Tutorial from './Tutorial.jsx';
import Dialog from './Dialog.jsx';
import WikiSource from './WikiSource.jsx';
import {getPage, getIndex, saveFib, Result} from '../config/server.js';

import Autocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
// import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Card from '@material-ui/core/Card';
import Switch from '@material-ui/core/Switch';

import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';

// import DoubleArrow from '@material-ui/icons/DoubleArrow';
import LinkIcon from '@material-ui/icons/Link';
import SaveIcon from '@material-ui/icons/Save';
import HelpIcon from '@material-ui/icons/HelpOutline';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';

var kMAX_RESULTS = 10;
var kMIN_HIGHLIGHT = 3;
var lunr = require('lunr');

// import TextArea from 'react-textarea-highlight';
// import highlightWithinTextarea from 'highlight-within-textarea';

function easyEvidence(results, golds) {
  let isEasy = false;
  for (const evidence of golds) {
    if (results && results[0] === evidence) isEasy = true;
  }
  return isEasy;
}

function findFirstDiffPos(a, b) {
  let i = 0;
  let lastPipe = 0;
  if (a === b) return -1;
  while (a[i] === b[i]) {
    if (a[i] === '|') lastPipe = i;
    i++;
  }
  if (i > 0) {
    return lastPipe + 1;
  } else {
    return 0;
  }
}

function ScrollButton({index, handleStateChange}) {
  const handleScrollUpdate = event => {
    event.preventDefault();
    handleStateChange(index);
  };

  // TODO: this styling seems hacky, how much of it is needed.
  return (
    <IconButton
      aria-label="Scroll to sentence"
      size="small"
      style={{padding: 5, right: 10, position: 'absolute'}}
      onClick={handleScrollUpdate}
    >
      <Link
        size="small"
        to={{hash: '#line' + index}}
        style={{color: 'inherit'}}
      >
        <LinkIcon size="small" />
      </Link>
    </IconButton>
  );
}

const RenderResult = ({index, doc, action, highlight, update, isEvidence}) => (
  <>
    <Card
      key={'card' + index}
      style={{backgroundColor: isEvidence && '#CFB87C'}}
      elevation={3}
    >
      {/*<CardHeader title={doc.name} action={action} />*/}
      <CardContent>
        <Highlighted text={doc.line} highlight={highlight} />
      </CardContent>
      <CardActions style={{position: 'relative'}}>
        <FormControlLabel
          control={
            <Switch
              checked={isEvidence}
              color="primary"
              onChange={e => update(doc.id, e)}
            ></Switch>
          }
          label={
            <>
              Gold evidence
              <Tooltip title="Mark the evidence that supports or rejects your claim. Players will see this as a last clue.">
                <HelpIcon style={{marginLeft: 5, fontSize: '1em'}} />
              </Tooltip>
            </>
          }
        />
        {action}
      </CardActions>
    </Card>
  </>
);

const Highlighted = ({text, highlight}) => {
  if (!highlight) {
    return <span>{text}</span>;
  }

  let index = 0;
  let matches = [];
  let parts = text.matchAll(highlight);
  let lastMatch = 0;
  let normalSpan;

  for (const match of parts) {
    let newEnd = match.index + match[0].length;
    normalSpan = text.substring(lastMatch, match.index);
    let matchSpan = text.substring(match.index, newEnd);

    if (normalSpan.length > 0) {
      matches.push(<span key={index}>{normalSpan}</span>);
      index += 1;
    }
    if (matchSpan.length > 0) {
      matches.push(<mark key={index}>{matchSpan}</mark>);
      index += 1;
    }
    lastMatch = newEnd;
  }
  if (lastMatch < text.length) {
    normalSpan = text.substring(lastMatch, text.length);
    matches.push(<span key={index}>{normalSpan}</span>);
  }
  return <span>{matches}</span>;
};

// function updateState(line, val) {
//   if (line === this.state.index) {
//     this.setState({selected: val});
//   }
//   console.log(
//     'Update scroll',
//     line,
//     this.state,
//     val
//   );
// }

const TocSource = ({title, link}) => {
  return (
    <Link to={{hash: '#line' + link}}>
      <span>
        {title}
        <br />
      </span>
    </Link>
  );
};

const RenderSource = ({title, index, par, selected, text, updateEvidence}) => {
  const color = selected ? '#f3eaaf' : undefined;
  if (title) {
    return (
      <span key={index}>
        <h2 key={'header' + index}>{title}</h2>
        <span
          style={color && {backgroundColor: color}}
          id={'line' + index}
          onClick={e => updateEvidence(index, e)}
        >
          {par && <br />}
          {par && <br />}
          {text}{' '}
        </span>
      </span>
    );
  } else {
    return (
      <span
        style={color && {backgroundColor: color}}
        onClick={e => updateEvidence(index, e)}
        id={'line' + index}
      >
        {par && <br />}
        {par && <br />}
        {text}{' '}
      </span>
    );
  }
};

export default class Editor extends React.Component {
  constructor(props) {
    super(props);

    const initVeracity =
      props.veracity !== undefined
        ? props.veracity.toString().toUpperCase()
        : 'NOTSET';

    this.state = {
      tutorialDone:
        !(props.veracity !== undefined) || !props.page || props.seenTutorial,
      finalDialog: false,
      index: null,
      sourceSent: -1,
      highlight: /bagel|potato/gi,
      query: '',
      loading: false,
      returnedDocs: '',
      collection: [],
      results: [],
      selected: -1,
      page: props.page || '',
      candidate: '',
      evidence: [],
      veracity: initVeracity || 'TRUE',
    };

    this.stopwords = require('stopword');
    this.handleStateChange = this.handleStateChange.bind(this);
    this.searchDebounced = debounce(this.search, 500);
  }

  componentDidMount() {
    const {page} = this.props;
    if (page) this.onChange(page);
  }

  componentWillUnmount() {
    this.searchDebounced.cancel();
  }

  updatePage = e => {
    console.log('Candidate is', this.state.candidate);
    this.setState({page: this.state.candidate});
    console.log('State is', this.state.page);
    getPage(this.state.page)
      .then(sentences => {
        this.setState({collection: sentences});
      })
      .catch(err => console.error(err));
    getIndex(this.state.page)
      .then(terms => {
        this.setState({index: lunr.Index.load(terms)});
      })
      .catch(err => console.error(err));
  };

  handleStateChange = index => {
    // updateState(this.state.sourceSent, false);
    // updateState(index, true);

    console.log('Editor SC', this.state.sourceSent, index);
    this.setState({sourceSent: index});
  };

  updateCandidate = (event, value) => {
    console.log('update candidate', value);
    this.setState({candidate: value, page: value});
    getIndex(value)
      .then(terms => {
        var lunrIndex = lunr.Index.load(terms);
        console.log('Got index', lunrIndex);
        this.setState({index: lunrIndex});
      })
      .catch(err => console.error(err));
    console.log('Collection is', this.state.collection);

    getPage(value)
      .then(doc => {
        console.log('Got doc', doc);
        this.setState({collection: doc['sentences']});
      })
      .catch(err => console.error(err));
    console.log('Collection is', this.state.collection);
  };

  updateEvidence = (line, event) => {
    const {evidence, collection, index, query} = this.state;

    console.log('Evidence', evidence);
    let newEvidence;

    if (evidence.includes(line)) {
      newEvidence = evidence.filter(item => item !== line);
    } else {
      newEvidence = evidence.concat([line]);
    }

    this.setState({evidence: newEvidence});

    console.log('Update evidence', line, newEvidence);

    this.searchDebounced(collection, index, query);
  };

  isContextual(text, page) {
    const tokens = csnlp.tokenizeTB(text.toLowerCase());
    if (!tokens.length) return false;
    if (['he', 'she', 'it'].indexOf(tokens[0]) >= 0) return true;
    const title = this.stopwords.removeStopwords(
      csnlp.tokenizeTB(page.toLowerCase())
    );
    if (!title.length) return false;
    return !title.some(token => tokens.indexOf(token) >= 0);
  }

  saveFib() {
    const {query, evidence, collection, veracity, results, page} = this.state;

    const fib = {
      claim: query,
      gold: evidence.map(index => collection[index]),
      evidence: results.map(index => collection[index]),
      veracity,
      page,
    };

    const {onComplete} = this.props;
    this.setState({loading: true});
    saveFib(fib).then(({id}) => onComplete && onComplete(Result.RIGHT, id));
  }

  render() {
    const {
      results,
      collection,
      page,
      loading,
      sourceSent,
      highlight,
      value,
      veracity,
      evidence,
      tutorialDone,
      finalDialog,
    } = this.state;
    const {onComplete, config} = this.props;
    const veracityControlled = this.props.veracity !== undefined;
    const loaded = page !== '' ? {display: 'none'} : {};
    let placeholder = undefined;
    if (page)
      placeholder = page
        ? `Write a ${veracity.toLowerCase()} statement about ${page}`
        : `Write a statement about ${page}`;

    let isEasy = easyEvidence(results, evidence);
    let hint = '';
    if (page && value && value !== page) {
      if (evidence.length > 2) hint = 'Choose 2 gold sentences at most';
      else if (!evidence.length) hint = 'Choose at least one gold sentence';
      else if (isEasy)
        hint =
          'Change the wording so that the gold evidence is not first search result';
      else if (this.isContextual(value, page))
        hint =
          'Make sure what you write makes sense without knowing the ' +
          'reference page. People, places or things should be mentioned ' +
          'explicitly. If that is the case, disregard this message.';
    }

    const kTotalWriteMinutes = config.getNumber('kTotalWriteMinutes');

    return (
      <>
        <Dialog
          open={finalDialog}
          title="Awesome! You'll get 100 points..."
          loading={loading}
          content="Other players will start seeing your statement and you will get more points for fooling them"
          handleClose={() => this.setState({finalDialog: false})}
          handleConfirm={() => this.saveFib()}
        />
        <Tutorial
          page={page}
          minutes={kTotalWriteMinutes}
          veracity={veracity}
          open={!tutorialDone}
          handleClose={() => this.setState({tutorialDone: true})}
        />
        <div className="app-container" style={{width: '38%'}}>
          <Paper
            elevation={1}
            style={{
              padding: 15,
              margin: 10,
              height: 'Calc(100vh - 85px)',
              flexFlow: 'column',
              display: 'flex',
            }}
          >
            <div>
              <Autocomplete
                options={['TODO: Get pages from server']}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Choose something to write a claim about..."
                    variant="outlined"
                    style={loaded}
                    fullWidth
                  />
                )}
                onChange={this.updateCandidate}
              />
              <Typography variant="h4" style={{marginBottom: 5}}>
                {onComplete && (
                  <IconButton onClick={() => onComplete(Result.CANCEL)}>
                    <ArrowBackIosIcon />
                  </IconButton>
                )}
                {page}
                <SmallTimer
                  total={kTotalWriteMinutes}
                  style={{float: 'right'}}
                  running={tutorialDone}
                />
              </Typography>
            </div>
            <Composer
              placeholder={placeholder}
              highlight={highlight}
              disabled={!page}
              onChange={value => this.onChange(value)}
            />
            <div style={{paddingTop: 10, textAlign: 'right'}}>
              {!veracityControlled && (
                <ButtonGroup
                  aria-label="claim truth status"
                  style={{marginRight: 10}}
                >
                  <Button
                    color={veracity === 'FALSE' ? 'primary' : undefined}
                    onClick={() => this.setState({veracity: 'FALSE'})}
                    disabled={!page || !value}
                  >
                    Fib
                  </Button>
                  <Button
                    color={veracity === 'TRUE' ? 'primary' : undefined}
                    onClick={() => this.setState({veracity: 'TRUE'})}
                    disabled={!page || !value}
                  >
                    Fact
                  </Button>
                </ButtonGroup>
              )}
              <Tooltip title="See the tutorial">
                <IconButton
                  onClick={() => this.setState({tutorialDone: false})}
                >
                  <HelpIcon />
                </IconButton>
              </Tooltip>
              <Button
                onClick={() =>
                  onComplete
                    ? this.setState({finalDialog: true})
                    : this.saveFib()
                }
                disabled={
                  !page ||
                  !value ||
                  value === page ||
                  veracity === 'NOTSET' ||
                  evidence.length > 2 ||
                  evidence.length < 1 ||
                  isEasy
                }
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
              >
                {veracityControlled ? `Save ${veracity} statement` : 'Save'}
              </Button>
              <div style={{color: '#f44336'}}>{hint}</div>
            </div>
            <Typography variant="h5" gutterBottom>
              Evidence ({this.state.evidence.length} marked as gold)
            </Typography>
            <div
              style={{
                overflowY: 'overlay',
                overflowX: 'hidden',
                flexGrow: 1,
              }}
            >
              <Results
                results={results}
                collection={collection}
                stateChange={this.handleStateChange}
                updateEvidence={this.updateEvidence}
                highlight={this.state.highlight}
                evidence={this.state.evidence}
              />
            </div>
          </Paper>
        </div>

        <div
          className="full-doc"
          id="fullDoc"
          style={{
            width: '60%',
            position: 'fixed',
            right: 10,
            top: 10,
            fontSize: 16,
            overflow: 'auto',
            marginTop: 60,
            height: 'Calc(100vh - 80px)',
          }}
        >
          <Source
            page={page}
            paragraphs={collection}
            selected={sourceSent}
            updateEvidence={this.updateEvidence}
          />
        </div>
      </>
    );
  }

  onChange(value) {
    const {index, collection, page} = this.state;
    if (this.state.value === value) return;
    this.setState({value, evidence: value ? this.state.evidence : []});
    if (!page) return;

    // Search if index and collection has been loaded
    if (collection.length > 0 && index) {
      this.searchDebounced(collection, index, value);
      return;
    } else {
      // Loading screen?
      Promise.all([getIndex(this.state.page), getPage(this.state.page)])
        .then(results => {
          const [terms, doc] = results;
          const index = lunr.Index.load(terms);
          const collection = doc.sentences;
          this.setState({index, collection});
          this.searchDebounced(collection, index, value);
        })
        .catch(console.error);
    }
  }

  search(collection, index, query) {
    // console.log(this.state.page);
    // console.log('Existing collection', collection);

    var findDocMatch = true;

    let overlap_matches = new Set([]);

    let punctuationless = query.replace(/[.,/#!$^&*;:{}=\-_`~()]/g, '');
    let finalString = punctuationless.replace(/\s{2,}/g, ' ');
    let results = index.search(finalString.trim()).slice(0, kMAX_RESULTS);
    let query_words = new Set(csnlp.tokenizeTB(finalString.toLowerCase()));

    var docIdString = results.map(res => res.ref).join();

    var overlap_array = [];
    if (findDocMatch) {
      for (const result of results) {
        // console.log('finding doc match', result);
        let doc = collection[result.ref];
        if (doc !== undefined) {
          let thisDoc = new Set(csnlp.tokenizeTB(doc.line.toLowerCase()));
          let intersection = [...query_words].filter(x => thisDoc.has(x));
          overlap_matches = [...intersection, ...overlap_matches];
        }
      }
      overlap_array = this.stopwords.removeStopwords(
        Array.from(new Set(overlap_matches))
      );
    } else {
      overlap_array = this.stopwords.removeStopwords(Array.from(query_words));
    }

    // console.log("Overlap array prefilter", overlap_array);

    overlap_array = overlap_array.map(x => x.replace(/\W/g, ''));
    overlap_array = overlap_array.filter(
      word => query_words.has(word) && word.length > kMIN_HIGHLIGHT
    );
    let regexp_highlight = '';
    if (overlap_array.length) {
      regexp_highlight = new RegExp(overlap_array.join('|'), 'gi');
    }
    // console.log(
    //   'New highlight',
    //   query_words,
    //   overlap_matches,
    //   overlap_array,
    //   regexp_highlight
    // );
    this.setState({
      highlight: regexp_highlight,
      query: query,
      returnedDocs: docIdString,
    });

    // Show evidence inline with rest of results
    const cardsToAdd = results
      .map(r => Number(r.ref))
      //.filter(lineIndex => !this.state.evidence.includes(lineIndex))
      .slice(0, kMAX_RESULTS);
    const missingEvidence = this.state.evidence.filter(
      index => !cardsToAdd.includes(index)
    );
    const cardsToShow = cardsToAdd.concat(missingEvidence);

    // console.log('Search results', this.state.evidence, cardsToShow);
    // console.log(overlap_matches, overlap_matches.size, regexp_highlight);

    this.setState({
      results: cardsToShow,
    });

    return cardsToShow;
  }
}

class Source extends React.Component {
  // paragraphs, selected, updateEvidence
  render() {
    const sources = [];
    const toc = [];
    const {paragraphs, selected, page} = this.props;
    let lastSection = '';

    toc.push(<h3 key="toc">Table of Contents</h3>);
    toc.push(
      <div key="source">
        <WikiSource page={page} />
      </div>
    );
    if (paragraphs.length > 0) {
      for (const [index, doc] of paragraphs.entries()) {
        let title = '';
        if (lastSection !== doc.name) {
          let diff = findFirstDiffPos(doc.name, lastSection);
          if (diff > 0) diff = diff - 1;
          title = doc.name.substring(diff, doc.name.length + 1);
          toc.push(
            <TocSource title={title} link={index} key={'TocSource' + index} />
          );
          lastSection = doc.name;
        }

        let text = doc.line;
        const found = selected === doc.id;

        sources.push(
          <RenderSource
            selected={found}
            key={'RenderSource' + index}
            index={index}
            text={text}
            updateEvidence={this.props.updateEvidence}
            par={doc.par}
            title={title}
          />
        );
      }
    }
    return toc.concat(sources);
  }
}

const Results = ({
  results,
  collection,
  stateChange,
  updateEvidence,
  highlight,
  evidence,
}) => {
  if (results.length) {
    var items = [];
    for (const [index, result] of results.entries()) {
      let doc = collection[result];

      if (collection.length > result) {
        items.push(
          <RenderResult
            index={'result' + index}
            key={'result' + index}
            doc={doc}
            action={
              <ScrollButton index={result} handleStateChange={stateChange} />
            }
            update={updateEvidence}
            highlight={highlight}
            isEvidence={evidence.includes(result)}
          />
        );
      }
    }
    items.push(
      <p key="last">
        <b>
          Don't see the gold evidence you're looking for? You can add it by
          clicking on the sentence in the Wikipedia page (right).
        </b>
      </p>
    );
    return items;
  } else {
    return <span>No results</span>;
  }
};

/*
function Wiki({ name }) {
  return (
    <div>
      {name ? (
        <h3>
          The <code>name</code> in the query string is &quot;{name}
          &quot;
        </h3>
      ) : (
        <h3>There is no name in the query string</h3>
      )}
    </div>
  );
}
*/
