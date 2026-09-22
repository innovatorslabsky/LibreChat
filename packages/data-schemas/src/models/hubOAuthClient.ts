import { Model } from 'mongoose';
import hubOAuthClientSchema, { IHubOAuthClient } from '~/schema/hubOAuthClient';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';

export function createHubOAuthClientModel(
  mongoose: typeof import('mongoose'),
): Model<IHubOAuthClient> {
  applyTenantIsolation(hubOAuthClientSchema);
  return (
    mongoose.models.HubOAuthClient ||
    mongoose.model<IHubOAuthClient>('HubOAuthClient', hubOAuthClientSchema)
  );
}
