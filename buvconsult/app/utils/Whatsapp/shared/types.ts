export type AgentFn = (
    input: string, 
    siteId: string | null, userId: string)
     => Promise<string>;
