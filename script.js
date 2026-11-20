document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wide = window.matchMedia("(min-width: 769px)");

// Mobile nav toggle
const navWrap = document.querySelector(".nav-wrap");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

// Close mobile menu when a link is clicked
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// Nav fade once the page leaves the hero
const onScroll = () => navWrap.classList.toggle("scrolled", window.scrollY > 24);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ===== Skill data, read from the projects themselves =====
const SKILLS = ["ml", "llm", "lang", "infra"];
const SKILL_NAMES = { ml: "AI / ML", llm: "LLM", lang: "Lang", infra: "Infra" };
const projects = [...document.querySelectorAll(".project")];
const projectsBySkill = Object.fromEntries(
  SKILLS.map((s) => [s, projects.filter((p) => p.dataset.skills.split(" ").includes(s))])
);
const maxCount = Math.max(...SKILLS.map((s) => projectsBySkill[s].length));
// height is honest: projects built on the stack, relative to the busiest stack
const heightFor = (s) => `${(projectsBySkill[s].length / maxCount) * 100}%`;

// ===== Skill map: selecting a tower raises and lights it, the rest recede =====
const room = document.querySelector(".room");
const stage = document.querySelector(".stage");
const towersEl = document.querySelector(".towers");
const towers = [...document.querySelectorAll(".tower")];
const readouts = [...document.querySelectorAll(".readout")];
const floorLit = document.querySelector(".floor-lit");
const orbitEl = document.querySelector(".orbit");
const ring = document.querySelector(".orbit-ring ellipse");

towers.forEach((t) => t.style.setProperty("--h", heightFor(t.dataset.skill)));

let selected = document.querySelector('.tower[aria-pressed="true"]');
let sats = [];
let orbitPaused = false;

const buildOrbit = () => {
  orbitEl.replaceChildren();
  sats = projectsBySkill[selected.dataset.skill].map((p, k, all) => {
    const a = document.createElement("a");
    a.className = "sat";
    a.href = `#${p.id}`;
    a.innerHTML = `<i></i><span>${p.querySelector("h3").textContent}</span>`;
    orbitEl.append(a);
    return { el: a, phase: (k / all.length) * Math.PI * 2 + 0.35 };
  });
};

orbitEl.addEventListener("pointerenter", () => (orbitPaused = true));
orbitEl.addEventListener("pointerleave", () => (orbitPaused = false));
orbitEl.addEventListener("focusin", () => (orbitPaused = true));
orbitEl.addEventListener("focusout", () => (orbitPaused = false));

const selectTower = (tower) => {
  selected = tower;
  towers.forEach((t) => {
    const on = t === tower;
    t.setAttribute("aria-pressed", String(on));
    t.querySelector(".glass").classList.toggle("is-amber", on);
  });
  readouts.forEach((r) => (r.hidden = r.dataset.for !== tower.dataset.skill));
  buildOrbit();
};

towers.forEach((tower) => tower.addEventListener("click", () => selectTower(tower)));

// Arrow keys move between towers
towersEl.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const i = towers.indexOf(document.activeElement);
  if (i === -1) return;
  const next = towers[(i + (e.key === "ArrowRight" ? 1 : towers.length - 1)) % towers.length];
  next.focus();
  selectTower(next);
  e.preventDefault();
});

selectTower(selected);

let orbitAngle = 0;
const placeOrbit = () => {
  const roomBox = room.getBoundingClientRect();
  const box = selected.querySelector(".glass .f").getBoundingClientRect();
  if (!roomBox.width || !box.width) return;
  const cx = box.left + box.width * 0.62 - roomBox.left;
  const cy = box.top + box.height * 0.58 - roomBox.top;
  const rx = box.width * 1.3 + 34;
  const ry = 30;

  floorLit.style.setProperty("--pool-x", `${((cx + 14 * roomBox.width / 100) / (roomBox.width * 1.24)) * 100}%`);

  if (!wide.matches) return;
  ring.setAttribute("cx", cx);
  ring.setAttribute("cy", cy);
  ring.setAttribute("rx", rx);
  ring.setAttribute("ry", ry);

  for (const s of sats) {
    const a = orbitAngle + s.phase;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    s.el.classList.toggle("is-back", Math.sin(a) < -0.15);
    s.el.classList.toggle("is-left", x < cx);
    const shift = x < cx ? "calc(-100% + 6px)" : "-6px";
    s.el.style.transform = `translate(${x}px, ${y}px) translate(${shift}, -50%)`;
  }
};

