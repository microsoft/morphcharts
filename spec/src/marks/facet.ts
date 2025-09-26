export class Facet {
    // Required
    public data: string;
    public name: string;

    // Required for pre-faceted data
    public field: string; // TODO: Convert to Field

    // Required for data-driven facets
    public groupby: string; // TODO: Field | Field[]
    // Optional aggregate transform parameters for data-driven facets
    public aggregate: string; // TODO: Convert to aggregate transform parameters object with fields, ops, as, and cross properties

    public static fromJSON(json: any): Facet {
        // Data and name are required
        if (!json.data || !json.name) {
            throw new Error("facet data and name are required");
        }
        const facet = new Facet();
        facet.data = json.data;
        facet.name = json.name;
        facet.groupby = json.groupby;
        facet.aggregate = json.aggregate;
        facet.field = json.field;
        return facet;
    }
}