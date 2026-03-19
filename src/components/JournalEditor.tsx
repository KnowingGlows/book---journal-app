"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const TOOLBAR_BTN = "rounded px-2 py-1 text-xs text-zinc-400 hover:bg-[#1a1a1e] hover:text-white transition-all";
const ACTIVE_BTN = "rounded px-2 py-1 text-xs bg-[#27272a] text-white transition-all";

export default function JournalEditor({ content, onChange, placeholder = "Start writing...", autoFocus = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] prose-invert",
      },
    },
    immediatelyRender: false,
  });

  // Sync external content changes (e.g. loading from Firestore)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  if (!editor) return null;

  const btn = (active: boolean) => (active ? ACTIVE_BTN : TOOLBAR_BTN);

  return (
    <div className="flex flex-1 flex-col mt-6 min-h-0">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-0.5 border-b border-[#1e1e22] pb-3">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }))}>H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>H3</button>
        <div className="mx-1.5 h-4 w-px bg-[#27272a]" />
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}><strong>B</strong></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}><em>I</em></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))}><s>S</s></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))}>{"<>"}</button>
        <div className="mx-1.5 h-4 w-px bg-[#27272a]" />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>• List</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>1. List</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>❝</button>
        <div className="mx-1.5 h-4 w-px bg-[#27272a]" />
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={TOOLBAR_BTN}>↩</button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={TOOLBAR_BTN}>↪</button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto text-[15px] leading-[1.75] text-zinc-200 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-zinc-100 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-violet-500 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-zinc-400 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_code]:bg-[#1a1a1e] [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-violet-300 [&_.ProseMirror_code]:text-sm [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-zinc-700 [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_strong]:text-white [&_.ProseMirror_em]:text-zinc-300"
      />
    </div>
  );
}
