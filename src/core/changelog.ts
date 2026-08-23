import changelogData from "./changelog.json";

export interface ChangelogEntry {
    version: string;
    date: string;
    notes: string[];
}

export const changelog: ChangelogEntry[] = changelogData as ChangelogEntry[];

export const latestChangelogEntry: ChangelogEntry | undefined = changelog[0];
