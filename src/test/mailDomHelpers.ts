import { screen, fireEvent, act } from '@testing-library/react';

// DOM 操作を伴うヘルパーは mailTestHelpers とは別モジュールに置く。
// mailTestHelpers は vi.mock の factory 内から動的 import されるため、
// そこに @testing-library/react を持ち込まないようにするのが狙い。

// 検索は入力ではなく Enter(form の submit)で確定し、結果はサーバー往復の後に届く。
// act で包んで、submit 起点の transition が解決してから戻る。
export async function submitSearch(query: string): Promise<void> {
  const input = screen.getByPlaceholderText('Search mail...');
  fireEvent.change(input, { target: { value: query } });
  const form = input.closest('form');
  if (!form) throw new Error('検索入力が form に包まれていません');
  await act(async () => {
    fireEvent.submit(form);
  });
}

// ✕ による検索解除。submitSearch と同じく、確定に伴う再取得が解決してから戻る。
export async function clearSearch(): Promise<void> {
  const clearBtn = screen.getByRole('button', { name: /Clear search/i });
  await act(async () => {
    fireEvent.click(clearBtn);
  });
}
