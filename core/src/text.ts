export class Text {
    public static truncate(text: string, length: number): string {
        return text.length > length ? text.substring(0, length - 1) + "…" : text;
    }
}