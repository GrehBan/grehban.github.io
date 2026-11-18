export type PortfolioLanguage = "en" | "ru";

interface FeaturedProject {
  name: string;
  description: string;
  url: string;
  tags: string[];
}

interface FocusArea {
  title: string;
  description: string;
  tags: string[];
}

export const featuredProjects: Record<PortfolioLanguage, FeaturedProject[]> = {
  en: [
    {
      name: "aiollm",
      description:
        "An async-first, typed HTTP client toolkit for AI APIs: OpenAI and Anthropic clients, validated responses, retries, uploads, and streaming. Currently pre-alpha.",
      url: "https://github.com/GrehBan/aiollm",
      tags: ["Python 3.13+", "aiohttp", "Pydantic", "OpenAI / Anthropic", "pre-alpha"],
    },
    {
      name: "aiopulse",
      description:
        "An async callback executor with bounded concurrency, configurable result ordering, and managed task lifetimes.",
      url: "https://github.com/GrehBan/aiopulse",
      tags: ["Python 3.11+", "asyncio", "bounded concurrency", "async iteration"],
    },
    {
      name: "typed-exceptions",
      description:
        "Structured exceptions with typed fields, message templates, and context that can redact sensitive values.",
      url: "https://github.com/GrehBan/typed-exceptions",
      tags: ["Python 3.14+", "typing", "message templates", "structured errors"],
    },
    {
      name: "aiollm_codegen",
      description:
        "An experimental generator for Pydantic models and aiollm API methods from OpenAPI 3.0/3.1 specifications.",
      url: "https://github.com/GrehBan/aiollm_codegen",
      tags: ["Python 3.13+", "OpenAPI 3.0/3.1", "Pydantic v2", "experimental"],
    },
    {
      name: "pyhttp-util",
      description:
        "Strictly typed data structures for HTTP headers, authentication, cookies, and timeouts, with RFC validation.",
      url: "https://github.com/GrehBan/pyhttp-util",
      tags: ["Python 3.10+", "HTTP", "RFC 7230 / 6265", "mypy"],
    },
    {
      name: "aiollm_landing",
      description:
        "A bilingual product site for aiollm, with developer documentation, usage examples, and project information.",
      url: "https://github.com/GrehBan/aiollm_landing",
      tags: ["Next.js", "TypeScript", "English / Russian", "aiollm"],
    },
  ],
  ru: [
    {
      name: "aiollm",
      description:
        "Асинхронная типизированная библиотека HTTP-клиентов для AI API: клиенты OpenAI и Anthropic, проверка ответов, повторы, загрузка файлов и потоковые ответы. Статус — pre-alpha.",
      url: "https://github.com/GrehBan/aiollm",
      tags: ["Python 3.13+", "aiohttp", "Pydantic", "OpenAI / Anthropic", "pre-alpha"],
    },
    {
      name: "aiopulse",
      description:
        "Асинхронный исполнитель callback-вызовов с ограничением конкурентности, настраиваемым порядком результатов и управляемым временем жизни задач.",
      url: "https://github.com/GrehBan/aiopulse",
      tags: ["Python 3.11+", "asyncio", "bounded concurrency", "async iteration"],
    },
    {
      name: "typed-exceptions",
      description:
        "Структурированные исключения с типизированными полями, шаблонами сообщений и контекстом с поддержкой сокрытия чувствительных данных.",
      url: "https://github.com/GrehBan/typed-exceptions",
      tags: ["Python 3.14+", "typing", "message templates", "structured errors"],
    },
    {
      name: "aiollm_codegen",
      description:
        "Экспериментальный генератор моделей Pydantic и методов API для aiollm по спецификациям OpenAPI 3.0/3.1.",
      url: "https://github.com/GrehBan/aiollm_codegen",
      tags: ["Python 3.13+", "OpenAPI 3.0/3.1", "Pydantic v2", "experimental"],
    },
    {
      name: "pyhttp-util",
      description:
        "Строго типизированные структуры для HTTP-заголовков, аутентификации, cookies и таймаутов с проверками по RFC.",
      url: "https://github.com/GrehBan/pyhttp-util",
      tags: ["Python 3.10+", "HTTP", "RFC 7230 / 6265", "mypy"],
    },
    {
      name: "aiollm_landing",
      description:
        "Двуязычный сайт продукта aiollm: примеры использования, документация и материалы для разработчиков.",
      url: "https://github.com/GrehBan/aiollm_landing",
      tags: ["Next.js", "TypeScript", "English / Russian", "aiollm"],
    },
  ],
};

