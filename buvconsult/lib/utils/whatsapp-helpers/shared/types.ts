// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\lib\utils\whatsapp-helpers\shared\types.ts

export type AgentFn = (
    input: string, 
    siteId: string | null,
     userId: string)
     => Promise<string>;
