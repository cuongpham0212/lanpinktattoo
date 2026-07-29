from pathlib import Path
import runpy

tool = Path(__file__).resolve().parent / "tools" / "booking_admin_server.py"
if not tool.exists():
    raise SystemExit("Không thấy tools/booking_admin_server.py")

runpy.run_path(str(tool), run_name="__main__")
