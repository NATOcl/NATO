import Courses from "../../src/components/Courses";
import { act, render } from "../test-utils";

describe("Courses", () => {
  it("abre el modal con el PDF, enfoca el cierre y lo cierra con Escape", () => {
    const { container } = render(<Courses />);

    const trigger = container.querySelector(".course-row");
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");

    act(() => trigger.click());

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(container.querySelector(".pdf-modal__title").textContent).toBe(
      "Desarrollo con IA",
    );
    expect(document.activeElement).toBe(
      container.querySelector(".pdf-modal__close"),
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
