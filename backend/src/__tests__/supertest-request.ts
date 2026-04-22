import request, { Test } from 'supertest';
import type { Application } from 'express';

type HttpVerb = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Llama al método HTTP correcto de supertest sin indexación dinámica (tipado estricto).
 */
export function requestByMethod(app: Application, method: string, path: string): Test {
  const verb = method.toLowerCase() as HttpVerb;
  const agent = request(app);
  switch (verb) {
    case 'get':
      return agent.get(path);
    case 'post':
      return agent.post(path);
    case 'put':
      return agent.put(path);
    case 'patch':
      return agent.patch(path);
    case 'delete':
      return agent.delete(path);
    default:
      throw new Error(`Método HTTP no soportado en tests: ${method}`);
  }
}
