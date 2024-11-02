
let model;
let xTrain = [];
let yTrain = [];
let xTest = [];
let zActualValue = [];
let yPredicted = [];
let root;
let data;
let events;


document.getElementById("goal").addEventListener("change", function() {
    const selectedGoal = this.value;

    document.getElementById("polyDegreeField").style.display = (selectedGoal === "prediction") ? "block" : "none";
    document.getElementById("naiveField").style.display = (selectedGoal === "trend") ? "block" : "none";
    document.getElementById("decitionTreeField").style.display = (selectedGoal === "decitionTree") ? "block" : "none";
    document.getElementById("myChart").style.display = (selectedGoal === "prediction") ? "block" : "none";
    document.getElementById("graphContainer").style.display = (selectedGoal === "decitionTree") ? "block" : "none";
});

document.getElementById("goal").dispatchEvent(new Event("change"));

function readCSV() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecciona un archivo CSV.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        data = parseCSV(text);
        const headers = data[0];
        populateSelectOptions(headers);

        nb = new NaiveBayes();

        headers.forEach((effectHeader, effectIndex) => {
            const effectColumnValues = data.slice(1).map(row => row[effectIndex]);
            nb.insertCause(effectHeader, effectColumnValues);
        });

        document.getElementById("trainButton").onclick = function () {
            configureTrainData(data);
            trainModel();
        };

        document.getElementById("naiveBayesButton").onclick = function () {
            handleNaiveBayesPrediction(nb, headers);
        };
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const rows = text.trim().split('\n');
    return rows.map(row => row.split(','));
}

function populateSelectOptions(headers) {
    const inputVariablesSelect = document.getElementById("inputVariables");
    const outputVariableSelect = document.getElementById("outputVariable");

    inputVariablesSelect.innerHTML = "";
    outputVariableSelect.innerHTML = "";

    headers.forEach(header => {
        const inputOption = document.createElement("option");
        inputOption.value = header;
        inputOption.textContent = header;
        inputVariablesSelect.appendChild(inputOption);

        const outputOption = document.createElement("option");
        outputOption.value = header;
        outputOption.textContent = header;
        outputVariableSelect.appendChild(outputOption);
    });
}

function configureTrainData(data) {
    const inputVariablesSelect = document.getElementById("inputVariables");
    const outputVariableSelect = document.getElementById("outputVariable");

    const inputIndices = Array.from(inputVariablesSelect.selectedOptions).map(option => option.index);
    const outputIndex = Array.from(outputVariableSelect.selectedOptions).map(option => option.index);

    const trainTestSplit = parseInt(document.getElementById("trainTestSplit").value) / 100;
    const dataPoints = data.slice(1).length;
    const trainSize = Math.floor(dataPoints * trainTestSplit);

    const goal = document.getElementById("goal").value;

    if (goal === 'prediction') {
        xTrain = data.slice(1).map(row => inputIndices.map(i => parseFloat(row[i])));
        yTrain = data.slice(1).map(row => parseFloat(row[outputIndex[0]]));
    }

    if (goal === 'trend') {
        const trainData = data.slice(1);
        xTrain = trainData.map(row => parseFloat(row[0]));
        yTrain = trainData.map(row => parseFloat(row[1]));
        zActualValue = trainData.map(row => parseFloat(row[2])); 
        
    }
}

function encodeCategory(value) {
    if (!isNaN(value)) {
        return parseFloat(value);
    }

    if (!(value in categoryMap)) {
        categoryMap[value] = Object.keys(categoryMap).length + 1;
    }

    return categoryMap[value];
}

function trainModel() {
    const goal = document.getElementById("goal").value;
    const numClasses = parseInt(document.getElementById("numClasses").value);
    const polyDegree = parseInt(document.getElementById("polyDegree").value);

    if (goal === "decitionTree" ) {
        const dataset = data
        model = new DecisionTreeID3(dataset);

        root = model.train(model.dataset);
    } else if (goal === "prediction") {
        model = new PolynomialRegression();
        model.fit(xTrain, yTrain, polyDegree);
    } else {
        alert("Modelo no compatible");

        return;
    }

    alert('Modelo entrenado con éxito');
}

function predictModel() {
    const goal = document.getElementById("goal").value;
    if (goal === "prediction") {
        const xRange = document.getElementById("xRange").value.split('-').map(Number);
        xTest = Array.from({ length: xRange[1] - xRange[0] + 1 }, (_, i) => [i + xRange[0]]);
        yPredicted = model.predict(xTest);
        displayChart();
    }else if (goal === "decitionTree") {
        const headers = data[0].slice(0, -1);
        const d = document.getElementById("infoPrediction").value.split(',')
        
        let infoPrediction = [headers, d] ;
        yPredicted = model.predict(infoPrediction, root);

        let dotString = model.generateDotString(root);
        
        let newString = dotString.replace(/--/g, " -> ");
        
        renderGraph(newString);

    }
    
}

function handleNaiveBayesPrediction(nb, headers) {

    const knownEvents = headers.slice(0, -1).map(header => {
        const value = document.getElementById(header).value;
        return [header, value];decitionTree
    });

    const nbPrediction = nb.predict("clima", knownEvents);
    console.log("Predicción NaiveBayes:", nbPrediction);
    alert("Predicción NaiveBayes: " + JSON.stringify(nbPrediction));
}

let myChartInstance;
function displayChart() {
    const ctx = document.getElementById('myChart').getContext('2d');

    if (myChartInstance) {
        myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xTest.map(point => point[0]),
            datasets: [
                { label: 'Datos de Entrenamiento', data: yTrain, borderColor: 'blue', fill: false },
                { label: 'Predicción', data: yPredicted, borderColor: 'red', fill: false }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'X' } },
                y: { title: { display: true, text: 'Y' } }
            }
        }
    });
}

function renderGraph(dotString) {
        
    const parsedData = parseDotString(dotString);
    const nodes = new vis.DataSet(parsedData.nodes);
    const edges = new vis.DataSet(parsedData.edges);

    const container = document.getElementById('graphContainer');
    const data = {
        nodes: nodes,
        edges: edges
    };

    var options = {
        layout: {
            hierarchical: {
                levelSeparation: 100,
                nodeSpacing: 100,
                parentCentralization: true,
                direction: 'UD',
                sortMethod: 'directed',
            
            },
        },
    };
    var network = new vis.Network(container, data, options);
}

function parseDotString(dotString) {
    const nodesMap = new Map();
    const edges = [];


    const cleanString = dotString.replace(/^\{|\}$/g, '').trim();
    const sanitizedString = cleanString.replace(/\s+/g, ' ');

    const parts = sanitizedString.split(/;(?=\S)/);

    parts.forEach(part => {
        part = part.trim();

    
        if (part.includes('[')) {
            const id = part.split(' ')[0];
            const labelMatch = part.match(/label="(.*?)"/);
            const label = labelMatch ? labelMatch[1] : id;

        
            if (!nodesMap.has(id)) {
                nodesMap.set(id, { id, label });
            }
        }

    
        if (part.includes('->')) {
            const [fromPart, toPart] = part.split('->');
            const from = fromPart.trim();
            const to = toPart.split('[')[0].trim();
            const labelMatch = toPart.match(/label="(.*?)"/);
            const label = labelMatch ? labelMatch[1] : '';

            edges.push({ from, to, label });
        }
    });


    return {
        nodes: Array.from(nodesMap.values()),
        edges
    };
}





