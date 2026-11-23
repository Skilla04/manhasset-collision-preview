(function () {
"use strict";
var doc = document;
var root = doc.documentElement;
var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var header = doc.querySelector(".site-header");
if (header) {
var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 12); };
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });
}
var toast = null, toastTimer = null;
function showToast(text) {
if (!toast) {
toast = doc.createElement("div");
toast.className = "toast";
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
doc.body.appendChild(toast);
}
toast.textContent = text.replace(/ /g, "\u00a0").replace(/:\u00a0(?=[(+\d])/, ": ");  // keep the number on one line
toast.classList.add("is-shown");
clearTimeout(toastTimer);
toastTimer = setTimeout(function () { toast.classList.remove("is-shown"); }, 3200);
}
function copyText(text) {
if (navigator.clipboard && window.isSecureContext) {
return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
}
return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text) {
var ta = doc.createElement("textarea");
ta.value = text; ta.setAttribute("readonly", "");
ta.style.position = "fixed"; ta.style.opacity = "0";
doc.body.appendChild(ta); ta.select();
var ok = false;
try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
doc.body.removeChild(ta);
return ok;
}
var isDesktop = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
doc.addEventListener("click", function (e) {
var link = e.target.closest && e.target.closest('a[href^="tel:"]');
if (!link || !isDesktop || !isDesktop.matches) return;
if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // let modified clicks pass through
e.preventDefault();
var shown = doc.body.getAttribute("data-phone") || link.getAttribute("href").replace(/^tel:/, "");
copyText(shown).then(function (ok) {
showToast(ok ? "Number copied: " + shown : "Call us at " + shown);
});
});
var toggle = doc.querySelector(".menu-toggle");
var menu = doc.getElementById("mobile-menu");
if (toggle && menu) {
var behind = [doc.getElementById("main"), doc.querySelector(".site-footer"), doc.querySelector(".mobile-bar")].filter(Boolean);
var setMenu = function (open) {
toggle.setAttribute("aria-expanded", String(open));
toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
menu.classList.toggle("is-open", open);
menu.toggleAttribute("inert", !open);
behind.forEach(function (el) { el.toggleAttribute("inert", open); });
root.classList.toggle("menu-open", open);
if (open) {
var first = menu.querySelector("a, button");
if (first) requestAnimationFrame(function () { first.focus(); });
}
};
menu.setAttribute("inert", "");
toggle.addEventListener("click", function () {
setMenu(toggle.getAttribute("aria-expanded") !== "true");
});
doc.addEventListener("keydown", function (e) {
if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
});
menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
window.addEventListener("resize", function () { if (window.innerWidth >= 1200 && menu.classList.contains("is-open")) setMenu(false); });
}
doc.querySelectorAll(".nav .has-sub").forEach(function (item) {
var btn = item.querySelector(".subnav-toggle");
var panel = btn && doc.getElementById(btn.getAttribute("aria-controls"));
if (!panel) return;
var pinned = false;    // opened by click/keyboard: stays open when the pointer leaves
var leaveTimer = null;
var setOpen = function (open, pin) {
clearTimeout(leaveTimer);
pinned = open && !!pin;
item.classList.toggle("is-open", open);
btn.setAttribute("aria-expanded", String(open));
};
var isOpen = function () { return item.classList.contains("is-open"); };
btn.removeAttribute("tabindex");
btn.removeAttribute("aria-hidden");
btn.setAttribute("aria-expanded", "false");
item.classList.add("is-enhanced");
btn.addEventListener("click", function () {
if (isOpen() && !pinned) setOpen(true, true);
else setOpen(!isOpen(), true);
});
item.addEventListener("pointerenter", function (e) {
if (e.pointerType === "touch") return;
clearTimeout(leaveTimer);
if (!isOpen()) setOpen(true, false);
});
item.addEventListener("pointerleave", function (e) {
if (e.pointerType === "touch" || pinned) return;
clearTimeout(leaveTimer);
leaveTimer = setTimeout(function () { setOpen(false); }, 150);  // forgive a brief slip off the edge
});
item.addEventListener("focusout", function (e) {
if (e.relatedTarget && !item.contains(e.relatedTarget) && isOpen()) setOpen(false);
});
doc.addEventListener("click", function (e) {
if (isOpen() && !item.contains(e.target)) setOpen(false);
});
doc.addEventListener("keydown", function (e) {
if (e.key !== "Escape" || !isOpen()) return;
var hadFocus = item.contains(doc.activeElement);
setOpen(false);
if (hadFocus) btn.focus();
});
});
var hoursData = null;
try { hoursData = JSON.parse(doc.body.getAttribute("data-hours") || "null"); } catch (e) { hoursData = null; }
function toMinutes(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1]); }
function formatTime(hhmm) {
var m = toMinutes(hhmm), h = Math.floor(m / 60), mm = m % 60;
var suffix = h >= 12 ? "PM" : "AM"; var h12 = h % 12 || 12;
return h12 + (mm ? ":" + String(mm).padStart(2, "0") : "") + " " + suffix;
}
var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function shopNow() {
var parts = {};
new Intl.DateTimeFormat("en-US", {
timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
}).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
return { day: map[parts.weekday], minutes: (+parts.hour % 24) * 60 + (+parts.minute) };
}
function computeStatus() {
var now = shopNow();
var today = hoursData[now.day];
if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
return { open: true, day: now.day, text: "Open now · until " + formatTime(today[1]) };
}
for (var k = 0; k < 8; k++) {
var d = (now.day + k) % 7, h = hoursData[d];
if (!h) continue;
if (k === 0 && now.minutes >= toMinutes(h[0])) continue;
var when = k === 0 ? "" : DAY_NAMES[d] + " ";
return { open: false, day: now.day, text: "Closed · opens " + when + formatTime(h[0]) };
}
return { open: false, day: now.day, text: "Closed" };
}
function renderStatus() {
if (!hoursData) return;
var s;
try { s = computeStatus(); } catch (e) { return; }
doc.querySelectorAll("[data-hours-status]").forEach(function (el) {
el.classList.toggle("is-open", s.open);
el.classList.toggle("is-closed", !s.open);
var t = el.querySelector("[data-hours-text]");
if (t) t.textContent = s.text;
el.hidden = false;
});
doc.querySelectorAll(".hours tr[data-day]").forEach(function (row) {
var isToday = +row.getAttribute("data-day") === s.day;
row.classList.toggle("is-today", isToday);
if (isToday) row.setAttribute("aria-current", "date"); else row.removeAttribute("aria-current");
});
}
renderStatus();
setInterval(renderStatus, 60000);
var revealEls = doc.querySelectorAll("[data-reveal]");
if (revealEls.length) {
if (reduceMotion || !("IntersectionObserver" in window)) {
revealEls.forEach(function (el) { el.classList.add("is-visible"); });
} else {
var vh = window.innerHeight || doc.documentElement.clientHeight;
revealEls.forEach(function (el) {
if (el.getBoundingClientRect().top < vh) el.classList.add("is-visible");
});
root.classList.add("reveal");
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
});
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
revealEls.forEach(function (el) { io.observe(el); });
}
}
var ICON_ALERT = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';
function fieldWrap(input) { return input.closest(".field"); }
function fieldLabel(field) {
return (field && field.getAttribute("data-label")) || "this field";
}
function messageFor(input, field) {
var v = input.validity;
var label = fieldLabel(field);
if (input.type === "radio") return "Please choose " + label + ".";
if (v.valueMissing) return "Please enter " + label + ".";
if (v.typeMismatch && input.type === "email") return "Enter an email address like name@example.com.";
if (v.patternMismatch) return input.getAttribute("data-pattern-message") || "Please check " + label + ".";
if (v.customError) return input.validationMessage;
if (v.rangeUnderflow) return "Please choose a date from today onward.";
return "Please check " + label + ".";
}
function setError(field, msg) {
if (!field) return;
var err = field.querySelector(".field__error");
field.classList.toggle("has-error", !!msg);
field.querySelectorAll("input, select, textarea").forEach(function (el) {
if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
});
if (err) err.innerHTML = msg ? ICON_ALERT + "<span>" + msg + "</span>" : "";
}
function extraChecks(input) {
input.setCustomValidity("");
if (input.type === "date" && input.value) {
var d = new Date(input.value + "T12:00:00");
var day = d.getDay();
if (hoursData && !hoursData[day]) input.setCustomValidity("We're closed that day — please pick a weekday (Mon–Fri).");
}
if (input.type === "email" && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
input.setCustomValidity("Enter an email address like name@example.com.");
}
if (input.type === "tel" && input.value) {
var digits = input.value.replace(/\D/g, "");
if (digits.length < 10 || digits.length > 11) input.setCustomValidity("Enter a 10-digit phone number, like (516) 555-0123.");
}
}
function validateField(input) {
if (input.disabled || input.type === "hidden" || input.closest(".hp")) return true;
var field = fieldWrap(input);
if (input.type === "radio") {
var group = input.form.querySelectorAll('input[type="radio"][name="' + CSS.escape(input.name) + '"]');
var required = Array.prototype.some.call(group, function (r) { return r.required; });
var checked = Array.prototype.some.call(group, function (r) { return r.checked; });
var ok = !required || checked;
setError(field, ok ? "" : messageFor(input, field));
return ok;
}
extraChecks(input);
var valid = input.checkValidity();
setError(field, valid ? "" : messageFor(input, field));
return valid;
}
function validateScope(scope) {
var firstBad = null;
var seenRadio = {};
scope.querySelectorAll("input, select, textarea").forEach(function (input) {
if (input.type === "radio") {
if (seenRadio[input.name]) return;
seenRadio[input.name] = true;
}
if (input.closest("[hidden]")) return;
if (!validateField(input) && !firstBad) firstBad = input;
});
return firstBad;
}
function enhanceForm(form) {
form.setAttribute("novalidate", "");
var next = form.querySelector('input[name="_next"]');
if (next && /^https?:$/.test(location.protocol)) next.value = location.origin + (doc.body.getAttribute("data-base") || "") + "/thank-you/";
var urlField = form.querySelector('input[name="_url"]');
if (urlField && /^https?:$/.test(location.protocol)) urlField.value = location.href;
form.addEventListener("focusout", function (e) {
var t = e.target;
if (!t.matches("input, select, textarea") || t.type === "radio") return;
if (t.value || fieldWrap(t) && fieldWrap(t).classList.contains("has-error")) validateField(t);
});
form.addEventListener("input", function (e) {
var f = fieldWrap(e.target);
if (f && f.classList.contains("has-error")) validateField(e.target);
});
form.addEventListener("change", function (e) {
if (e.target.type === "radio") validateField(e.target);
});
var alertBox = form.querySelector(".form-alert");
form.addEventListener("submit", function (e) {
var bad = validateScope(form);
if (bad) {
e.preventDefault();
if (form._goToStepOf) form._goToStepOf(bad);
if (alertBox) {
alertBox.hidden = false;
var span = alertBox.querySelector("[data-alert-text]");
if (span) span.textContent = "Please fix the highlighted fields and try again.";
}
bad.focus({ preventScroll: false });
return;
}
if (form.hasAttribute("data-form-offline")) {
e.preventDefault();
if (alertBox) {
alertBox.hidden = false;
var msg = alertBox.querySelector("[data-alert-text]");
if (msg) msg.textContent = "Online requests aren't available right now. Please call us at " + (doc.body.getAttribute("data-phone") || "the shop") + " and we'll help you right away.";
alertBox.setAttribute("tabindex", "-1");
alertBox.focus();
}
return;
}
if (alertBox) alertBox.hidden = true;
var btn = form.querySelector('button[type="submit"]');
if (btn) {
btn.setAttribute("aria-busy", "true");
var lbl = btn.querySelector("[data-btn-label]");
if (lbl) lbl.textContent = "Sending…";
window.addEventListener("pageshow", function () { btn.removeAttribute("aria-busy"); if (lbl) lbl.textContent = lbl.getAttribute("data-default") || lbl.textContent; }, { once: true });
}
});
}
doc.querySelectorAll("form[data-enhance]").forEach(enhanceForm);
doc.querySelectorAll("[data-toggle-target]").forEach(function (group) {
var target = doc.getElementById(group.getAttribute("data-toggle-target"));
var showValue = group.getAttribute("data-toggle-value");
if (!target) return;
var sync = function () {
var checked = group.querySelector("input:checked");
var show = !!checked && checked.value === showValue;
target.hidden = !show;
target.querySelectorAll("[data-required-when-shown]").forEach(function (el) { el.required = show; });
if (!show) target.querySelectorAll(".field").forEach(function (f) { setError(f, ""); });
};
group.addEventListener("change", sync);
sync();
});
doc.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
var t = new Date(); var iso = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
input.min = iso;
});
doc.querySelectorAll("form[data-steps]").forEach(function (form) {
var steps = Array.prototype.slice.call(form.querySelectorAll(".form-step"));
var indicators = Array.prototype.slice.call(form.querySelectorAll(".stepper li"));
var back = form.querySelector("[data-step-back]");
var nextBtn = form.querySelector("[data-step-next]");
var submit = form.querySelector('button[type="submit"]');
var current = 0;
[back, nextBtn].forEach(function (b) { if (b) b.hidden = false; });
function show(i, focus) {
current = Math.max(0, Math.min(steps.length - 1, i));
steps.forEach(function (s, j) { s.classList.toggle("is-active", j === current); });
indicators.forEach(function (li, j) {
li.classList.toggle("is-done", j < current);
if (j === current) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
});
if (back) back.hidden = current === 0;
if (nextBtn) nextBtn.hidden = current === steps.length - 1;
if (submit) submit.hidden = current !== steps.length - 1;
if (focus) {
var title = steps[current].querySelector(".form-step__title");
if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }
var top = form.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 24;
if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
}
}
form._goToStepOf = function (el) {
var idx = steps.findIndex(function (s) { return s.contains(el); });
if (idx > -1 && idx !== current) show(idx, false);
};
if (nextBtn) nextBtn.addEventListener("click", function () {
var bad = validateScope(steps[current]);
if (bad) { bad.focus(); return; }
show(current + 1, true);
});
if (back) back.addEventListener("click", function () { show(current - 1, true); });
form.addEventListener("keydown", function (e) {
if (e.key === "Enter" && e.target.matches("input:not([type=radio]):not([type=file])") && current < steps.length - 1) {
e.preventDefault();
if (nextBtn) nextBtn.click();
}
});
show(0, false);
});
doc.querySelectorAll("[data-photo-uploader]").forEach(function (wrap) {
var picker = wrap.querySelector("[data-photo-picker]");
var slots = Array.prototype.slice.call(wrap.querySelectorAll("[data-photo-slot]"));
var list = wrap.querySelector("[data-photo-list]");
var status = wrap.querySelector("[data-photo-status]");
var zone = wrap.querySelector(".dropzone");
var MAX = slots.length || 6;
var BUDGET = 9.5 * 1024 * 1024;
var photos = [];
var canTransfer = false;
try { new DataTransfer(); canTransfer = true; } catch (e) { canTransfer = false; }
if (!canTransfer || !picker) return; // Fallback: the picker keeps its name and submits natively.
picker.removeAttribute("name");
function totalSize() { return photos.reduce(function (s, p) { return s + p.file.size; }, 0); }
function say(msg) { if (status) status.textContent = msg; }
function sync() {
slots.forEach(function (slot, i) {
var dt = new DataTransfer();
if (photos[i]) dt.items.add(photos[i].file);
slot.files = dt.files;
});
}
function render() {
list.innerHTML = "";
photos.forEach(function (p, i) {
var li = doc.createElement("li"); li.className = "thumb";
var img = doc.createElement("img"); img.src = p.url; img.alt = "Photo " + (i + 1) + " preview"; img.width = 104; img.height = 104;
var btn = doc.createElement("button"); btn.type = "button"; btn.setAttribute("aria-label", "Remove photo " + (i + 1));
btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
btn.addEventListener("click", function () {
URL.revokeObjectURL(p.url);
photos.splice(i, 1); sync(); render();
say(photos.length ? photos.length + " of " + MAX + " photos added." : "Photo removed.");
picker.focus();
});
li.appendChild(img); li.appendChild(btn); list.appendChild(li);
});
}
function compress(file) {
return new Promise(function (resolve) {
if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) { resolve(null); return; }
var done = function (out) { resolve(out); };
var url = URL.createObjectURL(file);
var img = new Image();
img.onload = function () {
var maxSide = 1800;
var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
var canvas = doc.createElement("canvas"); canvas.width = w; canvas.height = h;
canvas.getContext("2d").drawImage(img, 0, 0, w, h);
URL.revokeObjectURL(url);
canvas.toBlob(function (blob) {
if (!blob) { done(file.size < 4 * 1024 * 1024 ? file : null); return; }
var name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
done(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
}, "image/jpeg", 0.82);
};
img.onerror = function () { URL.revokeObjectURL(url); done(file.size < 4 * 1024 * 1024 ? file : null); };
img.src = url;
});
}
function addFiles(fileList) {
var files = Array.prototype.slice.call(fileList || []);
if (!files.length) return;
var room = MAX - photos.length;
if (room <= 0) { say("You've added the maximum of " + MAX + " photos. Remove one to add another."); return; }
var skipped = files.length > room ? files.length - room : 0;
files = files.slice(0, room);
say("Preparing " + files.length + " photo" + (files.length > 1 ? "s" : "") + "…");
var failed = 0, tooBig = 0;
files.reduce(function (chain, f) {
return chain.then(function () {
return compress(f).then(function (out) {
if (!out) { failed++; return; }
if (totalSize() + out.size > BUDGET) { tooBig++; return; }
photos.push({ file: out, url: URL.createObjectURL(out) });
});
});
}, Promise.resolve()).then(function () {
sync(); render();
var msg = photos.length + " of " + MAX + " photos added.";
if (skipped) msg += " " + skipped + " skipped (limit is " + MAX + ").";
if (failed) msg += " " + failed + " couldn't be read — please use JPG or PNG.";
if (tooBig) msg += " " + tooBig + " skipped because the upload would be too large.";
say(msg);
});
}
picker.addEventListener("change", function () { addFiles(picker.files); picker.value = ""; });
if (zone) {
["dragenter", "dragover"].forEach(function (ev) {
zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("is-drag"); });
});
["dragleave", "drop"].forEach(function (ev) {
zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("is-drag"); });
});
zone.addEventListener("drop", function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });
}
});
})();
