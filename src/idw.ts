import KDBush from 'kdbush';
import { DataItem, MultiPolygonCoords, Point } from './types';
import { isPointInMultiPolygon } from './utils/isPointInMultiPolygon';

/**
 * Плоский массив содержащий значения вычисленные по алгоритму IDW
 * для каждого пикселя изображения с размерами width и height.
 * Пиксели лежат в массиве построчно, т. е. первые width пикселей массива — это
 * первая строка изображения, вторые — вторая строка и т. д.
 * Т. о. значение i-го j-го пикселя изображения лежит в `i * imageWidth + j` индексе массива,
 * а длина массива равна width*height.
 */
export type IdwData = number[];

interface IdwBaseWeightOptions {
    type: 'base';
    power: number;
}

interface IdwModifiedWeightOptions {
    type: 'modified';
    radius: number;
}

export type IdwWeightOptions = IdwBaseWeightOptions | IdwModifiedWeightOptions;
export type IdwWeightType = IdwWeightOptions['type'];

interface IdwOptions {
    width: number;
    height: number;
    contour?: MultiPolygonCoords;
}

/**
 * Считает значения по IDW в соответствии с переданным конфигом
 */
export function idw(
    data: DataItem[],
    weightOptions: IdwWeightOptions,
    options: IdwOptions,
): IdwData {
    switch (weightOptions.type) {
        case 'base':
            return idwBase(data, weightOptions, options);
        case 'modified':
            return idwModified(data, weightOptions, options);
    }
}

/**
 * Считает значения по базовой формуле расчета IDW
 */
export function idwBase(
    data: DataItem[],
    { power }: IdwBaseWeightOptions,
    { width, height, contour }: IdwOptions,
): IdwData {
    // Сюда будут записаны рассчитанные значения.
    const idwData: IdwData = [];

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Если точка находится вне контура плотности, то ее рассчитывать не нужно
            if (contour && !isPointInMultiPolygon([x, y], contour)) {
                idwData[y * width + x] = NaN;
                continue;
            }

            // Вычисляем взвешенное среднее. Проходим в цикле по точкам и вычисляем
            // числитель и знаменатель среднего.
            let numerator = 0;
            let denominator = 0;
            let knownValueWasUsed = false;

            for (let i = 0; i < data.length; i++) {
                const { point, value } = data[i];

                const dx = x - point[0];
                const dy = y - point[1];
                const distanceSquared = dx * dx + dy * dy;

                // Рассчитываемая точка совпала с точкой в исходных данны, просто берем значение из данных
                if (distanceSquared === 0) {
                    knownValueWasUsed = true;
                    idwData[y * width + x] = value;
                    continue;
                }

                const distancePowered =
                    power === 2 ? distanceSquared : Math.pow(distanceSquared, power / 2);
                const weight = 1 / distancePowered;

                numerator += weight * value;
                denominator += weight;
            }

            if (knownValueWasUsed) {
                continue;
            }

            idwData[y * width + x] = numerator / denominator;
        }
    }

    return idwData;
}

/**
 * Считает значения по модифицированной формуле расчета IDW
 */
export function idwModified(
    data: DataItem[],
    { radius }: IdwModifiedWeightOptions,
    { width, height, contour }: IdwOptions,
): IdwData {
    // Сюда будут записаны рассчитанные значения.
    const idwData: IdwData = [];

    // Строим kd-дерево для точек, только если рассчитываем по модифицированному формуле IDW с радиусом.
    const dataTree = new KDBush<Point>(data.map((d) => d.point));

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Если точка находится вне контура плотности, то ее рассчитывать не нужно
            if (contour && !isPointInMultiPolygon([x, y], contour)) {
                idwData[y * width + x] = NaN;
                continue;
            }

            // Список точек, влияющих на текущий пиксель.
            const neighborIndices = dataTree.within(x, y, radius);
            if (!neighborIndices.length) {
                idwData[y * width + x] = NaN;
                continue;
            }

            // Вычисляем взвешенное среднее. Проходим в цикле по точкам и вычисляем
            // числитель и знаменатель среднего.
            let numerator = 0;
            let denominator = 0;
            let knownValueWasUsed = false;

            for (const index of neighborIndices) {
                const { point, value } = data[index];

                const dx = x - point[0];
                const dy = y - point[1];
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Рассчитываемая точка совпала с точкой в исходных данны, просто берем значение из данных
                if (distance === 0) {
                    knownValueWasUsed = true;
                    idwData[y * width + x] = value;
                    continue;
                }

                const weight = Math.pow(Math.max(0, radius - distance) / (radius * distance), 2);

                numerator += weight * value;
                denominator += weight;
            }

            if (knownValueWasUsed) {
                continue;
            }

            idwData[y * width + x] = numerator / denominator;
        }
    }

    return idwData;
}
