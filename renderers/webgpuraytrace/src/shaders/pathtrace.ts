// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export const ComputeShaderWgsl = `
const PI = 3.1415926535897932385f;
const TWO_PI = 6.2831853071795864769f;
const ROOT_TWO_OVER_TWO = 0.70710678118654752440f;
const EPSILON = 1e-8;
const LARGE_VALUE = 1e8;

struct ColorBuffer {
    values: array<f32>,
}

// Min, max depth
struct DepthMinMaxBuffer {
    values: array<atomic<u32>>,
}

struct Ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
}

struct HitRecord {
    normal: vec3<f32>,
    t: f32,
    frontFace: bool,
    uv: vec2<f32>,
    id: u32,
    position: vec3<f32>,
    sdfBorder: bool,
    previousPosition: vec3<f32>,
    isAbsorbing: bool,
    absorption: vec3<f32>,
    previousIsAbsorbing: bool,
    previousAbsorption: vec3<f32>,
}

struct Camera {
    origin: vec3<f32>,
    upperLeft: vec3<f32>,
    horizontal: vec3<f32>,
    vertical: vec3<f32>,
    u: vec3<f32>, // right
    v: vec3<f32>, // up
    w: vec3<f32>, // unit vector pointing opposite to view direction (right-hand coordinates)
    aspectRatio: f32,
    viewportWidth: f32,
    viewportHeight: f32,
    fov: f32,
    aperture: f32,
    focusDistance: f32,
}

                                   //       offest  align  size
struct Uniforms {                  // ---------------------------
    position: vec3<f32>,           //            0*    16    12
    width: f32,                    //           12      4     4
    right: vec3<f32>,              //           16*    16    12
    height: f32,                   //           28      4     4
    up: vec3<f32>,                 //           32*    16    12
    seed: f32,                     //           44      4     4
    forward: vec3<f32>,            //           48*    16    12
    fov: f32,                      //           60      4     4
    backgroundColor: vec4<f32>,    //           64*    16    16
    ambientColor: vec3<f32>,       //           80*    16    12
    tilesX : f32,                  //           92      4     4
    tilesY : f32,                  //           96*     4     4
    tileOffsetX : f32,             //          100      4     4
    tileOffsetY : f32,             //          104      4     4    
    aperture: f32,                 //          108      4     4
    _padding: vec3<f32>,           //          112*    16    12
    focusDistance: f32,            //          124      4     4
    multisample: f32,              //          128*     4     4
    cameraTypeId: f32,             //          132      4     4
    idSource: f32,                 //          136      4     4
}                                  // padding  140      4     4
                                   // -------------------------
                                   //                  16   144


// id   type
// ----------------
// 0    directional
// 1    disk
// 2    hemisphere
// 3    point
// 4    projector
// 5    rect
// 6    sphere
// 7    spot
                                   //       offest  align  size
struct Light {                     // -------------------------
    rotation: vec4<f32>,           //            0     16    16
    center: vec3<f32>,             //           16*    16    12
    typeId: f32,                   //           28      4     4
    size: vec3<f32>,               //           32*    16    12
    angle: f32,                    //           44      4     4
    color: vec3<f32>,              //           48*    16    12
    falloff: f32,                  //           60      4     4
    direction: vec3<f32>,          //           64*    16    12
    textureTypeId: f32,            //           76      4     4
    color2: vec3<f32>,             //           80*    16    12
    nearPlane: f32,                //           92      4     4
    texCoords: vec4<f32>,          //           96*    16    16
    texOffset: vec4<f32>,          //          112*    16    12
    texScale: vec4<f32>,           //          128*    16    12
}                                  // -------------------------
                                   //                  16   144

                                   //       offest  align  size
struct Hittable {                  // -------------------------
    center0: vec3<f32>,            //            0*    16    12
    typeId: f32,                   //           12      4     4
    size0: vec3<f32>,              //           16*    16    12
    rounding: f32,                 //           28      4     4
    rotation0: vec4<f32>,          //           32*    16    16
    materialTypeId: f32,           //           48*     4     4
    materialFuzz: f32,             //           52      4     4
    materialGloss: f32,            //           56      4     4
    materialDensity: f32,          //           60      4     4
    materialColor1: vec3<f32>,     //           64*    16    12
    materialRefractiveIndex: f32,  //           76      4     4
    segmentColor: vec4<f32>,       //           80*    16    16    
    pickColor: vec4<f32>,          //           96*    16    16
    texCoords: vec4<f32>,          //          112*    16    16
    texOffset: vec4<f32>,          //          128*    16    16
    texScale: vec4<f32>,           //          144*    16    16
    sdfBuffer: f32,                //          160*     4     4
    sdfHalo: f32,                  //          164      4     4
    textureTypeId: f32,            //          168      4     4
    _reserved: f32,                //          172      4     4
    parameter0: f32,               //          176*     4     4
    parameter1: f32,               //          180      4     4
    parameter2: f32,               //          184      4     4
    parameter3: f32,               //          188      4     4
    materialColor2: vec3<f32>,     //          192*    16    12
    _padding2: f32,                // padding  204      4     4
}                                  // -------------------------
                                   //                  16   208

                                   //       offest  align  size
struct LinearBVHNode {             // -------------------------
    center: vec3<f32>,             //            0*    16    12
    primitivesOffset: f32,         //           12      4     4
    size: vec3<f32>,               //           16*    16    12
    secondChildOffset: f32,        //           28      4     4
    nPrimitives: f32,              //           32*     4     4
    axis: f32,                     //           36      4     4
}                                  // padding   40      4     8
                                   // -------------------------
                                   //                  16    48

struct HittableBuffer {
    hittables: array<Hittable>,
}

struct LightBuffer {
    lights: array<Light>,
}

struct LinearBVHNodeBuffer {
    nodes: array<LinearBVHNode>,
}

