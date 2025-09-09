async function deriveKey(tagUid) {
  const enc = new TextEncoder();
  const masterRaw = await getOrCreateMaster();
  const salt = enc.encode(tagUid);
  const baseKey = await crypto.subtle.importKey("raw", masterRaw, {name:"HKDF"}, false, ["deriveKey"]);
  const derived = await crypto.subtle.deriveKey(
    {name:"HKDF", hash:"SHA-256", salt: salt, info: enc.encode("clevent-aes-key-v1")},
    baseKey,
    {name:"AES-GCM", length:256},
    false,
    ["encrypt","decrypt"]
  );
  return derived;
}

async function getOrCreateMaster(){
  // store in localStorage for prototype
  let hex = localStorage.getItem("clevent_master");
  if (!hex){
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    hex = Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
    localStorage.setItem("clevent_master", hex);
  }
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(x=>parseInt(x,16)));
  return bytes.buffer;
}

async function encryptPayload(plainBytes, key){
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:"AES-GCM", iv:nonce}, key, plainBytes);
  const ctArr = new Uint8Array(ct);
  const combined = new Uint8Array(nonce.length + ctArr.length);
  combined.set(nonce,0);
  combined.set(ctArr, nonce.length);
  return btoa(String.fromCharCode.apply(null, combined));
}

async function decryptPayload(b64, key){
  const raw = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
  const nonce = raw.slice(0,12);
  const ct = raw.slice(12);
  const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:nonce}, key, ct);
  return new Uint8Array(plain);
}
