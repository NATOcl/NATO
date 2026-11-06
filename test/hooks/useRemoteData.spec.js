import useRemoteData from "../../src/hooks/useRemoteData";
import { act, flush, render } from "../test-utils";

function Probe({ api = "/api/projects", fallback = "data/projects.json" }) {
  const { data, loading, error, source, reload } = useRemoteData(api, fallback);

  return (
    <div>
      <p id="state">
        {loading ? "cargando" : error ? "error" : `fuente:${source}`}
      </p>
      <p id="count">
        {Array.isArray(data) ? data.length : data?.projects?.length || 0}
      </p>
      <button type="button" onClick={reload}>
        recargar
      </button>
    </div>
  );
}

const rows = [{ id: "uno" }, { id: "dos" }];

function ok(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  });
}

describe("useRemoteData", () => {
  it("usa la respuesta de la API REST cuando está disponible", async () => {
    const fetchSpy = spyOn(window, "fetch").and.returnValue(ok({ projects: rows }));
    const { container } = render(<Probe />);

    expect(container.querySelector("#state").textContent).toBe("cargando");

    await flush();

    expect(fetchSpy.calls.count()).toBe(1);
    expect(fetchSpy.calls.argsFor(0)[0]).toBe("/api/projects");
    expect(container.querySelector("#state").textContent).toBe("fuente:api");
    expect(container.querySelector("#count").textContent).toBe("2");
  });

  it("cae al JSON local si la API falla", async () => {
    const fetchSpy = spyOn(window, "fetch")
      .and.returnValues(Promise.reject(new Error("sin red")), ok(rows));

    const { container } = render(<Probe />);
    await flush();

    expect(fetchSpy.calls.count()).toBe(2);
    expect(fetchSpy.calls.argsFor(1)[0]).toBe("data/projects.json");
    expect(container.querySelector("#state").textContent).toBe("fuente:json");
    expect(container.querySelector("#count").textContent).toBe("2");
  });

  it("cae al JSON local si la API responde con error HTTP", async () => {
    const fetchSpy = spyOn(window, "fetch").and.returnValues(
      Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve(null) }),
      ok(rows),
    );

    const { container } = render(<Probe />);
    await flush();

    expect(fetchSpy.calls.count()).toBe(2);
    expect(container.querySelector("#state").textContent).toBe("fuente:json");
  });

  it("muestra error cuando fallan la API y el respaldo", async () => {
    spyOn(window, "fetch").and.returnValue(Promise.reject(new Error("caído")));

    const { container } = render(<Probe />);
    await flush();

    expect(container.querySelector("#state").textContent).toBe("error");
    expect(container.querySelector("#count").textContent).toBe("0");
  });

  it("permite reintentar y recupera los datos", async () => {
    let calls = 0;

    spyOn(window, "fetch").and.callFake(() => {
      calls += 1;
      // Primer intento (API y respaldo) falla; al reintentar responde la API.
      return calls <= 2 ? Promise.reject(new Error("caído")) : ok({ projects: rows });
    });

    const { container } = render(<Probe />);
    await flush();
    expect(container.querySelector("#state").textContent).toBe("error");

    act(() => container.querySelector("button").click());
    await flush();

    expect(calls).toBe(3);
    expect(container.querySelector("#state").textContent).toBe("fuente:api");
    expect(container.querySelector("#count").textContent).toBe("2");
  });
});
