declare module 'raf' {
  const raf: ((cb: FrameRequestCallback) => number) & { cancel: (id: number) => void }
  export = raf
}
