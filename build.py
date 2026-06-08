from jinja2 import Environment, FileSystemLoader
import os
import shutil
from data import site_data

os.makedirs('output', exist_ok=True)

# Copy static vào output để mở html chạy được luôn
if os.path.exists('output/static'):
    shutil.rmtree('output/static')
shutil.copytree('static', 'output/static')

env = Environment(loader=FileSystemLoader('templates'))
template = env.get_template('index.html')
html_output = template.render(site_data)

with open('output/index.html', 'w', encoding='utf-8') as f:
    f.write(html_output)

print("Đã tạo xong output/index.html ✅")
