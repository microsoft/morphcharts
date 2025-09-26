import { Quaternion, vector3, Vector3 } from "./matrix.js";
import { Cube } from "./meshes/cube.js";

// TODO: Move to AABB and delete this class
export class Bounds {
    public static rotate(minBounds: Vector3, maxBounds: Vector3, rotation: Quaternion, rotatedMinBounds: Vector3, rotatedMaxBounds: Vector3, offset: Vector3) {
        const sizeX = maxBounds[0] - minBounds[0];
        const sizeY = maxBounds[1] - minBounds[1];
        const sizeZ = maxBounds[2] - minBounds[2];
        const min = rotatedMinBounds;
        const max = rotatedMaxBounds;
        min[0] = Number.MAX_VALUE;
        min[1] = Number.MAX_VALUE;
        min[2] = Number.MAX_VALUE;
        max[0] = -Number.MAX_VALUE;
        max[1] = -Number.MAX_VALUE;
        max[2] = -Number.MAX_VALUE;
        const vertices = Cube.POSITIONS;
        const position: Vector3 = [0, 0, 0];
        for (let i = 0; i < 8; i++) {
            position[0] = offset[0] + vertices[i * 3] * sizeX;
            position[1] = offset[1] + vertices[i * 3 + 1] * sizeY;
            position[2] = offset[2] + vertices[i * 3 + 2] * sizeZ;
            vector3.transformQuaternion(position, rotation, position);
            position[0] -= offset[0];
            position[1] -= offset[1];
            position[2] -= offset[2];
            min[0] = Math.min(min[0], position[0]);
            min[1] = Math.min(min[1], position[1]);
            min[2] = Math.min(min[2], position[2]);
            max[0] = Math.max(max[0], position[0]);
            max[1] = Math.max(max[1], position[1]);
            max[2] = Math.max(max[2], position[2]);
        }
        // Center
        position[0] = (minBounds[0] + maxBounds[0]) * 0.5;
        position[1] = (minBounds[1] + maxBounds[1]) * 0.5;
        position[2] = (minBounds[2] + maxBounds[2]) * 0.5;
        min[0] += position[0];
        min[1] += position[1];
        min[2] += position[2];
        max[0] += position[0];
        max[1] += position[1];
        max[2] += position[2];
    }

    // Tight bounds for a cylinder
    public static cylinder(pa: Vector3, pb: Vector3, radius: number, minBounds: Vector3, maxBounds: Vector3) {
        const a: Vector3 = [
            pb[0] - pa[0],
            pb[1] - pa[1],
            pb[2] - pa[2]
        ];
        const aa = vector3.dot(a, a);
        const ex = radius * Math.sqrt(1 - a[0] * a[0] / aa);
        const ey = radius * Math.sqrt(1 - a[1] * a[1] / aa);
        const ez = radius * Math.sqrt(1 - a[2] * a[2] / aa);
        minBounds[0] = Math.min(pa[0] - ex, pb[0] - ex);
        minBounds[1] = Math.min(pa[1] - ey, pb[1] - ey);
        minBounds[2] = Math.min(pa[2] - ez, pb[2] - ez);
        maxBounds[0] = Math.max(pa[0] + ex, pb[0] + ex);
        maxBounds[1] = Math.max(pa[1] + ey, pb[1] + ey);
        maxBounds[2] = Math.max(pa[2] + ez, pb[2] + ez);
    }

    /**
     * Tight bounds for a ring segment in xy-plane
     * Angle starts at 0 at 12 o'clock and goes clockwise to 2*PI
     * @param center 
     * @param innerRadius 
     * @param outerRadius 
     * @param startAngle less than endAngle
     * @param endAngle 
     * @param minBounds 
     * @param maxBounds 
     */
    public static ringSegment(center: Vector3, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, minBounds: Vector3, maxBounds: Vector3) {
        // Clamp angles to [0, 2*PI]
        // startAngle = startAngle % Constants.TWO_PI;
        // endAngle = endAngle % Constants.TWO_PI;

        // Position of start, end points
        const innerStartPointX = innerRadius * Math.sin(startAngle);
        const innerStartPointY = innerRadius * Math.cos(startAngle);
        const innerEndPointX = innerRadius * Math.sin(endAngle);
        const innerEndPointY = innerRadius * Math.cos(endAngle);
        const outerStartPointX = outerRadius * Math.sin(startAngle);
        const outerStartPointY = outerRadius * Math.cos(startAngle);
        const outerEndPointX = outerRadius * Math.sin(endAngle);
        const outerEndPointY = outerRadius * Math.cos(endAngle);

        // Find min and max
        let minX = Number.MAX_VALUE
        let minY = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;
        minX = Math.min(minX, innerStartPointX);
        minX = Math.min(minX, innerEndPointX);
        minX = Math.min(minX, outerStartPointX);
        minX = Math.min(minX, outerEndPointX);
        maxX = Math.max(maxX, innerStartPointX);
        maxX = Math.max(maxX, innerEndPointX);
        maxX = Math.max(maxX, outerStartPointX);
        maxX = Math.max(maxX, outerEndPointX);
        minY = Math.min(minY, innerStartPointY);
        minY = Math.min(minY, innerEndPointY);
        minY = Math.min(minY, outerStartPointY);
        minY = Math.min(minY, outerEndPointY);
        maxY = Math.max(maxY, innerStartPointY);
        maxY = Math.max(maxY, innerEndPointY);
        maxY = Math.max(maxY, outerStartPointY);
        maxY = Math.max(maxY, outerEndPointY);

        // Find critical points (intersections with axes)
        // Intersection with +y axis
        if ((startAngle <= 0 && 0 <= endAngle) ||
            (startAngle <= Math.PI * 2 && Math.PI * 2 <= endAngle)) {
            const x = 0;
            const y = outerRadius;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        // Intersection with +x axis
        if ((startAngle <= Math.PI * 0.5 && Math.PI * 0.5 <= endAngle) ||
            (startAngle <= Math.PI * 2.5 && Math.PI * 2.5 <= endAngle)) {
            const x = outerRadius;
            const y = 0;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        // Intersection with -y axis
        if ((startAngle <= Math.PI && Math.PI <= endAngle) ||
            (startAngle <= Math.PI * 3 && Math.PI * 3 <= endAngle)) {
            const x = 0;
            const y = -outerRadius;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        // Intersection with -x axis
        if ((startAngle <= Math.PI * 1.5 && Math.PI * 1.5 <= endAngle) ||
            (startAngle <= Math.PI * 3.5 && Math.PI * 3.5 <= endAngle)) {
            const x = -outerRadius;
            const y = 0;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // Center
        minBounds[0] = minX + center[0];
        minBounds[1] = minY + center[1];
        minBounds[2] = center[2];
        maxBounds[0] = maxX + center[0];
        maxBounds[1] = maxY + center[1];
        maxBounds[2] = center[2];
    }
}