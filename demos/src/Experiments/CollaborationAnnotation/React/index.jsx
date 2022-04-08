import React, { Fragment } from 'react'
import { Editor, EditorContent } from '@tiptap/react'
// import { HocuspocusProvider } from '@hocuspocus/provider'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
// import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import CollaborationAnnotation from '../extension'
import { clearComment, activeComment } from './utils'
import * as Y from 'yjs'
import './styles.scss'

const tryCatchFunc = (fn, msg) => function (...args) {
  try {
    return typeof fn === 'function' && fn.apply(this, args)
  } catch (error) {
    console.warn(msg || '方法报错', error)
  }
}
// 解决draft-js跨行剪切报错

Node.prototype.removeChild = tryCatchFunc(Node.prototype.removeChild)

// const HOST = window.location.host.split(':')[0]
const ydoc = new Y.Doc()
// const provider = new HocuspocusProvider({
//   url: `ws://${HOST}:1234`,
//   // url: 'ws://192.168.98.31:10062',
//   parameters: {
//     // search params
//     key: 'write_B0sHbuV5xwYl6WzGjoqL',
//   },
//   name: 156,
//   document: ydoc,
// })

const currentUser = {
  name: 'yinran',
  color: '#7587eb',
  uid: window.location.search.split('=')[1] || 255,
}

function randomId() {
  // TODO: That seems … to simple.
  return Math.floor(Math.random() * 0xffffffff).toString()
}
// window.provider = provider

let index = 0

export default class ReactEditor extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      editor: null,
      activeId: null,
      comments: [],
    }
    window.ydoc = ydoc
  }

  componentDidMount() {
    const editor = new Editor({
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
        // CollaborationCursor.configure({
        //   provider,
        //   user: currentUser,
        // }),
        CollaborationAnnotation.configure({
          document: ydoc,
          onUpdate: this.onUpdate,
          instance: 'editor',
          uid: currentUser.uid,
        }),
      ],
    })

    editor.on('transaction', () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.forceUpdate()
        })
      })
    })
    window.editor = editor
    this.setState({ editor })
  }

  componentWillUnmount() {
    const { editor } = this.state

    editor.destroy()
  }

  onUpdate = items => {
    const { editor } = this.state

    // console.log(editor)
    if (window.timer) { return }
    window.timer = setTimeout(() => {
      window.timer = null
    }, 32)
    if (!items || items.length === 0) {
      this.setState({ activeId: null })
      clearComment()
      return this.setState({ comments: items })
    }
    const ids = items.map(item => item.id).join()

    if (this.preComments === ids) {
      if (index < items.length - 1) { index += 1 } else { index = 0 }
    } else { index = 0 }
    this.setState({ activeId: items[index].id })
    activeComment(items[index].id)
    this.preComments = ids
    this.setState({ comments: items })
  }

  addComment = () => {
    const { editor } = this.state
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

    window.sweetAlert.fire({
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
  }

  updateComment = id => {
    const { comments, editor } = this.state
    const comment = comments.find(item => {
      return id === item.id
    })

    console.log(comment)
    // const text = prompt('Comment', comment.data)
    window.sweetAlert.fire({
      input: 'textarea',
      inputLabel: 'Message',
      inputPlaceholder: 'Type your message here...',
      inputAttributes: {
        'aria-label': 'Type your message here',
        value: comment.data.data.text,
      },
      showCancelButton: true,
    }).then(({ value: text, isDismissed }) => {
      if (isDismissed || !text) {
        return
      }
      console.log('updateAnnotation', id)
      editor.commands.updateAnnotation(id, {
        text,
      })
    })
  }

  deleteComment = id => {
    const { editor } = this.state

    editor.commands.deleteAnnotation(id)
  }

  onClickComment = id => {
    this.setState({ activeId: id })
    activeComment(id)
  }

  render() {
    const { editor, activeId, comments } = this.state

    return <>
    <h2>
      Original Editor
    </h2>
    <button onClick={this.addComment} disabled={!editor?.can().addAnnotation()}>comment</button>
    { editor && <EditorContent editor={editor} /> }
    {
      comments.map(comment => (<Fragment key={comment.id}>
        <span style={{ color: activeId === comment.id ? 'red' : '' }}
          onClick={() => this.onClickComment(comment.id)}
        >{comment.data.data?.text}</span>

        <button onClick={() => this.updateComment(comment.id)}>
          update
        </button>

        <button onClick={() => this.deleteComment(comment.id)}>
          remove
        </button>
      </Fragment>
      ))
    }
    {
      activeId && <div>{activeId}</div>
    }
    {/* <h2>
      Another Editor
    </h2>
    <button onClick={addAnotherComment} disabled={!anotherEditor?.can().addAnnotation()}>
      comment
    </button>
    <EditorContent editor={anotherEditor} /> */}
  </>
  }
}
