import type { IncomingMessage, ServerResponse } from 'http';
import app from '../src/app-test';
import { AppDataSource } from '../src/data-source';
import { logger } from '../src/utils/logger';

let initPromise: Promise<void> | null = null;

async function ensureDatabaseInitialized(): Promise<void> {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(() => {
        logger.info('✅ DB inicializada en función serverless');
      })
      .catch((error) => {
        initPromise = null;
        logger.error('❌ Error inicializando DB en serverless:', error);
        throw error;
      });
  }

  await initPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ensureDatabaseInitialized();
  await (app as any)(req, res);
}
