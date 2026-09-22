# Void Transaction Integration Notes

## Changes Needed in ViewRiwayat.jsx

The following changes are required to integrate void transaction feature:

1. Add `voidProps = {}` parameter after `toggleSort` 
2. Add helper function: `const openVoidModal = (id) => voidProps.openVoidModal?.(id);`
3. Modify delete button:

```jsx
{canDelete && <button onClick={handleVoidOrDelete(t)} style={{ background: "none", border: "none", cursor: "pointer", color: t.status === "voided" ? "#ccc" : "#4b4b4b", fontSize: 24, padding: 0 }}>
  {t.status === "voided" ? "" : "&times;"}
</button>}
```

## Expected Props Flow from App.jsx

- `isVoiding`: boolean from void hook
- `openVoidModal`: function to trigger modal
- `voidTrx`: async function for void action

## Testing Checklist

- [ ] Click X button on completed transaction → opens void modal
- [ ] Select reason → fills form  
- [ ] Confirm void → marks transaction as voided
- [ ] Voids show red indicator on next render
- [ ] Cannot void already voided transactions
- [ ] Void status persists through reload
- [ ] Reports exclude voided transactions from totals
- [ ] Audit trail preserved in transaction record
