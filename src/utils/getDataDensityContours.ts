import { contourDensity, ContourMultiPolygon } from 'd3-contour';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { Point } from '../../src/types';
import { DataItem } from '../types';

// Конфиг генерации контура плотности данных https://github.com/d3/d3-contour#contourDensity
export interface DensityContoursConfig {
    // Cреднеквадратичное отклонение ядра Гаусса https://github.com/d3/d3-contour#density_bandwidth
    bandwidth: number;
    // Контур плотности будут сгенерированы в соответствии с этим пороговым значением.
    // Т. е. внутри контура плотность данных должна быть >= threshold
    threshold: number;
    // Количество пикселей в единице измерения сетки для построения контура плотности
    pixelsInGridUnit: number;
}

/**
 * Строит контур плотности данных
 */
export function getDataDensityContours(
    data: DataItem[],
    { bandwidth, threshold, pixelsInGridUnit }: DensityContoursConfig,
    // Размер канваса
    { width, height }: { width: number; height: number },
): ContourMultiPolygon[] {
    const points: Point[] = data.map(({ point }) => [Math.round(point[0]), Math.round(point[1])]);

    const gridX = Math.round(width / pixelsInGridUnit);
    const gridY = Math.round(height / pixelsInGridUnit);

    const xScale = scaleLinear()
        .domain(extent(points, (d) => d[0]) as [number, number])
        .nice()
        .rangeRound([0, gridX]);

    const yScale = scaleLinear()
        .domain(extent(points, (d) => d[1]) as [number, number])
        .nice()
        .rangeRound([0, gridY]);

    return contourDensity<Point>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .size([gridX, gridY])
        .bandwidth(bandwidth)
        .thresholds([threshold])(points);
}
