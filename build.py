from jinja2 import Environment, FileSystemLoader
import os
import shutil
from data import data_vi, data_en

os.makedirs('output/en', exist_ok=True)
if os.path.exists('output/static'):
    shutil.rmtree('output/static')
shutil.copytree('static', 'output/static')

env = Environment(loader=FileSystemLoader('templates'))

# Render trang tiếng Việt -> output/index.html
template = env.get_template('index.html')
html_vi = template.render(data_vi)
with open('output/index.html', 'w', encoding='utf-8') as f:
    f.write(html_vi)

# Render trang tiếng Anh -> output/en/index.html  
html_en = template.render(data_en)
with open('output/en/index.html', 'w', encoding='utf-8') as f:
    f.write(html_en)

print("Đã tạo xong index.html và en/index.html ✅")