fn rotateQuat(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
    return v + 2f * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

fn conjugate(q: vec4<f32>) -> vec4<f32> {
    return vec4<f32>(-q.x, -q.y, -q.z, q.w);
}

// Schlick's approximation for reflectance
fn reflectance(cos: f32, refractiveIndex: f32) -> f32 {
    var r = (1f - refractiveIndex) / (1f + refractiveIndex);
    r = r * r;
    return r + (1f - r) * pow(1f - cos, 5f);
}

fn refraction(direction: vec3<f32>, normal: vec3<f32>, etaiOverEtat: f32) -> vec3<f32> {
    let cosTheta = min(dot(-direction, normal), 1f);
    let rOutPerp =  etaiOverEtat * (direction + cosTheta * normal);
    let rOutParallel = -sqrt(abs(1f - dot(rOutPerp, rOutPerp))) * normal;
    return rOutPerp + rOutParallel;
}

fn getPerspectiveCamera(uniforms: Uniforms) -> Camera {
    var camera: Camera;
    camera.aperture = uniforms.aperture;
    camera.aspectRatio = uniforms.width / uniforms.height;
    camera.fov = uniforms.fov;
    camera.viewportHeight = 2f * tan(camera.fov * 0.5f);
    camera.viewportWidth = camera.aspectRatio * camera.viewportHeight;
    camera.origin = uniforms.position;
    camera.u = uniforms.right;
    camera.v = uniforms.up;
    camera.w = uniforms.forward;
    let focusDistance = uniforms.focusDistance;
    camera.horizontal = camera.u * camera.viewportWidth * focusDistance;
    camera.vertical = -camera.v * camera.viewportHeight * focusDistance;
    // Half-pixel offset
    let horizontal_pixel = camera.horizontal / uniforms.width;
    let vertical_pixel = camera.vertical / uniforms.height;
    camera.upperLeft = camera.origin - camera.horizontal * 0.5f - camera.vertical * 0.5f - camera.w * focusDistance + 0.5f * (horizontal_pixel + vertical_pixel);
    return camera;
}

fn getPerspectiveRay(camera: Camera, seed: ptr<function, u32>, texCoord: vec2<f32>) -> Ray {
    // Depth of field
    let rd = camera.aperture * randomInUnitDisk(seed);
    let offset = camera.u * rd.x + camera.v * rd.y;

    var ray: Ray;
    ray.origin = camera.origin + offset;
    ray.direction = normalize(camera.upperLeft + texCoord.x * camera.horizontal + texCoord.y * camera.vertical - ray.origin);
    return ray;
}

fn getCylindricalRay(camera: Camera, seed: ptr<function, u32>, texCoord: vec2<f32>) -> Ray {
    let theta = (texCoord.x - 0.5f) * TWO_PI; // [-pi, pi]
    let phi = (0.5f - texCoord.y) * PI; // [-pi/2, pi/2], flip y
    let scale = cos(phi);
    var ray: Ray;
    ray.origin = camera.origin;
    ray.direction = normalize(vec3<f32>(scale * sin(theta), sin(phi), -scale * cos(theta)));
    return ray;
}

fn random(seed: ptr<function, u32>) -> f32 {
    var random = ((*seed >> ((*seed >> 28u) + 4u)) ^ *seed) * 277803737u;
    random = (random >> 22u) ^ random;
    *seed = *seed * 747796405u + 2891336453u;
    return f32(random) / 4294967295f; // [0,1]
}

fn randomInUnitDisk(seed: ptr<function, u32>) -> vec2<f32> {
    let theta = TWO_PI * random(seed);
    let r = sqrt(random(seed));
    return vec2<f32>(r * cos(theta), r * sin(theta));
}

fn randomUnitVector(seed: ptr<function, u32>) -> vec3<f32> {
    let theta = TWO_PI * random(seed);
    let z = 2f * random(seed) - 1f;
    let r = sqrt(1f - z * z);
    return vec3<f32>(r * cos(theta), r * sin(theta), z);
}

fn rayAt(ray: Ray, t: f32) -> vec3<f32> {
    return ray.origin + ray.direction * t;
}

fn setFaceNormal(ray: Ray, outwardNormal: vec3<f32>, hitRecord: ptr<function, HitRecord>) {
    (*hitRecord).frontFace = dot(ray.direction, outwardNormal) < 0f;
    (*hitRecord).normal = select(-outwardNormal, outwardNormal, (*hitRecord).frontFace);
}

// Compute SDF normal and UV for the closest hit (deferred from intersection)
fn computeSdfNormalAndUV(ray: Ray, hitRecord: ptr<function, HitRecord>) {
    let id = (*hitRecord).id;
    let hittable = &hittableBuffer.hittables[id];
    let typeId = u32((*hittable).typeId);
    let center = (*hittable).center0;
    let rotation = (*hittable).rotation0;
    
    // For rotated variants, compute oc in object space
    let isRotated = typeId == 4u || typeId == 6u || typeId == 8u || typeId == 11u || typeId == 16u || typeId == 18u;
    let invRotation = conjugate(rotation);
    var oc: vec3<f32>;
    var localRay = ray;
    if (isRotated) {
        let objPos = rotateQuat((*hitRecord).position - center, invRotation);
        oc = objPos;
        localRay.direction = rotateQuat(ray.direction, invRotation);
    } else {
        oc = (*hitRecord).position - center;
    }

    var outwardNormal: vec3<f32>;
    let h = 0.000001f;
    let k = vec2<f32>(1f, -1f);

    // Normal via tetrahedron gradient
    switch typeId {
        case 3u, 4u: {
            // BoxFrame
            let r = (*hittable).rounding;
            let size = (*hittable).size0 * 0.5f;
            let e = (*hittable).parameter0 * size.x - r;
            outwardNormal = normalize(
                k.xyy * mapBoxFrameSdf(oc + k.xyy * h, size, e, r) +
                k.yyx * mapBoxFrameSdf(oc + k.yyx * h, size, e, r) +
                k.yxy * mapBoxFrameSdf(oc + k.yxy * h, size, e, r) +
                k.xxx * mapBoxFrameSdf(oc + k.xxx * h, size, e, r));
            // Box-face UV
            let maxN = max(abs(outwardNormal.x), max(abs(outwardNormal.y), abs(outwardNormal.z)));
            let uvSize = (*hittable).size0 / (*hittable).texScale.xyz;
            (*hitRecord).uv = fract(select(
                select(
                    vec2<f32>(1f, sign(outwardNormal.y)) * oc.xz / uvSize.xz + (*hittable).texOffset.xz,
                    vec2<f32>(-sign(outwardNormal.x), -1f) * oc.zy / uvSize.zy + (*hittable).texOffset.zy,
                    abs(outwardNormal.x) == maxN
                ),
                vec2<f32>(sign(outwardNormal.z), -1f) * oc.xy / uvSize.xy + (*hittable).texOffset.xy,
                abs(outwardNormal.z) == maxN
            ) + 0.5f);
        }
        case 5u, 6u: {
            // Box
            let r = (*hittable).rounding;
            let size = (*hittable).size0 * 0.5f - r;
            outwardNormal = normalize(
                k.xyy * mapBoxSdf(oc + k.xyy * h, size, r) +
                k.yyx * mapBoxSdf(oc + k.yyx * h, size, r) +
                k.yxy * mapBoxSdf(oc + k.yxy * h, size, r) +
                k.xxx * mapBoxSdf(oc + k.xxx * h, size, r));
            // Box-face UV with texcoord remapping
            let maxN = max(abs(outwardNormal.x), max(abs(outwardNormal.y), abs(outwardNormal.z)));
            let uvSize = (*hittable).size0 / (*hittable).texScale.xyz;
            var uv = fract(select(
                select(
                    vec2<f32>(1f, sign(outwardNormal.y)) * oc.xz / uvSize.xz + (*hittable).texOffset.xz,
                    vec2<f32>(-sign(outwardNormal.x), -1f) * oc.zy / uvSize.zy + (*hittable).texOffset.zy,
                    abs(outwardNormal.x) == maxN
                ),
                vec2<f32>(sign(outwardNormal.z), -1f) * oc.xy / uvSize.xy + (*hittable).texOffset.xy,
                abs(outwardNormal.z) == maxN
            ) + 0.5f);
            let texCoord0 = (*hittable).texCoords.xw;
            let texCoord1 = (*hittable).texCoords.zy;
            (*hitRecord).uv = texCoord0 + uv * (texCoord1 - texCoord0);
        }
        case 7u, 8u: {
            // CappedTorus
            let size = (*hittable).size0;
            let outerRadius = size.x * 0.5f;
            let innerRadius = (*hittable).parameter0 * outerRadius;
            let radius = (innerRadius + outerRadius) * 0.5f;
            let padding = (*hittable).parameter3 * outerRadius;
            let halfThickness = (outerRadius - innerRadius) * 0.5f + padding;
            let startAngle = (*hittable).parameter1;
            let endAngle = (*hittable).parameter2;
            outwardNormal = normalize(
                k.xyy * mapCappedTorusSdf(oc + k.xyy * h, startAngle, endAngle, radius, halfThickness, padding) +
                k.yyx * mapCappedTorusSdf(oc + k.yyx * h, startAngle, endAngle, radius, halfThickness, padding) +
                k.yxy * mapCappedTorusSdf(oc + k.yxy * h, startAngle, endAngle, radius, halfThickness, padding) +
                k.xxx * mapCappedTorusSdf(oc + k.xxx * h, startAngle, endAngle, radius, halfThickness, padding));
            (*hitRecord).uv = vec2<f32>(0f, 0f);
        }
        case 9u, 10u, 11u: {
            // Cylinder
            let size = (*hittable).size0 * 0.5f;
            let r1 = (*hittable).rounding;
            let r0 = size.x - r1;
            let h0 = size.y - r1;
            outwardNormal = normalize(
                k.xyy * mapCylinderSdf(oc + k.xyy * h, h0, r0, r1) +
                k.yyx * mapCylinderSdf(oc + k.yyx * h, h0, r0, r1) +
                k.yxy * mapCylinderSdf(oc + k.yxy * h, h0, r0, r1) +
                k.xxx * mapCylinderSdf(oc + k.xxx * h, h0, r0, r1));
            // Cylindrical UV
            let size1 = (*hittable).size0 / (*hittable).texScale.xyz;
            let angleY = dot(outwardNormal, vec3<f32>(0f, 1f, 0f));
            (*hitRecord).uv = fract(select(
                vec2<f32>(atan2(outwardNormal.x, outwardNormal.z) / TWO_PI * (*hittable).texScale.w + (*hittable).texOffset.w + 0.5f, 0.5f - oc.y / size1.y - (*hittable).texOffset.y),
                oc.xz / size1.xz + (*hittable).texOffset.xz + vec2<f32>(0.5f, 0.5f),
                angleY > ROOT_TWO_OVER_TWO
            ));
        }
        case 13u: {
            // HexPrism
            let r = (*hittable).rounding;
            let size = (*hittable).size0 * 0.5f;
            let hx = size.x - r;
            let hy = size.y - r;
            outwardNormal = normalize(
                k.xyy * mapHexPrismSdf(oc + k.xyy * h, hx, hy, r) +
                k.yyx * mapHexPrismSdf(oc + k.yyx * h, hx, hy, r) +
                k.yxy * mapHexPrismSdf(oc + k.yxy * h, hx, hy, r) +
                k.xxx * mapHexPrismSdf(oc + k.xxx * h, hx, hy, r));
            // Cylindrical UV (approximate)
            let size1 = (*hittable).size0 / (*hittable).texScale.xyz;
            let angleY = dot(outwardNormal, vec3<f32>(0f, 1f, 0f));
            let circle = normalize(vec2<f32>(oc.x, oc.z));
            (*hitRecord).uv = fract(select(
                vec2<f32>(atan2(circle.x, circle.y) / TWO_PI * (*hittable).texScale.w + (*hittable).texOffset.w + 0.5f, 0.5f - oc.y / size1.y - (*hittable).texOffset.y),
                oc.xz / size1.xz + (*hittable).texOffset.xz + vec2<f32>(0.5f, 0.5f),
                angleY > ROOT_TWO_OVER_TWO
            ));
        }
        case 14u: {
            // Quad
            let size = (*hittable).size0;
            let halfThickness = size.z * 0.5f;
            let a = (*hittable).parameter0;
            let b = (*hittable).parameter1;
            let c = (*hittable).parameter2;
            let d = (*hittable).parameter3;
            let halfWidth = size.x * 0.5f;
            let height = size.y;
            let halfHeight = height * 0.5f;
            let pa = vec2<f32>(-halfWidth, -halfHeight + a * height);
            let pb = vec2<f32>(-halfWidth, -halfHeight + b * height);
            let pc = vec2<f32>(halfWidth, -halfHeight + c * height);
            let pd = vec2<f32>(halfWidth, -halfHeight + d * height);
            outwardNormal = normalize(
                k.xyy * mapQuadSdf(oc + k.xyy * h, pa, pb, pd, pc, halfThickness) +
                k.yyx * mapQuadSdf(oc + k.yyx * h, pa, pb, pd, pc, halfThickness) +
                k.yxy * mapQuadSdf(oc + k.yxy * h, pa, pb, pd, pc, halfThickness) +
                k.xxx * mapQuadSdf(oc + k.xxx * h, pa, pb, pd, pc, halfThickness));
            (*hitRecord).uv = vec2<f32>(0f, 0f);
        }
        case 15u, 16u: {
            // Ring
            let size = (*hittable).size0;
            let outerRadius = size.x * 0.5f;
            let innerRadius = (*hittable).parameter0 * outerRadius;
            let radius = (innerRadius + outerRadius) * 0.5f;
            let padding = (*hittable).parameter3 * outerRadius;
            let halfThickness = (outerRadius - innerRadius) * 0.5f + padding;
            let startAngle = (*hittable).parameter1;
            let endAngle = (*hittable).parameter2;
            let rHeight = size.z * 0.5f + padding;
            outwardNormal = normalize(
                k.xyy * mapRingSdf(oc + k.xyy * h, startAngle, endAngle, radius, halfThickness, rHeight, padding) +
                k.yyx * mapRingSdf(oc + k.yyx * h, startAngle, endAngle, radius, halfThickness, rHeight, padding) +
                k.yxy * mapRingSdf(oc + k.yxy * h, startAngle, endAngle, radius, halfThickness, rHeight, padding) +
                k.xxx * mapRingSdf(oc + k.xxx * h, startAngle, endAngle, radius, halfThickness, rHeight, padding));
            (*hitRecord).uv = vec2<f32>(0f, 0f);
        }
        case 17u, 18u: {
            // Tube
            let size = (*hittable).size0 * 0.5f;
            let rounding = (*hittable).rounding;
            let outerr = size.x;
            let innerr = (*hittable).parameter0 * outerr;
            let e = size.y - rounding;
            let r = (outerr + innerr) * 0.5f;
            let th = outerr - innerr - rounding * 2f;
            let nh = 0.00001f; // Tube uses slightly larger epsilon for normal
            outwardNormal = normalize(
                k.xyy * mapTubeSdf(oc + k.xyy * nh, r, th, e, rounding) +
                k.yyx * mapTubeSdf(oc + k.yyx * nh, r, th, e, rounding) +
                k.yxy * mapTubeSdf(oc + k.yxy * nh, r, th, e, rounding) +
                k.xxx * mapTubeSdf(oc + k.xxx * nh, r, th, e, rounding));
            // Cylindrical UV
            let size1 = (*hittable).size0 / (*hittable).texScale.xyz;
            let angleY = dot(outwardNormal, vec3<f32>(0f, 1f, 0f));
            (*hitRecord).uv = fract(select(
                vec2<f32>(atan2(outwardNormal.x, outwardNormal.z) / TWO_PI * (*hittable).texScale.w + (*hittable).texOffset.w + 0.5f, 0.5f - oc.y / size1.y - (*hittable).texOffset.y),
                oc.xz / size1.xz + (*hittable).texOffset.xz + vec2<f32>(0.5f, 0.5f),
                angleY > ROOT_TWO_OVER_TWO
            ));
        }
        default: { return; }
    }

    // Set normal (rotate back for rotated variants)
    if (isRotated) {
        outwardNormal = rotateQuat(outwardNormal, rotation);
    }
    setFaceNormal(ray, outwardNormal, hitRecord);
}

fn hitBVH(ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> bool {
    var hitAnything = false;
    var closestSoFar = tMax;
    // Avoid division by zero (otherwise box hit, intersection returns true for rays with 0 in direction)
    let invDir = vec3<f32>(
        select(1f / ray.direction.x, LARGE_VALUE, ray.direction.x == 0f),
        select(1f / ray.direction.y, LARGE_VALUE, ray.direction.y == 0f),
        select(1f / ray.direction.z, LARGE_VALUE, ray.direction.z == 0f)
    );
    var tempHitRecord: HitRecord;
    var toVisitOffset = 0u;
    var currentNodeIndex = 0u;
    var nodesToVisit: array<u32, 64>;
    loop {
        let node = &linearBVHNodeBuffer.nodes[currentNodeIndex];
        // Check ray against BVH node
        if (intersectBox((*node).center, (*node).size, ray, invDir, tMin, closestSoFar)) {
            let nPrimitives = u32((*node).nPrimitives);
            if (nPrimitives > 0u) {
                let primitiveOffset = u32((*node).primitivesOffset);
                for (var i: u32 = 0u; i < nPrimitives; i++) {
                    let id = primitiveOffset + i;
                    if (hit(id, ray, invDir, tMin, closestSoFar, &tempHitRecord)) {
                        hitAnything = true;
                        closestSoFar = tempHitRecord.t;
                        tempHitRecord.id = id;
                    }
                }
                if (toVisitOffset == 0u) { break; }
                toVisitOffset--;
                currentNodeIndex = nodesToVisit[toVisitOffset];
            }
            else {
                // Put far BVH node on nodesToVisit stack, advance to near node
                if (ray.direction[u32((*node).axis)] < 0f) {
                   nodesToVisit[toVisitOffset] = currentNodeIndex + 1u;
                   currentNodeIndex = u32((*node).secondChildOffset);
                } else {
                   nodesToVisit[toVisitOffset] = u32((*node).secondChildOffset);
                   currentNodeIndex++;
                }
                toVisitOffset++;
            }
        }
        else {
            if (toVisitOffset == 0u) { break; }
            toVisitOffset--;
            currentNodeIndex = nodesToVisit[toVisitOffset];
        }
    }
    if (hitAnything) {
        tempHitRecord.previousPosition = (*hitRecord).position;
        tempHitRecord.previousIsAbsorbing = (*hitRecord).isAbsorbing;
        tempHitRecord.previousAbsorption = (*hitRecord).absorption;

        // Deferred SDF normal and UV calculation for the closest hit only
        let winnerTypeId = u32(hittableBuffer.hittables[tempHitRecord.id].typeId);
        if (winnerTypeId >= 3u && winnerTypeId <= 18u) {
            computeSdfNormalAndUV(ray, &tempHitRecord);
        }

        *hitRecord = tempHitRecord;
        return true;
    };
    return false;
}

fn hit(id: u32, ray: Ray, invDir: vec3<f32>, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    switch u32(hittableBuffer.hittables[id].typeId) {
        default: { return false; }
        case 0u: { return hitSphere(id, ray, tMin, tMax, hitRecord); }
        case 1u: { return hitBox(id, ray, invDir, tMin, tMax, hitRecord); }
        case 2u: { return hitRotatedBox(id, ray, tMin, tMax, hitRecord); }
        case 3u: { return hitBoxFrameSdf(id, ray, tMin, tMax, hitRecord); }
        case 4u: { return hitBoxFrameRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        case 5u: { return hitBoxSdf(id, ray, tMin, tMax, hitRecord); }
        case 6u: { return hitBoxRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        case 7u: { return hitCappedTorusSdf(id, ray, tMin, tMax, hitRecord); }
        case 8u: { return hitCappedTorusRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        case 9u, 10u: { return hitCylinderSdf(id, ray, tMin, tMax, hitRecord); }
        case 11u: { return hitCylinderRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        // TODO: Rotated hex prism variant (case 12u)
        case 13u: { return hitHexPrismSdf(id, ray, tMin, tMax, hitRecord); }
        case 14u: { return hitQuadSdf(id, ray, tMin, tMax, hitRecord); }
        case 15u: { return hitRingSdf(id, ray, tMin, tMax, hitRecord); }
        case 16u: { return hitRingRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        case 17u: { return hitTubeSdf(id, ray, tMin, tMax, hitRecord); }
        case 18u: { return hitTubeRotatedSdf(id, ray, tMin, tMax, hitRecord); }
        case 19u: { return hitXyRect(id, ray, tMin, tMax, hitRecord); }
        case 20u: { return hitXzRect(id, ray, tMin, tMax, hitRecord); }
        case 21u: { return hitYzRect(id, ray, tMin, tMax, hitRecord); }
        case 22u: { return hitXyGlyph(id, ray, tMin, tMax, hitRecord); }
        case 23u: { return hitRotatedXyGlyph(id, ray, tMin, tMax, hitRecord); }
    }
}

fn intersectBox(center: vec3<f32>, size: vec3<f32>, ray: Ray, invDir: vec3<f32>, tMin: f32, tMax: f32) -> bool {
    let oc = center - ray.origin;
    let n = invDir * oc;
    let k = abs(invDir) * size * 0.5f;
    let t0 = n - k;
    let t1 = n + k;
    let tNear = max(max(t0.x, t0.y), t0.z);
    let tFar = min(min(t1.x, t1.y), t1.z);
    if (tNear > tFar) { return false; }
    return tNear < tMax && tFar > 0f; // Must return true when inside box, even if closestSoFar is closer than far box intersection
}

fn hitSphere(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let sphere = &hittableBuffer.hittables[id];
    let radius = (*sphere).size0.x * 0.5f;
    let center = (*sphere).center0;
    let oc = ray.origin - center;
    let b = dot(oc, ray.direction);
    let c = dot(oc, oc) - radius * radius;
    var h = b * b - c;
    if (h < 0f) { return false; }
    h = sqrt(h);

    // Find the nearest root in range
    var root = -b - h;
    if (root < tMin || root > tMax) {
        root = -b + h;
        if (root < tMin || root > tMax) { return false; }
    }

    // Reduce precision error in t by ensuring hit position is on sphere surface
    let outwardNormal = normalize(ray.origin + ray.direction * root - center);
    setFaceNormal(ray, outwardNormal, hitRecord);
    (*hitRecord).position = center + outwardNormal * radius; // Snap to sphere surface for precision (works with internal reflection)
    (*hitRecord).t = root; // Not recalculated from snapped position; only used for closest-hit ordering

    // Texture coords
    let phi = atan2(outwardNormal.x, outwardNormal.z); // [-pi,pi]
    let theta = asin(outwardNormal.y); // [-pi/2, pi/2]
    (*hitRecord).uv = fract(vec2<f32>(phi / TWO_PI * (*sphere).texScale.x + (*sphere).texOffset.x + 0.5f, 0.5f - theta / PI * (*sphere).texScale.y - (*sphere).texOffset.y)); // Invert y
    return true;
}

fn hitBox(id: u32, ray: Ray, invDir: vec3<f32>, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let box = &hittableBuffer.hittables[id];
    let center = (*box).center0;
    let size = (*box).size0 * 0.5f;
    let oc = center - ray.origin;
    let n = invDir * oc;
    let k = abs(invDir) * size;
    let t1 = n - k;
    let t2 = n + k;
    let tNear = max(max(t1.x, t1.y), t1.z);
    let tFar = min(min(t2.x, t2.y), t2.z);
    if (tNear > tFar || tFar < 0f) { return false; }

    // Find nearest root in range
    var outwardNormal: vec3<f32>;
    var root = tNear;
    if (root < tMin || root > tMax) {
        root = tFar;
        if (root < tMin || root > tMax) { return false; }
        outwardNormal = sign(ray.direction) * step(t2.xyz, t2.yzx) * step(t2.xyz, t2.zxy);
    }
    else {
        outwardNormal = -sign(ray.direction) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
    }

    (*hitRecord).t = root;
    (*hitRecord).position = rayAt(ray, root);
    setFaceNormal(ray, outwardNormal, hitRecord);

    // Texture coords
    // Intersection point in model space
    let p = (*hitRecord).position - center;
    let size0 = (*box).size0 / (*box).texScale.xyz;
    let uv: vec2<f32> = 
    select(
        select(
            vec2<f32>(1f, sign(outwardNormal.y)) * p.xz / size0.xz + (*box).texOffset.xz,
            vec2<f32>(-sign(outwardNormal.x), -1f) * p.zy / size0.zy + (*box).texOffset.zy,
            abs(outwardNormal.x) == 1f
        ),
        vec2<f32>(sign(outwardNormal.z), -1f) * p.xy / size0.xy + (*box).texOffset.xy,
        abs(outwardNormal.z) == 1f
    );
    (*hitRecord).uv = fract(uv + 0.5f);
    return true;
}

fn hitRotatedBox(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let boxRotated = &hittableBuffer.hittables[id];
    let center = (*boxRotated).center0;
    let rotation = (*boxRotated).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let rotatedInvDir = vec3<f32>(1f, 1f, 1f) / rotatedRay.direction;
    let hit = hitBox(id, rotatedRay, rotatedInvDir, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        (*hitRecord).normal = rotateQuat((*hitRecord).normal, rotation);
        return true;
    }
    return false;
}

fn hitXyGlyph(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let xyRect = &hittableBuffer.hittables[id];
    
    // Distance to plane, t
    let oc = ray.origin - (*xyRect).center0;
    let t = -oc.z / ray.direction.z;

    // If direction == 0, t = +/- infinity, which always returns false
    if (t < tMin || t > tMax) { return false; }

    // Intersection point in model space
    let p = oc + t * ray.direction;

    // Bounds
    let size = (*xyRect).size0;
    if (abs(p.x) > size.x * 0.5f || abs(p.y) > size.y * 0.5) { return false; }

    // Texture coords
    var uv = vec2<f32>(p.xy / size.xy + vec2<f32>(0.5f, 0.5f));
    let texCoord0 = (*xyRect).texCoords.xw;
    let texCoord1 = (*xyRect).texCoords.zy;
    uv = texCoord0 + uv * (texCoord1 - texCoord0);

    // Sample sdf
    let edgeValue = (*xyRect).sdfBuffer;
    let distance = textureSampleLevel(atlasTexture, linearSampler, uv, 0f).r * 0xff;
    let border = (*xyRect).sdfHalo;
    if (distance < edgeValue - border) { return false; }

    // Encode border hit into u
    (*hitRecord).uv[0] = select(0f, 1f, distance < edgeValue);
    (*hitRecord).t = t;
    (*hitRecord).position = rayAt(ray, t);
    let outwardNormal = vec3<f32>(0f, 0f, 1f);
    setFaceNormal(ray, outwardNormal, hitRecord);
    return true;
}

fn hitRotatedXyGlyph(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let rotatedXyGlyph = &hittableBuffer.hittables[id];
    let center = (*rotatedXyGlyph).center0;
    let rotation = (*rotatedXyGlyph).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitXyGlyph(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        (*hitRecord).normal = rotateQuat((*hitRecord).normal, rotation);
        return true;
    }
    return false;
}

fn mapTubeSdf(p: vec3<f32>, r: f32, th: f32, h: f32, rounding: f32) -> f32 {
    // Annular circle
    let d = abs(length(p.xz) - r) - th * 0.5f;
    
    // Extrude
    let w = vec2<f32>(d, abs(p.y) - h);
  	return min(max(w.x, w.y), 0f) + length(max(w, vec2<f32>(0f, 0f))) - rounding;
}

fn hitTubeSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let tubeSdf = &hittableBuffer.hittables[id];
    let center = (*tubeSdf).center0;
    let size = (*tubeSdf).size0 * 0.5f;
    var t = tMin;
    let rounding = (*tubeSdf).rounding;
    let outerr = size.x;
    let innerr = (*tubeSdf).parameter0 * outerr;
    let e = size.y - rounding;
    let r = (outerr + innerr) * 0.5f;
    let th = outerr - innerr - rounding * 2f;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapTubeSdf(oc, r, th, e, rounding));
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitTubeRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let tubeRotatedSdf = &hittableBuffer.hittables[id];
    let center = (*tubeRotatedSdf).center0;
    let rotation = (*tubeRotatedSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitTubeSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn mapBoxFrameSdf(p: vec3<f32>, b: vec3<f32>, e: f32, r: f32) -> f32 {
    let s = abs(p) - b + r;
    let q = abs(s + e) - e;
    return min(min(
      length(max(vec3<f32>(s.x, q.y, q.z), vec3<f32>(0f, 0f, 0f))) + min(max(s.x, max(q.y,q.z)), 0f),
      length(max(vec3<f32>(q.x, s.y, q.z), vec3<f32>(0f, 0f, 0f))) + min(max(q.x, max(s.y,q.z)), 0f)),
      length(max(vec3<f32>(q.x, q.y, s.z), vec3<f32>(0f, 0f, 0f))) + min(max(q.x, max(q.y,s.z)), 0f)) - r;
}

fn hitBoxFrameSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let boxFrameSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let center = (*boxFrameSdf).center0;
    let r = (*boxFrameSdf).rounding;
    let size = (*boxFrameSdf).size0 * 0.5f;
    let e = (*boxFrameSdf).parameter0 * size.x - r; // Thickness in size units
    for (var i: u32 = 0u; i < 128u; i++) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapBoxFrameSdf(oc, size, e, r));
        t += distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitBoxFrameRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let rotatedBoxFrameSdf = &hittableBuffer.hittables[id];
    let center = (*rotatedBoxFrameSdf).center0;
    let rotation = (*rotatedBoxFrameSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitBoxFrameSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn mapBoxSdf(p: vec3<f32>, b: vec3<f32>, r: f32) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3<f32>(0f, 0f, 0f))) + min(max(q.x, max(q.y, q.z)), 0f) - r;
}

fn hitBoxSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let boxSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let r = (*boxSdf).rounding;
    let size = (*boxSdf).size0 * 0.5f - r;
    let center = (*boxSdf).center0;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapBoxSdf(oc, size, r)); // abs handles rays starting inside the SDF
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitBoxRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let rotatedBoxSdf = &hittableBuffer.hittables[id];
    let center = (*rotatedBoxSdf).center0;
    let rotation = (*rotatedBoxSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitBoxSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn mapCappedTorusSdf(p: vec3<f32>, start: f32, end: f32, ra: f32, th: f32, padding: f32) -> f32 {
    // Rotate around z-axis
    let mid = (start + end) * 0.5f;
    let sinmid = sin(mid);
    let cosmid = cos(mid);
    let py = -p.y;
    let p2 = vec3<f32>(abs(p.x * cosmid + py * sinmid), p.x * sinmid - py * cosmid, p.z);

    let a = (end - start) * 0.5f - PI * 1.5f; // Angle in radians
    let sc = vec2<f32>(cos(a), -sin(a));
    let n = vec2(sc.y, -sc.x);
    let w = dot(p2.xy - sc * ra, n);
    return max(-w, sqrt(dot(p2, p2) + ra * ra - 2f * ra * length(p2.xy)) - th) + padding;
}

fn hitCappedTorusSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let cappedTorusSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let center = (*cappedTorusSdf).center0;
    let size = (*cappedTorusSdf).size0;
    let outerRadius = size.x * 0.5f;
    let innerRadius = (*cappedTorusSdf).parameter0 * outerRadius;
    let radius = (innerRadius + outerRadius) * 0.5f;
    let padding = (*cappedTorusSdf).parameter3 * outerRadius;
    let halfThickness = (outerRadius - innerRadius) * 0.5f + padding;
    let startAngle = (*cappedTorusSdf).parameter1;
    let endAngle = (*cappedTorusSdf).parameter2;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapCappedTorusSdf(oc, startAngle, endAngle, radius, halfThickness, padding)); 
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitCappedTorusRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let cappedTorusRotatedSdf = &hittableBuffer.hittables[id];
    let center = (*cappedTorusRotatedSdf).center0;
    let rotation = (*cappedTorusRotatedSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitCappedTorusSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn mapCylinderSdf(p: vec3<f32>, h: f32, r0: f32, r1: f32) -> f32 {
    let d = abs(vec2<f32>(length(p.xz), p.y)) - vec2<f32>(r0, h);
    return min(max(d.x, d.y), 0f) + length(max(d, vec2<f32>(0f, 0f))) - r1;
}

fn hitCylinderSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let cylinderSdf = &hittableBuffer.hittables[id];
    let center = (*cylinderSdf).center0;
    let size = (*cylinderSdf).size0 * 0.5f;
    var t = tMin;
    let r1 = (*cylinderSdf).rounding;
    let r0 = size.x - r1;
    let h0 = size.y - r1;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapCylinderSdf(oc, h0, r0, r1));
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitCylinderRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let rotatedCylinderSdf = &hittableBuffer.hittables[id];
    let center = (*rotatedCylinderSdf).center0;
    let rotation = (*rotatedCylinderSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitCylinderSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn mapHexPrismSdf(p: vec3<f32>, hx: f32, hy: f32, r: f32) -> f32 {
    let k = vec3<f32>(-0.8660254f, 0.5f, 0.57735f);
    var p0 = abs(p.zxy);
    let p1 = p0.xy - 2f * min(dot(k.xy, p0.xy), 0f) * k.xy;
    let d = vec2<f32>(length(p1.xy - vec2(clamp(p1.x, -k.z * hx, k.z * hx), hx)) * sign(p1.y - hx), p0.z - hy);
    return min(max(d.x, d.y), 0f) + length(max(d, vec2<f32>(0f, 0f))) - r;
}

fn hitHexPrismSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let hexPrismSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let r = (*hexPrismSdf).rounding;
    let size = (*hexPrismSdf).size0 * 0.5f;
    let center = (*hexPrismSdf).center0;
    let hx = size.x - r;
    let hy = size.y - r;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapHexPrismSdf(oc, hx, hy, r));
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn mapQuadSdf(p: vec3<f32>, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, e: f32) -> f32 {
    let e0 = p1 - p0; let v0 = p.xy - p0;
	let e1 = p2 - p1; let v1 = p.xy - p1;
	let e2 = p3 - p2; let v2 = p.xy - p2;
	let e3 = p0 - p3; let v3 = p.xy - p3;
	let d0 = dot(e0, e0); let d1 = dot(e1, e1); let d2 = dot(e2, e2); let d3 = dot(e3, e3);
	let pq0 = v0 - e0 * clamp(dot(v0, e0) / max(d0, EPSILON), 0f, 1f);
	let pq1 = v1 - e1 * clamp(dot(v1, e1) / max(d1, EPSILON), 0f, 1f);
	let pq2 = v2 - e2 * clamp(dot(v2, e2) / max(d2, EPSILON), 0f, 1f);
    let pq3 = v3 - e3 * clamp(dot(v3, e3) / max(d3, EPSILON), 0f, 1f);
    // When an edge is degenerate (two corners coincide), its cross product is always 0,
    // which poisons the min-based winding test. Replace with a large positive sentinel
    // so degenerate edges don't affect inside/outside classification.
    let c0 = select(v0.x * e0.y - v0.y * e0.x, LARGE_VALUE, d0 < EPSILON);
    let c1 = select(v1.x * e1.y - v1.y * e1.x, LARGE_VALUE, d1 < EPSILON);
    let c2 = select(v2.x * e2.y - v2.y * e2.x, LARGE_VALUE, d2 < EPSILON);
    let c3 = select(v3.x * e3.y - v3.y * e3.x, LARGE_VALUE, d3 < EPSILON);
    let ds = vec2<f32>(min(min(vec2<f32>(dot(pq0, pq0), c0),
                               vec2<f32>(dot(pq1, pq1), c1)),
                           min(vec2<f32>(dot(pq2, pq2), c2),
                               vec2<f32>(dot(pq3, pq3), c3))));
    let d = select(sqrt(ds.x), -sqrt(ds.x), ds.y > 0f);
    
    // Extrude
    let w = vec2<f32>(d, abs(p.z) - e);
  	return min(max(w.x, w.y), 0f) + length(max(w, vec2<f32>(0f, 0f)));
}

fn hitQuadSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let quadSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let size = (*quadSdf).size0;
    let center = (*quadSdf).center0;
    let halfThickness = size.z * 0.5f;
    let a = (*quadSdf).parameter0;
    let b = (*quadSdf).parameter1;
    let c = (*quadSdf).parameter2;
    let d = (*quadSdf).parameter3;
    let halfWidth = size.x * 0.5f;
    let height = size.y;
    let halfHeight = height * 0.5f;
    let pa = vec2<f32>(-halfWidth, -halfHeight + a * height);
    let pb = vec2<f32>(-halfWidth, -halfHeight + b * height);
    let pc = vec2<f32>(halfWidth, -halfHeight + c * height);
    let pd = vec2<f32>(halfWidth, -halfHeight + d * height);
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapQuadSdf(oc, pa, pb, pd, pc, halfThickness));
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
    
}

fn mapRingSdf(p: vec3<f32>, start: f32, end: f32, ra: f32, th: f32, h: f32, padding: f32) -> f32 {
    // Rotate around z-axis
    let mid = (start + end) * 0.5f;
    let sinmid = sin(mid);
    let cosmid = cos(mid);
    let py = -p.y;
    let p2 = vec3<f32>(abs(p.x * cosmid + py * sinmid), p.x * sinmid -py * cosmid, p.z);
    
    let a = (end - start) * 0.5f;
    let n = vec2<f32>(cos(a), sin(a));
    
    // Column-major
    let p3 = vec2<f32>(n.x * p2.x - n.y * p2.y, n.y * p2.x + n.x * p2.y);
    let d = max(abs(length(p3) - ra) - th, length(vec2<f32>(p3.x, max(0f, abs(ra - p3.y) - th))) * sign(p3.x));

    // Extrude
    let w = vec2<f32>(d, abs(p2.z) - h);
  	return min(max(w.x, w.y), 0f) + length(max(w, vec2<f32>(0f, 0f))) + padding;
}

fn hitRingSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let ringSdf = &hittableBuffer.hittables[id];
    var t = tMin;
    let center = (*ringSdf).center0;
    let size = (*ringSdf).size0;
    let outerRadius = size.x * 0.5f;
    let innerRadius = (*ringSdf).parameter0 * outerRadius;
    let radius = (innerRadius + outerRadius) * 0.5f;
    let padding = (*ringSdf).parameter3 * outerRadius;
    let halfThickness = (outerRadius - innerRadius) * 0.5f + padding;
    let startAngle = (*ringSdf).parameter1;
    let endAngle = (*ringSdf).parameter2;
    let height = size.z * 0.5f + padding;
    for (var i: u32 = 0u; i < 128u; i = i + 1u) {
        let position = rayAt(ray, t);
        let oc = position - center;
        let distance = abs(mapRingSdf(oc, startAngle, endAngle, radius, halfThickness, height, padding));
        t = t + distance;
        if (t > tMax) { return false; }
        if (distance < 0.000001f) {
            (*hitRecord).t = t;
            (*hitRecord).position = rayAt(ray, t);
            return true;
        }
    }
    return false;
}

