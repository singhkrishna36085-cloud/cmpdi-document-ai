import os
import csv
import pandas as pd

UPLOADS_DIR = r"C:\Users\Singh\OneDrive\coal AI\backend\uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

csv_path = os.path.join(UPLOADS_DIR, "CIL_Q1_2026_Mine_Operations_Report.csv")
xlsx_path = os.path.join(UPLOADS_DIR, "CIL_Q1_2026_Mine_Operations_Report.xlsx")

records = [
    {
        "Mine_Name": "Korba Coalfield, Gevra Expansion",
        "Coalfield": "Korba Coalfield",
        "Project": "Gevra Expansion",
        "Subsidiary": "SECL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-08",
        "Raw_Coal_Produced_Tonnes": 3915000,
        "Overburden_Removed_M3": 9870000,
        "Stripping_Ratio": 2.52,
        "Average_Seam_Thickness_M": 12.6,
        "Geological_Notes": "Thick seam deposit with uniform coal sequence, gentle seam dip (< 5 degrees), minor localized faulting in eastern sector.",
        "Safety_Incidents": "0 lost-time injuries, 1 minor equipment damage reported during shovel repositioning.",
        "Risk_Flags": "Slope stability monitor advisory in high-wall section 3B during heavy monsoon runoff.",
        "Prepared_By": "Chief Mining Engineer, SECL / CMPDI Regional Institute V"
    },
    {
        "Mine_Name": "Singrauli Coalfield, Nigahi Project",
        "Coalfield": "Singrauli Coalfield",
        "Project": "Nigahi Project",
        "Subsidiary": "NCL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-02",
        "Raw_Coal_Produced_Tonnes": 2760000,
        "Overburden_Removed_M3": 7340000,
        "Stripping_Ratio": 2.66,
        "Average_Seam_Thickness_M": 9.8,
        "Geological_Notes": "Continuous seam structure, interstratified sandstone and shale overburden, minimal water influx.",
        "Safety_Incidents": "One haul truck near-miss. Corrective action and driver retraining scheduled. Roof/slope audits had no major concerns.",
        "Risk_Flags": "Ash trend requires blending strategy review. Explosives contract renewal is pending and may affect blasting if delayed beyond May.",
        "Prepared_By": "Superintending Engineer (Mining), NCL / CMPDI RI-VI"
    },
    {
        "Mine_Name": "Wani Coalfield, Ukni Project",
        "Coalfield": "Wani Coalfield",
        "Project": "Ukni Project",
        "Subsidiary": "WCL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-07",
        "Raw_Coal_Produced_Tonnes": 1320000,
        "Overburden_Removed_M3": 3410000,
        "Stripping_Ratio": 2.58,
        "Average_Seam_Thickness_M": 4.9,
        "Geological_Notes": "Moderately dipping coal seams with local washouts, moderate groundwater ingress requiring sump pumping.",
        "Safety_Incidents": "One minor conveyor guard failure. Isolated/repaired the same day. No injuries. Fire safety drill conducted.",
        "Risk_Flags": "Approach-road widening behind schedule. Community liaison on dust mitigation.",
        "Prepared_By": "Area Mining Officer, WCL Nagpur Zone"
    },
    {
        "Mine_Name": "Raniganj Coalfield, Sonepur Bazari Project",
        "Coalfield": "Raniganj Coalfield",
        "Project": "Sonepur Bazari Project",
        "Subsidiary": "ECL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-04",
        "Raw_Coal_Produced_Tonnes": 2180000,
        "Overburden_Removed_M3": 6050000,
        "Stripping_Ratio": 2.78,
        "Average_Seam_Thickness_M": 5.6,
        "Geological_Notes": "Multiple thin coal seams separated by carbonaceous shale bands, presence of minor sills.",
        "Safety_Incidents": "0 lost-time injuries, safety audit completed on 2026-03-28.",
        "Risk_Flags": "High stripping ratio alert exceeding baseline design by 0.15.",
        "Prepared_By": "Dy. General Manager (Operations), ECL Sanctoria"
    },
    {
        "Mine_Name": "North Karanpura Coalfield, Piparwar Project",
        "Coalfield": "North Karanpura Coalfield",
        "Project": "Piparwar Project",
        "Subsidiary": "CCL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-06",
        "Raw_Coal_Produced_Tonnes": 2940000,
        "Overburden_Removed_M3": 7610000,
        "Stripping_Ratio": 2.59,
        "Average_Seam_Thickness_M": 8.4,
        "Geological_Notes": "Thick composite seam development, low ash content, competent sandstone roof.",
        "Safety_Incidents": "0 lost-time injuries, 1 near-miss incident during night shift blasting.",
        "Risk_Flags": "Blasting vibration threshold warning near village perimeter 800m north.",
        "Prepared_By": "Project Officer (Mining), CCL Ranchi"
    },
    {
        "Mine_Name": "Jharia Coalfield, Block-4",
        "Coalfield": "Jharia Coalfield",
        "Project": "Block-4",
        "Subsidiary": "BCCL",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-05",
        "Raw_Coal_Produced_Tonnes": 1842000,
        "Overburden_Removed_M3": 5120000,
        "Stripping_Ratio": 2.78,
        "Average_Seam_Thickness_M": 4.2,
        "Geological_Notes": "Seam continuity stable Panel 7/8. Minor faulting at eastern boundary Panel 8. Moisture 6.1%, acceptable grading.",
        "Safety_Incidents": "Two minor conveyor belt maintenance incidents. No fatalities. Roof support compliant with DGMS guidelines.",
        "Risk_Flags": "Mechanized loading procurement delay may affect Q2. Groundwater ingress at lower bench Panel 8. Pumping increased.",
        "Prepared_By": "General Manager (Mining), BCCL Dhanbad"
    },
    {
        "Mine_Name": "Tikak Coalfield, Ledo Project",
        "Coalfield": "Tikak Coalfield",
        "Project": "Ledo Project",
        "Subsidiary": "NEC",
        "Reporting_Period": "Q1 2026",
        "Date": "2026-04-09",
        "Raw_Coal_Produced_Tonnes": 210000,
        "Overburden_Removed_M3": 480000,
        "Stripping_Ratio": 2.29,
        "Average_Seam_Thickness_M": 3.1,
        "Geological_Notes": "High-sulphur tertiary coal deposit, steep seam dip (> 18 degrees), heavy rainfall zone.",
        "Safety_Incidents": "0 lost-time injuries, 1 minor slip incident on bench access slope.",
        "Risk_Flags": "Acid mine drainage prevention protocol active; bench stability monitoring on steep dip section.",
        "Prepared_By": "Regional Controller of Mines, North Eastern Coalfields (NEC), Margherita"
    }
]

# Write CSV
fieldnames = list(records[0].keys())
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(records)

print(f"Created CSV source dataset: {csv_path} (Records: {len(records)})")

# Write XLSX
df = pd.DataFrame(records)
df.to_excel(xlsx_path, index=False)
print(f"Created XLSX source dataset: {xlsx_path} (Records: {len(records)})")
