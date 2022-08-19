import { Plugin, PluginKey } from 'prosemirror-state'
import * as Y from 'yjs'

import { AnnotationState } from './AnnotationState'
import { AnnotationItem } from './AnnotationItem'

export const AnnotationPluginKey = new PluginKey('annotation')
// console.log(AnnotationPluginKey)
export interface AnnotationPluginOptions {
  HTMLAttributes: {
    [key: string]: any
  },
  onUpdate: (items: [any?]) => {},
  map: Y.Map<any>,
  uid: string,
  instance: string,
}

export const AnnotationPlugin = (options: AnnotationPluginOptions) => new Plugin({
  key: AnnotationPluginKey,

  state: {
    init() {
      return new AnnotationState({
        HTMLAttributes: options.HTMLAttributes,
        map: options.map,
        instance: options.instance,
        uid: options.uid,
        onUpdate: options.onUpdate,
      })
    },
    apply(transaction, pluginState, oldState, newState) {
      return pluginState.apply(transaction, newState)
    },
  },

  props: {
    // handleClick(view, pos, event) {
    //   console.log('click', event.target)
    //   return true
    // },
    decorations(state) {
      const annotationState = this.getState(state)

      // console.log(state, annotationState)
      const { decorations } = annotationState
      const { selection } = state

      if (!selection.empty) {
        return decorations
      }

      // check
      // console.log(decorations, options.map)

      const annotations = this.getState(state).annotationsAt(selection.from).filter((an: AnnotationItem) => {
        if (selection.from === an.to || selection.from === an.from) { return false }
        return !an.data.data.uid || +an.data.data.uid === +options.uid
      })

      options.onUpdate(annotations)
      return decorations
    },
  },
})
