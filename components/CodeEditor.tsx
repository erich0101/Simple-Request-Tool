
import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { okaidia } from '@uiw/codemirror-theme-okaidia';
import { EditorView } from '@codemirror/view';

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language: 'json' | 'javascript' | 'text';
    readOnly?: boolean;
    wrapLines?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, readOnly = false, wrapLines = false }) => {
    const extensions = [];
    if (language === 'javascript') {
        extensions.push(javascript({ jsx: true, typescript: true }));
    } else if (language === 'json') {
        extensions.push(json());
    }

    if (wrapLines) {
        extensions.push(EditorView.lineWrapping);
    }

    return (
        <CodeMirror
            value={value}
            height="100%"
            theme={okaidia}
            extensions={extensions}
            onChange={onChange}
            readOnly={readOnly}
            className="h-full"
            style={{height: '100%'}}
        />
    );
};

export default CodeEditor;