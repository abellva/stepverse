import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 8443
DEBUG_PORT = 9222
BASE_URL = f"http://localhost:{PORT}"
OUT_DIR = r"C:\xampp\htdocs\kk sempro dl\docs\screenshots"
ARTIFACT_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\20f99505-da0d-43bc-a8b0-3e6fc14a7f38\screenshots"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.msg_id = 0
        self.ws = None

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50 * 1024 * 1024)

    async def send(self, method, params=None):
        self.msg_id += 1
        payload = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        while True:
            resp_raw = await self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == self.msg_id:
                if "error" in resp:
                    print(f"CDP Error in {method}: {resp['error']}")
                return resp.get("result", {})

    async def close(self):
        if self.ws:
            await self.ws.close()

async def capture_page(cdp, url, out_name, eval_js=None, wait_sec=2.0):
    print(f"Navigating to {url} -> {out_name}")
    await cdp.send("Page.navigate", {"url": url})
    await asyncio.sleep(wait_sec)

    if eval_js:
        await cdp.send("Runtime.evaluate", {"expression": eval_js, "awaitPromise": True})
        await asyncio.sleep(1.0)

    # Capture viewport screenshot
    res = await cdp.send("Page.captureScreenshot", {"format": "png"})
    data = base64.b64decode(res.get("data", ""))
    
    out_path = os.path.join(OUT_DIR, out_name)
    art_path = os.path.join(ARTIFACT_DIR, out_name)
    with open(out_path, "wb") as f:
        f.write(data)
    with open(art_path, "wb") as f:
        f.write(data)
    print(f"Saved {out_name} ({len(data)} bytes)")

async def main():
    # 1. Start Chrome headless with remote debugging
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--disable-gpu",
        "--window-size=1280,820",
        "--hide-scrollbars",
        "about:blank"
    ])
    time.sleep(2)

    try:
        # Get list of targets
        req = urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json")
        targets = json.loads(req.read().decode())
        ws_url = targets[0]["webSocketDebuggerUrl"]
        print(f"Connecting to CDP: {ws_url}")

        cdp = CDPClient(ws_url)
        await cdp.connect()

        await cdp.send("Page.enable")
        await cdp.send("Runtime.enable")
        await cdp.send("Emulation.setDeviceMetricsOverride", {
            "width": 1280,
            "height": 820,
            "deviceScaleFactor": 1,
            "mobile": False
        })

        # 1. Login Page
        await capture_page(cdp, f"{BASE_URL}/masuk", "01_login.png", wait_sec=2.0)

        # Siswa State JSON
        siswa_store = {
            "state": {
                "user": {
                    "id": "siswa-001",
                    "nama": "Budi Santoso",
                    "peran": "siswa",
                    "kelas": "X MIPA 1"
                },
                "progress": {
                    "1-video": "done",
                    "1-ipo": "done",
                    "1-dekomposisi": "done",
                    "1-parsons": "done",
                    "1-lab": "active"
                },
                "answers": {
                    "pretest_score": 80,
                    "pretest_result": {"score": 80, "total": 100},
                    "1-ipo-score": 100,
                    "1-dekomposisi-score": 100,
                    "1-parsons-score": 100
                },
                "attempts": {},
                "demoMode": False
            },
            "version": 0
        }
        set_siswa_js = f"localStorage.setItem('stepverse-store', JSON.stringify({json.dumps(siswa_store)}));"
        await cdp.send("Runtime.evaluate", {"expression": set_siswa_js})

        # 2. Beranda Siswa
        await capture_page(cdp, f"{BASE_URL}/beranda", "02_beranda_siswa.png", wait_sec=2.0)

        # 3. Pretest CT
        await capture_page(cdp, f"{BASE_URL}/tes/awal", "03_pretest.png", wait_sec=2.0)

        # 4. Orientasi Video
        await capture_page(cdp, f"{BASE_URL}/materi/1/video", "04_video_materi.png", wait_sec=2.5)

        # 5. Analisis IPO
        await capture_page(cdp, f"{BASE_URL}/materi/1/ipo", "05_analisis_ipo.png", wait_sec=2.0)

        # 6. Dekomposisi
        await capture_page(cdp, f"{BASE_URL}/materi/1/dekomposisi", "06_dekomposisi.png", wait_sec=2.0)

        # 7. Parsons Problem
        await capture_page(cdp, f"{BASE_URL}/materi/1/parsons", "07_parsons_problem.png", wait_sec=2.0)

        # 8. Lab Python
        await capture_page(cdp, f"{BASE_URL}/materi/1/lab", "08_lab_python.png", wait_sec=3.0)

        # 9. Posttest CT
        await capture_page(cdp, f"{BASE_URL}/tes/akhir", "09_posttest.png", wait_sec=2.0)

        # Guru State JSON
        guru_store = {
            "state": {
                "user": {
                    "id": "guru-001",
                    "nama": "Bu Sari",
                    "peran": "guru",
                    "kelas": "-"
                },
                "progress": {},
                "answers": {},
                "attempts": {},
                "demoMode": False
            },
            "version": 0
        }
        set_guru_js = f"localStorage.setItem('stepverse-store', JSON.stringify({json.dumps(guru_store)}));"
        await cdp.send("Runtime.evaluate", {"expression": set_guru_js})

        # 10. Dasbor Guru
        await capture_page(cdp, f"{BASE_URL}/guru", "10_dasbor_guru.png", wait_sec=2.0)

        # 11. Daftar Siswa
        await capture_page(cdp, f"{BASE_URL}/guru/kelas", "11_daftar_siswa.png", wait_sec=2.0)

        # 12. Kemajuan Belajar Siswa
        await capture_page(cdp, f"{BASE_URL}/guru/kemajuan", "12_kemajuan_belajar.png", wait_sec=2.0)

        # 13. Indikator CT Kelas
        await capture_page(cdp, f"{BASE_URL}/guru/ct", "13_indikator_ct.png", wait_sec=2.0)

        # 14. Ekspor Data CSV
        await capture_page(cdp, f"{BASE_URL}/guru/ekspor", "14_ekspor_csv.png", wait_sec=2.0)

        # 15. Tinjau Kurikulum & Bank Soal
        await capture_page(cdp, f"{BASE_URL}/guru/materi", "15_tinjau_kurikulum.png", wait_sec=2.5)

        await cdp.close()
        print("ALL SCREENSHOTS CAPTURED SUCCESSFULLY!")

    finally:
        chrome_proc.terminate()

if __name__ == "__main__":
    asyncio.run(main())
