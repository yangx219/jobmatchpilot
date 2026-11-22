# ADR-005：Agent Loop 与 Durable Workflow 分层

- 状态：Accepted
- 日期：2026-11-04

## Context

JobMatchPilot 同时存在交互式 AI 助手和岗位匹配、求职信、简历定制等长任务。把两者都称为 Agent 会掩盖它们不同的控制权、恢复和副作用要求。

## Decision

- 步骤明确、涉及持久化副作用的任务使用代码编排的 Durable Workflow。
- 只有无法预先确定工具顺序的开放式交互使用 LLM Agent Loop。
- Agent Loop 必须受工具白名单、输入 Schema、ownership、最大步骤、预算和审批约束。
- Workflow 必须受状态机、幂等键、租约/恢复、最大重试、超时和持久化前状态门禁约束。
- 不因 Harness Engineering、Multi-Agent 或 Learning Loop 的流行而自动增加自主权。

## Consequences

优点：固定业务链路更可预测，取消/重试/审批可以在数据库中证明；交互助手仍保留必要灵活性。

代价：存在两套执行模型，需要清楚文档和共享的 Tool/Telemetry 契约；某些能力不能简单从 Chat Agent 复制到 Worker。

## Evidence

2026-11-04 的 Harness 审计发现不同 Workflow 的取消保护发生漂移。统一执行监控并增加竞态测试后，取消结果不再被重新发布。这支持“在边界层机械约束，而不是依赖 Prompt”的决定。
