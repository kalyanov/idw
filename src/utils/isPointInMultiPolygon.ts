import { polygonContains } from 'd3-polygon';
import { MultiPolygonCoords, Point } from '../types';

/**
 * Вернет true, если точка находится внутри полигона.
 */
export function isPointInMultiPolygon(point: Point, multiPolygon: MultiPolygonCoords): boolean {
    return multiPolygon.some(
        (polygon) =>
            polygonContains(polygon[0] as Point[], point) &&
            polygon.slice(1).every((ring) => !polygonContains(ring as Point[], point)),
    );
}
