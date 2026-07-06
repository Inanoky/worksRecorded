# Flow Modules

Flows are build-time modules that can be assigned to organizations from
`/dashboard/admin/flow-configs`.

To add a flow:

1. Create `flows/<flow-key>/module.ts`.
2. Export a `FlowModuleDefinition` with a unique `key`.
3. Add the module to `FLOW_MODULES` in `lib/flows/registry.ts`.
4. Export dashboard/site diary components from `flows/<flow-key>/frontend.ts`.
5. Add the frontend components to `components/client-flows/flow-frontend-registry.tsx`.
6. If the flow has WhatsApp/backend behavior, expose it from
   `flows/<flow-key>/backend.ts` and route it through the backend flow runtime.

Runtime rules:

- Organization assignment is stored in `FlowAssignment`.
- Runtime pages resolve the assigned `flowModuleKey`, not client-specific ids.
- Flow behavior should use `organizationId` and `siteId` from runtime context.
- Flow code should not rely on hardcoded customer ids except as legacy fallbacks.

