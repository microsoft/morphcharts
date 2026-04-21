// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Common, ISampleCategory, ISamplePlot } from "./common.js";

const specFolder = "samples";
const imageFolder = "gallery";

async function init(): Promise<void> {
    const content = document.getElementById("content") as HTMLDivElement;
    const categories = await Common.loadSampleIndex(`${specFolder}/index.json`);

    const urlParams = new URLSearchParams(window.location.search);
    const plotParam = urlParams.get("plot");

    if (plotParam) {
        await renderDetail(content, categories, plotParam);
    } else {
        Common.renderGalleryGrid(content, categories);
    }

    // Show content and footer to avoid reflow
    content.style.visibility = "visible";
    const footer = document.querySelector("footer") as HTMLElement;
    if (footer) footer.style.visibility = "visible";
}

async function renderDetail(content: HTMLDivElement, categories: ISampleCategory[], plotName: string): Promise<void> {
    // Find the plot in categories
    let plot: ISamplePlot | null = null;
    for (const category of categories) {
        for (const p of category.plots) {
            const name = p.plot.replace(".json", "");
            if (name === plotName) {
                plot = p;
                break;
            }
        }
        if (plot) break;
    }

    if (!plot) {
        content.textContent = "Plot not found";
        return;
    }

    // Populate detail elements
    const detail = document.getElementById("galleryDetail") as HTMLDivElement;
    const detailTitle = document.getElementById("galleryDetailTitle") as HTMLHeadingElement;
    const detailDescription = document.getElementById("galleryDetailDescription") as HTMLDivElement;
    const detailImage = document.getElementById("galleryDetailImage") as HTMLImageElement;
    const detailNotes = document.getElementById("galleryDetailNotes") as HTMLDivElement;
    const detailTryLink = document.getElementById("galleryDetailTryLink") as HTMLAnchorElement;
    const detailSpec = document.getElementById("galleryDetailSpec") as HTMLElement;

    detailTitle.textContent = plot.title;
    detailDescription.innerText = plot.description;
    detailImage.src = `${imageFolder}/${plot.image}`;
    detailImage.alt = plot.title;
    detailTryLink.href = `client.html?plot=${encodeURIComponent(plotName)}`;

    if (plot.notes) {
        detailNotes.innerHTML = plot.notes;
    } else {
        detailNotes.style.display = "none";
    }

    // Load and display the plot spec
    try {
        const specName = plot.plot.endsWith(".json") ? plot.plot : `${plot.plot}.json`;
        const specResponse = await fetch(`${specFolder}/${specName}`);
        const specText = await specResponse.text();
        detailSpec.textContent = specText;
    } catch (error) {
        console.error("Error loading spec", error);
    }

    detail.style.display = "block";
}

init();
