import hashlib
import json
import math
from pathlib import Path

from shapely import make_valid
from shapely.affinity import rotate
from shapely.geometry import LineString, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union


WALL_LAYERS = {"Interior - Partition", "Structural - Bearing", "Shell - General"}


def polygon_parts(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry] if geometry.area > 1e-9 else []
    return [part for child in getattr(geometry, "geoms", []) for part in polygon_parts(child)]


def path_geometry(path):
    rings = []
    current = []

    def append(points):
        nonlocal current
        points = [tuple(point) for point in points]
        if current and math.dist(current[-1], points[0]) > 0.01:
            if len(current) > 2:
                rings.append(current)
            current = []
        if not current:
            current = [points[0]]
        current.extend(points[1:])

    for item in path["items"]:
        if item[0] == "l":
            append(item[1:])
        elif item[0] == "re":
            rectangle = item[1]
            rings.append([(rectangle.x0, rectangle.y0), (rectangle.x1, rectangle.y0), (rectangle.x1, rectangle.y1), (rectangle.x0, rectangle.y1)])
        elif item[0] == "qu":
            quad = item[1]
            rings.append([tuple(quad.ul), tuple(quad.ur), tuple(quad.lr), tuple(quad.ll)])
        elif item[0] == "c":
            a, b, c, d = item[1:]
            append([((1-t)**3*a.x + 3*(1-t)**2*t*b.x + 3*(1-t)*t*t*c.x + t**3*d.x,
                     (1-t)**3*a.y + 3*(1-t)**2*t*b.y + 3*(1-t)*t*t*c.y + t**3*d.y)
                    for t in [i / 16 for i in range(17)]])
    if len(current) > 2:
        rings.append(current)
    result = Polygon()
    for ring in rings:
        candidate = make_valid(Polygon(ring))
        result = result.symmetric_difference(candidate) if path.get("even_odd") else result.union(candidate)
    return unary_union(polygon_parts(make_valid(result)))


def extract_wall_cache(pdf_path, page_number, bounds, cache_path):
    import pymupdf

    pdf_path = Path(pdf_path)
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    key = {"version": 1, "drawingSha256": digest, "page": page_number, "bounds": list(bounds)}
    cache_path = Path(cache_path)
    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf8"))
        if cached["key"] == key:
            return cached
    page = pymupdf.open(pdf_path)[page_number - 1]
    region = box(*bounds)
    solids = []
    white = []
    lines = []
    references = []
    for index, path in enumerate(page.get_drawings()):
        if path.get("layer") not in WALL_LAYERS:
            continue
        rectangle = path["rect"]
        if rectangle.x1 < bounds[0] or rectangle.x0 > bounds[2] or rectangle.y1 < bounds[1] or rectangle.y0 > bounds[3]:
            continue
        if path.get("fill") is not None and "f" in path["type"]:
            geometry = path_geometry(path).intersection(region)
            if not geometry.is_empty:
                entry = (geometry, {"pathIndex": index, "layer": path["layer"]})
                if min(path["fill"]) > 0.98:
                    white.append(entry)
                else:
                    solids.append(entry)
        for item_index, item in enumerate(path["items"]):
            if item[0] != "l" or not path.get("color"):
                continue
            a, b = tuple(item[1]), tuple(item[2])
            if math.dist(a, b) >= 25:
                lines.append({"a": a, "b": b, "pathIndex": index, "itemIndex": item_index, "layer": path["layer"]})
    colored = unary_union([geometry for geometry, _ in solids])
    neighboring = colored.buffer(0.03)
    selected_white = [(geometry, reference) for geometry, reference in white
                      if geometry.boundary.length > 0 and geometry.boundary.intersection(neighboring).length / geometry.boundary.length > 0.5]
    all_solids = solids + selected_white
    walls = unary_union([geometry for geometry, _ in all_solids])
    references.extend(reference for _, reference in all_solids)
    cached = {"key": key, "width": page.rect.width, "height": page.rect.height,
              "layers": sorted(WALL_LAYERS), "walls": mapping(walls), "lines": lines,
              "references": references, "excludedWhiteObjects": len(white) - len(selected_white)}
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cached, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    return cached


def corridor_angle(source, lines):
    outline = list(source.minimum_rotated_rectangle.exterior.coords)
    a, b = max(zip(outline, outline[1:]), key=lambda pair: math.dist(*pair))
    hint = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180
    candidates = []
    for line in lines:
        a, b = line["a"], line["b"]
        angle = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180
        difference = (angle - hint + 90) % 180 - 90
        if abs(difference) < 3:
            candidates.append((hint + difference, math.dist(a, b)))
    if not candidates:
        raise ValueError("No architectural wall direction matches this corridor")
    buckets = {}
    for angle, weight in candidates:
        buckets.setdefault(round(angle / 0.1), []).append((angle, weight))
    dominant = max(buckets.values(), key=lambda values: sum(weight for _, weight in values))
    angle = sum(angle * weight for angle, weight in dominant) / sum(weight for _, weight in dominant)
    return (angle + 90) % 180 - 90


