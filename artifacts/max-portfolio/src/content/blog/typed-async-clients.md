---
title: "A practical shape for typed async clients"
description: "A few design choices that make Python API clients predictable without hiding the HTTP layer."
pubDate: 2026-11-17
tags: ["Python", "async", "typing", "API design"]
---

An async client library should make the common path easy without making the
underlying protocol mysterious. The useful middle ground is a small typed
surface over a transport that remains explicit and replaceable.

## Keep the transport boundary visible

Accept an `httpx.AsyncClient` (or a small protocol implemented by one) rather
than constructing a hidden client for every request. This makes connection
pools, timeouts, proxies, and test transports decisions the application can
actually control.

```python
from typing import Protocol

class AsyncTransport(Protocol):
    async def get(self, url: str, **kwargs: object) -> "Response": ...
```

The exact protocol can be narrower than a full HTTP library. What matters is
that the client does not quietly take ownership of configuration it cannot
reasonably choose for its callers.

## Make errors part of the contract

Successful responses are only half of an API. A useful library distinguishes
transport failures, non-success status codes, and invalid response data. Keep
the original response or exception available so callers can inspect status,
headers, and request identifiers when they need to.

Avoid converting every failure into `None`. A missing resource, an offline
network, and a broken server response need different handling.

## Type the boundary, not every internal variable

Use precise models where data enters or leaves the library, and let ordinary
inference handle implementation details. This keeps annotations useful to
users of the package without turning every helper into a type puzzle.

The result is a client that is async-first, but still easy to test, configure,
and understand from its public methods.