fn hitRingRotatedSdf(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let ringRotatedSdf = &hittableBuffer.hittables[id];
    let center = (*ringRotatedSdf).center0;
    let rotation = (*ringRotatedSdf).rotation0;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    let hit = hitRingSdf(id, rotatedRay, tMin, tMax, hitRecord);
    if (hit) {
        (*hitRecord).position = rotateQuat((*hitRecord).position - center, rotation) + center;
        return true;
    }
    return false;
}

fn hitXyRect(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let xyRect = &hittableBuffer.hittables[id];
    let oc = ray.origin - (*xyRect).center0;

    // Distance to plane, t
    let t = -oc.z / ray.direction.z;

    // If direction == 0, t = +/- infinity, which always returns false
    if (t < tMin || t > tMax) { return false; }

    // Intersection point in model space
    let p = oc + t * ray.direction;

    // Bounds
    let size = (*xyRect).size0;
    if (abs(p.x) > size.x * 0.5f || abs(p.y) > size.y * 0.5f) { return false; }

    // Texture coords
    let size0 = size / (*xyRect).texScale.xyz;
    var uv = fract(vec2<f32>(p.xy / size0.xy + (*xyRect).texOffset.xy + vec2<f32>(0.5f, 0.5f)));
    let texCoord0 = (*xyRect).texCoords.xw;
    let texCoord1 = (*xyRect).texCoords.zy;
    uv = texCoord0 + uv * (texCoord1 - texCoord0);
    (*hitRecord).uv = uv;
    (*hitRecord).t = t;
    (*hitRecord).position = rayAt(ray, t);
    let outwardNormal = vec3<f32>(0f, 0f, 1f);
    setFaceNormal(ray, outwardNormal, hitRecord);
    return true;
}

