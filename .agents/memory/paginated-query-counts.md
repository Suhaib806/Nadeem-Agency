---
name: Paginated query counts
description: Placeholder numbering for list queries that also return totals
---

When a paginated SQL list query uses `$1` and `$2` for LIMIT and OFFSET, its separate COUNT query must renumber the remaining filter placeholders before reusing the filter parameters.

**Why:** Reusing the original WHERE clause with `params.slice(2)` leaves PostgreSQL with missing or untyped parameters and turns common filtered list views into 500 responses.

**How to apply:** Build the data query and count query from the same filter model, but generate the count WHERE clause with pagination placeholders removed.