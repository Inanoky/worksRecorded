# Latvia construction businesses with EUR 1m to under EUR 2m turnover

Calculated 18 September 2026 using government CSV downloads, not a commercial estimate.

## Results

2024 reported turnover: 378 distinct legal entities. NACE divisions as published in VID 2024 tax records: 41 = 143, 42 = 74, 43 = 161.

Current register check: 377 have neither a termination date nor a closed flag. One division 43 company is marked reorganised/closed on 17 October 2025. Therefore 160 specialty contractors remain without these closure markers. Absence of a closure marker is not proof of current trading, and insolvency/suspension was not separately checked.

## Method

1. Download full CSVs; the tax dataset API preview was incomplete and was not used for the final calculation.
2. Select VID tax records for 2024 and main NACE code starting 41, 42 or 43. Use codes as published, without asserting they are frozen historical NACE Rev. 2 classifications.
3. Join by legal-entity registration number to annual-report headers for reference year 2024, source_type UGP (individual company reports). Exclude consolidated UKGP reports. Keep the latest submitted record per company based on created_at, then report id.
4. Join income statements by statement_id. Check duplicate values: no conflicting turnover found for selected reports. Convert reporting units to euros using rounded_to_nearest.
5. Count turnover >= EUR 1,000,000 and < EUR 2,000,000, without an employee-size restriction.
6. Check termination and closure fields in the current Enterprise Register CSV.

Coverage: 12,388 distinct construction-coded entities in the VID 2024 records; 9,238 match individual annual reports tagged 2024. These 378 are observed matches, not a guarantee that all missing-report entities fall outside the band. Of 378 selected reports, 371 cover 1 January to 31 December 2024; 3 cover other twelve-month periods ending in 2024 and 4 cover shorter first periods. Figures are reported turnover, not annualised. 289 of the 378 also report 10-49 employees.

## Sources

- Annual reports and income statements: https://data.gov.lv/dati/dataset/gada-parskatu-finansu-dati
- VID tax records with main activity code: https://data.gov.lv/dati/lv/dataset/komersantu-ieprieksejos-tris-taksacijas-gados-samaksato-vid-administreto-nodoklu-kopsummas
- Current Enterprise Register: https://data.gov.lv/dati/dataset/uz
- Eurostat size-class methodology: https://ec.europa.eu/eurostat/cache/metadata/en/sbs_esms.htm

EU-27: no verified count for construction and the EUR 1m-2m turnover band was found. Eurostat SBS construction size classes use employment. The supplementary turnover-size breakdown is for trade (section G), not construction. The earlier 141,914 figure for specialty contractors with 10-49 persons employed must not be relabelled as a turnover-band count.

## Customer classification note

The tax dataset places ZTC (40003013740) in 1623 (manufacturing) and SIA 1212 (40103400727) in 6832 (real-estate activities). They therefore do not count in a construction NACE 41-43 population even though they are WorksRecorded customers. Stone & Tree's EUR 911,748 is below the new EUR 1m lower threshold.
