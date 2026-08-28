// @types/node@20 には node:sqlite (Node 22 の experimental API) の型が無いため、
// テストで使う最小限だけをここで宣言する。@types/node を 22 以降に上げたら削除して良い。
declare module "node:sqlite" {
  class StatementSync {
    all(...params: unknown[]): unknown[]
    get(...params: unknown[]): unknown
    run(...params: unknown[]): unknown
  }
  export class DatabaseSync {
    constructor(path: string)
    exec(sql: string): void
    prepare(sql: string): StatementSync
    close(): void
  }
}
