/**
 * Квадратная сетка.
 * Через каждую точку в оси х проходит вертикальная ось сетки,
 * а оси y — горизонтальная.
 */
export interface Grid {
    x: number[];
    y: number[];
}

/**
 * Возвращает квадратную сетку с размером ячейки gridSize
 * для прямоугольника `{ topLeft: [0, 0], bottomRight: [width, height] }`,
 * рассчитанную так, что центр сетки совпадает с центром прямоугольника.
 */
export function getSquareGrid({
    width,
    height,
    gridSize,
}: {
    width: number;
    height: number;
    gridSize: number;
}): Grid {
    // Центр сетки должен находиться в центре области данных
    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);

    const gridHalfXCount = Math.ceil(width / (2 * gridSize));
    const gridHalfYCount = Math.ceil(height / (2 * gridSize));

    const startX = centerX - gridHalfXCount * gridSize;
    const startY = centerY - gridHalfYCount * gridSize;

    const grid: Grid = { x: [0], y: [0] };

    for (let minX = startX + gridSize; minX < width; minX += gridSize) {
        grid.x.push(minX);
    }
    grid.x.push(width);

    for (let minY = startY + gridSize; minY < height; minY += gridSize) {
        grid.y.push(minY);
    }
    grid.y.push(height);

    return grid;
}
