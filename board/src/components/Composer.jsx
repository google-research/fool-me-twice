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

import React, {useState, useRef, useEffect, useMemo} from 'react';
// import Editor, { createEditorStateWithText } from 'draft-js-plugins-editor';
import {Editor, EditorState, CompositeDecorator} from 'draft-js';
import 'draft-js/dist/Draft.css';
import createHighlightPlugin from './draft-js-highlight-plugin.js';

export default function Composer({highlight, onChange, disabled, placeholder}) {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [hasFocus, setFocus] = useState(false);
  const editor = useRef();

  const focusEditor = () => {
    if (disabled || hasFocus) return;
    editor.current.focus();
    setFocus(true);
  };

  const onChangeEditorState = editorState => {
    setEditorState(editorState);
    onChange(editorState.getCurrentContent().getPlainText());
  };

  const borderColor = hasFocus && !disabled ? '#3f51b5' : 'rgba(0, 0, 0, 0.26)';
  const decorator = useMemo(
    () => new CompositeDecorator(createHighlightPlugin({highlight}).decorators),
    [highlight]
  );

  useEffect(() => setEditorState(e => EditorState.set(e, {decorator})), [
    decorator,
  ]);

  return (
    <div
      style={{
        borderWidth: 'thin',
        borderStyle: 'solid',
        height: '10em',
        minHeight: '10em',
        overflowY: 'scroll',
        borderColor,
      }}
      onClick={focusEditor}
      className="MuiFormControl-root MuiTextField-root MuiFormControl-fullWidth"
    >
      <div className="MuiInputBase-root MuiOutlinedInput-root MuiInputBase-fullWidth MuiInputBase-formControl MuiInputBase-multiline MuiOutlinedInput-multiline">
        <Editor
          spellCheck
          ref={editor}
          readOnly={disabled}
          placeholder={placeholder}
          editorState={editorState}
          onBlur={() => setFocus(false)}
          onFocus={() => setFocus(true)}
          onChange={onChangeEditorState}
        />
      </div>
    </div>
  );
}
