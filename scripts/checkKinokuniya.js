(async () => {
  const results = document.querySelectorAll(".clearfix > .box");
  if (results.length === 1) {
    console.log("One result found");
    // Select child of results[0] element that has a class of "inner_box"
    const innerBox = results[0].querySelector(".inner_box > a");
    if (innerBox) {
      console.log("Clicking inner box!");
      innerBox.click();
    }

    console.log(results[0]);
  } else if (results.length === 0) {
    console.log("No results found");
  } else {
    console.log("Multiple results found");
  }
  chrome.runtime.sendMessage({
    type: "kinokuniyaResults",
    results: results.length,
  });
})();