fn hitXzRect(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let xzRect = &hittableBuffer.hittables[id];
    let oc = ray.origin - (*xzRect).center0;

    // Distance to plane, t
    let t = -oc.y / ray.direction.y;

    // If direction == 0, t = +/- infinity, which always returns false
    if (t < tMin || t > tMax) { return false; }

    // Intersection point in model space
    let p = oc + t * ray.direction;

    // Bounds
    let size = (*xzRect).size0;
    if (abs(p.x) > size.x * 0.5f || abs(p.z) > size.z * 0.5f) { return false; }

    // Texture coords
    let size0 = size / (*xzRect).texScale.xyz;
    var uv = fract(vec2<f32>(p.xz / size0.xz + (*xzRect).texOffset.xz + vec2<f32>(0.5f, 0.5f)));
    let texCoord0 = (*xzRect).texCoords.xw;
    let texCoord1 = (*xzRect).texCoords.zy;
    uv = texCoord0 + uv * (texCoord1 - texCoord0);
    (*hitRecord).uv = uv;
    (*hitRecord).t = t;
    (*hitRecord).position = rayAt(ray, t);
    let outwardNormal = vec3<f32>(0f, 1f, 0f);
    setFaceNormal(ray, outwardNormal, hitRecord);
    return true;
}

fn hitYzRect(id: u32, ray: Ray, tMin: f32, tMax: f32, hitRecord: ptr<function, HitRecord>) -> bool {
    let yzRect = &hittableBuffer.hittables[id];
    let oc = ray.origin - yzRect.center0;

    // Distance to plane, t
    let t = -oc.x / ray.direction.x;

    // If direction == 0, t = +/- infinity, which always returns false
    if (t < tMin || t > tMax) { return false; }

    // Intersection point in model space
    let p = oc + t * ray.direction;

    // Bounds
    let size = (*yzRect).size0;
    if (abs(p.y) > size.y * 0.5f || abs(p.z) > size.z * 0.5f) { return false; }

    // Texture coords
    let size0 = size / (*yzRect).texScale.xyz;
    var uv = fract(vec2<f32>(p.zy / size0.zy + (*yzRect).texOffset.zy + vec2<f32>(0.5f, 0.5f)));
    let texCoord0 = (*yzRect).texCoords.xw;
    let texCoord1 = (*yzRect).texCoords.zy;
    uv = texCoord0 + uv * (texCoord1 - texCoord0);
    (*hitRecord).uv = uv;
    (*hitRecord).t = t;
    (*hitRecord).position = rayAt(ray, t);
    let outwardNormal = vec3<f32>(1f, 0f, 0f);
    setFaceNormal(ray, outwardNormal, hitRecord);
    return true;
}

