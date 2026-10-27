import math
import unittest

from shapely.affinity import rotate
from shapely.geometry import Point, box, mapping
from shapely.ops import unary_union

from layout_alignment import WallEdges, align_work_zone, snap_perimeter
from room_cells import door_thresholds, quarter_circle
from serialization import serialize_geometry


class LayoutAlignmentTests(unittest.TestCase):
    def setUp(self):
        self.walls = unary_union([box(-0.2, -0.2, 5.2, 0), box(-0.2, 4, 5.2, 4.2),
                                  box(-0.2, 0, 0, 4), box(5, 0, 5.2, 4)])
        self.edges = WallEdges(self.walls, 1)
        self.room = {'ids': ['room'], 'geometry': mapping(box(0.01, 0.01, 4.99, 3.99)),
                     'bathroom': False, 'label': [(2.5, 2)]}

    def test_fits_native_room_edges_to_inner_wall_faces(self):
        result, count = snap_perimeter(box(0.08, 0.07, 4.93, 3.92), self.edges)
        self.assertEqual(count, 4)
        self.assertAlmostEqual(result.area, 4.98 * 3.98)
        self.assertEqual(result.intersection(self.walls).area, 0)

    def test_follows_the_building_angle_without_a_global_horizontal_grid(self):
        angle = 38.7
        walls = rotate(self.walls, angle, origin=(0, 0))
        room = rotate(box(0.08, 0.07, 4.93, 3.92), angle, origin=(0, 0))
        result, count = snap_perimeter(room, WallEdges(walls, 1))
        self.assertEqual(count, 4)
        self.assertAlmostEqual(result.area, 4.98 * 3.98)

    def test_preserves_partial_work_when_the_room_center_is_unmarked(self):
        source = box(0.01, 0.01, 1, 3.99)
        result, metrics = align_work_zone(source, [self.room], [], self.edges, box(0, 0, 5, 4))
        self.assertLessEqual(result.bounds[2], 1.00001)
        self.assertEqual(metrics['fullRooms'], [])
        self.assertEqual(metrics['partialRooms'], ['room'])

    def test_restores_a_complete_marked_room_without_expanding_into_its_neighbour(self):
        neighbour = {**self.room, 'ids': ['neighbour'], 'geometry': mapping(box(6, 0, 10, 4)), 'label': [(8, 2)]}
        result, metrics = align_work_zone(box(0, 0, 3.5, 4), [self.room, neighbour], [], self.edges, box(0, 0, 10, 4))
        self.assertEqual(metrics['fullRooms'], ['room'])
        self.assertEqual(result.intersection(box(6, 0, 10, 4)).area, 0)

    def test_keeps_bathroom_area_out_of_a_dry_section(self):
        bath = {**self.room, 'ids': ['bath'], 'geometry': mapping(box(6, 0, 10, 4)), 'bathroom': True, 'label': [(8, 2)]}
        result, _ = align_work_zone(box(0, 0, 10, 4), [self.room, bath], [], self.edges, box(0, 0, 10, 4), False)
        self.assertEqual(result.intersection(box(6, 0, 10, 4)).area, 0)

    def test_preserves_corridor_work_endpoints_while_filling_its_width(self):
        corridor = {'ids': ['corridor'], 'angle': 0, 'lower': 5, 'upper': 7,
                    'geometry': mapping(box(0, 5, 10, 7))}
        result, metrics = align_work_zone(box(2, 5.8, 6, 6.2), [], [corridor], self.edges, box(0, 5, 10, 7))
        self.assertEqual(result.bounds, (2, 5, 6, 7))
        self.assertAlmostEqual(result.area, 8)
        self.assertAlmostEqual(metrics['corridors'][0]['beforeM2'], 1.6)

    def test_rejects_work_outside_the_building(self):
        with self.assertRaisesRegex(ValueError, 'No valid'):
            align_work_zone(box(20, 20, 30, 30), [], [], self.edges, box(0, 0, 10, 10))

    def test_room_outline_spill_does_not_mark_an_unpainted_corridor_as_completed(self):
        corridor = {'ids': ['corridor'], 'angle': 0, 'lower': 4, 'upper': 6,
                    'geometry': mapping(box(0, 4, 10, 6))}
        source = box(0.01, 0.01, 4.99, 4.2)
        result, metrics = align_work_zone(source, [self.room], [corridor], self.edges, box(0, 0, 10, 6))
        self.assertEqual(metrics['corridors'], [])
        self.assertEqual(result.intersection(box(0, 4.21, 10, 6)).area, 0)

    def test_a_thin_incidental_strip_keeps_its_extent_without_filling_a_corridor(self):
        corridor = {'ids': ['corridor'], 'angle': 0, 'lower': 5, 'upper': 7,
                    'geometry': mapping(box(0, 5, 10, 7))}
        result, metrics = align_work_zone(box(0, 5, 10, 5.1), [], [corridor], self.edges, box(0, 5, 10, 7))
        self.assertEqual(metrics['corridors'], [])
        self.assertLessEqual(result.bounds[3], 5.10001)

    def test_keeps_an_unmarked_gap_between_two_completed_corridor_segments(self):
        corridor = {'ids': ['corridor'], 'angle': 0, 'lower': 5, 'upper': 7,
                    'geometry': mapping(box(0, 5, 10, 7))}
        source = box(1, 5.6, 3, 6.4).union(box(7, 5.6, 9, 6.4))
        result, _ = align_work_zone(source, [], [corridor], self.edges, box(0, 5, 10, 7))
        self.assertEqual(result.intersection(box(3.3, 5, 6.7, 7)).area, 0)

    def test_keeps_internal_wall_holes_when_serializing_simple_polygons(self):
        source = box(0.1, 0.1, 0.9, 0.9).difference(box(0.4, 0.3, 0.6, 0.7))
        polygons, result = serialize_geometry(source)
        self.assertLess(source.symmetric_difference(result).area, 1e-8)
        self.assertFalse(result.covers(Point(0.5, 0.5)))
        self.assertEqual(len(polygons), 2)

    def test_does_not_split_detailed_boundaries_at_the_old_forty_point_limit(self):
        source = Point(0.5, 0.5).buffer(0.35, quad_segs=32)
        polygons, result = serialize_geometry(source)
        self.assertEqual(len(polygons), 1)
        self.assertGreater(len(polygons[0]), 40)
        self.assertLess(source.symmetric_difference(result).area, 1e-8)

    def test_recognizes_a_door_swing_and_selects_the_closed_threshold(self):
        k = 4 / 3 * math.tan(math.pi / 8)
        points = [(1, 0), (1, k), (k, 1), (0, 1)]
        center, radius, _ = quarter_circle(points)
        self.assertAlmostEqual(radius, 1)
        walls = box(-0.2, -0.2, 0, 0.2).union(box(1, -0.2, 1.2, 0.2))
        thresholds = door_thresholds([{'pathIndex': 1, 'itemIndex': 0, 'points': points}], walls, 1)
        self.assertEqual(len(thresholds), 1)
        self.assertAlmostEqual(thresholds[0]['b'][0], 1)
        self.assertAlmostEqual(thresholds[0]['b'][1], 0)


if __name__ == '__main__':
    unittest.main()
