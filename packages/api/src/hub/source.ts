import type { HubThread, HubProvider } from './thread';

/**
 * The provider-specific surface the hub needs from one export format, and
 * nothing more. Ordering, compaction, rendering and storage are
 * provider-agnostic and depend only on this interface, so supporting a new
 * provider is a new adapter passed in by the caller rather than a new branch
 * in shared code.
 */
export interface ChatSource {
  readonly provider: HubProvider;
  /** True when this adapter recognizes an already-parsed export payload. */
  detect(payload: unknown): boolean;
  /** Called only after `detect` returned true for the same payload. */
  parse(payload: unknown): HubThread[];
}

export class UnknownExportError extends Error {
  constructor() {
    super('No configured chat source recognizes this export');
    this.name = 'UnknownExportError';
  }
}

export function selectSource(
  sources: readonly ChatSource[],
  payload: unknown,
): ChatSource | undefined {
  for (const source of sources) {
    if (source.detect(payload)) {
      return source;
    }
  }
  return undefined;
}

export function parseExport(sources: readonly ChatSource[], payload: unknown): HubThread[] {
  const source = selectSource(sources, payload);
  if (!source) {
    throw new UnknownExportError();
  }
  return source.parse(payload);
}
