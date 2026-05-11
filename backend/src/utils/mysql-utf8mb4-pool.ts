import type { DataSource } from 'typeorm';

/**
 * mysql2 + TypeORM: asegura UTF-8 completo en cada conexión del pool.
 * Sin esto, con servidor/cliente en latin1 por defecto, tildes y ñ pueden leerse como "??".
 */
export function hookMysqlPoolSetNamesUtf8Mb4(dataSource: DataSource): void {
  const driver = dataSource.driver as unknown as {
    pool?: { on?: (ev: string, fn: (conn: MysqlPoolConnection) => void) => void };
    master?: { pool?: { on?: (ev: string, fn: (conn: MysqlPoolConnection) => void) => void } };
  };

  const pools: Array<{ on?: (ev: string, fn: (conn: MysqlPoolConnection) => void) => void }> = [];
  if (typeof driver.pool?.on === 'function') {
    pools.push(driver.pool);
  }
  if (typeof driver.master?.pool?.on === 'function') {
    pools.push(driver.master.pool);
  }

  const sql = 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci';

  const runSetNames = (conn: MysqlPoolConnection): void => {
    try {
      if (typeof conn.query === 'function') {
        conn.query(sql, () => undefined);
        return;
      }
      const maybePromise = conn as unknown as { promise?: () => { query: (q: string) => Promise<unknown> } };
      if (typeof maybePromise.promise === 'function') {
        void maybePromise.promise().query(sql).catch(() => undefined);
      }
    } catch {
      // noop
    }
  };

  for (const pool of pools) {
    pool.on?.('connection', (conn: MysqlPoolConnection) => {
      runSetNames(conn);
    });
  }
}

type MysqlPoolConnection = {
  query?: (sql: string, cb: (err?: unknown) => void) => void;
};
