import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ContactPage from "./ContactPage";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function prepare() {
  render(<MemoryRouter><ContactPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole("textbox", { name: /姓名/ }), { target: { value: "王小明" } });
  fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), { target: { value: "student@example.com" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "website" } });
  fireEvent.change(screen.getByRole("textbox", { name: /主旨/ }), { target: { value: "網站問題" } });
  fireEvent.change(screen.getByRole("textbox", { name: /問題內容/ }), { target: { value: "我想詢問網站上的學習資料如何更新。" } });
  return screen.getByRole("button", { name: /送出問題/ });
}

it("keeps inputs on server or network failure", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 500 })).mockRejectedValueOnce(new Error("offline"));
  const button = prepare();
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("目前無法送出");
  expect(screen.getByRole("textbox", { name: /姓名/ })).toHaveValue("王小明");
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("目前無法送出");
  expect(screen.getByRole("textbox", { name: /主旨/ })).toHaveValue("網站問題");
});

it("shows rate limiting without clearing the message", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 429 }));
  fireEvent.click(prepare());
  expect(await screen.findByRole("alert")).toHaveTextContent("傳送次數過多");
  expect(screen.getByRole("textbox", { name: /問題內容/ })).toHaveValue("我想詢問網站上的學習資料如何更新。");
});

it("prevents duplicate submissions and disables fields while awaiting storage", async () => {
  let resolve!: (value: Response) => void;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((done) => { resolve = done; }));
  const button = prepare();
  fireEvent.click(button);
  fireEvent.submit(button.closest("form")!);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox", { name: /姓名/ })).toBeDisabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => resolve(new Response('{"ok":true}', { status: 201 })));
  expect(await screen.findByRole("status")).toHaveTextContent("成功送出");
  expect(screen.getByRole("textbox", { name: /姓名/ })).toHaveValue("");
});

it("preserves an explicitly configured external endpoint and sends the honeypot", async () => {
  vi.stubEnv("VITE_CONTACT_FORM_ENDPOINT", "https://forms.example.com/contact");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
  const button = prepare();
  fireEvent.change(document.querySelector('input[name="website"]')!, { target: { value: "spam" } });
  fireEvent.click(button);
  await screen.findByRole("status");
  expect(fetchMock).toHaveBeenCalledWith("https://forms.example.com/contact", expect.objectContaining({ body: expect.stringContaining('"website":"spam"') }));
});
