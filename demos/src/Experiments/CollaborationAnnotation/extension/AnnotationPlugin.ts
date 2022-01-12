import * as Y from 'yjs'
import { Plugin, PluginKey } from 'prosemirror-state'
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
      })
    },
    apply(transaction, pluginState, oldState, newState) {
      return pluginState.apply(transaction, newState)
    },
  },

  props: {
    decorations(state) {
      const { decorations } = this.getState(state)
      const { selection } = state

      if (!selection.empty) {
        return decorations
      }

      const annotations = this
        .getState(state)
        .annotationsAt(selection.from).filter((an: AnnotationItem) => {
          return !an.data.data.uid || +an.data.data.uid === +options.uid
        })

      options.onUpdate(annotations)
      return decorations
    },
  },
})
