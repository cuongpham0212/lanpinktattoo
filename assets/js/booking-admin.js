(function(){
let data=JSON.parse(JSON.stringify(window.LP_BOOKING_DATA||{busyDates:{}}));
if(!data.busyDates)data.busyDates={};
const busyDate=document.getElementById("busyDate");
const busyNote=document.getElementById("busyNote");
const busyList=document.getElementById("busyList");
const jsonOutput=document.getElementById("jsonOutput");
function sort(){const s={};Object.keys(data.busyDates).sort().forEach(k=>s[k]=data.busyDates[k]);data.busyDates=s}
function render(){
sort();
jsonOutput.textContent=JSON.stringify(data,null,2);
const keys=Object.keys(data.busyDates);
busyList.innerHTML=keys.length?keys.map(k=>`<div class="busy-item"><div><strong>${k}</strong><span>${data.busyDates[k]?.note||""}</span></div><button class="green" data-open="${k}">Mở</button></div>`).join(""):"<p>Chưa có ngày nào bị khóa.</p>";
document.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>{delete data.busyDates[btn.dataset.open];render()}));
}
document.getElementById("addBusy").addEventListener("click",()=>{if(!busyDate.value)return alert("Anh chọn ngày trước nha.");data.busyDates[busyDate.value]={note:busyNote.value||"Tiệm đang có lịch xăm trong ngày này."};render()});
document.getElementById("removeBusy").addEventListener("click",()=>{if(!busyDate.value)return alert("Anh chọn ngày trước nha.");delete data.busyDates[busyDate.value];render()});
document.getElementById("copyJson").addEventListener("click",async()=>{render();await navigator.clipboard.writeText(JSON.stringify(data,null,2));alert("Đã copy JSON. Anh dán vào data/booking_calendar.json rồi git push.")});
document.getElementById("downloadJson").addEventListener("click",()=>{render();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="booking_calendar.json";a.click();URL.revokeObjectURL(url)});
render();
})();
