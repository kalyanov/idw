/**
 * Возвращает медианное значение для массива чисел arr
 */
export function getMedianValue(arr: number[]): number {
    if (!arr.length) {
        return 0;
    }

    const sortedArr = arr.sort();
    const center = Math.ceil(arr.length / 2);

    return arr.length % 2 === 0
        ? (sortedArr[center] + sortedArr[center - 1]) / 2
        : sortedArr[center - 1];
}
