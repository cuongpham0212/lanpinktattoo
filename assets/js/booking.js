(function(){
const MESSENGER_URL="https://m.me/LanPinkInk";
const ZALO_URL="https://zalo.me/0703659902";
const INSTAGRAM_URL="https://www.instagram.com/lanpink.ink/";
const lang=window.LP_BOOKING_LANG==="en"?"en":"vi";
const calendarData=window.LP_BOOKING_DATA||{busyDates:{}};

const t={
vi:{
months:["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"],
free:"Còn trống",busy:"Đã có khách",busyTitle:"Ngày này tiệm đã có lịch",freeTitle:"Còn nhận tư vấn",
defaultBusyNote:"Tiệm đang có lịch xăm trong ngày này.",
busyText:"Ngày này Lan Pink đang có lịch xăm hoặc đã có khách hẹn. Bạn vẫn có thể nhắn trước, tiệm sẽ phản hồi ngay khi có thể.",
freeText:"Điền thông tin bên dưới để đặt lịch tư vấn tại tiệm.",
name:"Họ tên",phone:"Số điện thoại / Zalo",time:"Giờ muốn đến",desc:"Mô tả ngắn",submit:"Xác nhận đặt lịch tư vấn tại tiệm",
descPlaceholder:"Bạn muốn tư vấn hình gì, vị trí nào, kích thước khoảng bao nhiêu?",
success:"Lan Pink đã nhận yêu cầu đặt lịch. Tiệm sẽ liên hệ lại với bạn sớm nhất có thể.",
error:"Chưa gửi được. Bạn có thể nhắn trực tiếp qua Messenger/Zalo/Instagram bên dưới.",
busyChoose:"Ngày này đã có khách. Bạn có thể nhắn Lan Pink qua:",
messenger:"Nhắn Messenger",zalo:"Nhắn Zalo",instagram:"Nhắn Instagram"
},
en:{
months:["January","February","March","April","May","June","July","August","September","October","November","December"],
free:"Available",busy:"Booked",busyTitle:"This date is already booked",freeTitle:"Available for consultation",
defaultBusyNote:"The studio already has a tattoo session booked on this date.",
busyText:"Lan Pink already has a tattoo session or consultation on this date. You can still message us and we will reply as soon as possible.",
freeText:"Fill in the form below to request an in-studio tattoo consultation.",
name:"Full name",phone:"Phone / Zalo",time:"Preferred time",desc:"Short description",submit:"Confirm in-studio consultation booking",
descPlaceholder:"Tell us your tattoo idea, placement, and approximate size.",
success:"Lan Pink has received your consultation request. We will contact you as soon as possible.",
error:"Submission failed. You can message us directly via Messenger/Zalo/Instagram below.",
busyChoose:"This date is booked. You can still contact Lan Pink via:",
messenger:"Message on Messenger",zalo:"Message on Zalo",instagram:"Message on Instagram"
}
}[lang];

const monthTitle=document.getElementById("lpMonthTitle");
const grid=document.getElementById("lpCalendarGrid");
const panel=document.getElementById("lpBookingPanel");
const prevBtn=document.getElementById("lpPrevMonth");
const nextBtn=document.getElementById("lpNextMonth");
const today=new Date();
let currentYear=today.getFullYear();
let currentMonth=today.getMonth();

function pad(n){return String(n).padStart(2,"0")}
function key(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`}
function pretty(k){const [y,m,d]=k.split("-");return lang==="en"?`${m}/${d}/${y}`:`${d}/${m}/${y}`}
function offset(date){const day=date.getDay();return day===0?6:day-1}
function busy(k){return Boolean(calendarData.busyDates&&calendarData.busyDates[k])}
function todayKey(k){return k===key(today.getFullYear(),today.getMonth(),today.getDate())}

function contactButtons(){
return `<div class="lp-contact-channels">
<a class="lp-primary-btn" href="${MESSENGER_URL}" target="_blank" rel="noopener">${t.messenger}</a>
<a class="lp-zalo-btn" href="${ZALO_URL}" target="_blank" rel="noopener">${t.zalo}</a>
<a class="lp-instagram-btn" href="${INSTAGRAM_URL}" target="_blank" rel="noopener">${t.instagram}</a>
</div>`;
}

function render(){
grid.innerHTML="";
monthTitle.textContent=`${t.months[currentMonth]} / ${currentYear}`;
const first=new Date(currentYear,currentMonth,1);
const last=new Date(currentYear,currentMonth+1,0);

for(let i=0;i<offset(first);i++){
  const e=document.createElement("button");
  e.type="button";
  e.className="lp-day is-empty";
  grid.appendChild(e);
}

for(let d=1;d<=last.getDate();d++){
  const k=key(currentYear,currentMonth,d);
  const isBusy=busy(k);
  const b=document.createElement("button");
  b.type="button";
  b.className=`lp-day ${isBusy?"is-busy":"is-free"} ${todayKey(k)?"is-today":""}`;
  b.innerHTML=`<span class="lp-day-number">${d}</span><span class="lp-day-status">${isBusy?t.busy:t.free}</span>`;
  b.addEventListener("click",()=>select(k));
  grid.appendChild(b);
}
}

function bookingForm(k){
return `<form class="lp-form" id="lpBookingForm">
<input type="hidden" name="form-name" value="booking-consultation">
<input type="hidden" name="language" value="${lang}">
<input type="hidden" name="date" value="${pretty(k)}">
<label>${t.name}<input name="name" required></label>
<label>${t.phone}<input name="phone" required></label>
<label>${t.time}
<select name="time" required>
<option value="">${t.time}</option>
<option>10:00</option><option>11:00</option><option>13:00</option>
<option>14:00</option><option>15:00</option><option>16:00</option>
<option>17:00</option><option>18:00</option>
</select>
</label>
<label>${t.desc}<textarea name="description" required placeholder="${t.descPlaceholder}"></textarea></label>
<button class="lp-primary-btn" type="submit">${t.submit}</button>
</form>`;
}

async function submitBooking(form){
const data=new FormData(form);

if(location.hostname==="localhost" || location.hostname==="127.0.0.1"){
  panel.innerHTML=`<h2>Test local OK</h2><div class="lp-note-box"><p>${t.success}</p></div>`;
  return;
}

try{
  const res=await fetch("/",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams(data).toString()
  });
  if(!res.ok) throw new Error("Netlify form failed");
  panel.innerHTML=`<h2>${lang==="en"?"Request sent":"Đã gửi yêu cầu"}</h2><div class="lp-note-box"><p>${t.success}</p></div>`;
}catch(e){
  panel.innerHTML=`<h2>${lang==="en"?"Could not send":"Chưa gửi được"}</h2><div class="lp-note-box"><p>${t.error}</p></div>${contactButtons()}`;
}
}

function select(k){
if(busy(k)){
  const note=calendarData.busyDates[k]?.note||t.defaultBusyNote;
  panel.innerHTML=`<h2>${pretty(k)} - ${t.busyTitle}</h2>
  <div class="lp-note-box"><p><strong>${note}</strong></p><p>${t.busyText}</p></div>
  <div class="lp-or-note">${t.busyChoose}</div>${contactButtons()}`;
  return;
}

panel.innerHTML=`<h2>${pretty(k)} - ${t.freeTitle}</h2><p>${t.freeText}</p>${bookingForm(k)}`;
document.getElementById("lpBookingForm").addEventListener("submit",function(e){
  e.preventDefault();
  submitBooking(e.target);
});
}

prevBtn.addEventListener("click",()=>{currentMonth--;if(currentMonth<0){currentMonth=11;currentYear--}render()});
nextBtn.addEventListener("click",()=>{currentMonth++;if(currentMonth>11){currentMonth=0;currentYear++}render()});
render();
})();
