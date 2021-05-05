import { Cluster, RGB } from '../types';

/**
 * Возвращает цвет кластера, вк которому принадлежит переданное значение.
 * Если значение меньше минимального, то вернет цвет первого кластера, если больше, то последнего.
 * Ф-я ожидает, что массив кластеров будет отсортирован по возрастанию значений. сами кластеры.
 */
export function getColorByValueFromCluster(value: number, clusters: Cluster[]): RGB | undefined {
    if (Number.isNaN(value)) {
        return;
    }

    // Крайние случаи
    if (value < clusters[0].min) {
        return clusters[0].color;
    }

    if (value >= clusters[clusters.length - 1].max) {
        return clusters[clusters.length - 1].color;
    }

    // Определяем кластер, в который попадает переданное значение
    let clusterIndex = 0;
    while (value < clusters[clusterIndex].min || value >= clusters[clusterIndex].max) {
        clusterIndex++;
    }

    return clusters[clusterIndex].color;
}
