// ============================================
// ELECTRA MAN — Shared data + Firestore helpers
// All three pages (index/expert/admin) import from this file.
// ============================================
import { db, collection, doc, setDoc, addDoc, onSnapshot, getDocs, updateDoc, query, where, orderBy, serverTimestamp } from "./firebase-init.js";

export const LOCATIONS = {
  Punjab: [
    "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Gujrat", "Jalalpur Jattan",
    "Sialkot", "Sargodha", "Bahawalpur", "Sahiwal", "Sheikhupura", "Jhang", "Rahim Yar Khan",
    "Kasur", "Okara", "Dera Ghazi Khan", "Chiniot", "Wazirabad", "Mianwali", "Vehari",
    "Muzaffargarh", "Attock", "Bhakkar", "Khanewal", "Toba Tek Singh", "Hafizabad", "Narowal",
    "Pakpattan", "Layyah", "Jhelum", "Rajanpur", "Mandi Bahauddin", "Chakwal", "Kot Addu", "Nankana Sahib"
  ],
  Sindh: [
    "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpurkhas", "Jacobabad",
    "Shikarpur", "Khairpur", "Dadu", "Thatta", "Badin", "Tando Adam", "Tando Allahyar",
    "Umerkot", "Ghotki"
  ],
  "Khyber Pakhtunkhwa (KPK)": [
    "Peshawar", "Abbottabad", "Mardan", "Mingora (Swat)", "Kohat", "Bannu", "Dera Ismail Khan",
    "Nowshera", "Charsadda", "Mansehra", "Swabi", "Haripur", "Chitral", "Batagram", "Karak", "Tank"
  ],
  Balochistan: [
    "Quetta", "Gwadar", "Turbat", "Khuzdar", "Sibi", "Chaman", "Zhob", "Dera Murad Jamali",
    "Hub", "Loralai", "Dera Allah Yar", "Mastung", "Kalat", "Usta Muhammad", "Pasni"
  ],
  Islamabad: ["Islamabad"]
};

// Experts now come ONLY from the real Apply -> Admin Approve -> Publish Gig
// flow. No fake/demo experts are seeded anymore.

export const SCREENING_QUESTIONS = [
  {
    q: "Short circuit hone par sabse pehla step kya hona chahiye?",
    options: ["Mains breaker/switch turn off karna", "Paani dal dena", "Wire ko hath se pakadna", "Kuch na karna"],
    correct: 0
  },
  {
    q: "MCB (Miniature Circuit Breaker) kis kaam aata hai?",
    options: ["Overload/short-circuit se bachata hai", "Bijli ka bill kam karta hai", "Sirf light jalata hai", "Wifi signal behtar karta hai"],
    correct: 0
  },
  {
    q: "Kaam karte waqt safety ke liye kaunsa gear zaroori hai?",
    options: ["Insulated gloves + tester", "Sirf chappal", "Koi gear nahi chahiye", "Sunglasses"],
    correct: 0
  }
];

// ---- All known city names (used to sanity-check the typed address) ----
export function getAllCityNames() {
  return Object.values(LOCATIONS).flat();
}

// Very basic check: blocks obvious mismatches like selecting "Gujrat" as the
// city but typing an address that clearly names a totally different city
// (e.g. "Bahawalpur").
export function validateAddressAgainstCity(selectedCity, addressText) {
  if (!selectedCity || !addressText) return { valid: true };
  const lowerAddress = addressText.toLowerCase();
  const otherCities = getAllCityNames().filter(c => c.toLowerCase() !== selectedCity.toLowerCase());
  const conflict = otherCities.find(c => {
    if (c.length < 4) return false;
    return lowerAddress.includes(c.toLowerCase());
  });
  if (conflict) {
    return { valid: false, reason: `Yeh address "${conflict}" shehar se milta hai, lekin aapne "${selectedCity}" select kiya hai. Apna sahi area/street likhein.` };
  }
  return { valid: true };
}

// ---- Quick-reply chips (reduce free typing, reduce leak risk) ----
export const CUSTOMER_QUICK_REPLIES = [
  "Mera problem: Wiring issue hai",
  "Mera problem: Switchboard/socket issue hai",
  "Mera problem: Inverter/UPS issue hai",
  "Mera problem: Fan/Light kharab hai",
  "Aap kitni jaldi pohonch sakte hain?",
  "Rate confirm hai, booking aage badhayein",
  "Shukriya, main book kar raha hoon"
];

export const EXPERT_QUICK_REPLIES = [
  "Assalam-o-Alaikum, bataiye kya masla hai?",
  "Main 30 minute mein pohonch sakta hoon",
  "Main 1 ghanta mein pohonch sakta hoon",
  "Visit rate confirm hai, booking kar dein",
  "Inspection ke baad hi final cost bata sakta hoon",
  "Theek hai, intezar kar raha hoon"
];

