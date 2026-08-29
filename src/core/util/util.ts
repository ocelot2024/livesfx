import { AnalysisTrackEvent, track } from "@/tracker";
import { handleError } from "vue";
import { Err } from "../types/types";

export const generateUUID = (): string => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const isPWA = (): boolean => {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );
};

const onPanic = (e: unknown) => {
    window.dispatchEvent(new CustomEvent("panic", { detail: e }));
    try {
        track(AnalysisTrackEvent.Panic, {
            message: e,
        });
    } catch {
        //トラッキングのエラーは無視できる。
    }
};

export const applyGuard = (instance: object) => {
    const proto = Object.getPrototypeOf(instance);

    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === "constructor") continue;
        if (key.startsWith("_")) continue;

        const original = (instance as any)[key];

        if (typeof original !== "function") continue;

        (instance as any)[key] = (...args: any[]) => {
            const start = import.meta.env.DEV ? performance.now() : 0;
            try {
                const result = original.apply(instance, args);

                //Promise
                if (result && typeof result.then === "function") {
                    return result
                        .then((result: unknown) => {
                            if (import.meta.env.DEV)
                                console.log(
                                    `${key} tooks : ${performance.now() - start}ms`,
                                );
                            return result;
                        })
                        .catch(onPanic);
                }
                if (import.meta.env.DEV)
                    console.log(
                        `${key} tooks : ${performance.now() - start}ms`,
                    );
                return result;
            } catch (e) {
                onPanic(e);
                return Err(e);
            }
        };
    }
};
