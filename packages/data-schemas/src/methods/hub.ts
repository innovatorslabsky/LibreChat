import { Types } from 'mongoose';
import type {
  HubNoteInput,
  HubNoteRecord,
  HubThreadRecord,
  HubMessageRecord,
  HubDataDeleteResult,
  HubThreadSearchQuery,
  HubThreadSearchResult,
} from '~/types';
import type { IHubThread, IHubMessage } from '~/schema/hubThread';
import type { IHubNote } from '~/schema/hubNote';
import logger from '~/config/winston';

export interface HubMethods {
  upsertHubThread: (userId: string, thread: HubThreadRecord) => Promise<void>;
  getHubThread: (userId: string, id: string) => Promise<HubThreadRecord | null>;
  searchHubThreads: (
    userId: string,
    params: HubThreadSearchQuery,
  ) => Promise<HubThreadSearchResult[]>;
  listHubNotes: (userId: string, threadId?: string) => Promise<HubNoteRecord[]>;
  appendHubNote: (userId: string, note: HubNoteInput) => Promise<HubNoteRecord>;
  deleteAllHubData: (userId: string) => Promise<HubDataDeleteResult>;
}

function toObjectId(userId: string): Types.ObjectId {
  return new Types.ObjectId(userId);
}

function buildSearchText(thread: HubThreadRecord): string {
  const pieces = [thread.title];
  for (const message of thread.messages) {
    for (const segment of message.segments) {
      pieces.push(segment.text);
    }
  }
  return pieces.join('\n');
}

function toMessageRecord(message: IHubMessage): HubMessageRecord {
  return {
    id: message.id,
    role: message.role,
    createdAt: message.createdAt,
    segments: message.segments.map((segment) => ({
      kind: segment.kind,
      text: segment.text,
      language: segment.language,
      name: segment.name,
    })),
    parentId: message.parentId,
    model: message.model,
  };
}

function toThreadRecord(doc: IHubThread): HubThreadRecord {
  return {
    id: doc.id,
    provider: doc.provider,
    sourceId: doc.sourceId,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    messages: doc.messages.map(toMessageRecord),
  };
}

function toNoteRecord(doc: IHubNote): HubNoteRecord {
  return {
    id: (doc._id as Types.ObjectId).toString(),
    title: doc.title,
    text: doc.text,
    threadId: doc.threadId,
    createdAt: doc.createdAt,
  };
}

export function createHubMethods(mongoose: typeof import('mongoose')): HubMethods {
  async function upsertHubThread(userId: string, thread: HubThreadRecord): Promise<void> {
    const HubThread = mongoose.models.HubThread;
    try {
      await HubThread.updateOne(
        { userId: toObjectId(userId), id: thread.id },
        {
          $set: {
            userId: toObjectId(userId),
            id: thread.id,
            provider: thread.provider,
            sourceId: thread.sourceId,
            title: thread.title,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            messages: thread.messages,
            searchText: buildSearchText(thread),
            syncedAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      logger.error('[upsertHubThread] Error archiving thread:', error);
      throw error;
    }
  }

  async function getHubThread(userId: string, id: string): Promise<HubThreadRecord | null> {
    try {
      const HubThread = mongoose.models.HubThread;
      const doc = (await HubThread.findOne({
        userId: toObjectId(userId),
        id,
      }).lean()) as IHubThread | null;
      return doc ? toThreadRecord(doc) : null;
    } catch (error) {
      logger.error('[getHubThread] Error reading thread:', error);
      throw error;
    }
  }

  async function searchHubThreads(
    userId: string,
    params: HubThreadSearchQuery,
  ): Promise<HubThreadSearchResult[]> {
    const query = params.query.trim();
    if (query.length === 0) {
      return [];
    }
    try {
      const HubThread = mongoose.models.HubThread;
      const filter: Record<string, unknown> = {
        userId: toObjectId(userId),
        $text: { $search: query },
      };
      if (params.providers && params.providers.length > 0) {
        filter.provider = { $in: params.providers };
      }

      const docs = (await HubThread.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(params.limit)
        .lean()) as unknown as IHubThread[];

      return docs.map((doc) => ({
        id: doc.id,
        provider: doc.provider,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        messageCount: doc.messages.length,
        searchText: doc.searchText,
      }));
    } catch (error) {
      logger.error('[searchHubThreads] Error searching threads:', error);
      throw error;
    }
  }

  async function listHubNotes(userId: string, threadId?: string): Promise<HubNoteRecord[]> {
    try {
      const HubNote = mongoose.models.HubNote;
      const filter: Record<string, unknown> = { userId: toObjectId(userId) };
      if (threadId !== undefined) {
        filter.threadId = threadId;
      }
      const docs = (await HubNote.find(filter)
        .sort({ createdAt: 1 })
        .lean()) as unknown as IHubNote[];
      return docs.map(toNoteRecord);
    } catch (error) {
      logger.error('[listHubNotes] Error listing notes:', error);
      throw error;
    }
  }

  async function appendHubNote(userId: string, note: HubNoteInput): Promise<HubNoteRecord> {
    try {
      const HubNote = mongoose.models.HubNote;
      const doc = await HubNote.create({
        userId: toObjectId(userId),
        title: note.title,
        text: note.text,
        threadId: note.threadId,
      });
      return toNoteRecord(doc);
    } catch (error) {
      logger.error('[appendHubNote] Error appending note:', error);
      throw error;
    }
  }

  async function deleteAllHubData(userId: string): Promise<HubDataDeleteResult> {
    try {
      const HubThread = mongoose.models.HubThread;
      const HubNote = mongoose.models.HubNote;
      const [threads, notes] = await Promise.all([
        HubThread.deleteMany({ userId: toObjectId(userId) }),
        HubNote.deleteMany({ userId: toObjectId(userId) }),
      ]);
      return {
        deletedThreads: threads.deletedCount ?? 0,
        deletedNotes: notes.deletedCount ?? 0,
      };
    } catch (error) {
      logger.error('[deleteAllHubData] Error deleting hub data:', error);
      throw error;
    }
  }

  return {
    upsertHubThread,
    getHubThread,
    searchHubThreads,
    listHubNotes,
    appendHubNote,
    deleteAllHubData,
  };
}
