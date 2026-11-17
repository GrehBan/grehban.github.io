---
title: "Types are strongest at API boundaries"
description: "How parsing and validation help keep internal Python code simpler and safer."
pubDate: 2026-09-12
tags: ["Python", "typing", "API design"]
---

Types provide the most leverage where uncertain data enters a program. HTTP
requests, webhook payloads, environment variables, and model responses all
start as values whose shape cannot be trusted merely because a type annotation
was written nearby.

## Parse before passing data inward

Treat external data as `object` (or `Any` only when unavoidable), validate it
once, and convert it into a small internal representation. After that point,
business logic can work with values whose invariants have already been
checked.

```python
def parse_limit(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("limit must be an integer")
    if value < 1:
        raise ValueError("limit must be positive")
    return value
```

The explicit boolean check matters in Python because `bool` is a subclass of
`int`. Boundary validation is a good place to make these language-specific
details unambiguous.

## Keep internal models boring

Once data is parsed, prefer ordinary dataclasses or clearly defined models over
repeated dictionary lookups. This improves autocomplete, refactoring, and
static analysis while keeping runtime behavior understandable.

## Validate once, then trust the contract

Repeated validation scattered through the codebase makes it hard to know which
invariants hold at any point. A narrow parser at each external boundary gives
the rest of the system one consistent contract to rely on.