fn hitLights(ray: Ray, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> vec3<f32> {
    var hit: bool;
    var color = vec3<f32>(0f, 0f, 0f);
    for (var i: u32 = 0u; i < arrayLength(&lightBuffer.lights); i++) {
        let light = lightBuffer.lights[i];
        let lightTypeId = u32(light.typeId);

        // TODO: Split into separate direct and indirect functions
        switch lightTypeId {
            // Direct lighting
            case 0u: {
                if (hitDirectionalLight(i, ray, &color, hitRecord, seed)) { hit = true; }
            }
            case 3u: {
                if (hitPointLight(i, ray, &color, hitRecord, seed)) { hit = true; }
            }
            case 4u: {
                if (hitProjectorLight(i, ray, &color, hitRecord, seed)) { hit = true; }
            }
            case 7u: {
                if (hitSpotLight(i, ray, &color, hitRecord, seed)) { hit = true; }
            }
        
            // Indirect lighting
            case 5u: {
                if (hitRectLight(i, ray, &color, hitRecord)) { hit = true; }
            }
            case 6u: {
                if (hitSphereLight(i, ray, &color, hitRecord)) { hit = true; }
            }
            default: {}
        }
    }

    if (hit) {
      // If projector light returns black (e.g. from image or checkerboard), use ambient color
      return max(uniforms.ambientColor, color);
    }

    return uniforms.ambientColor;
}


fn hitRectLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>) -> bool {
    let rotatedXyRect = &lightBuffer.lights[id];
    let center = (*rotatedXyRect).center;
    let rotation = (*rotatedXyRect).rotation;
    let invRotation = conjugate(rotation);
    var rotatedRay: Ray;
    rotatedRay.origin = rotateQuat(ray.origin - center, invRotation) + center;
    rotatedRay.direction = rotateQuat(ray.direction, invRotation);
    if (dot(rotatedRay.direction, vec3<f32>(0f, 0f, 1f)) > 0f) { return false; } // Front face only
    let oc = rotatedRay.origin - center;
    let t = -oc.z / rotatedRay.direction.z;
    if (t < 0f) { return false; }
    let p = oc + t * rotatedRay.direction;
    if (abs(p.x) > (*rotatedXyRect).size.x * 0.5f || abs(p.y) > (*rotatedXyRect).size.y * 0.5f) { return false; }
    *color += (*rotatedXyRect).color;
    return true;
}

fn hitSphereLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>) -> bool {
    let sphere = &lightBuffer.lights[id];
    let radius = (*sphere).size.x * 0.5f;
    let oc = ray.origin - (*sphere).center;
    let b = dot(oc, ray.direction);
    let c = dot(oc, oc) - radius * radius;
    var h = b * b - c;
    if (h < 0f) { return false; }
    if (b < 0f) { return false; } // Ensure ray towards light
    *color += (*sphere).color;
    return true;
}

fn hitDirectionalLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> bool {
    let light = &lightBuffer.lights[id];
    let direction = -(*light).direction; // Direction from hit point to light
    var shadowRay: Ray;
    shadowRay.origin = (*hitRecord).position;
    shadowRay.direction = direction;
    var shadowHitRecord: HitRecord;
    if (!hitBVH(shadowRay, 0.00001f, 100f, &shadowHitRecord, seed)) {
        // Diffuse
        // Direct lighting pass assumes lambertian reflectance
        let hittable = &hittableBuffer.hittables[(*hitRecord).id];
        // Get fuzz (diffuse materials have a fuzz of 1)
        // TODO: Reject random samples based on gloss (applies to all direct light functions)
        let fuzz = select(hittable.materialFuzz, 1f, hittable.materialTypeId == 0f);
        let diffuseIntensity = clamp(dot((*hitRecord).normal, direction), 0f, 1f) * fuzz;
        *color += diffuseIntensity * (*light).color;
        // Ignore specular reflection
        return true;
    }
    return false;
}

fn hitPointLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> bool {
    let light = &lightBuffer.lights[id];
    var direction = (*light).center - (*hitRecord).position;
    let distance = length(direction);
    direction = direction / distance;
    var shadowRay: Ray;
    shadowRay.origin = (*hitRecord).position;
    shadowRay.direction = direction;
    var shadowHitRecord: HitRecord;
    if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, seed)) {
        // Diffuse
        // Direct lighting pass assumes lambertian reflectance
        let hittable = &hittableBuffer.hittables[(*hitRecord).id];
        // Get fuzz (diffuse materials have a fuzz of 1)
        let fuzz = select(hittable.materialFuzz, 1f, hittable.materialTypeId == 0f);
        let diffuseIntensity = clamp(dot((*hitRecord).normal, direction), 0f, 1f) * fuzz;
        // TODO: Distance attenuation using light range: 1 / (1 + (distance / range)^2) (applies to point and spot lights)
        *color += diffuseIntensity * (*light).color;
        // Ignore specular reflection
        return true;
    }
    return false;
}

fn hitProjectorLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> bool {
    let light = &lightBuffer.lights[id];
    let center = (*light).center;
    var direction = center - (*hitRecord).position;
    let distance = length(direction);
    direction = direction / distance;
    var shadowRay: Ray;
    shadowRay.origin = (*hitRecord).position;
    shadowRay.direction = direction;
    var shadowHitRecord: HitRecord;
    if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, seed)) {
        // Calculate the position and size of the near plane
        let nearPlane = (*light).nearPlane;
        let nearPlaneCenter = center + (*light).direction * nearPlane;

        var size: vec2<f32>;
        size.y = 2f * nearPlane * tan((*light).angle * 0.5f);
        // Get light aspect ratio from size.x
        let aspectRatio = (*light).size.x;
        size.x = size.y * aspectRatio;

        // Get the near plane intersection point
        let rotation = (*light).rotation;
        let invRotation = conjugate(rotation);

        // xy rectangle intersection
        var rotatedRay: Ray;
        rotatedRay.origin = rotateQuat((*hitRecord).position - nearPlaneCenter, invRotation) + nearPlaneCenter;
        rotatedRay.direction = rotateQuat(direction, invRotation);
        if (dot(rotatedRay.direction, vec3<f32>(0f, 0f, 1f)) > 0f) { return false; } // Front face only
        let oc = rotatedRay.origin - nearPlaneCenter;
        let t = -oc.z / rotatedRay.direction.z;
        if (t < 0f) { return false; }
        let p = oc + t * rotatedRay.direction;
        if (abs(p.x) > size.x * 0.5f || abs(p.y) > size.y * 0.5f) { return false; }
        var uv = fract(vec2<f32>(p.xy / size.xy * (*light).texScale.xy + (*light).texOffset.xy + vec2<f32>(0.5f, 0.5f)));
        
        // Diffuse
        // Direct lighting pass assumes lambertian reflectance
        let hittable = &hittableBuffer.hittables[(*hitRecord).id];
        // Get fuzz (diffuse materials have a fuzz of 1)
        let fuzz = select(hittable.materialFuzz, 1f, hittable.materialTypeId == 0f);
        let diffuseIntensity = clamp(dot((*hitRecord).normal, direction), 0f, 1f) * fuzz;
        switch u32((*light).textureTypeId) {
            case 1u: {
                // 2D checkerboard
                uv *= 2f; // 2 squares per axis for uv [0,1]
                *color += diffuseIntensity * mix((*light).color, (*light).color2, (floor(uv.x) + floor(uv.y)) % 2f);
            }
            case 2u: {
                // Image
                let texCoord0 = (*light).texCoords.xw;
                let texCoord1 = (*light).texCoords.zy;
                uv = texCoord0 + uv * (texCoord1 - texCoord0);
                *color += diffuseIntensity * (*light).color * textureSampleLevel(backgroundTexture, linearSampler, fract(uv), 0f).rgb;
            }
            default: {
                // No texture
                *color += diffuseIntensity * (*light).color;
            }
        }
        
        // Ignore specular reflection
        return true;
    }
    return false;
}

