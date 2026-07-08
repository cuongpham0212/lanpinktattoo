# Lan Pink Tattoo CSS README

## Mục đích

File này dùng để nhắc cấu trúc CSS của Lan Pink Tattoo sau khi đã dọn lại.

Khi cần fix CSS, phải đọc file này trước để sửa đúng file owner, không patch tràn lan vào `custom.css`, không thêm CSS inline trong template, không copy override lung tung.

---

## Cây thư mục CSS hiện tại

```text
assets/css/
├── main.css
├── layout.css
├── custom.css
├── contact.css
├── gallery.css
├── article.css
├── components/
│   ├── components.css
│   ├── article-images.css
│   ├── article.css
│   ├── booking.css
│   ├── footer.css
│   ├── header.css
│   ├── hero.css
│   ├── home.css
│   ├── menumobile.css
│   ├── performance.css
│   ├── portfolio.css
│   ├── promo-hero.css
│   ├── promo-sticky.css
│   └── toc.css
└── theme/
    ├── light.css
    └── dark.css
```

---

## Luật owner quan trọng nhất

### `components/home.css`

Owner của homepage.

Dùng cho:

- `.lp-home`
- `.lp-home-container`
- `.lp-home-hero`
- `.lp-hero-compact`
- `.lp-hero-main`
- `.lp-hero-mini-info`
- `.lp-gallery-first`
- `.lp-real-work-row`
- `.lp-mobile-hero-bar`
- `.lp-mobile-work-strip`
- `.lp-mobile-local-seo`
- `.lp-mobile-gallery-strip`
- `.lp-mobile-photo-card`
- homepage grid
- homepage spacing
- homepage responsive
- homepage marquee / animation structure

Không dùng legacy selector:

- `.home-hero`
- `.hero-home`

Không quản lý:

- màu nền
- gradient
- glass effect
- border màu
- shadow màu
- text color
- dark/light contrast

Các phần trên phải nằm trong `theme/light.css` hoặc `theme/dark.css`.

---

### `theme/light.css`

Chỉ dùng cho light mode.

Dùng cho:

- biến màu light mode
- nền body light
- màu chữ light
- màu link light
- màu button/surface light
- màu riêng của homepage khi light mode

Được phép sửa màu của homepage bằng selector dạng:

```css
html[data-theme="light"] .lp-home { ... }
html[data-theme="light"] .lp-hero-main { ... }
```

Không được layout lại homepage trong file này.

Không đặt:

- grid
- flex structure
- padding layout
- margin layout
- width / max-width
- min-height card
- responsive layout
- animation structure

---

### `theme/dark.css`

Chỉ dùng cho dark mode.

Dùng cho:

- biến màu dark mode
- nền body dark
- màu chữ dark
- màu link dark
- màu button/surface dark
- màu riêng của homepage khi dark mode
- contrast cho article, TOC, footer, CTA nếu cần

Được phép sửa màu của homepage bằng selector dạng:

```css
html[data-theme="dark"] .lp-home { ... }
html[data-theme="dark"] .lp-hero-main { ... }
```

Không layout lại component trong `dark.css` nếu có thể sửa ở file owner.

Không đặt:

- grid
- flex structure
- padding layout
- margin layout
- width / max-width
- min-height card
- responsive layout
- animation structure

---

## File nào sửa cái gì?

### `main.css`

Style nền tảng toàn site.

Dùng cho:

- body
- font base
- reset nhẹ
- rule global rất chung

Không dùng để sửa component riêng.

---

### `layout.css`

Layout chung.

Dùng cho:

- container
- section spacing
- grid helper
- wrapper chung

Không dùng để sửa header/footer/home/article cụ thể.

---

### `custom.css`

File an toàn, hạn chế dùng.

Chỉ dùng khi:

- fix rất nhỏ
- chưa xác định được owner
- cần test tạm

Không được dùng làm nơi patch chính lâu dài.

Nếu đã biết component nằm ở file nào, phải sửa file owner.

---

### `contact.css`

Owner của trang liên hệ.

Dùng cho:

- contact page
- form liên hệ
- map/contact block
- contact CTA

---

### `gallery.css`

Owner của gallery/list ảnh chung.

Dùng cho:

- gallery grid
- gallery item
- image hover trong gallery

---

### `article.css` ở root

CSS cũ ở root. Trước khi sửa cần kiểm tra còn đang dùng gì.

