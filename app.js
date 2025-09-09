function log(id,msg){ document.getElementById(id).textContent += msg+"\n"; }
function clearLog(id){ document.getElementById(id).textContent = ""; }
function showTab(t){
  document.querySelectorAll(".tab").forEach(el=>el.style.display="none");
  document.getElementById(t).style.display="block";
}

function packPayload(seq,balance,daily){
  const buf = new ArrayBuffer(1+4+4+4+1);
  const dv = new DataView(buf);
  let offset=0;
  dv.setUint8(offset,1); offset+=1;
  dv.setUint32(offset,seq); offset+=4;
  dv.setInt32(offset,balance); offset+=4;
  dv.setUint32(offset,daily); offset+=4;
  dv.setUint8(offset,0);
  return new Uint8Array(buf);
}
function unpackPayload(arr){
  const dv = new DataView(arr.buffer);
  let offset=0;
  const version = dv.getUint8(offset); offset+=1;
  const seq = dv.getUint32(offset); offset+=4;
  const balance = dv.getInt32(offset); offset+=4;
  const daily = dv.getUint32(offset); offset+=4;
  const histCount = dv.getUint8(offset); offset+=1;
  return {version,seq,balance,daily,histCount};
}

async function clientCheck(){
  clearLog("clientLog");
  if (!("NDEFReader" in window)){ log("clientLog","Web NFC not supported"); return; }
  const ndef = new NDEFReader();
  await ndef.scan();
  log("clientLog","Scan started...");
  ndef.onreading = async (event) => {
    const id = event.serialNumber;
    for (const record of event.message.records){
      if (record.mediaType=="application/clevent"){
        const b64 = new TextDecoder().decode(record.data);
        const key = await deriveKey(id);
        try{
          const plain = await decryptPayload(b64,key);
          const map = unpackPayload(new Uint8Array(plain));
          log("clientLog","UID:"+id+" Balance:"+map.balance+" Daily:"+map.daily+" Seq:"+map.seq);
        }catch(e){ log("clientLog","Decrypt failed:"+e); }
      }
    }
  };
}

async function adminInit(){
  clearLog("adminLog");
  const amt = parseInt(document.getElementById("initAmount").value||"0");
  if (!("NDEFReader" in window)){ log("adminLog","No Web NFC"); return; }
  const ndef = new NDEFReader();
  await ndef.write({records:[{
    recordType:"mime",
    mediaType:"application/clevent",
    data: await buildEncrypted(1,amt,0,0)
  }]});
  log("adminLog","Initialized with "+amt);
}
async function adminTopup(){
  clearLog("adminLog");
  const amt = parseInt(document.getElementById("topupAmount").value||"0");
  if (!("NDEFReader" in window)){ log("adminLog","No Web NFC"); return; }
  const ndef = new NDEFReader();
  await ndef.scan();
  ndef.onreading = async (event) => {
    const id = event.serialNumber;
    for (const record of event.message.records){
      if (record.mediaType=="application/clevent"){
        const b64 = new TextDecoder().decode(record.data);
        const key = await deriveKey(id);
        const plain = await decryptPayload(b64,key);
        const map = unpackPayload(new Uint8Array(plain));
        const newSeq = map.seq+1;
        const newBal = map.balance+amt;
        const newPlain = packPayload(newSeq,newBal,map.daily);
        const newB64 = await encryptPayload(newPlain,key);
        await ndef.write({records:[{recordType:"mime",mediaType:"application/clevent",data:newB64}]});
        log("adminLog","Topped up new balance:"+newBal);
      }
    }
  };
}

async function sellerPurchase(){
  clearLog("sellerLog");
  const price = parseInt(document.getElementById("price").value||"0");
  if (price<=0){ log("sellerLog","Invalid price"); return; }
  if (!("NDEFReader" in window)){ log("sellerLog","No Web NFC"); return; }
  const ndef = new NDEFReader();
  await ndef.scan();
  ndef.onreading = async (event)=>{
    const id = event.serialNumber;
    for (const record of event.message.records){
      if (record.mediaType=="application/clevent"){
        const b64 = new TextDecoder().decode(record.data);
        const key = await deriveKey(id);
        const plain = await decryptPayload(b64,key);
        const map = unpackPayload(new Uint8Array(plain));
        if (map.balance<price){ log("sellerLog","Insufficient funds"); return; }
        const newSeq = map.seq+1;
        const newBal = map.balance-price;
        const newDaily = map.daily+price;
        const newPlain = packPayload(newSeq,newBal,newDaily);
        const newB64 = await encryptPayload(newPlain,key);
        await ndef.write({records:[{recordType:"mime",mediaType:"application/clevent",data:newB64}]});
        log("sellerLog","Purchase OK. New balance:"+newBal);
        document.getElementById("sellerQr").innerHTML="";
        new QRCode(document.getElementById("sellerQr"), "uid:"+id+"|amount:"+price+"|bal:"+newBal+"|seq:"+newSeq);
      }
    }
  };
}

async function buildEncrypted(version,balance,daily,seq){
  const arr = packPayload(seq,balance,daily);
  const id="demo"; // in init we don't know id. In reality you'd scan first.
  const key = await deriveKey(id);
  const b64 = await encryptPayload(arr,key);
  return b64;
}
