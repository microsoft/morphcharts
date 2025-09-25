# MorphCharts
MorphCharts is a visualization library for creating rich, immersive, and engaging 2D and 3D data visualizations, written in [TypeScript](https://www.typescriptlang.org/).

Charts can be created in a web browser, or via a server-side REST API.

## Table of Contents
1. [Components](#components)
1. [Usage](#usage)
1. [Chart types](#chart-types)
1. [Data](#data)
1. [Geometry](#geometry)
1. [Materials](#materials)
1. [Textures](#textures)
1. [Tiling](#tiling)
1. [Installation](#installation)

## Components
The MorphCharts GitHub repo has the following components:
* **Core** - A library of helper functions used by the other components.
* **Client** - A website to demonstrate use of the visualization framework.
* **Server** - A NodeJS application for generating server-side visualizations on a CPU with a REST API.
* **Renderers** - Renderers for generating visualizations:
    * WebGPU - Web browser rendering on the GPU using WebGPU.
    * NodeJS - Server-side rendering on the CPU using NodeJS and [node-canvas](https://github.com/Automattic/node-canvas).
* **Spec** - A visualization grammar parser, based on a subset of the [VEGA](https://github.com/vega/vega) specification format, with extensions to support 3D visualizations.

## Usage
There are 2 principal ways to create charts using this library:
1. **Provide a JSON specification** based on s subset of the [VEGA](https://github.com/vega/vega) specification format, with extensions to support 3D visualizations.
1. **Use code** to create visualizations directly, with the **Core** library and a **Renderer**.

Charts can be rendered client-side in a web browser on a GPU ([using WebGPU](https://caniuse.com/?search=webgpu)), or server-side on a CPU.

## Chart Types
While the [VEGA](https://github.com/vega/vega) specification supports the definition of arbitrary charts, this visualization library is optimized for common 2D/3D chart types such as **bar** charts, **line** charts, **treemaps**, **scatter** plots, **pie/donut** charts, **area** charts, and **node link** graphs.

## Data
When a chart is defined using a JSON specification, there are 2 principal ways to specify a tabular dataset.
1. Using an inline JSON definition.
1. Linking to an external file in a CSV format via a URL.

## Geometry
Charts are principally rendered using procedural geometry and path tracing. Supported geometric primitives include **rectangle**, **cuboid**, **sphere**, **cylinder**, **hex prism**, **ring** (segments), **torus** (segments).

Charts can be rendered using multiple pipelines, including:
* **Raytrace** - A global-illumination ray tracer.
* **Color** - A simple, normal-based shading with directional and ambient lighting.
* **Normal** - Normal map.
* **Depth** - Grayscale depth map.
* **Segment** - A color map corresponding to a segment id, useful for picking and edge detection.
* **Edge** - An edge outline.

## Materials
The ray tracer supports rendering different material types, which can be defined in the chart specification.
* **Diffuse** - A simple diffuse material with Lambertian shading. This is the default material.
* **Metal** - A metallic material with variable shininess.
* **Glossy** - A glossy material combining diffuse and dielectric material properties.
* **Glass** - A dielectric material.
* **Light** - An emissive light source.

## Textures
Materials can be rendered in solid color, or textured.

## Tiling
Visualizations can be generated at arbitrary resolutions. Single images can be created, typically up to 4K (3840x2160px) resolution (depending on hardware). For larger resolutions, multiple image tiles can be created, which can be stitched into an arbitrarily large image.

## Installation
The project can be run locally using the following steps:
1. Clone the repo.
1. `npm install` to install any required dependencies.
1. Build the project using one of the included scripts (see `package.json`), such as `npm run build_client`.
1. `npm run start_client` to run the website using [Vite](https://vite.dev/).