Không thêm patch mới vào đây nếu cùng selector đã có trong `components/article.css`.

---

## Components

### `components/header.css`

Owner của desktop header.

Dùng cho:

- `.lp-header`
- `.lp-header-shell`
- `.lp-header-inner`
- `.lp-brand`
- `.lp-header-logo`
- `.lp-main-nav`
- `.lp-nav-link`
- `.lp-nav-dropdown`
- `.lp-header-actions`
- `.lp-booking-btn`
- `.lp-lang-switch`
- `.lp-icon-btn`
- `.lp-member-app-btn`

Không sửa header trong:

- `custom.css`
- `menumobile.css`
- `layouts/partials/header.html`

Không thêm `<style>` vào `header.html`.

---

### `components/menumobile.css`

Owner của menu mobile.

Dùng cho:

- `.lp-menumobile`
- `.lp-menumobile-toggle`
- `.lp-menumobile-link`
- `.lp-menumobile-group`
- `.lp-menumobile-submenu`
- `.lp-menumobile-sublink`
- `.lp-menumobile-booking`
- `.lp-menumobile-lang-switch`

Không dùng để sửa desktop header.

---

### `components/hero.css`

Owner của hero chung, hero bài viết, page header.

Dùng cho:

- `.hero`
- `.lp-hero`
- `.lp-hero-title`
- `.lp-hero-desc`
- `.lp-page-header`

Không dùng cho homepage hero. Homepage hero nằm ở `components/home.css`.

---

### `components/promo-hero.css`

Owner của banner khuyến mãi trên trang chủ.

Dùng cho:

- `.lanpink-promo-hero`
- `.lanpink-promo-hero__inner`
- `.lanpink-promo-hero__badge`
- `.lanpink-promo-hero__btn`
- `.lanpink-promo-hero__sale`

Không sửa sticky promo ở đây.

---

### `components/promo-sticky.css`

Owner của sticky promo trên bài viết/trang con.

Dùng cho:

- `.lanpink-promo-sticky`
- `.lanpink-promo-sticky__link`
- `.lanpink-promo-sticky__badge`
- `.lanpink-promo-sticky__title`
- `.lanpink-promo-sticky__text`
- `.lanpink-promo-sticky__btn`

Không sửa promo hero ở đây.

---

### `components/footer.css`

Owner của footer.

Dùng cho:

- `.lp-footer`
- `.lp-footer-wrap`
- `.lp-footer-card`
- `.lp-footer-grid`
- `.lp-footer-brand`
- `.lp-footer-links`
- `.lp-footer-contact-card`
- `.lp-footer-social`
- `.lp-footer-pill`
- `.lp-footer-bottom`

Không dùng footer để sửa header, hero, home, promo.

---

### `components/toc.css`

Owner của mục lục bài viết.

Dùng cho:

- TOC desktop
- TOC mobile
- TOC button
- TOC panel
- TOC active/hover states

---

### `components/article.css`

Owner của nội dung bài viết.

Dùng cho:

- `.lp-content`
- `.prose`
- heading trong bài
- paragraph
- list
- table
- blockquote
- related posts trong bài nếu có

---

### `components/article-images.css`

Owner của ảnh trong bài viết.

Dùng cho:

- markdown image
- figure
- caption
- responsive image trong article

---

### `components/portfolio.css`

Owner của portfolio/work cards.

Dùng cho:

- portfolio grid
- work card
- tác phẩm
- card liên quan tới portfolio

---

### `components/booking.css`

Owner của booking page/app.

Dùng cho:

- booking form
- booking layout
- booking calendar
- booking status

---

### `components/components.css`

Shared small components.

Chỉ dùng cho component nhỏ dùng nhiều nơi.

Không đưa page-specific style vào đây.

---

### `components/performance.css`

Owner duy nhất của performance/reduced motion.

Dùng cho:

- mobile performance reductions
- giảm animation
- `prefers-reduced-motion`
- giảm blur/filter khi cần

Không dùng để sửa giao diện component.

---

## Luật bắt buộc khi fix CSS

1. Không patch tràn lan vào `custom.css`.
2. Không thêm CSS inline vào template.
3. Không copy cùng một block CSS vào nhiều file.
4. Không sửa component A trong file của component B.
5. Không dùng `!important` nếu chưa thử sửa đúng owner/selector.
6. Trước khi sửa, tìm selector nằm ở đâu:

```bash
grep -RIn "TEN_SELECTOR" assets/css layouts
```

