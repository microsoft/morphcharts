// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import { Common, ISampleCategory, ISamplePlot } from "./common.js";

const specFolder = "samples";
const imageFolder = "gallery";

async function init(): Promise<void> {
    const content = document.getElementById("content") as HTMLDivElement;
    const categories = await Common.loadSampleIndex(`${specFolder}/index.json`);

    const urlParams = new URLSearchParams(window.location.search);
    const sampleParam = urlParams.get("sample");

    if (sampleParam) {
        await renderDetail(content, categories, sampleParam);
    } else {
        Common.renderGalleryGrid(content, categories);
    }

    content.style.visibility = "visible";
    const footer = document.querySelector("footer") as HTMLElement;
    if (footer) footer.style.visibility = "visible";
}

async function renderDetail(content: HTMLDivElement, categories: ISampleCategory[], sampleName: string): Promise<void> {
    // Find the plot in categories
    let plot: ISamplePlot | null = null;
    for (const category of categories) {
        for (const p of category.plots) {
            const name = p.plot.replace(".json", "");
            if (name === sampleName) {
                plot = p;
                break;
            }
        }
        if (plot) break;
    }

    if (!plot) {
        content.innerHTML = `<h1>Sample not found</h1><p><a href="gallery.html">Back to Gallery</a></p>`;
        return;
    }

    const detail = document.createElement("div");
    detail.className = "detail";

    const h2 = document.createElement("h2");
    h2.className = "galleryHeading";
    h2.textContent = plot.title;
    detail.appendChild(h2);

    const desc = document.createElement("p");
    desc.className = "galleryDescription";
    desc.innerHTML = plot.description;
    detail.appendChild(desc);

    const img = document.createElement("img");
    img.src = `${imageFolder}/${plot.image}`;
    img.alt = plot.title;
    detail.appendChild(img);

    const tryLink = document.createElement("a");
    tryLink.href = `client.html?plot=${sampleName}`;
    tryLink.textContent = "View in Online Editor";
    tryLink.style.marginBottom = "12px";
    tryLink.style.display = "inline-block";
    detail.appendChild(tryLink);

    // Load and display the plot spec
    try {
        const specName = plot.plot.endsWith(".json") ? plot.plot : `${plot.plot}.json`;
        const specResponse = await fetch(`${specFolder}/${specName}`);
        const specText = await specResponse.text();

        const specHeader = document.createElement("div");
        specHeader.style.display = "flex";
        specHeader.style.justifyContent = "space-between";
        specHeader.style.alignItems = "center";

        const specTitle = document.createElement("h3");
        specTitle.textContent = "Specification";
        specTitle.style.margin = "0";
        specHeader.appendChild(specTitle);

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "Copy";
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(specText);
            copyBtn.textContent = "Copied!";
            setTimeout(() => copyBtn.textContent = "Copy", 2000);
        };
        specHeader.appendChild(copyBtn);

        detail.appendChild(specHeader);

        const pre = document.createElement("pre");
        pre.textContent = specText;
        detail.appendChild(pre);
    } catch (error) {
        console.error("Error loading spec", error);
    }

    content.appendChild(detail);
}

init();
