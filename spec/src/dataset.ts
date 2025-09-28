import * as Core from "core";
import * as Transforms from "./transforms/index.js";
import { Group } from "./marks/group.js";
import { Plot } from "./plot.js";

export class Dataset extends Core.Data.Dataset {
    protected _parent: Dataset;
    public get datum() { return this._parent; }

    public clone() {
        const headings = this._headings.slice();
        const rows = this._rows.map(row => row.slice());
        const columnTypes = this._columnTypes.slice();
        return new Dataset(headings, rows, columnTypes, this._parent);
    }

    constructor(headings: string[], rows: string[][], columnTypes: Core.Data.ColumnType[], datum?: Dataset) {
        super(headings, rows, columnTypes);
        this._parent = datum;
    }

    public static async fromJSONAsync(plot: Plot, group: Group, datasets: { [key: string]: string }, datasetJSON: any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const start = performance.now();
                const name = datasetJSON.name; // Required

                // Explicit column types
                const parse = datasetJSON.parse;
                let explicitColumnTypes: { [key: string]: Core.Data.ColumnType };
                if (typeof parse == "object") {
                    explicitColumnTypes = {};
                    const headings = Object.keys(parse);
                    for (let i = 0; i < headings.length; i++) {
                        const heading = headings[i];
                        const type = parse[heading];
                        let columnType;
                        // "boolean", "date", "number" or "string"
                        switch (type) {
                            case "number":
                                columnType = Core.Data.ColumnType.float;
                                break;
                            case "date":
                                columnType = Core.Data.ColumnType.date;
                                break;
                            case "string":
                            default:
                                columnType = Core.Data.ColumnType.string;
                                break;
                        }
                        explicitColumnTypes[heading] = columnType;
                    }
                }

                let dataset: Dataset, readonly: boolean;
                if (datasetJSON.source) {
                    // Use existing dataset
                    dataset = group.getDataset(datasetJSON.source);
                    if (!dataset) {
                        console.log(`source dataset ${datasetJSON.source} not found`);
                        reject(`source dataset ${datasetJSON.source} not found`);
                    }

                    // Existing datasets are readonly and should be cloned during transforms
                    readonly = true;
                }
                else if (datasetJSON.values) {
                    // Create new dataset from values
                    const rows = [];
                    let headings = Object.keys(datasetJSON.values[0]);
                    if (headings.length > 0) {
                        // Use keys specified in the first row of values
                        // TODO: Iterate over all rows to get all keys, then iterate over all values to infer datatypes (if not explicitly specified), then create rows, filling in missinng values with defaults for each datatype (string="", number=0)
                        for (let j = 0; j < datasetJSON.values.length; j++) {
                            const row: string[] = [];
                            for (let k = 0; k < headings.length; k++) { row.push(datasetJSON.values[j][headings[k]].toString()); }
                            rows.push(row);
                        }
                    }
                    else {
                        // No keys specified, use default key "data"
                        headings = ["data"];
                        for (let j = 0; j < datasetJSON.values.length; j++) {
                            const row: string[] = [];
                            for (let k = 0; k < headings.length; k++) { row.push(datasetJSON.values[j].toString()); }
                            rows.push(row);
                        }
                    }
                    const columnTypes = Dataset.inferTypes(rows);
                    dataset = new Dataset(headings, rows, columnTypes);
                    console.log(`create data ${name} ${headings.length} columns ${rows.length} rows`);
                }
                else if (datasetJSON.url) {
                    // Load data from URL
                    const start = performance.now();
                    let format;
                    if (datasetJSON.format) {
                        format = datasetJSON.format.type;
                    }
                    else {
                        format = "json";
                    }
                    switch (format) {
                        case "csv":
                            try {
                                const response = await fetch(datasetJSON.url);
                                if (!response.ok) {
                                    console.log(`error loading csv data ${name} url ${datasetJSON.url}`, response.statusText);
                                    reject(`${datasetJSON.url} ${response.statusText.toLowerCase()}`);
                                }
                                else {
                                    const text = await response.text();
                                    const csv = new Core.Csv();
                                    const headings = csv.readline(text, 0);
                                    const rows = csv.read(text, 1); // Remaining rows
                                    const columnTypes = Dataset.inferTypes(rows);
                                    // Override inferred column types
                                    if (explicitColumnTypes) {
                                        for (let i = 0; i < headings.length; i++) {
                                            const heading = headings[i];
                                            if (explicitColumnTypes[heading]) {
                                                columnTypes[i] = explicitColumnTypes[heading];
                                            }
                                        }
                                    }
                                    dataset = new Dataset(headings, rows, columnTypes);
                                    console.log(`loaded data ${name} ${headings.length} columns ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                                }
                            }
                            catch (error) {
                                console.log(`error loading csv data ${name} url ${datasetJSON.url}`, error);
                                reject(error);
                            }
                            break;
                        default:
                        case "json":
                            console.log("data format not supported");
                            break;
                    }
                }
                else if (datasetJSON.file) {
                    // Load data from input file upload
                    const start = performance.now();
                    const text = datasets[datasetJSON.file];
                    // TODO: Support JSON
                    if (text) {
                        const csv = new Core.Csv();
                        const headings = csv.readline(text, 0);
                        const rows = csv.read(text, 1); // Remaining rows
                        const columnTypes = Dataset.inferTypes(rows);
                        dataset = new Dataset(headings, rows, columnTypes);
                        console.log(`loaded data ${name} ${headings.length} columns ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                    }
                }

                // Transforms
                if (datasetJSON.transform) {
                    // Hierarchy data
                    let hierarchy: Transforms.IHierarchy;
                    for (let j = 0; j < datasetJSON.transform.length; j++) {
                        const transformJSON = datasetJSON.transform[j];
                        switch (transformJSON.type) {
                            case "aggregate":
                                dataset = new Transforms.Aggregate(transformJSON).transform(dataset);
                                break;
                            case "bin":
                                dataset = new Transforms.Bin(transformJSON).transform(group, dataset);
                                break;
                            case "collect":
                                dataset = new Transforms.Collect(transformJSON).transform(group, dataset);
                                break;
                            case "extent":
                                // No dataset, just a signal as a side-effect
                                new Transforms.Extent(transformJSON).transform(group, dataset);
                                break;
                            case "filter":
                                dataset = new Transforms.Filter(transformJSON).transform(group, dataset);
                                break;
                            case "fold":
                                dataset = new Transforms.Fold(transformJSON).transform(group, dataset);
                                break;
                            case "formula":
                                dataset = new Transforms.Formula(transformJSON).transform(group, dataset, readonly);
                                break;
                            case "geopoint":
                                dataset = new Transforms.Geopoint(transformJSON).transform(group, dataset);
                                break;
                            case "geopoint3d":
                                dataset = new Transforms.Geopoint3D(transformJSON).transform(group, dataset);
                                break;
                            case "graticule":
                                dataset = new Transforms.Graticule(transformJSON).transform(group);
                                break;
                            case "grid":
                                dataset = new Transforms.Grid(transformJSON).transform();
                                break;
                            case "hexbin":
                                dataset = new Transforms.Hexbin(transformJSON).transform(dataset);
                                break;
                            case "identifier":
                                dataset = new Transforms.Identifier(transformJSON).transform(dataset, readonly);
                                break;
                            case "lookup":
                                dataset = new Transforms.Lookup(transformJSON).transform(group, dataset);
                                break;
                            case "partition":
                                if (hierarchy) { dataset = new Transforms.Partition(transformJSON).transform(group, dataset, hierarchy, readonly); }
                                break;
                            case "pie":
                                dataset = new Transforms.Pie(transformJSON).transform(group, dataset, readonly);
                                break;
                            case "sequence":
                                dataset = new Transforms.Sequence(transformJSON).transform(group);
                                break;
                            case "stack":
                                dataset = new Transforms.Stack(transformJSON).transform(dataset, readonly);
                                break;
                            case "stratify":
                                hierarchy = new Transforms.Stratify(transformJSON).transform(dataset);
                                break;
                            case "tree3d":
                                if (hierarchy) { dataset = new Transforms.Tree3D(transformJSON).transform(group, dataset, hierarchy, readonly); }
                                break;
                            case "treemap":
                                // Allow null hierarchy for flat treemaps
                                dataset = new Transforms.Treemap(transformJSON).transform(group, dataset, hierarchy, readonly);
                                break;
                            case "unit":
                                dataset = new Transforms.Unit(transformJSON).transform(dataset);
                                break;
                            case "unitstack":
                                dataset = new Transforms.UnitStack(transformJSON).transform(group, dataset, readonly);
                                break;
                            case "window":
                                dataset = new Transforms.Window(transformJSON).transform(dataset, readonly);
                                break;
                            default:
                                console.log(`unknown transform type ${transformJSON.type}`);
                                break;
                        }
                    }
                }
                group.datasets[name] = dataset;
                console.log(`added data ${name} ${dataset.headings.length} columns ${dataset.rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
                resolve();
            }
            catch (error) {
                console.log("error parsing dataset  JSON", error);
                reject(error);
            }
        });
    }
}
