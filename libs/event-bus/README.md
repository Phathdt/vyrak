# Event Bus Module

Event-driven architecture foundation for Vyrak using Redis Streams.

## Structure

```
libs/event-bus/
├── src/
│   ├── domain/              # Business logic & interfaces
│   │   ├── entities/        # Event types & schemas
│   │   ├── interfaces/      # IEventBus interface
│   │   └── exceptions/      # Custom errors
│   ├── infras/              # Infrastructure implementations
│   │   ├── repositories/    # Redis Streams implementation
│   │   └── di/             # Dependency injection tokens
│   └── event-bus.module.ts  # NestJS module
└── README.md
```

## Features

- ✅ Redis Streams for event persistence
- ✅ Consumer groups for load balancing
- ✅ At-least-once delivery with acknowledgments
- ✅ Fan-out pattern (one event → multiple workers)
- ✅ NestJS DI integration

## Installation

```bash
pnpm add ioredis
```

## Usage

### In NestJS Module

```typescript
import { Module } from '@nestjs/common'
import { EventBusModule } from '@vyrak/event-bus'

@Module({
  imports: [EventBusModule],
})
export class AppModule {}
```

### Publishing Events

```typescript
import { Inject } from '@nestjs/common'
import { IEventBus, EVENT_BUS, EventType } from '@vyrak/event-bus'

export class SomeService {
  constructor(@Inject(EVENT_BUS) private eventBus: IEventBus) {}

  async handleAction() {
    await this.eventBus.publish('agent.tool_use', {
      type: EventType.AGENT_TOOL_USE,
      workflowId: '123',
      toolName: 'Write',
      filePath: '/path/to/file.md',
      timestamp: Date.now()
    })
  }
}
```

### Subscribing to Events

```typescript
import { Inject, OnModuleInit } from '@nestjs/common'
import { IEventBus, EVENT_BUS, AgentToolUseEvent } from '@vyrak/event-bus'

export class ArtifactWorker implements OnModuleInit {
  constructor(@Inject(EVENT_BUS) private eventBus: IEventBus) {}

  async onModuleInit() {
    await this.eventBus.subscribe<AgentToolUseEvent>(
      'agent.tool_use',
      async (data) => {
        console.log('Received tool use event:', data)
        // Process event
      },
      {
        group: 'artifact-workers',
        consumer: 'worker-1'
      }
    )
  }
}
```

## Event Types

- `agent.message.user` - User sends message
- `agent.message.delta` - AI streams response chunk
- `agent.message.complete` - AI completes response
- `agent.tool_use` - Agent uses tool (Write, Edit, Read, etc)
- `artifact.created` - Artifact successfully created

## Architecture

```
Publisher → Redis Streams → Consumer Groups → Workers
                ↓
        Event persistence
        (audit trail)
```

## Configuration

Set Redis URL via environment variable:

```bash
REDIS_URL=redis://localhost:6379
```

## References

- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/)
- [ADR: Why Redis Streams](../../docs/adr/why-redis-streams-for-event-bus.md)
- [Event-Driven Architecture Design](../../docs/adr/event-driven-architecture-detailed-design.md)
