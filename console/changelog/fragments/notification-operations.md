# Receipt-backed operation and notification foundations

- Added shared typed contracts for exact operation targets, affected data, capability availability, idempotency, deadlines, progress, cancellation, partial outcomes, retry, and observed terminal receipts.
- Added a renderer coordinator that refuses duplicate in-flight submissions and cannot report success without a matching observation receipt.
- Added durable notification history foundations with stable ids, deterministic stacking, quiet-hours presentation policy, warning and error persistence, distinct dismissal and deletion, bulk mutations, search, export projection, and persistence receipts.
- Restricted Undo to receipts that provide a real inverse operation or local history revision. Undo must run as a separate receipt-producing operation.

The selected path used to look temptingly successful before the far side answered. The new contracts ask the far side for a receipt first, because optimism is not an operational status.

而家唔會撳完掣就當成功，遠端真係交收據先算數。失敗、逾時、取消同部分完成各自企好，唔再一齊著綠色衫扮冇事。
