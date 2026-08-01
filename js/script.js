let count = 0;

const btn = document.getElementById("cheer-btn");
const label = document.getElementById("cheer-count");

btn.addEventListener("click", () => {
  count += 1;
  label.textContent = `Clicked ${count} time${count === 1 ? "" : "s"}`;
});
