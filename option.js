/* Author : Muhammad Arif Uddin
GitHub : GitHub.com/arif-un */

let translate_select = document.getElementById("translate");
let currency_select = document.getElementById("currency");
let pop_true = document.getElementById('pop-true');
let pop_false = document.getElementById('pop-false');

//default settings to storage
chrome.storage.sync.get(["primaryTranslate"], result => {
  let val = result.primaryTranslate == undefined ? "bn" : result.primaryTranslate;
  translate_select.value = val;
  chrome.storage.sync.set({ primaryTranslate: val });
  // console.log(val);
});

chrome.storage.sync.get(["primaryCurrency"], result => {
  let c_val = result.primaryCurrency == undefined ? "BDT" : result.primaryCurrency;
  currency_select.value = c_val;
  chrome.storage.sync.set({ primaryCurrency: c_val });
  // console.log(c_val);
});

chrome.storage.sync.get(["pop_win"], result => {
  let popAllow = result.pop_win == undefined ? false : result.pop_win;
  popAllow ? pop_true.checked = true : pop_false.checked = true;
  chrome.storage.sync.set({ pop_win: popAllow });
  // console.log(popAllow);
});

document.getElementById('save').addEventListener("click", () => {
  val = translate_select.value;
  c_val = currency_select.value;
  popAllow = pop_true.checked ? true : false;

  chrome.storage.sync.set({ primaryTranslate: val });
  chrome.storage.sync.set({ primaryCurrency: c_val });
  chrome.storage.sync.set({ pop_win: popAllow });

  let save_alrt = document.getElementById('save-alrt');

  save_alrt.style.right = "80px";
  setTimeout(() => { save_alrt.style.right = "-80px"; }, 2000);

});