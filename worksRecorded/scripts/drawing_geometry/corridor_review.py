import argparse
import json
from pathlib import Path

from shapely.affinity import scale
from shapely.geometry import shape

from wall_alignment import build_corridor_proposal, corridor_angle, extract_wall_cache


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', type=Path, required=True)
    parser.add_argument('--geometry', type=Path, required=True)
    parser.add_argument('--normalized', action='store_true')
    parser.add_argument('--page', type=int, default=1)
    parser.add_argument('--scale', type=float, required=True)
    parser.add_argument('--seed', type=float, nargs=2, required=True)
    parser.add_argument('--bounds', type=float, nargs=4, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.scale <= 0 or args.page < 1:
        parser.error('Scale and page must be positive')
    cache = extract_wall_cache(args.pdf, args.page, args.bounds, args.output.with_suffix('.walls.json'))
    source = shape(json.loads(args.geometry.read_text(encoding='utf8')))
    if args.normalized:
        source = scale(source, xfact=cache['width'], yfact=cache['height'], origin=(0, 0))
    angle = corridor_angle(source, cache['lines'])
    result = build_corridor_proposal(source, shape(cache['walls']), args.seed, angle, args.scale * 0.0254 / 72)
    result.update({'status': 'draft-not-applied', 'drawingKey': cache['key'], 'scale': args.scale,
                   'pageWidth': cache['width'], 'pageHeight': cache['height'], 'seed': args.seed})
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'status': result['status'], 'output': str(args.output), 'metrics': result['metrics']}))


if __name__ == '__main__':
    main()
