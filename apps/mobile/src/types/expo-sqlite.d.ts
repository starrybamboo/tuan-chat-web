declare module "expo-sqlite" {
  export type SQLiteDatabase = {
    execAsync: (source: string) => Promise<void>;
    getAllAsync: <T = unknown>(source: string, ...params: unknown[]) => Promise<T[]>;
    runAsync: (source: string, ...params: unknown[]) => Promise<unknown>;
    withTransactionAsync?: (task: () => Promise<void>) => Promise<void>;
  };

  export function openDatabaseAsync(databaseName: string): Promise<SQLiteDatabase>;
}
