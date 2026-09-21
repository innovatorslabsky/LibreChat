import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHubNote extends Document {
  userId: Types.ObjectId;
  title: string;
  text: string;
  /** Canonical hub thread id (`${provider}:${sourceId}`) this note is about, if any. */
  threadId?: string;
  createdAt: Date;
  tenantId?: string;
}

const hubNoteSchema: Schema<IHubNote> = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  text: { type: String, required: true },
  threadId: { type: String, index: true },
  createdAt: { type: Date, required: true, default: Date.now },
  tenantId: { type: String, index: true },
});

hubNoteSchema.index({ userId: 1, threadId: 1, createdAt: 1 });

export default hubNoteSchema;
