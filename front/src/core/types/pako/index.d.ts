declare module 'pako' {
    const pako: {
      deflate: (...args: unknown[]) => Uint8Array
      inflate: (...args: unknown[]) => Uint8Array
    }
    export default pako
  }