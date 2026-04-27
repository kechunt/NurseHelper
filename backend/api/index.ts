import type { IncomingMessage, ServerResponse } from 'http';
import app from '../src/app-test';
import { AppDataSource } from '../src/data-source';

let initPromise: Promise<void> | null = null;

async function ensureDatabaseInitialized(): Promise<void> {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = AppDataSource.initialize()
      .then(() => {
        console.log('✅ DB inicializada en función serverless');
      })
      .catch((error) => {
        initPromise = null;
        console.error('❌ Error inicializando DB en serverless:', error);
        throw error;
      });
  }

  await initPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ensureDatabaseInitialized();
  await (app as any)(req, res);
}
