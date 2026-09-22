import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { ServerRequest } from '../types/http';
import type { UploadedFile } from './importRoute';
import { createContextHubImportHandler } from './importRoute';

function fakeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

async function writeTempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hub-import-route-test-'));
  const filepath = path.join(dir, 'export.json');
  await fs.writeFile(filepath, content, 'utf8');
  return filepath;
}

const claudeExport = [
  {
    uuid: 'c1',
    name: 'T',
    chat_messages: [{ uuid: 'm1', sender: 'human', content: [{ type: 'text', text: 'hi' }] }],
  },
];

describe('createContextHubImportHandler', () => {
  const methods = { upsertHubThread: jest.fn().mockResolvedValue(undefined) };
  const handler = createContextHubImportHandler({ methods });

  beforeEach(() => {
    methods.upsertHubThread.mockClear();
  });

  it('rejects with 404 when the hub is not enabled', async () => {
    const req = {
      user: { id: 'user-a' },
      config: undefined,
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(methods.upsertHubThread).not.toHaveBeenCalled();
  });

  it('does not require the MCP surface to be on, only the base toggle', async () => {
    const filepath = await writeTempFile(JSON.stringify(claudeExport));
    const req = {
      user: { id: 'user-a' },
      config: { contextHub: { enabled: true } },
      file: { path: filepath },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects with 401 when no user was resolved', async () => {
    const req = {
      config: { contextHub: { enabled: true } },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects with 400 when no file was uploaded', async () => {
    const req = {
      user: { id: 'user-a' },
      config: { contextHub: { enabled: true } },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'no_file' }) }),
    );
  });

  it('archives a valid upload and reports the thread count', async () => {
    const filepath = await writeTempFile(JSON.stringify(claudeExport));
    const req = {
      user: { id: 'user-a' },
      config: { contextHub: { enabled: true } },
      file: { path: filepath },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ threadCount: 1 }));
    expect(methods.upsertHubThread).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ id: 'claude:c1' }),
    );
  });

  it('reports an unrecognized export as 400 rather than 500', async () => {
    const filepath = await writeTempFile(JSON.stringify({ bogus: true }));
    const req = {
      user: { id: 'user-a' },
      config: { contextHub: { enabled: true } },
      file: { path: filepath },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'unsupported_export' }) }),
    );
  });

  it('reports malformed JSON as 400 rather than 500', async () => {
    const filepath = await writeTempFile('{not json');
    const req = {
      user: { id: 'user-a' },
      config: { contextHub: { enabled: true } },
      file: { path: filepath },
    } as unknown as ServerRequest & { file?: UploadedFile };
    const res = fakeRes();

    await handler(req, res as unknown as import('express').Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'invalid_json' }) }),
    );
  });
});