fn hitSpotLight(id: u32, ray: Ray, color: ptr<function, vec3<f32>>, hitRecord: ptr<function, HitRecord>, seed: ptr<function, u32>) -> bool {
    let light = &lightBuffer.lights[id];
    var direction = (*light).center - (*hitRecord).position;
    let distance = length(direction);
    direction = direction / distance;
    var shadowRay: Ray;
    shadowRay.origin = (*hitRecord).position;
    shadowRay.direction = direction;
    var shadowHitRecord: HitRecord;
    if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, seed)) {
        // Get angle to light direction
        // Check if within light cone
        let cosAngle = dot(-direction, light.direction);
        let cosOuter = cos(light.angle * 0.5f);
        var attenuation = 0f;
        if (cosAngle > cosOuter) {
            // Remap [cosOuter..1] to [0..1] for smooth edge falloff
            let remap = (cosAngle - cosOuter) / (1f - cosOuter);
            attenuation = select(pow(remap, light.falloff), 1f, light.falloff == 0f);
        }

        // Diffuse
        // Direct lighting pass assumes lambertian reflectance
        let hittable = &hittableBuffer.hittables[(*hitRecord).id];
        // Get fuzz (diffuse materials have a fuzz of 1)
        let fuzz = select(hittable.materialFuzz, 1f, hittable.materialTypeId == 0f);
        let diffuseIntensity = clamp(dot((*hitRecord).normal, direction), 0f, 1f) * fuzz;
        *color += diffuseIntensity * (*light).color * attenuation;
        
        // Ignore specular reflection
        return true;
    }
    return false;
}

fn nearZero(v: vec3<f32>) -> bool {
    return max(max(abs(v.x), abs(v.y)), abs(v.z)) < EPSILON;
}

fn scatterLambertian(ray: ptr<function, Ray>, hitRecord: ptr<function, HitRecord>, attenuation: ptr<function, vec3<f32>>, seed: ptr<function, u32>) -> bool {
    let scatterDirection = (*hitRecord).normal + randomUnitVector(seed);

    // Catch degenerate scatter direction
    (*ray).direction = select(normalize(scatterDirection), (*hitRecord).normal, nearZero(scatterDirection));

    // TODO: General approach to avoid self-intersection
    (*ray).origin = (*hitRecord).position + (*ray).direction * 0.0001f;
    
    (*attenuation) = textureValue(hitRecord);
    return true;
}

fn scatterMetal(ray: ptr<function, Ray>, hitRecord: ptr<function, HitRecord>, attenuation: ptr<function, vec3<f32>>, seed: ptr<function, u32>) -> bool {
    let fuzz = hittableBuffer.hittables[(*hitRecord).id].materialFuzz;
    (*ray).direction = normalize(reflect((*ray).direction, (*hitRecord).normal) + fuzz * randomUnitVector(seed));

    (*ray).origin = (*hitRecord).position + (*ray).direction * 0.0001f; // Offset to avoid self-intersection
    
    (*attenuation) = textureValue(hitRecord);

    // Absorb any rays which fuzz scatters below the surface
    return dot((*ray).direction, (*hitRecord).normal) > 0f;
}

fn scatterDielectric(ray: ptr<function, Ray>, hitRecord: ptr<function, HitRecord>, attenuation: ptr<function, vec3<f32>>, seed: ptr<function, u32>) -> bool {
    let hittable = hittableBuffer.hittables[hitRecord.id];
    let refractiveIndex = hittable.materialRefractiveIndex;
    // TODO: If still inside another material, use its refractive index
    let refractionRatio = select(refractiveIndex, 1f / refractiveIndex, (*hitRecord).frontFace);
    let cosTheta = min(dot(-(*ray).direction, (*hitRecord).normal), 1f);
    let sinTheta = sqrt(1f - cosTheta * cosTheta);
    let cannotRefract = refractionRatio * sinTheta > 1f;
    if (cannotRefract || reflectance(cosTheta, refractionRatio) * hittable.materialGloss > random(seed)) {
        (*ray).direction = reflect((*ray).direction, (*hitRecord).normal);
    }
    else {
        (*ray).direction = refraction((*ray).direction, (*hitRecord).normal, refractionRatio);
    }
    (*ray).direction = normalize((*ray).direction + hittable.materialFuzz * randomUnitVector(seed));
    (*ray).origin = (*hitRecord).position + (*ray).direction * 0.0001f; // Offset to avoid self-intersection
    (*attenuation) = vec3<f32>(1f, 1f, 1f);

    // Did the ray enter or stay inside the material?
    if (dot((*ray).direction, select(-(*hitRecord).normal, (*hitRecord).normal, (*hitRecord).frontFace)) < 0f) {
        (*hitRecord).isAbsorbing = true;
        (*hitRecord).absorption = hittable.materialColor1 * hittable.materialDensity;
    }
    return true;
}

fn scatterGlossy(ray: ptr<function, Ray>, hitRecord: ptr<function, HitRecord>, attenuation: ptr<function, vec3<f32>>, seed: ptr<function, u32>) -> bool {
    // Specular
    let hittable = hittableBuffer.hittables[(*hitRecord).id];
    let fuzz = hittable.materialFuzz;
    let refractiveIndex = hittable.materialRefractiveIndex;
    let gloss = hittable.materialGloss;
    let refractionRatio = select(refractiveIndex, 1f / refractiveIndex, (*hitRecord).frontFace);
    let cosTheta = min(dot(-(*ray).direction, hitRecord.normal), 1f);
    if (reflectance(cosTheta, refractionRatio) * gloss > random(seed)) {
        (*ray).direction = normalize(reflect((*ray).direction, (*hitRecord).normal) + fuzz * randomUnitVector(seed));
        (*ray).origin = (*hitRecord).position + (*ray).direction * 0.0001f; // Offset to avoid self-intersection
        (*attenuation) = vec3<f32>(1f, 1f, 1f);

        // Absorb any rays which fuzz scatters below the surface
        return dot((*ray).direction, (*hitRecord).normal) > 0f;
    }
    else {
        // Lambertian
        return scatterLambertian(ray, hitRecord, attenuation, seed);
    }
}

fn textureValue(hitRecord: ptr<function, HitRecord>) -> vec3<f32> {
    let hittable = &hittableBuffer.hittables[(*hitRecord).id];

    let textureTypeId = hittableBuffer.hittables[(*hitRecord).id].textureTypeId;
    switch u32(textureTypeId) {
        case 0u: {
            // Solid color
            return (*hittable).materialColor1;
        }
        case 1u: {
            // 2D checkerboard
            let uv = hitRecord.uv * 2f; // 2 squares per axis for uv [0,1]
            let material1 = (*hittable).materialColor1;
            let material2 = (*hittable).materialColor2;
            return mix(material1, material2, (floor(uv.x) + floor(uv.y)) % 2f);
        }
        case 2u: {
            // Image
            // Sample in linear space
            return textureSampleLevel(backgroundTexture, linearSampler, hitRecord.uv, 0f).rgb;
        }
        case 3u: {
            // SDF
            // TODO: Stop using uv.x to differentiate stroke/fill
            if ((*hitRecord).uv[0] > 0f) {
                 // Stroke
                 return (*hittable).materialColor2;
            }
            else {
                // Fill
                return (*hittable).materialColor1;
            }
        }
        case 4u: {
            // 2D texture coords
            return vec3<f32>(hitRecord.uv, 0f);
        }
        case 5u: {
            // 3D texture coords
            return (hitRecord.position - (*hittable).center0) / (*hittable).size0 + vec3<f32>(0.5f, 0.5f, 0.5f);
        }
        default: { return vec3<f32>(0f, 0f, 0f); }
    }
}

fn rayColor(ray: ptr<function, Ray>, seed: ptr<function, u32>) -> vec3<f32> {
    let maxDepth = 8u; // TODO: Pass as uniform
    var depth = 0u;
    var color = vec3<f32>(1f, 1f, 1f);
    var attenuation = vec3<f32>(1f, 1f, 1f);
    var emitted = vec3<f32>(0f, 0f, 0f);
    var hitRecord: HitRecord;
    hitRecord.id = 4294967295; // -1 as u32
    var scatter: bool;
    loop {
        if (hitBVH(*ray, 0.00001f, 100f, &hitRecord, seed)) {

            // Depth
            depth++;
            if (depth == maxDepth) {
                // Exceeded bounce limit, no more light is gathered
                return vec3<f32>(0f, 0f, 0f);
            }

            // Beer's law
            if (hitRecord.previousIsAbsorbing) {
                let d = distance(hitRecord.previousPosition, hitRecord.position);
                color = color * exp(-d * hitRecord.previousAbsorption);
            }
            // Reset absorption
            hitRecord.isAbsorbing = false;
            hitRecord.absorption = vec3<f32>(0f, 0f, 0f);

            // Bounce
            switch u32(hittableBuffer.hittables[hitRecord.id].materialTypeId) {
                case 0u: {
                    scatter = scatterLambertian(ray, &hitRecord, &attenuation, seed);
                }
                case 1u: {
                    scatter = scatterMetal(ray, &hitRecord, &attenuation, seed);
                }
                case 2u: {
                    scatter = scatterDielectric(ray, &hitRecord, &attenuation, seed);
                }
                case 3u: {
                    scatter = scatterGlossy(ray, &hitRecord, &attenuation, seed);
                }
                case 4u: {
                    // Diffuse light
                    scatter = false;
                    emitted = hittableBuffer.hittables[hitRecord.id].materialColor1;
                }
                default: {
                    scatter = false;
                }
            }

            if (scatter) {
                // Attenuate
                color *= attenuation;

                // Russian Roulette: probabilistically terminate dim paths after depth 2
                if (depth > 2u) {
                    let p = max(color.x, max(color.y, color.z));
                    let survival = max(p, 0.05f);
                    if (random(seed) > survival) {
                        return vec3<f32>(0f, 0f, 0f);
                    }
                    color /= survival;
                }
            }
            else {
                // Emit
                return color * emitted;
            }
        }
        else {
            // Miss
            if (depth > 0u) {
                // Bounced ray: sample direct lights
                return hitLights(*ray, &hitRecord, seed) * color;
            }
            else {
                // Primary ray: background only (lights hidden on first bounce)
                return uniforms.backgroundColor.xyz;
            }
        }
    }
}

// TODO: Reorganize bind groups by update frequency (e.g. lighting to its own group, uniforms per-frame in highest group)
// TODO: Write color directly using texture_storage_2d<rgba32float,read_write> and textureStore
@group(0) @binding(2) var<storage, read> hittableBuffer: HittableBuffer;
@group(0) @binding(3) var<storage, read> linearBVHNodeBuffer: LinearBVHNodeBuffer;
@group(0) @binding(4) var linearSampler: sampler;
@group(0) @binding(5) var atlasTexture: texture_2d<f32>;
@group(0) @binding(6) var backgroundTexture: texture_2d<f32>;

@group(1) @binding(0) var<storage, read_write> outputColorBuffer: ColorBuffer;

