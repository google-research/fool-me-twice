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
import Button from '@material-ui/core/Button';
import MDialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function Dialog({
  open,
  title,
  loading,
  content,
  handleClose,
  handleConfirm,
}) {
  return (
    <MDialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title || ' '}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {content || ' '}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {handleConfirm && (
          <Button disabled={loading} onClick={handleClose}>
            Cancel
          </Button>
        )}
        <Button
          disabled={loading}
          onClick={handleConfirm || handleClose}
          color="primary"
          autoFocus
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </DialogActions>
    </MDialog>
  );
}
