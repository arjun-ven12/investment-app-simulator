document.addEventListener("DOMContentLoaded", () => {
  const container = document.createElement("div");
  container.id = "bs-footer-container";
  document.body.appendChild(container);

  fetch("../html/footer.html")
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;
    })
    .catch(err => console.error("Footer load error:", err));
});
