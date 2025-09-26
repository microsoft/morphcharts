export class Config {
    private static _default: string = `{
    "range": {
        "category": {"scheme": "category10"},
        "ordinal": {"scheme": "blues"},
        "ramp": {"scheme": "blues"},
        "diverging": {"scheme": "brownbluegreen"}
    }
}`;

    private _json: any;
    public get json(): any { return this._json; }
    constructor() {
        this._json = JSON.parse(Config._default);
    }

    public static fromJSON(json: any): Config {
        try {
            // Default
            const config = new Config();

            // Merge
            if (json) {
                // Range
                if (json.range) {
                    if (json.range.category) { config._json.range.category = json.range.category; }
                    if (json.range.ordinal) { config._json.range.ordinal = json.range.ordinal; }
                    if (json.range.ramp) { config._json.range.ramp = json.range.ramp; }
                    if (json.range.diverging) { config._json.range.diverging = json.range.diverging; }
                }
            }
            return config;
        }
        catch (error) {
            console.log("error parsing config JSON", error);
            throw error;
        }
    }
}