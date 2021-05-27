const Fm = 0.02;
const pDt = 85.2;

class Worker {
    _table = null;
    _btnSaveTable = null;
    _btnLoadTable = null;
    _btnShowInChart = null;
    _listExpriments = [];
    _chart = null;
    _btnAddExperiment = null;
    _btnClearTable = null;
    _btnClearChart = null;
    _btnRecalculate = null;

    constructor(
        tableSelectorStr,
        btnSaveTableSelectorStr,
        btnLoadTableSelectorStr,
        btnShowInChartSelectorStr,
        chartSelectorStr,
        btnAddExperimentSelectorStr,
        btnClearTableSelectorStr,
        btnClearChartSelectorStr,
        btnRecalculateSelectorStr
    ) {
        this._table = document.querySelector(tableSelectorStr);
        this._btnLoadTable = document.querySelector(btnLoadTableSelectorStr);
        this._btnSaveTable = document.querySelector(btnSaveTableSelectorStr);
        this._btnShowInChart = document.querySelector(btnShowInChartSelectorStr);
        this._btnAddExperiment = document.querySelector(btnAddExperimentSelectorStr);
        this._btnClearTable = document.querySelector(btnClearTableSelectorStr);
        this._btnClearChart = document.querySelector(btnClearChartSelectorStr);
        this._btnRecalculate = document.querySelector(btnRecalculateSelectorStr);

        if (
            this._table
            && this._btnSaveTable
            && this._btnLoadTable
            && this._btnShowInChart
            && chartSelectorStr
            && this._btnClearTable
            && this._btnClearChart
            && this._btnRecalculate) {
            this._init(chartSelectorStr);
        }
    }

