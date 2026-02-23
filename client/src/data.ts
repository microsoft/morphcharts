// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license. 

import * as Spec from "spec";

export class Data {
    private _datasets: { [key: string]: string };
    public get datasets(): { [key: string]: string } { return this._datasets; }
    private _pageSize;

    // Images
    private _images: { [key: string]: string };
    public get images(): { [key: string]: string } { return this._images; }

    // Files
    private _fileContainer: HTMLDivElement;
    private _fileSelect: HTMLSelectElement;

    // Datasets
    private _dataContainer: HTMLDivElement;
    private _dataSelect: HTMLSelectElement;
    private _rowsLabel: HTMLLabelElement;
    private _pageText: HTMLInputElement;
    private _pagesLabel: HTMLLabelElement;
    private _prevButton: HTMLInputElement;
    private _nextButton: HTMLInputElement;
    private _goButton: HTMLInputElement;
    private _exportContainer: HTMLDivElement;
    private _exportRadioGroup: NodeListOf<HTMLInputElement>;

    // Table
    private _tableContainer: HTMLDivElement;

    // Plot
    private _plot: Spec.Plot;

    constructor(container: HTMLDivElement, pageSize?: number) {
        this._datasets = {};
        this._images = {};
        this._pageSize = pageSize || 20;

        // Files
        this._fileContainer = document.getElementById("dataFileContainer") as HTMLDivElement;
        const fileInput = document.getElementById("dataFileInput") as HTMLInputElement;
        this._fileSelect = document.getElementById("dataFileSelect") as HTMLSelectElement;
        const deleteButton = document.getElementById("dataFileDeleteButton") as HTMLButtonElement;
        fileInput.onchange = () => {
            const files = fileInput.files;
            if (files && files[0]) {
                const file = files[0];
                // Add file (dataset or image)
                this._addFile(file);
            }
        };
        deleteButton.onclick = () => {
            const filename = this._fileSelect.value;
            // Remove either dataset or image
            delete this._datasets[filename];
            delete this._images[filename];
            this._fileSelect.remove(this._fileSelect.selectedIndex);

            // Hide if no files left
            if (this._fileSelect.options.length == 0) {
                this._fileContainer.style.display = "none";
            }
        }

        // Datasets
        this._dataContainer = document.getElementById("dataContainer") as HTMLDivElement;
        this._dataSelect = document.getElementById("dataSelect") as HTMLSelectElement;
        this._rowsLabel = document.getElementById("dataRowsLabel") as HTMLLabelElement;
        this._pageText = document.getElementById("dataPageText") as HTMLInputElement;
        this._pagesLabel = document.getElementById("dataPagesLabel") as HTMLLabelElement;
        this._prevButton = document.getElementById("dataPrevButton") as HTMLInputElement;
        this._nextButton = document.getElementById("dataNextButton") as HTMLInputElement;
        this._goButton = document.getElementById("dataGoButton") as HTMLInputElement;
        this._pageText.oninput = () => { this._goButton.disabled = this._pageText.value == ""; };
        this._exportContainer = document.getElementById("dataExportContainer") as HTMLDivElement;
        const exportButton = document.getElementById("dataExportButton") as HTMLButtonElement;
        this._exportRadioGroup = document.getElementsByName("dataExportRadioGroup") as NodeListOf<HTMLInputElement>;
        exportButton.onclick = () => this._export();

        // Table
        this._tableContainer = document.getElementById("tableContainer") as HTMLDivElement;

        // TODO: Support JSON
        // Allow drop of csv files
        container.ondragover = (e) => { e.preventDefault(); };
        container.ondrop = (e) => {
            e.preventDefault();
            const dataTransfer = e.dataTransfer;
            if (!dataTransfer) return;
            const files = dataTransfer.files;
            // Only allow csv files, png and jpg images, and only one file at a time (for now)
            if (files.length == 1 && (files[0].type == "text/csv" || files[0].type == "image/png" || files[0].type == "image/jpeg")) {
                this._addFile(files[0]);
            }
        };
    }

    private _clear() {
        // Hide containers
        this._dataContainer.style.display = "none";
        this._exportContainer.style.display = "none";

        // Clear
        this._dataSelect.innerHTML = "";
        this._tableContainer.innerHTML = "";
    }

    public update(plot: Spec.Plot) {
        this._clear();
        this._plot = plot;
        const names: string[] = [];
        const datasets: Spec.Dataset[] = [];
        this._getDatasets(plot.root, names, datasets);
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const option = document.createElement("option");
            option.value = i.toString();
            option.innerText = name;
            this._dataSelect.appendChild(option);
        }
        this._dataSelect.onchange = () => {
            const dataset = datasets[parseInt(this._dataSelect.value)];
            this._showPage(dataset, 0, this._pageSize);
        }