@group(2) @binding(1) var<uniform> uniforms: Uniforms;
@group(2) @binding(2) var<storage, read_write> depthMinMaxBuffer: DepthMinMaxBuffer;

@group(2) @binding(3) var<storage, read> lightBuffer: LightBuffer;

@compute @workgroup_size(16, 16, 1)
fn clear(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let tileSize = vec2<u32>(u32(uniforms.width), u32(uniforms.height));
    if (globalId.x > tileSize.x || globalId.y > tileSize.y) { return; }
    let index = (globalId.y * (tileSize.x + 1u) + globalId.x) * 4u;
    outputColorBuffer.values[index] = 0f;
    outputColorBuffer.values[index + 1u] = 0f;
    outputColorBuffer.values[index + 2u] = 0f;
    outputColorBuffer.values[index + 3u] = 0f;
    atomicStore(&depthMinMaxBuffer.values[0], 4294967295u);
    atomicStore(&depthMinMaxBuffer.values[1], 0u);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let imageSize = vec2<f32>(uniforms.width * uniforms.tilesX, uniforms.height * uniforms.tilesY);
    let tileSize = vec2<f32>(uniforms.width, uniforms.height);

    // Pixel coords
    let tilePixelX = f32(globalId.x);
    let tilePixelY = f32(globalId.y);
    if (tilePixelX >= tileSize.x || tilePixelY >= tileSize.y) { return; }
    let imagePixelX = tilePixelX + uniforms.tileOffsetX * tileSize.x;
    let imagePixelY = tilePixelY + uniforms.tileOffsetY * tileSize.y;

    // Tex coords ([0,1], [0,1])
    let texCoord = vec2<f32>(imagePixelX / imageSize.x, imagePixelY / imageSize.y);

    // Frame seed
    var frameSeed = u32(uniforms.seed);
    var color = vec3<f32>(0f, 0f, 0f);
    var depth = 0f;
    var normal = vec3<f32>(0f, 0f, 0f);
    
    // Seed random number generator per pixel
    var seed = u32(tilePixelY * tileSize.x + tilePixelX) + frameSeed * u32(tileSize.x * tileSize.y);

    // Sample position (sub-pixel sampling has same seed, but only sampled once per frame)
    let samplePos = vec2<f32>(texCoord) + vec2<f32>(random(&seed), random(&seed)) / imageSize;

    // Camera
    let camera = getPerspectiveCamera(uniforms);

    // Ray
    var ray: Ray;
    switch u32(uniforms.cameraTypeId) {
        default: {
            ray = getPerspectiveRay(camera, &seed, samplePos);
        }
        case 1u: {
            ray = getCylindricalRay(camera, &seed, samplePos);
        }
    }
    
    // Clamp to prevent fireflies from extreme samples
    color += clamp(rayColor(&ray, &seed), vec3<f32>(0f, 0f, 0f), vec3<f32>(10f, 10f, 10f));

    // Next frame
    frameSeed++;
    
    let index = (globalId.y * (u32(tileSize.x) + 1u) + globalId.x) * 4u;
    outputColorBuffer.values[index + 0u] += color.x;
    outputColorBuffer.values[index + 1u] += color.y;
    outputColorBuffer.values[index + 2u] += color.z;
}

@compute @workgroup_size(16, 16, 1)
fn color(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let imageSize = vec2<f32>(uniforms.width * uniforms.tilesX, uniforms.height * uniforms.tilesY);
    let tileSize = vec2<f32>(uniforms.width, uniforms.height);

    // Pixel coords
    let tilePixelX = f32(globalId.x);
    let tilePixelY = f32(globalId.y);
    if (tilePixelX >= tileSize.x || tilePixelY >= tileSize.y) { return; }
    let imagePixelX = tilePixelX + uniforms.tileOffsetX * tileSize.x;
    let imagePixelY = tilePixelY + uniforms.tileOffsetY * tileSize.y;

    // Camera
    var camera = getPerspectiveCamera(uniforms);
    var seed = 0u;

    // Anti-aliasing
    let AA = uniforms.multisample;
    var color = vec3<f32>(0f, 0f, 0f);
    for (var m: u32 = 0u; m < u32(AA); m++) {
        for (var n: u32 = 0u; n < u32(AA); n++) {
            let u = (imagePixelX + f32(m) / AA - 0.5f) / imageSize.x;
            let v = (imagePixelY + f32(n) / AA - 0.5f) / imageSize.y;
            let texCoord = vec2<f32>(u, v);

            // Ray
            var ray: Ray;
            switch u32(uniforms.cameraTypeId) {
                default: {
                    ray = getPerspectiveRay(camera, &seed, texCoord);
                }
                case 1u: {
                    ray = getCylindricalRay(camera, &seed, texCoord);
                }
            }

            // Color
            var hitRecord: HitRecord;
            var shadowRay: Ray;
            var shadowHitRecord: HitRecord;
            if (hitBVH(ray, 0.00001f, 100f, &hitRecord, &seed)) {
                let textureColor = textureValue(&hitRecord);
                let hittable = &hittableBuffer.hittables[hitRecord.id];
                let materialTypeId = hittable.materialTypeId;
                let fuzz = select(hittable.materialFuzz, 1f, materialTypeId == 0f);
                let gloss = select(hittable.materialGloss, 0f, materialTypeId == 0f);
                let specularIntensity = gloss * (1f - fuzz);
                let shininess = 64f; // TODO: Make per-material or calculate from fuzz
                // Lights
                for (var i: u32 = 0u; i < arrayLength(&lightBuffer.lights); i++) {
                    let light = lightBuffer.lights[i];
                    switch u32(lightBuffer.lights[i].typeId) {
                        case 0u: {
                            // Directional light
                            // Fire a shadow ray towards the light
                            shadowRay.origin = hitRecord.position;
                            shadowRay.direction = -light.direction;
                            if (!hitBVH(shadowRay, 0.00001f, 100f, &shadowHitRecord, &seed)) {
                               // Diffuse
                               let diffuseIntensity = clamp(-dot(hitRecord.normal, light.direction), 0f, 1f);
                               color += diffuseIntensity * textureColor * light.color;

                               // Specular
                               let reflected = reflect(light.direction, hitRecord.normal);
                               let specular = pow(clamp(dot(reflected, -ray.direction), 0f, 1f), shininess);
                               color += specular * light.color * specularIntensity;
                            }
                        }
                        case 3u: {
                            // Point light
                            // Fire a shadow ray towards the light
                            shadowRay.origin = hitRecord.position;
                            var direction = light.center - hitRecord.position;
                            let distance = length(direction);
                            direction = direction / distance;
                            shadowRay.direction = direction;
                            if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, &seed)) {
                               // Diffuse
                               let diffuseIntensity = clamp(dot(hitRecord.normal, direction), 0f, 1f);
                               color += diffuseIntensity * textureColor * light.color;

                               // Specular
                               let reflected = -reflect(direction, hitRecord.normal);
                               let specular = pow(clamp(dot(reflected, -ray.direction), 0f, 1f), shininess);
                               color += specular * light.color * specularIntensity;
                            }
                        }
                        case 4u: {
                            // Projector light
                            let center = light.center;
                            var direction = center - hitRecord.position;
                            let distance = length(direction);
                            direction = direction / distance;
                            shadowRay.origin = hitRecord.position;
                            shadowRay.direction = direction;
                            if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, &seed)) {
                                // Calculate the position and size of the near plane
                                let nearPlane = light.nearPlane;
                                let nearPlaneCenter = center + light.direction * nearPlane;

                                var size: vec2<f32>;
                                size.y = 2f * nearPlane * tan(light.angle * 0.5f);
                                // Get light aspect ratio from size.x
                                let aspectRatio = light.size.x;
                                size.x = size.y * aspectRatio;
            
                                // Get the near plane intersection point
                                let rotation = light.rotation;
                                let invRotation = conjugate(rotation);

                                // xy rectangle intersection
                                var rotatedRay: Ray;
                                rotatedRay.origin = rotateQuat(hitRecord.position - nearPlaneCenter, invRotation) + nearPlaneCenter;
                                rotatedRay.direction = rotateQuat(direction, invRotation);
                                if (dot(rotatedRay.direction, vec3<f32>(0f, 0f, 1f)) > 0f) { continue; } // Front face only
                                let oc = rotatedRay.origin - nearPlaneCenter;
                                let t = -oc.z / rotatedRay.direction.z;
                                if (t < 0f) { continue; }
                                let p = oc + t * rotatedRay.direction;
                                if (abs(p.x) > size.x * 0.5f || abs(p.y) > size.y * 0.5f) { continue; }

                                var uv = fract(vec2<f32>(p.xy / size.xy * light.texScale.xy + light.texOffset.xy + vec2<f32>(0.5f, 0.5f)));
                                
                                // Diffuse
                                let diffuseIntensity = clamp(dot(hitRecord.normal, direction), 0f, 1f);
                                switch u32(light.textureTypeId) {
                                    case 1u: {
                                        // 2D checkerboard
                                        uv *= 2f; // 2 squares per axis for uv [0,1]
                                        color += diffuseIntensity * textureColor * mix(light.color, light.color2, (floor(uv.x) + floor(uv.y)) % 2f);
                                    }
                                    case 2u: {
                                        // Image
                                        let texCoord0 = light.texCoords.xw;
                                        let texCoord1 = light.texCoords.zy;
                                        uv = texCoord0 + uv * (texCoord1 - texCoord0);
                                        color += diffuseIntensity * textureColor * light.color * textureSampleLevel(backgroundTexture, linearSampler, fract(uv), 0f).rgb;
                                    }
                                    default: {}
                                }
                                
                                // Specular
                                let reflected = -reflect(direction, hitRecord.normal);
                                let specular = pow(clamp(dot(reflected, -ray.direction), 0f, 1f), shininess);
                                color += specular * light.color * specularIntensity;
                            }
                        }
                        case 7u: {
                            // Spot light
                            // Fire a shadow ray towards the light
                            shadowRay.origin = hitRecord.position;
                            var direction = light.center - hitRecord.position;
                            let distance = length(direction);
                            direction = direction / distance;
                            shadowRay.direction = direction;
                            if (!hitBVH(shadowRay, 0.00001f, distance, &shadowHitRecord, &seed)) {
                                // Get angle to light direction
                                // Check if within light cone
                                let cosAngle = dot(-direction, light.direction);
                                let cosOuter = cos(light.angle * 0.5f);
                                var attenuation = 0f;
                                if (cosAngle > cosOuter) {
                                    // Remap [cosOuter..1] to [0..1] for smooth edge falloff
                                    let remap = (cosAngle - cosOuter) / (1f - cosOuter);
                                    attenuation = select(pow(remap, light.falloff), 1f, light.falloff == 0f);
                                }

                                // Diffuse
                                let diffuseIntensity = clamp(dot(hitRecord.normal, direction), 0f, 1f);
                                color += diffuseIntensity * textureColor * light.color * attenuation;

                                // Specular
                                let reflected = -reflect(direction, hitRecord.normal);
                                let specular = pow(clamp(dot(reflected, -ray.direction), 0f, 1f), shininess / 4f);
                                color += specular * specularIntensity * light.color * attenuation;
                            }
                        }
                        default: {}
                    }
                }
                
                // Ambient
                let ambientColor = uniforms.ambientColor;
                color += textureColor * ambientColor;
            }   
            else {
                // Background color
                color += uniforms.backgroundColor.xyz;
            }
        }
    }
    let index = (globalId.y * (u32(uniforms.width) + 1u) + globalId.x) * 4u;
    color /= (AA * AA); // Average color over samples
    outputColorBuffer.values[index + 0u] += color.x;
    outputColorBuffer.values[index + 1u] += color.y;
    outputColorBuffer.values[index + 2u] += color.z;
}
    
