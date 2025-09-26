export class Common {
    static async loadSampleIndex(path: string): Promise<{ plot: string, title: string, description: string, image: string }[]> {
        try {
            const response = await fetch(path);
            const json = await response.json();
            return json;
        } catch (error) {
            console.error("error loading sample index", error);
            return [];
        }
    }
}