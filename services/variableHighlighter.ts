import { ViewPlugin, Decoration, MatchDecorator, DecorationSet } from '@codemirror/view';
import { EditorView } from '@codemirror/view';

export const variableHighlighter = (activeVariables: string[]) => {
    const decorator = new MatchDecorator({
        regexp: /\{\{(.+?)\}\}/g,
        decoration: (match) => {
            const varName = match[1];
            const isResolved = activeVariables.includes(varName);
            return Decoration.mark({
                class: isResolved ? 'cm-variable-resolved' : 'cm-variable-unresolved',
            });
        },
    });

    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            constructor(view: EditorView) {
                this.decorations = decorator.createDeco(view);
            }
            update(update: { docChanged: any; viewportChanged: any; view: EditorView; }) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = decorator.createDeco(update.view);
                }
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
};
