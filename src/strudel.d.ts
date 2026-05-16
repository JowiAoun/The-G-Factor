declare module '@strudel/web' {
  export function initStrudel(options?: {
    prebake?: () => Promise<unknown> | unknown;
  }): Promise<unknown> | unknown;
  const _default: unknown;
  export default _default;
}

declare module '@strudel/transpiler' {
  export function transpiler(
    code: string,
    options?: { wrapAsync?: boolean; addReturn?: boolean; simpleLocs?: boolean },
  ): unknown;
}

declare module '@strudel/core' {
  export function transpiler(
    code: string,
    options?: { wrapAsync?: boolean; addReturn?: boolean; simpleLocs?: boolean },
  ): unknown;
}
