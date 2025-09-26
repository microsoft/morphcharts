export class Time {

    /**
     * 
     * @param duration, ms
     * @returns 
     */
    public static formatDuration(duration: number): string {
        const milliseconds = Math.floor(duration % 1000);
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
        const parts = [];
        if (hours > 0) { parts.push(`${hours}h`); }
        if (minutes > 0) { parts.push(`${minutes}m`); }
        parts.push(`${seconds}.${milliseconds}s`);
        return parts.join(" ");
    }

    /**
     * 
     * @param date 
     * @returns YYYYMMDDHHmmss
     */
    public static formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return `${year}${month.toString().padStart(2, "0")}${day.toString().padStart(2, "0")}${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}${seconds.toString().padStart(2, "0")}`;
    }
}