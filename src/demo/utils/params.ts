import { IdwWeightType } from '../../idw';
import { D3ColorScheme } from '../../utils/getColorByValue';
import { CentroidsAlgorithm } from '../../utils/getDataClusters';

export type Distribution = 'normal' | 'uniform';

export interface Params {
    // Параметры вьюпорта
    width: number;
    height: number;

    // Параметры исходных данных
    data: string;
    pointsCount: number;
    maxValue: number;
    minValue: number;
    valueDist: Distribution;
    coordDist: Distribution;

    // Параметры агрегации данных
    aggregate: boolean;
    gridSize: number;
    minPointsInGrid: number;

    // Параметры IDW
    type: IdwWeightType;
    radius: number;
    power: number;

    // Параметры цветовой палитры
    colorScheme: D3ColorScheme;
    isReversed: boolean;
    colorCount: number;
    algorithm: CentroidsAlgorithm;

    // Параметры контура плотности
    bandwidth: number;
    threshold: number;
    pixelsInGridUnit: number;
    densityColor: string;

    // Actions
    showContours: boolean;
    showPoints: boolean;
    showValues: boolean;
    showGrid: boolean;
    showLegend: boolean;
    isDiscrete: boolean;
    applyContours: boolean;
}

export function getParametersFromUrl(defaults: Params): Params {
    const params = defaults;

    location.search
        .slice(1)
        .split('&')
        .map((str) => str.split('='))
        .forEach(([name, value]) => {
            switch (name) {
                // Strings
                case 'data':
                    params[name] = value;
                    break;

                // Colors
                case 'densityColor':
                    params[name] = `#${value}`;
                    break;

                // Numbers
                case 'width':
                case 'height':
                case 'pointsCount':
                case 'minValue':
                case 'maxValue':
                case 'radius':
                case 'power':
                case 'colorCount':
                case 'pixelsInGridUnit':
                case 'gridSize':
                case 'minPointsInGrid':
                    params[name] = Number(value);
                    break;

                // Booleans
                case 'isReversed':
                case 'showContours':
                case 'showPoints':
                case 'showValues':
                case 'aggregate':
                case 'showGrid':
                case 'showLegend':
                case 'isDiscrete':
                    params[name] = value === '1' ? true : false;
                    break;

                // Custom types
                case 'type':
                    params.type = value as IdwWeightType;
                    break;

                case 'colorScheme':
                    params.colorScheme = value as D3ColorScheme;
                    break;

                case 'centroids':
                    params.algorithm = value as CentroidsAlgorithm;
                    break;
            }
        });

    return params;
}

export function setParametersInUrl(params: Params): void {
    const queryParams: string[] = [];
    for (const key in params) {
        const name = key as keyof Params;
        switch (name) {
            case 'isReversed':
            case 'showContours':
            case 'showPoints':
            case 'showValues':
            case 'applyContours':
            case 'aggregate':
            case 'showGrid':
            case 'showLegend':
            case 'isDiscrete':
                queryParams.push(`${key}=${params[name] ? 1 : 0}`);
                break;

            case 'densityColor':
                queryParams.push(`${key}=${params[name].substr(1)}`);
                break;

            default:
                if (!params[name]) {
                    break;
                }
                queryParams.push(`${key}=${params[name]}`);
                break;
        }
    }

    history.replaceState({}, document.title, `${location.pathname || ''}?${queryParams.join('&')}`);
}
