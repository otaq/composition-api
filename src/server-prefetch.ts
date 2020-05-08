import {
  onServerPrefetch as onPrefetch,
  getCurrentInstance,
} from '@vue/composition-api'
import { ComponentInstance } from '@vue/composition-api/dist/component'

const ssrRefFunctions = new WeakMap<ComponentInstance, (() => void)[]>()
const isPending = new WeakMap<ComponentInstance, number>()

let noSetup: Array<() => any> = []

export function onServerPrefetch(cb: () => any) {
  const vm = getCurrentInstance()

  if (!vm) {
    noSetup.push(cb)
    return
  }

  const pending = isPending.get(vm) || 0

  isPending.set(vm, pending + 1)

  onPrefetch(async () => {
    await cb()

    const pending = isPending.get(vm) || 0

    if (pending <= 1) {
      const fn = ssrRefFunctions.get(vm) || []
      await Promise.all(fn.map(p => p()))
      await Promise.all(noSetup.map(p => p()))
      noSetup = []
    } else {
      isPending.set(vm, pending - 1)
    }
  })
}

export function onFinalServerPrefetch(cb: () => any) {
  if (!process.server) return

  const vm = getCurrentInstance()

  if (!vm) {
    noSetup.push(cb)
  } else {
    const fn = ssrRefFunctions.get(vm)

    if (!fn) {
      ssrRefFunctions.set(vm, [cb])
    } else {
      fn.push(cb)
    }
  }
}
