import { useState } from 'react';
import { Input, Label, InfoHoverCard } from '@librechat/client';
import { contextHubMcpEndpoint } from 'librechat-data-provider';
import CopyButton from '~/components/Messages/Content/CopyButton';
import { useLocalize, useCopyToClipboard } from '~/hooks';

/**
 * Shown above the key list only when the operator has turned the context
 * hub on. The endpoint is not secret — pairing it with one of the keys
 * below is what a client (Claude Code's `.mcp.json`, a Claude.ai custom
 * connector) needs to reach the hub.
 */
export default function ContextHubEndpoint() {
  const localize = useLocalize();
  const [isCopied, setIsCopied] = useState(false);
  const endpoint = contextHubMcpEndpoint();
  const copyToClipboard = useCopyToClipboard({ text: endpoint });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="context-hub-endpoint">{localize('com_ui_context_hub_endpoint')}</Label>
        <InfoHoverCard text={localize('com_ui_context_hub_endpoint_description')} />
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="context-hub-endpoint"
          readOnly
          value={endpoint}
          className="font-mono text-sm"
          aria-label={localize('com_ui_context_hub_endpoint')}
        />
        <CopyButton isCopied={isCopied} onClick={() => copyToClipboard(setIsCopied)} />
      </div>
    </div>
  );
}
