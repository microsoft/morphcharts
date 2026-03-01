// Wrap every <pre> in a container with a copy button
document.querySelectorAll("pre").forEach(pre => {
    const wrapper = document.createElement("div");
    wrapper.className = "copyContainer";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement("button");
    button.textContent = "Copy";
    button.addEventListener("click", () => {
        navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
            button.textContent = "Copied";
            setTimeout(() => { button.textContent = "Copy"; }, 1500);
        });
    });
    wrapper.appendChild(button);
});
