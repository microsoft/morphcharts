// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Core from "core";

export class Debug {
  // Renderer
  private _renderFrameCount: HTMLSpanElement;
  public renderFrameCount: number;

  // Editor
  private _editorLineCount: HTMLSpanElement;
  public editorLineCount: number;
  private _editorLineNumber: HTMLSpanElement;
  public editorLineNumber: number;

  // Camera
  private _cameraPosition: HTMLSpanElement;
  public cameraPosition: Core.Vector3;
  private _cameraRight: HTMLSpanElement;
  public cameraRight: Core.Vector3;
  private _cameraUp: HTMLSpanElement;
  public cameraUp: Core.Vector3;
  private _cameraForward: HTMLSpanElement;
  public cameraForward: Core.Vector3;
  private _cameraManipulationOrigin: HTMLSpanElement;
  public cameraManipulationOrigin: Core.Vector3;
  private _cameraDistance: HTMLSpanElement;
  private _cameraFov: HTMLSpanElement;
  public cameraFov: number;
  private _cameraAperture: HTMLSpanElement;
  public cameraAperture: number;
  private _cameraFocus: HTMLSpanElement;
  public cameraFocusDistance: number;

  // World
  private _worldPosition: HTMLSpanElement;
  public worldPosition: Core.Vector3;

  // Depth
  private _depthMin: HTMLSpanElement;
  private _depthMax: HTMLSpanElement;
  public depthMin: number;
  public depthMax: number;

  constructor() {
    // Renderer
    this._renderFrameCount = document.getElementById("debugRenderFrameCount") as HTMLSpanElement;

    // Camera
    this._cameraPosition = document.getElementById("debugCameraPosition") as HTMLSpanElement;
    this.cameraPosition = [0, 0, 0];
    this._cameraRight = document.getElementById("debugCameraRight") as HTMLSpanElement;
    this.cameraRight = [0, 0, 0];
    this._cameraUp = document.getElementById("debugCameraUp") as HTMLSpanElement;
    this.cameraUp = [0, 0, 0];
    this._cameraForward = document.getElementById("debugCameraForward") as HTMLSpanElement;
    this.cameraForward = [0, 0, 0];
    this._cameraManipulationOrigin = document.getElementById("debugCameraManipulationOrigin") as HTMLSpanElement;
    this.cameraManipulationOrigin = [0, 0, 0];
    this._cameraDistance = document.getElementById("debugCameraDistance") as HTMLSpanElement;
    this._cameraFov = document.getElementById("debugCameraFov") as HTMLSpanElement;
    this._cameraAperture = document.getElementById("debugCameraAperture") as HTMLSpanElement;
    this._cameraFocus = document.getElementById("debugCameraFocus") as HTMLSpanElement;

    // World
    this._worldPosition = document.getElementById("debugWorldPosition") as HTMLSpanElement;
    this.worldPosition = [0, 0, 0];

    // Depth
    this._depthMin = document.getElementById("debugDepthMin") as HTMLSpanElement;
    this._depthMax = document.getElementById("debugDepthMax") as HTMLSpanElement;

    // Editor
    this._editorLineCount = document.getElementById("debugEditorLineCount") as HTMLSpanElement;
    this._editorLineNumber = document.getElementById("debugEditorLineNumber") as HTMLSpanElement;
  }

  public update(): void {
    // Renderer
    this._renderFrameCount.innerText = this.renderFrameCount.toString();

    // Camera
    this._cameraPosition.innerText = `[${this.cameraPosition[0].toFixed(4).padStart(8, " ")},${this.cameraPosition[1].toFixed(4).padStart(8, " ")},${this.cameraPosition[2].toFixed(4).padStart(8, " ")}]`;
    this._cameraRight.innerText = `[${this.cameraRight[0].toFixed(4).padStart(8, " ")},${this.cameraRight[1].toFixed(4).padStart(8, " ")},${this.cameraRight[2].toFixed(4).padStart(8, " ")}]`;
    this._cameraUp.innerText = `[${this.cameraUp[0].toFixed(4).padStart(8, " ")},${this.cameraUp[1].toFixed(4).padStart(8, " ")},${this.cameraUp[2].toFixed(4).padStart(8, " ")}]`;
    this._cameraForward.innerText = `[${this.cameraForward[0].toFixed(4).padStart(8, " ")},${this.cameraForward[1].toFixed(4).padStart(8, " ")},${this.cameraForward[2].toFixed(4).padStart(8, " ")}]`;
    this._cameraManipulationOrigin.innerText = `[${this.cameraManipulationOrigin[0].toFixed(4).padStart(8, " ")},${this.cameraManipulationOrigin[1].toFixed(4).padStart(8, " ")},${this.cameraManipulationOrigin[2].toFixed(4).padStart(8, " ")}]`;
    this._cameraDistance.innerText = (Core.vector3.distance(this.cameraPosition, this.cameraManipulationOrigin)).toFixed(3).padStart(6, " ");
    this._cameraFov.innerText = `${Math.round(this.cameraFov * Core.Constants.DEGREES_PER_RADIAN).toString().padStart(3, " ")}°`;
    this._cameraAperture.innerText = `${(this.cameraAperture * 1000).toFixed(1).padStart(4, " ")}mm`;
    this._cameraFocus.innerText = `${(this.cameraFocusDistance).toFixed(3).padStart(6, " ")}`;

    // World
    this._worldPosition.innerText = `[${this.worldPosition[0].toFixed(4).padStart(8, " ")},${this.worldPosition[1].toFixed(4).padStart(8, " ")},${this.worldPosition[2].toFixed(4).padStart(8, " ")}]`;

    // Depth
    this._depthMin.innerText = `${this.depthMin.toFixed(2).padStart(5, " ")}`;
    this._depthMax.innerText = `${this.depthMax.toFixed(2).padStart(5, " ")}`;

    // Editor
    this._editorLineCount.innerText = this.editorLineCount.toString().padStart(4, " ");
    this._editorLineNumber.innerText = this.editorLineNumber.toString().padStart(4, " ");
  }
}
