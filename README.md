# MorphCharts

MorphCharts is a visualization library for creating rich, immersive, and engaging 2D and 3D data visualizations.

### Getting Started
You can [Try Online](https://microsoft.github.io/morphcharts/client.html), or install and run locally (see [Installation](#installation), below).

<img src="./client/wwwroot/public/img/client1.jpg" width="100%" alt="Try Online client" style="max-width: 100%; border: 1px solid black">

There are 2 principal ways to create charts using this library:

1.  Provide a **JSON specification** based on a subset of the [VEGA](https://github.com/vega/vega) visualization grammar, with extensions to support 3D visualizations.
2.  Use **code** to create visualizations directly, with the `Core` library and a `Renderer`.

The JSON specification can define data sources and transformations, scales, axes, and visualizations. Data sources can be defined in the following ways:

1.  Using an **inline** JSON definition.
2.  Linking to an external file via a **URL**.

The [Try Online](https://microsoft.github.io/morphcharts/client.html) page also supports using **local files**.

### Gallery

Check out the [Gallery](https://microsoft.github.io/morphcharts/gallery.html) to see more examples.

### Rendering

Charts are principally rendered using procedural geometry and path tracing. Supported geometric primitives include **rectangles**, **cuboids**, **spheres**, **cylinders**, **hex prisms**, **ring segments**, and **torus segments**.

Render pipelines are provided for:

*   **Ray tracing** with global illumination.
*   **Color**, simple normal-based shading with directional and ambient lighting.
*   **Segment** maps, useful for picking and edge detection.
*   **Normal** maps.
*   **Depth** maps.
*   **Edge** outlines.

The ray tracer supports rendering the following material types, which can be defined in the JSON specification:

*   **Diffuse** (Lambertian shading).
*   **Metal**.
*   **Glass**.
*   **Glossy** (combining diffuse and glass properties).
*   **Emissive** light sources.

Materials can be rendered in **solid color**, or **textured**.

Visualizations can be generated at **arbitrary resolutions**. Single images can be created, typically up to 4K (3840x2160px) resolution (depending on hardware). For larger resolutions, multiple **image tiles** can be created, which can be stitched into an arbitrarily large image.

### Components

The repo has the following components:

*   `Core` library used by the other components.
*   `Client` web site to demonstrate use of the visualization framework.
*   `Renderers` for generating visualizations:
    *   `WebGPURaytrace`, for web browser rendering on the GPU using WebGPU.
*   Visualization grammar `Spec` parser, based on a subset of the [VEGA](https://github.com/vega/vega) specification format, with extensions to support 3D visualizations.

### Installation

The project can be installed and run locally using the following steps:

1.  Clone the repo.
2.  `npm install` to install any required dependencies.
3.  Build the project using `npm run dev-client`.
4.  Start the web site using `npm run start-client`, which also opens the `client.html` page in the default web browser.