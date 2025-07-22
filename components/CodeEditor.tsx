import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { okaidia } from '@uiw/codemirror-theme-okaidia';
import { EditorView } from '@codemirror/view';
import { variableHighlighter } from '../services/variableHighlighter';
import { EditorState } from '@codemirror/state';

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language: 'json' | 'javascript' | 'text';
    readOnly?: boolean;
    wrapLines?: boolean;
    activeVariables?: string[];
    singleLine?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, readOnly = false, wrapLines = false, activeVariables, singleLine = false }) => {
    const extensions = [];
    if (language === 'javascript') {
        extensions.push(javascript({ jsx: true, typescript: true }));
    } else if (language === 'json') {
        extensions.push(json());
    }

    if (wrapLines) {
        extensions.push(EditorView.lineWrapping);
    }
    
    if (activeVariables) {
        extensions.push(variableHighlighter(activeVariables));
    }

    if (singleLine) {
        // This makes it behave like a single line input by preventing new lines
        extensions.push(EditorState.transactionFilter.of(tr => tr.newDoc.lines > 1 ? [] : [tr]));
    }
    
    const editor = (
        <CodeMirror
            value={value}
            height="100%"
            theme={okaidia}
            extensions={extensions}
            onChange={onChange}
            readOnly={readOnly}
            className="h-full"
            style={{height: '100%'}}
            basicSetup={{
                lineNumbers: !singleLine,
                foldGutter: !singleLine,
                highlightActiveLine: !singleLine,
                highlightActiveLineGutter: !singleLine,
                autocompletion: !singleLine,
                searchKeymap: !singleLine,
            }}
        />
    );
    
    if (singleLine) {
        return <div className="url-editor-wrapper">{editor}</div>
    }
    
    return editor;
};

export default CodeEditor;
