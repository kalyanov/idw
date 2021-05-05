import { DataItem, Range } from '../types';

/**
 * Считает минимальное и максимальное значения в наборе данных
 */
export function getDataRange(data: DataItem[]): Range {
    const range: Range = { min: Infinity, max: -Infinity };

    for (let i = 0; i < data.length; i++) {
        const value = data[i].value;

        if (value < range.min) {
            range.min = value;
        }

        if (value > range.max) {
            range.max = value;
        }
    }

    return range;
}
