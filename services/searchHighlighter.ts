import { ViewPlugin, Decoration, MatchDecorator, DecorationSet, ViewUpdate, EditorView } from '@codemirror/view';

// Function to escape special regex characters
const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const searchHighlighter = (searchQuery: string) => {
    if (!searchQuery) {
        return [];
    }

    const decorator = new MatchDecorator({
        regexp: new RegExp(escapeRegExp(searchQuery), 'gi'),
        decoration: Decoration.mark({ class: 'cm-search-match' }),
    });

    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = decorator.createDeco(view);
            }

            update(update: ViewUpdate) {
                // The plugin is re-created by React when the searchQuery prop changes,
                // which constructs a new decorator. We only need to update for
                // document or viewport changes within the same plugin instance.
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
