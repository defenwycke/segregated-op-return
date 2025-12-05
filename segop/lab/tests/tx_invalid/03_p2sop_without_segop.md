# 03_p2sop_without_segop

## Summary

Transaction includes a P2SOP OP_RETURN output but has no segOP flag and no segOP payload.

## Structure (conceptual)

- Flags:
  - segOP bit clear
- Outputs:
  - One output script uses the P2SOP pattern (OP_RETURN + segOP commitment opcode/template)
- No segOP section in serialization

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: non-segOP transactions MUST NOT contain P2SOP outputs.

## Hex Fixture

- `03_p2sop_without_segop.hex` — **TODO: to be generated**.
