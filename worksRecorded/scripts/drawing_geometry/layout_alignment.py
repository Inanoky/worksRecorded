import math

from shapely import make_valid
from shapely.affinity import rotate
from shapely.geometry import LineString, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

from wall_alignment import polygon_parts, wall_pair


def clean_floor(geometry, minimum_area):
    return unary_union([part for part in polygon_parts(make_valid(geometry)) if part.area >= minimum_area])


class WallEdges:
    def __init__(self, walls, meters_per_point, support_lines=None):
        self.walls = walls
        self.meters_per_point = meters_per_point
        self.edges = []
        for polygon in polygon_parts(walls):
            for ring in [polygon.exterior, *polygon.interiors]:
                points = list(ring.coords)
                self.edges.extend(LineString([a, b]) for a, b in zip(points, points[1:])
                                  if math.dist(a, b) * meters_per_point >= 0.25)
        self.index = STRtree(self.edges)
        self.segments = [list(edge.coords) for edge in self.edges]
        self.support_segments = self.segments + [(line['a'], line['b']) for line in support_lines or []]

    def fit_edge(self, a, b, tolerance_m):
        length = math.dist(a, b)
        if length * self.meters_per_point < 0.15:
            return a, b, False
        direction = ((b[0] - a[0]) / length, (b[1] - a[1]) / length)
        normal = (-direction[1], direction[0])
        tolerance = tolerance_m / self.meters_per_point
        bounds = LineString([a, b]).buffer(tolerance, cap_style='square').envelope
        candidates = []
        for index in self.index.query(bounds):
            edge = self.edges[index]
            c, d = list(edge.coords)
            vector = ((d[0] - c[0]) / edge.length, (d[1] - c[1]) / edge.length)
            parallel = sum(direction[i] * vector[i] for i in (0, 1))
            if abs(parallel) < math.cos(math.radians(1.5)):
                continue
            projection = sorted(sum((point[i] - a[i]) * direction[i] for i in (0, 1)) for point in (c, d))
            overlap = min(length, projection[1]) - max(0, projection[0])
            if overlap < min(length * 0.15, 0.3 / self.meters_per_point):
                continue
            distance = abs(sum(((c[i] + d[i]) / 2 - (a[i] + b[i]) / 2) * normal[i] for i in (0, 1)))
            if distance <= tolerance:
                candidates.append((distance, -overlap, c, d))
        if not candidates:
            return a, b, False
        _, _, c, d = min(candidates)
        return c, d, True


def line_intersection(first, second):
    a, b = first
    c, d = second
    u, v = (b[0] - a[0], b[1] - a[1]), (d[0] - c[0], d[1] - c[1])
    determinant = u[0] * v[1] - u[1] * v[0]
    if abs(determinant) < 1e-8:
        return None
    delta = (c[0] - a[0], c[1] - a[1])
    t = (delta[0] * v[1] - delta[1] * v[0]) / determinant
    return a[0] + t * u[0], a[1] + t * u[1]


def snap_perimeter(geometry, edges, tolerance_m=0.15):
    pieces = []
    fitted = 0
    for part in polygon_parts(geometry):
        rings = []
        for ring in [part.exterior, *part.interiors]:
            simplified = LineString(ring.coords).simplify(0.005 / edges.meters_per_point)
            points = list(simplified.coords)
            if points[0] != points[-1]:
                points.append(points[0])
            lines = [edges.fit_edge(a, b, tolerance_m) for a, b in zip(points, points[1:])]
            fitted += sum(line[2] for line in lines)
            result = []
            for index, point in enumerate(points[:-1]):
                crossing = line_intersection(lines[index - 1][:2], lines[index][:2])
                result.append(crossing if crossing and math.dist(crossing, point) * edges.meters_per_point <= tolerance_m * 2.5 else point)
            rings.append(result)
        candidate = Polygon(rings[0], rings[1:])
        if not candidate.is_valid or candidate.is_empty:
            candidate = part
        pieces.extend(polygon_parts(candidate))
    result = unary_union(pieces).difference(edges.walls.buffer(0.01, join_style='mitre'))
    return clean_floor(result, 0.01 / edges.meters_per_point ** 2), fitted


