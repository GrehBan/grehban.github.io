---
title: "Structured concurrency makes cancellation legible"
description: "Why task ownership and cancellation boundaries matter in async Python services."
pubDate: 2026-10-28
tags: ["Python", "async", "concurrency"]
---

Concurrency bugs often start with work that has no clear owner. A request
spawns a task, the task outlives the request, and shutdown has no reliable way
to find it. Structured concurrency addresses that by making child work live
inside an explicit scope.

## Give tasks a parent

An `asyncio.TaskGroup` expresses that several operations belong to one unit of
work. If one task fails, its siblings are cancelled and the group waits for
them to finish before control leaves the block.

```python
async with asyncio.TaskGroup() as group:
    profile = group.create_task(fetch_profile(user_id))
    preferences = group.create_task(fetch_preferences(user_id))

return profile.result(), preferences.result()
```

The shape of the code now documents the lifetime of both operations. They
cannot silently continue after their caller has moved on.

## Treat cancellation as normal control flow

Cancellation is how a timeout, client disconnect, or application shutdown
communicates that work is no longer needed. Cleanup belongs in `finally`
blocks, and `CancelledError` should generally be re-raised after cleanup rather
than swallowed.

This is especially important around network calls and streaming responses:
closing the response promptly frees sockets and avoids work that cannot produce
a useful result.

## Bound work at the edge

Structured task lifetime does not itself limit concurrency. Combine clear
ownership with bounded queues, semaphores, or worker pools when a service can
receive more work than it can process.

The goal is not to make async code abstract. It is to make task lifetime,
failure, and cancellation visible enough that a service can shut down
predictably.
