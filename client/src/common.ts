// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

export interface ISamplePlot {
    plot: string;
    title: string;
    description: string;
    thumbnail: string;
    image: string;
    notes?: string;
}

export interface ISampleCategory {
    title: string;
    description: string;
    plots: ISamplePlot[];
}

export class Common {
    static async loadSampleIndex(path: string): Promise<ISampleCategory[]> {
        try {
            const response = await fetch(path);
            const json = await response.json();
            return json;
        } catch (error) {
            console.error("error loading sample index", error);
            return [];
        }
    }

    static renderSamplesGrid(container: HTMLElement, categories: ISampleCategory[], onPlotClick?: (plot: ISamplePlot) => void): void {
        const imageFolder = "samples/images";
        for (const category of categories) {
            // Add an id for deep linking to the category
            const categoryId = category.title.toLowerCase().replace(/\s+/g, "-");
            const h2 = document.createElement("h2");
            h2.className = "samplesHeading";
            h2.id = categoryId;
            h2.textContent = category.title;
            container.appendChild(h2);

            const desc = document.createElement("div");
            desc.className = "samplesDescription";
            desc.innerText = category.description;
            container.appendChild(desc);

            const grid = document.createElement("div");
            grid.className = "samplesGrid";
            for (const plot of category.plots) {
                const name = plot.plot.replace(".json", "");
                const a = document.createElement("a");
                a.className = "samplesContainer";
                a.href = `samples.html?plot=${encodeURIComponent(name)}`;

                if (onPlotClick) {
                    a.onclick = (e) => {
                        e.preventDefault();
                        onPlotClick(plot);
                    };
                }

                const img = document.createElement("img");
                img.className = "samplesImage";
                img.src = `${imageFolder}/${plot.thumbnail}`;
                img.alt = plot.title;
                img.loading = "lazy";
                a.appendChild(img);

                const title = document.createElement("div");
                title.className = "samplesTitle";
                title.textContent = plot.title;
                a.appendChild(title);

                grid.appendChild(a);
            }
            container.appendChild(grid);
        }
    }
}