7. Sau khi sửa, luôn build:

```bash
hugo --gc --minify
```

8. Khi test CSS nên chạy sạch:

```bash
rm -rf public resources .hugo_build.lock
hugo --gc --minify
hugo server -D --disableFastRender --ignoreCache --noHTTPCache
```

---

## Ghi chú sau đợt refactor

Đã hoàn thành:

- Dọn backup CSS khỏi cây active.
- Xoá legacy home hero patch.
- Tách performance.css.
- Xoá performance block copy khỏi nhiều component.
- Chuyển CSS inline từ `layouts/partials/header.html` sang `header.css`.
- Dedupe header.
- Gộp mobile menu trong `menumobile.css`.
- Kiểm tra không còn class chết trong component CSS.
- Hugo build xanh sau refactor.
- Tách lại homepage:
  - `components/home.css` chỉ giữ layout/structure/responsive/marquee.
  - `theme/light.css` giữ màu light của homepage.
  - `theme/dark.css` giữ màu dark của homepage.
  - Xoá trùng block home light/dark bị lặp.

Mục tiêu sau này:

- Fix giao diện theo đúng owner file, không làm CSS phình lại.
- Khi homepage lỗi màu: sửa `theme/light.css` hoặc `theme/dark.css`.
- Khi homepage lỗi bố cục: sửa `components/home.css`.

---

## Cập nhật mới: Button Design System

### `components/button.css`

Owner duy nhất của toàn bộ visual nút trên site.

Quản lý:

- màu nút
- màu chữ nút
- viền nút
- viền xanh / viền trắng kiểu Bing-like
- bo góc
- shadow
- glass effect
- hover / active
- contrast chữ

Các file khác chỉ được quản lý layout nút nếu cần, ví dụ:

- vị trí
- khoảng cách
- width
- height đặc thù
- responsive placement

Không đặt `background`, `color`, `border`, `box-shadow`, `border-radius`, `text-shadow` cho button ở file khác.

### Các class đã gom vào hệ nút chung

```css
.btn
.btn-primary
.btn-outline
.lp-btn
.lp-btn-primary
.lp-btn-secondary
.lp-btn-ghost
.lp-primary-btn
.lp-booking-btn
.lp-article-cta__button
.lp-messenger-btn
.lp-menumobile-booking
.lanpink-promo-hero__btn
.lanpink-promo-sticky__btn
.member-lookup-cta a
.lpm-panel-btn
.lp-zalo-btn
.lp-instagram-btn
layouts/partials/head.html

button.css phải nằm trong CSS bundle:
"css/components/components.css"
"css/components/button.css"
Nếu sửa button.css mà giao diện không đổi, kiểm tra:
grep -n "button.css" layouts/partials/head.html
grep -R "lp-btn-blue-edge" public | head
layouts/partials/map.html

Không dùng Tailwind visual cho nút map như:
rounded-full bg-pink-500 border-pink-500 text-white
Dùng hệ nút chung:
class="lp-btn lp-btn-primary text-sm"
class="lp-btn lp-btn-secondary text-sm"
class="lp-btn lp-btn-ghost text-sm"
Dark mode button

Khi fix giao diện tối, vẫn giữ components/button.css làm owner nút.

Ưu tiên override token/màu theo theme:
html[data-theme="dark"]{
  --lp-btn-primary-bg: ...;
  --lp-btn-primary-bg-hover: ...;
  --lp-btn-blue-edge: ...;
}
Không copy lại toàn bộ hệ nút sang dark.css.


---

# Cập nhật GĐ5.1 - CSS Home / Theme / Backup Rule

## Cây CSS hiện tại

```text
assets/css/
├── README.md
├── article.css
├── contact.css
├── custom.css
├── gallery.css
├── layout.css
├── main.css
├── components/
│   ├── article-images.css
│   ├── article.css
│   ├── booking.css
│   ├── button.css
│   ├── components.css
│   ├── footer.css
│   ├── gallery-readmore.css
│   ├── google-review-card.css
│   ├── header.css
│   ├── hero.css
│   ├── home.css
│   ├── member-widget.css
│   ├── menumobile.css
│   ├── mobile-gd1-header.css
│   ├── performance.css
│   ├── portfolio.css
│   ├── promo-hero.css
│   ├── promo-sticky.css
│   └── toc.css
└── theme/
    ├── dark.css
    └── light.css
GĐ5.1 đã làm

