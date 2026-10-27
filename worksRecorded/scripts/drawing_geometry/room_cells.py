import math

from shapely.geometry import LineString, Point, mapping
from shapely.ops import unary_union

from wall_alignment import polygon_parts


def circular_arc(points):
    a, b, c, d = points
    t0 = (b[0] - a[0], b[1] - a[1])
    t1 = (c[0] - d[0], c[1] - d[1])
    n0, n1 = (-t0[1], t0[0]), (-t1[1], t1[0])
    determinant = n0[0] * n1[1] - n0[1] * n1[0]
    if abs(determinant) < 1e-8:
        return None
    delta = (d[0] - a[0], d[1] - a[1])
    offset = (delta[0] * n1[1] - delta[1] * n1[0]) / determinant
    center = (a[0] + offset * n0[0], a[1] + offset * n0[1])
    radius = math.dist(center, a)
    other = math.dist(center, d)
    if radius < 1e-8 or abs(radius - other) > radius * 0.015:
        return None
    cosine = sum((a[i] - center[i]) * (d[i] - center[i]) for i in (0, 1)) / radius / other
    if cosine < -0.07 or cosine > 0.95:
        return None
    midpoint = tuple((a[i] + 3 * b[i] + 3 * c[i] + d[i]) / 8 for i in (0, 1))
    if abs(math.dist(center, midpoint) - radius) > radius * 0.015:
        return None
    return center, radius, (a, d)


def quarter_circle(points):
    circle = circular_arc(points)
    if circle is None:
        return None
    center, radius, (a, d) = circle
    cosine = sum((a[i] - center[i]) * (d[i] - center[i]) for i in (0, 1)) / radius ** 2
    return circle if abs(cosine) < 0.07 else None


def door_thresholds(arcs, walls, meters_per_point):
    groups = []
    for arc in arcs:
        circle = circular_arc(arc['points'])
        if circle is None:
            continue
        center, radius, ends = circle
        group = next((g for g in groups if g['pathIndex'] == arc['pathIndex']
                      and math.dist(g['center'], center) * meters_per_point < 0.02
                      and math.dist(g['ends'][1], ends[0]) * meters_per_point < 0.005), None)
        if group:
            group['ends'] = (group['ends'][0], ends[1])
        else:
            groups.append({'center': center, 'radius': radius, 'ends': ends,
                           'pathIndex': arc['pathIndex'], 'itemIndex': arc['itemIndex']})
    candidates = []
    for group in groups:
        center, radius, ends = group['center'], group['radius'], group['ends']
        cosine = sum((ends[0][i] - center[i]) * (ends[1][i] - center[i]) for i in (0, 1)) / radius ** 2
        if abs(cosine) > 0.07:
            continue
        if not 0.35 <= radius * meters_per_point <= 2.5:
            continue
        if walls.distance(Point(center)) * meters_per_point > 0.3:
            continue
        candidates.append(group)
    selected = []
    used = set()
    for i, first in enumerate(candidates):
        for j, second in enumerate(candidates[i + 1:], i + 1):
            distance = math.dist(first['center'], second['center'])
            if abs(distance - first['radius'] - second['radius']) * meters_per_point > 0.12:
                continue
            pairs = [(a, b) for a in first['ends'] for b in second['ends'] if math.dist(a, b) * meters_per_point < 0.12]
            if pairs:
                selected.append({'a': first['center'], 'b': second['center'],
                                 'paths': [first['pathIndex'], second['pathIndex']], 'kind': 'double-door'})
                used.update((i, j))
    for i, candidate in enumerate(candidates):
        if i in used:
            continue
        distances = [(walls.distance(Point(end)), end) for end in candidate['ends']]
        distance, end = min(distances)
        if distance * meters_per_point > 0.35:
            continue
        selected.append({'a': candidate['center'], 'b': end,
                         'paths': [candidate['pathIndex']], 'kind': 'single-door'})
    return selected


def floor_cells(slab, walls, thresholds, meters_per_point):
    lines = []
    for threshold in thresholds:
        a, b = threshold['a'], threshold['b']
        length = math.dist(a, b)
        extension = 0.4 / meters_per_point
        direction = ((b[0] - a[0]) / length, (b[1] - a[1]) / length)
        lines.append(LineString([(a[0] - direction[0] * extension, a[1] - direction[1] * extension),
                                 (b[0] + direction[0] * extension, b[1] + direction[1] * extension)]))
    barriers = unary_union(lines).buffer(0.015, cap_style='square', join_style='mitre')
    floor = slab.difference(walls.buffer(0.015, join_style='mitre')).difference(barriers)
    cells = [part.simplify(0.01, preserve_topology=True) for part in polygon_parts(floor)
             if part.area * meters_per_point ** 2 >= 0.1]
    return cells


def label_cells(cells, rooms, meters_per_point):
    result = []
    for index, cell in enumerate(cells):
        labels = []
        for room in rooms:
            if any(cell.covers(Point(point)) for point in room.get('label') or []):
                labels.append({'id': room['id'], 'name': room['name'], 'bathroom': room['bathroom'],
                               'scheduledM2': room['scheduledM2'], 'label': room['label']})
        result.append({'id': index, 'geometry': mapping(cell), 'measuredM2': cell.area * meters_per_point ** 2,
                       'rooms': labels})
    return result
