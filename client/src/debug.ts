// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class Debug {
  // DOM elements
  private _renderFrameCountSpan: HTMLSpanElement;
  private _cameraPositionSpan: HTMLSpanElement;
  private _cameraRightSpan: HTMLSpanElement;
  private _cameraUpSpan: HTMLSpanElement;
  private _cameraForwardSpan: HTMLSpanElement;
  private _cameraManipulationOriginSpan: HTMLSpanElement;
  private _cameraDistanceSpan: HTMLSpanElement;
  private _cameraFovSpan: HTMLSpanElement;
  private _cameraApertureSpan: HTMLSpanElement;
  private _cameraFocusSpan: HTMLSpanElement;
  private _worldPositionSpan: HTMLSpanElement;
  private _depthMinSpan: HTMLSpanElement;
  private _depthMaxSpan: HTMLSpanElement;

  // Backing fields (always safe defaults)
  private _renderFrameCount = 0;
  private _cameraPosition: Core.Vector3 = [0, 0, 0];
  private _cameraRight: Core.Vector3 = [0, 0, 0];
  private _cameraUp: Core.Vector3 = [0, 0, 0];
  private _cameraForward: Core.Vector3 = [0, 0, 0];
  private _cameraManipulationOrigin: Core.Vector3 = [0, 0, 0];
  private _cameraFov = 0;
  private _cameraAperture = 0;
  private _cameraFocusDistance = 0;
  private _worldPosition: Core.Vector3 = [0, 0, 0];
  private _depthMin = 0;
  private _depthMax = 0;

  // Setters — silently ignore undefined/null values
  public set renderFrameCount(value: number) { if (value != null) { this._renderFrameCount = value; } }
  public set cameraPosition(value: Core.Vector3) { if (value != null) { this._cameraPosition = value; } }
  public set cameraRight(value: Core.Vector3) { if (value != null) { this._cameraRight = value; } }
  public set cameraUp(value: Core.Vector3) { if (value != null) { this._cameraUp = value; } }
  public set cameraForward(value: Core.Vector3) { if (value != null) { this._cameraForward = value; } }
  public set cameraManipulationOrigin(value: Core.Vector3) { if (value != null) { this._cameraManipulationOrigin = value; } }
  public set cameraFov(value: number) { if (value != null) { this._cameraFov = value; } }
  public set cameraAperture(value: number) { if (value != null) { this._cameraAperture = value; } }
  public set cameraFocusDistance(value: number) { if (value != null) { this._cameraFocusDistance = value; } }
  public get worldPosition(): Core.Vector3 { return this._worldPosition; }
  public set worldPosition(value: Core.Vector3) { if (value != null) { this._worldPosition = value; } }
  public set depthMin(value: number) { if (value != null) { this._depthMin = value; } }
  public set depthMax(value: number) { if (value != null) { this._depthMax = value; } }

  constructor() {
    // Renderer
    this._renderFrameCountSpan = document.getElementById("debugRenderFrameCount") as HTMLSpanElement;

    // Camera
    this._cameraPositionSpan = document.getElementById("debugCameraPosition") as HTMLSpanElement;
    this._cameraRightSpan = document.getElementById("debugCameraRight") as HTMLSpanElement;
    this._cameraUpSpan = document.getElementById("debugCameraUp") as HTMLSpanElement;
    this._cameraForwardSpan = document.getElementById("debugCameraForward") as HTMLSpanElement;
    this._cameraManipulationOriginSpan = document.getElementById("debugCameraManipulationOrigin") as HTMLSpanElement;
    this._cameraDistanceSpan = document.getElementById("debugCameraDistance") as HTMLSpanElement;
    this._cameraFovSpan = document.getElementById("debugCameraFov") as HTMLSpanElement;
    this._cameraApertureSpan = document.getElementById("debugCameraAperture") as HTMLSpanElement;
    this._cameraFocusSpan = document.getElementById("debugCameraFocus") as HTMLSpanElement;

    // World
    this._worldPositionSpan = document.getElementById("debugWorldPosition") as HTMLSpanElement;

    // Depth
    this._depthMinSpan = document.getElementById("debugDepthMin") as HTMLSpanElement;
    this._depthMaxSpan = document.getElementById("debugDepthMax") as HTMLSpanElement;
  }

  public update(): void {
    // Renderer
    this._renderFrameCountSpan.innerText = this._renderFrameCount.toString().padStart(5, " ");

    // Camera
    this._cameraPositionSpan.innerText = `${this._cameraPosition[0].toFixed(4).padStart(10, " ")} ${this._cameraPosition[1].toFixed(4).padStart(10, " ")} ${this._cameraPosition[2].toFixed(4).padStart(10, " ")}`;
    this._cameraRightSpan.innerText = `${this._cameraRight[0].toFixed(4).padStart(10, " ")} ${this._cameraRight[1].toFixed(4).padStart(10, " ")} ${this._cameraRight[2].toFixed(4).padStart(10, " ")}`;
    this._cameraUpSpan.innerText = `${this._cameraUp[0].toFixed(4).padStart(10, " ")} ${this._cameraUp[1].toFixed(4).padStart(10, " ")} ${this._cameraUp[2].toFixed(4).padStart(10, " ")}`;
    this._cameraForwardSpan.innerText = `${this._cameraForward[0].toFixed(4).padStart(10, " ")} ${this._cameraForward[1].toFixed(4).padStart(10, " ")} ${this._cameraForward[2].toFixed(4).padStart(10, " ")}`;
    this._cameraManipulationOriginSpan.innerText = `${this._cameraManipulationOrigin[0].toFixed(4).padStart(10, " ")} ${this._cameraManipulationOrigin[1].toFixed(4).padStart(10, " ")} ${this._cameraManipulationOrigin[2].toFixed(4).padStart(10, " ")}`;
    this._cameraDistanceSpan.innerText = (Core.vector3.distance(this._cameraPosition, this._cameraManipulationOrigin)).toFixed(3).padStart(9, " ");
    this._cameraFovSpan.innerText = `${Math.round(this._cameraFov * Core.Constants.DEGREES_PER_RADIAN).toFixed(1).padStart(7, " ")}°`;
    this._cameraApertureSpan.innerText = `${(this._cameraAperture * 1000).toFixed(1).padStart(7, " ")}mm`;
    this._cameraFocusSpan.innerText = `${(this._cameraFocusDistance).toFixed(3).padStart(9, " ")}`;

    // World
    this._worldPositionSpan.innerText = `${this._worldPosition[0].toFixed(4).padStart(10, " ")} ${this._worldPosition[1].toFixed(4).padStart(10, " ")} ${this._worldPosition[2].toFixed(4).padStart(10, " ")}`;

    // Depth
    this._depthMinSpan.innerText = `${this._depthMin.toFixed(2).padStart(8, " ")}`;
    this._depthMaxSpan.innerText = `${this._depthMax.toFixed(2).padStart(8, " ")}`;
  }
}
