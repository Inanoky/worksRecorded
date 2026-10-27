from shapely import make_valid, set_precision
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

from wall_alignment import polygon_parts


def _clean(geometry):
    return set_precision(make_valid(geometry), 1e-10).simplify(0.000002, preserve_topology=True)


def _partition(geometry, max_vertices):
    geometry = _clean(geometry)
    if geometry.geom_type != 'Polygon':
        return [piece for part in polygon_parts(geometry) for piece in _partition(part, max_vertices)]
    if not geometry.interiors and len(geometry.exterior.coords) - 1 <= max_vertices:
        return [geometry]
    x0, y0, x1, y1 = geometry.bounds
    if geometry.interiors:
        point = Polygon(geometry.interiors[0]).representative_point()
        cuts = [(True, point.x), (False, point.y)]
    else:
        cuts = [(True, (x0 + x1) / 2), (False, (y0 + y1) / 2)]
    choices = []
    for vertical, cut in cuts:
        bounds = [box(x0 - 1, y0 - 1, cut, y1 + 1), box(cut, y0 - 1, x1 + 1, y1 + 1)] if vertical else [
            box(x0 - 1, y0 - 1, x1 + 1, cut), box(x0 - 1, cut, x1 + 1, y1 + 1)]
        parts = [_clean(part) for rectangle in bounds for part in polygon_parts(geometry.intersection(rectangle))]
        choices.append((sum(len(part.interiors) for part in parts),
                        sum(part.area < 1e-5 for part in parts),
                        sum(len(part.exterior.coords) for part in parts), len(parts), parts))
    chosen = min(choices, key=lambda value: value[:4])[-1]
    return [piece for part in chosen for piece in _partition(part, max_vertices)]


def simple_polygons(geometry, max_vertices=2048, minimum_area=0):
    pieces = _partition(geometry, max_vertices)
    while True:
        best = None
        for index, first in enumerate(pieces):
            for previous in range(index):
                second = pieces[previous]
                if not first.intersects(second):
                    continue
                joined = _clean(first.union(second))
                if joined.geom_type != 'Polygon' or joined.interiors or len(joined.exterior.coords) - 1 > max_vertices:
                    continue
                score = (first.boundary.intersection(second.boundary).length, joined.area)
                if best is None or score > best[0]:
                    best = (score, index, previous, joined)
        if best is None:
            break
        _, first, second, joined = best
        pieces = [part for index, part in enumerate(pieces) if index not in (first, second)] + [joined]
    return sorted([part for part in pieces if part.area >= minimum_area], key=lambda part: -part.area)


def serialize_geometry(geometry, max_vertices=2048, minimum_area=0):
    pieces = simple_polygons(geometry, max_vertices, minimum_area)
    polygons = [[{'x': round(x, 9), 'y': round(y, 9)} for x, y in part.exterior.coords][:-1] for part in pieces]
    persisted = unary_union([Polygon([(point['x'], point['y']) for point in polygon]) for polygon in polygons])
    return polygons, persisted
