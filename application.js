/* Author : Muhammad Arif Uddin
GitHub : GitHub.com/arif-un */

let pageX, pageY, primary_tran, primary_curr, popAllow;
let show = false;
let target = false;
let selection = "";
let lang = ["Afrikaans", "Albanian", "Arabic", "Azerbaijani", "Basque", "Bengali", "Belarusian", "Bulgarian", "Catalan", "Chinese Simplified", "Chinese Traditional", "Croatian", "Czech", "Danish", "Dutch", "English", "Esperanto", "Estonian", "Filipino", "Finnish", "French", "Galician", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hebrew", "Hindi", "Hungarian", "Icelandic", "Indonesian", "Irish", "Italian", "Japanese", "Kannada", "Korean", "Latin", "Latvian", "Lithuanian", "Macedonian", "Malay", "Maltese", "Norwegian", "Persian", "Polish", "Portuguese", "Romanian", "Russian", "Serbian", "Slovak", "Slovenian", "Spanish", "Swahili", "Swedish", "Tamil", "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh", "Yiddish"];
let langCode = ["af", "sq", "ar", "az", "eu", "bn", "be", "bg", "ca", "zh-CN", "zh-TW", "hr", "cs", "da", "nl", "en", "eo", "et", "tl", "fi", "fr", "gl", "ka", "de", "el", "gu", "ht", "iw", "hi", "hu", "is", "id", "ga", "it", "ja", "kn", "ko", "la", "lv", "lt", "mk", "ms", "mt", "no", "fa", "pl", "pt", "ro", "ru", "sr", "sk", "sl", "es", "sw", "sv", "ta", "te", "th", "tr", "uk", "ur", "vi", "cy", "yi"];


//read config
chrome.storage.sync.get(["primaryTranslate"], result => {
  primary_tran = result.primaryTranslate == undefined ? "bn" : result.primaryTranslate;
});
chrome.storage.sync.get(["primaryCurrency"], result => {
  primary_curr = result.primaryCurrency == undefined ? "BDT" : result.primaryCurrency;
});
chrome.storage.sync.get(["pop_win"], result => {
  popAllow = result.pop_win == undefined ? false : result.pop_win;
});


// popup element
let div = document.createElement("div");
div.id = "____tooltip";
div.innerHTML = `<a id="__search"><img title="Search" src='${chrome.runtime.getURL("data/search.png")}'></a>
                 <a id="__copy" ><img title="Copy" src='${chrome.runtime.getURL("data/copy.png")}'></a>
                 <a id="__translate" ><img title="Translate" src='${chrome.runtime.getURL("data/translate.png")}'></a>
                `;

/*  <a id="__currency" ><img src='${chrome.runtime.getURL("data/currency_tk.png")}'></a> */

document.body.appendChild(div);

// Copy Alert element
const CopyAlert = document.createElement("div");
CopyAlert.id = "__cpyAlrt";
CopyAlert.innerHTML = `Copied !`;

document.body.appendChild(CopyAlert);

const currencyPopUp = document.createElement("div");
currencyPopUp.id = "__cuncy_pop";


document.body.appendChild(currencyPopUp);

const transltPopUp = document.createElement("div");
transltPopUp.id = "__trns_pop";

document.body.appendChild(transltPopUp);

// Show pop up
window.addEventListener("mouseup", (event) => {
  selection = getSelectedTxt();
  // get x y pos
  if (event.button == 0 && !target) {
    pageX = event.x - 100;
    event.screenY < 150 ? pageY = event.pageY + 20 : pageY = event.pageY - 75;
  }
  //show pop
  if (selection != "") {
    div.style.opacity = "0.9";
    div.style.display = "flex";

    div.style.top = pageY + "px";
    div.style.left = pageX + "px";

    show = true;
  } else if (selection == "" && show) {
    document.getElementById("____tooltip").style.display = "none";
    currencyPopUp.style.display = "none";
    transltPopUp.style.display = "none";
    show = false;
    target = false;
  }
});

//Search Action 
document.getElementById('__search').addEventListener('click', () => {
  div.style.display = "none";
  window.open("https://www.google.com/search?q=" + selection, "_blank");
});

// Copy Action
document.getElementById('__copy').addEventListener('click', () => {
  div.style.display = "none";
  document.execCommand("copy");

  CopyAlert.style.right = 80 + "px";
  setTimeout(function () {
    CopyAlert.style.right = -150 + "px";
  }, 2000);
});

/* //Currency Action
document.getElementById('__currency').addEventListener('click', () => {
  let currency_from = selection.match(/[a-z]+/gi);
  let val = selection.match(/\d+|[.]/g);
  if (currency_from != null && val != null) {
    let number = "";
    if (val.length > 0) {
      for (let i = 0; i < val.length; i++) {
        number += val[i];
      }
    }
    let from = currency_from[0].toUpperCase();
    let to = primary_curr;
    let num = Number(number);
    let from_to = from + "_" + to;

    const url = "https://free.currencyconverterapi.com/api/v5/convert?q=" + from_to;
    fetch(url).then(response => {
      return response.json()
    }).then(data => {
      if (data.query.count > 0) {
        let value = parseFloat(data.results[from_to].val);
        let rounded = value.toFixed(2);
        let output = num * rounded;

        currencyPopUp.innerHTML = to + " " + output;
        currencyPopUp.style.top = pageY + "px";
        currencyPopUp.style.left = pageX + 170 + "px";
        currencyPopUp.style.display = "block";
      } else {
        crrencyErorMsg();
      }

    }).catch((err) => {
      crrencyErorMsg();
      console.log(err);
    })

  } else {
    crrencyErorMsg();
  }

});

//currency err msg
let crrencyErorMsg = () => {
  currencyPopUp.innerHTML = "Error!";
  currencyPopUp.style.top = pageY + "px";
  currencyPopUp.style.left = pageX + 170 + "px";
  currencyPopUp.style.display = "block";
  setTimeout(() => currencyPopUp.style.display = "none", 1000);
}
 */
//translate action 
document.getElementById('__translate').addEventListener('click', () => {

  if (popAllow) {
    let tran_url = `https://translate.google.com/#auto/${primary_tran}/${selection}`;
    let leftPosition = (screen.width) ? (screen.width - 800) / 2 : 100;
    let topPosition = (screen.height) ? (screen.height - 500) / 2 : 100;
    window.open(tran_url, 'Google Translate', `width=800,height=500,top=${topPosition},left=${leftPosition},scrollbars=yes,location=no,directories=no,status=no,menubar=no,toolbar=no,resizable=yes`);
  } else {
    const translate_url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${primary_tran}&dt=t&q=${selection}`;

    fetch(translate_url).then(response => {
      return response.json();
    }).then(data => {

      let langIndx_frm = langCode.indexOf(data[2]);
      let langIndx_to = langCode.indexOf(primary_tran);
      lang[langIndx_frm];

      transltPopUp.innerHTML = `<div><span style="font-weight:bold">${lang[langIndx_frm]} : </span> ${selection}</div>
    <hr style="margin:8px;height:1px">
    <div><span style="font-weight:bold">${lang[langIndx_to]} : </span> ${data[0][0][0]}</div>
    `;
      transltPopUp.style.top = pageY + 100 + "px";
      transltPopUp.style.left = pageX + "px";
      transltPopUp.style.display = "block";
      transltPopUp
    }).catch(err => console.log(err));
  }
});


// tooltip active
document.getElementById('____tooltip').addEventListener("mouseover", function (event) {
  target = true;
});
document.getElementById('____tooltip').addEventListener("mouseleave", function (event) {
  target = false;
});

// get selected text
function getSelectedTxt() {
  let txt = "";

  if (window.getSelection) {
    txt = window.getSelection();
  } else if (document.getSelection) {
    txt = document.getSelection();
  } else if (document.selection) {
    txt = document.selection.createRange().text;
  }

  t = txt.toString();

  return t.trim();
}