// ============================================
// ELECTRA MAN — Shared data + Firestore helpers
// All three pages (index/expert/admin) import from this file.
// ============================================
import { db, collection, doc, setDoc, addDoc, onSnapshot, getDocs, updateDoc, query, where, orderBy, serverTimestamp } from "./firebase-init.js";

export const LOCATIONS = {
  Punjab: [
    "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Gujrat", "Jalpur Jattan",
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
    q: "ایک کلو واٹ میں کتنے واٹ ہوتے ہیں؟",
    options: ["1000 واٹ", "500 واٹ", "100 واٹ", "2000 واٹ"],
    correct: 0
  },
  {
    q: "ایمپیئر سے واٹ کیسے معلوم کیے جاتے ہیں؟",
    options: ["وولٹ کو ایمپیئر سے ضرب دے کر", "وولٹ کو ایمپیئر پر تقسیم کر کے", "صرف ایمپیئر دیکھ کر", "واٹ کا کوئی تعلق نہیں"],
    correct: 0
  },
  {
    q: "واٹ سے ایمپیئر کیسے معلوم ہوتے ہیں؟",
    options: ["واٹ کو وولٹ پر تقسیم کر کے", "واٹ کو وولٹ سے ضرب دے کر", "جمع کر کے", "تفریق کر کے"],
    correct: 0
  },
  {
    q: "وولٹ کسے کہتے ہیں؟",
    options: ["بجلی کے دباؤ کو", "بجلی کی مقدار کو", "بجلی کی رفتار کو", "مزاحمت کو"],
    correct: 0
  }
];

// ---- All known city names ----
export function getAllCityNames() {
  return Object.values(LOCATIONS).flat();
}

export function validateAddressAgainstCity(selectedCity, addressText) {
  if (!selectedCity ||!addressText) return { valid: true };
  const lowerAddress = addressText.toLowerCase();
  const otherCities = getAllCityNames().filter(c => c.toLowerCase()!== selectedCity.toLowerCase());
  const conflict = otherCities.find(c => {
    if (c.length < 4) return false;
    return lowerAddress.includes(c.toLowerCase());
  });
  if (conflict) {
    return { valid: false, reason: `یہ پتہ "${conflict}" شہر سے ملتا ہے، لیکن آپ نے "${selectedCity}" منتخب کیا ہے۔ اپنا صحیح علاقہ/گلی لکھیں۔` };
  }
  return { valid: true };
}

// ---- Quick-reply chips - 100% Urdu ----
export const CUSTOMER_QUICK_REPLIES = [
  "میرا مسئلہ: وائرنگ کا مسئلہ ہے",
  "میرا مسئلہ: سوئچ بورڈ/ساکٹ کا مسئلہ ہے",
  "میرا مسئلہ: انورٹر/یو پی ایس کا مسئلہ ہے",
  "میرا مسئلہ: پنکھا/لائٹ خراب ہے",
  "آپ کتنی جلدی پہنچ سکتے ہیں؟",
  "ریٹ کنفرم ہے، بکنگ آگے بڑھائیں",
  "شکریہ، میں بک کر رہا ہوں"
];

export const EXPERT_QUICK_REPLIES = [
  "السلام علیکم، بتائیں کیا مسئلہ ہے؟",
  "میں 30 منٹ میں پہنچ سکتا ہوں",
  "میں 1 گھنٹے میں پہنچ سکتا ہوں",
  "وزٹ ریٹ کنفرم ہے، بکنگ کر دیں",
  "معائنہ کے بعد ہی فائنل قیمت بتا سکتا ہوں",
  "ٹھیک ہے، انتظار کر رہا ہوں"
];