// Camera eases toward the pointer
if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  stage.addEventListener("pointermove", (e) => {
    const b = stage.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    room.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 3}deg)`;
  });
  stage.addEventListener("pointerleave", () => (room.style.transform = ""));
}

// ===== Projects light the skill towers they stand on =====
const projectsEl = document.querySelector(".projects");
const minis = [...document.querySelectorAll(".mini")];
minis.forEach((m) => m.style.setProperty("--mh", heightFor(m.dataset.skill)));

const lightMinis = (project) => {
  const skills = project ? project.dataset.skills.split(" ") : [];
  minis.forEach((m) => m.classList.toggle("lit", skills.includes(m.dataset.skill)));
};

// inline strip for narrow screens, where the minimap is hidden
projects.forEach((p) => {
  const skills = p.dataset.skills.split(" ");
  const strip = document.createElement("ul");
  strip.className = "pskills";
  strip.setAttribute("aria-label", `Skills used: ${skills.map((s) => SKILL_NAMES[s]).join(", ")}`);
  strip.innerHTML = SKILLS.map(
    (s) => `<li class="${skills.includes(s) ? "on" : ""}" aria-hidden="true"><span class="glass" style="--h:${(projectsBySkill[s].length / maxCount) * 26 + 8}px"><i class="f"></i><i class="s"></i><i class="t"></i></span>${SKILL_NAMES[s]}</li>`
  ).join("");
  p.querySelector(".project-head").after(strip);
});

let hovered = null;
let inView = projects[0];

projects.forEach((p) => {
  p.addEventListener("pointerenter", () => {
    hovered = p;
    projects.forEach((q) => q.classList.toggle("is-focus", q === p));
    projectsEl.classList.add("is-hovering");
    lightMinis(p);
  });
  p.addEventListener("focusin", () => lightMinis(p));
});

projectsEl.addEventListener("pointerleave", () => {
  hovered = null;
  projectsEl.classList.remove("is-hovering");
  lightMinis(inView);
});

// scrolling a project to the middle of the screen lights its skills
const centreObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      inView = entry.target;
      if (!hovered) lightMinis(inView);
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);
projects.forEach((p) => centreObserver.observe(p));
lightMinis(inView);

// ===== Scroll-reveal sections =====
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Active nav highlighting
const sections = document.querySelectorAll("section[id]");
const linkFor = (id) => document.querySelector(`.nav-links a[href="#${id}"]`);

const activeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const link = linkFor(entry.target.id === "home" ? "skills" : entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        document
          .querySelectorAll(".nav-links a.active")
          .forEach((a) => a.classList.remove("active"));
        link.classList.add("active");
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);

sections.forEach((s) => activeObserver.observe(s));

// ===== Light: drifting motes in the room, dust inside every glass prism =====
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const motesCanvas = document.querySelector(".motes");
const motesCtx = motesCanvas.getContext("2d");
let motes = [];

const sizeMotes = () => {
  motesCanvas.width = window.innerWidth * dpr;
  motesCanvas.height = window.innerHeight * dpr;
  motesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round(Math.min(150, (window.innerWidth * window.innerHeight) / 9000));
  motes = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    z: Math.random(),
    sway: Math.random() * Math.PI * 2,
  }));
};

const dusts = [...document.querySelectorAll(".dust")].map((canvas) => ({
  canvas,
  ctx: canvas.getContext("2d"),
  glass: canvas.closest(".glass"),
  w: 0,
  h: 0,
  specks: [],
  visible: true,
}));

const sizeDust = (d) => {
  d.w = d.canvas.clientWidth;
  d.h = d.canvas.clientHeight;
  d.canvas.width = d.w * dpr;
  d.canvas.height = d.h * dpr;
  d.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.max(6, Math.round((d.w * d.h) / 260));
  d.specks = Array.from({ length: count }, () => ({
    x: Math.random() * d.w,
    y: Math.random() * d.h,
    z: Math.random(),
  }));
};

const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    const d = dusts.find((x) => x.canvas === entry.target);
    if (d) sizeDust(d);
  });
});
dusts.forEach((d) => resizeObserver.observe(d.canvas));

const dustObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const d = dusts.find((x) => x.canvas === entry.target);
    if (d) d.visible = entry.isIntersecting;
  });
});
dusts.forEach((d) => dustObserver.observe(d.canvas));

const drawMotes = (t) => {
  motesCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  motesCtx.fillStyle = "#e4ebff";
  for (const m of motes) {
    const r = 0.8 + m.z * 2;
    motesCtx.globalAlpha = 0.25 + m.z * 0.6;
    motesCtx.beginPath();
    motesCtx.arc(m.x + Math.sin(t / 2400 + m.sway) * 8 * m.z, m.y, r, 0, Math.PI * 2);
    motesCtx.fill();
  }
};

const drawDust = (d, t) => {
  if (!d.visible || !d.w) return;
  const amber = d.glass.classList.contains("is-amber");
  const lit = d.glass.closest(".lit");
  d.ctx.clearRect(0, 0, d.w, d.h);
  d.ctx.fillStyle = amber ? "#ffd697" : "#e8eeff";
  for (const s of d.specks) {
    // brighter near the top, where the light enters
    const depth = 1 - s.y / d.h;
    d.ctx.globalAlpha = (0.12 + s.z * 0.5) * (0.35 + depth * 0.65) * (amber || lit ? 1.4 : 0.8);
    d.ctx.fillRect(s.x + Math.sin(t / 1800 + s.z * 9) * 2, s.y, 0.8 + s.z * 1.2, 0.8 + s.z * 1.2);
  }
};

const step = () => {
  for (const m of motes) {
    m.y -= 0.08 + m.z * 0.3;
    if (m.y < -4) {
      m.y = window.innerHeight + 4;
      m.x = Math.random() * window.innerWidth;
    }
  }
  for (const d of dusts) {
    if (!d.visible) continue;
    for (const s of d.specks) {
      s.y -= 0.05 + s.z * 0.18;
      if (s.y < 0) s.y = d.h;
    }
  }
  if (!orbitPaused) orbitAngle += (Math.PI * 2) / (48 * 60);
};

const frame = (t) => {
  step();
  drawMotes(t);
  dusts.forEach((d) => drawDust(d, t));
  placeOrbit();
  requestAnimationFrame(frame);
};

sizeMotes();
window.addEventListener("resize", sizeMotes);

if (reduceMotion) {
  // one still frame, redrawn when the selection changes
  const still = () => {
    drawMotes(0);
    dusts.forEach((d) => drawDust(d, 0));
    placeOrbit();
  };
  requestAnimationFrame(still);
  towers.forEach((t) => t.addEventListener("click", () => requestAnimationFrame(still)));
  window.addEventListener("resize", () => requestAnimationFrame(still));
  document.querySelectorAll(".mini, .project").forEach((el) =>
    el.addEventListener("pointerenter", () => requestAnimationFrame(still))
  );
} else {
  requestAnimationFrame(frame);
}
