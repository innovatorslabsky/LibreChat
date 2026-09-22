import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { runHubImportJob, HubImportFileTooLargeError } from './importJob';

const claudeExport = [
  {
    uuid: 'c1',
    name: 'Designing the hub',
    chat_messages: [{ uuid: 'm1', sender: 'human', content: [{ type: 'text', text: 'hello' }] }],
  },
];

async function writeTempFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hub-import-test-'));
  const filepath = path.join(dir, 'export.json');
  await fs.writeFile(filepath, content, 'utf8');
  return filepath;
}

describe('runHubImportJob', () => {
  it('archives every thread the file contains and deletes the temp file', async () => {
    const filepath = await writeTempFile(JSON.stringify(claudeExport));
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);

    const result = await runHubImportJob({
      filepath,
      userId: 'user-a',
      methods: { upsertHubThread },
    });

    expect(result.threadCount).toBe(1);
    expect(upsertHubThread).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ id: 'claude:c1' }),
    );
    await expect(fs.access(filepath)).rejects.toThrow();
  });

  it('deletes the temp file even when the export is unrecognized', async () => {
    const filepath = await writeTempFile(JSON.stringify({ bogus: true }));
    const upsertHubThread = jest.fn();

    await expect(
      runHubImportJob({ filepath, userId: 'user-a', methods: { upsertHubThread } }),
    ).rejects.toThrow();
    expect(upsertHubThread).not.toHaveBeenCalled();
    await expect(fs.access(filepath)).rejects.toThrow();
  });

  it('deletes the temp file even when the JSON is malformed', async () => {
    const filepath = await writeTempFile('{not json');
    const upsertHubThread = jest.fn();

    await expect(
      runHubImportJob({ filepath, userId: 'user-a', methods: { upsertHubThread } }),
    ).rejects.toThrow(SyntaxError);
    await expect(fs.access(filepath)).rejects.toThrow();
  });

  it('rejects a file over the configured size ceiling without reading its contents', async () => {
    const filepath = await writeTempFile(JSON.stringify(claudeExport));
    const upsertHubThread = jest.fn();

    await expect(
      runHubImportJob({ filepath, userId: 'user-a', methods: { upsertHubThread }, maxFileSize: 1 }),
    ).rejects.toThrow(HubImportFileTooLargeError);
    expect(upsertHubThread).not.toHaveBeenCalled();
  });
});
