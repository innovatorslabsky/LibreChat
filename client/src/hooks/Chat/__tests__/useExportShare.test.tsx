import { renderHook, act } from '@testing-library/react';
import type * as t from '~/common';
import useExportShare from '../useExportShare';

let mockConversation: { conversationId?: string } | null = { conversationId: 'convo-1' };
let mockContextHubEnabled = false;
const mockArchiveMutate = jest.fn();
const mockShowToast = jest.fn();

jest.mock('recoil', () => ({
  useRecoilValue: () => mockConversation,
}));

jest.mock('librechat-data-provider/react-query', () => ({
  useGetSharedLinkQuery: () => ({ data: undefined }),
}));

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('~/hooks', () => ({
  useHasAccess: () => true,
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { contextHubEnabled: mockContextHubEnabled } }),
  useArchiveConversationToHubMutation: (options: {
    onSuccess?: () => void;
    onError?: () => void;
  }) => ({
    mutate: (conversationId: string) => mockArchiveMutate(conversationId, options),
    isLoading: false,
  }),
}));

jest.mock('~/components/Nav/ExportConversation/ExportModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/components/Conversations/ConvoOptions', () => ({
  ShareButton: () => null,
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: { conversationByIndex: () => ({}) },
}));

describe('useExportShare — context hub item', () => {
  beforeEach(() => {
    mockConversation = { conversationId: 'convo-1' };
    mockContextHubEnabled = false;
    mockArchiveMutate.mockClear();
    mockShowToast.mockClear();
  });

  const findHubItem = (items: t.MenuItemProps[]) =>
    items.find((item) => item.label === 'com_ui_context_hub_save');

  it('is absent when the operator has not enabled the context hub', () => {
    mockContextHubEnabled = false;
    const { result } = renderHook(() => useExportShare({ isSharedButtonEnabled: true }));

    const hubItem = findHubItem(result.current.items);
    expect(hubItem?.show).toBe(false);
  });

  it('is present once the context hub is enabled', () => {
    mockContextHubEnabled = true;
    const { result } = renderHook(() => useExportShare({ isSharedButtonEnabled: true }));

    const hubItem = findHubItem(result.current.items);
    expect(hubItem?.show).toBe(true);
  });

  it('archives the current conversation when clicked', () => {
    mockContextHubEnabled = true;
    const { result } = renderHook(() => useExportShare({ isSharedButtonEnabled: true }));
    const hubItem = findHubItem(result.current.items);

    act(() => {
      hubItem?.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    });

    expect(mockArchiveMutate).toHaveBeenCalledWith('convo-1', expect.any(Object));
  });

  it('does nothing when there is no conversation to archive', () => {
    mockConversation = null;
    mockContextHubEnabled = true;
    const { result } = renderHook(() => useExportShare({ isSharedButtonEnabled: true }));

    expect(result.current.show).toBe(false);
  });
});
