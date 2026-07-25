export type NotificationType = "warn" | "info" | "critical" | "unknown";
export interface Notificatin {
    type: NotificationType;
    title: string;
    message: string;
}
