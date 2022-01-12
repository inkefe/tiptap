import React, { Fragment, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import CollaborationAnnotation from '../extension'
import * as Y from 'yjs'
import './styles.scss'

const ydoc = new Y.Doc()
const provider = new HocuspocusProvider({
  // url: 'wss://connect.hocuspocus.cloud',
  url: 'ws://192.168.98.31:10062',
  parameters: {
    // search params
    key: 'write_B0sHbuV5xwYl6WzGjoqL',
  },
  name: 156,
  document: ydoc,
})

const currentUser = {
  name: 'yinran',
  color: '#7587eb',
  uid: window.location.search.split('=')[1] || 255,
}

function randomId() {
  // TODO: That seems … to simple.
  return Math.floor(Math.random() * 0xffffffff).toString()
}
window.provider = provider
export default () => {
  const [comments, setComments] = React.useState([])
  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({
        gapcursor: false,
        dropcursor: false,
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: currentUser,
      }),
      CollaborationAnnotation.configure({
        document: ydoc,
        onUpdate: items => setComments(items),
        instance: 'editor',
        uid: currentUser.uid,
      }),
    ],
    // content: `
    //   <p>
    //     Annotations can be used to add additional information to the content, for example comments. They live on a different level than the actual editor content.
    //   </p>
    //   <p>
    //     This example allows you to add plain text, but you’re free to add more complex data, for example JSON from another tiptap instance. :-)
    //   </p>
    // `,
  })

  window.editor = editor
  // const anotherEditor = useEditor({
  //   extensions: [
  //     StarterKit.configure({
  //       gapcursor: false,
  //       dropcursor: false,
  //       history: false,
  //     }),
  //     CollaborationAnnotation.configure({
  //       document: ydoc,
  //       instance: 'editor2',
  //     }),
  //     Collaboration.configure({
  //       document: ydoc,
  //     }),
  //   ],
  // })

  const addComment = useCallback(() => {
    const { selection: { from, to } } = editor.state
    const id = randomId()

    console.log('randomId', id)

    editor.commands.addAnnotation({
      from,
      to,
      id,
      data: {
        uid: currentUser.uid,
      },
    })

    window.Swal.fire({
      input: 'textarea',
      inputLabel: 'Message',
      inputPlaceholder: 'Type your message here...',
      inputAttributes: {
        'aria-label': 'Type your message here',
      },
      showCancelButton: true,
    }).then(({ value: text, isDismissed }) => {
      if (isDismissed || !text) {
        return editor.commands.deleteAnnotation(id)
      }
      console.log('updateAnnotation', id)
      editor.commands.updateAnnotation(id, {
        text,
      })
    })

  }, [editor, currentUser])

  const updateComment = useCallback(id => {
    const comment = comments.find(item => {
      return id === item.id
    })
    const text = prompt('Comment', comment.data)

    editor.commands.updateAnnotation(id, { text })
  }, [editor, comments])

  const deleteComment = useCallback(id => {
    editor.commands.deleteAnnotation(id)
  }, [editor])

  // const addAnotherComment = useCallback(() => {
  //   const data = prompt('Comment', '')

  //   anotherEditor.commands.addAnnotation(data)
  // }, [anotherEditor])

  return (
    <>
      <h2>
        Original Editor
      </h2>
      <button onClick={addComment} disabled={!editor?.can().addAnnotation()}>comment</button>
      <EditorContent editor={editor} />
      {
        comments.map(comment => (<Fragment key={comment.id}>
          {comment.data.data?.text}

          <button onClick={() => updateComment(comment.id)}>
            update
          </button>

          <button onClick={() => deleteComment(comment.id)}>
            remove
          </button>
        </Fragment>
        ))
      }
      {/* <h2>
        Another Editor
      </h2>
      <button onClick={addAnotherComment} disabled={!anotherEditor?.can().addAnnotation()}>
        comment
      </button>
      <EditorContent editor={anotherEditor} /> */}
    </>
  )
}