Đã tách visual màu của homepage ra khỏi:

assets/css/components/home.css

và chuyển về đúng owner:

assets/css/theme/light.css
assets/css/theme/dark.css

Kết quả audit:
grep -nE 'html\[data-theme=|background:|color:|border-color:|box-shadow:' assets/css/components/home.css
Kết quả chuẩn: không trả về dòng nào.

Luật mới cho home.css

components/home.css chỉ quản lý:

layout
spacing
grid
flex
responsive
transform
transition
animation structure
position
width / height
overflow

Không đặt trong home.css:

background
color
border-color
box-shadow
theme dark/light selector
visual màu homepage

Nếu cần sửa màu homepage:

light mode → assets/css/theme/light.css
dark mode → assets/css/theme/dark.css
Những lỗi đã vướng ở GĐ5.1
grep "!important" bị lỗi trên zsh vì dấu !.

Dùng:

grep -RIn '\!important' assets/css layouts

hoặc:

set +H
File .bak nằm trong assets/ và layouts/ làm grep bị nhiễu.

Không để .bak trong source active.

Không dùng lệnh mv {} _backup/ đơn giản vì dễ ghi đè nếu trùng tên.

Backup phải giữ cấu trúc folder.

Khi tách màu, không tách quá tay.

Chỉ chuyển visual sang theme. Layout vẫn ở component owner.

Luật backup mới

Từ giờ không tạo file .bak lung tung trong:

assets/
layouts/
content/

Mọi backup tạm phải nằm trong:

_backup/

Ví dụ:

mkdir -p _backup/gd5
cp assets/css/components/home.css _backup/gd5/home.css.before-edit

Nếu cần backup nhiều file, phải giữ rõ giai đoạn:

_backup/gd5/
_backup/gd5-article/
_backup/readme-update/

Không đặt kiểu:

home.css.bak
article.css.bak-gd5
single.html.bak

trong cây source active.

Lệnh audit backup còn sót
find assets layouts content \
\( -name "*.bak*" -o -name "*.backup*" -o -name "*.old*" -o -name "*.orig*" -o -name "*.tmp*" -o -name "*~" \)

Nếu lệnh này còn hiện kết quả, phải chuyển về _backup/.

Lệnh build/test chuẩn sau khi sửa CSS

Sau mỗi lần sửa CSS/layout quan trọng, chạy sạch:

rm -rf public resources .hugo_build.lock
hugo --gc --minify
hugo server -D --disableFastRender --ignoreCache --noHTTPCache

Không chỉ chạy hugo server thường vì có thể bị cache làm hiểu sai giao diện.


---

# Cập nhật GĐ5.2 - Article CSS Cleanup

## Kết quả

Đã loại bỏ file CSS legacy:

```text
assets/css/article.css
Lý do:

File chỉ còn 1 byte.
Không được import bởi Hugo.
Không còn bất kỳ layout nào sử dụng.
Đã chuyển vào:
_backup/gd5-2-dead-css/
CSS Article hiện tại

CSS article chính thức chỉ còn:

assets/css/components/article.css

Được import tại:

layouts/partials/head.html

Không tạo lại:

assets/css/article.css

trừ khi có thay đổi kiến trúc lớn.

Cleanup hoàn thành

Đã loại bỏ selector legacy:

.prose

khỏi toàn bộ CSS active.

Hiện chỉ còn xuất hiện trong:

assets/css/README.md

để lưu lịch sử dự án.

Kiến trúc mới chỉ sử dụng:

.lp-content

làm article content owner.

Bài học GĐ5.2

Không dùng Regex để refactor selector CSS hàng loạt.

Ví dụ nguy hiểm:

.lp-content,
.prose {

Nếu xoá .prose bằng Regex sẽ rất dễ tạo thành:

.lp-content,
width:100%;

hoặc

article.lp-single-page,
article.lp-single-page .lp-content,
overflow:visible;

=> PostCSS báo Unknown word.

Nguyên tắc mới:

Audit trước.
Xác định CSS owner.
Refactor từng block.
Build.
Test.
Commit.

Không refactor selector hàng loạt bằng Regex.

CSS Architecture hiện tại
theme/
    ↓
CSS Variables
    ↓
components/*
    ↓
layout

Theme chịu trách nhiệm:

màu
dark/light
token

Component chịu trách nhiệm:

layout
spacing
responsive
animation
structure

Không trộn hai nhiệm vụ.

