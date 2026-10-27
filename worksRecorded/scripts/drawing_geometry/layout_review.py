import argparse
import hashlib
import json
from pathlib import Path

from shapely.affinity import scale
from shapely.geometry import mapping, shape

from layout_alignment import WallEdges, align_work_zone
from serialization import serialize_geometry


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    payload = args.input.read_bytes()
    manifest = json.loads(payload)
    floors = {}
    for item in manifest['floors']:
        model = json.loads(Path(item['model']).read_text(encoding='utf8'))
        cache = json.loads(Path(item['walls']).read_text(encoding='utf8'))
        if model['drawingKey'] != cache['key']:
            raise ValueError('Wall cache does not match the reviewed floor model')
        meters = model['scale'] * 0.0254 / 72
        floors[item['floor']] = (model, WallEdges(shape(cache['walls']), meters, cache['lines']))
    results, skipped = [], []
    seen = set()
    for zone in manifest['zones']:
        if zone['id'] in seen:
            raise ValueError('Duplicate zone ID')
        seen.add(zone['id'])
        model, edges = floors[zone['floor']]
        source = scale(shape(zone['geometry']), xfact=model['width'], yfact=model['height'], origin=(0, 0))
        allowed = zone['section'] in ('PA1.2', 'PA1.7') if zone.get('section') else None
        try:
            result, metrics = align_work_zone(source, model['rooms'], model['corridors'], edges,
                                              shape(model['floorGeometry']), allowed)
        except ValueError as error:
            skipped.append({'id': zone['id'], 'reason': str(error)})
            continue
        normalized = scale(result, xfact=1 / model['width'], yfact=1 / model['height'], origin=(0, 0))
        polygons, persisted = serialize_geometry(normalized, minimum_area=1e-8 if zone.get('kind') == 'plan' else 1e-12)
        area = persisted.area * model['width'] * model['height'] * edges.meters_per_point ** 2
        results.append({**zone, 'geometry': mapping(persisted), 'polygons': polygons,
                        'measuredM2': round(area, 2), 'unroundedM2': area, 'metrics': metrics,
                        'drawingKey': model['drawingKey']})
    output = {'status': 'draft-not-applied', 'inputSha256': hashlib.sha256(payload).hexdigest(),
              'zones': results, 'skipped': skipped}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'status': output['status'], 'zones': len(results), 'skipped': len(skipped)}))


if __name__ == '__main__':
    main()
