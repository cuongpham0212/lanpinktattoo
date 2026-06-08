from data.config import site
from data.content_vi import content as content_vi
from data.content_en import content as content_en

data_vi = {**site, **content_vi}
data_en = {**site, **content_en}
