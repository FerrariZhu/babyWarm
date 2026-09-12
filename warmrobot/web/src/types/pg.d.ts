declare module "pg" {
  export interface PoolClient {
    query<T = Record<string, unknown>>(
      query: string,
      values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>;
    release(): void;
  }

  export class Pool {
    constructor(options?: { connectionString?: string; max?: number; ssl?: { rejectUnauthorized: boolean } });
    query<T = Record<string, unknown>>(query: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
    connect(): Promise<PoolClient>;
  }
}
