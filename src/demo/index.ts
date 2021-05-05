import dat from 'dat.gui';
import { Distribution, getParametersFromUrl, setParametersInUrl } from './utils/params';
import { Cluster, DataItem, MultiPolygonCoords } from '../types';
import { idw, IdwWeightOptions, IdwWeightType } from '../idw';
import { CentroidsAlgorithm, getDataClusters } from '../utils/getDataClusters';
import { getDataRange } from '../utils/getDataRange';
import { getDataDensityContours } from '../utils/getDataDensityContours';
import { drawIDW, drawLegend, drawPointsAndContours } from './utils/draw';
import { ContourMultiPolygon } from 'd3-contour';
import { aggregateDataByGrid } from '../utils/aggregateDataByGrid';
import { getSquareGrid, Grid } from '../utils/getSquareGrid';
import { ColorConfig, D3ColorScheme } from '../utils/getColorByValue';

const MAX_VIEWPORT_SIZE = 2000;
const IDW_TYPES: IdwWeightType[] = ['base', 'modified'];
const DATA_DISTRIBUTION: Distribution[] = ['uniform', 'normal'];
const DATA_NAMES: string[] = [
    'generate',
    '100-points-500x500',
    '500-points-500x500-normal',
    '1000-points-500x500',
];
const CENTROIDS_ALGORITHMS: CentroidsAlgorithm[] = [
    'kMeansByCount',
    'kMeansByValues',
    'byCount',
    'byValues',
    'kmpp',
    'kmrand',
];
const COLOR_SCHEMES: D3ColorScheme[] = [
    'interpolateRdYlGn',
    'interpolateYlGnBu',
    'interpolateGreys',
    'interpolateBlues',
    'interpolateRainbow',
    'interpolatePlasma',
    'interpolateInferno',
    'interpolateMagma',
    'interpolateSinebow',
];

/**
 * Инициализируем демо
 */

const params = getParametersFromUrl({
    width: 500,
    height: 500,

    data: 'generate',
    pointsCount: 100,
    minValue: 1,
    maxValue: 100,
    valueDist: 'uniform',
    coordDist: 'uniform',

    aggregate: false,
    gridSize: 30,
    minPointsInGrid: 5,

    type: 'modified',
    radius: 100,
    power: 2,

    colorScheme: 'interpolateRdYlGn',
    isDiscrete: true,
    isReversed: true,
    colorCount: 10,
    algorithm: 'kMeansByCount',

    bandwidth: 20,
    threshold: 0.003,
    pixelsInGridUnit: 1,
    densityColor: '#000',

    showContours: false,
    showPoints: false,
    showValues: false,
    showGrid: false,
    showLegend: true,
    applyContours: false,
});

const viewport = document.getElementById('viewport') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
const densityContainer = document.getElementById('density') as HTMLDivElement;
const legendContainer = document.getElementById('legend') as HTMLDivElement;

let originalData: DataItem[] = [];
let data: DataItem[] = [];
let contours: ContourMultiPolygon[] = [];
let grid: Grid = { x: [], y: [] };
let clusters: Cluster[] | undefined;
let colorConfig: ColorConfig = {};

redraw({ isInitial: true });

/**
 * Инициализируем панель опций
 */

const gui = new dat.GUI();
gui.useLocalStorage = true;
const guiParent = gui.domElement.parentElement;
if (guiParent) {
    guiParent.style.zIndex = '10';
}
gui.domElement.style.float = 'left';
gui.domElement.style.marginLeft = '0';

const dataFolder = gui.addFolder('Data');
const dataController = dataFolder.add(params, 'data', DATA_NAMES);
dataController.onChange(() => redraw({ shouldUpdateData: true }));
// dataFolder.add(params, 'width', 0, MAX_VIEWPORT_SIZE);
// dataFolder.add(params, 'height', 0, MAX_VIEWPORT_SIZE);
dataFolder.add(params, 'pointsCount');
dataFolder.add(params, 'minValue');
dataFolder.add(params, 'maxValue');
dataFolder.add(params, 'valueDist', DATA_DISTRIBUTION);
dataFolder.add(params, 'coordDist', DATA_DISTRIBUTION);

const aggregateFolder = gui.addFolder('Data aggregation');
aggregateFolder.add(params, 'aggregate');
aggregateFolder.add(params, 'gridSize', 1);
aggregateFolder.add(params, 'minPointsInGrid', 1);

const idwFolder = gui.addFolder('IDW');
idwFolder.add(params, 'type', IDW_TYPES);
idwFolder.add(params, 'radius', 0, MAX_VIEWPORT_SIZE);
idwFolder.add(params, 'power');

const paletteFolder = gui.addFolder('Palette');
paletteFolder.add(params, 'colorScheme', COLOR_SCHEMES);
paletteFolder.add(params, 'isReversed');
paletteFolder.add(params, 'isDiscrete');
paletteFolder.add(params, 'colorCount', 1);
paletteFolder.add(params, 'algorithm', CENTROIDS_ALGORITHMS);

const densityFolder = gui.addFolder('Density');
densityFolder.add(params, 'bandwidth');
densityFolder.add(params, 'threshold').step(0.000001);
densityFolder.add(params, 'pixelsInGridUnit');
densityFolder.addColor(params, 'densityColor');

const viewFolder = gui.addFolder('View');
viewFolder.add(params, 'showContours').onChange(redrawContours);
viewFolder.add(params, 'showPoints').onChange(redrawContours);
viewFolder.add(params, 'showValues').onChange(redrawContours);
viewFolder.add(params, 'showGrid').onChange(redrawContours);
viewFolder.add(params, 'showLegend').onChange(redrawLegend);
viewFolder.add(params, 'applyContours').onChange(redraw);

