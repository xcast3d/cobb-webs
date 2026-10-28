export function scatterBugs(container, width, height) {
  for (let i = 0; i < 8; i++) {
    const b = document.createElement("i");
    b.className = "bug";
    const x = (0.15 + Math.random() * 0.7) * width,
      y = (0.2 + Math.random() * 0.6) * height;
    const sides = [x, width - x, y, height - y],
      side = sides.indexOf(Math.min(...sides));
    const dx =
        side === 0
          ? -x - 30
          : side === 1
            ? width - x + 30
            : (Math.random() - 0.5) * 120,
      dy =
        side === 2
          ? -y - 30
          : side === 3
            ? height - y + 30
            : (Math.random() - 0.5) * 120;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    container.append(b);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const frames = Array.from({ length: 9 }, (_, j) => ({
      transform: `translate(${(dx * j) / 8 + Math.sin(j * 3) * 8}px,${(dy * j) / 8}px) rotate(${angle}deg)`,
    }));
    const animation = b.animate(frames, {
      duration: 650 + Math.random() * 700,
      delay: i * 20,
      fill: "forwards",
    });
    animation.onfinish = () => b.remove();
  }
}
