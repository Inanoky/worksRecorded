import { AsyncLocalStorage } from "async_hooks";

type WhatsappSourceContext = {
    originalAudioUrl?: string | null;
    messageId?: string | null;
};

const whatsappSourceContext = new AsyncLocalStorage<WhatsappSourceContext>();

export function runWithWhatsappSourceContext<T>(
    context: WhatsappSourceContext,
    fn: () => Promise<T>,
): Promise<T> {
    return whatsappSourceContext.run(
        { ...(whatsappSourceContext.getStore() ?? {}), ...context },
        fn,
    );
}

export function getWhatsappSourceContext(): WhatsappSourceContext {
    return whatsappSourceContext.getStore() ?? {};
}

export function consumeWhatsappAudioSourceContext(): WhatsappSourceContext {
    const store = whatsappSourceContext.getStore();
    if (!store) return {};

    const context = {
        originalAudioUrl: store.originalAudioUrl ?? null,
        messageId: store.messageId ?? null,
    };
    store.originalAudioUrl = null;
    return context;
}
