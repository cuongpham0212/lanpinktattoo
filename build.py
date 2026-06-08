from jinja2 import Environment, FileSystemLoader
from site_data.content_vi import content as content_vi
from site_data.content_en import content as content_en
import os
import shutil

# Setup Jinja2
env = Environment(loader=FileSystemLoader('templates'))

# Fix lỗi url_for: tạo hàm giả lập url_for cho build static
def static_url_vi(filename):
    # Bản VI: /static/...
    return f"/static/{filename}"

def static_url_en(filename):
    # Bản EN: ../static/... do nằm trong thư mục /en/
    return f"../static/{filename}"

# Đảm bảo thư mục output tồn tại
if os.path.exists('output'):
    shutil.rmtree('output')
os.makedirs('output/en', exist_ok=True)

# Render VI
env.globals['url_for'] = lambda endpoint, **kwargs: static_url_vi(kwargs['filename']) if endpoint == 'static' else '/'
template = env.get_template('index.html')
html_vi = template.render(t=content_vi)
with open('output/index.html', 'w', encoding='utf-8') as f:
    f.write(html_vi)

# Render EN - đổi url_for cho bản EN
env.globals['url_for'] = lambda endpoint, **kwargs: static_url_en(kwargs['filename']) if endpoint == 'static' else '../'
html_en = template.render(t=content_en)
with open('output/en/index.html', 'w', encoding='utf-8') as f:
    f.write(html_en)

# Copy static
if os.path.exists('static'):
    shutil.copytree('static', 'output/static')

print("✅ Build done: output/index.html + output/en/index.html")