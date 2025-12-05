# 04_multiple_p2sop_outputs

## Summary

Transaction has segOP enabled and a valid segOP payload, but contains more than one P2SOP output.

## Structure (conceptual)

- segOP flag set
- segOP section present and valid
- Outputs:
  - Two or more outputs matching P2SOP script pattern

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: exactly one P2SOP output is allowed per segOP transaction.

## Hex Fixture

- `04_multiple_p2sop_outputs.hex` — **TODO: to be generated**.
