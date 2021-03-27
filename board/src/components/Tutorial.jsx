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
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import MobileStepper from '@material-ui/core/MobileStepper';

export default function Tutorial({open, page, veracity, handleClose, minutes}) {
  const [step, setStep] = useState(0);
  const reset = () => {
    setStep(0);
    handleClose();
  };
  const title = [
    'Check-out the article',
    'Write something',
    'Take a look at the evidence',
    'Mark the Gold Evidence',
    'Ready, steady, go!',
  ];
  const content = [
    <>
      This is the Wikipedia page for <b>{page}</b>. You'll write a claim based
      on the information in this page. You can skim the article (by clicking on
      the links in the table of contents) to get inspired by an interesting or
      surprising fact.
    </>,
    <>
      Using the information, write a <b>{veracity}</b> claim about <b>{page}</b>
      . As you type (don't just copy/paste, as that will make it too easy),
      you'll see which sentences from Wikipedia are similar (matching words will
      be highlighted).
    </>,
    <>
      Individual sentences will show up here. Your goal is to tweak the claim
      that you write so that the claim is still natural, clear, and well
      written, <b>but</b> the evidence that proves or disproves the claim isn't
      at the top of the list.
      {/*Words that overlap between the claim and the evidence sentence are highlighted.*/}
    </>,
    <>
      Choose at least one <b>Gold Evidence</b>, a sentence that when someone
      sees it, they will know immediately whether your claim is true or false.
      You can see the context for a sentence in the page by clicking on the
      anchor icon.
    </>,
    <>
      You'll have <b>{minutes}</b> minutes to write something, Remember that
      done is better than perfect!
    </>,
  ];
  const classes = [
    'backdrop-right',
    'backdrop-topleft',
    'backdrop-bottomleft',
    'backdrop-bottomleft-small',
    'backdrop-topleft-small',
  ];
  const isLastStep = step === title.length - 1;
  return (
    <Dialog
      classes={{root: classes[step]}}
      open={open}
      onClose={reset}
      aria-labelledby="tutorial-dialog-title"
      aria-describedby="tutorial-dialog-description"
      disableBackdropClick={true}
    >
      <DialogTitle id="alert-dialog-title">{title[step]}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {content[step]}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <MobileStepper
          style={{flexGrow: 1}}
          variant="dots"
          steps={title.length}
          position="static"
          activeStep={step}
          nextButton={
            <Button
              size="small"
              onClick={() => (isLastStep ? reset() : setStep(step + 1))}
            >
              {isLastStep ? 'Done' : 'Next'}
              <KeyboardArrowRight />
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <KeyboardArrowLeft />
              Back
            </Button>
          }
        />
      </DialogActions>
    </Dialog>
  );
}
