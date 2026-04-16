import "@testing-library/jest-dom";

// 1. Mock pour matchMedia (Gestion du responsive dans les composants UI)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// 2. Mock pour ResizeObserver (Indispensable pour Recharts et shadcn/ui)
// Sans cela, les graphiques et les menus déroulants feront planter vos tests.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// 3. Mock pour IntersectionObserver (Utile pour les animations Framer Motion)
class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserver as any;
