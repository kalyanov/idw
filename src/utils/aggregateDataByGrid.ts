import KDBush from 'kdbush';
import { DataItem, Point } from '../types';
import { getMedianValue } from './getMedianValue';
import { Grid } from './getSquareGrid';

/**
 * Агрегирует данные по сетке grid.
 * Для каждой ячейки сетки, в которую попало по крайней minPointsCount данных из data,
 * добавляет точку в массив агрегированных данных, координаты и значение которой рассчитаны
 * как медианные координаты и значение всех попавших в ячейку точек.
 */
export function aggregateDataByGrid(
    data: DataItem[],
    grid: Grid,
    minPointsCount: number,
): DataItem[] {
    const aggregatedData: DataItem[] = [];
    const points: Point[] = data.map(({ point }) => [point[0], point[1]]);

    // Строим kd-дерево для точек.
    const tree = new KDBush<Point>(points);

    for (let i = 0; i < grid.x.length - 1; i++) {
        const x1 = grid.x[i];
        const x2 = grid.x[i + 1];
        for (let j = 0; j < grid.y.length - 1; j++) {
            const y1 = grid.y[j];
            const y2 = grid.y[j + 1];

            const indices = tree.range(x1, y1, x2, y2);
            if (indices.length < minPointsCount) {
                continue;
            }

            aggregatedData.push(combineDataItems(indices.map((i) => data[i])));
        }
    }

    return aggregatedData;
}

function combineDataItems(data: DataItem[]): DataItem {
    const { values, x, y } = data.reduce<{
        values: number[];
        x: number[];
        y: number[];
    }>(
        (agg, item) => {
            agg.x.push(item.point[0]);
            agg.y.push(item.point[1]);
            agg.values.push(item.value);
            return agg;
        },
        {
            values: [],
            x: [],
            y: [],
        },
    );

    return {
        point: [getMedianValue(x), getMedianValue(y)],
        value: Math.round(getMedianValue(values)),
    };
}