gui.add({ '#redraw': redraw }, '#redraw');
gui.add({ '#regenerate': () => dataController.setValue('generate') }, '#regenerate');

/**
 * Перерисовывает демо полностью
 */
async function redraw({
    isInitial,
    shouldUpdateData,
}: { isInitial?: boolean; shouldUpdateData?: boolean } = {}): Promise<void> {
    resetViewport();

    const { width, height } = params;

    if (!isInitial) {
        setParametersInUrl(params);
    }

    if (isInitial) {
        document.body.style.display = 'block';
    }

    originalData = shouldUpdateData || !originalData.length ? await getDataItems() : originalData;

    grid = getSquareGrid({ width, height, gridSize: params.gridSize });

    if (params.aggregate) {
        data = aggregateDataByGrid(originalData, grid, params.minPointsInGrid);
    } else {
        data = originalData;
    }

    if (!data.length) {
        alert(
            'Массив данных пуст, вероятно стоит изменить параметры агрегации или вообще отключить ее',
        );
    }

    colorConfig = {
        scheme: params.colorScheme,
        isReversed: params.isReversed,
    };

    const valueRange = getDataRange(data);

    clusters =
        params.isDiscrete && data.length
            ? getDataClusters(data, valueRange, colorConfig, params.colorCount, params.algorithm)
            : undefined;

    contours = getDataDensityContours(
        data,
        {
            bandwidth: params.bandwidth,
            threshold: params.threshold,
            pixelsInGridUnit: params.pixelsInGridUnit,
        },
        { width, height },
    );

    const densityContour = contours[0].coordinates as MultiPolygonCoords;

    const idwData = idw(data, getIdwWeightOptions(), {
        width,
        height,
        contour: params.applyContours ? densityContour : undefined,
    });

    drawIDW(canvasContext, idwData, {
        width,
        height,
        valueRange,
        clusters,
        colorConfig,
    });

    drawPointsAndContours(densityContainer, contours, grid, data, {
        width,
        height,
        color: params.densityColor,
        showContours: params.showContours,
        showPoints: params.showPoints,
        showValues: params.showValues,
        showGrid: params.showGrid,
    });

    if (params.showLegend) {
        drawLegend(legendContainer, colorConfig, params.isDiscrete, valueRange, data, clusters);
    }

    console.log('=================================================');
    console.log('Начальные данные', originalData);
    console.log('Агрегированные данные', data);
    console.log('Интервал значений', valueRange);
    console.log('Кластеры палитры', clusters);
    console.log('');
}

/**
 * Перерисовывает только контуры плотности и точки данных
 */
function redrawContours() {
    setParametersInUrl(params);

    densityContainer.innerHTML = '';

    drawPointsAndContours(densityContainer, contours, grid, data, {
        width: params.width,
        height: params.height,
        color: params.densityColor,
        showContours: params.showContours,
        showPoints: params.showPoints,
        showValues: params.showValues,
        showGrid: params.showGrid,
    });
}

/**
 * Перерисовывает только легенду
 */
function redrawLegend() {
    setParametersInUrl(params);

    legendContainer.innerHTML = '';

    if (params.showLegend) {
        drawLegend(
            legendContainer,
            colorConfig,
            params.isDiscrete,
            getDataRange(data),
            data,
            clusters,
        );
    }
}

/**
 * Очищает viewport
 */
function resetViewport() {
    const { width, height } = params;

    viewport.style.width = `${width}px`;
    viewport.style.height = `${height}px`;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;
    canvasContext.clearRect(0, 0, width, height);

    densityContainer.style.width = `${width}px`;
    densityContainer.style.height = `${height}px`;
    densityContainer.innerHTML = '';
}

/**
 * Вычисляет объект опции для веса IDW
 */
function getIdwWeightOptions(): IdwWeightOptions {
    switch (params.type) {
        case 'modified':
            return {
                type: 'modified',
                radius: params.radius,
            };

        case 'base':
            return {
                type: 'base',
                power: params.power,
            };
    }
}

/**
 * Подгружает или генерирует новые данные
 */
async function getDataItems(): Promise<DataItem[]> {
    if (params.data === 'generate') {
        const data: DataItem[] = [];
        while (data.length < params.pointsCount) {
            data.push(generateDataItem());
        }
        return data;
    }

    return await fetch(`${params.data}.json`)
        .then((response) => response.json())
        .then((data: DataItem[]) => data)
        .catch((error) => {
            throw new Error(error);
        });
}

function generateDataItem(): DataItem {
    const { width, height, maxValue, minValue } = params;
    return {
        point: [
            getRandomBetween(0, width, params.coordDist),
            getRandomBetween(0, height, params.coordDist),
        ],
        value: getRandomBetween(minValue, maxValue, params.valueDist),
    };
}

/**
 * Возвращает случайное целое число из интервала (min, max).
 * 'uniform' — приблизительно равномерное распределение
 * 'normal' — приблизительно нормальное.
 */
function getRandomBetween(
    min: number,
    max: number,
    distribution: 'uniform' | 'normal' = 'uniform',
): number {
    const rand = distribution === 'normal' ? randomNormal() : randomEven();
    return Math.floor(rand * (max - min) + min);
}

/**
 * Возвращает случайное целое число из интервала (0, 1) с приблизительно равномерным распределением.
 */
function randomEven(): number {
    let u = Math.random();
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    return u;
}

/**
 * Возвращает случайное целое число из интервала (0, 1) с приблизительно нормальным распределением.
 * Основано на https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
 */
function randomNormal(): number {
    // Числа из интервала [0,1)
    let u = Math.random(),
        v = Math.random();

    // Приводим к (0,1)
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    // Приводим случайную величину к (0, 1)
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0) return randomNormal();

    return num;
}
