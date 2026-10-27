import unittest

from shapely.affinity import rotate
from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union

from wall_alignment import build_corridor_proposal, corridor_angle, wall_pair


class WallAlignmentTests(unittest.TestCase):
    def setUp(self):
        self.walls = unary_union([box(-20, -2, 120, 0), box(-20, 10, 120, 12)])
        self.source = Polygon([(10, 3), (45, 4), (90, 2), (90, 7), (40, 8), (10, 7)])

    def test_fills_only_the_original_marked_length_between_wall_faces(self):
        result = build_corridor_proposal(self.source, self.walls, (40, 5), 0, 0.2)
        geometry = shape(result['afterCorridor'])
        self.assertLess(geometry.symmetric_difference(box(10, 0.01, 90, 9.99)).area, 1e-6)
        self.assertAlmostEqual(result['metrics']['corridorWidthM'], 2)
        self.assertAlmostEqual(result['metrics']['markedLengthM'], 16)
        self.assertAlmostEqual(result['metrics']['afterCorridorM2'], 31.936)

    def test_preserves_a_separate_adjoining_room(self):
        room = box(20, 15, 40, 35)
        source = self.source.union(room)
        result = build_corridor_proposal(source, self.walls, (40, 5), 0, 0.2)
        outside = shape(result['afterRecord']).difference(shape(result['envelope']))
        self.assertLess(outside.symmetric_difference(room).area, 1e-6)

    def test_subtracts_cross_wall_jambs_without_closing_the_doorway(self):
        walls = self.walls.union(box(49, 0, 51, 3)).union(box(49, 7, 51, 10))
        result = build_corridor_proposal(self.source, walls, (30, 5), 0, 0.2)
        after = shape(result['afterCorridor'])
        self.assertTrue(after.covers(Point(50, 5)))
        self.assertFalse(after.covers(Point(50, 1)))
        self.assertEqual(result['metrics']['wallOverlapM2'], 0)

    def test_resolves_parallel_walls_when_the_seed_falls_opposite_a_door(self):
        walls = self.walls.difference(box(38, -3, 42, 0.1))
        lower, upper = wall_pair(walls, (40, 5), 0, 20)
        self.assertAlmostEqual(lower, 0)
        self.assertAlmostEqual(upper, 10)

    def test_keeps_area_and_geometry_when_the_building_is_rotated(self):
        angle = -28.4242
        source = rotate(self.source, angle, origin=(0, 0))
        walls = rotate(self.walls, angle, origin=(0, 0))
        seed = rotate(Point(40, 5), angle, origin=(0, 0))
        result = build_corridor_proposal(source, walls, (seed.x, seed.y), angle, 0.2)
        self.assertAlmostEqual(result['metrics']['afterCorridorM2'], 31.936)
        self.assertAlmostEqual(result['metrics']['wallOverlapM2'], 0)

    def test_uses_the_architectural_direction_instead_of_a_wobbly_markup_edge(self):
        source = rotate(self.source, -28, origin=(0, 0))
        line = rotate(Polygon([(0, 0), (100, 0), (100, 1)]), -28.42, origin=(0, 0))
        a, b = list(line.exterior.coords)[:2]
        self.assertAlmostEqual(corridor_angle(source, [{'a': a, 'b': b}]), -28.42)

    def test_rejects_unbounded_corridors_and_seeds_inside_walls(self):
        with self.assertRaisesRegex(ValueError, 'consistent pair'):
            wall_pair(box(-20, -2, 120, 0), (40, 5), 0, 20)
        with self.assertRaisesRegex(ValueError, 'inside a wall'):
            wall_pair(self.walls, (40, -1), 0, 20)

    def test_scale_changes_area_quadratically(self):
        first = build_corridor_proposal(self.source, self.walls, (40, 5), 0, 0.1)
        second = build_corridor_proposal(self.source, self.walls, (40, 5), 0, 0.2)
        self.assertAlmostEqual(second['metrics']['afterCorridorM2'], first['metrics']['afterCorridorM2'] * 4)


if __name__ == '__main__':
    unittest.main()