    _init = (chartSelectorStr) => {
        this._btnSaveTable.addEventListener('click', this._hanldeClickSaveTable);
        this._btnLoadTable.addEventListener('change', this._hanldeClickLoadTable);
        this._btnShowInChart.addEventListener('click', this._hanldeClickShowChart);
        this._btnAddExperiment.addEventListener('click', this._handleClickAddExperiment);
        this._btnClearTable.addEventListener('click', this._handleClickClearTable);
        this._btnClearChart.addEventListener('click', this._handleClickClearChart);
        this._btnRecalculate.addEventListener('click', this._handleClickRecalculate);

        const ctx = document.querySelector(chartSelectorStr);
        this._chart = new Chart(ctx, {
            type: 'scatter',
            // data: [],
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Експеримент: ${context.label} F(t) = ${context.formattedValue}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                        position: 'left',
                        title: {
                            display: true,
                            text: 'F(t)',
                        },
                    },
                    x: {
                        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Номер експерименту',
                            font: 20
                        }
                    },
                }
            },
        });
    }

    _handleClickClearTable = () => {
        const tbody = this._table.querySelector('tbody');

        while (tbody.children.length > 1) {
            tbody.removeChild(tbody.lastChild);
        }
    }

    _handleClickRecalculate = () => {
        const tbody = this._table.querySelector('tbody');

        const rows = tbody.querySelectorAll('tr');

        for (const row of rows) {
            const exprimentNumber = row.dataset.expriment;
            const fMs = parseFloat(parseFloat(row.querySelector('.f_mc').value).toFixed(5));
            const fTer = parseFloat(parseFloat(row.querySelector('.f_ter').value).toFixed(5));
            const fTEl = row.querySelector('.f_t');

            if (!fMs || !fTer) continue;

            const Ft = this._calculateByFormulaFt(fMs, fTer);
            fTEl.value = Ft;

            const experimentId = this._listExpriments.findIndex(item => item.exprimentNumber === exprimentNumber);

            if (experimentId !== -1) {
                this._listExpriments[experimentId] = {
                    exprimentNumber,
                    fMs,
                    fTer,
                    Ft,
                };
            } else {
                this._listExpriments.push({
                    exprimentNumber,
                    fMs,
                    fTer,
                    Ft,
                });
            }
        }

    }

    _handleClickClearChart = () => {
        this._chart.data.datasets = [];
        this._chart.update();
    }

    _handleClickAddExperiment = () => {
        const tbody = this._table.querySelector('tbody');
        const lastElement = tbody.lastElementChild;

        if (!lastElement) return;

        const exprimentNumber = parseInt(lastElement.dataset.expriment) + 1;

        const tr = document.createElement('tr');
        tr.dataset.expriment = exprimentNumber;

        const tdExperimentNumber = document.createElement('td');
        tdExperimentNumber.innerText = exprimentNumber;

        tr.appendChild(tdExperimentNumber);

        const tdFmc = document.createElement('td');
        const inputFmc = document.createElement('input');
        inputFmc.type = 'number';
        inputFmc.classList.add('form-control', 'f_mc');
        tdFmc.appendChild(inputFmc);
        tr.appendChild(tdFmc);

        const tdFter = document.createElement('td');
        const inputFter = document.createElement('input');
        inputFter.type = 'number';
        inputFter.classList.add('form-control', 'f_ter');
        tdFter.appendChild(inputFter);
        tr.appendChild(tdFter);

        const tdFt = document.createElement('td');
        const inputFt = document.createElement('input');
        inputFt.type = 'number';
        inputFt.classList.add('form-control', 'f_t');
        tdFt.appendChild(inputFt);
        tr.appendChild(tdFt);


        tbody.appendChild(tr);
    }

    _hanldeClickShowChart = () => {
        if (this._checkEmptyExpriments()) return;
        this._getDataForChart();
    }

    _hanldeClickLoadTable = (event) => {
        let files = event.target.files;
        if (files.length == 0) return;

        let file = files[0];
        let reader = new FileReader();
        reader.readAsBinaryString(file);

        reader.onload = (e) => {   //Handle the load event. Triggered when the read operation completes.
            let data = e.target.result;
            let workbook = XLSX.read(data, { type: 'binary' }); //XLSX: / xlsx.core.min.js read excel through XLSX.read(data, {type: type}) method

            let sheetNames = workbook.SheetNames; // Sheet name collection
            let worksheet = workbook.Sheets[sheetNames[0]]; // Here we only read the first sheet 

            let sheetData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: true
            });

            const [, ...dataTable] = sheetData;

            this._renderDataWithFile(dataTable);
        };
    }

    _renderDataWithFile = data => {
        const tbody = this._table.querySelector('tbody');

        while (tbody.lastElementChild) {
            tbody.removeChild(tbody.lastElementChild);
        }

        for (const row of data) {
            const tr = document.createElement('tr');
            tr.dataset.expriment = row[0];

            const tdExperimentNumber = document.createElement('td');
            tdExperimentNumber.innerText = row[0];

            tr.appendChild(tdExperimentNumber);

            const tdFmc = document.createElement('td');
            const inputFmc = document.createElement('input');
            inputFmc.type = 'number';
            inputFmc.classList.add('form-control', 'f_mc');
            inputFmc.value = row[1];
            tdFmc.appendChild(inputFmc);
            tr.appendChild(tdFmc);

            const tdFter = document.createElement('td');
            const inputFter = document.createElement('input');
            inputFter.type = 'number';
            inputFter.classList.add('form-control', 'f_ter');
            inputFter.value = row[2];
            tdFter.appendChild(inputFter);
            tr.appendChild(tdFter);

            const tdFt = document.createElement('td');
            const inputFt = document.createElement('input');
            inputFt.type = 'number';
            inputFt.classList.add('form-control', 'f_t');
            inputFt.value = row[3];
            tdFt.appendChild(inputFt);
            tr.appendChild(tdFt);

            tbody.appendChild(tr);
        }
        this._hanldeClickShowChart();
    }

    _hanldeClickSaveTable = () => {
        if (this._checkEmptyExpriments()) return;

        const wb = XLSX.utils.book_new();
        wb.SheetNames.push("experimens");

        const title = [['№ эксперимента', 'Fмс', 'Fтер', 'F(t)']];

        const data = this._listExpriments.map(experiment => {
            return [
                experiment.exprimentNumber,
                experiment.fMs,
                experiment.fTer,
                experiment.Ft
            ];
        });

        var ws = XLSX.utils.aoa_to_sheet([...title, ...data]);
        wb.Sheets["experimens"] = ws;

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

        saveAs(new Blob([this._s2ab(wbout)], { type: "application/octet-stream" }), 'experimens.xlsx');
    }

    _loadAllExperiments = () => {
        const tbody = this._table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');

        for (const row of rows) {
            const exprimentNumber = row.dataset.expriment;
            const fMs = parseFloat(parseFloat(row.querySelector('.f_mc').value).toFixed(5));
            const fTer = parseFloat(parseFloat(row.querySelector('.f_ter').value).toFixed(5));
            const fTEl = row.querySelector('.f_t');

            if (!fMs || !fTer) continue;

            const Ft = this._calculateByFormulaFt(fMs, fTer);
            fTEl.value = Ft;

            const experimentId = this._listExpriments.findIndex(item => item.exprimentNumber === exprimentNumber);

            if (experimentId !== -1) {
                this._listExpriments[experimentId] = {
                    exprimentNumber,
                    fMs,
                    fTer,
                    Ft,
                };
            } else {
                this._listExpriments.push({
                    exprimentNumber,
                    fMs,
                    fTer,
                    Ft,
                });
            }
        }
    }

    _calculateByFormulaFt = (fMs, fTer) => {
        const pZh = Fm + fTer + fMs;
        const pZv = (pDt - Fm) + fTer + fMs;
        return parseFloat((pZv + pZh).toFixed(5));
    }

    _checkEmptyExpriments = () => {
        this._loadAllExperiments();

        if (!this._listExpriments.length) {
            alert('Ви не вписали жодного експерименту!');
            return true;
        }
        return false;
    }

    _getDataForChart = () => {
        const values = [];

        for (const value of this._listExpriments) {
            values.push({
                x: value.exprimentNumber,
                y: value.Ft,
            });
        }

        this._chart.data.datasets = [
            {
                data: values,
                backgroundColor: 'rgba(255, 0, 0, 1)',
            }
        ];

        this._chart.update();
    }

    _s2ab(s) {
        const buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
        const view = new Uint8Array(buf);  //create uint8array as viewer
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
        return buf;
    }

    _insert_test_data_ = () => {
        const values = [];


        for (let i = 1; i < 1000; i++) {
            values.push({
                x: i,
                y: parseFloat((Math.random() * 100).toFixed(5))
            });
        }

        console.log(values);

        this._chart.data.datasets = [
            {
                data: values,
                backgroundColor: 'rgba(255, 0, 0, 1)',
            }
        ];

        this._chart.update();
    }
}