/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Astro locals for middleware
declare namespace App {
  interface Locals {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }
}

declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);
    query(sql: string): Statement;
    run(sql: string, ...params: any[]): void;
    exec(sql: string): void;
    close(): void;
  }
  export class Statement {
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }
}
