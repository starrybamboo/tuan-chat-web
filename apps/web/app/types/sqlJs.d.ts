declare module "sql.js" {
  export type SqlValue = number | string | Uint8Array | null;

  export type QueryExecResult = {
    columns: string[];
    values: SqlValue[][];
  };

  export type Database = {
    close: () => void;
    exec: (sql: string, params?: SqlValue[] | Record<string, SqlValue>) => QueryExecResult[];
    export: () => Uint8Array;
    run: (sql: string, params?: SqlValue[] | Record<string, SqlValue>) => Database;
  };

  export type SqlJsStatic = {
    Database: new (data?: Uint8Array) => Database;
  };

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
