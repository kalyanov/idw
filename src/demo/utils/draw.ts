import { ContourMultiPolygon } from 'd3-contour';
import { geoPath } from 'd3-geo';
import { create } from 'd3-selection';
import { IdwData } from '../../idw';
import { Cluster, MultiPolygonCoords, RGB, Range, DataItem } from '../../types';
import { ColorConfig, getColorByValue } from '../../utils/getColorByValue';
import { getColorByValueFromCluster } from '../../utils/getColorByValueFromCluster';
import { Grid } from '../../utils/getSquareGrid';
import { isPointInMultiPolygon } from '../../utils/isPointInMultiPolygon';

/**
 * Отрисовывает данные рассчитанные по IDW на канвасе
 */
export function drawIDW(
    canvasContext: CanvasRenderingContext2D,
    idwData: IdwData,
    {
        width,
        height,
        clusters,
        valueRange,
        colorConfig,
        contour,
    }: {
        width: number;
        height: number;
        valueRange: Range;
        colorConfig: ColorConfig;
        clusters?: Cluster[];
        contour?: MultiPolygonCoords;
    },
): void {
    canvasContext.clearRect(0, 0, width, height);

    const image = canvasContext.createImageData(width, height);

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            const index = j * width + i;
            const imageIndex = 4 * index;

            let rgb: RGB | undefined;
            // Если точка находится вне контура плотности, то ее рассчитывать не нужно
            if (!contour || isPointInMultiPolygon([i, j], contour)) {
                rgb = clusters
                    ? getColorByValueFromCluster(idwData[index], clusters)
                    : getColorByValue(idwData[index], valueRange, colorConfig);
            }

            const [r, g, b] = rgb || [0, 0, 0];

            image.data[imageIndex] = r;
            image.data[imageIndex + 1] = g;
            image.data[imageIndex + 2] = b;
            image.data[imageIndex + 3] = !rgb ? 0 : 255;
        }
    }

    canvasContext.putImageData(image, 0, 0);
}

/**
 * Отрисовывает точки данных и контуры плотности
 */
export function drawPointsAndContours(
    container: HTMLDivElement,
    contours: ContourMultiPolygon[],
    grid: Grid,
    data: DataItem[],
    {
        width,
        height,
        color,
        showPoints,
        showContours,
        showValues,
        showGrid,
    }: {
        width: number;
        height: number;
        color: string;
        showPoints?: boolean;
        showContours?: boolean;
        showValues?: boolean;
        showGrid?: boolean;
    },
): void {
    const svg = create('svg')
        .attr('viewBox', [0, 0, width, height].join(' '))
        .style('display', 'block');

    const svgNode = svg.node();
    if (!svgNode) {
        return;
    }

    if (showContours) {
        svg.append('g')
            .attr('fill', color)
            .attr('fill-opacity', 0.1)
            .attr('stroke', color)
            .attr('stroke-opacity', 0.4)
            .selectAll('path')
            .data(contours)
            .join('path')
            .attr('d', geoPath());
    }

    if (showPoints) {
        svg.append('g')
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d) => d.point[0])
            .attr('cy', (d) => d.point[1])
            .attr('r', 3)
            .attr('fill', color)
            .on('click', (_e, d) => console.log(d));
    }

    if (showValues) {
        svg.append('g')
            .selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .attr('x', (d) => d.point[0] + 4)
            .attr('y', (d) => d.point[1] + 3)
            .attr('text-anchor', 'start')
            .attr('font-size', '9px')
            .attr('fill', color)
            .attr('fill-opacity', 0.5)
            .text((d) => d.value);
    }

    if (showGrid) {
        svg.append('g')
            .selectAll('line')
            .data(grid.x.slice(1, grid.x.length - 1))
            .enter()
            .append('line')
            .attr('stroke', color)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '3,3')
            .attr('x1', (d) => d)
            .attr('y1', 0)
            .attr('x2', (d) => d)
            .attr('y2', height);

        svg.append('g')
            .selectAll('line')
            .data(grid.y.slice(1, grid.x.length - 1))
            .enter()
            .append('line')
            .attr('stroke', color)
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '3,3')
            .attr('x1', 0)
            .attr('y1', (d) => d)
            .attr('x2', width)
            .attr('y2', (d) => d);
    }

    container.appendChild(svgNode);
}

export function drawLegend(
    container: HTMLDivElement,
    colorConfig: ColorConfig,
    isDiscrete: boolean,
    valueRange: Range,
    data: DataItem[],
    clusters: Cluster[] = [],
): void {
    let html = `
        <div class="legend">`;

    if (!isDiscrete) {
        const gradientParts: string[] = [];
        for (let v = 0; v <= 1; v += 0.1) {
            const color = getColorByValue(v, { min: 0, max: 1 }, colorConfig);
            const colorStr = color
                ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`
                : 'transparent';
            gradientParts.push(`${colorStr} ${Math.round(v * 100)}%`);
        }
        const gradient = gradientParts.join(', ');
        const caption = `${formatNumber(valueRange.min)} — ${formatNumber(valueRange.max)} (${
            data.length
        })`;

        html += `
            <div class="legend__line">
                <div class="legend__gradient" style="background-image: linear-gradient(to left, ${gradient});"></div>
                <div>${caption}</div>
            </div>
        `;
    } else {
        for (let i = 0; i < clusters.length; i++) {
            const { color, min, max, items } = clusters[i];
            const rgb = color ? `rgb(${color[0]}, ${color[1]}, ${color[2]})` : 'transparent';

            html += `
            <div class="legend__item">
                <div class="legend__color" style="background-color: ${rgb}"></div>
                <div>${formatNumber(min)} — ${formatNumber(max)} (${items.length})</div>
            </div>
          `;
        }
    }

    html += `
        </div>`;

    container.innerHTML = html;
}

function formatNumber(value: number): string {
    const parts = value.toFixed(2).split('.');
    return `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${parts[1]}`;
}
