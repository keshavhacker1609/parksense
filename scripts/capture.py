"""Capture submission snapshots from the running console (localhost:5190)."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://localhost:5190"


def run():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 900},
                        device_scale_factor=2)
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_selector(".prow", timeout=30000)
        time.sleep(6)  # let basemap tiles + deck layer settle

        pg.screenshot(path=str(OUT / "01_command_heatmap.png"))
        print("saved 01_command_heatmap.png")

        # open a hotspot's CIS breakdown + forecast
        pg.locator(".prow").first.click()
        time.sleep(2.5)
        pg.screenshot(path=str(OUT / "02_cis_breakdown.png"))
        print("saved 02_cis_breakdown.png")

        # analytics view
        pg.get_by_role("button", name="Analytics").click()
        time.sleep(4)
        pg.screenshot(path=str(OUT / "03_analytics.png"))
        print("saved 03_analytics.png")

        # back to command, apply a vehicle filter to show live re-scoring
        pg.get_by_role("button", name="Command").click()
        time.sleep(1.5)
        chip = pg.locator(".chip", has_text="BUS (BMTC").first
        if chip.count():
            chip.click()
            time.sleep(4)
            pg.screenshot(path=str(OUT / "04_filtered_buses.png"))
            print("saved 04_filtered_buses.png")

        b.close()


if __name__ == "__main__":
    run()