// ---- Message safety filter ----
const PHONE_REGEX = /(\+92|0)[\s-]?3\d{2}[\s-]?\d{7}\b|\b\d{10,11}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const OFF_PLATFORM_PHRASES = [
  "whatsapp", "whats app", "call me", "ghar aa k", "ghar aakar", "ghar aa kar",
  "seedha paisay", "seedha payment", "bahar milte", "number pe", "outside app",
  "off platform", "off-platform", "app ke bahar", "platform ke bahar",
  "direct payment", "paisay ghar", "cash on", "cash de dena", "cash le lena",
  "nagad", "milte hain bahar", "yahan se bahar", "isay chorho", "app chorh"
];

export function filterMessage(rawText) {
  const lower = rawText.toLowerCase();
  const offender = OFF_PLATFORM_PHRASES.find(p => lower.includes(p));
  if (offender) {
    return {
      allowed: false,
      reason: "Yeh message bheja nahi ja sakta — off-platform contact ya payment arrange karna allowed nahi hai. Sab kuch Electra Man ke through hi hoga."
    };
  }
  const masked = rawText.replace(PHONE_REGEX, "******").replace(EMAIL_REGEX, "******");
  return { allowed: true, text: masked };
}

// ---- Escrow / booking-exclusivity helper ----
export function getActiveBookingForExpert(expertId, bookingsList) {
  return bookingsList.find(b =>
    b.expertId === expertId &&
    b.paymentStatus === "verified" &&
    b.jobStatus === "accepted" &&
    !b.escrowReleased
  ) || null;
}

// Replace with the client's REAL JazzCash/Easypaisa till number once provided.
export const DUMMY_TILL = {
  provider: "JazzCash",
  number: "0300-1234567",
  accountTitle: "Electra Man Services"
};

export function getTillQrUrl() {
  const payload = encodeURIComponent(`${DUMMY_TILL.provider} Till: ${DUMMY_TILL.number} | ${DUMMY_TILL.accountTitle}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${payload}`;
}

export function genApplicationId() { return "APP-" + Math.floor(100000 + Math.random() * 900000); }
export function genExpertId() { return "EXP-" + Math.floor(100 + Math.random() * 900); }
export function genBookingId() { return "BKG-" + Math.floor(100000 + Math.random() * 900000); }
export function initials(name) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

// ---- Real-time listeners ----
export function listenExperts(cb, errCb) {
  return onSnapshot(collection(db, "experts"), snap => {
    cb(snap.docs.map(d => d.data()));
  }, err => { if (errCb) errCb(err); });
}
export function listenApplications(cb) {
  return onSnapshot(collection(db, "applications"), snap => {
    cb(snap.docs.map(d => d.data()));
  });
}
export function listenBookings(cb) {
  return onSnapshot(collection(db, "bookings"), snap => {
    cb(snap.docs.map(d => d.data()));
  });
}

// ---- Writes ----
export async function setExpertDoc(id, data) { await setDoc(doc(db, "experts", id), data); }
export async function updateExpertDoc(id, partial) { await updateDoc(doc(db, "experts", id), partial); }

export async function setApplicationDoc(id, data) { await setDoc(doc(db, "applications", id), data); }
export async function updateApplicationDoc(id, partial) { await updateDoc(doc(db, "applications", id), partial); }

export async function setBookingDoc(id, data) { await setDoc(doc(db, "bookings", id), data); }
export async function updateBookingDoc(id, partial) { await updateDoc(doc(db, "bookings", id), partial); }

// ---- Real-time chat (customer <-> expert) ----
export function getOrCreateCustomerId() {
  let id = localStorage.getItem("electraman_customer_id");
  if (!id) {
    id = "CUST-" + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem("electraman_customer_id", id);
  }
  return id;
}

export function chatId(expertId, customerId) {
  return `${expertId}__${customerId}`;
}

export async function sendChatMessage(expertId, customerId, expertName, sender, text) {
  const result = filterMessage(text);
  if (!result.allowed) {
    throw new Error(result.reason);
  }
  const cid = chatId(expertId, customerId);
  await setDoc(doc(db, "chats", cid), {
    expertId, customerId, expertName,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await addDoc(collection(db, "chats", cid, "messages"), {
    sender, text: result.text, createdAt: serverTimestamp()
  });
}

export function listenChatMessages(expertId, customerId, cb) {
  const cid = chatId(expertId, customerId);
  const q = query(collection(db, "chats", cid, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data()));
  });
}

export function listenExpertChats(expertId, cb) {
  const q = query(collection(db, "chats"), where("expertId", "==", expertId));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data()));
  });
}

// ============================================
// OTP job-completion verification.
// ============================================
export function genOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
