import { AsyncLocalStorage } from "async_hooks";

type WhatsappSourceContext = {
    originalAudioUrl?: string | null;
    originalAudioRecordId?: string | null;
    siteDiarySaveConsumed?: boolean;
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

export function consumeWhatsappAudioSourceContext(): WhatsappSourceContext {
    const store = whatsappSourceContext.getStore();
    if (!store) return {};

    const context = {
        originalAudioUrl: store.originalAudioUrl ?? null,
        originalAudioRecordId: store.originalAudioRecordId ?? null,
    };
    store.originalAudioUrl = null;
    store.originalAudioRecordId = null;
    return context;
}

export function hasConsumedWhatsappSiteDiarySave(): boolean {
    return Boolean(whatsappSourceContext.getStore()?.siteDiarySaveConsumed);
}

export function markWhatsappSiteDiarySaveConsumed() {
    const store = whatsappSourceContext.getStore();
    if (store) store.siteDiarySaveConsumed = true;
}
