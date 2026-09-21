import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import hubNoteSchema, { IHubNote } from '~/schema/hubNote';

export function createHubNoteModel(mongoose: typeof import('mongoose')): Model<IHubNote> {
  applyTenantIsolation(hubNoteSchema);
  return mongoose.models.HubNote || mongoose.model<IHubNote>('HubNote', hubNoteSchema);
}
