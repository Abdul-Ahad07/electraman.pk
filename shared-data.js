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

// ---- All known city names ----
export function getAllCityNames() {
  return Object.values(LOCATIONS).flat();
}

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

// ---- Quick-reply chips ----
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

// ---- Ultra-Strict Message Filter ----
const PHONE_REGEX = /(\+92|0)[\s-]?3\d{2}[\s-]?\d{7}\b|\b\d{10,11}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const OFF_PLATFORM_PHRASES = [
  "whatsapp", "whats app", "call me", "ghar aa k", "ghar aakar", "ghar aa kar",
  "seedha paisay", "seedha payment", "bahar milte", "number pe", "outside app",
  "off platform", "off-platform", "app ke bahar", "platform ke bahar",
  "direct payment", "paisay ghar", "cash on", "cash de dena", "cash le lena",
  "nagad", "milte hain bahar", "yahan se bahar", "isay chorho", "app chorh",
  "face to face", "f2f", "mil k baat", "mil kar baat"
];

const NUMBER_WORDS_REGEX = /\b(zero|one|two|three|four|five|six|seven|eight|nine|sifar|ek|do|teen|chaar|paanch|chhe|saat|aath|nau)\b/gi;

export function filterMessage(rawText) {
  const lower = rawText.toLowerCase();

  // 1. Off-Platform Intent Check
  const offender = OFF_PLATFORM_PHRASES.find(p => lower.includes(p));
  if (offender) {
    return {
      allowed: false,
      reason: "Off-platform deal ya direct contact ki baat karna allowed nahi hai. Sab kuch Electra Man ke through hoga."
    };
  }

  // 2. Strict Bypass Protection: Normalize symbols/spaces (e.g. 0/3/0/0, 0.3.0.0, 0 3 0 0, 0_3_0_0)
  const normalizedForDigits = rawText.replace(/[\/\.\_\-\,\s]+/g, "");
  const CONCEALED_PHONE_REGEX = /(\+?92|0)?3\d{9}\b|\b\d{10,12}\b/g;
  if (CONCEALED_PHONE_REGEX.test(normalizedForDigits)) {
    return {
      allowed: false,
      reason: "Phone number share karna allowed nahi hai (kisi bhi format, dot, slash ya space ke sath)."
    };
  }

  // 3. Catch Spelled-out Numbers in Words (e.g., "zero three zero zero...")
  const numberWordMatches = lower.match(NUMBER_WORDS_REGEX);
  if (numberWordMatches && numberWordMatches.length >= 7) { 
    return {
      allowed: false,
      reason: "Words (ginti) mein phone number likhna allowed nahi hai."
    };
  }

  // 4. Standard Masking for emails/phones
  let masked = rawText
    .replace(PHONE_REGEX, "******")
    .replace(EMAIL_REGEX, "******");

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

// ---- Customer ID Helper ----
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

// ---- Check Ban Status Before Allowing Chat ----
export async function checkUserBanStatus(userId) {
  const q = query(collection(db, "userViolations"), where("userId", "==", userId));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const data = snap.docs[0].data();

    // 1. Permanent Ban Check
    if (data.isPermanentlyBanned) {
      throw new Error("❌ Aapka account rules todne ki waja se PERMANENTLY BAN kar diya gaya hai.");
    }

    // 2. 3-Day Temporary Ban Check
    if (data.bannedUntil) {
      const banExpiry = new Date(data.bannedUntil);
      const now = new Date();
      if (now < banExpiry) {
        const remainingHours = Math.ceil((banExpiry - now) / (1000 * 60 * 60));
        throw new Error(`🚫 Aapka account 2nd violation ki waja se block hai. Ban khatam hone mein ${remainingHours} ghante baqi hain.`);
      }
    }
  }
}

// ---- Send Message with Violation & Ban Counter ----
export async function sendChatMessage(expertId, customerId, expertName, sender, text, senderUserId) {
  const userId = senderUserId || (sender === "customer" ? customerId : expertId);

  // 1. Check if sender is banned
  await checkUserBanStatus(userId);

  // 2. Check message content safety
  const result = filterMessage(text);

  if (!result.allowed) {
    // VIOLATION HANDLING LOGIC
    const violDocRef = doc(db, "userViolations", userId);
    const q = query(collection(db, "userViolations"), where("userId", "==", userId));
    const snap = await getDocs(q);

    let currentCount = 0;
    if (!snap.empty) {
      currentCount = snap.docs[0].data().violationCount || 0;
    }

    const newCount = currentCount + 1;
    let banReason = "";
    let updatePayload = {
      userId,
      violationCount: newCount,
      lastViolationAt: new Date().toISOString()
    };

    if (newCount === 1) {
      banReason = `⚠️ WARNING (1/3): ${result.reason}\n\nDobara aisa karne par aapka account 3 DIN ke liye BAN kar diya jayega.`;
    } else if (newCount === 2) {
      const banDate = new Date();
      banDate.setDate(banDate.getDate() + 3); // 3 Days Ban
      updatePayload.bannedUntil = banDate.toISOString();
      banReason = `🚫 2nd Violation! Rules todne par aapka chat feature 3 DIN ke liye block kar diya gaya hai.`;
    } else if (newCount >= 3) {
      updatePayload.isPermanentlyBanned = true; // Permanent Ban
      banReason = `❌ 3rd Violation! Rules baar baar todne par aapka account PERMANENTLY BAN kar diya gaya hai.`;
    }

    // Save violation status in Firestore
    await setDoc(violDocRef, updatePayload, { merge: true });

    throw new Error(banReason);
  }

  // 3. If Message is Clean, Send to Firestore
  const cid = chatId(expertId, customerId);
  await setDoc(doc(db, "chats", cid), {
    expertId, customerId, expertName,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await addDoc(collection(db, "chats", cid, "messages"), {
    sender, text: result.text, createdAt: serverTimestamp()
  });
}

// ---- Live Listeners for Chat ----
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

// ---- OTP Helper ----
export function genOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
