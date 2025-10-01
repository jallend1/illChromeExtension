// TODO: Inject this onto URLs that match: https://united-states.kinokuniya.com/bw/****

(async () => {
  console.log("Extracting Kinokuniya data");
  const extractISBN = () => {
    const tableData = document.querySelector("bookData");
    // Find the th that has the textContent of "ISBN"
    const isbnHeader = Array.from(tableData.querySelectorAll("th")).find(
      (th) => th.textContent.trim() === "ISBN"
    );
    if (isbnHeader) {
      // Extracts the ISBN from the child of the shared parentElement
      const isbnCell = isbnHeader.parentElement.querySelector("td");
      if (isbnCell) {
        const isbn = isbnCell.textContent.trim();
        console.log("Extracted ISBN:", isbn);
        return isbn;
      }
    }
  };

  const extractPrice = () => {
    const prices = document.querySelectorAll(".price");
    // Select the element from prices that contains the text " Online Price "
    console.log(prices);
    const onlinePrice = Array.from(prices).find((price) =>
      price.outerText.includes("Online Price")
    );
    console.log(onlinePrice);
    if (onlinePrice) {
      // First span includes price
      const priceSpan = onlinePrice.querySelector("span");
      if (priceSpan) {
        // Remove $
        const price = priceSpan.textContent.trim().replace("$", "");
        console.log("Extracted Price:", price);
        return price;
      }
    }
  };

  const isbn = extractISBN();
  const price = extractPrice();
  const url = window.location.href;

  console.log({ isbn, price, url });
})();