        // Show container if no datasets
        if (datasets.length > 0) {
            this._dataContainer.style.display = "flex";
            this._exportContainer.style.display = "flex";
            this._dataSelect.selectedIndex = 0;
            const dataset = datasets[parseInt(this._dataSelect.value)];
            this._showPage(dataset, 0, this._pageSize);
        }
    }

    private _addFile(file: File) {
        const filename = file.name;
        const reader = new FileReader();
        // Add dataset or image based file type
        switch (file.type) {
            case "text/csv":
                reader.onload = (e) => {
                    if (e.target) {
                        this._datasets[filename] = e.target.result as string;

                        // Add entry to select
                        const option = document.createElement("option");
                        option.value = filename;
                        option.innerText = filename;
                        this._fileSelect.appendChild(option);

                        // Ensure visible
                        this._fileContainer.style.display = "flex";
                    }
                };
                reader.readAsText(file);
                break;
            case "image/png":
            case "image/jpg":
            case "image/jpeg":
                reader.onload = (e) => {
                    if (e.target) {
                        this._images[filename] = e.target.result as string;

                        // Add entry to select
                        const option = document.createElement("option");
                        option.value = filename;
                        option.innerText = filename;
                        this._fileSelect.appendChild(option);

                        // Ensure visible
                        this._fileContainer.style.display = "flex";
                    }
                };
                reader.readAsDataURL(file);
                break;
        }
    }

    private _export() {
        if (this._plot) {
            const names: string[] = [];
            const datasets: Spec.Dataset[] = [];
            this._getDatasets(this._plot.root, names, datasets);
            const dataset = datasets[parseInt(this._dataSelect.value)];
            const columns = [];
            for (let i = 0; i < dataset.headings.length; i++) { columns.push(i); }
            let format;
            let text: string;
            for (let i = 0; i < this._exportRadioGroup.length; i++) {
                const radio = this._exportRadioGroup[i] as HTMLInputElement;
                if (radio.checked) {
                    const value = radio.value;
                    switch (value) {
                        case "csv":
                        default:
                            format = "csv";
                            text = dataset.all.toCSV(columns);
                            break;
                        case "json":
                            format = "json";
                            text = dataset.all.toJSON(columns);
                            break;
                    }
                    break;
                }
            }

            // Download
            const filename = `${this._dataSelect.value}.${format}`;
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    private _getDatasets(group: Spec.Marks.Group, names: string[], datasets: Spec.Dataset[]): void {
        for (let key in group.datasets) {
            names.push(key);
            datasets.push(group.datasets[key]);
        }
        if (group.marks) {
            for (let i = 0; i < group.marks.length; i++) {
                const child = group.marks[i];
                if (child instanceof Spec.Marks.Group) {
                    this._getDatasets(child, names, datasets);
                }
            }
        }
    }

    private _showPage(dataset: Spec.Dataset, page: number, pageSize: number) {
        const table = document.createElement("table");

        // Headings
        // TODO: Add column types
        let headerRow = document.createElement("tr");
        let headings;
        if (dataset.datum) {
            headings = dataset.datum.headings;
            for (let i = 0; i < headings.length; i++) {
                const heading = headings[i];
                const th = document.createElement("th");
                th.innerText = heading;
                headerRow.appendChild(th);
            }
        }
        headings = dataset.headings;
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const th = document.createElement("th");
            th.innerText = heading;
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // Rows
        const rows = dataset.rows; // datum.rows == rows
        const maxLength = 50;
        for (let i = page * pageSize; i < Math.min(rows.length, (page + 1) * pageSize); i++) {
            let row;
            const tr = document.createElement("tr");
            if (dataset.datum) {
                row = dataset.datum.rows[i];
                for (let j = 0; j < row.length; j++) {
                    const cell = row[j];
                    const td = document.createElement("td");
                    if (cell.length > maxLength) {
                        td.innerText = cell.substring(0, maxLength) + "...";
                    }
                    else {
                        td.innerText = cell.toString();
                    }
                    tr.appendChild(td);
                }
            }
            row = dataset.rows[i];
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                const td = document.createElement("td");
                if (cell.length > maxLength) {
                    td.innerText = cell.substring(0, maxLength) + "...";
                }
                else {
                    td.innerText = cell.toString();
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        this._tableContainer.innerHTML = "";
        this._tableContainer.appendChild(table);

        // Pages
        const totalPages = Math.ceil(rows.length / pageSize);
        this._pageText.value = (page + 1).toString();
        this._pageText.disabled = totalPages == 1;
        this._pagesLabel.innerText = totalPages.toString();
        this._prevButton.onclick = () => { this._showPage(dataset, page - 1, pageSize); };
        this._prevButton.disabled = page == 0;
        this._nextButton.onclick = () => { this._showPage(dataset, page + 1, pageSize); };
        this._nextButton.disabled = page == totalPages - 1;
        this._goButton.onclick = () => {
            const goPage = parseInt(this._pageText.value);
            if (!isNaN(goPage) && goPage > 0 && goPage <= totalPages) {
                this._showPage(dataset, goPage - 1, pageSize);
                this._goButton.disabled = true;
            }
        };

        // Row count
        this._rowsLabel.innerText = rows.length.toString();
    }
}