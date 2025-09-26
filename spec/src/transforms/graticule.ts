import * as Core from "core";
import { Dataset } from "../dataset.js";
import { Transform } from "./transform.js";
import { Group } from "../marks/group.js";

export class Graticule extends Transform {
    transform(group: Group): Dataset {
        // Optional fields
        // Extent, degrees
        let extentLon0 = -180, extentLon1 = 180, extentLat0 = -85, extentLat1 = 85;
        if (this._transformJSON.extent) {
            // [[extentLon0, extentLat0], [extentLon1, extentLat1]]
            const extent = this._transformJSON.extent;
            if (Array.isArray(extent) && extent.length == 2 && Array.isArray(extent[0]) && Array.isArray(extent[1]) &&
                extent[0].length == 2 && extent[1].length == 2) {
                // Clamp extent to valid ranges
                extentLon0 = Math.max(-180, Math.min(180, extent[0][0]));
                extentLat0 = Math.max(-90, Math.min(90, extent[0][1]));
                extentLon1 = Math.max(-180, Math.min(180, extent[1][0]));
                extentLat1 = Math.max(-90, Math.min(90, extent[1][1]));
            }
        }

        // Step, degrees
        let stepLon = 10, stepLat = 10;
        if (this._transformJSON.step) {
            const step = this._transformJSON.step;
            if (Array.isArray(step) && step.length == 2) {
                stepLon = step[0];
                stepLat = step[1];
            }
            else if (typeof step == "number") {
                stepLon = step;
                stepLat = step;
            }
        }

        // Precision, degrees
        let precision = 2.5;
        if (this._transformJSON.precision) {
            if (typeof this._transformJSON.precision == "number") {
                precision = this._transformJSON.precision;
            }
        }

        // As
        let lon0 = "lon0";
        let lat0 = "lat0";
        let lon1 = "lon1";
        let lat1 = "lat1";
        if (this._transformJSON.as) {
            const as = this._transformJSON.as;
            if (Array.isArray(as) && as.length == 4) {
                lon0 = as[0].toString();
                lat0 = as[1].toString();
                lon1 = as[2].toString();
                lat1 = as[3].toString();
            }
        }

        const start = performance.now();
        const rows: string[][] = [];
        let lon, lat;
        // Create a sequence of meridians, starting at extentLon0 and ending at extentLon1
        // Add stepLon between each meridian, clamping to extentLon1
        lon = extentLon0;
        do {
            lat = extentLat0;
            do {
                const row = [];
                row.push(lon.toString()); // lon0
                row.push(lat.toString()); // lat0
                row.push(lon.toString()); // lon1
                row.push(Math.min(lat + precision, extentLat1).toString()); // lat1
                rows.push(row);
                lat = Math.min(lat + precision, extentLat1); // Increment latitude by precision
            } while (lat < extentLat1);
            lon = Math.min(lon + stepLon, extentLon1); // Increment longitude by stepLon
        } while (lon < extentLon1);

        // Create a sequence of parallels, starting at extentLat0 and ending at extentLat1
        // Add stepLat between each parallel, clamping to extentLat1
        lat = extentLat0;
        do {
            lon = extentLon0;
            do {
                const row = [];
                row.push(lon.toString()); // lon0
                row.push(lat.toString()); // lat0
                row.push(Math.min(lon + precision, extentLon1).toString()); // lon1
                row.push(lat.toString()); // lat1
                rows.push(row);
                lon = Math.min(lon + precision, extentLon1); // Increment longitude by precision
            } while (lon < extentLon1);
            if (lat == extentLat1) { break; } // Prevent parallels at poles
            lat = Math.min(lat + stepLat, extentLat1); // Increment latitude by stepLat
        } while (lat <= extentLat1);

        // Create new dataset
        const headings = [lon0, lat0, lon1, lat1];
        const columnTypes = [Core.Data.ColumnType.float, Core.Data.ColumnType.float,
        Core.Data.ColumnType.float, Core.Data.ColumnType.float];
        const dataset = new Dataset(headings, rows, columnTypes);
        console.log(`graticule ${rows.length} rows ${Core.Time.formatDuration(performance.now() - start)}`);
        return dataset;
    }
}