export const focusAreas: Record<PortfolioLanguage, FocusArea[]> = {
  ru: [
    { title: "Backend и асинхронность", description: "Типизированные API на Python, асинхронные сервисы и HTTP-интеграции.", tags: ["Python 3.10+", "asyncio", "FastAPI", "Starlette", "aiohttp", "HTTPX", "Pydantic", "typing"] },
    { title: "Базы данных", description: "Реляционное, документное, кэшируемое и временное хранение с управляемой эволюцией схем.", tags: ["PostgreSQL", "MongoDB", "Redis", "InfluxDB", "SQL", "SQLAlchemy 2.0", "Alembic"] },
    { title: "Сообщения и распределённые системы", description: "Очереди, потоки событий и фоновые задачи под нужную модель доставки.", tags: ["RabbitMQ", "RabbitMQ Quorum Queues", "NATS", "NATS JetStream", "Celery"] },
    { title: "Инфраструктура", description: "Linux, контейнеризация, оркестрация и эксплуатация веб-серверов.", tags: ["Linux", "Docker", "Docker Swarm", "Nginx", "Apache", "Bash"] },
    { title: "Наблюдаемость", description: "Метрики, трассировки и логи для эксплуатации распределённых сервисов.", tags: ["Prometheus", "Grafana", "OpenTelemetry", "LGTM Stack", "Loki"] },
    { title: "Тестирование", description: "Быстрая обратная связь, реалистичная инфраструктура в тестах и проверка граничных случаев.", tags: ["Pytest", "pytest-asyncio", "Testcontainers", "Hypothesis"] },
    { title: "CI/CD", description: "Повторяемые проверки и конвейеры доставки Python-сервисов.", tags: ["GitHub Actions"] },
    { title: "AI и интеграции", description: "Асинхронные API-интеграции с AI/LLM-сервисами и Telegram-ботами.", tags: ["AI / LLM", "API tooling", "Telegram bots"] },
  ],
  en: [
    { title: "Backend & Async", description: "Typed Python APIs, asynchronous services, and outbound HTTP integrations.", tags: ["Python 3.10+", "asyncio", "FastAPI", "Starlette", "aiohttp", "HTTPX", "Pydantic", "typing"] },
    { title: "Databases", description: "Relational, document, cache, and time-series storage with deliberate schema evolution.", tags: ["PostgreSQL", "MongoDB", "Redis", "InfluxDB", "SQL", "SQLAlchemy 2.0", "Alembic"] },
    { title: "Messaging & Distributed Systems", description: "Queues, streams, and task processing chosen for the delivery model each system needs.", tags: ["RabbitMQ", "RabbitMQ Quorum Queues", "NATS", "NATS JetStream", "Celery"] },
    { title: "Infrastructure", description: "Linux-first delivery, container orchestration, and web-server operations.", tags: ["Linux", "Docker", "Docker Swarm", "Nginx", "Apache", "Bash"] },
    { title: "Observability", description: "Metrics, traces, and logs that make distributed services easier to operate.", tags: ["Prometheus", "Grafana", "OpenTelemetry", "LGTM Stack", "Loki"] },
    { title: "Testing", description: "Fast feedback, realistic infrastructure in tests, and property-based edge-case discovery.", tags: ["Pytest", "pytest-asyncio", "Testcontainers", "Hypothesis"] },
    { title: "CI/CD", description: "Repeatable checks and delivery pipelines for Python services.", tags: ["GitHub Actions"] },
    { title: "AI & integrations", description: "Async API tooling for AI/LLM services, networking, and Telegram automation.", tags: ["AI / LLM", "API tooling", "Telegram bots"] },
  ],
};
