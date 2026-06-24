import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { useAuth } from '../AuthContext.jsx'
import { useRef } from 'react'

const API = import.meta.env.VITE_API_URL
const lowlight = createLowlight(common)

function Btn({ onClick, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-sm font-semibold border transition ${
        active ? 'bg-brand text-white border-brand' : 'bg-[#121823] text-[#cfd3d7] border-[#273141] hover:border-brand'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ value, onChange }) {
  const { token } = useAuth()
  const fileRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image,
      Link.configure({ openOnClick: false }),
      Youtube.configure({ width: 640, height: 360 }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  async function uploadFile(file) {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`${API}/api/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    const data = await r.json()
    if (!r.ok) { alert(data.error || 'Upload failed'); return null }
    return data.url
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = await uploadFile(file)
    if (!url) return
    if (file.type.startsWith('video/')) {
      editor.chain().focus().insertContent(
        `<video controls src="${url}" style="max-width:100%"></video>`
      ).run()
    } else {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  function addYoutube() {
    const url = prompt('YouTube URL')
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run()
  }

  function addLink() {
    const url = prompt('Link URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="border border-[#273141] rounded-lg overflow-hidden bg-[#121823]">
      {/* toolbar */}
      <div className="flex flex-wrap gap-1.5 p-2 border-b border-[#273141] bg-[#151a21]">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><i>i</i></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1. List</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>{'</>'}</Btn>
        <Btn onClick={addLink} active={editor.isActive('link')}>Link</Btn>
        <Btn onClick={() => fileRef.current?.click()}>Image/Video</Btn>
        <Btn onClick={addYoutube}>YouTube</Btn>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onPickFile} className="hidden" />
      </div>

      {/* editing surface */}
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_pre]:bg-[#0d1117] [&_pre]:p-3 [&_pre]:rounded-lg [&_img]:rounded-lg [&_video]:rounded-lg [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
      />
    </div>
  )
}