@compute @workgroup_size(16, 16, 1)
fn normalDepth(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let imageSize = vec2<f32>(uniforms.width * uniforms.tilesX, uniforms.height * uniforms.tilesY);
    let tileSize = vec2<f32>(uniforms.width, uniforms.height);

    // Pixel coords
    let tilePixelX = f32(globalId.x);
    let tilePixelY = f32(globalId.y);
    if (tilePixelX >= tileSize.x || tilePixelY >= tileSize.y) { return; }
    let imagePixelX = tilePixelX + uniforms.tileOffsetX * tileSize.x;
    let imagePixelY = tilePixelY + uniforms.tileOffsetY * tileSize.y;

    // Tex coords ([0,1], [0,1])
    let texCoord = vec2<f32>(imagePixelX / imageSize.x, imagePixelY / imageSize.y);

    // Camera
    var camera = getPerspectiveCamera(uniforms);

    // Ray
    var seed = 0u;
    var ray: Ray;
    switch u32(uniforms.cameraTypeId) {
        default: {
            ray = getPerspectiveRay(camera, &seed, texCoord);
        }
        case 1u: {
            ray = getCylindricalRay(camera, &seed, texCoord);
        }
    }

    // Normal
    var normal = vec3<f32>(0f, 0f, 0f);
    var depth = 0f;
    var hitRecord: HitRecord;
    if (hitBVH(ray, 0.00001f, 100f, &hitRecord, &seed)) {
        normal = hitRecord.normal * 0.5f + vec3<f32>(0.5f, 0.5f, 0.5f);

        // Linear depth
        switch u32(uniforms.cameraTypeId) {
            default: {
                // Perspective, projected depth
                depth = dot(ray.origin - hitRecord.position, uniforms.forward);
            }
            case 1u: {
                // Cylindrical, actual distance
                depth = length(hitRecord.position - ray.origin);
            }
        }
    }
    
    let index = (globalId.y * (u32(uniforms.width) + 1u) + globalId.x) * 4u;
    outputColorBuffer.values[index + 0u] += normal.x;
    outputColorBuffer.values[index + 1u] += normal.y;
    outputColorBuffer.values[index + 2u] += normal.z;
    outputColorBuffer.values[index + 3u] += depth;

    // Min, max depth
    // When depth is 0, it means no hit, so ignore
    // Emulate float atomicMin/Max by storing as int (x1000) to preserve some precision
    if (depth > 0f) {
        atomicMin(&depthMinMaxBuffer.values[0], u32(depth * 1000f));
        atomicMax(&depthMinMaxBuffer.values[1], u32(depth * 1000f));
    }
}

@compute @workgroup_size(16, 16, 1)
fn segment(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let imageSize = vec2<f32>(uniforms.width * uniforms.tilesX, uniforms.height * uniforms.tilesY);
    let tileSize = vec2<f32>(uniforms.width, uniforms.height);

    // Pixel coords (overdispatched by 1 for edge detection)
    let tilePixelX = f32(globalId.x);
    let tilePixelY = f32(globalId.y);
    if (tilePixelX > tileSize.x || tilePixelY > tileSize.y) { return; }
    let imagePixelX = tilePixelX + uniforms.tileOffsetX * tileSize.x;
    let imagePixelY = tilePixelY + uniforms.tileOffsetY * tileSize.y;

    // Tex coords ([0,1], [0,1]), can be > 1 with overdispatching
    let texCoord = vec2<f32>(imagePixelX / imageSize.x, imagePixelY / imageSize.y);

    // Camera
    var camera = getPerspectiveCamera(uniforms);

    // Ray
    var seed = 0u;
    var ray: Ray;
    switch u32(uniforms.cameraTypeId) {
        default: {
            ray = getPerspectiveRay(camera, &seed, texCoord);
        }
        case 1u: {
            ray = getCylindricalRay(camera, &seed, texCoord);
        }
    }

    // Segment
    var segment = vec4<f32>(0f, 0f, 0f, 0f);
    var hitRecord: HitRecord;
    if (hitBVH(ray, 0.00001f, 100f, &hitRecord, &seed)) {
        let hittable = hittableBuffer.hittables[hitRecord.id];
        if (uniforms.idSource == 1f) {
            segment = hittable.pickColor;
        } else {
            segment = hittable.segmentColor;
        }
    }
    
    let index = (globalId.y * (u32(tileSize.x) + 1u) + globalId.x) * 4u;
    outputColorBuffer.values[index + 0u] += segment.x;
    outputColorBuffer.values[index + 1u] += segment.y;
    outputColorBuffer.values[index + 2u] += segment.z;
}
    
@compute @workgroup_size(16, 16, 1)
fn texture(@builtin(global_invocation_id) globalId : vec3<u32>) {
    let imageSize = vec2<f32>(uniforms.width * uniforms.tilesX, uniforms.height * uniforms.tilesY);
    let tileSize = vec2<f32>(uniforms.width, uniforms.height);

    // Pixel coords
    let tilePixelX = f32(globalId.x);
    let tilePixelY = f32(globalId.y);
    if (tilePixelX >= tileSize.x || tilePixelY >= tileSize.y) { return; }
    let imagePixelX = tilePixelX + uniforms.tileOffsetX * tileSize.x;
    let imagePixelY = tilePixelY + uniforms.tileOffsetY * tileSize.y;

    // Tex coords ([0,1], [0,1]), can be > 1 with overdispatching
    let texCoord = vec2<f32>(imagePixelX / imageSize.x, imagePixelY / imageSize.y);

    // Camera
    var camera = getPerspectiveCamera(uniforms);

    // Ray
    var seed = 0u;
    var ray: Ray;
    switch u32(uniforms.cameraTypeId) {
        default: {
            ray = getPerspectiveRay(camera, &seed, texCoord);
        }
        case 1u: {
            ray = getCylindricalRay(camera, &seed, texCoord);
        }
    }

    // Texture
    var texture = vec2<f32>(0f, 0f);
    var hitRecord: HitRecord;
    if (hitBVH(ray, 0.00001f, 100f, &hitRecord, &seed)) {
        texture = hitRecord.uv;
    }
    
    let index = (globalId.y * (u32(uniforms.width) + 1u) + globalId.x) * 4u;
    outputColorBuffer.values[index + 0u] += texture.x;
    outputColorBuffer.values[index + 1u] += texture.y;
}
`;

export class ComputeUniformBufferData extends Float32Array {
    public static readonly SIZE = 144 / 4;

    public readonly POSITION_OFFSET = 0 / 4;
    public readonly WIDTH_OFFSET = 12 / 4;
    public readonly RIGHT_OFFSET = 16 / 4;
    public readonly HEIGHT_OFFSET = 28 / 4;
    public readonly UP_OFFSET = 32 / 4;
    public readonly SEED_OFFSET = 44 / 4;
    public readonly FORWARD_OFFSET = 48 / 4;
    public readonly FOV_OFFSET = 60 / 4;
    public readonly BACKGROUND_COLOR_OFFSET = 64 / 4;
    public readonly AMBIENT_COLOR_OFFSET = 80 / 4;
    public readonly TILES_X = 92 / 4;
    public readonly TILES_Y = 96 / 4;
    public readonly TILE_OFFSET_X = 100 / 4;
    public readonly TILE_OFFSET_Y = 104 / 4;
    public readonly APERTURE_OFFSET = 108 / 4;
    public readonly FOCUS_DISTANCE_OFFSET = 124 / 4;
    public readonly MULTISAMPLE_OFFSET = 128 / 4;
    public readonly CAMERA_TYPE_ID_OFFSET = 132 / 4;
    public readonly ID_SOURCE_OFFSET = 136 / 4;

    constructor() {
        super(ComputeUniformBufferData.SIZE)
    }

    public getFocusDistance() { return this[this.FOCUS_DISTANCE_OFFSET]; }
    public setFocusDistance(value: number) { this[this.FOCUS_DISTANCE_OFFSET] = value; }

    public getWidth() { return this[this.WIDTH_OFFSET]; }
    public setWidth(value: number) { this[this.WIDTH_OFFSET] = value; }

    public getHeight() { return this[this.HEIGHT_OFFSET]; }
    public setHeight(value: number) { this[this.HEIGHT_OFFSET] = value; }

    public getSeed() { return this[this.SEED_OFFSET]; }
    public setSeed(value: number) { this[this.SEED_OFFSET] = value; }

    public getFieldOfView() { return this[this.FOV_OFFSET]; }
    public setFieldOfView(value: number) { this[this.FOV_OFFSET] = value; }

    public getAperture() { return this[this.APERTURE_OFFSET]; }
    public setAperture(value: number) { this[this.APERTURE_OFFSET] = value; }

    public getPosition(value: Core.Vector3) {
        const offset = this.POSITION_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setPosition(value: Core.Vector3) {
        const offset = this.POSITION_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getRight(value: Core.Vector3) {
        const offset = this.RIGHT_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setRight(value: Core.Vector3) {
        const offset = this.RIGHT_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getUp(value: Core.Vector3) {
        const offset = this.UP_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setUp(value: Core.Vector3) {
        const offset = this.UP_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getForward(value: Core.Vector3) {
        const offset = this.FORWARD_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setForward(value: Core.Vector3) {
        const offset = this.FORWARD_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getBackgroundColor(value: Core.ColorRGBA) {
        const offset = this.BACKGROUND_COLOR_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
        value[3] = this[offset + 3];
    }
    public setBackgroundColor(value: Core.ColorRGBA) {
        const offset = this.BACKGROUND_COLOR_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
        this[offset + 3] = value[3];
    }

    public getAmbientColor(value: Core.ColorRGB) {
        const offset = this.AMBIENT_COLOR_OFFSET;
        value[0] = this[offset];
        value[1] = this[offset + 1];
        value[2] = this[offset + 2];
    }
    public setAmbientColor(value: Core.ColorRGB) {
        const offset = this.AMBIENT_COLOR_OFFSET;
        this[offset] = value[0];
        this[offset + 1] = value[1];
        this[offset + 2] = value[2];
    }

    public getTilesX() { return this[this.TILES_X]; }
    public setTilesX(value: number) { this[this.TILES_X] = value; }

    public getTilesY() { return this[this.TILES_Y]; }
    public setTilesY(value: number) { this[this.TILES_Y] = value; }

    public getTileOffsetX() { return this[this.TILE_OFFSET_X]; }
    public setTileOffsetX(value: number) { this[this.TILE_OFFSET_X] = value; }

    public getTileOffsetY() { return this[this.TILE_OFFSET_Y]; }
    public setTileOffsetY(value: number) { this[this.TILE_OFFSET_Y] = value; }

    public getMultisample() { return this[this.MULTISAMPLE_OFFSET]; }
    public setMultisample(value: number) { this[this.MULTISAMPLE_OFFSET] = value; }

    public getCameraTypeId() { return this[this.CAMERA_TYPE_ID_OFFSET]; }
    public setCameraTypeId(value: number) { this[this.CAMERA_TYPE_ID_OFFSET] = value; }

    public getIdSource() { return this[this.ID_SOURCE_OFFSET]; }
    public setIdSource(value: number) { this[this.ID_SOURCE_OFFSET] = value; }
}