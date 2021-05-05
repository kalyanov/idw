/**
 * Common geometry types
 */
type X = number;
type Y = number;

export type Point = [X, Y];

export type MultiPolygonCoords = Point[][][];

/**
 * Common color types
 */
type Red = number;
type Green = number;
type Blue = number;

export type RGB = [Red, Green, Blue];

/**
 * Common data types
 */
export interface DataItem {
    point: Point;
    value: number;
}

export interface Cluster {
    items: DataItem[];
    min: number;
    max: number;
    color?: RGB;
}

export interface Range {
    min: number;
    max: number;
}
