# Corridor geometry review

This offline tool prepares a draft corridor polygon from native architectural wall geometry. It does not connect to the database, change journal records, or apply quantities.

Install the optional review dependencies in an isolated Python environment:

```powershell
python -m pip install -r scripts/drawing_geometry/requirements.txt
python -m unittest discover -s scripts/drawing_geometry -p "test_*.py"
```

Provide an existing work polygon as GeoJSON, the architectural PDF, its scale denominator, a seed inside the corridor, and a PDF-coordinate region containing the corridor walls:

```powershell
python scripts/drawing_geometry/corridor_review.py --pdf floor.pdf --geometry work.geojson --normalized --page 1 --scale 100 --seed 665.59 1639.67 --bounds 300 1190 1450 1875 --output review/corridor.json
```

The seed and region use PDF points with the origin at the top left. The geometry uses PDF coordinates unless `--normalized` is supplied. The scale is read from the drawing label before invoking this tool; no dimension-line calibration is performed. Area uses PDF points converted to metres at that scale.

The extractor uses the CAD layers `Interior - Partition`, `Structural - Bearing`, and `Shell - General`. Furniture and dimension lines cannot become wall candidates. A cache keyed by the PDF SHA-256, page, extraction bounds, and algorithm version avoids repeating vector extraction. White wall cores are included only when most of their boundary contacts coloured wall fills; white door leaves are excluded.

The wall direction is fitted from architectural segments near the work direction. Multiple perpendicular probes must agree on the two inner wall faces, allowing the seed to fall opposite a doorway. The proposed corridor retains the existing work markup's longitudinal extent, fills the width between those faces, and subtracts actual wall footprints and jambs. Adjacent work geometry is preserved. A small 0.01-point clearance prevents wall overlap from numerical rounding. Detached numerical fragments below 0.01 m² are omitted and their area is reported separately.

Outputs contain the before and proposed geometry, corridor and record m², differences, scale, seed, and drawing fingerprint. Wall-path references are retained in the sibling wall cache. The output is always labelled `draft-not-applied`.

Review the overlay and quantity differences before applying any result. A narrow brush stroke can represent the intent to cover a whole corridor, so fitting the full width can materially increase m². The corridor's drawing room label can cover only one segment of the marked length; its scheduled area is not substituted for the measured footprint. Corridor endpoints retained from the markup are work boundaries rather than inferred room boundaries. Complex bends, inconsistent wall pairs, raster-only PDFs, or different CAD layer names need separate review. This pilot does not straighten adjacent rooms, change payroll allocations, or automatically expand a work record to the entire corridor.
