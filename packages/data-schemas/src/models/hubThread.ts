import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import hubThreadSchema, { IHubThread } from '~/schema/hubThread';

export function createHubThreadModel(mongoose: typeof import('mongoose')): Model<IHubThread> {
  applyTenantIsolation(hubThreadSchema);
  return mongoose.models.HubThread || mongoose.model<IHubThread>('HubThread', hubThreadSchema);
}
