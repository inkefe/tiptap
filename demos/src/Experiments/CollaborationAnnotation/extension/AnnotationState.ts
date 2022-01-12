import * as Y from 'yjs'
import { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { ySyncPluginKey, relativePositionToAbsolutePosition, absolutePositionToRelativePosition } from 'y-prosemirror'
import { AddAnnotationAction, DeleteAnnotationAction, UpdateAnnotationAction } from './collaboration-annotation'
import { AnnotationPluginKey } from './AnnotationPlugin'
import { AnnotationItem } from './AnnotationItem'

export interface AnnotationStateOptions {
  HTMLAttributes: {
    [key: string]: any
  },
  map: Y.Map<any>,
  instance: string,
  uid: string,
}

export class AnnotationState {
  options: AnnotationStateOptions

  decorations = DecorationSet.empty

  isCreateFail = false

  constructor(options: AnnotationStateOptions) {
    this.options = options
  }

  findAnnotation(id: string) {
    const current = this.decorations.find()

    for (let i = 0; i < current.length; i += 1) {
      if (current[i].spec.id === id) {
        return current[i]
      }
    }
  }

  addAnnotation(action: AddAnnotationAction, state: EditorState) {
    const ystate = ySyncPluginKey.getState(state)
    const { type, binding } = ystate

    console.log(ystate)
    const { map } = this.options
    const {
      from, to, data, id,
    } = action
    const absoluteFrom = absolutePositionToRelativePosition(from, type, binding.mapping)
    const absoluteTo = absolutePositionToRelativePosition(to, type, binding.mapping)

    console.log('id', id)
    map.set(id, {
      from: absoluteFrom,
      to: absoluteTo,
      data,
    })
  }

  updateAnnotation(action: UpdateAnnotationAction) {
    const { map } = this.options

    const annotation = map.get(action.id)

    console.log('UpdateAnnotationAction', action.id)

    map.set(action.id, {
      from: annotation.from,
      to: annotation.to,
      data: action,
    })
  }

  deleteAnnotation(id: string) {
    const { map } = this.options

    map.delete(id)
  }

  annotationsAt(position: number) {
    return this.decorations.find(position, position).map(decoration => {
      return new AnnotationItem(decoration)
    })
  }

  createDecorations(state: EditorState) {
    const { map, HTMLAttributes: _HTMLAttributes } = this.options
    const ystate = ySyncPluginKey.getState(state)
    const { doc, type, binding } = ystate

    if (!ystate.binding) {
      this.isCreateFail = true
      return console.warn(ystate)
    }
    this.isCreateFail = false
    const decorations: Decoration[] = []

    map.forEach((annotation, id) => {
      if (binding.mapping?.size === 0) { return }
      const from = relativePositionToAbsolutePosition(doc, type, annotation.from, binding.mapping)
      const to = relativePositionToAbsolutePosition(doc, type, annotation.to, binding.mapping)

      if (!from || !to) {
        return
      }
      const { data } = annotation.data
      const HTMLAttributes = {
        class: !data.uid || (+data.uid === +this.options.uid) ? _HTMLAttributes.class : '',
        'annotation-ids': id,
      }

      console.log(data, this.options.uid, _HTMLAttributes, !data.uid || (+data.uid === +this.options.uid))
      console.log(`[${this.options.instance}] Decoration.inline()`, from, to, annotation, { id, data: annotation.data })

      if (from === to) {
        console.warn(`[${this.options.instance}] corrupt decoration `, annotation.from, from, annotation.to, to)
      }

      decorations.push(
        Decoration.inline(from, to, HTMLAttributes, { id, data: annotation.data, inclusiveEnd: true }),
      )
    })

    this.decorations = DecorationSet.create(state.doc, decorations)
  }

  apply(transaction: Transaction, state: EditorState) {
    if (this.isCreateFail) {
      this.createDecorations(state)
      return this
    }
    // Add/Remove annotations
    const action = transaction.getMeta(AnnotationPluginKey) as AddAnnotationAction | UpdateAnnotationAction | DeleteAnnotationAction

    if (action && action.type) {
      // console.log(`[${this.options.instance}] action: ${action.type}`)

      if (action.type === 'addAnnotation') {
        this.addAnnotation(action, state)
      }

      if (action.type === 'updateAnnotation') {
        this.updateAnnotation(action)
      }

      if (action.type === 'deleteAnnotation') {
        this.deleteAnnotation(action.id)
      }

      // @ts-ignore
      if (action.type === 'createDecorations') {
        this.createDecorations(state)
      }

      return this
    }

    // Use Y.js to update positions
    const ystate = ySyncPluginKey.getState(state)

    if (ystate.isChangeOrigin) {
      // console.log(`[${this.options.instance}] isChangeOrigin: true → createDecorations`)
      this.createDecorations(state)

      return this
    }

    // Use ProseMirror to update positions
    // console.log(`[${this.options.instance}] isChangeOrigin: false → ProseMirror mapping`)
    this.decorations = this.decorations.map(transaction.mapping, transaction.doc)
    return this
  }
}