def wall_pair(walls, seed, angle, max_width_points):
    local_walls = rotate(walls, -angle, origin=(0, 0))
    point = rotate(Point(seed), -angle, origin=(0, 0))
    if local_walls.covers(point):
        raise ValueError("The corridor seed lies inside a wall")
    candidates = {}
    for step in range(-16, 17):
        x = point.x + step * max_width_points / 16
        sample = Point(x, point.y)
        if local_walls.covers(sample):
            continue
        probe = LineString([(x, point.y - max_width_points), (x, point.y + max_width_points)])
        obstacles = local_walls.intersection(probe)
        intervals = [part.bounds for part in getattr(obstacles, "geoms", [obstacles]) if not part.is_empty]
        below = [bounds[3] for bounds in intervals if bounds[3] < point.y]
        above = [bounds[1] for bounds in intervals if bounds[1] > point.y]
        if not below or not above:
            continue
        lower, upper = max(below), min(above)
        if upper - lower <= max_width_points:
            candidates.setdefault((round(lower, 1), round(upper, 1)), []).append((lower, upper))
    if not candidates:
        raise ValueError("No consistent pair of corridor walls was found")
    supported = max(candidates.values(), key=len)
    if len(supported) < 3:
        raise ValueError("The corridor wall pair needs at least three supporting probes")
    return tuple(sum(pair[index] for pair in supported) / len(supported) for index in (0, 1))


def build_corridor_proposal(source, walls, seed, angle, meters_per_point, max_width_m=4):
    if not source.is_valid or meters_per_point <= 0:
        raise ValueError("Invalid source geometry or drawing scale")
    lower, upper = wall_pair(walls, seed, angle, max_width_m / meters_per_point)
    local_source = rotate(source, -angle, origin=(0, 0))
    x0, _, x1, _ = local_source.bounds
    corridor_source = local_source.intersection(box(x0 - 1, lower, x1 + 1, upper))
    if corridor_source.is_empty:
        raise ValueError("The work markup does not cross this corridor")
    start, _, end, _ = corridor_source.bounds
    envelope_local = box(start, lower, end, upper)
    envelope = rotate(envelope_local, angle, origin=(0, 0))
    protected_walls = walls.buffer(0.01, join_style="mitre")
    aligned = envelope.difference(protected_walls).simplify(0.005, preserve_topology=True)
    parts = polygon_parts(make_valid(aligned))
    discarded_fragments = sum(part.area for part in parts if part.area * meters_per_point ** 2 < 0.01)
    aligned = unary_union([part for part in parts if part.area * meters_per_point ** 2 >= 0.01])
    if aligned.is_empty:
        raise ValueError("The wall-aligned corridor has no usable floor area")
    nearby_wall_ink = source.intersection(walls).intersection(envelope.buffer(0.25 / meters_per_point, join_style="mitre"))
    unchanged = source.difference(envelope).difference(nearby_wall_ink)
    proposed_record = unchanged.union(aligned)
    factor = meters_per_point ** 2
    if not aligned.is_valid or aligned.intersection(walls).area * factor > 0.0001:
        raise ValueError("The proposed corridor overlaps architectural walls")
    metrics = {
        "beforeCorridorM2": source.intersection(envelope).area * factor,
        "afterCorridorM2": aligned.area * factor,
        "removedWallInkM2": nearby_wall_ink.area * factor,
        "beforeRecordM2": source.area * factor,
        "afterRecordM2": proposed_record.area * factor,
        "corridorWidthM": (upper - lower) * meters_per_point,
        "markedLengthM": (end - start) * meters_per_point,
        "wallOverlapM2": aligned.intersection(walls).area * factor,
        "discardedFragmentM2": discarded_fragments * factor,
    }
    metrics["recordDifferenceM2"] = metrics["afterRecordM2"] - metrics["beforeRecordM2"]
    return {"angleDegrees": angle, "sideWallOffsets": [lower, upper], "workExtent": [start, end],
            "envelope": mapping(envelope), "beforeCorridor": mapping(source.intersection(envelope)),
            "afterCorridor": mapping(aligned), "afterRecord": mapping(proposed_record),
            "unchangedRecordGeometry": mapping(unchanged), "metrics": metrics}
