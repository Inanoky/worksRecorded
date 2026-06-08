import { AsyncLocalStorage } from "async_hooks";

type WhatsappSourceContext = {
    originalAudioUrl?: string | null;
};

const whatsappSourceContext = new AsyncLocalStorage<WhatsappSourceContext>();

export function runWithWhatsappSourceContext<T>(
    context: WhatsappSourceContext,
    fn: () => Promise<T>,
): Promise<T> {
    return whatsappSourceContext.run(context, fn);
}

export function getWhatsappSourceContext(): WhatsappSourceContext {
    return whatsappSourceContext.getStore() ?? {};
}
