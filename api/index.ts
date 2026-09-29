import type { IncomingMessage, ServerResponse } from "node:http";
import { app, bootApp } from "../server/index";

function waitForExpressResponse(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    if (res.writableEnded) {
      resolve();
      return;
    }

    const finish = () => resolve();
    res.once("finish", finish);
    res.once("close", finish);
    res.once("error", reject);

    try {
      app(req, res);
    } catch (error) {
      reject(error);
    }
  });
}

/** Vercel serverless entry. Does not listen; generation runs in `server/worker.ts`. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await bootApp();
  await waitForExpressResponse(req, res);
}
