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

import React, {useRef, useState} from 'react';

import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import CardMedia from '@material-ui/core/CardMedia';
import CardHeader from '@material-ui/core/CardHeader';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';

import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';

import PlayIcon from '@material-ui/icons/PlayArrow';

export default function MediaCard({classes, src, title, content}) {
  const video = useRef();
  const smallVideo = useRef();
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <>
      <Dialog
        fullWidth={true}
        maxWidth="md"
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        aria-labelledby="fullscreen-video"
        aria-describedby="fullscreen-video"
      >
        <DialogContent>
          <video
            autoPlay
            controls
            ref={video}
            style={{width: '100%', marginBottom: 8}}
          >
            <source src={src} />
            Sorry, your browser doesn't support embedded videos.
          </video>
        </DialogContent>
      </Dialog>
      <Card className={classes.card}>
        <CardMedia controls component="video" src={src} ref={smallVideo} />
        <CardHeader
          disableTypography
          className={classes.cardHeader}
          title={
            <span>
              <PlayIcon style={{verticalAlign: 'bottom', marginRight: 5}} />
              {title}
            </span>
          }
        />
        <CardContent className={classes.cardContent}>{content}</CardContent>
        <CardActions className={classes.cardActions}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setFullscreen(true);
              smallVideo.current.pause();
            }}
          >
            Play
          </Button>
        </CardActions>
      </Card>
    </>
  );
}
