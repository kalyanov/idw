import * as d3ScaleChromatic from 'd3-scale-chromatic';

import { RGB, Range } from '../types';

export type D3ColorScheme =
    | 'interpolateBlues'
    | 'interpolateBrBG'
    | 'interpolateBuGn'
    | 'interpolateBuPu'
    | 'interpolateCividis'
    | 'interpolateCool'
    | 'interpolateCubehelixDefault'
    | 'interpolateGnBu'
    | 'interpolateGreens'
    | 'interpolateGreys'
    | 'interpolateInferno'
    | 'interpolateMagma'
    | 'interpolateOrRd'
    | 'interpolateOranges'
    | 'interpolatePRGn'
    | 'interpolatePiYG'
    | 'interpolatePlasma'
    | 'interpolatePuBu'
    | 'interpolatePuBuGn'
    | 'interpolatePuOr'
    | 'interpolatePuRd'
    | 'interpolatePurples'
    | 'interpolateRainbow'
    | 'interpolateRdBu'
    | 'interpolateRdGy'
    | 'interpolateRdPu'
    | 'interpolateRdYlBu'
    | 'interpolateRdYlGn'
    | 'interpolateReds'
    | 'interpolateSinebow'
    | 'interpolateSpectral'
    | 'interpolateTurbo'
    | 'interpolateViridis'
    | 'interpolateWarm'
    | 'interpolateYlGn'
    | 'interpolateYlGnBu'
    | 'interpolateYlOrBr'
    | 'interpolateYlOrRd';

export interface ColorConfig {
    // Название палитры из d3. Палитры описаны здесь: https://github.com/d3/d3-scale-chromatic
    // Можно использовать любую, у которой название начинается с «interpolate».
    scheme?: D3ColorScheme;

    // Нужно ли разворачивать палитру в обратном направлении. Если карта тёмная, лучше,
    // когда в начале палитры более тёмные оттенки, и наоборот.
    isReversed?: boolean;
}

/**
 * Сопоставляет цвет значению в соответствии с переданным конфигом палитры.
 * В конфиге все палитры непрерывные, по умолчанию используется палитра `interpolateRdYlGn`
 * Ф-я получения цвета из палитры принимает значения от 0 до 1,
 * для нормализации поля value используется поле Range, содержащее минимальное и максимальное возможные значения.
 */
export function getColorByValue(
    value: number,
    { min, max }: Range,
    config?: ColorConfig,
): RGB | undefined {
    if (Number.isNaN(value)) {
        return;
    }

    const scheme = config?.scheme ?? 'interpolateRdYlGn';

    let normalizedValue = (value - min) / (max - min);

    if (config && config.isReversed) {
        normalizedValue = 1 - normalizedValue;
    }

    const colorFunc = d3ScaleChromatic[scheme];
    const color = colorFunc(normalizedValue);

    return color[0] === '#' ? hexToRgb(color) : stringToRgb(color);
}

/**
 * Конвертирует цвет в формате rgba(R,G,B,A) в [R, G, B]
 */
function stringToRgb(color: string): RGB {
    const split = color.slice(4, -1).split(',');
    return [Number(split[0]), Number(split[1]), Number(split[2])];
}

/**
 * Конвертирует цвет в формате HEX в [R, G, B]
 */
export function hexToRgb(hex: string): RGB {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}
