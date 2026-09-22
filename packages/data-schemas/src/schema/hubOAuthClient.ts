import { Schema, Document } from 'mongoose';

/**
 * A dynamically registered OAuth client (RFC 7591), scoped to the hub's own
 * authorization server. Claude.ai's custom-connector flow requires one of
 * these — its connector setup UI has no field for a pre-shared credential,
 * only OAuth — and it self-registers on first connect rather than an
 * operator configuring a client id anywhere.
 *
 * Deliberately no client secret: every registered client here is a public
 * client (a browser-based connector), authenticated at the token endpoint by
 * PKCE rather than a secret it could not keep confidential anyway.
 */
export interface IHubOAuthClient extends Document {
  clientId: string;
  clientName?: string;
  redirectUris: string[];
  createdAt: Date;
  tenantId?: string;
}

const hubOAuthClientSchema: Schema<IHubOAuthClient> = new Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  clientName: { type: String, maxlength: 200 },
  redirectUris: { type: [String], required: true, validate: (v: string[]) => v.length > 0 },
  createdAt: { type: Date, required: true, default: Date.now },
  tenantId: { type: String, index: true },
});

export default hubOAuthClientSchema;
