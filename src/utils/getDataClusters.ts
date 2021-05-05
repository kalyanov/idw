import { Range, DataItem, Cluster } from '../types';
import { ColorConfig, getColorByValue } from './getColorByValue';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const skmeans = require('skmeans');

/**
 * Алгоритм расчета центройдов палитры, центральное значение цветового интервала.
 */
export type CentroidsAlgorithm =
    // делит интервал значений на равные отрезки
    | 'byValues'
    // делит интервал значений на отрезки так, чтобы в каждый интервал попало примерно равное количество данных
    | 'byCount'
    // рассчитывает центройды методом k-средних, начальные центройд для него считает алгоритмом `byValues`
    | 'kMeansByValues'
    // рассчитывает центройды методом k-средних, начальные центройд для него считает алгоритмом `byСount`
    | 'kMeansByCount'

    // Варианты ниже из пакета https://github.com/solzimer/skmeans
    // рассчитывает центройды методом k-средних, начальные центройд для него считает алгоритмом `kmrand`
    | 'kmrand'
    // рассчитывает центройды методом k-средних, начальные центройд для него считает алгоритмом `kmpp`
    | 'kmpp';

/**
 * Разбивает исходный набор данных на кластеры.
 * Каждому кластеру присваивается один цвет.
 */
export function getDataClusters(
    data: DataItem[],
    valueRange: Range,
    colorConfig: ColorConfig,
    centroidsCount: number,
    centroidsAlgorithm: CentroidsAlgorithm,
): Cluster[] {
    const values = data.map((item) => item.value);

    let clusters: Cluster[] = [];

    switch (centroidsAlgorithm) {
        case 'byCount':
            clusters = getEmptyClustersByCount(values, centroidsCount);
            break;

        case 'byValues':
            clusters = getEmptyClustersByCentroids(
                getCentroidsByValue(values, centroidsCount),
                valueRange,
            );
            break;

        case 'kMeansByCount': {
            const initial = getClusterCentroids(getEmptyClustersByCount(values, centroidsCount));
            clusters = getEmptyClustersByCentroids(
                skmeans(values, centroidsCount, initial).centroids,
                valueRange,
            );
            break;
        }

        case 'kMeansByValues': {
            const initial = getCentroidsByValue(values, centroidsCount);
            clusters = getEmptyClustersByCentroids(
                skmeans(values, centroidsCount, initial).centroids,
                valueRange,
            );
            break;
        }

        case 'kmrand':
        case 'kmpp':
            clusters = getEmptyClustersByCentroids(
                skmeans(values, centroidsCount, centroidsAlgorithm).centroids,
                valueRange,
            );
            break;
    }

    // Заполняем кластер данными и считаем цвет
    clusters.forEach((cluster, ind) => {
        cluster.color = getColorByValue((cluster.max + cluster.min) / 2, valueRange, colorConfig);
        cluster.items = data.filter(
            (item) =>
                item.value >= cluster.min &&
                (ind === clusters.length - 1 || item.value < cluster.max),
        );
    });

    return clusters;
}

/**
 * Рассчитывает массив начальных центройдов интервалов, так чтобы рассчитанные по ним кластеры в итоге были одинаковой длинны по значениям.
 */
function getCentroidsByValue(values: number[], count: number): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const centroids: number[] = [];

    const step = Math.round((sorted[sorted.length - 1] - sorted[0]) / count);
    const halfStep = Math.round(step / 2);
    for (let i = 0; i < count; i++) {
        centroids.push(sorted[0] + halfStep + i * step);
    }
    return centroids;
}

/**
 * Возвращает массив пустых кластеров, таких что в каждый кластер попадет примерно одинаковое количество данных
 */
function getEmptyClustersByCount(values: number[], count: number): Cluster[] {
    const sorted = [...values].sort((a, b) => a - b);
    const clusters: Cluster[] = [];

    const clusterCount = Math.round(sorted.length / count);
    for (let i = 0; i < count; i++) {
        const min = i === 0 ? sorted[0] : clusters[i - 1].max;
        const max =
            i === count - 1
                ? sorted[sorted.length - 1]
                : (sorted[(i + 1) * clusterCount + 1] + sorted[(i + 1) * clusterCount]) / 2;

        clusters.push({
            min,
            max,
            items: [],
        });
    }

    return clusters;
}

/**
 * Возвращает массив центройдов кластеров.
 */
function getClusterCentroids(clusters: Cluster[]): number[] {
    return clusters.map(({ min, max }) => (max + min) / 2);
}

/**
 * Возвращает массив пустых кластеров по центройдам.
 */
function getEmptyClustersByCentroids(rawCentroids: number[], range: Range): Cluster[] {
    const centroids = normalizeCentroids(rawCentroids, range);
    const clusters: Cluster[] = [];

    for (let i = 0; i < centroids.length; i++) {
        const isFirst = i === 0;
        const isLast = i === centroids.length - 1;

        clusters.push({
            min: !isFirst ? (centroids[i - 1] + centroids[i]) / 2 : range.min,
            max: !isLast ? (centroids[i] + centroids[i + 1]) / 2 : range.max,
            items: [],
        });
    }

    return clusters;
}

/**
 * Нормализует массив центройдов
 */
function normalizeCentroids(centroids: number[], range: Range): number[] {
    const filteredCentroids = centroids.filter((c) => c >= range.min && c <= range.max);
    filteredCentroids.sort((a, b) => a - b);
    return filteredCentroids;
}
