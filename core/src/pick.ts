// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export class Pick {
    protected static _pickId = 1;
    protected static _segmentMap = new Map<number, number>(); // pickId → segmentId

    /** Allocate and return the next unique pick ID */
    public static get nextPickId(): number {
        return this._pickId++;
    }

    /** Register a mapping from an auto-assigned pick ID to a user-provided segment ID */
    public static register(pickId: number, segmentId: number): void {
        this._segmentMap.set(pickId, segmentId);
    }

    /** Look up the user-provided segment ID for a given pick ID */
    public static getSegmentId(pickId: number): number | undefined {
        return this._segmentMap.get(pickId);
    }

    /** Clear registrations and reset the pick ID counter (call at the start of each scene build) */
    public static reset(): void {
        this._pickId = 1;
        this._segmentMap.clear();
    }
}