// ---- Ultra-Strict Message Safety Filter ----
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
      reason: "آف پلیٹ فارم ڈیل یا ڈائریکٹ رابطے کی بات کرنا منع ہے۔ سب کچھ الیکٹرا مین کے ذریعے ہوگا۔"
    };
  }

  // 2. Strict Bypass Protection: Normalize symbols/spaces
  const normalizedForDigits = rawText.replace(/[\/\.\_\-\,\s]+/g, "");
  const CONCEALED_PHONE_REGEX = /(\+?92|0)?3\d{9}\b|\b\d{10,12}\b/g;
  if (CONCEALED_PHONE_REGEX.test(normalizedForDigits)) {
    return {
      allowed: false,
      reason: "فون نمبر شیئر کرنا منع ہے۔ کسی بھی فارمیٹ میں اجازت نہیں ہے۔"
    };
  }

  // 3. Catch Spelled-out Numbers in Words
  const numberWordMatches = lower.match(NUMBER_WORDS_REGEX);
  if (numberWordMatches && numberWordMatches.length >= 7) {
    return {
      allowed: false,
      reason: "الفاظ میں فون نمبر لکھنا منع ہے۔"
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
  provider: "Easypaisa",
  number: "03212509343",
  accountTitle: "ABDUL AHAD"
};

export function getTillQrUrl() {
  const payload = encodeURIComponent(`${DUMMY_TILL.provider} QR - MSISDN: ${DUMMY_TILL.number} - ${DUMMY_TILL.accountTitle}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${payload}`;
}

export function genApplicationId() { return "APP-" + Math.floor(100000 + Math.random() * 900000); }
export function genExpertId() { return "EXP-" + Math.floor(100 + Math.random() * 900); }
export function genBookingId() { return "BKG-" + Math.floor(100000 + Math.random() * 900000); }
export function genOtp() { return String(Math.floor(1000 + Math.random() * 9000)); }
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

// ============================================
// ⭐ REVIEWS & RATING SYSTEM
// ============================================
export async function addExpertReview(expertId, customerName, rating, comment) {
  await addDoc(collection(db, "experts", expertId, "reviews"), {
    customerName: customerName || "گمنام گاہک",
    rating: Number(rating),
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  });

  const reviewsSnap = await getDocs(collection(db, "experts", expertId, "reviews"));
  let totalStars = 0;
  reviewsSnap.docs.forEach(docSnap => {
    totalStars += docSnap.data().rating;
  });

  const reviewCount = reviewsSnap.size;
  const avgRating = (totalStars / reviewCount).toFixed(1);

  await updateDoc(doc(db, "experts", expertId), {
    rating: Number(avgRating),
    totalReviews: reviewCount
  });
}

export function listenExpertReviews(expertId, cb) {
  const q = query(collection(db, "experts", expertId, "reviews"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id,...d.data() })));
  });
}

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

// ---- Check Ban Status Before Allowing Chat ----
export async function checkUserBanStatus(userId) {
  if (!userId) return;
  const q = query(collection(db, "userViolations"), where("userId", "==", userId));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const data = snap.docs[0].data();

    // 1. Permanent Ban Check - ADMIN KE LIYE ROMAN REHNE DIYA
    if (data.isPermanentlyBanned) {
      throw new Error("❌ Aapka account rules todne ki waja se PERMANENTLY BAN kar diya gaya hai.");
    }

    // 2. 3-Day Temporary Ban Check - ADMIN KE LIYE ROMAN REHNE DIYA
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
  const userId = senderUserId || (sender === "customer"? customerId : expertId);

  await checkUserBanStatus(userId);
  const result = filterMessage(text);

  if (!result.allowed) {
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

    // ADMIN PANEL KE LIYE BAN MESSAGES ROMAN MEIN HI REHNE DIYE
    if (newCount === 1) {
      banReason = `⚠️ WARNING (1/3): ${result.reason}\n\nDobara aisa karne par aapka account 3 DIN ke liye BAN kar diya jayega.`;
    } else if (newCount === 2) {
      const banDate = new Date();
      banDate.setDate(banDate.getDate() + 3);
      updatePayload.bannedUntil = banDate.toISOString();
      banReason = `🚫 2nd Violation! Rules todne par aapka chat feature 3 DIN ke liye block kar diya gaya hai.`;
    } else if (newCount >= 3) {
      updatePayload.isPermanentlyBanned = true;
      banReason = `❌ 3rd Violation! Rules baar baar todne par aapka account PERMANENTLY BAN kar diya gaya hai.`;
    }

    await setDoc(violDocRef, updatePayload, { merge: true });
    throw new Error(banReason);
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
// Token Fee — small upfront lock paid before chat unlocks.
// ============================================
export const TOKEN_FEE_AMOUNT = 250;

export function tokenFeeId(expertId, customerId) {
  return `${expertId}__${customerId}`;
}

export async function submitTokenFee(expertId, customerId, txnId) {
  const id = tokenFeeId(expertId, customerId);
  await setDoc(doc(db, "tokenFees", id), {
    id, expertId, customerId, amount: TOKEN_FEE_AMOUNT, txnId,
    status: "pending_verification", date: new Date().toISOString()
  });
}

export function listenTokenFee(expertId, customerId, cb) {
  const id = tokenFeeId(expertId, customerId);
  return onSnapshot(doc(db, "tokenFees", id), snap => {
    cb(snap.exists()? snap.data() : null);
  });
}

export function listenAllTokenFees(cb) {
  return onSnapshot(collection(db, "tokenFees"), snap => {
    cb(snap.docs.map(d => d.data()));
  });
}

export async function updateTokenFeeDoc(id, partial) {
  await updateDoc(doc(db, "tokenFees", id), partial);
}