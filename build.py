import json
from jinja2 import Environment, FileSystemLoader
import os
import shutil
from data import data_vi, data_en

os.makedirs('output/en', exist_ok=True)
if os.path.exists('output/static'):
    shutil.rmtree('output/static')
shutil.copytree('static', 'output/static')

env = Environment(loader=FileSystemLoader('templates'))

template = env.get_template('index.html')
html_vi = template.render(data_vi)
with open('output/index.html', 'w', encoding='utf-8') as f:
    f.write(html_vi)

html_en = template.render(data_en)
with open('output/en/index.html', 'w', encoding='utf-8') as f:
    f.write(html_en)

# Copy robots.txt và sitemap.xml ra root
shutil.copy('static/robots.txt', 'output/robots.txt')
shutil.copy('static/sitemap.xml', 'output/sitemap.xml')

print("Đã tạo xong site + SEO files ✅")