def merge_intervals(intervals, max_gap):
    merged = []
    for start, end in sorted(intervals):
        if merged and start - merged[-1][1] <= max_gap:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def corridor_model(seed, edges, floor, room_mask, max_width_m=4):
    meters = edges.meters_per_point
    local_edges = [edges.edges[i] for i in edges.index.query(Point(seed).buffer(5 / meters).envelope)]
    angles = {}
    for edge in local_edges:
        a, b = list(edge.coords)
        angle = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180
        angles.setdefault(round(angle, 1), []).append((angle, edge.length))
    proposals = []
    for group in sorted(angles.values(), key=lambda g: sum(weight for _, weight in g), reverse=True)[:6]:
        angle = sum(value * weight for value, weight in group) / sum(weight for _, weight in group)
        try:
            lower, upper = wall_pair(edges.walls, seed, angle, max_width_m / meters)
        except ValueError:
            continue
        if (upper - lower) * meters < 0.85:
            continue
        center = rotate(Point(seed), -angle, origin=(0, 0))
        cosine, sine = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        spans = []
        for level in (lower, upper):
            intervals = []
            for (ax, ay), (bx, by) in edges.support_segments:
                x0, y0 = cosine * ax + sine * ay, -sine * ax + cosine * ay
                x1, y1 = cosine * bx + sine * by, -sine * bx + cosine * by
                if max(abs(y0 - level), abs(y1 - level)) * meters < 0.25:
                    intervals.append(sorted((x0, x1)))
            groups = merge_intervals(intervals, 4 / meters)
            span = next((span for span in groups if span[0] <= center.x <= span[1]), None)
            if span is None:
                break
            spans.append(span)
        if len(spans) != 2:
            continue
        start = max(span[0] for span in spans) - 2.5 / meters
        end = min(span[1] for span in spans) + 2.5 / meters
        length = (end - start) * meters
        if length < 4:
            continue
        rectangle = rotate(box(start, lower, end, upper), angle, origin=(0, 0))
        geometry = rectangle.intersection(floor).difference(room_mask).difference(edges.walls.buffer(0.01, join_style='mitre'))
        geometry = clean_floor(geometry, 0.01 / meters ** 2)
        parts = [part for part in polygon_parts(geometry) if part.distance(Point(seed)) * meters < 0.15]
        if not parts:
            continue
        geometry = unary_union(parts)
        proposals.append({'angle': angle, 'lower': lower, 'upper': upper, 'start': start, 'end': end,
                          'geometry': mapping(geometry), 'lengthM': length, 'widthM': (upper - lower) * meters})
    if not proposals:
        return None
    return max(proposals, key=lambda p: p['lengthM'] / p['widthM'])


def align_work_zone(source, rooms, corridors, edges, floor, allowed=None):
    meters = edges.meters_per_point
    minimum = 0.01 / meters ** 2
    selected = []
    room_regions = []
    full_rooms = []
    partial_rooms = []
    for room in rooms:
        geometry = shape(room['geometry'])
        if allowed is not None and room['bathroom'] != allowed:
            continue
        overlap = source.intersection(geometry)
        coverage = overlap.area / geometry.area if geometry.area else 0
        if coverage < 0.01:
            continue
        inside = any(source.covers(Point(point)) for point in room.get('label') or [])
        complete = coverage >= 0.6 or (coverage >= 0.3 and inside)
        if complete:
            selected.append(geometry)
            full_rooms.extend(room['ids'])
        else:
            aligned, _ = snap_perimeter(overlap, edges)
            selected.append(aligned)
            partial_rooms.extend(room['ids'])
        room_regions.append(geometry)
    corridor_regions = []
    corridor_changes = []
    if allowed is not True:
        for corridor in corridors:
            geometry = shape(corridor['geometry'])
            overlap = source.intersection(geometry)
            if overlap.area * meters ** 2 < 0.05:
                continue
            local = rotate(overlap, -corridor['angle'], origin=(0, 0))
            start, _, end, _ = local.bounds
            if (end - start) * meters < 0.3:
                continue
            envelope = rotate(box(start, corridor['lower'], end, corridor['upper']), corridor['angle'], origin=(0, 0))
            aligned = envelope.intersection(geometry)
            width = corridor['upper'] - corridor['lower']
            core = rotate(box(start, corridor['lower'] + width * 0.3,
                              end, corridor['upper'] - width * 0.3), corridor['angle'], origin=(0, 0)).intersection(geometry)
            marked_core = source.intersection(core)
            substantial = (marked_core.area * meters ** 2 >= 1 and
                           marked_core.area >= core.area * 0.2 and overlap.area >= aligned.area * 0.15)
            if not substantial:
                if full_rooms and any(geometry.distance(region) * meters < 0.2 for region in room_regions):
                    corridor_regions.append(geometry)
                continue
            local_core = rotate(marked_core, -corridor['angle'], origin=(0, 0))
            spans = merge_intervals([(part.bounds[0], part.bounds[2]) for part in polygon_parts(local_core)
                                     if part.area * meters ** 2 >= 0.1], 0.5 / meters)
            if len(spans) > 1:
                strips = [rotate(box(max(start, left - 0.25 / meters), corridor['lower'],
                                      min(end, right + 0.25 / meters), corridor['upper']),
                                 corridor['angle'], origin=(0, 0)) for left, right in spans]
                aligned = unary_union(strips).intersection(geometry)
            selected.append(aligned)
            corridor_regions.append(geometry)
            corridor_changes.append({'ids': corridor['ids'], 'beforeM2': overlap.area * meters ** 2,
                                     'afterM2': aligned.area * meters ** 2})
    covered = unary_union(room_regions + corridor_regions)
    remainder = source.difference(covered).intersection(floor)
    aligned_remainder, fitted = snap_perimeter(remainder, edges)
    selected.append(aligned_remainder)
    result = clean_floor(unary_union(selected).intersection(floor).difference(edges.walls.buffer(0.01, join_style='mitre')), minimum)
    if allowed is not None:
        opposite = unary_union([shape(room['geometry']) for room in rooms if room['bathroom'] != allowed])
        result = clean_floor(result.difference(opposite), minimum)
    if result.is_empty or not result.is_valid:
        raise ValueError('No valid wall-aligned floor area remains')
    return result, {'fullRooms': sorted(set(full_rooms)), 'partialRooms': sorted(set(partial_rooms)),
                    'corridors': corridor_changes, 'fittedRemainderEdges': fitted,
                    'beforeM2': source.area * meters ** 2, 'afterM2': result.area * meters ** 2,
                    'wallOverlapM2': result.intersection(edges.walls).area * meters ** 2}
