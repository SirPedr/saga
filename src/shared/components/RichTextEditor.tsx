import { useEffect } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from 'lucide-react'
import { Toggle } from '#/components/ui/toggle'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
}

const toolbarToggleClass =
  'data-[state=on]:bg-primary/15 data-[state=on]:text-primary'

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }: { editor: Editor }) => ({
      isBold: e.isActive('bold'),
      isItalic: e.isActive('italic'),
      isH2: e.isActive('heading', { level: 2 }),
      isH3: e.isActive('heading', { level: 3 }),
      isBulletList: e.isActive('bulletList'),
      isOrderedList: e.isActive('orderedList'),
    }),
  })

  return (
    <div
      className="flex items-center gap-1 border-b border-border bg-vellum-2 p-1"
      role="toolbar"
      aria-label="Text formatting"
    >
      <Toggle
        size="sm"
        pressed={state.isBold}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
        className={toolbarToggleClass}
      >
        <Bold className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isItalic}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        className={toolbarToggleClass}
      >
        <Italic className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={state.isH2}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Heading 2"
        className={toolbarToggleClass}
      >
        <Heading2 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isH3}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Heading 3"
        className={toolbarToggleClass}
      >
        <Heading3 className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={state.isBulletList}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
        className={toolbarToggleClass}
      >
        <List className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isOrderedList}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Ordered list"
        className={toolbarToggleClass}
      >
        <ListOrdered className="size-4" />
      </Toggle>
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder: placeholderText,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholderText,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
  })

  // Sync external value changes into the editor
  useEffect(() => {
     
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  // Sync disabled state
  useEffect(() => {
     
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  return (
    <div
      className={cn(
        'border border-border bg-card',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
      />
    </div>
  )
}
